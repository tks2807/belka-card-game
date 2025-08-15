"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BelkaGame = void 0;
var StatsService_1 = require("../services/StatsService");
var BelkaGame = /** @class */ (function () {
    function BelkaGame(chatId) {
        this.statsService = new StatsService_1.StatsService();
        this.state = {
            players: [],
            currentPlayerIndex: 0,
            deck: [],
            tableCards: [],
            isActive: false,
            trump: null,
            currentRound: 1,
            trickWinner: null,
            chatId: chatId,
            endVotes: new Set(),
            teams: {
                team1: {
                    players: [],
                    score: 0,
                    tricks: 0,
                    eyes: 0
                },
                team2: {
                    players: [],
                    score: 0,
                    tricks: 0,
                    eyes: 0
                }
            },
            clubJackHolder: null,
            initialClubJackHolder: null,
            playerSuitMap: new Map(),
            hideClubJackHolder: true,
            eggsTiebreaker: false,
            gameMode: 'belka' // По умолчанию режим "белка"
        };
    }
    BelkaGame.prototype.createDeck = function () {
        var suits = ['♠', '♣', '♦', '♥'];
        var ranks = ['7', '8', '9', 'Q', 'K', '10', 'A', 'J'];
        var values = {
            '7': 7, '8': 8, '9': 9,
            'Q': 10, 'K': 11, '10': 12,
            'A': 13, 'J': 14
        };
        var deck = [];
        for (var _i = 0, suits_1 = suits; _i < suits_1.length; _i++) {
            var suit = suits_1[_i];
            for (var _a = 0, ranks_1 = ranks; _a < ranks_1.length; _a++) {
                var rank = ranks_1[_a];
                deck.push({ suit: suit, rank: rank, value: values[rank] });
            }
        }
        return this.shuffleDeck(deck);
    };
    BelkaGame.prototype.shuffleDeck = function (deck) {
        var _a;
        for (var i = deck.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            _a = [deck[j], deck[i]], deck[i] = _a[0], deck[j] = _a[1];
        }
        return deck;
    };
    BelkaGame.prototype.selectTrump = function () {
        var suits = ['♠', '♣', '♦', '♥'];
        return suits[Math.floor(Math.random() * suits.length)];
    };
    BelkaGame.prototype.calculateCardValue = function (card) {
        // Специальная логика для вальтов (они всегда козыри)
        if (card.rank === 'J') {
            switch (card.suit) {
                case '♣': return 1000; // Валет крести - самый старший
                case '♠': return 900; // Валет пики - второй по старшинству
                case '♥': return 800; // Валет черви - третий
                case '♦': return 700; // Валет буби - младший из вальтов
            }
        }
        // Для остальных карт
        var baseValue = card.value;
        return card.suit === this.state.trump ? baseValue + 100 : baseValue;
    };
    BelkaGame.prototype.addPlayer = function (player) {
        if (this.state.isActive || this.state.players.length >= 4) {
            return false;
        }
        var newPlayer = __assign(__assign({}, player), { cards: [], score: 0, tricks: 0, chatId: this.state.chatId });
        this.state.players.push(newPlayer);
        // Распределяем игроков по командам
        if (this.state.players.length === 1 || this.state.players.length === 3) {
            this.state.teams.team1.players.push(newPlayer);
        }
        else {
            this.state.teams.team2.players.push(newPlayer);
        }
        return true;
    };
    BelkaGame.prototype.startGame = function (mode) {
        var _a;
        if (mode === void 0) { mode = 'belka'; }
        if (this.state.isActive) {
            return "Игра уже запущена!";
        }
        this.state.isActive = true;
        this.state.currentRound = 1;
        this.state.currentPlayerIndex = 0;
        this.state.tableCards = [];
        this.state.eggsTiebreaker = false;
        this.state.hideClubJackHolder = true;
        this.state.playerSuitMap.clear();
        this.state.initialClubJackHolder = null;
        this.state.clubJackHolder = null;
        this.state.gameMode = mode;
        console.log("[LOG] \u0417\u0430\u043F\u0443\u0441\u043A \u0438\u0433\u0440\u044B \u0432 \u0440\u0435\u0436\u0438\u043C\u0435: ".concat(mode));
        // Создаем и перемешиваем колоду
        this.state.deck = this.createDeck();
        this.shuffleDeck(this.state.deck);
        // Раздаем карты игрокам
        this.dealCards();
        // Проверяем, нужна ли пересдача
        var needReshuffle = false;
        for (var _i = 0, _b = this.state.players; _i < _b.length; _i++) {
            var player = _b[_i];
            if (this.checkForReshuffle(player.id)) {
                needReshuffle = true;
                console.log("[LOG] \u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u0435\u0440\u0435\u0441\u0434\u0430\u0447\u0430 \u0434\u043B\u044F \u0438\u0433\u0440\u043E\u043A\u0430 ".concat(player.username));
                break;
            }
        }
        if (needReshuffle) {
            console.log("[LOG] \u0412\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u043C \u043F\u0435\u0440\u0435\u0441\u0434\u0430\u0447\u0443 \u043A\u0430\u0440\u0442");
            // Пересдаем карты
            this.state.deck = this.createDeck();
            this.shuffleDeck(this.state.deck);
            this.dealCards();
        }
        // Находим игрока с валетом крести и устанавливаем его как initialClubJackHolder
        for (var _c = 0, _d = this.state.players; _c < _d.length; _c++) {
            var player = _d[_c];
            if (player.cards.some(function (card) { return card.rank === 'J' && card.suit === '♣'; })) {
                console.log("[LOG] \u0412\u0430\u043B\u0435\u0442 \u043A\u0440\u0435\u0441\u0442\u0438 \u0443 \u0438\u0433\u0440\u043E\u043A\u0430 ".concat(player.username));
                this.state.clubJackHolder = player;
                this.state.initialClubJackHolder = player;
                break;
            }
        }
        // Устанавливаем соответствие мастей для каждого игрока
        this.setupPlayerSuitMap();
        // Определяем козырь для первого раунда (всегда крести)
        this.state.trump = '♣';
        console.log("[LOG] \u0418\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F \u0438\u0433\u0440\u044B \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430. \u041A\u043E\u0437\u044B\u0440\u044C: ".concat(this.state.trump, ", \u0434\u0435\u0440\u0436\u0430\u0442\u0435\u043B\u044C \u0432\u0430\u043B\u0435\u0442\u0430 \u043A\u0440\u0435\u0441\u0442\u0438: ").concat(((_a = this.state.clubJackHolder) === null || _a === void 0 ? void 0 : _a.username) || 'не найден'));
        // Возвращаем информацию о начальном состоянии игры
        return this.getGameSummary();
    };
    BelkaGame.prototype.dealCards = function () {
        var cardsPerPlayer = 8;
        for (var _i = 0, _a = this.state.players; _i < _a.length; _i++) {
            var player = _a[_i];
            player.cards = this.state.deck.splice(0, cardsPerPlayer);
            player.cards.sort(function (a, b) {
                if (a.suit === b.suit) {
                    return a.value - b.value;
                }
                return a.suit.localeCompare(b.suit);
            });
        }
    };
    BelkaGame.prototype.makeMove = function (playerId, cardIndex) {
        return __awaiter(this, void 0, void 0, function () {
            var playerIndex, player, card, firstCard, firstCardSuit_1, isFirstCardTrump, hasTrump, isCardTrump, hasSuit, roundSummary, allCardsPlayed, roundResults;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Проверка, активна ли игра
                        if (!this.state.isActive) {
                            return [2 /*return*/, { success: false, message: "Игра неактивна" }];
                        }
                        playerIndex = this.state.players.findIndex(function (p) { return p.id === playerId; });
                        if (playerIndex === -1) {
                            return [2 /*return*/, { success: false, message: 'Игрок не найден' }];
                        }
                        player = this.state.players[playerIndex];
                        if (playerIndex !== this.state.currentPlayerIndex) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: "\u0421\u0435\u0439\u0447\u0430\u0441 \u043D\u0435 \u0432\u0430\u0448 \u0445\u043E\u0434! \u0425\u043E\u0434 \u0438\u0433\u0440\u043E\u043A\u0430: ".concat(this.state.players[this.state.currentPlayerIndex].username)
                                }];
                        }
                        if (cardIndex < 0 || cardIndex >= player.cards.length) {
                            return [2 /*return*/, { success: false, message: 'Некорректный номер карты' }];
                        }
                        card = player.cards[cardIndex];
                        // Проверка хода в масть
                        if (this.state.tableCards.length > 0) {
                            firstCard = this.state.tableCards[0].card;
                            firstCardSuit_1 = firstCard.suit;
                            isFirstCardTrump = firstCardSuit_1 === this.state.trump || firstCard.rank === 'J';
                            if (isFirstCardTrump) {
                                hasTrump = player.cards.some(function (c) {
                                    return c.suit === _this.state.trump || c.rank === 'J';
                                });
                                isCardTrump = card.suit === this.state.trump || card.rank === 'J';
                                if (hasTrump && !isCardTrump) {
                                    // Если у игрока есть козыри (включая вальтов), но он пытается ходить не козырем
                                    return [2 /*return*/, {
                                            success: false,
                                            message: "\u041D\u0443\u0436\u043D\u043E \u0445\u043E\u0434\u0438\u0442\u044C \u043A\u043E\u0437\u044B\u0440\u0435\u043C (\u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0432\u0430\u043B\u044C\u0442\u043E\u0432), \u0442\u0430\u043A \u043A\u0430\u043A \u043F\u0435\u0440\u0432\u0430\u044F \u043A\u0430\u0440\u0442\u0430 \u043A\u043E\u0437\u044B\u0440\u043D\u0430\u044F"
                                        }];
                                }
                            }
                            else {
                                hasSuit = player.cards.some(function (c) { return c.suit === firstCardSuit_1 && c.rank !== 'J'; });
                                if (hasSuit) {
                                    // Если у игрока есть карты масти первой карты
                                    if (card.suit !== firstCardSuit_1 || card.rank === 'J') {
                                        // Если игрок пытается ходить другой мастью или валетом
                                        return [2 /*return*/, {
                                                success: false,
                                                message: "\u041D\u0443\u0436\u043D\u043E \u0445\u043E\u0434\u0438\u0442\u044C \u0432 \u043C\u0430\u0441\u0442\u044C ".concat(firstCardSuit_1, ", \u0432\u0430\u043B\u0435\u0442\u044B \u043D\u0435\u043B\u044C\u0437\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C, \u0435\u0441\u043B\u0438 \u0443 \u0432\u0430\u0441 \u0435\u0441\u0442\u044C \u043A\u0430\u0440\u0442\u044B \u043D\u0443\u0436\u043D\u043E\u0439 \u043C\u0430\u0441\u0442\u0438")
                                            }];
                                    }
                                }
                                // Если у игрока нет карт масти первой карты, он может ходить любой картой (включая валетов)
                            }
                        }
                        // Удаляем карту из руки игрока
                        player.cards.splice(cardIndex, 1);
                        // Добавляем карту на стол
                        this.state.tableCards.push({ card: card, playerId: playerId });
                        if (!(this.state.tableCards.length === this.state.players.length)) return [3 /*break*/, 3];
                        roundSummary = this.createRoundSummary();
                        // Разрешаем раунд и определяем победителя
                        this.resolveRound();
                        allCardsPlayed = this.state.players.every(function (player) { return player.cards.length === 0; });
                        console.log("[LOG] \u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u043A\u0430\u0440\u0442 \u0443 \u0432\u0441\u0435\u0445 \u0438\u0433\u0440\u043E\u043A\u043E\u0432: ".concat(allCardsPlayed));
                        if (!allCardsPlayed) return [3 /*break*/, 2];
                        // Если все карты сыграны, подводим итоги раунда
                        console.log("[LOG] \u0412\u0441\u0435 \u043A\u0430\u0440\u0442\u044B \u0441\u044B\u0433\u0440\u0430\u043D\u044B, \u0444\u043E\u0440\u043C\u0438\u0440\u0443\u0435\u043C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0440\u0430\u0443\u043D\u0434\u0430");
                        return [4 /*yield*/, this.finishRound()];
                    case 1:
                        roundResults = _a.sent();
                        console.log("[LOG] \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0440\u0430\u0443\u043D\u0434\u0430 \u0441\u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u044B, \u0434\u043B\u0438\u043D\u0430: ".concat(roundResults.length));
                        return [2 /*return*/, {
                                success: true,
                                isRoundComplete: true,
                                isGameRoundComplete: true,
                                roundSummary: roundSummary,
                                roundResults: roundResults
                            }];
                    case 2: return [2 /*return*/, {
                            success: true,
                            isRoundComplete: true,
                            roundSummary: roundSummary
                        }];
                    case 3:
                        // Передаем ход следующему игроку
                        this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
                        return [2 /*return*/, {
                                success: true,
                                message: "\u0425\u043E\u0434 \u043F\u0435\u0440\u0435\u0434\u0430\u043D \u0438\u0433\u0440\u043E\u043A\u0443 ".concat(this.state.players[this.state.currentPlayerIndex].username)
                            }];
                }
            });
        });
    };
    BelkaGame.prototype.resolveRound = function () {
        if (this.state.tableCards.length !== 4) {
            throw new Error("Невозможно завершить раунд: на столе не 4 карты");
        }
        // Определяем победителя, используя вспомогательный метод
        // Так как мы уже проверили, что на столе 4 карты, метод determineRoundWinner() вернет правильного победителя
        var winningPlayerId = this.determineRoundWinner();
        var winningPlayer = this.state.players.find(function (p) { return p.id === winningPlayerId; });
        if (!winningPlayer) {
            throw new Error("Не удалось найти победителя раунда");
        }
        winningPlayer.tricks = (winningPlayer.tricks || 0) + 1;
        // Определяем команду победителя
        var winningTeam = this.state.teams.team1.players.some(function (p) { return p.id === winningPlayerId; }) ? 1 : 2;
        // Начисляем очки команде победителя
        var roundScore = 0;
        for (var _i = 0, _a = this.state.tableCards; _i < _a.length; _i++) {
            var tableCard = _a[_i];
            roundScore += this.getCardPoints(tableCard.card);
        }
        if (winningTeam === 1) {
            this.state.teams.team1.score += roundScore;
            this.state.teams.team1.tricks += 1;
        }
        else {
            this.state.teams.team2.score += roundScore;
            this.state.teams.team2.tricks += 1;
        }
        // Устанавливаем следующего игрока (победитель ходит первым)
        this.state.currentPlayerIndex = this.state.players.findIndex(function (p) { return p.id === winningPlayerId; });
        // Очищаем стол
        this.state.tableCards = [];
    };
    // Вспомогательный метод для определения значения валета по масти
    BelkaGame.prototype.getJackValue = function (suit) {
        var jackHierarchy = {
            '♣': 4, // крести (высший)
            '♠': 3, // пики
            '♥': 2, // черви
            '♦': 1 // буби (низший)
        };
        return jackHierarchy[suit] || 0;
    };
    // Вспомогательный метод для определения значения карты
    BelkaGame.prototype.getCardValue = function (card) {
        var valueMap = {
            '7': 1,
            '8': 2,
            '9': 3,
            'Q': 4,
            'K': 5,
            '10': 6,
            'A': 7,
            'J': 8 // Валеты имеют наивысшее значение
        };
        return valueMap[card.rank] || 0;
    };
    BelkaGame.prototype.createRoundSummary = function () {
        var _this = this;
        var summary = '🃏 Карты на столе:\n';
        // Показываем все карты на столе
        this.state.tableCards.forEach(function (tableCard) {
            if (!tableCard)
                return; // Пропускаем, если карта не определена
            var player = _this.state.players.find(function (p) { return p.id === tableCard.playerId; });
            if (!player)
                return; // Пропускаем, если игрок не найден
            summary += "".concat(player.username, ": ").concat(tableCard.card.suit).concat(tableCard.card.rank, "\n");
        });
        // Определяем победителя или следующего игрока
        var nextPlayerId = this.determineRoundWinner();
        var nextPlayer = this.state.players.find(function (p) { return p.id === nextPlayerId; });
        if (nextPlayer) {
            // Если на столе уже все карты, показываем, кто забирает взятку
            if (this.state.tableCards.length === this.state.players.length) {
                summary += "\n\uD83C\uDFC6 \u0412\u0437\u044F\u0442\u043A\u0443 \u0437\u0430\u0431\u0438\u0440\u0430\u0435\u0442: ".concat(nextPlayer.username);
            }
            // В любом случае показываем, чей следующий ход
            summary += "\n\uD83C\uDFAF \u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0445\u043E\u0434: @".concat(nextPlayer.username);
        }
        return summary;
    };
    // Вспомогательный метод для определения победителя раунда
    BelkaGame.prototype.determineRoundWinner = function () {
        if (this.state.tableCards.length !== 4) {
            // Если на столе еще не все карты, "победителя" еще нет
            // Возвращаем ID текущего игрока как "следующего"
            return this.state.players[this.state.currentPlayerIndex].id;
        }
        // Определяем первую карту и ее масть
        var firstCard = this.state.tableCards[0].card;
        var leadSuit = firstCard.suit;
        // Определяем козырную масть
        var trumpSuit = this.state.trump;
        var winningCardIndex = 0;
        var highestValue = this.getCardValue(this.state.tableCards[0].card);
        for (var i = 1; i < this.state.tableCards.length; i++) {
            var currentCard = this.state.tableCards[i].card;
            // Проверяем, является ли карта валетом (валеты всегда козыри)
            var isCurrentJack = currentCard.rank === 'J';
            var isWinningJack = this.state.tableCards[winningCardIndex].card.rank === 'J';
            // Проверяем, является ли карта козырем
            var isCurrentTrump = currentCard.suit === trumpSuit || isCurrentJack;
            var isWinningTrump = this.state.tableCards[winningCardIndex].card.suit === trumpSuit || isWinningJack;
            // Если текущая карта - валет, а выигрывающая - нет, или текущая карта - козырь, а выигрывающая - нет
            if ((isCurrentJack && !isWinningJack) || (isCurrentTrump && !isWinningTrump)) {
                winningCardIndex = i;
                highestValue = this.getCardValue(currentCard);
                continue;
            }
            // Если обе карты - валеты, сравниваем их по иерархии
            if (isCurrentJack && isWinningJack) {
                var currentJackValue = this.getJackValue(currentCard.suit);
                var winningJackValue = this.getJackValue(this.state.tableCards[winningCardIndex].card.suit);
                if (currentJackValue > winningJackValue) {
                    winningCardIndex = i;
                    highestValue = this.getCardValue(currentCard);
                }
                continue;
            }
            // Если обе карты - козыри (но не валеты), сравниваем их по значению
            if (isCurrentTrump && isWinningTrump && !isCurrentJack && !isWinningJack) {
                if (this.getCardValue(currentCard) > highestValue) {
                    winningCardIndex = i;
                    highestValue = this.getCardValue(currentCard);
                }
                continue;
            }
            // Если ни одна из карт не козырь и не валет, и текущая карта той же масти, что и первая
            if (!isCurrentTrump && !isWinningTrump && currentCard.suit === leadSuit) {
                if (this.getCardValue(currentCard) > highestValue) {
                    winningCardIndex = i;
                    highestValue = this.getCardValue(currentCard);
                }
            }
        }
        // Возвращаем ID победителя
        return this.state.tableCards[winningCardIndex].playerId;
    };
    BelkaGame.prototype.getJackPriority = function (suit) {
        switch (suit) {
            case '♣': return 4; // Крести (самый старший)
            case '♠': return 3; // Пики
            case '♥': return 2; // Черви
            case '♦': return 1; // Буби (самый младший)
            default: return 0;
        }
    };
    BelkaGame.prototype.checkRoundWinConditions = function () {
        var _this = this;
        // Проверка на "голую"
        if (this.state.teams.team1.score === 120 && this.state.teams.team2.tricks === 0) {
            this.endGame(true, 1); // Добавляем второй параметр - номер команды
            return;
        }
        if (this.state.teams.team2.score === 120 && this.state.teams.team1.tricks === 0) {
            this.endGame(true, 2); // Добавляем второй параметр - номер команды
            return;
        }
        // Проверка на "яйца" (по 60 очков)
        if (this.state.teams.team1.score === 60 && this.state.teams.team2.score === 60) {
            this.state.players.forEach(function (player) {
                _this.statsService.updatePlayerStats(player.id, player.username, false, 0, 0, true, false, _this.state.chatId, false);
            });
            // Логика для "яиц" - переигрываем раунд
            this.state.eggsTiebreaker = true; // Устанавливаем флаг переигровки
            this.startNewRound(); // Переигрываем раунд
            return;
        }
        // Обычный подсчет глаз
        if (this.state.teams.team1.score >= 91) {
            this.state.teams.team1.eyes += 2;
        }
        else if (this.state.teams.team1.score >= 61) {
            this.state.teams.team1.eyes += 1;
        }
        if (this.state.teams.team2.score >= 91) {
            this.state.teams.team2.eyes += 2;
        }
        else if (this.state.teams.team2.score >= 61) {
            this.state.teams.team2.eyes += 1;
        }
        // Определяем необходимое количество глаз для победы в зависимости от режима игры
        var eyesToWin = this.state.gameMode === 'belka' ? 12 : 6;
        // Проверка на победу по глазам
        if (this.state.teams.team1.eyes >= eyesToWin) {
            this.endGame(false, 1); // Добавляем второй параметр - номер команды
            return;
        }
        if (this.state.teams.team2.eyes >= eyesToWin) {
            this.endGame(false, 2); // Добавляем второй параметр - номер команды
            return;
        }
        // Если никто не выиграл, начинаем новый раунд
        this.startNewRound();
    };
    BelkaGame.prototype.calculatePoints = function (tableCards) {
        var points = 0;
        for (var _i = 0, tableCards_1 = tableCards; _i < tableCards_1.length; _i++) {
            var tableCard = tableCards_1[_i];
            var card = tableCard.card;
            switch (card.rank) {
                case 'A':
                    points += 11;
                    break;
                case '10':
                    points += 10;
                    break;
                case 'K':
                    points += 4;
                    break;
                case 'Q':
                    points += 3;
                    break;
                case 'J':
                    points += 2;
                    break;
                default: break;
            }
        }
        return points;
    };
    BelkaGame.prototype.startNewRound = function () {
        var _a;
        this.state.currentRound++;
        console.log("[LOG] \u041D\u0430\u0447\u0438\u043D\u0430\u0435\u0442\u0441\u044F \u0440\u0430\u0443\u043D\u0434 ".concat(this.state.currentRound));
        // Сбрасываем счет и взятки для нового раунда
        this.state.teams.team1.score = 0;
        this.state.teams.team1.tricks = 0;
        this.state.teams.team2.score = 0;
        this.state.teams.team2.tricks = 0;
        // Создаем новую колоду и раздаем карты
        this.state.deck = this.createDeck();
        this.dealCards();
        // Проверяем, нужна ли пересдача
        var needReshuffle = false;
        for (var _i = 0, _b = this.state.players; _i < _b.length; _i++) {
            var player = _b[_i];
            if (this.checkForReshuffle(player.id)) {
                needReshuffle = true;
                console.log("[LOG] \u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u0435\u0440\u0435\u0441\u0434\u0430\u0447\u0430 \u0434\u043B\u044F \u0438\u0433\u0440\u043E\u043A\u0430 ".concat(player.username));
                break;
            }
        }
        if (needReshuffle) {
            console.log("[LOG] \u0412\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u043C \u043F\u0435\u0440\u0435\u0441\u0434\u0430\u0447\u0443 \u043A\u0430\u0440\u0442");
            // Пересдаем карты
            this.state.deck = this.createDeck();
            this.shuffleDeck(this.state.deck);
            this.dealCards();
        }
        // Сначала сбрасываем держателя валета крести
        this.state.clubJackHolder = null;
        // Находим игрока с валетом крести
        for (var _c = 0, _d = this.state.players; _c < _d.length; _c++) {
            var player = _d[_c];
            if (player.cards.some(function (card) { return card.rank === 'J' && card.suit === '♣'; })) {
                console.log("[LOG] \u0412\u0430\u043B\u0435\u0442 \u043A\u0440\u0435\u0441\u0442\u0438 \u0443 \u0438\u0433\u0440\u043E\u043A\u0430 ".concat(player.username));
                this.state.clubJackHolder = player;
                break;
            }
        }
        // После первого раунда показываем, чей козырь
        if (this.state.currentRound > 1) {
            this.state.hideClubJackHolder = false;
        }
        // Определяем козырь для нового раунда
        this.determineNewTrump();
        console.log("[LOG] \u0420\u0430\u0443\u043D\u0434 ".concat(this.state.currentRound, " \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D. \u041A\u043E\u0437\u044B\u0440\u044C: ").concat(this.state.trump, ", \u0434\u0435\u0440\u0436\u0430\u0442\u0435\u043B\u044C \u0432\u0430\u043B\u0435\u0442\u0430 \u043A\u0440\u0435\u0441\u0442\u0438: ").concat(((_a = this.state.clubJackHolder) === null || _a === void 0 ? void 0 : _a.username) || 'не найден'));
    };
    BelkaGame.prototype.determineNewTrump = function () {
        // Находим игрока с валетом крести
        var clubJackHolder = null;
        for (var _i = 0, _a = this.state.players; _i < _a.length; _i++) {
            var player = _a[_i];
            if (player.cards.some(function (card) { return card.rank === 'J' && card.suit === '♣'; })) {
                clubJackHolder = player;
                break;
            }
        }
        if (clubJackHolder) {
            // Сохраняем текущего держателя валета крести
            this.state.clubJackHolder = clubJackHolder;
            // В первом раунде козырь всегда крести
            if (this.state.currentRound === 1) {
                this.state.trump = '♣';
                return;
            }
            // Определяем масть козыря по карте игрока
            if (this.state.playerSuitMap && this.state.playerSuitMap.has(clubJackHolder.id)) {
                this.state.trump = this.state.playerSuitMap.get(clubJackHolder.id);
            }
            else {
                // Если по какой-то причине нет соответствия, устанавливаем крести
                this.state.trump = '♣';
            }
        }
        else {
            // Если валет крести не найден, выбираем случайный козырь
            this.state.trump = this.selectTrump();
        }
    };
    BelkaGame.prototype.finishRound = function () {
        return __awaiter(this, void 0, void 0, function () {
            var team1Won, team2Won, isTie, team1Eyes, team2Eyes, isClubJackInTeam1, results, eyesToWin, newRoundSummary;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        team1Won = this.state.teams.team1.score > this.state.teams.team2.score;
                        team2Won = this.state.teams.team2.score > this.state.teams.team1.score;
                        isTie = this.state.teams.team1.score === this.state.teams.team2.score;
                        team1Eyes = 0;
                        team2Eyes = 0;
                        if (!(this.state.teams.team1.score === 120 && this.state.teams.team2.tricks === 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.endGame(true, 1)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, "🏆 Команда 1 выиграла 'голую'! Игра окончена!"];
                    case 2:
                        if (!(this.state.teams.team2.score === 120 && this.state.teams.team1.tricks === 0)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.endGame(true, 2)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, "🏆 Команда 2 выиграла 'голую'! Игра окончена!"];
                    case 4:
                        // Проверка на "яйца" (по 60 очков)
                        if (this.state.teams.team1.score === 60 && this.state.teams.team2.score === 60) {
                            return [2 /*return*/, "🥚 Яйца! Обе команды набрали по 60 очков. Раунд будет переигран, победившая команда получит 4 очка."];
                        }
                        // Проверка, является ли этот раунд переигровкой после "яиц"
                        if (this.state.eggsTiebreaker) {
                            if (team1Won) {
                                this.state.teams.team1.eyes += 4;
                                team1Eyes = 4;
                            }
                            else if (team2Won) {
                                this.state.teams.team2.eyes += 4;
                                team2Eyes = 4;
                            }
                            // Сбрасываем флаг переигровки
                            this.state.eggsTiebreaker = false;
                        }
                        else {
                            // После 1-го раунда выигравшей команде всегда 2 глаза
                            if (this.state.currentRound === 1) {
                                if (team1Won) {
                                    this.state.teams.team1.eyes += 2;
                                    team1Eyes = 2;
                                }
                                else if (team2Won) {
                                    this.state.teams.team2.eyes += 2;
                                    team2Eyes = 2;
                                }
                            }
                            else {
                                // Обычный подсчет глаз для последующих раундов
                                if (this.state.teams.team1.score >= 91) {
                                    this.state.teams.team1.eyes += 2;
                                    team1Eyes = 2;
                                }
                                else if (this.state.teams.team1.score >= 61) {
                                    this.state.teams.team1.eyes += 1;
                                    team1Eyes = 1;
                                }
                                if (this.state.teams.team2.score >= 91) {
                                    this.state.teams.team2.eyes += 2;
                                    team2Eyes = 2;
                                }
                                else if (this.state.teams.team2.score >= 61) {
                                    this.state.teams.team2.eyes += 1;
                                    team2Eyes = 1;
                                }
                            }
                        }
                        // Проверяем, у кого валет крести и добавляем дополнительный глаз (только не в первом раунде)
                        if (this.state.clubJackHolder && this.state.currentRound > 1) {
                            isClubJackInTeam1 = this.state.teams.team1.players.some(function (p) { return p.id === _this.state.clubJackHolder.id; });
                            // Если валет крести у команды 2, а выиграла команда 1
                            if (!isClubJackInTeam1 && team1Won) {
                                this.state.teams.team1.eyes += 1;
                                team1Eyes += 1;
                            }
                            // Если валет крести у команды 1, а выиграла команда 2
                            if (isClubJackInTeam1 && team2Won) {
                                this.state.teams.team2.eyes += 1;
                                team2Eyes += 1;
                            }
                        }
                        results = "\uD83D\uDCCA \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0440\u0430\u0443\u043D\u0434\u0430 ".concat(this.state.currentRound, ":\n\n");
                        // Добавляем информацию о победителе раунда
                        if (team1Won) {
                            results += "\uD83C\uDFC6 \u041F\u043E\u0431\u0435\u0434\u0438\u0442\u0435\u043B\u044C \u0440\u0430\u0443\u043D\u0434\u0430: \u041A\u043E\u043C\u0430\u043D\u0434\u0430 1\n\n";
                        }
                        else if (team2Won) {
                            results += "\uD83C\uDFC6 \u041F\u043E\u0431\u0435\u0434\u0438\u0442\u0435\u043B\u044C \u0440\u0430\u0443\u043D\u0434\u0430: \u041A\u043E\u043C\u0430\u043D\u0434\u0430 2\n\n";
                        }
                        else if (isTie) {
                            results += "\uD83E\uDD5A \u041D\u0438\u0447\u044C\u044F (\u042F\u0439\u0446\u0430)! \u041E\u0431\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043D\u0430\u0431\u0440\u0430\u043B\u0438 \u043F\u043E ".concat(this.state.teams.team1.score, " \u043E\u0447\u043A\u043E\u0432.\n\n");
                        }
                        results += "\uD83D\uDC65 \u041A\u043E\u043C\u0430\u043D\u0434\u0430 1:\n";
                        // Список игроков команды 1
                        this.state.teams.team1.players.forEach(function (player) {
                            var playerName = player.username;
                            // Показываем значок козыря для держателя валета крести
                            if (_this.state.clubJackHolder && !_this.state.hideClubJackHolder && player.id === _this.state.clubJackHolder.id) {
                                playerName += " 🃏";
                            }
                            // Добавляем информацию о мастях игроков только после первого раунда
                            if (_this.state.currentRound > 1) {
                                if (_this.state.initialClubJackHolder && player.id === _this.state.initialClubJackHolder.id) {
                                    playerName += " (\u2663)";
                                }
                                else if (_this.state.playerSuitMap.has(player.id)) {
                                    playerName += " (".concat(_this.state.playerSuitMap.get(player.id), ")");
                                }
                            }
                            results += "- ".concat(playerName, "\n");
                        });
                        results += "\uD83D\uDCAF \u041E\u0447\u043A\u0438 \u0432 \u0440\u0430\u0443\u043D\u0434\u0435: ".concat(this.state.teams.team1.score, "\n");
                        results += "\uD83D\uDC51 \u0412\u0437\u044F\u0442\u043A\u0438: ".concat(this.state.teams.team1.tricks, "\n");
                        // Добавляем информацию о глазах
                        if (this.state.currentRound === 1 && team1Won) {
                            results += "\uD83D\uDC41\uFE0F \u0413\u043B\u0430\u0437\u0430 \u0432 \u044D\u0442\u043E\u043C \u0440\u0430\u0443\u043D\u0434\u0435: +".concat(team1Eyes, " (\u043F\u0435\u0440\u0432\u044B\u0439 \u0440\u0430\u0443\u043D\u0434)\n");
                        }
                        else if (this.state.eggsTiebreaker && team1Won) {
                            results += "\uD83D\uDC41\uFE0F \u0413\u043B\u0430\u0437\u0430 \u0432 \u044D\u0442\u043E\u043C \u0440\u0430\u0443\u043D\u0434\u0435: +".concat(team1Eyes, " (\u043F\u0435\u0440\u0435\u0438\u0433\u0440\u043E\u0432\u043A\u0430 \u043F\u043E\u0441\u043B\u0435 \"\u044F\u0438\u0446\")\n");
                        }
                        else if (this.state.currentRound > 1 && this.state.clubJackHolder &&
                            !this.state.teams.team1.players.some(function (p) { return p.id === _this.state.clubJackHolder.id; }) &&
                            team1Won) {
                            results += "\uD83D\uDC41\uFE0F \u0413\u043B\u0430\u0437\u0430 \u0432 \u044D\u0442\u043E\u043C \u0440\u0430\u0443\u043D\u0434\u0435: +".concat(team1Eyes, " (\u0432\u043A\u043B\u044E\u0447\u0430\u044F +1 \u0437\u0430 \u0432\u0430\u043B\u0435\u0442\u0430 \u043A\u0440\u0435\u0441\u0442\u0438 \u0443 \u0441\u043E\u043F\u0435\u0440\u043D\u0438\u043A\u043E\u0432)\n");
                        }
                        else {
                            results += "\uD83D\uDC41\uFE0F \u0413\u043B\u0430\u0437\u0430 \u0432 \u044D\u0442\u043E\u043C \u0440\u0430\u0443\u043D\u0434\u0435: +".concat(team1Eyes, "\n");
                        }
                        results += "\uD83D\uDC41\uFE0F \u0412\u0441\u0435\u0433\u043E \u0433\u043B\u0430\u0437: ".concat(this.state.teams.team1.eyes, "\n\n");
                        results += "\uD83D\uDC65 \u041A\u043E\u043C\u0430\u043D\u0434\u0430 2:\n";
                        // Список игроков команды 2
                        this.state.teams.team2.players.forEach(function (player) {
                            var playerName = player.username;
                            // Показываем значок козыря для держателя валета крести
                            if (_this.state.clubJackHolder && !_this.state.hideClubJackHolder && player.id === _this.state.clubJackHolder.id) {
                                playerName += " 🃏";
                            }
                            // Добавляем информацию о мастях игроков только после первого раунда
                            if (_this.state.currentRound > 1) {
                                if (_this.state.initialClubJackHolder && player.id === _this.state.initialClubJackHolder.id) {
                                    playerName += " (\u2663)";
                                }
                                else if (_this.state.playerSuitMap.has(player.id)) {
                                    playerName += " (".concat(_this.state.playerSuitMap.get(player.id), ")");
                                }
                            }
                            results += "- ".concat(playerName, "\n");
                        });
                        results += "\uD83D\uDCAF \u041E\u0447\u043A\u0438 \u0432 \u0440\u0430\u0443\u043D\u0434\u0435: ".concat(this.state.teams.team2.score, "\n");
                        results += "\uD83D\uDC51 \u0412\u0437\u044F\u0442\u043A\u0438: ".concat(this.state.teams.team2.tricks, "\n");
                        // Добавляем информацию о глазах
                        if (this.state.currentRound === 1 && team2Won) {
                            results += "\uD83D\uDC41\uFE0F \u0413\u043B\u0430\u0437\u0430 \u0432 \u044D\u0442\u043E\u043C \u0440\u0430\u0443\u043D\u0434\u0435: +".concat(team2Eyes, " (\u043F\u0435\u0440\u0432\u044B\u0439 \u0440\u0430\u0443\u043D\u0434)\n");
                        }
                        else if (this.state.eggsTiebreaker && team2Won) {
                            results += "\uD83D\uDC41\uFE0F \u0413\u043B\u0430\u0437\u0430 \u0432 \u044D\u0442\u043E\u043C \u0440\u0430\u0443\u043D\u0434\u0435: +".concat(team2Eyes, " (\u043F\u0435\u0440\u0435\u0438\u0433\u0440\u043E\u0432\u043A\u0430 \u043F\u043E\u0441\u043B\u0435 \"\u044F\u0438\u0446\")\n");
                        }
                        else if (this.state.currentRound > 1 && this.state.clubJackHolder &&
                            this.state.teams.team1.players.some(function (p) { return p.id === _this.state.clubJackHolder.id; }) &&
                            team2Won) {
                            results += "\uD83D\uDC41\uFE0F \u0413\u043B\u0430\u0437\u0430 \u0432 \u044D\u0442\u043E\u043C \u0440\u0430\u0443\u043D\u0434\u0435: +".concat(team2Eyes, " (\u0432\u043A\u043B\u044E\u0447\u0430\u044F +1 \u0437\u0430 \u0432\u0430\u043B\u0435\u0442\u0430 \u043A\u0440\u0435\u0441\u0442\u0438 \u0443 \u0441\u043E\u043F\u0435\u0440\u043D\u0438\u043A\u043E\u0432)\n");
                        }
                        else {
                            results += "\uD83D\uDC41\uFE0F \u0413\u043B\u0430\u0437\u0430 \u0432 \u044D\u0442\u043E\u043C \u0440\u0430\u0443\u043D\u0434\u0435: +".concat(team2Eyes, "\n");
                        }
                        results += "\uD83D\uDC41\uFE0F \u0412\u0441\u0435\u0433\u043E \u0433\u043B\u0430\u0437: ".concat(this.state.teams.team2.eyes, "\n");
                        eyesToWin = this.state.gameMode === 'belka' ? 12 : 6;
                        if (!(this.state.teams.team1.eyes >= eyesToWin)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.endGame(false, 1)];
                    case 5:
                        _a.sent();
                        results += "\n\uD83C\uDFC6\uD83C\uDFC6\uD83C\uDFC6 \u041A\u043E\u043C\u0430\u043D\u0434\u0430 1 \u043D\u0430\u0431\u0440\u0430\u043B\u0430 ".concat(this.state.teams.team1.eyes, " \u0433\u043B\u0430\u0437 (\u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F ").concat(eyesToWin, ")! \u0418\u0433\u0440\u0430 \u043E\u043A\u043E\u043D\u0447\u0435\u043D\u0430!");
                        return [3 /*break*/, 9];
                    case 6:
                        if (!(this.state.teams.team2.eyes >= eyesToWin)) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.endGame(false, 2)];
                    case 7:
                        _a.sent();
                        results += "\n\uD83C\uDFC6\uD83C\uDFC6\uD83C\uDFC6 \u041A\u043E\u043C\u0430\u043D\u0434\u0430 2 \u043D\u0430\u0431\u0440\u0430\u043B\u0430 ".concat(this.state.teams.team2.eyes, " \u0433\u043B\u0430\u0437 (\u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F ").concat(eyesToWin, ")! \u0418\u0433\u0440\u0430 \u043E\u043A\u043E\u043D\u0447\u0435\u043D\u0430!");
                        return [3 /*break*/, 9];
                    case 8:
                        // Если никто не выиграл, начинаем новый раунд
                        this.startNewRound();
                        results += "\n\uD83C\uDCCF \u041D\u0430\u0447\u0438\u043D\u0430\u0435\u0442\u0441\u044F \u0440\u0430\u0443\u043D\u0434 ".concat(this.state.currentRound, "!\n\n");
                        newRoundSummary = this.getGameSummary();
                        results += newRoundSummary;
                        _a.label = 9;
                    case 9: return [2 /*return*/, results];
                }
            });
        });
    };
    BelkaGame.prototype.endGame = function (isGolden, winningTeam) {
        return __awaiter(this, void 0, void 0, function () {
            var winners, losers, _i, winners_1, player, _a, losers_1, player, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.state.isActive = false;
                        winners = winningTeam === 1 ? this.state.teams.team1.players : this.state.teams.team2.players;
                        losers = winningTeam === 1 ? this.state.teams.team2.players : this.state.teams.team1.players;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 10, , 11]);
                        _i = 0, winners_1 = winners;
                        _b.label = 2;
                    case 2:
                        if (!(_i < winners_1.length)) return [3 /*break*/, 5];
                        player = winners_1[_i];
                        return [4 /*yield*/, this.statsService.updatePlayerStats(player.id, player.username, true, winningTeam === 1 ? this.state.teams.team1.score : this.state.teams.team2.score, player.tricks || 0, false, isGolden, this.state.chatId)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        _a = 0, losers_1 = losers;
                        _b.label = 6;
                    case 6:
                        if (!(_a < losers_1.length)) return [3 /*break*/, 9];
                        player = losers_1[_a];
                        return [4 /*yield*/, this.statsService.updatePlayerStats(player.id, player.username, false, winningTeam === 1 ? this.state.teams.team2.score : this.state.teams.team1.score, player.tricks || 0, false, false, this.state.chatId)];
                    case 7:
                        _b.sent();
                        _b.label = 8;
                    case 8:
                        _a++;
                        return [3 /*break*/, 6];
                    case 9:
                        if (isGolden) {
                            this.state.clubJackHolder = winners[0];
                        }
                        return [3 /*break*/, 11];
                    case 10:
                        error_1 = _b.sent();
                        console.error('Ошибка при обновлении статистики игроков:', error_1);
                        return [3 /*break*/, 11];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    BelkaGame.prototype.getGameState = function () {
        // Возвращаем состояние игры без внутренних полей
        var _a = this.state, endVotes = _a.endVotes, gameState = __rest(_a, ["endVotes"]);
        return gameState;
    };
    BelkaGame.prototype.getGameSummary = function () {
        var _this = this;
        // Определяем необходимое количество глаз для победы в зависимости от режима игры
        var eyesToWin = this.state.gameMode === 'belka' ? 12 : 6;
        var gameModeName = this.state.gameMode === 'belka' ? 'Белка' : 'Шалқа';
        var summary = "\uD83C\uDFAE \u0420\u0435\u0436\u0438\u043C \u0438\u0433\u0440\u044B: ".concat(gameModeName, " (\u0434\u043E ").concat(eyesToWin, " \u0433\u043B\u0430\u0437)\n");
        summary += "\uD83C\uDCCF \u0420\u0430\u0443\u043D\u0434 ".concat(this.state.currentRound, "\n");
        summary += "\u2660\uFE0F\u2663\uFE0F\u2666\uFE0F\u2665\uFE0F \u041A\u043E\u0437\u044B\u0440\u044C: ".concat(this.state.trump);
        // Показываем информацию о держателе валета крести только после первого раунда
        if (this.state.clubJackHolder && !this.state.hideClubJackHolder) {
            summary += " (\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D \u0438\u0433\u0440\u043E\u043A\u043E\u043C ".concat(this.state.clubJackHolder.username, ")");
        }
        summary += "\n\n";
        // Информация о командах
        summary += '👥 Команда 1:\n';
        this.state.teams.team1.players.forEach(function (player) {
            var playerName = player.username;
            // Показываем значок козыря для держателя валета крести
            if (_this.state.clubJackHolder && !_this.state.hideClubJackHolder && player.id === _this.state.clubJackHolder.id) {
                playerName += " 🃏";
            }
            // Добавляем информацию о мастях игроков только после первого раунда
            if (_this.state.currentRound > 1) {
                if (_this.state.initialClubJackHolder && player.id === _this.state.initialClubJackHolder.id) {
                    playerName += " (\u2663)";
                }
                else if (_this.state.playerSuitMap.has(player.id)) {
                    playerName += " (".concat(_this.state.playerSuitMap.get(player.id), ")");
                }
            }
            summary += "- ".concat(playerName, "\n");
        });
        // Добавляем отступ между списком игроков и информацией о глазах
        summary += "\n\uD83D\uDC41\uFE0F \u0413\u043B\u0430\u0437\u0430: ".concat(this.state.teams.team1.eyes, "/").concat(eyesToWin, "\n\n");
        summary += '👥 Команда 2:\n';
        this.state.teams.team2.players.forEach(function (player) {
            var playerName = player.username;
            // Показываем значок козыря для держателя валета крести
            if (_this.state.clubJackHolder && !_this.state.hideClubJackHolder && player.id === _this.state.clubJackHolder.id) {
                playerName += " 🃏";
            }
            // Добавляем информацию о мастях игроков только после первого раунда
            if (_this.state.currentRound > 1) {
                if (_this.state.initialClubJackHolder && player.id === _this.state.initialClubJackHolder.id) {
                    playerName += " (\u2663)";
                }
                else if (_this.state.playerSuitMap.has(player.id)) {
                    playerName += " (".concat(_this.state.playerSuitMap.get(player.id), ")");
                }
            }
            summary += "- ".concat(playerName, "\n");
        });
        // Добавляем отступ между списком игроков и информацией о глазах
        summary += "\n\uD83D\uDC41\uFE0F \u0413\u043B\u0430\u0437\u0430: ".concat(this.state.teams.team2.eyes, "/").concat(eyesToWin, "\n");
        // Добавляем информацию о том, чей первый ход
        var currentPlayer = this.state.players[this.state.currentPlayerIndex];
        if (currentPlayer) {
            summary += "\n\uD83C\uDFAF \u041F\u0435\u0440\u0432\u044B\u0439 \u0445\u043E\u0434: @".concat(currentPlayer.username);
        }
        return summary;
    };
    BelkaGame.prototype.initializeEndVoting = function (initiatorId) {
        this.state.endVotes.clear(); // Очищаем предыдущие голоса
        this.state.endVotes.add(initiatorId);
    };
    BelkaGame.prototype.voteForEnd = function (playerId) {
        // Проверяем, активна ли игра
        if (!this.state.isActive) {
            return { status: 'not_player' };
        }
        // Проверяем, является ли голосующий игроком
        if (!this.state.players.some(function (p) { return p.id === playerId; })) {
            return { status: 'not_player' };
        }
        // Проверяем, не голосовал ли уже
        if (this.state.endVotes.has(playerId)) {
            return { status: 'already_voted' };
        }
        // Добавляем голос
        this.state.endVotes.add(playerId);
        var votesCount = this.state.endVotes.size;
        var requiredVotes = Math.ceil(this.state.players.length / 2);
        var gameEnded = votesCount >= requiredVotes;
        if (gameEnded) {
            // Определяем победителя по текущему счету
            var winningTeam = this.state.teams.team1.eyes > this.state.teams.team2.eyes ? 1 : 2;
            this.endGame(false, winningTeam); // Добавляем второй параметр - номер команды
        }
        return {
            status: 'voted',
            votesCount: votesCount,
            requiredVotes: requiredVotes,
            gameEnded: gameEnded
        };
    };
    BelkaGame.prototype.checkForReshuffle = function (playerId) {
        var _this = this;
        var player = this.state.players.find(function (p) { return p.id === playerId; });
        if (!player)
            return false;
        // Подсчет очков в руке
        var pointsInHand = player.cards.reduce(function (sum, card) {
            return sum + _this.getCardPoints(card);
        }, 0);
        // Подсчет карт одной масти (без учета валетов)
        var suitCounts = player.cards.reduce(function (counts, card) {
            if (card.rank !== 'J') {
                counts[card.suit] = (counts[card.suit] || 0) + 1;
            }
            return counts;
        }, {});
        // Проверка условий пересдачи
        return pointsInHand <= 13 || Object.values(suitCounts).some(function (count) { return count >= 5; });
    };
    BelkaGame.prototype.getCardPoints = function (card) {
        switch (card.rank) {
            case 'A': return 11;
            case '10': return 10;
            case 'K': return 4;
            case 'Q': return 3;
            case 'J': return 2;
            default: return 0;
        }
    };
    BelkaGame.prototype.setupPlayerSuitMap = function () {
        var _this = this;
        if (!this.state.initialClubJackHolder)
            return;
        // Определяем индекс игрока с валетом крести
        var initialHolderIndex = this.state.players.findIndex(function (p) { return p.id === _this.state.initialClubJackHolder.id; });
        if (initialHolderIndex === -1)
            return;
        // Устанавливаем масти для каждого игрока
        // Порядок мастей: ♣ (крести), ♥ (черви), ♠ (пики), ♦ (буби)
        var suits = ['♣', '♥', '♠', '♦'];
        // Очищаем предыдущую карту мастей
        this.state.playerSuitMap.clear();
        // Игрок с валетом крести всегда отвечает за крести
        for (var i = 0; i < this.state.players.length; i++) {
            var player = this.state.players[i];
            // Вычисляем смещение от игрока с валетом крести
            var suitIndex = (i - initialHolderIndex + 4) % 4;
            // Присваиваем масть каждому игроку
            this.state.playerSuitMap.set(player.id, suits[suitIndex]);
        }
        // Выводим отладочную информацию
        console.log("[LOG] \u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435 \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u0438 \u043C\u0430\u0441\u0442\u0435\u0439:");
        this.state.players.forEach(function (player) {
            console.log("[LOG] ".concat(player.username, ": ").concat(_this.state.playerSuitMap.get(player.id)));
        });
    };
    BelkaGame.prototype.setGameMode = function (mode) {
        this.state.gameMode = mode;
        console.log("[LOG] \u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D \u0440\u0435\u0436\u0438\u043C \u0438\u0433\u0440\u044B: ".concat(mode));
    };
    return BelkaGame;
}());
exports.BelkaGame = BelkaGame;
