"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var telegraf_1 = require("telegraf");
var dotenv = __importStar(require("dotenv"));
var BelkaGame_1 = require("./game/BelkaGame");
var StatsService_1 = require("./services/StatsService");
var setupDatabase_1 = __importDefault(require("./db/setupDatabase"));
// Загружаем переменные окружения
dotenv.config();
// Инициализируем базу данных перед запуском бота
(0, setupDatabase_1.default)()
    .then(function () {
    console.log('Database initialized successfully');
})
    .catch(function (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
});
// Инициализируем бота
var bot = new telegraf_1.Telegraf(process.env['BOT_TOKEN'] || '');
// Хранилище игр
var games = new Map();
// Хранилище информации о картах игроков в личных чатах
var playerCardsInPrivateChat = new Map();
// Хранилище соответствий карт и стикеров
var cardStickers = {
    // Пики
    '♠7': 'CAACAgUAAxkDAAIEOWfZCtljnc0MneX4xhYL4-0bVT9wAAJfAQACVyrBVZgoDoBoN4s0NgQ',
    '♠8': 'CAACAgUAAxkDAAIEJ2fZCIOcAYEphhdKZD1CSFYwqbnaAALmAQACkYDAVVhfNhGDmXaFNgQ',
    '♠9': 'CAACAgUAAxkDAAIEO2fZCtozPWxrftTAJ9x4Y_I4sZYqAAJMAQACVNvBVQ6J5yTZpE90NgQ',
    '♠10': 'CAACAgUAAxkDAAIEPGfZCtpFa0XrQEn70i9Jh4ci2guzAAJ-AQACMRxxVqvHRoEJTsHcNgQ',
    '♠J': 'CAACAgUAAxkDAAIERmfZCvCCv2I-y_P7peIsmOtbeLdDAAKBAQACDXPAVWos8ldKhjasNgQ',
    '♠Q': 'CAACAgUAAxkDAAIER2fZCvHAF8g0TlyFPeipR6kofyC9AAKpAgACiZPAVVigAmH3ZQUuNgQ',
    '♠K': 'CAACAgUAAxkDAAIEEGfZBo-xn9j7o-ekIX1Duma-Ibj5AAKlAQACa2nAVeCjtI0sCyCoNgQ',
    '♠A': 'CAACAgUAAxkDAAIESWfZCvG3xEaFHj_7bb82MxtSdKgnAAJ7AQACgJnAVeD42v7uFlqgNgQ',
    // Крести
    '♣7': 'CAACAgUAAxkDAAIEKGfZCIMB9sGkXrYBjquHLhTxM9YaAALpAAOanMBV-p6MpO8DT3E2BA',
    '♣8': 'CAACAgUAAxkDAAIETGfZCvJjzgHB2akLC0UUyk9ZigIJAAJlAQACayfAVfMNtS82uVIgNgQ',
    '♣9': 'CAACAgUAAxkDAAIETWfZCvLzGrFrozQu2oWWCH4JZRfXAAIfAQACg9PBVfRdtJ1hlPBrNgQ',
    '♣10': 'CAACAgUAAxkDAAIETmfZCvJopSrAat6OSnRF7rrMk9RUAAJYAQACkIzAVWqaKiO5FRmdNgQ',
    '♣J': 'CAACAgUAAxkDAAIEKWfZCIRISyc3nO0XzVuNgyfYXD4FAAJKAQACtVLBVacmKs428ayMNgQ',
    '♣Q': 'CAACAgUAAxkDAAIEUGfZCvKN232BJmtrx-pGZUfvn02ZAAJjAQAC1lTBVUH0muvr30MGNgQ',
    '♣K': 'CAACAgUAAxkDAAIEUWfZCvOZa5hQfYy3MqaYOq8Gow-pAAJqAQACtXXAVSxTAh2tsevONgQ',
    '♣A': 'CAACAgUAAxkDAAIEUmfZCvPg3hEudQjuvFwpCaoEjH-sAAJWAQACTsrAVR2w87xsPLfNNgQ',
    // Черви
    '♥7': 'CAACAgUAAxkDAAIEFGfZBo-Zwnq1M2du_6GKRzdEKaG2AAJkAQAC1X3BVVzY34i5GXHQNgQ',
    '♥8': 'CAACAgUAAxkDAAIEFWfZBo9iiRS8OqteSopTOMzGz7mOAAJYAQACT7rBVQLR8GSac1m8NgQ',
    '♥9': 'CAACAgUAAxkDAAIELGfZCIQ3WcS369M1sdeMbXCwWWh2AAKkAQACgPLBVdxX6QUuXgajNgQ',
    '♥10': 'CAACAgUAAxkDAAIEF2fZBo8WD73xI96vqrInR1f0rKgIAAIRAQACQVvAVW6I30V-k1lZNgQ',
    '♥J': 'CAACAgUAAxkDAAIELmfZCIS9A-LmwSZFoooxBosa-MRtAAJPAQAC5nrBVV4dVDLw60NkNgQ',
    '♥Q': 'CAACAgUAAxkDAAIEYmfZCveUZptceq0Ubi-SByu1MAk1AAJXAQACGB7AVZwo_L8w7QUCNgQ',
    '♥K': 'CAACAgUAAxkDAAIEFmfZBo9aet9zu_gTtSqAEYNlyQABNgACGQEAAhRTwVWjUBF47pA6ETYE',
    '♥A': 'CAACAgUAAxkDAAIEZGfZCveUCGfxMF26aZLPWkZV1JJHAAKKAQAC9IjAVUr-jhrgPNBoNgQ',
    // Буби
    '♦7': 'CAACAgUAAxkDAAIEEWfZBo8oKUKp-5Y2jiZFbw1YDc1QAAKNAQACslbAVbRxwx7tNKAqNgQ',
    '♦8': 'CAACAgUAAxkDAAIEVWfZCvN0gwJAax8mYIgHgvdvGfWRAAJdAQACa0TAVaOlxOpPw2PhNgQ',
    '♦9': 'CAACAgUAAxkDAAIEEmfZBo8xq3zSfrsL1EVobe1oZEEsAAI1AQAC5CTBVVWD4WjnG1dCNgQ',
    '♦10': 'CAACAgUAAxkDAAIEKmfZCISH02EU3UvZfj5OdCWx6a99AAJSAQACGVvAVXyb4ntYTbUqNgQ',
    '♦J': 'CAACAgUAAxkDAAIEWGfZCvQ33_UAAY8sMzaQ8kVyb-aTwwACTQEAAnHCyVW3tBaN5V6XEDYE',
    '♦Q': 'CAACAgUAAxkDAAIEE2fZBo8TAAHkLJ_Z90QCGAdnrsbpVAACuAEAArhlwFVXtlTiCEWnDTYE',
    '♦K': 'CAACAgUAAxkDAAIEWmfZCvWrrApNbx_UHIORg5KJbB3oAAJ-AQACuf7BVYGHtHzfhYbPNgQ',
    '♦A': 'CAACAgUAAxkDAAIEW2fZCvUwObpoPRbYEx9yTL5ebj0kAAJMAQACuWvBVQKMX0_5YOpsNgQ'
};
// Соответствие стикеров картам
var stickerToCard = new Map();
// Дополнительная Map для поиска по file_unique_id (будет заполнена при логировании стикеров)
var uniqueIdToCard = new Map();
// Заполнение соответствия стикеров картам
for (var key in cardStickers) {
    var _a = [key[0], key.substring(1)], suit = _a[0], rank = _a[1];
    stickerToCard.set(cardStickers[key], { suit: suit, rank: rank });
}
// Включаем inline режим
bot.telegram.setMyCommands([
    { command: 'start', description: 'Начать работу с ботом' },
    { command: 'help', description: 'Показать справку' },
    { command: 'join', description: 'Присоединиться к игре' },
    { command: 'startbelka', description: 'Начать игру (Белка - до 12 глаз)' },
    { command: 'startwalka', description: 'Начать игру (Шалқа - до 6 глаз)' },
    { command: 'state', description: 'Показать текущее состояние игры' },
    { command: 'leaderboardall', description: 'Показать глобальную таблицу лидеров' },
    { command: 'leaderboardchat', description: 'Показать таблицу лидеров для текущего чата' },
    { command: 'endgame', description: 'Проголосовать за завершение игры' },
    { command: 'clearbot', description: 'Сбросить игру' },
    { command: 'inline_setup', description: 'Инструкция по настройке инлайн-режима' },
    { command: 'chatid', description: 'Получить информацию о чате' }
]).then(function () {
    // Включаем инлайн-режим
    return bot.telegram.setWebhook(''); // Сбрасываем вебхук для long polling
}).then(function () {
    // Активируем инлайн-режим
    console.log('Инлайн-режим активирован');
}).catch(function (err) {
    console.error('Ошибка при настройке команд бота:', err);
});
// Активируем режим inline для бота
bot.on('inline_query', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, playerInfo, virtualIds, virtualPlayerCards, virtualPlayerId, _i, virtualIds_1, vId, vPlayerInfo, results_1, results, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                userId = ctx.from.id;
                console.log("[LOG] \u041F\u043E\u043B\u0443\u0447\u0435\u043D inline \u0437\u0430\u043F\u0440\u043E\u0441 \u043E\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F: ".concat(userId));
                playerInfo = playerCardsInPrivateChat.get(userId);
                if (!(!playerInfo || !playerInfo.cards || playerInfo.cards.length === 0)) return [3 /*break*/, 4];
                console.log("[LOG] \u041A\u0430\u0440\u0442\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u0434\u043B\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ".concat(userId));
                virtualIds = [userId + 1000, userId + 2000, userId + 3000];
                virtualPlayerCards = [];
                virtualPlayerId = null;
                for (_i = 0, virtualIds_1 = virtualIds; _i < virtualIds_1.length; _i++) {
                    vId = virtualIds_1[_i];
                    vPlayerInfo = playerCardsInPrivateChat.get(vId);
                    if (vPlayerInfo && vPlayerInfo.cards && vPlayerInfo.cards.length > 0) {
                        virtualPlayerCards = vPlayerInfo.cards;
                        virtualPlayerId = vId;
                        break;
                    }
                }
                if (!(virtualPlayerCards.length > 0 && virtualPlayerId)) return [3 /*break*/, 2];
                console.log("[LOG] \u041D\u0430\u0439\u0434\u0435\u043D\u044B \u043A\u0430\u0440\u0442\u044B \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0438\u0433\u0440\u043E\u043A\u0430 ".concat(virtualPlayerId));
                results_1 = virtualPlayerCards.map(function (card, index) {
                    var stickerKey = "".concat(card.suit).concat(card.rank);
                    var stickerId = cardStickers[stickerKey];
                    if (!stickerId) {
                        console.log("[LOG] \u0421\u0442\u0438\u043A\u0435\u0440 \u0434\u043B\u044F \u043A\u0430\u0440\u0442\u044B ".concat(stickerKey, " \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D"));
                        return null;
                    }
                    return {
                        type: 'sticker',
                        id: "card_".concat(index),
                        sticker_file_id: stickerId,
                        input_message_content: {
                            message_text: "".concat(card.suit).concat(card.rank)
                        }
                    };
                }).filter(function (item) { return item !== null; });
                console.log("[LOG] \u041E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u043C ".concat(results_1.length, " \u0441\u0442\u0438\u043A\u0435\u0440\u043E\u0432 \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0438\u0433\u0440\u043E\u043A\u0430 \u0432 \u043E\u0442\u0432\u0435\u0442 \u043D\u0430 inline \u0437\u0430\u043F\u0440\u043E\u0441"));
                return [4 /*yield*/, ctx.answerInlineQuery(results_1, {
                        cache_time: 1, // Минимальное время кеширования для обновления в реальном времени
                        is_personal: true // Результаты персонализированы для этого пользователя
                    })];
            case 1:
                _a.sent();
                return [2 /*return*/];
            case 2: 
            // Если карты не найдены, отправляем пустой результат
            return [4 /*yield*/, ctx.answerInlineQuery([], {
                    cache_time: 0
                })];
            case 3:
                // Если карты не найдены, отправляем пустой результат
                _a.sent();
                return [2 /*return*/];
            case 4:
                console.log("[LOG] \u041D\u0430\u0439\u0434\u0435\u043D\u043E ".concat(playerInfo.cards.length, " \u043A\u0430\u0440\u0442 \u0434\u043B\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ").concat(userId));
                results = playerInfo.cards.map(function (card, index) {
                    var stickerKey = "".concat(card.suit).concat(card.rank);
                    var stickerId = cardStickers[stickerKey];
                    if (!stickerId) {
                        console.log("[LOG] \u0421\u0442\u0438\u043A\u0435\u0440 \u0434\u043B\u044F \u043A\u0430\u0440\u0442\u044B ".concat(stickerKey, " \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D"));
                        return null;
                    }
                    return {
                        type: 'sticker',
                        id: "card_".concat(index),
                        sticker_file_id: stickerId,
                        input_message_content: {
                            message_text: "".concat(card.suit).concat(card.rank)
                        }
                    };
                }).filter(function (item) { return item !== null; });
                console.log("[LOG] \u041E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u043C ".concat(results.length, " \u0441\u0442\u0438\u043A\u0435\u0440\u043E\u0432 \u0432 \u043E\u0442\u0432\u0435\u0442 \u043D\u0430 inline \u0437\u0430\u043F\u0440\u043E\u0441"));
                return [4 /*yield*/, ctx.answerInlineQuery(results, {
                        cache_time: 1, // Минимальное время кеширования для обновления в реальном времени
                        is_personal: true // Результаты персонализированы для этого пользователя
                    })];
            case 5:
                _a.sent();
                return [3 /*break*/, 7];
            case 6:
                error_1 = _a.sent();
                console.error('Ошибка при обработке inline запроса:', error_1);
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// Обработчик команды /start
bot.start(function (ctx) {
    ctx.reply('Добро пожаловать в игру Белка! Используйте /help для получения списка команд.');
});
// Обработчик команды /help
bot.help(function (ctx) {
    var helpText = "\n\u0411\u0435\u043B\u043A\u0430 - \u043A\u0430\u0440\u0442\u043E\u0447\u043D\u0430\u044F \u0438\u0433\u0440\u0430 \u0434\u043B\u044F 4 \u0438\u0433\u0440\u043E\u043A\u043E\u0432.\n\n\u041A\u043E\u043C\u0430\u043D\u0434\u044B:\n/join - \u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F \u043A \u0438\u0433\u0440\u0435\n/startbelka - \u041D\u0430\u0447\u0430\u0442\u044C \u0438\u0433\u0440\u0443 \u0432 \u0440\u0435\u0436\u0438\u043C\u0435 \"\u0411\u0435\u043B\u043A\u0430\" (\u0434\u043E 12 \u0433\u043B\u0430\u0437)\n/startwalka - \u041D\u0430\u0447\u0430\u0442\u044C \u0438\u0433\u0440\u0443 \u0432 \u0440\u0435\u0436\u0438\u043C\u0435 \"\u0428\u0430\u043B\u049B\u0430\" (\u0434\u043E 6 \u0433\u043B\u0430\u0437) - \u0431\u044B\u0441\u0442\u0440\u0430\u044F \u0438\u0433\u0440\u0430\n/state - \u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0442\u0435\u043A\u0443\u0449\u0435\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0438\u0433\u0440\u044B\n/leaderboardall - \u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0433\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u0443\u044E \u0442\u0430\u0431\u043B\u0438\u0446\u0443 \u043B\u0438\u0434\u0435\u0440\u043E\u0432\n/leaderboardchat - \u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0442\u0430\u0431\u043B\u0438\u0446\u0443 \u043B\u0438\u0434\u0435\u0440\u043E\u0432 \u0434\u043B\u044F \u0442\u0435\u043A\u0443\u0449\u0435\u0433\u043E \u0447\u0430\u0442\u0430\n/endgame - \u041F\u0440\u043E\u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u0442\u044C \u0437\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0435 \u0438\u0433\u0440\u044B\n/clearbot - \u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0442\u0435\u043A\u0443\u0449\u0443\u044E \u0438\u0433\u0440\u0443 (\u0432 \u0441\u043B\u0443\u0447\u0430\u0435 \u043F\u0440\u043E\u0431\u043B\u0435\u043C)\n/inline_setup - \u0418\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F \u043F\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0435 \u0438\u043D\u043B\u0430\u0439\u043D-\u0440\u0435\u0436\u0438\u043C\u0430\n/chatid - \u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044E \u043E \u0447\u0430\u0442\u0435\n\n\u041A\u0430\u043A \u0438\u0433\u0440\u0430\u0442\u044C:\n- \u041F\u043E\u0441\u043B\u0435 \u043D\u0430\u0447\u0430\u043B\u0430 \u0438\u0433\u0440\u044B \u0432\u0430\u0448\u0438 \u043A\u0430\u0440\u0442\u044B \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0432 \u0438\u043D\u043B\u0430\u0439\u043D-\u043F\u0430\u043D\u0435\u043B\u0438\n- \u0427\u0442\u043E\u0431\u044B \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0445\u043E\u0434, \u0435\u0441\u0442\u044C \u0442\u0440\u0438 \u0441\u043F\u043E\u0441\u043E\u0431\u0430:\n  1. \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0441\u0442\u0438\u043A\u0435\u0440 \u043A\u0430\u0440\u0442\u044B \u0432 \u0447\u0430\u0442\n  2. \u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0432\u0432\u043E\u0434\u0438\u0442\u044C @\u0438\u043C\u044F_\u0431\u043E\u0442\u0430 \u0432 \u043F\u043E\u043B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F, \u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u0430\u0440\u0442\u0443 \u0438\u0437 \u043F\u043E\u044F\u0432\u0438\u0432\u0448\u0435\u0439\u0441\u044F \u043F\u0430\u043D\u0435\u043B\u0438\n  3. \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0442\u0435\u043A\u0441\u0442\u043E\u043C \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u0430\u0440\u0442\u044B (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \"\u26607\" \u0438\u043B\u0438 \"\u2665K\")\n\n\u0420\u0435\u0436\u0438\u043C\u044B \u0438\u0433\u0440\u044B:\n- \"\u0411\u0435\u043B\u043A\u0430\" (/startbelka) - \u043A\u043B\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0440\u0435\u0436\u0438\u043C \u0438\u0433\u0440\u044B \u0434\u043E 12 \u0433\u043B\u0430\u0437\n- \"\u0428\u0430\u043B\u049B\u0430\" (/startwalka) - \u0443\u043A\u043E\u0440\u043E\u0447\u0435\u043D\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u0438\u0433\u0440\u044B \u0434\u043E 6 \u0433\u043B\u0430\u0437\n\n\u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0438\u0433\u0440\u044B:\n- \u0426\u0435\u043B\u044C: \u043D\u0430\u0431\u0440\u0430\u0442\u044C 12 \u0433\u043B\u0430\u0437 (\u0440\u0435\u0436\u0438\u043C \"\u0411\u0435\u043B\u043A\u0430\") \u0438\u043B\u0438 6 \u0433\u043B\u0430\u0437 (\u0440\u0435\u0436\u0438\u043C \"\u0428\u0430\u043B\u049B\u0430\"), \u0438\u043B\u0438 \u0432\u044B\u0438\u0433\u0440\u0430\u0442\u044C \"\u0433\u043E\u043B\u0443\u044E\"\n- \u0421\u0442\u0430\u0440\u0448\u0438\u043D\u0441\u0442\u0432\u043E \u043A\u0430\u0440\u0442: 7, 8, 9, \u0414\u0430\u043C\u0430, \u041A\u043E\u0440\u043E\u043B\u044C, 10, \u0422\u0443\u0437, \u0412\u0430\u043B\u0435\u0442\n- \u0412\u0430\u043B\u0435\u0442\u044B \u0432\u0441\u0435\u0433\u0434\u0430 \u043A\u043E\u0437\u044B\u0440\u0438: \u043A\u0440\u0435\u0441\u0442\u0438 > \u043F\u0438\u043A\u0438 > \u0447\u0435\u0440\u0432\u0438 > \u0431\u0443\u0431\u0438\n- \u041E\u0447\u043A\u0438: \u0422\u0443\u0437 - 11, 10 - 10, \u041A\u043E\u0440\u043E\u043B\u044C - 4, \u0414\u0430\u043C\u0430 - 3, \u0412\u0430\u043B\u0435\u0442 - 2\n- \u0415\u0441\u043B\u0438 \u0445\u043E\u0434 \u043D\u0430\u0447\u0438\u043D\u0430\u0435\u0442\u0441\u044F \u0441 \u043A\u043E\u0437\u044B\u0440\u044F \u0438\u043B\u0438 \u0432\u0430\u043B\u0435\u0442\u0430, \u043D\u0443\u0436\u043D\u043E \u0445\u043E\u0434\u0438\u0442\u044C \u043A\u043E\u0437\u044B\u0440\u0435\u043C (\u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0432\u0430\u043B\u0435\u0442\u043E\u0432)\n- \u0415\u0441\u043B\u0438 \u0445\u043E\u0434 \u043D\u0430\u0447\u0438\u043D\u0430\u0435\u0442\u0441\u044F \u0441 \u043E\u0431\u044B\u0447\u043D\u043E\u0439 \u043C\u0430\u0441\u0442\u0438, \u043D\u0443\u0436\u043D\u043E \u0445\u043E\u0434\u0438\u0442\u044C \u0432 \u044D\u0442\u0443 \u043C\u0430\u0441\u0442\u044C (\u0432\u0430\u043B\u0435\u0442\u044B \u043D\u0435\u043B\u044C\u0437\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C)\n- \u0415\u0441\u043B\u0438 \u043D\u0443\u0436\u043D\u043E\u0439 \u043C\u0430\u0441\u0442\u0438 \u043D\u0435\u0442, \u043C\u043E\u0436\u043D\u043E \u0445\u043E\u0434\u0438\u0442\u044C \u043B\u044E\u0431\u043E\u0439 \u043A\u0430\u0440\u0442\u043E\u0439 (\u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0432\u0430\u043B\u0435\u0442\u043E\u0432)\n- \u041F\u043E\u0441\u043B\u0435 1-\u0433\u043E \u0440\u0430\u0443\u043D\u0434\u0430 \u0432\u044B\u0438\u0433\u0440\u0430\u0432\u0448\u0435\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u0435 \u0432\u0441\u0435\u0433\u0434\u0430 2 \u0433\u043B\u0430\u0437\u0430\n- \u0412 \u043F\u043E\u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0445 \u0440\u0430\u0443\u043D\u0434\u0430\u0445: 61-90 \u043E\u0447\u043A\u043E\u0432 = 1 \u0433\u043B\u0430\u0437, 91-119 \u043E\u0447\u043A\u043E\u0432 = 2 \u0433\u043B\u0430\u0437\u0430\n- \u0415\u0441\u043B\u0438 \u0432\u0430\u043B\u0435\u0442 \u043A\u0440\u0435\u0441\u0442\u0438 \u0443 \u0441\u043E\u043F\u0435\u0440\u043D\u0438\u043A\u043E\u0432, \u043F\u043E\u0431\u0435\u0434\u0438\u0442\u0435\u043B\u044F\u043C \u0440\u0430\u0443\u043D\u0434\u0430 +1 \u0433\u043B\u0430\u0437\n- 120 \u043E\u0447\u043A\u043E\u0432 + \u0432\u0441\u0435 \u0432\u0437\u044F\u0442\u043A\u0438 = \"\u0433\u043E\u043B\u0430\u044F\" (\u043C\u0433\u043D\u043E\u0432\u0435\u043D\u043D\u0430\u044F \u043F\u043E\u0431\u0435\u0434\u0430)\n- \u0415\u0441\u043B\u0438 \u043E\u0431\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043D\u0430\u0431\u0440\u0430\u043B\u0438 \u043F\u043E 60 \u043E\u0447\u043A\u043E\u0432 = \"\u044F\u0439\u0446\u0430\" (\u0440\u0430\u0443\u043D\u0434 \u043F\u0435\u0440\u0435\u0438\u0433\u0440\u044B\u0432\u0430\u0435\u0442\u0441\u044F, \u043F\u043E\u0431\u0435\u0434\u0438\u0442\u0435\u043B\u044C \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 4 \u043E\u0447\u043A\u0430)\n- \u041F\u0435\u0440\u0435\u0441\u0434\u0430\u0447\u0430: \u0435\u0441\u043B\u0438 \u0443 \u0438\u0433\u0440\u043E\u043A\u0430 \u226413 \u043E\u0447\u043A\u043E\u0432 \u0438\u043B\u0438 \u22655 \u043A\u0430\u0440\u0442 \u043E\u0434\u043D\u043E\u0439 \u043C\u0430\u0441\u0442\u0438\n";
    ctx.reply(helpText);
});
// Обработчик команды /join
bot.command('join', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var chatId, userId_1, username, game, success, gameState_1, success, gameState, playersList_1, error_2;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 23, , 25]);
                chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
                if (!chatId)
                    return [2 /*return*/];
                userId_1 = (_b = ctx.from) === null || _b === void 0 ? void 0 : _b.id;
                username = ((_c = ctx.from) === null || _c === void 0 ? void 0 : _c.username) || "Player".concat(userId_1);
                if (!!userId_1) return [3 /*break*/, 2];
                return [4 /*yield*/, ctx.reply('Не удалось определить пользователя')];
            case 1:
                _d.sent();
                return [2 /*return*/];
            case 2:
                game = games.get(chatId);
                if (!!game) return [3 /*break*/, 7];
                game = new BelkaGame_1.BelkaGame(chatId);
                games.set(chatId, game);
                success = game.addPlayer({ id: userId_1, username: username, chatId: chatId });
                if (!success) return [3 /*break*/, 4];
                return [4 /*yield*/, ctx.reply('Создана новая игра. Вы присоединились к игре.')];
            case 3:
                _d.sent();
                return [3 /*break*/, 6];
            case 4: return [4 /*yield*/, ctx.reply('Ошибка при присоединении к игре.')];
            case 5:
                _d.sent();
                _d.label = 6;
            case 6: return [3 /*break*/, 17];
            case 7:
                gameState_1 = game.getGameState();
                if (!gameState_1.isActive) return [3 /*break*/, 9];
                return [4 /*yield*/, ctx.reply('Игра уже запущена! Дождитесь окончания текущей игры.')];
            case 8:
                _d.sent();
                return [2 /*return*/];
            case 9:
                if (!gameState_1.players.some(function (p) { return p.id === userId_1; })) return [3 /*break*/, 11];
                return [4 /*yield*/, ctx.reply('Вы уже присоединились к игре!')];
            case 10:
                _d.sent();
                return [2 /*return*/];
            case 11:
                if (!(gameState_1.players.length >= 4)) return [3 /*break*/, 13];
                return [4 /*yield*/, ctx.reply('Игра уже заполнена! Максимум 4 игрока.')];
            case 12:
                _d.sent();
                return [2 /*return*/];
            case 13:
                success = game.addPlayer({ id: userId_1, username: username, chatId: chatId });
                if (!success) return [3 /*break*/, 15];
                return [4 /*yield*/, ctx.reply("".concat(username, " \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u043B\u0441\u044F \u043A \u0438\u0433\u0440\u0435!"))];
            case 14:
                _d.sent();
                return [3 /*break*/, 17];
            case 15: return [4 /*yield*/, ctx.reply('Не удалось присоединиться к игре.')];
            case 16:
                _d.sent();
                _d.label = 17;
            case 17:
                gameState = game.getGameState();
                playersList_1 = 'Текущие игроки:\n';
                gameState.players.forEach(function (player, index) {
                    playersList_1 += "".concat(index + 1, ". ").concat(player.username, "\n");
                });
                return [4 /*yield*/, ctx.reply(playersList_1)];
            case 18:
                _d.sent();
                if (!(gameState.players.length === 4)) return [3 /*break*/, 20];
                return [4 /*yield*/, ctx.reply('Все игроки присоединились! Выберите режим игры:\n/startbelka - Классический режим (до 12 глаз)\n/startwalka - Быстрая игра (до 6 глаз)')];
            case 19:
                _d.sent();
                return [3 /*break*/, 22];
            case 20: return [4 /*yield*/, ctx.reply("\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u0438\u0433\u0440\u043E\u043A\u043E\u0432... ".concat(gameState.players.length, "/4"))];
            case 21:
                _d.sent();
                _d.label = 22;
            case 22: return [3 /*break*/, 25];
            case 23:
                error_2 = _d.sent();
                console.error('Ошибка в команде /join:', error_2);
                return [4 /*yield*/, ctx.reply('Произошла ошибка при присоединении к игре')];
            case 24:
                _d.sent();
                return [3 /*break*/, 25];
            case 25: return [2 /*return*/];
        }
    });
}); });
// Обработчик команды /startbelka
bot.command('startbelka', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var chatId_1, game, gameState, gameSummary, updatedState, botInfo, error_3;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 13, , 15]);
                chatId_1 = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
                if (!chatId_1)
                    return [2 /*return*/];
                game = games.get(chatId_1);
                if (!!game) return [3 /*break*/, 2];
                return [4 /*yield*/, ctx.reply('Игра не найдена. Создайте новую игру с помощью /join')];
            case 1:
                _b.sent();
                return [2 /*return*/];
            case 2:
                gameState = game.getGameState();
                if (!gameState.isActive) return [3 /*break*/, 4];
                return [4 /*yield*/, ctx.reply('Игра уже запущена!')];
            case 3:
                _b.sent();
                return [2 /*return*/];
            case 4:
                if (!(gameState.players.length < 4)) return [3 /*break*/, 6];
                return [4 /*yield*/, ctx.reply("\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0438\u0433\u0440\u043E\u043A\u043E\u0432! \u0422\u0435\u043A\u0443\u0449\u0435\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E: ".concat(gameState.players.length, "/4"))];
            case 5:
                _b.sent();
                return [2 /*return*/];
            case 6:
                gameSummary = game.startGame('belka');
                updatedState = game.getGameState();
                // Помещаем карты всех игроков в хранилище для инлайн-режима
                updatedState.players.forEach(function (player) {
                    console.log("[LOG] \u0414\u043E\u0431\u0430\u0432\u043B\u044F\u0435\u043C \u043A\u0430\u0440\u0442\u044B \u0438\u0433\u0440\u043E\u043A\u0430 ".concat(player.username, " \u0432 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0434\u043B\u044F \u0438\u043D\u043B\u0430\u0439\u043D-\u0440\u0435\u0436\u0438\u043C\u0430"));
                    playerCardsInPrivateChat.set(player.id, {
                        cards: __spreadArray([], player.cards, true),
                        gameId: chatId_1
                    });
                });
                // Отправляем информацию о начальном состоянии игры в чат
                return [4 /*yield*/, ctx.reply(gameSummary, {
                        reply_markup: {
                            inline_keyboard: [[
                                    { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
                                ]]
                        }
                    })];
            case 7:
                // Отправляем информацию о начальном состоянии игры в чат
                _b.sent();
                return [4 /*yield*/, ctx.telegram.getMe()];
            case 8:
                botInfo = _b.sent();
                if (!(botInfo && botInfo.username)) return [3 /*break*/, 10];
                return [4 /*yield*/, ctx.reply("\u0418\u0433\u0440\u0430 \u043D\u0430\u0447\u0430\u043B\u0430\u0441\u044C! \u0412\u044B \u043C\u043E\u0436\u0435\u0442\u0435:\n1) \u041D\u0430\u0447\u0438\u043D\u0430\u0439\u0442\u0435 \u0432\u0432\u043E\u0434\u0438\u0442\u044C @".concat(botInfo.username, " \u0432 \u0441\u0442\u0440\u043E\u043A\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F, \u0447\u0442\u043E\u0431\u044B \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u0443\n2) \u0414\u043B\u044F \u0445\u043E\u0434\u0430 \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0445 \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435: /play2, /play3, /play4"))];
            case 9:
                _b.sent();
                return [3 /*break*/, 12];
            case 10: return [4 /*yield*/, ctx.reply('Игра началась! Отправьте название карты в чат для хода (например: "♠7" или "♥K").')];
            case 11:
                _b.sent();
                _b.label = 12;
            case 12: return [3 /*break*/, 15];
            case 13:
                error_3 = _b.sent();
                console.error('Ошибка в команде /startbelka:', error_3);
                return [4 /*yield*/, ctx.reply('Произошла ошибка при запуске игры')];
            case 14:
                _b.sent();
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/];
        }
    });
}); });
// Обработчик команды /startwalka
bot.command('startwalka', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var chatId_2, game, gameState, gameSummary, updatedState, botInfo, error_4;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 13, , 15]);
                chatId_2 = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
                if (!chatId_2)
                    return [2 /*return*/];
                game = games.get(chatId_2);
                if (!!game) return [3 /*break*/, 2];
                return [4 /*yield*/, ctx.reply('Игра не найдена. Создайте новую игру с помощью /join')];
            case 1:
                _b.sent();
                return [2 /*return*/];
            case 2:
                gameState = game.getGameState();
                if (!gameState.isActive) return [3 /*break*/, 4];
                return [4 /*yield*/, ctx.reply('Игра уже запущена!')];
            case 3:
                _b.sent();
                return [2 /*return*/];
            case 4:
                if (!(gameState.players.length < 4)) return [3 /*break*/, 6];
                return [4 /*yield*/, ctx.reply("\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0438\u0433\u0440\u043E\u043A\u043E\u0432! \u0422\u0435\u043A\u0443\u0449\u0435\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E: ".concat(gameState.players.length, "/4"))];
            case 5:
                _b.sent();
                return [2 /*return*/];
            case 6:
                gameSummary = game.startGame('walka');
                updatedState = game.getGameState();
                // Помещаем карты всех игроков в хранилище для инлайн-режима
                updatedState.players.forEach(function (player) {
                    console.log("[LOG] \u0414\u043E\u0431\u0430\u0432\u043B\u044F\u0435\u043C \u043A\u0430\u0440\u0442\u044B \u0438\u0433\u0440\u043E\u043A\u0430 ".concat(player.username, " \u0432 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0434\u043B\u044F \u0438\u043D\u043B\u0430\u0439\u043D-\u0440\u0435\u0436\u0438\u043C\u0430 (\u0440\u0435\u0436\u0438\u043C: \u0428\u0430\u043B\u049B\u0430)"));
                    playerCardsInPrivateChat.set(player.id, {
                        cards: __spreadArray([], player.cards, true),
                        gameId: chatId_2
                    });
                });
                // Отправляем информацию о начальном состоянии игры в чат
                return [4 /*yield*/, ctx.reply(gameSummary, {
                        reply_markup: {
                            inline_keyboard: [[
                                    { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
                                ]]
                        }
                    })];
            case 7:
                // Отправляем информацию о начальном состоянии игры в чат
                _b.sent();
                return [4 /*yield*/, ctx.telegram.getMe()];
            case 8:
                botInfo = _b.sent();
                if (!(botInfo && botInfo.username)) return [3 /*break*/, 10];
                return [4 /*yield*/, ctx.reply("\u0418\u0433\u0440\u0430 \"\u0428\u0430\u043B\u049B\u0430\" \u043D\u0430\u0447\u0430\u043B\u0430\u0441\u044C! \u0412\u044B \u0431\u0443\u0434\u0435\u0442\u0435 \u0438\u0433\u0440\u0430\u0442\u044C \u0434\u043E 6 \u0433\u043B\u0430\u0437. \u0412\u044B \u043C\u043E\u0436\u0435\u0442\u0435:\n1) \u041D\u0430\u0447\u0438\u043D\u0430\u0439\u0442\u0435 \u0432\u0432\u043E\u0434\u0438\u0442\u044C @".concat(botInfo.username, " \u0432 \u0441\u0442\u0440\u043E\u043A\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F, \u0447\u0442\u043E\u0431\u044B \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u0443\n2) \u0414\u043B\u044F \u0445\u043E\u0434\u0430 \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0445 \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435: /play2, /play3, /play4"))];
            case 9:
                _b.sent();
                return [3 /*break*/, 12];
            case 10: return [4 /*yield*/, ctx.reply('Игра "Шалқа" началась! Играем до 6 глаз. Отправьте название карты в чат для хода (например: "♠7" или "♥K").')];
            case 11:
                _b.sent();
                _b.label = 12;
            case 12: return [3 /*break*/, 15];
            case 13:
                error_4 = _b.sent();
                console.error('Ошибка в команде /startwalka:', error_4);
                return [4 /*yield*/, ctx.reply('Произошла ошибка при запуске игры')];
            case 14:
                _b.sent();
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/];
        }
    });
}); });
// Обработчик команды /state
bot.command('state', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var chatId, game, gameSummary, error_5;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 6]);
                chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
                if (!chatId)
                    return [2 /*return*/];
                game = games.get(chatId);
                if (!!game) return [3 /*break*/, 2];
                return [4 /*yield*/, ctx.reply('Игра не найдена. Начните новую игру с помощью /startbelka')];
            case 1:
                _b.sent();
                return [2 /*return*/];
            case 2:
                gameSummary = game.getGameSummary();
                return [4 /*yield*/, ctx.reply(gameSummary, {
                        reply_markup: {
                            inline_keyboard: [[
                                    { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
                                ]]
                        }
                    })];
            case 3:
                _b.sent();
                return [3 /*break*/, 6];
            case 4:
                error_5 = _b.sent();
                console.error('Ошибка в команде /state:', error_5);
                return [4 /*yield*/, ctx.reply('Произошла ошибка при получении состояния игры')];
            case 5:
                _b.sent();
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
var statsService = new StatsService_1.StatsService();
bot.command('leaderboardall', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var leaderboardEntries, message_1, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 7]);
                return [4 /*yield*/, statsService.getLeaderboardAll()];
            case 1:
                leaderboardEntries = _a.sent();
                if (!(leaderboardEntries.length === 0)) return [3 /*break*/, 3];
                return [4 /*yield*/, ctx.reply('Лидерборд пока пуст.')];
            case 2:
                _a.sent();
                return [2 /*return*/];
            case 3:
                message_1 = '🏆 Таблица лидеров (все чаты) 🏆\n\n';
                leaderboardEntries.forEach(function (_a, index) {
                    var playerId = _a[0], stats = _a[1];
                    message_1 += "".concat(index + 1, ". ").concat(stats.username, "\n") +
                        "   \u0418\u0433\u0440\u044B: ".concat(stats.gamesPlayed, ", \u041F\u043E\u0431\u0435\u0434\u044B: ").concat(stats.gamesWon, "\n") +
                        "   \u041E\u0447\u043A\u0438: ".concat(stats.totalScore, ", \u0412\u0437\u044F\u0442\u043E\u043A: ").concat(stats.totalTricks, "\n") +
                        "   \u0413\u043E\u043B\u044B\u0435 \u043F\u043E\u0431\u0435\u0434\u044B: ".concat(stats.golayaCount, ", \u042F\u0439\u0446\u0430: ").concat(stats.eggsCount, "\n\n");
                });
                return [4 /*yield*/, ctx.reply(message_1)];
            case 4:
                _a.sent();
                return [3 /*break*/, 7];
            case 5:
                error_6 = _a.sent();
                console.error('Ошибка при получении глобального лидерборда:', error_6);
                return [4 /*yield*/, ctx.reply('Произошла ошибка при получении глобального лидерборда.')];
            case 6:
                _a.sent();
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// Команда для отображения статистики чата
bot.command('leaderboardchat', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var chatId, leaderboard, message_2, error_7;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 7, , 9]);
                chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
                if (!!chatId) return [3 /*break*/, 2];
                return [4 /*yield*/, ctx.reply('Не удалось определить ID чата')];
            case 1:
                _b.sent();
                return [2 /*return*/];
            case 2: return [4 /*yield*/, statsService.getChatLeaderboard(chatId)];
            case 3:
                leaderboard = _b.sent();
                if (!(!leaderboard || leaderboard.length === 0)) return [3 /*break*/, 5];
                return [4 /*yield*/, ctx.reply('В этом чате еще нет статистики игр')];
            case 4:
                _b.sent();
                return [2 /*return*/];
            case 5:
                message_2 = '🏆 <b>Топ игроков в этом чате:</b>\n\n';
                leaderboard.forEach(function (player, index) {
                    message_2 += "".concat(index + 1, ". ").concat(player.username || 'Пользователь', " - ").concat(player.games_won, "/").concat(player.games_played, " \u043F\u043E\u0431\u0435\u0434, ").concat(player.total_score, " \u043E\u0447\u043A\u043E\u0432\n");
                });
                return [4 /*yield*/, ctx.replyWithHTML(message_2)];
            case 6:
                _b.sent();
                return [3 /*break*/, 9];
            case 7:
                error_7 = _b.sent();
                console.error('Ошибка при получении лидерборда чата:', error_7);
                return [4 /*yield*/, ctx.reply('Произошла ошибка при получении статистики чата')];
            case 8:
                _b.sent();
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
// Обработчик команды /endgame
bot.command('endgame', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var chatId, userId, game, result, _a, votesCount, requiredVotes, gameState, error_8;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 14, , 16]);
                chatId = (_b = ctx.chat) === null || _b === void 0 ? void 0 : _b.id;
                userId = (_c = ctx.from) === null || _c === void 0 ? void 0 : _c.id;
                if (!chatId || !userId)
                    return [2 /*return*/];
                game = games.get(chatId);
                if (!!game) return [3 /*break*/, 2];
                return [4 /*yield*/, ctx.reply('Игра не найдена')];
            case 1:
                _d.sent();
                return [2 /*return*/];
            case 2:
                result = game.voteForEnd(userId);
                _a = result.status;
                switch (_a) {
                    case 'not_player': return [3 /*break*/, 3];
                    case 'already_voted': return [3 /*break*/, 5];
                    case 'voted': return [3 /*break*/, 7];
                }
                return [3 /*break*/, 11];
            case 3: return [4 /*yield*/, ctx.reply('Вы не являетесь участником игры или игра не активна')];
            case 4:
                _d.sent();
                return [3 /*break*/, 13];
            case 5: return [4 /*yield*/, ctx.reply('Вы уже проголосовали за завершение игры')];
            case 6:
                _d.sent();
                return [3 /*break*/, 13];
            case 7:
                votesCount = result.votesCount || 0;
                requiredVotes = result.requiredVotes || 0;
                return [4 /*yield*/, ctx.reply("\u0418\u0433\u0440\u043E\u043A @".concat(ctx.from.username, " \u043F\u0440\u043E\u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043B \u0437\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0435 \u0438\u0433\u0440\u044B. \u0413\u043E\u043B\u043E\u0441\u043E\u0432: ").concat(votesCount, "/").concat(requiredVotes))];
            case 8:
                _d.sent();
                if (!(votesCount >= requiredVotes)) return [3 /*break*/, 10];
                gameState = game.getGameState();
                gameState.players.forEach(function (player) {
                    playerCardsInPrivateChat.delete(player.id);
                });
                console.log("[LOG] \u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043A\u0430\u0440\u0442 \u043E\u0447\u0438\u0449\u0435\u043D\u043E \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u043F\u043E\u0441\u043B\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F \u0438\u0433\u0440\u044B \u0432 \u0447\u0430\u0442\u0435 ".concat(chatId));
                // Удаляем игру из хранилища
                games.delete(chatId);
                return [4 /*yield*/, ctx.reply('Игра завершена по голосованию игроков. Используйте /join, чтобы начать новую игру.')];
            case 9:
                _d.sent();
                _d.label = 10;
            case 10: return [3 /*break*/, 13];
            case 11: return [4 /*yield*/, ctx.reply('Не удалось проголосовать за завершение игры')];
            case 12:
                _d.sent();
                _d.label = 13;
            case 13: return [3 /*break*/, 16];
            case 14:
                error_8 = _d.sent();
                console.error('Ошибка в команде /endgame:', error_8);
                return [4 /*yield*/, ctx.reply('Произошла ошибка при обработке команды')];
            case 15:
                _d.sent();
                return [3 /*break*/, 16];
            case 16: return [2 /*return*/];
        }
    });
}); });
// Обработчик команды /clearbot
bot.command('clearbot', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var chatId, userId, gameExists, game, gameState, error_9;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 7, , 9]);
                chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
                if (!chatId)
                    return [2 /*return*/];
                userId = (_b = ctx.from) === null || _b === void 0 ? void 0 : _b.id;
                if (!!userId) return [3 /*break*/, 2];
                return [4 /*yield*/, ctx.reply('Не удалось определить пользователя')];
            case 1:
                _c.sent();
                return [2 /*return*/];
            case 2:
                gameExists = games.has(chatId);
                if (!gameExists) return [3 /*break*/, 4];
                game = games.get(chatId);
                if (game) {
                    gameState = game.getGameState();
                    // Очищаем карты всех игроков из хранилища
                    gameState.players.forEach(function (player) {
                        playerCardsInPrivateChat.delete(player.id);
                    });
                    console.log("[LOG] \u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u043A\u0430\u0440\u0442 \u043E\u0447\u0438\u0449\u0435\u043D\u043E \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u0438\u0437 \u0447\u0430\u0442\u0430 ".concat(chatId));
                }
                // Удаляем игру из хранилища
                games.delete(chatId);
                return [4 /*yield*/, ctx.reply('🧹 Игра успешно сброшена. Используйте /join, чтобы начать новую игру.')];
            case 3:
                _c.sent();
                return [3 /*break*/, 6];
            case 4: return [4 /*yield*/, ctx.reply('Активной игры не найдено. Используйте /join, чтобы начать новую игру.')];
            case 5:
                _c.sent();
                _c.label = 6;
            case 6: return [3 /*break*/, 9];
            case 7:
                error_9 = _c.sent();
                console.error('Ошибка в команде /clearbot:', error_9);
                return [4 /*yield*/, ctx.reply('Произошла ошибка при сбросе игры')];
            case 8:
                _c.sent();
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
// Функция для форматирования карт игрока
function formatPlayerCards(player, state) {
    var _a;
    // Группировка и сортировка карт по масти
    var cardsBySuit = player.cards.reduce(function (acc, card) {
        if (!acc[card.suit]) {
            acc[card.suit] = [];
        }
        acc[card.suit].push(card);
        return acc;
    }, {});
    // Сортировка карт в каждой масти по значению
    Object.values(cardsBySuit).forEach(function (cards) {
        cards === null || cards === void 0 ? void 0 : cards.sort(function (a, b) { return a.value - b.value; });
    });
    // Формируем сообщение с картами
    var message = "\u041A\u0430\u0440\u0442\u044B \u0438\u0433\u0440\u043E\u043A\u0430 ".concat(player.username, " (\u0432\u0441\u0435\u0433\u043E ").concat(player.cards.length, "):\n");
    // Отображение карт по мастям
    var suits = ['♠', '♣', '♦', '♥'];
    suits.forEach(function (suit) {
        if (cardsBySuit[suit] && cardsBySuit[suit].length > 0) {
            var cardsInSuit = cardsBySuit[suit].map(function (card) {
                var index = player.cards.findIndex(function (c) { return c === card; }) + 1;
                return "".concat(index, ") ").concat(card.rank);
            }).join(', ');
            message += "\n".concat(suit, ": ").concat(cardsInSuit);
        }
    });
    message += "\n\n".concat(state.trump === null ? 'Козырей нет' : "\u041A\u043E\u0437\u044B\u0440\u044C: ".concat(state.trump));
    // Показываем значок козыря для держателя валета крести
    if (state.clubJackHolder && !state.hideClubJackHolder && player.id === state.clubJackHolder.id) {
        message += " 🃏";
    }
    // Добавляем информацию о мастях игроков только после первого раунда
    if (state.currentRound > 1 && state.playerSuitMap && state.playerSuitMap.has(player.id)) {
        message += " (".concat(state.playerSuitMap.get(player.id), ")");
    }
    var isCurrentPlayer = ((_a = state.players[state.currentPlayerIndex]) === null || _a === void 0 ? void 0 : _a.id) === player.id;
    if (isCurrentPlayer) {
        message += '\n\n🎯 Сейчас ваш ход!';
        if (state.tableCards.length > 0) {
            var firstCard = state.tableCards[0].card;
            var firstCardSuit_1 = firstCard.suit;
            var isFirstCardTrump = firstCardSuit_1 === state.trump || firstCard.rank === 'J';
            if (isFirstCardTrump) {
                // Если первая карта козырная или валет
                // Проверяем, есть ли у игрока козыри (включая вальтов)
                var hasTrump = player.cards.some(function (c) {
                    return c.suit === state.trump || c.rank === 'J';
                });
                if (hasTrump) {
                    message += "\n\u2757\uFE0F \u041D\u0443\u0436\u043D\u043E \u0445\u043E\u0434\u0438\u0442\u044C \u043A\u043E\u0437\u044B\u0440\u0435\u043C (\u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0432\u0430\u043B\u044C\u0442\u043E\u0432), \u0442\u0430\u043A \u043A\u0430\u043A \u043F\u0435\u0440\u0432\u0430\u044F \u043A\u0430\u0440\u0442\u0430 \u043A\u043E\u0437\u044B\u0440\u043D\u0430\u044F";
                }
                else {
                    message += "\n\u2757\uFE0F \u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043A\u043E\u0437\u044B\u0440\u0435\u0439, \u043C\u043E\u0436\u043D\u043E \u0445\u043E\u0434\u0438\u0442\u044C \u043B\u044E\u0431\u043E\u0439 \u043A\u0430\u0440\u0442\u043E\u0439";
                }
            }
            else {
                // Если первая карта не козырная и не валет
                // Проверяем, есть ли у игрока карты масти первой карты
                var hasSuit = player.cards.some(function (c) { return c.suit === firstCardSuit_1 && c.rank !== 'J'; });
                if (hasSuit) {
                    message += "\n\u2757\uFE0F \u041D\u0443\u0436\u043D\u043E \u0445\u043E\u0434\u0438\u0442\u044C \u0432 \u043C\u0430\u0441\u0442\u044C ".concat(firstCardSuit_1, ", \u0432\u0430\u043B\u0435\u0442\u044B \u043D\u0435\u043B\u044C\u0437\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C");
                }
                else {
                    message += "\n\u2757\uFE0F \u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043A\u0430\u0440\u0442 \u043C\u0430\u0441\u0442\u0438 ".concat(firstCardSuit_1, ", \u043C\u043E\u0436\u043D\u043E \u0445\u043E\u0434\u0438\u0442\u044C \u043B\u044E\u0431\u043E\u0439 \u043A\u0430\u0440\u0442\u043E\u0439 (\u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0432\u0430\u043B\u0435\u0442\u043E\u0432)");
                }
            }
        }
    }
    else {
        message += '\n\nОжидайте свой ход...';
    }
    return message;
}
// Функция для получения публичного состояния игры
function getPublicGameState(state) {
    var message = "\uD83C\uDCCF \u0420\u0430\u0443\u043D\u0434 ".concat(state.currentRound, "\n");
    message += "\u2660\uFE0F\u2663\uFE0F\u2666\uFE0F\u2665\uFE0F \u041A\u043E\u0437\u044B\u0440\u044C: ".concat(state.trump);
    // Показываем значок козыря для держателя валета крести
    if (state.clubJackHolder && !state.hideClubJackHolder) {
        message += " (\u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D \u0438\u0433\u0440\u043E\u043A\u043E\u043C ".concat(state.clubJackHolder.username, ")");
    }
    message += "\n\n";
    // Информация о командах
    message += '👥 Команда 1:\n';
    var _loop_1 = function (playerId) {
        var player = state.players.find(function (p) { return p.id === playerId; });
        if (player) {
            var playerName = player.username;
            // Показываем значок козыря для держателя валета крести
            if (state.clubJackHolder && !state.hideClubJackHolder && player.id === state.clubJackHolder.id) {
                playerName += " 🃏";
            }
            // Добавляем информацию о мастях игроков только после первого раунда
            if (state.currentRound > 1 && state.playerSuitMap && state.playerSuitMap.has(player.id)) {
                playerName += " (".concat(state.playerSuitMap.get(player.id), ")");
            }
            message += "- ".concat(playerName, " (").concat(player.cards.length, " \u043A\u0430\u0440\u0442)");
            message += "\n";
        }
    };
    for (var _i = 0, _a = state.teams.team1.players.map(function (p) { return p.id; }); _i < _a.length; _i++) {
        var playerId = _a[_i];
        _loop_1(playerId);
    }
    message += "\u041E\u0447\u043A\u0438 \u0432 \u0440\u0430\u0443\u043D\u0434\u0435: ".concat(state.teams.team1.score, "\n");
    message += "\u0412\u0437\u044F\u0442\u043A\u0438: ".concat(state.teams.team1.tricks, "\n");
    message += "\u0413\u043B\u0430\u0437\u0430: ".concat(state.teams.team1.eyes, "\n\n");
    message += '👥 Команда 2:\n';
    var _loop_2 = function (playerId) {
        var player = state.players.find(function (p) { return p.id === playerId; });
        if (player) {
            var playerName = player.username;
            // Показываем значок козыря для держателя валета крести
            if (state.clubJackHolder && !state.hideClubJackHolder && player.id === state.clubJackHolder.id) {
                playerName += " 🃏";
            }
            // Добавляем информацию о мастях игроков только после первого раунда
            if (state.currentRound > 1 && state.playerSuitMap && state.playerSuitMap.has(player.id)) {
                playerName += " (".concat(state.playerSuitMap.get(player.id), ")");
            }
            message += "- ".concat(playerName, " (").concat(player.cards.length, " \u043A\u0430\u0440\u0442)");
            message += "\n";
        }
    };
    for (var _b = 0, _c = state.teams.team2.players.map(function (p) { return p.id; }); _b < _c.length; _b++) {
        var playerId = _c[_b];
        _loop_2(playerId);
    }
    message += "\u041E\u0447\u043A\u0438 \u0432 \u0440\u0430\u0443\u043D\u0434\u0435: ".concat(state.teams.team2.score, "\n");
    message += "\u0412\u0437\u044F\u0442\u043A\u0438: ".concat(state.teams.team2.tricks, "\n");
    message += "\u0413\u043B\u0430\u0437\u0430: ".concat(state.teams.team2.eyes, "\n\n");
    // Информация о текущем ходе
    if (state.tableCards.length > 0) {
        message += '🎮 На столе:\n';
        state.tableCards.forEach(function (tableCard) {
            if (!tableCard)
                return; // Пропускаем, если карта не определена
            var player = state.players.find(function (p) { return p && p.id === tableCard.playerId; });
            if (player) {
                message += "".concat(player.username, ": ").concat(tableCard.card.suit).concat(tableCard.card.rank, "\n");
            }
            else {
                message += "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0438\u0433\u0440\u043E\u043A: ".concat(tableCard.card.suit).concat(tableCard.card.rank, "\n");
            }
        });
    }
    // Информация о текущем игроке
    var currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer) {
        message += "\n\uD83C\uDFAF \u0421\u0435\u0439\u0447\u0430\u0441 \u0445\u043E\u0434: @".concat(currentPlayer.username);
    }
    return message;
}
// Модифицируем функцию отправки карт игрока в виде стикеров
function sendPlayerCardsAsStickers(ctx, player, gameState) {
    return __awaiter(this, void 0, void 0, function () {
        var cardsBySuit, sortedCards, suits, _i, suits_1, suit, cardsInSuit, _loop_3, _a, sortedCards_1, card, error_10;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 9, , 11]);
                    cardsBySuit = player.cards.reduce(function (acc, card) {
                        if (!acc[card.suit]) {
                            acc[card.suit] = [];
                        }
                        acc[card.suit].push(card);
                        return acc;
                    }, {});
                    // Сортировка карт в каждой масти по значению
                    Object.values(cardsBySuit).forEach(function (cards) {
                        cards === null || cards === void 0 ? void 0 : cards.sort(function (a, b) { return a.value - b.value; });
                    });
                    sortedCards = [];
                    suits = ['♠', '♣', '♦', '♥'];
                    for (_i = 0, suits_1 = suits; _i < suits_1.length; _i++) {
                        suit = suits_1[_i];
                        cardsInSuit = cardsBySuit[suit];
                        if (cardsInSuit && cardsInSuit.length > 0) {
                            sortedCards.push.apply(sortedCards, cardsInSuit);
                        }
                    }
                    if (!(sortedCards.length > 0)) return [3 /*break*/, 6];
                    // Обновляем информацию о картах игрока в хранилище
                    playerCardsInPrivateChat.set(player.id, {
                        cards: __spreadArray([], sortedCards, true), // Копируем массив
                        gameId: (_b = ctx.chat) === null || _b === void 0 ? void 0 : _b.id // Используем chatId из контекста вместо gameState.chatId
                    });
                    // Добавляем информацию об inline режиме
                    return [4 /*yield*/, ctx.reply('Ваши карты (используйте стикеры для хода):\n\nЧтобы быстро выбрать карту, начните писать @ваш_бот в чате и выберите карту из появившейся панели.')];
                case 1:
                    // Добавляем информацию об inline режиме
                    _c.sent();
                    _loop_3 = function (card) {
                        var stickerKey, stickerId, index;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    stickerKey = "".concat(card.suit).concat(card.rank);
                                    stickerId = cardStickers[stickerKey];
                                    if (!stickerId) return [3 /*break*/, 2];
                                    index = player.cards.findIndex(function (c) { return c.suit === card.suit && c.rank === card.rank; });
                                    // Отправляем стикер
                                    return [4 /*yield*/, ctx.replyWithSticker(stickerId)];
                                case 1:
                                    // Отправляем стикер
                                    _d.sent();
                                    return [3 /*break*/, 3];
                                case 2:
                                    console.error("\u0421\u0442\u0438\u043A\u0435\u0440 \u0434\u043B\u044F \u043A\u0430\u0440\u0442\u044B ".concat(stickerKey, " \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D"));
                                    _d.label = 3;
                                case 3: return [2 /*return*/];
                            }
                        });
                    };
                    _a = 0, sortedCards_1 = sortedCards;
                    _c.label = 2;
                case 2:
                    if (!(_a < sortedCards_1.length)) return [3 /*break*/, 5];
                    card = sortedCards_1[_a];
                    return [5 /*yield**/, _loop_3(card)];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4:
                    _a++;
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, ctx.reply('У вас нет карт')];
                case 7:
                    _c.sent();
                    // Очищаем информацию о картах в хранилище
                    playerCardsInPrivateChat.delete(player.id);
                    _c.label = 8;
                case 8: return [3 /*break*/, 11];
                case 9:
                    error_10 = _c.sent();
                    console.error('Ошибка при отправке стикеров карт:', error_10);
                    return [4 /*yield*/, ctx.reply('Произошла ошибка при отправке карт')];
                case 10:
                    _c.sent();
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    });
}
// Обработчик стикеров и текста для ходов в игре
bot.on(['sticker', 'text'], function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var chatId_3, userId, stickerId, fileUniqueId, cardInfo_1, cardMatch, card, suit, rank, game, gameState, currentPlayerId, currentPlayer, cardIndex, result, updatedState_1, newCurrentPlayer, moveMessage_1, error_11;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 20, , 22]);
                chatId_3 = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
                userId = (_b = ctx.from) === null || _b === void 0 ? void 0 : _b.id;
                if (!chatId_3 || !userId)
                    return [2 /*return*/];
                stickerId = null;
                fileUniqueId = null;
                cardInfo_1 = null;
                if ('sticker' in ctx.message) {
                    // Если это стикер
                    stickerId = ctx.message.sticker.file_id;
                    fileUniqueId = ctx.message.sticker.file_unique_id;
                    // Логирование стикера
                    console.log("[LOG] \u041F\u043E\u043B\u0443\u0447\u0435\u043D \u0441\u0442\u0438\u043A\u0435\u0440 \u0441 ID: ".concat(stickerId));
                    console.log("[LOG] \u0421\u0442\u0438\u043A\u0435\u0440 \u043E\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F: ".concat(userId, ", \u0432 \u0447\u0430\u0442\u0435: ").concat(chatId_3));
                    // Ищем карту по стикеру
                    if (stickerId && stickerToCard.has(stickerId)) {
                        cardInfo_1 = stickerToCard.get(stickerId) || null;
                    }
                    else if (fileUniqueId && uniqueIdToCard.has(fileUniqueId)) {
                        cardInfo_1 = uniqueIdToCard.get(fileUniqueId) || null;
                    }
                }
                else if ('text' in ctx.message) {
                    cardMatch = ctx.message.text.match(/[♠♣♦♥][7-9JQKA]|[♠♣♦♥]10/);
                    if (cardMatch) {
                        card = cardMatch[0];
                        suit = card[0];
                        rank = card.substring(1);
                        console.log("[LOG] \u041D\u0430\u0439\u0434\u0435\u043D\u0430 \u043A\u0430\u0440\u0442\u0430 \u0432 \u0442\u0435\u043A\u0441\u0442\u0435: ".concat(suit).concat(rank));
                        cardInfo_1 = { suit: suit, rank: rank };
                    }
                    else {
                        // Это обычное текстовое сообщение, пропускаем
                        return [2 /*return*/];
                    }
                }
                else {
                    // Не стикер и не текст с информацией о карте, пропускаем
                    return [2 /*return*/];
                }
                game = games.get(chatId_3);
                if (!game) {
                    console.log("[LOG] \u0418\u0433\u0440\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0432 \u0447\u0430\u0442\u0435 ".concat(chatId_3));
                    return [2 /*return*/]; // Игры нет, просто пропускаем стикер
                }
                gameState = game.getGameState();
                if (!gameState.isActive) {
                    console.log("[LOG] \u0418\u0433\u0440\u0430 \u043D\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u0430 \u0432 \u0447\u0430\u0442\u0435 ".concat(chatId_3));
                    return [2 /*return*/]; // Игра не активна, пропускаем
                }
                currentPlayerId = (_c = gameState.players[gameState.currentPlayerIndex]) === null || _c === void 0 ? void 0 : _c.id;
                currentPlayer = gameState.players[gameState.currentPlayerIndex];
                console.log("[LOG] \u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0445\u043E\u0434 \u0438\u0433\u0440\u043E\u043A\u0430: ".concat(currentPlayer === null || currentPlayer === void 0 ? void 0 : currentPlayer.username, " (ID: ").concat(currentPlayerId, ")"));
                if (!currentPlayer) {
                    console.log("[LOG] \u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0438\u0433\u0440\u043E\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
                    return [2 /*return*/];
                }
                if (!(userId !== currentPlayerId)) return [3 /*break*/, 2];
                console.log("[LOG] \u041D\u0435 \u0445\u043E\u0434 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ".concat(userId, ", \u0441\u0435\u0439\u0447\u0430\u0441 \u0445\u043E\u0434 \u0438\u0433\u0440\u043E\u043A\u0430 ").concat(currentPlayer.username));
                return [4 /*yield*/, ctx.reply("\u0421\u0435\u0439\u0447\u0430\u0441 \u0445\u043E\u0434 \u0438\u0433\u0440\u043E\u043A\u0430 ".concat(currentPlayer.username))];
            case 1:
                _d.sent();
                return [2 /*return*/];
            case 2:
                if (!cardInfo_1) return [3 /*break*/, 16];
                console.log("[LOG] \u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0430 \u043A\u0430\u0440\u0442\u0430: ".concat(cardInfo_1.suit).concat(cardInfo_1.rank));
                cardIndex = currentPlayer.cards.findIndex(function (c) {
                    return c.suit === cardInfo_1.suit && c.rank === cardInfo_1.rank;
                });
                console.log("[LOG] \u0418\u043D\u0434\u0435\u043A\u0441 \u043A\u0430\u0440\u0442\u044B \u0432 \u0440\u0443\u043A\u0435 \u0438\u0433\u0440\u043E\u043A\u0430: ".concat(cardIndex));
                console.log("[LOG] \u041A\u0430\u0440\u0442\u044B \u0438\u0433\u0440\u043E\u043A\u0430:", currentPlayer.cards.map(function (c) { return "".concat(c.suit).concat(c.rank); }).join(', '));
                if (!(cardIndex === -1)) return [3 /*break*/, 4];
                console.log("[LOG] \u041A\u0430\u0440\u0442\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0432 \u0440\u0443\u043A\u0435 \u0438\u0433\u0440\u043E\u043A\u0430 ".concat(currentPlayer.username));
                return [4 /*yield*/, ctx.reply("\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u0442\u0430\u043A\u043E\u0439 \u043A\u0430\u0440\u0442\u044B")];
            case 3:
                _d.sent();
                return [2 /*return*/];
            case 4:
                // Логируем информацию о ходе
                console.log("[LOG] \u0414\u0435\u043B\u0430\u0435\u043C \u0445\u043E\u0434 \u0438\u0433\u0440\u043E\u043A\u043E\u043C ".concat(currentPlayer.username, " \u043A\u0430\u0440\u0442\u043E\u0439 ").concat(cardInfo_1.suit).concat(cardInfo_1.rank, " (\u0438\u043D\u0434\u0435\u043A\u0441: ").concat(cardIndex, ")"));
                return [4 /*yield*/, game.makeMove(currentPlayer.id, cardIndex)];
            case 5:
                result = _d.sent();
                console.log("[LOG] \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0445\u043E\u0434\u0430:", JSON.stringify(result, null, 2));
                // Добавляем детальное логирование объекта result
                console.log("[LOG] \u0421\u0432\u043E\u0439\u0441\u0442\u0432\u0430 \u043E\u0431\u044A\u0435\u043A\u0442\u0430 result:");
                console.log("- success: ".concat(result.success));
                console.log("- message: ".concat(result.message || 'отсутствует'));
                console.log("- isRoundComplete: ".concat(result.isRoundComplete));
                console.log("- isGameRoundComplete: ".concat(result.isGameRoundComplete));
                console.log("- roundSummary: ".concat(result.roundSummary ? 'присутствует' : 'отсутствует'));
                console.log("- roundResults: ".concat(result.roundResults ? 'присутствует' : 'отсутствует'));
                if (!!result.success) return [3 /*break*/, 7];
                console.log("[LOG] \u0425\u043E\u0434 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F: ".concat(result.message));
                return [4 /*yield*/, ctx.reply(result.message || 'Не удалось сделать ход')];
            case 6:
                _d.sent();
                return [2 /*return*/];
            case 7:
                // Добавляем подробное логирование
                console.log("[LOG] isRoundComplete: ".concat(result.isRoundComplete));
                console.log("[LOG] isGameRoundComplete: ".concat(result.isGameRoundComplete));
                console.log("[LOG] roundSummary exists: ".concat(!!result.roundSummary));
                console.log("[LOG] roundResults exists: ".concat(!!result.roundResults));
                if (!(result.isRoundComplete && result.roundSummary)) return [3 /*break*/, 13];
                console.log("[LOG] \u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u0441\u0432\u043E\u0434\u043A\u0438 \u0440\u0430\u0443\u043D\u0434\u0430: ".concat(result.roundSummary.substring(0, 50), "..."));
                return [4 /*yield*/, ctx.reply(result.roundSummary, {
                        reply_markup: {
                            inline_keyboard: [[
                                    { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
                                ]]
                        }
                    })];
            case 8:
                _d.sent();
                if (!(result.isGameRoundComplete && result.roundResults)) return [3 /*break*/, 10];
                console.log("[LOG] \u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432 \u0440\u0430\u0443\u043D\u0434\u0430: ".concat(result.roundResults.substring(0, 50), "..."));
                return [4 /*yield*/, ctx.reply(result.roundResults, {
                        reply_markup: {
                            inline_keyboard: [[
                                    { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
                                ]]
                        }
                    })];
            case 9:
                _d.sent();
                return [3 /*break*/, 13];
            case 10:
                if (!result.roundResults) return [3 /*break*/, 12];
                // Отправляем результаты раунда даже если isGameRoundComplete не установлено,
                // но результаты есть (возможный баг)
                console.log("[LOG] isGameRoundComplete \u043D\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E, \u043D\u043E \u0435\u0441\u0442\u044C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0440\u0430\u0443\u043D\u0434\u0430 - \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u043C");
                return [4 /*yield*/, ctx.reply(result.roundResults)];
            case 11:
                _d.sent();
                return [3 /*break*/, 13];
            case 12:
                console.log("[LOG] \u0412\u043D\u0438\u043C\u0430\u043D\u0438\u0435: \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0440\u0430\u0443\u043D\u0434\u0430 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u044B. isGameRoundComplete: ".concat(result.isGameRoundComplete, ", roundResults: ").concat(!!result.roundResults));
                _d.label = 13;
            case 13:
                updatedState_1 = game.getGameState();
                newCurrentPlayer = updatedState_1.players[updatedState_1.currentPlayerIndex];
                if (!!result.isRoundComplete) return [3 /*break*/, 15];
                moveMessage_1 = '🎮 На столе:\n';
                updatedState_1.tableCards.forEach(function (tableCard) {
                    if (!tableCard)
                        return; // Пропускаем, если карта не определена
                    var player = updatedState_1.players.find(function (p) { return p && p.id === tableCard.playerId; });
                    if (player) {
                        moveMessage_1 += "".concat(player.username, ": ").concat(tableCard.card.suit).concat(tableCard.card.rank, "\n");
                    }
                    else {
                        moveMessage_1 += "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0438\u0433\u0440\u043E\u043A: ".concat(tableCard.card.suit).concat(tableCard.card.rank, "\n");
                    }
                });
                // Добавляем информацию о следующем игроке
                if (newCurrentPlayer) {
                    moveMessage_1 += "\n\uD83C\uDFAF \u0421\u0435\u0439\u0447\u0430\u0441 \u0445\u043E\u0434: @".concat(newCurrentPlayer.username);
                }
                return [4 /*yield*/, ctx.reply(moveMessage_1, {
                        reply_markup: {
                            inline_keyboard: [[
                                    { text: 'Выбрать карту 🃏', switch_inline_query_current_chat: '' }
                                ]]
                        }
                    })];
            case 14:
                _d.sent();
                _d.label = 15;
            case 15:
                // Обновляем карты в хранилище для всех игроков
                updatedState_1.players.forEach(function (player) {
                    if (player.cards.length > 0) {
                        playerCardsInPrivateChat.set(player.id, {
                            cards: __spreadArray([], player.cards, true),
                            gameId: chatId_3 // Используем chatId вместо updatedState.chatId
                        });
                    }
                    else {
                        playerCardsInPrivateChat.delete(player.id);
                    }
                });
                return [3 /*break*/, 19];
            case 16:
                // Стикер не распознан как карта
                console.log("[LOG] \u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043A\u0430\u0440\u0442\u0443 \u043F\u043E \u0441\u0442\u0438\u043A\u0435\u0440\u0443 \u0438\u043B\u0438 \u0442\u0435\u043A\u0441\u0442\u0443");
                if (!('sticker' in ctx.message)) return [3 /*break*/, 18];
                return [4 /*yield*/, ctx.reply('Этот стикер не распознан как карта. Используйте только стикеры карт, отправленные ботом.')];
            case 17:
                _d.sent();
                _d.label = 18;
            case 18: return [2 /*return*/];
            case 19: return [3 /*break*/, 22];
            case 20:
                error_11 = _d.sent();
                console.error('Ошибка при обработке сообщения:', error_11);
                return [4 /*yield*/, ctx.reply('Произошла ошибка при обработке сообщения')];
            case 21:
                _d.sent();
                return [3 /*break*/, 22];
            case 22: return [2 /*return*/];
        }
    });
}); });
// Запускаем бота
bot.launch().then(function () { return __awaiter(void 0, void 0, void 0, function () {
    var botInfo, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('Бот запущен!');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, bot.telegram.getMe()];
            case 2:
                botInfo = _a.sent();
                console.log("\u0411\u043E\u0442 ".concat(botInfo.username, " \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0437\u0430\u043F\u0443\u0449\u0435\u043D!"));
                console.log("\u0414\u043B\u044F \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u0438 \u0438\u043D\u043B\u0430\u0439\u043D-\u0440\u0435\u0436\u0438\u043C\u0430, \u0435\u0441\u043B\u0438 \u043E\u043D \u0435\u0449\u0435 \u043D\u0435 \u0430\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D:");
                console.log("1. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0447\u0430\u0442 \u0441 @BotFather \u0432 Telegram");
                console.log("2. \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 /mybots");
                console.log("3. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0430\u0448\u0435\u0433\u043E \u0431\u043E\u0442\u0430 @".concat(botInfo.username));
                console.log("4. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \"Bot Settings\"");
                console.log("5. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \"Inline Mode\"");
                console.log("6. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \"Turn on\" \u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0438\u043D\u043B\u0430\u0439\u043D-\u0440\u0435\u0436\u0438\u043C\u0430");
                return [3 /*break*/, 4];
            case 3:
                err_1 = _a.sent();
                console.error('Ошибка при получении информации о боте:', err_1);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); }).catch(function (err) {
    console.error('Ошибка при запуске бота:', err);
});
// Добавим команду для получения инструкции по активации инлайн-режима
bot.command('inline_setup', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var botInfo, error_12;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 5]);
                return [4 /*yield*/, ctx.telegram.getMe()];
            case 1:
                botInfo = _a.sent();
                return [4 /*yield*/, ctx.reply("\u0418\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F \u043F\u043E \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u0438 \u0438\u043D\u043B\u0430\u0439\u043D-\u0440\u0435\u0436\u0438\u043C\u0430 \u0434\u043B\u044F \u0431\u043E\u0442\u0430:\n\n1. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0447\u0430\u0442 \u0441 @BotFather \u0432 Telegram\n2. \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 /mybots\n3. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0430\u0448\u0435\u0433\u043E \u0431\u043E\u0442\u0430 @".concat(botInfo.username, "\n4. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \"Bot Settings\"\n5. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \"Inline Mode\"\n6. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \"Turn on\" \u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0438\u043D\u043B\u0430\u0439\u043D-\u0440\u0435\u0436\u0438\u043C\u0430\n7. \u0412 \u0441\u0442\u0440\u043E\u043A\u0435 \"Placeholder\" \u043D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \"\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u0430\u0440\u0442\u0443 \u0434\u043B\u044F \u0445\u043E\u0434\u0430...\"\n8. \u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0431\u043E\u0442\u0430 \u043F\u043E\u0441\u043B\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"))];
            case 2:
                _a.sent();
                return [3 /*break*/, 5];
            case 3:
                error_12 = _a.sent();
                console.error('Ошибка при выполнении команды inline_setup:', error_12);
                return [4 /*yield*/, ctx.reply('Произошла ошибка при получении информации о боте')];
            case 4:
                _a.sent();
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Добавляем команду для получения ID чата
bot.command('chatid', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var chatId, chatType, chatTitle, error_13;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 4]);
                chatId = (_a = ctx.chat) === null || _a === void 0 ? void 0 : _a.id;
                chatType = (_b = ctx.chat) === null || _b === void 0 ? void 0 : _b.type;
                chatTitle = 'Личный чат';
                if (ctx.chat && 'title' in ctx.chat) {
                    chatTitle = ctx.chat.title || 'Групповой чат';
                }
                return [4 /*yield*/, ctx.reply("\uD83D\uDCCA \u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u0447\u0430\u0442\u0435:\nID \u0447\u0430\u0442\u0430: ".concat(chatId, "\n\u0422\u0438\u043F \u0447\u0430\u0442\u0430: ").concat(chatType, "\n\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435: ").concat(chatTitle, "\n\n\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u044D\u0442\u043E\u0442 ID \u0447\u0430\u0442\u0430 \u0434\u043B\u044F \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438 \u0432 \u0431\u0430\u0437\u0435 \u0434\u0430\u043D\u043D\u044B\u0445."))];
            case 1:
                _c.sent();
                return [3 /*break*/, 4];
            case 2:
                error_13 = _c.sent();
                console.error('Ошибка при получении ID чата:', error_13);
                return [4 /*yield*/, ctx.reply('Произошла ошибка при получении ID чата')];
            case 3:
                _c.sent();
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Обработка остановки бота
process.once('SIGINT', function () { return bot.stop('SIGINT'); });
process.once('SIGTERM', function () { return bot.stop('SIGTERM'); });
