const { test } = require('node:test');
const assert = require('node:assert/strict');
// Replace the DB module BEFORE loading service: no credentials, pg, or real DB.
let active;
require.cache[require.resolve('../dist/db')] = {
    exports: { __esModule: true, default: { connect: async () => active.client } },
};
const { StatsService } = require('../dist/services/StatsService');
const players = [1, 2, 3, 4].map(id => ({ id, username: `p${id}` }));
const chatId = -100;
function fixture({ globalElo = [1000, 1000, 1000, 1000], chatElo = globalElo,
    globalGames = [10, 10, 10, 10], chatGames = globalGames, streaks = [0, 0, 0, 0], missingFeatures = false,
    failOn = null } = {}) {
    const rows = (elos, games) => elos.map((elo, i) => ({ player_id: String(i + 1), elo_rating: elo,
        season_games_played: games[i], season_games_won: 0, season_golaya_count: 0 }));
    const f = { state: { global: rows(globalElo, globalGames), chat: rows(chatElo, chatGames),
        features: missingFeatures ? [] : streaks.map((s, i) => ({ player_id: String(i + 1), win_streak: s,
            best_win_streak: s, active_title: null, unlocked_titles: [] })) }, queries: [], released: 0 };
    let saved;
    f.client = {
        release() { f.released++; },
        async query(sql, params = []) {
            sql = sql.replace(/\s+/g, ' ').trim();
            f.queries.push({ sql, params });
            if (failOn && failOn(sql, params)) throw new Error('injected storage failure');
            if (sql === 'BEGIN') saved = structuredClone(f.state);
            else if (sql === 'ROLLBACK') f.state = saved;
            else if (sql === 'COMMIT') saved = null;
            else if (sql.startsWith('SELECT')) {
                if (sql.includes('FROM player_chat_features')) {
                    assert.equal(params[0], chatId);
                    const ids = Array.isArray(params[1]) ? params[1] : [params[1]];
                    return { rows: structuredClone(f.state.features.filter(r => ids.includes(Number(r.player_id)))) };
                }
                const scope = sql.includes('FROM global_stats') ? 'global' : 'chat';
                if (scope === 'chat') assert.equal(params[0], chatId);
                const ids = scope === 'global' ? params[0] : params[1];
                return { rows: structuredClone(f.state[scope].filter(r => (Array.isArray(ids) ? ids : [ids]).includes(Number(r.player_id)))) };
            } else if (/^UPDATE (global_stats|chat_stats) SET elo_rating/.test(sql)) {
                const global = sql.startsWith('UPDATE global');
                f.state[global ? 'global' : 'chat'].find(r => Number(r.player_id) === params[global ? 0 : 1]).elo_rating = params[global ? 1 : 2];
            } else if (sql.startsWith('INSERT INTO player_chat_features')) {
                assert.equal(params[0], chatId);
                let row = f.state.features.find(r => Number(r.player_id) === params[1]);
                if (!row) { row = { player_id: String(params[1]), win_streak: 0, best_win_streak: 0, active_title: null, unlocked_titles: [] }; f.state.features.push(row); }
                if (params.length > 2) Object.assign(row, { win_streak: params[2], best_win_streak: params[3], active_title: params[4], unlocked_titles: JSON.parse(params[5]) });
            } else if (/^INSERT INTO (global_stats|chat_stats)/.test(sql) && sql.includes('games_played')) {
                const global = sql.startsWith('INSERT INTO global');
                const offset = global ? 0 : 1;
                const row = f.state[global ? 'global' : 'chat'].find(r => Number(r.player_id) === params[offset]);
                row.season_games_played += params[offset + 1];
                row.season_games_won += params[offset + 2];
                row.season_golaya_count += params[offset + 7];
            } else if (!/^INSERT INTO (players|global_stats|chat_stats)/.test(sql)) {
                throw new Error(`Unexpected mock SQL: ${sql}`);
            }
            return { rows: [] };
        },
    };
    active = f;
    f.service = new StatsService();
    f.match = (golden = false, winners = players.slice(0, 2), mode) => f.service.updateTeamRatings(winners, players.filter(p => !winners.includes(p)), golden, chatId, mode);
    f.elos = scope => f.state[scope].map(r => r.elo_rating);
    return f;
}


test('belka doubles base gains and losses for regular and calibration matches; walka/default stay unchanged', async () => {
    for (const [games, base] of [[10, 12], [9, 16]]) {
        for (const mode of ['belka', 'walka', undefined]) {
            const f = fixture({ globalGames: [10, 10, 10, games] });
            const changes = await f.match(false, players.slice(0, 2), mode);
            const delta = base * (mode === 'belka' ? 2 : 1);
            for (const scope of ['global', 'chat']) {
                assert.deepEqual(f.elos(scope), [1000 + delta, 1000 + delta, 1000 - delta, 1000 - delta], `${mode}, games=${games}, ${scope}`);
            }
            assert.deepEqual([...changes.values()].map(c => c.delta), [delta, delta, -delta, -delta]);
        }
    }
});

test('belka multiplies after rounding unequal favorite/upset base Elo, not before rounding', async () => {
    for (const [elos, delta] of [[[1000, 1200, 900, 1100], 18], [[900, 1100, 1000, 1200], 30]]) {
        const f = fixture({ globalElo: elos });
        const changes = await f.match(false, players.slice(0, 2), 'belka');
        for (const scope of ['global', 'chat']) {
            assert.deepEqual(f.elos(scope), elos.map((elo, i) => elo + (i < 2 ? delta : -delta)));
        }
        assert.deepEqual([...changes.values()].map(c => c.delta), [delta, delta, -delta, -delta]);
    }
});

test('belka doubles independent global/chat bases but not golden or personal streak bonuses', async () => {
    const f = fixture({ globalElo: [1300, 1500, 900, 1100], chatElo: [1000, 1000, 1000, 1000],
        globalGames: [10, 10, 10, 10], chatGames: [10, 9, 10, 10], streaks: [2, 0, 5, 5] });
    const before = structuredClone(f.state.features);
    const changes = await f.match(true, players.slice(0, 2), 'belka');
    assert.deepEqual(f.elos('global'), [1322, 1519, 896, 1096]);
    assert.deepEqual(f.elos('chat'), [1050, 1047, 968, 968]);
    assert.deepEqual(changes.get(1), { oldElo: 1000, newElo: 1050, delta: 50, gamesPlayed: 11 });
    assert.deepEqual(f.state.features, before);
});

test('belka clamps doubled base plus additive bonuses in both scopes and returns actual chat deltas', async () => {
    const f = fixture({ globalElo: [9990, 500, 9999, 500], chatElo: [9998, 501, 9990, 501], streaks: [2, 0, 9, 9] });
    const changes = await f.match(true, players.slice(0, 2), 'belka');
    assert.deepEqual(f.elos('global'), [9999, 539, 9975, 500]);
    assert.deepEqual(f.elos('chat'), [9999, 540, 9966, 500]);
    assert.deepEqual([...changes.values()].map(c => c.delta), [1, 39, -24, -1]);
});

// Regression coverage of unchanged pair formula, lifecycle, bounds and transaction contract.
test('unequal team averages give equal base deltas to teammates (favorite and upset)', async () => {
    for (const [elos, delta] of [[[1300, 1500, 900, 1100], 2], [[900, 1100, 1300, 1500], 22]]) {
        const f = fixture({ globalElo: elos });
        const changes = await f.match();
        assert.deepEqual(f.elos('global'), elos.map((elo, i) => elo + (i < 2 ? delta : -delta)));
        assert.deepEqual([...changes.values()].map(c => c.delta), [delta, delta, -delta, -delta]);
    }
});

test('global/chat use independent ratings and calibration but the same chat streak bonus', async () => {
    const f = fixture({ globalElo: [1300, 1500, 900, 1100], chatElo: [1000, 1000, 1000, 1000],
        globalGames: [10, 10, 10, 10], chatGames: [10, 9, 10, 10], streaks: [2, 0, 5, 5] });
    const changes = await f.match(true);
    assert.deepEqual(f.elos('global'), [1320, 1517, 898, 1098]);
    assert.deepEqual(f.elos('chat'), [1034, 1031, 984, 984]);
    assert.deepEqual(changes.get(1), { oldElo: 1000, newElo: 1034, delta: 34, gamesPlayed: 11 });
});

test('new feature rows default to zero and are materialized before snapshot locking', async () => {
    const f = fixture({ missingFeatures: true });
    await f.match();
    assert.deepEqual(f.elos('chat'), [1012, 1012, 988, 988]);
    assert.deepEqual(f.state.features.map(r => r.win_streak), [0, 0, 0, 0]);
    const lock = f.queries.findIndex(q => q.sql.includes('FROM player_chat_features'));
    const inserts = f.queries.filter(q => q.sql.startsWith('INSERT INTO player_chat_features'));
    assert.equal(inserts.length, 4);
    assert.ok(inserts.every(q => /ON CONFLICT .* DO NOTHING$/.test(q.sql) && f.queries.indexOf(q) < lock));
});

test('completed-match lifecycle advances once, loss resets, and recovery needs three fresh wins', async () => {
    const f = fixture({ streaks: [2, 0, 0, 0] });
    const streak = () => f.state.features.find(r => r.player_id === '1').win_streak;
    for (const [won, after, bonus] of [[true, 3, 3], [true, 4, 3], [false, 0, 0], [true, 1, 0], [true, 2, 0], [true, 3, 3]]) {
        const before = streak();
        const old = f.elos('chat');
        const avgWinner = won ? (old[0] + old[1]) / 2 : (old[2] + old[3]) / 2;
        const avgLoser = won ? (old[2] + old[3]) / 2 : (old[0] + old[1]) / 2;
        const base = Math.round(24 * (1 - 1 / (1 + 10 ** ((avgLoser - avgWinner) / 400))));
        const changes = await f.match(false, won ? players.slice(0, 2) : players.slice(2));
        assert.equal(changes.get(1).delta, won ? base + bonus : -base);
        assert.equal(streak(), before);
        for (const p of players) await f.service.updatePlayerStats(p.id, p.username, (p.id <= 2) === won, 0, 0, false, false, chatId);
        assert.equal(streak(), after);
    }
});

test('partial deal stats (countGame=false) do not advance or reset streak', async () => {
    const f = fixture({ streaks: [2, 0, 0, 0] });
    for (const won of [true, false]) await f.service.updatePlayerStats(1, 'p1', won, 0, 0, false, false, chatId, false);
    assert.equal(f.state.features[0].win_streak, 2);
});

test('both scopes clamp after bonuses and returned chat delta is the actual bounded change', async () => {
    const f = fixture({ globalElo: [9990, 9999, 500, 501], chatElo: [9998, 9999, 500, 501], streaks: [2, 3, 8, 8] });
    const changes = await f.match(true);
    assert.deepEqual(f.elos('global'), [9999, 9999, 500, 501]);
    assert.deepEqual(f.elos('chat'), [9999, 9999, 500, 501]);
    assert.equal(changes.get(1).delta, 1);
    assert.equal(changes.get(2).delta, 0);
    const lower = fixture({ globalElo: [500, 501, 501, 500] });
    await lower.match();
    assert.deepEqual(lower.elos('global'), [512, 513, 500, 500]);
    assert.deepEqual(lower.elos('chat'), [512, 513, 500, 500]);
});

for (const phase of ['snapshot', 'write']) {
    test(`rollback restores both scopes and new feature rows on ${phase} failure`, async t => {
        const f = fixture({ missingFeatures: true, failOn: sql => phase === 'snapshot'
            ? sql.startsWith('SELECT') && sql.includes('FROM player_chat_features')
            : sql.startsWith('UPDATE chat_stats') });
        const before = structuredClone(f.state);
        const errorLog = t.mock.method(console, 'error', () => {});
        await assert.rejects(f.match(true), /injected storage failure/);
        assert.deepEqual(f.state, before);
        assert.equal(f.queries.at(-1).sql, 'ROLLBACK');
        assert.ok(!f.queries.some(q => q.sql === 'COMMIT'));
        assert.equal(f.released, 1);
        assert.equal(errorLog.mock.callCount(), 1);
    });
}

test('rejects incomplete teams before opening a transaction', async () => {
    const f = fixture();
    await assert.rejects(f.service.updateTeamRatings(players.slice(0, 1), players.slice(2), false, chatId), /exactly two players/);
    assert.deepEqual(f.queries, []);
});

test('streak snapshot is locked inside rating transaction before rating writes', async () => {
    const f = fixture();
    await f.match();
    const index = f.queries.findIndex(q => q.sql.startsWith('SELECT') && q.sql.includes('FROM player_chat_features'));
    assert.ok(index > 0, 'must read streak snapshot');
    assert.match(f.queries[index].sql, /FOR UPDATE/);
    assert.deepEqual(f.queries[index].params, [chatId, [1, 2, 3, 4]]);
    assert.ok(index < f.queries.findIndex(q => q.sql.startsWith('UPDATE global_stats')));
    assert.equal(f.queries[0].sql, 'BEGIN');
    assert.equal(f.queries.at(-1).sql, 'COMMIT');
});

for (const [before, bonus] of [[0, 0], [1, 0], [2, 3], [3, 3]]) {
    test(`personal streak ${before} before win gives bonus ${bonus}, stacked with golden`, async () => {
        const f = fixture({ streaks: [before, 0, 8, 9] });
        const featuresBefore = structuredClone(f.state.features);
        await f.match(true);
        assert.deepEqual(f.elos('global'), [1027 + bonus, 1027, 988, 988]);
        assert.deepEqual(f.elos('chat'), f.elos('global'));
        assert.deepEqual(f.state.features, featuresBefore, 'rating must not advance or reset streak');
    });
}

test('golden win adds 15 to both winners without increasing loser penalty', async () => {
    const f = fixture();
    const changes = await f.match(true);
    assert.deepEqual(f.elos('global'), [1027, 1027, 988, 988]);
    assert.deepEqual(f.elos('chat'), f.elos('global'));
    assert.equal(changes.get(1).delta, 27);
});

test('K=32 below ten games; K=24 at ten, using the minimum of all four', async () => {
    for (const [games, delta] of [[[10, 10, 10, 9], 16], [[10, 10, 10, 10], 12], [[99, 99, 99, 0], 16]]) {
        const f = fixture({ globalGames: games });
        const changes = await f.match();
        assert.deepEqual(f.elos('global'), [1000 + delta, 1000 + delta, 1000 - delta, 1000 - delta]);
        assert.deepEqual(f.elos('chat'), f.elos('global'));
        assert.equal(changes.get(4).gamesPlayed, games[3] + 1);
        assert.equal(f.released, 1);
    }
});
