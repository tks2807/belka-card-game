const { test } = require('node:test');
const assert = require('node:assert/strict');
// Tests never load credentials or contact the database.
require.cache[require.resolve('../dist/db')] = { exports: { __esModule: true, default: {} } };
const { BelkaGame } = require('../dist/game/BelkaGame');
function game(locale = 'ru') {
    const g = new BelkaGame(1, locale);
    for (let id = 1; id <= 4; id++) g.addPlayer({ id, username: `p${id}`, chatId: 1 });
    return g;
}
function trick(g, winner = 1) {
    g.state.tableCards = [
        { playerId: 1, card: { suit: '♠', rank: 'Q', value: 3 } },
        { playerId: 2, card: { suit: '♥', rank: '10', value: 10 } },
        { playerId: 3, card: { suit: '♥', rank: 'A', value: 11 } },
        { playerId: 4, card: { suit: '♦', rank: 'K', value: 4 } },
    ];
    g.determineRoundWinner = () => winner;
    g.resolveRound();
}
test('opponent points and support go to their respective players, own card excluded', () => {
    const g = game(); trick(g);
    assert.deepEqual(g.state.matchHistory.contributions, {
        1: { opponentPoints: 14, supportPoints: 0, tricks: 1 },
        3: { opponentPoints: 0, supportPoints: 11, tricks: 0 },
    });
    assert.match(g.getMatchHistorySummary(1, false), /MVP: @p1 · вклад 14/);
});
test('contributions accumulate across deals without round resets', () => {
    const g = game(); trick(g); g.startNewRound(); trick(g);
    assert.equal(g.state.matchHistory.contributions[1].opponentPoints, 28);
    assert.equal(g.state.matchHistory.contributions[3].supportPoints, 22);
});
test('only winners compete; tricks break score ties; exact ties share MVP', () => {
    const g = game();
    g.state.matchHistory.contributions = {
        1: { opponentPoints: 10, supportPoints: 0, tricks: 2 },
        2: { opponentPoints: 999, supportPoints: 0, tricks: 9 },
        3: { opponentPoints: 0, supportPoints: 10, tricks: 3 },
    };
    assert.match(g.getMatchHistorySummary(1, false), /MVP: @p3 · вклад 10/);
    g.state.matchHistory.contributions[1].tricks = 3;
    assert.match(g.getMatchHistorySummary(1, false), /MVP: @p1, @p3 · вклад 10/);
});
test('survives JSON save/restore and continues counting', () => {
    const g = game(); trick(g);
    const restored = game(); restored.restoreFromSerializedState(JSON.parse(JSON.stringify(g.getSerializableState())));
    trick(restored);
    assert.match(restored.getMatchHistorySummary(1, false), /MVP: @p1 · вклад 28/);
});
test('rematch resets MVP counters', () => {
    const g = game(); trick(g); g.startGame();
    assert.deepEqual(g.state.matchHistory.contributions, {});
    assert.doesNotMatch(g.getMatchHistorySummary(1, false), /MVP/);
});
test('legacy saves do not produce partial MVP', () => {
    const g = game(); const saved = JSON.parse(JSON.stringify(g.getSerializableState()));
    delete saved.matchHistory.contributions;
    g.restoreFromSerializedState(saved); trick(g);
    assert.doesNotMatch(g.getMatchHistorySummary(1, false), /MVP/);
});
test('Kazakh output and no award before any trick', () => {
    const g = game('kk'); assert.doesNotMatch(g.getMatchHistorySummary(1, false), /MVP/);
    trick(g); assert.match(g.getMatchHistorySummary(1, false), /MVP: @p1 · үлес 14/);
});
test('MVP still shown if rating storage fails', async () => {
    const g = game(); trick(g);
    g.statsService.updateTeamRatings = async () => { throw new Error('test storage failure'); };
    assert.match(await g.endGame(false, 1), /MVP: @p1 · вклад 14/);
});
