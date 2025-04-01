"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsService = void 0;
var db_1 = __importDefault(require("../db"));
var StatsService = /** @class */ (function () {
    function StatsService() {
        // No need to load stats from file anymore
    }
    StatsService.prototype.updatePlayerStats = function (playerId, username, won, score, tricks, eggs, golaya, chatId) {
        return __awaiter(this, void 0, void 0, function () {
            var client, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.default.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 8, 10, 11]);
                        return [4 /*yield*/, client.query('BEGIN')];
                    case 3:
                        _a.sent();
                        // Ensure player exists
                        return [4 /*yield*/, client.query('INSERT INTO players (player_id, username) VALUES ($1, $2) ON CONFLICT (player_id) DO UPDATE SET username = $2', [playerId, username])];
                    case 4:
                        // Ensure player exists
                        _a.sent();
                        // Update global stats
                        return [4 /*yield*/, client.query("\n                INSERT INTO global_stats \n                (player_id, games_played, games_won, total_score, total_tricks, eggs_count, golaya_count) \n                VALUES ($1, 1, $2, $3, $4, $5, $6)\n                ON CONFLICT (player_id) DO UPDATE SET\n                games_played = global_stats.games_played + 1,\n                games_won = global_stats.games_won + $2,\n                total_score = global_stats.total_score + $3,\n                total_tricks = global_stats.total_tricks + $4,\n                eggs_count = global_stats.eggs_count + $5,\n                golaya_count = global_stats.golaya_count + $6\n            ", [
                                playerId,
                                won ? 1 : 0,
                                score,
                                tricks,
                                eggs ? 1 : 0,
                                golaya ? 1 : 0
                            ])];
                    case 5:
                        // Update global stats
                        _a.sent();
                        // Update chat stats
                        return [4 /*yield*/, client.query("\n                INSERT INTO chat_stats \n                (chat_id, player_id, games_played, games_won, total_score, total_tricks, eggs_count, golaya_count) \n                VALUES ($1, $2, 1, $3, $4, $5, $6, $7)\n                ON CONFLICT (chat_id, player_id) DO UPDATE SET\n                games_played = chat_stats.games_played + 1,\n                games_won = chat_stats.games_won + $3,\n                total_score = chat_stats.total_score + $4,\n                total_tricks = chat_stats.total_tricks + $5,\n                eggs_count = chat_stats.eggs_count + $6,\n                golaya_count = chat_stats.golaya_count + $7\n            ", [
                                chatId,
                                playerId,
                                won ? 1 : 0,
                                score,
                                tricks,
                                eggs ? 1 : 0,
                                golaya ? 1 : 0
                            ])];
                    case 6:
                        // Update chat stats
                        _a.sent();
                        return [4 /*yield*/, client.query('COMMIT')];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 11];
                    case 8:
                        error_1 = _a.sent();
                        return [4 /*yield*/, client.query('ROLLBACK')];
                    case 9:
                        _a.sent();
                        console.error('Error updating player stats:', error_1);
                        throw error_1;
                    case 10:
                        client.release();
                        return [7 /*endfinally*/];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    StatsService.prototype.getLeaderboardAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var client, result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.default.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, 5, 6]);
                        return [4 /*yield*/, client.query("\n                SELECT \n                    p.player_id,\n                    p.username,\n                    g.games_played,\n                    g.games_won,\n                    g.total_score,\n                    g.total_tricks,\n                    g.eggs_count,\n                    g.golaya_count\n                FROM \n                    global_stats g\n                JOIN \n                    players p ON g.player_id = p.player_id\n                ORDER BY \n                    g.games_won DESC, g.total_score DESC\n            ")];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result.rows.map(function (row) { return [
                                row.player_id,
                                {
                                    username: row.username,
                                    gamesPlayed: row.games_played,
                                    gamesWon: row.games_won,
                                    totalScore: row.total_score,
                                    totalTricks: row.total_tricks,
                                    eggsCount: row.eggs_count,
                                    golayaCount: row.golaya_count
                                }
                            ]; })];
                    case 4:
                        error_2 = _a.sent();
                        console.error('Error getting global leaderboard:', error_2);
                        return [2 /*return*/, []];
                    case 5:
                        client.release();
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    StatsService.prototype.getLeaderboardChat = function (chatId) {
        return __awaiter(this, void 0, void 0, function () {
            var client, result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.default.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, 5, 6]);
                        return [4 /*yield*/, client.query("\n                SELECT \n                    p.player_id,\n                    p.username,\n                    c.games_played,\n                    c.games_won,\n                    c.total_score,\n                    c.total_tricks,\n                    c.eggs_count,\n                    c.golaya_count\n                FROM \n                    chat_stats c\n                JOIN \n                    players p ON c.player_id = p.player_id\n                WHERE \n                    c.chat_id = $1\n                ORDER BY \n                    c.games_won DESC, c.total_score DESC\n            ", [chatId])];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result.rows.map(function (row) { return [
                                row.player_id,
                                {
                                    username: row.username,
                                    gamesPlayed: row.games_played,
                                    gamesWon: row.games_won,
                                    totalScore: row.total_score,
                                    totalTricks: row.total_tricks,
                                    eggsCount: row.eggs_count,
                                    golayaCount: row.golaya_count
                                }
                            ]; })];
                    case 4:
                        error_3 = _a.sent();
                        console.error('Error getting chat leaderboard:', error_3);
                        return [2 /*return*/, []];
                    case 5:
                        client.release();
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    StatsService.prototype.getPlayerStats = function (playerId) {
        return __awaiter(this, void 0, void 0, function () {
            var client, result, row, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.default.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, 5, 6]);
                        return [4 /*yield*/, client.query("\n                SELECT \n                    p.username,\n                    g.games_played,\n                    g.games_won,\n                    g.total_score,\n                    g.total_tricks,\n                    g.eggs_count,\n                    g.golaya_count\n                FROM \n                    global_stats g\n                JOIN \n                    players p ON g.player_id = p.player_id\n                WHERE \n                    g.player_id = $1\n            ", [playerId])];
                    case 3:
                        result = _a.sent();
                        if (result.rows.length === 0) {
                            return [2 /*return*/, {
                                    username: '',
                                    gamesPlayed: 0,
                                    gamesWon: 0,
                                    totalScore: 0,
                                    totalTricks: 0,
                                    eggsCount: 0,
                                    golayaCount: 0
                                }];
                        }
                        row = result.rows[0];
                        return [2 /*return*/, {
                                username: row.username,
                                gamesPlayed: row.games_played,
                                gamesWon: row.games_won,
                                totalScore: row.total_score,
                                totalTricks: row.total_tricks,
                                eggsCount: row.eggs_count,
                                golayaCount: row.golaya_count
                            }];
                    case 4:
                        error_4 = _a.sent();
                        console.error('Error getting player stats:', error_4);
                        return [2 /*return*/, {
                                username: '',
                                gamesPlayed: 0,
                                gamesWon: 0,
                                totalScore: 0,
                                totalTricks: 0,
                                eggsCount: 0,
                                golayaCount: 0
                            }];
                    case 5:
                        client.release();
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // Получение статистики для конкретного чата
    StatsService.prototype.getChatLeaderboard = function (chatId) {
        return __awaiter(this, void 0, void 0, function () {
            var client, query, result, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, db_1.default.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, , 4, 5]);
                        query = "\n                    SELECT \n                        player_id, \n                        username, \n                        games_played, \n                        games_won, \n                        total_score, \n                        total_tricks\n                    FROM \n                        chat_stats\n                    WHERE \n                        chat_id = $1\n                    ORDER BY \n                        games_won DESC, \n                        total_score DESC\n                    LIMIT 10\n                ";
                        return [4 /*yield*/, client.query(query, [chatId])];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result.rows];
                    case 4:
                        client.release();
                        return [7 /*endfinally*/];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_5 = _a.sent();
                        console.error('Ошибка при получении статистики чата:', error_5);
                        return [2 /*return*/, []];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return StatsService;
}());
exports.StatsService = StatsService;
