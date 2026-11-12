const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const i18n = require('../dist/i18n');
const titles = require('../dist/i18n/titles');
const ru = require('../src/i18n/ru.json');
const kk = require('../src/i18n/kk.json');
// Never connect to a real DB or Telegram in this test suite.
const settings = new Map();
let features = { win_streak: 3, best_win_streak: 5, active_title: '🎯 Победитель', unlocked_titles: ['🎯 Победитель', '🃏 Ветеран'] };
const fakePool = {
  async query(sql, params = []) {
    if (sql.includes('SELECT locale')) return { rows: settings.has(params[0]) ? [{ locale: settings.get(params[0]) }] : [] };
    if (sql.includes('INSERT INTO chat_settings')) {
      if (sql.includes('SELECT $2, locale')) {
        if (settings.has(params[0]) && !settings.has(params[1])) settings.set(params[1], settings.get(params[0]));
      } else settings.set(params[0], params[1]);
    }
    if (sql.includes('FROM player_chat_features')) return { rows: [features] };
    if (sql.includes('UPDATE player_chat_features')) features.active_title = params[2];
    return { rows: [] };
  }
};
require.cache[require.resolve('../dist/db')] = { id: require.resolve('../dist/db'), filename: require.resolve('../dist/db'), loaded: true, exports: { __esModule: true, default: fakePool } };
const { BelkaGame } = require('../dist/game/BelkaGame');
const { StatsService } = require('../dist/services/StatsService');
const { LocaleService } = require('../dist/services/LocaleService');
const quiet = async work => { const original = console.log; console.log = () => {}; try { return await work(); } finally { console.log = original; } };

// Check the catalogs themselves and real callsites, not just key count.
test('catalog parity, placeholders and Telegram help length', () => {
  assert.deepEqual(Object.keys(ru).sort(), Object.keys(kk).sort());
  for (const key of Object.keys(ru)) {
    const params = text => [...text.matchAll(/\{(\w+)\}/g)].map(x => x[1]).sort();
    assert.deepEqual(params(ru[key]), params(kk[key]), key);
    for (const locale of ['ru', 'kk']) {
      const args = Object.fromEntries(params(ru[key]).map(name => [name, `VALUE_${name}`]));
      assert.doesNotMatch(i18n.translate(locale, key, args), /\{\w+\}/, `${locale}: ${key}`);
    }
  }
  assert.ok(ru.help.length <= 4096 && kk.help.length <= 4096);
});
test('no untranslated display literals in command handlers or game engine', () => {
  for (const file of ['src/index.ts', 'src/game/BelkaGame.ts']) {
    const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), 99, true);
    function visit(node) {
      if ((ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) && /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(ts.isTemplateExpression(node) ? node.head.text + node.templateSpans.map(s => s.literal.text).join('') : node.text)) {
        let excluded = false;
        for (let p = node.parent; p; p = p.parent) {
          if (ts.isThrowStatement(p) || (ts.isCallExpression(p) && p.expression.getText(source).startsWith('console.'))) excluded = true;
        }
        assert.ok(excluded, `${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});
test('parallel chats keep separate locales across async work', async () => {
  await Promise.all(['ru', 'kk'].map(locale => i18n.withLocale(locale, async () => {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(i18n.localize('languageChanged'), i18n.t(locale, 'languageChanged'));
  })));
  assert.equal(i18n.currentLocale(), 'ru');
});
test('chat locale persists across service restart and remains chat-specific', async () => {
  const service = new LocaleService();
  assert.equal(await service.get(-10), 'ru');
  await service.set(-10, 'kk');
  assert.equal(await service.get(-10), 'kk');
  assert.equal(await service.get(-20), 'ru');
  assert.equal(await new LocaleService().get(-10), 'kk');
  await service.set(-10, 'ru');
  assert.equal(await service.get(-10), 'ru');
});
test('legacy titles, localized title selection and rank descriptions', async () => {
  for (const [id, key] of Object.entries(titles.titleKeys)) {
    for (const locale of ['ru', 'kk']) {
      assert.equal(titles.normalizeTitle(i18n.translate(locale, key)), id);
      assert.equal(titles.titleName(id, locale), i18n.translate(locale, key));
    }
  }
  const service = new StatsService();
  const result = await service.getChatFeatures(1, -1);
  assert.equal(result.activeTitle, 'winner');
  assert.deepEqual(result.titles, ['winner', 'veteran']);
  assert.equal(await service.setActiveTitle(1, -1, '🃏 Ардагер'), true);
  assert.equal(features.active_title, 'veteran');
  assert.equal(await service.setActiveTitle(1, -1, 'centurion'), false);
  for (const rank of service.getAllRanks()) assert.notEqual(i18n.metadataText(rank.description, 'kk'), rank.description);
  assert.equal(i18n.seasonName('Season 12', 'kk'), 'Маусым 12');
});
function fixture(locale) {
  const game = new BelkaGame(-1, locale);
  for (let i = 1; i <= 4; i++) game.addPlayer({ id: i, username: `player${i}`, chatId: -1 });
  game.startGame();
  game.statsService.updatePlayerStats = async () => {};
  game.statsService.updateTeamRatings = async () => new Map([1,2,3,4].map(id => [id, { oldElo: 1000, newElo: 1010, delta: 10, gamesPlayed: 1, newRankTier: 1, newRankPoints: 25, rankPointDelta: 25 }]));
  return game;
}
test('game: locale switching, illegal move errors, last trick and swap', () => quiet(async () => {
  const game = fixture('ru');
  assert.match(game.getGameSummary(), /Режим игры/);
  game.setLocale('kk');
  assert.match(game.getGameSummary(), /Ойын режимі/);
  assert.match(game.getLastTrickSummary(), /Соңғы қол/);
  assert.equal((await game.makeMove(999, 0)).message, 'Ойыншы табылмады');
  assert.equal((await game.makeMove(1, 99)).message, 'Карта нөмірі қате');
  assert.match(game.swapPlayers({id: 1, username: 'player1'}, {id: 2, username:'player2'}, -1).message, /Орын ауыстыру/);
  game.setLocale('ru');
  assert.equal((await game.makeMove(999, 0)).message, 'Игрок не найден');
}));
test('game: complete deal uses localized trick and round results, preserves scoring', () => quiet(async () => {
  for (const locale of ['ru', 'kk']) {
    const game = fixture(locale);
    let last;
    for (let move = 0; move < 32; move++) {
      const s = game.getGameState(), player = s.players[s.currentPlayerIndex];
      let result;
      for (let card = 0; card < player.cards.length; card++) {
        result = await game.makeMove(player.id, card);
        if (result.success) break;
      }
      assert.ok(result.success, `no legal move at ${move}`);
      if (result.roundSummary) assert.match(result.roundSummary, locale === 'kk' ? /Үстелдегі/ : /Карты на столе/);
      if (result.roundResults) last = result.roundResults;
    }
    assert.ok(last);
    assert.match(last, locale === 'kk' ? /нәтижелері|Тең ойын|Жұмыртқа|жеңді/ : /Результаты|Яйца|выиграла/);
    assert.doesNotMatch(last, /\{\w+\}|undefined/);
  }
}));
test('game: eggs replay, golden win and surrender summaries in both languages', () => quiet(async () => {
  for (const locale of ['ru', 'kk']) {
    let game = fixture(locale);
    game.state.teams.team1.score = 60; game.state.teams.team2.score = 60;
    assert.match(await game.finishRound(), locale === 'kk' ? /Жұмыртқа/ : /Яйца/);
    assert.equal(game.state.eggsTiebreaker, true);
    game = fixture(locale);
    game.state.teams.team1.score = 120; game.state.teams.team1.tricks = 8;
    const golden = await game.finishRound();
    assert.match(golden, locale === 'kk' ? /таза жеңіспен/ : /голую/);
    assert.match(golden, locale === 'kk' ? /Матч қорытындысы/ : /Итоги матча/);
    assert.equal(game.state.isActive, false);
    game = fixture(locale);
    game.state.teams.team1.score = 10;
    assert.equal((await game.giveUp(1)).status, 'voted');
    const result = await game.giveUp(3);
    assert.equal(result.status, 'surrendered');
    assert.match(result.eloSummary, locale === 'kk' ? /Жеңімпаздар/ : /Победители/);
  }
}));
test('Telegram handlers: any member switches chat language, menu, commands, titles and pagination', () => quiet(async () => {
  const telegraf = require('telegraf');
  const calls = [];
  let bot, seq = 0;
  const callApi = telegraf.Telegram.prototype.callApi;
  const botInfo = { id: 999, is_bot: true, first_name: 'Test', username: 'belka_test_bot' };
  telegraf.Telegram.prototype.callApi = async function(method, payload = {}) {
    calls.push({method, payload});
    if (method === 'getMe') return botInfo;
    return { message_id: ++seq, date: 0, chat: { id: payload.chat_id, type: 'group' }, text: payload.text };
  };
  class TestBot extends telegraf.Telegraf {
    constructor(...args) { super(...args); bot = this; this.botInfo = botInfo; }
    launch() { return new Promise(() => {}); }
    stop() {}
  }
  const methods = {
    async getLeaderboardAllImproved() { return Array.from({ length: 5 }, (_, i) => [i + 1, { username: 'tester', isQualified: true, eloRating: 1000, seasonGamesPlayed: 5, seasonGamesWon: 3 }]); },
    async getLeaderboardChatImproved() { return Array.from({ length: 5 }, (_, i) => [i + 1, { username: 'tester', isQualified: true, eloRating: 1000, rank: this.getRankByRP(1), rankPoints: 25 }]); },
    async getPlayerChatELO() { return 1000; },
    async getPlayerChatRank() { return { tier: 1, points: 25 }; },
    async getLeaderboardAlltime() { return [{ username: 'tester', games_played: 10, games_won: 5, golaya_count: 1, eggs_count: 1, total_tricks: 40 }]; },
    async getChampionsHistory() { return [{ season_name: 'Season 2', is_current: true }]; }
  };
  const originals = Object.fromEntries(Object.keys(methods).map(key => [key, StatsService.prototype[key]]));
  Object.assign(StatsService.prototype, methods);
  try {
    const localRequire = require('node:module').createRequire(path.join(root, 'dist/index.js'));
    const harness = {
      exports: {}, console,
      require(name) {
        if (name === 'telegraf') return { ...telegraf, Telegraf: TestBot };
        if (name === 'dotenv') return { config() {} };
        if (name === './db/setupDatabase') return { __esModule: true, default: async () => true };
        if (name === './services/ChatManager') return { chatManager: { getActualChatId: id => id, addMapping() {} } };
        return localRequire(name);
      },
      process: { env: { BOT_TOKEN: 'offline-test', USE_PROXY: 'false' }, once() {}, exit() { throw Error('Unexpected exit'); } },
      setTimeout: () => ({ unref() {} }), clearTimeout() {}, setInterval: () => ({ unref() {} }), clearInterval() {}
    };
    new Function(...Object.keys(harness), fs.readFileSync(path.join(root, 'dist/index.js'), 'utf8'))(...Object.values(harness));
    await new Promise(resolve => setImmediate(resolve));
    async function command(text, chatId = -101, userId = 10) {
      const start = calls.length;
      await bot.handleUpdate({ update_id: ++seq, message: { message_id: seq, date: 0, text,
        entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }],
        chat: { id: chatId, type: 'group' }, from: { id: userId, is_bot: false, first_name: 'Tester', username: `user${userId}` } } });
      return calls.slice(start);
    }
    async function callback(data, chatId = -101) {
      const start = calls.length;
      await bot.handleUpdate({ update_id: ++seq, callback_query: { id: String(seq), chat_instance: 'test', data,
        from: { id: 123, is_bot: false, first_name: 'Member' }, // No admin status or permissions.
        message: { message_id: 1, date: 0, chat: { id: chatId, type: 'group' }, text: 'language' } } });
      return calls.slice(start);
    }
    assert.ok((await command('/language')).some(x => x.payload.text === ru.languagePrompt));
    const changed = await callback('language:kk');
    assert.ok(changed.some(x => x.method === 'editMessageText' && x.payload.text === kk.languageChanged));
    const menu = changed.find(x => x.method === 'setMyCommands');
    assert.equal(menu.payload.scope.chat_id, -101);
    assert.equal(menu.payload.commands.find(x => x.command === 'join').description, kk['menu.join']);
    const outputs = async text => (await command(text)).filter(x => ['sendMessage','editMessageText'].includes(x.method)).map(x => x.payload.text).join('\n');
    assert.match(await outputs('/help'), /Ережелер/);
    assert.match(await outputs('/ranks'), /Жас жауынгер/);
    assert.match(await outputs('/myrank'), /Осы чаттағы|Осы чат|осы чаттағы/);
    assert.match(await outputs('/titles'), /Ашылған атақтар/);
    assert.match(await outputs('/title@belka_test_bot 🎯 Жеңімпаз'), /Белсенді атақ: 🎯 Жеңімпаз/);
    assert.match(await outputs('/ratingall'), /барлық чат/);
    assert.match(await outputs('/ratingchat'), /осы чат/);
    assert.match((await callback('leaderboardallimproved:5')).find(x => x.method === 'editMessageText').payload.text, /барлық чат/);
    assert.match(await outputs('/alltime'), /барлық уақыттағы/);
    assert.match(await outputs('/history'), /Маусым 2 — жалғасуда/);
    assert.match(await outputs('/swap'), /белсенді ойын жоқ/);
    assert.match(await outputs('/giveup'), /Белсенді ойын жоқ/);
    for (let id = 10; id < 14; id++) await command('/join', -101, id);
    assert.match(await outputs('/startbelka'), /Ойын режимі/);
    assert.match(await outputs('/state'), /Ойын режимі/);
    assert.match(await outputs('/lasttrick'), /Соңғы қол/);
    await callback('language:ru');
    assert.match(await outputs('/state'), /Режим игры/);
    const separate = await command('/help', -202);
    assert.ok(separate.some(x => x.payload.text === ru.help));
    assert.equal(calls.some(x => x.method === 'getChatMember'), false, 'language must not require admin role');
  } finally {
    await new Promise(resolve => setImmediate(resolve));
    telegraf.Telegram.prototype.callApi = callApi;
    Object.assign(StatsService.prototype, originals);
  }
}));

test('supergroup migration preserves language without overwriting a new chat setting', async () => {
  const service = new LocaleService();
  await service.set(-301, 'kk');
  await service.get(-302); // Populate a default entry before migration.
  await service.migrate(-301, -302);
  assert.equal(await service.get(-302), 'kk');
  await service.set(-303, 'ru');
  await service.migrate(-301, -303);
  assert.equal(await service.get(-303), 'ru');
});
test('in-flight locale read cannot overwrite a completed language switch', async () => {
  const original = fakePool.query;
  let resolveRead;
  fakePool.query = async (sql, args) => sql.includes('SELECT locale')
    ? new Promise(resolve => { resolveRead = resolve; }) : original(sql, args);
  try {
    const service = new LocaleService();
    const pending = service.get(-401);
    await service.set(-401, 'kk');
    resolveRead({ rows: [{ locale: 'ru' }] });
    assert.equal(await pending, 'kk');
    assert.equal(await service.get(-401), 'kk');
  } finally { fakePool.query = original; }
});
