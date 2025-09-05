"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsService = void 0;
const db_1 = require("../db");
class StatsService {
    constructor() {
        // Константы для расчета рейтинга
        this.RATING_CONSTANTS = {
            BASE_ELO: 1000,
            K_FACTOR: 32,
            MIN_GAMES_FOR_RATING: 5,
            PERFORMANCE_MODIFIER_MAX: 1.5,
            PERFORMANCE_MODIFIER_MIN: 0.5,
            SCORE_WEIGHT: 0.4,
            TRICKS_WEIGHT: 0.4,
            WINRATE_WEIGHT: 0.1,
            SPECIAL_WEIGHT: 0.1 // Вес специальных достижений (яйца, голые)
        };

        // Система рангов в казахском стиле
        this.ELO_RANKS = {
            SART: { min: 0, max: 799, name: "Сарт", nameKz: "Сарт", icon: "🏪", description: "Торговец, начинающий путь" },
            ZHAUYNGER: { min: 800, max: 999, name: "Жауынгер", nameKz: "Жауынгер", icon: "🗡️", description: "Молодой воин" },
            BATYR: { min: 1000, max: 1199, name: "Батыр", nameKz: "Батыр", icon: "⚔️", description: "Храбрый воин" },
            MYNBASY: { min: 1200, max: 1399, name: "Мыңбасы", nameKz: "Мыңбасы", icon: "🛡️", description: "Тысячник, командир тысячи воинов" },
            TUMENBASY: { min: 1400, max: 1599, name: "Түменбасы", nameKz: "Түменбасы", icon: "🏹", description: "Темник, командир десяти тысяч" },
            AKSAKAT: { min: 1600, max: 1799, name: "Ақсақал", nameKz: "Ақсақал", icon: "👴", description: "Мудрый старейшина" },
            BIY: { min: 1800, max: 1999, name: "Би", nameKz: "Би", icon: "⚖️", description: "Справедливый судья" },
            SULTAN: { min: 2000, max: 2199, name: "Сұлтан", nameKz: "Сұлтан", icon: "👑", description: "Благородный правитель" },
            BEGLERBEG: { min: 2200, max: 2399, name: "Беклербек", nameKz: "Беклербек", icon: "🏛️", description: "Наместник султана, правитель области" },
            KHAN: { min: 2400, max: 2599, name: "Хан", nameKz: "Хан", icon: "🌟", description: "Великий хан" },
            LEGEND: { min: 2600, max: 2800, name: "Аңыз", nameKz: "Аңыз", icon: "💫", description: "Легенда белки" }
        };
        // No need to load stats from file anymore
    }
    // Расчет ожидаемого результата для ELO системы
    calculateExpectedScore(playerRating, opponentRating) {
        return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    }
    // Расчет нового ELO рейтинга
    calculateNewELO(currentELO, actualScore, expectedScore) {
        return Math.round(currentELO + this.RATING_CONSTANTS.K_FACTOR * (actualScore - expectedScore));
    }

    // Получение текущего ELO рейтинга игрока (глобального)
    async getPlayerELO(playerId) {
        const client = await db_1.default.connect();
        try {
            const result = await client.query(
                'SELECT elo_rating FROM global_stats WHERE player_id = $1',
                [playerId]
            );
            return result.rows.length > 0 ? result.rows[0].elo_rating : this.RATING_CONSTANTS.BASE_ELO;
        } catch (error) {
            console.error('Error getting player ELO:', error);
            return this.RATING_CONSTANTS.BASE_ELO;
        } finally {
            client.release();
        }
    }

    // Получение текущего ELO рейтинга игрока для конкретного чата
    async getPlayerChatELO(playerId, chatId) {
        const client = await db_1.default.connect();
        try {
            const result = await client.query(
                'SELECT elo_rating FROM chat_stats WHERE player_id = $1 AND chat_id = $2',
                [playerId, chatId]
            );
            return result.rows.length > 0 ? result.rows[0].elo_rating : this.RATING_CONSTANTS.BASE_ELO;
        } catch (error) {
            console.error('Error getting player chat ELO:', error);
            return this.RATING_CONSTANTS.BASE_ELO;
        } finally {
            client.release();
        }
    }

    // Расчет модификатора качества игры
    calculatePerformanceModifier(score, tricks, isGolden, avgScore, avgTricks) {
        let modifier = 1.0; // Базовый модификатор

        // Модификатор за очки (±20%)
        const scoreRatio = avgScore > 0 ? score / avgScore : 1;
        const scoreModifier = Math.min(Math.max(scoreRatio, 0.5), 2.0);
        modifier *= (0.8 + 0.4 * (scoreModifier - 0.5));

        // Модификатор за взятки (±15%)
        const tricksRatio = avgTricks > 0 ? tricks / avgTricks : 1;
        const tricksModifier = Math.min(Math.max(tricksRatio, 0.5), 2.0);
        modifier *= (0.85 + 0.3 * (tricksModifier - 0.5));

        // Бонус за голую победу (+50%)
        if (isGolden) {
            modifier *= 1.5;
        }

        return Math.min(Math.max(modifier, 0.5), 2.0);
    }

    // Получение средних показателей игрока
    async getPlayerAverages(playerId) {
        const client = await db_1.default.connect();
        try {
            const result = await client.query(`
                SELECT 
                    CASE WHEN games_played > 0 THEN total_score::decimal / games_played ELSE 0 END as avg_score,
                    CASE WHEN games_played > 0 THEN total_tricks::decimal / games_played ELSE 0 END as avg_tricks
                FROM global_stats 
                WHERE player_id = $1
            `, [playerId]);
            
            if (result.rows.length > 0) {
                return {
                    avgScore: Number(result.rows[0].avg_score) || 60,
                    avgTricks: Number(result.rows[0].avg_tricks) || 3
                };
            }
            return { avgScore: 60, avgTricks: 3 };
        } catch (error) {
            console.error('Error getting player averages:', error);
            return { avgScore: 60, avgTricks: 3 };
        } finally {
            client.release();
        }
    }

    // Объединенное обновление гибридного рейтинга
    async updateHybridRating(playerId, username, won, score, tricks, isGolden, teammateELO, opponent1ELO, opponent2ELO, chatId) {
        const client = await db_1.default.connect();
        try {
            await client.query('BEGIN');

            // Получаем текущий ELO игрока
            const playerELO = await this.getPlayerELO(playerId);
            const playerChatELO = await this.getPlayerChatELO(playerId, chatId);

            // Получаем средние показатели игрока
            const { avgScore, avgTricks } = await this.getPlayerAverages(playerId);

            // Рассчитываем средний ELO команды игрока и команды противников
            const teamELO = (playerELO + teammateELO) / 2;
            const opponentTeamELO = (opponent1ELO + opponent2ELO) / 2;

            // Рассчитываем ожидаемый результат
            const expectedScore = this.calculateExpectedScore(teamELO, opponentTeamELO);
            const actualScore = won ? 1 : 0;

            // Рассчитываем модификатор качества игры
            const performanceModifier = this.calculatePerformanceModifier(
                score, tricks, isGolden, avgScore, avgTricks
            );

            // Рассчитываем изменение ELO с учетом модификатора
            const baseELOChange = this.RATING_CONSTANTS.K_FACTOR * (actualScore - expectedScore);
            const modifiedELOChange = baseELOChange * performanceModifier;

            // Рассчитываем новый ELO
            const newELO = Math.round(playerELO + modifiedELOChange);
            const newChatELO = Math.round(playerChatELO + modifiedELOChange);

            // Ограничиваем ELO в разумных пределах (500-2800)
                    const clampedELO = Math.min(Math.max(newELO, 500), 2800);
        const clampedChatELO = Math.min(Math.max(newChatELO, 500), 2800);

            // Обновляем глобальный ELO
            await client.query(`
                INSERT INTO global_stats 
                (player_id, elo_rating) 
                VALUES ($1, $2)
                ON CONFLICT (player_id) DO UPDATE SET
                elo_rating = $2
            `, [playerId, clampedELO]);

            // Обновляем ELO для чата
            await client.query(`
                INSERT INTO chat_stats 
                (chat_id, player_id, elo_rating) 
                VALUES ($1, $2, $3)
                ON CONFLICT (chat_id, player_id) DO UPDATE SET
                elo_rating = $3
            `, [chatId, playerId, clampedChatELO]);

            await client.query('COMMIT');

            console.log(`Гибридный рейтинг обновлен для игрока ${username} (ID: ${playerId}):`);
            console.log(`  ELO: ${playerELO} -> ${clampedELO} (изменение: ${modifiedELOChange.toFixed(1)}, модификатор: ${performanceModifier.toFixed(2)})`);
            console.log(`  Чат ELO: ${playerChatELO} -> ${clampedChatELO}`);
            console.log(`  Производительность: ${score} очков, ${tricks} взяток${isGolden ? ', голая победа' : ''}`);

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating hybrid rating:', error);
        } finally {
            client.release();
        }
    }
    // Расчет комплексного рейтинга
    calculateComplexRating(stats) {
        if (stats.gamesPlayed < this.RATING_CONSTANTS.MIN_GAMES_FOR_RATING) {
            return 0; // Недостаточно игр для рейтинга
        }
        const winrate = stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed) : 0;
        const avgScore = stats.gamesPlayed > 0 ? (stats.totalScore / stats.gamesPlayed) : 0;
        const avgTricks = stats.gamesPlayed > 0 ? (stats.totalTricks / stats.gamesPlayed) : 0;
        // Нормализация метрик (приведение к шкале 0-100)
        const normalizedWinrate = winrate * 100;
        const normalizedScore = Math.min(avgScore / 2, 100); // Средний счет обычно до 200
        const normalizedTricks = Math.min(avgTricks * 10, 100); // Среднее количество взяток
        const specialBonus = (stats.golayaCount * 5 + stats.eggsCount * 3) / stats.gamesPlayed * 10;
        const complexRating = normalizedWinrate * this.RATING_CONSTANTS.WINRATE_WEIGHT +
            normalizedScore * this.RATING_CONSTANTS.SCORE_WEIGHT +
            normalizedTricks * this.RATING_CONSTANTS.TRICKS_WEIGHT +
            Math.min(specialBonus, 20) * this.RATING_CONSTANTS.SPECIAL_WEIGHT;
        return Math.round(complexRating);
    }
    async updatePlayerStats(playerId, username, won, score, tricks, eggs, golaya, chatId, countGame = true) {
        const client = await db_1.default.connect();
        const gamesPlayedInc = countGame ? 1 : 0;
        const gamesWonInc = won ? 1 : 0;
        const eggsInc = eggs ? 1 : 0;
        const golayaInc = golaya ? 1 : 0;
        try {
            await client.query('BEGIN');
            // Ensure player exists
            await client.query('INSERT INTO players (player_id, username) VALUES ($1, $2) ON CONFLICT (player_id) DO UPDATE SET username = $2', [playerId, username]);
            // Update global stats
            await client.query(`
              INSERT INTO global_stats 
              (player_id, games_played, games_won, total_score, total_tricks, eggs_count, golaya_count) 
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (player_id) DO UPDATE SET
              games_played = global_stats.games_played + $2,
              games_won = global_stats.games_won + $3,
              total_score = global_stats.total_score + $4,
              total_tricks = global_stats.total_tricks + $5,
              eggs_count = global_stats.eggs_count + $6,
              golaya_count = global_stats.golaya_count + $7
          `, [
                playerId,
                gamesPlayedInc,
                gamesWonInc,
                score,
                tricks,
                eggsInc,
                golayaInc
            ]);
            // Update chat stats
            await client.query(`
              INSERT INTO chat_stats 
              (chat_id, player_id, games_played, games_won, total_score, total_tricks, eggs_count, golaya_count) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (chat_id, player_id) DO UPDATE SET
              games_played = chat_stats.games_played + $3,
              games_won = chat_stats.games_won + $4,
              total_score = chat_stats.total_score + $5,
              total_tricks = chat_stats.total_tricks + $6,
              eggs_count = chat_stats.eggs_count + $7,
              golaya_count = chat_stats.golaya_count + $8
          `, [
                chatId,
                playerId,
                gamesPlayedInc,
                gamesWonInc,
                score,
                tricks,
                eggsInc,
                golayaInc
            ]);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating player stats:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getLeaderboardAll(offset = 0, limit = 5) {
        const client = await db_1.default.connect();
        try {
            const result = await client.query(`
                SELECT 
                    p.player_id,
                    p.username,
                    g.games_played,
                    g.games_won,
                    g.total_score,
                    g.total_tricks,
                    g.eggs_count,
                    g.golaya_count,
                    CASE WHEN g.games_played > 0 THEN ROUND((g.games_won::decimal / g.games_played) * 100) ELSE 0 END AS winrate
                FROM 
                    global_stats g
                JOIN 
                    players p ON g.player_id = p.player_id
                ORDER BY 
                    winrate DESC, g.games_won DESC, g.total_score DESC
                OFFSET $1 LIMIT $2
            `, [offset, limit]);
            return result.rows.map(row => [
                row.player_id,
                {
                    username: row.username,
                    gamesPlayed: row.games_played,
                    gamesWon: row.games_won,
                    totalScore: row.total_score,
                    totalTricks: row.total_tricks,
                    eggsCount: row.eggs_count,
                    golayaCount: row.golaya_count,
                    winrate: Number(row.winrate)
                }
            ]);
        }
        catch (error) {
            console.error('Error getting global leaderboard:', error);
            return [];
        }
        finally {
            client.release();
        }
    }
    async getLeaderboardChat(chatId, offset = 0, limit = 5) {
        const client = await db_1.default.connect();
        try {
            const result = await client.query(`
                SELECT 
                    p.player_id,
                    p.username,
                    c.games_played,
                    c.games_won,
                    c.total_score,
                    c.total_tricks,
                    c.eggs_count,
                    c.golaya_count,
                    CASE WHEN c.games_played > 0 THEN ROUND((c.games_won::decimal / c.games_played) * 100) ELSE 0 END AS winrate
                FROM 
                    chat_stats c
                JOIN 
                    players p ON c.player_id = p.player_id
                WHERE 
                    c.chat_id = $1
                ORDER BY 
                    winrate DESC, c.games_won DESC, c.total_score DESC
                OFFSET $2 LIMIT $3
            `, [chatId, offset, limit]);
            return result.rows.map(row => [
                row.player_id,
                {
                    username: row.username,
                    gamesPlayed: row.games_played,
                    gamesWon: row.games_won,
                    totalScore: row.total_score,
                    totalTricks: row.total_tricks,
                    eggsCount: row.eggs_count,
                    golayaCount: row.golaya_count,
                    winrate: Number(row.winrate)
                }
            ]);
        }
        catch (error) {
            console.error('Error getting chat leaderboard:', error);
            return [];
        }
        finally {
            client.release();
        }
    }
    // Получение улучшенного лидерборда с комплексным рейтингом
    async getLeaderboardAllImproved(offset = 0, limit = 5) {
        const client = await db_1.default.connect();
        try {
            const result = await client.query(`
                SELECT 
                    p.player_id,
                    p.username,
                    g.games_played,
                    g.games_won,
                    g.total_score,
                    g.total_tricks,
                    g.eggs_count,
                    g.golaya_count,
                    g.elo_rating,
                    CASE WHEN g.games_played > 0 THEN ROUND((g.games_won::decimal / g.games_played) * 100) ELSE 0 END AS winrate
                FROM 
                    global_stats g
                JOIN 
                    players p ON g.player_id = p.player_id
                WHERE g.games_played > 0
                ORDER BY 
                    g.games_played DESC, g.games_won DESC, g.total_score DESC
            `);
            // Рассчитываем комплексный рейтинг для каждого игрока
            const playersWithRating = result.rows.map(row => {
                const stats = {
                    gamesPlayed: row.games_played,
                    gamesWon: row.games_won,
                    totalScore: row.total_score,
                    totalTricks: row.total_tricks,
                    eggsCount: row.eggs_count,
                    golayaCount: row.golaya_count
                };
                const complexRating = this.calculateComplexRating(stats);
                const isQualified = row.games_played >= this.RATING_CONSTANTS.MIN_GAMES_FOR_RATING;
                return [
                    row.player_id,
                    {
                        username: row.username,
                        gamesPlayed: row.games_played,
                        gamesWon: row.games_won,
                        totalScore: row.total_score,
                        totalTricks: row.total_tricks,
                        eggsCount: row.eggs_count,
                        golayaCount: row.golaya_count,
                        winrate: Number(row.winrate),
                        complexRating: complexRating,
                        isQualified: isQualified,
                        eloRating: row.elo_rating || this.RATING_CONSTANTS.BASE_ELO
                    }
                ];
            });
            // Сортируем по ELO рейтингу (квалифицированные игроки сначала)
            playersWithRating.sort((a, b) => {
                const aStats = a[1];
                const bStats = b[1];
                // Сначала квалифицированные игроки
                if (aStats.isQualified && !bStats.isQualified)
                    return -1;
                if (!aStats.isQualified && bStats.isQualified)
                    return 1;
                // Если оба квалифицированы - сортируем по ELO
                if (aStats.isQualified && bStats.isQualified) {
                    return bStats.eloRating - aStats.eloRating;
                }
                else {
                    // Для неквалифицированных - по винрейту и количеству игр
                    if (bStats.winrate !== aStats.winrate) {
                        return bStats.winrate - aStats.winrate;
                    }
                    return bStats.gamesPlayed - aStats.gamesPlayed;
                }
            });
            // Применяем пагинацию
            return playersWithRating.slice(offset, offset + limit);
        }
        catch (error) {
            console.error('Error getting improved global leaderboard:', error);
            return [];
        }
        finally {
            client.release();
        }
    }
    // Получение улучшенного лидерборда для чата
    async getLeaderboardChatImproved(chatId, offset = 0, limit = 5) {
        const client = await db_1.default.connect();
        try {
            const result = await client.query(`
                SELECT 
                    p.player_id,
                    p.username,
                    c.games_played,
                    c.games_won,
                    c.total_score,
                    c.total_tricks,
                    c.eggs_count,
                    c.golaya_count,
                    c.elo_rating,
                    CASE WHEN c.games_played > 0 THEN ROUND((c.games_won::decimal / c.games_played) * 100) ELSE 0 END AS winrate
                FROM 
                    chat_stats c
                JOIN 
                    players p ON c.player_id = p.player_id
                WHERE 
                    c.chat_id = $1 AND c.games_played > 0
                ORDER BY 
                    c.games_played DESC, c.games_won DESC, c.total_score DESC
            `, [chatId]);
            // Рассчитываем комплексный рейтинг для каждого игрока
            const playersWithRating = result.rows.map(row => {
                const stats = {
                    gamesPlayed: row.games_played,
                    gamesWon: row.games_won,
                    totalScore: row.total_score,
                    totalTricks: row.total_tricks,
                    eggsCount: row.eggs_count,
                    golayaCount: row.golaya_count
                };
                const complexRating = this.calculateComplexRating(stats);
                const isQualified = row.games_played >= this.RATING_CONSTANTS.MIN_GAMES_FOR_RATING;
                return [
                    row.player_id,
                    {
                        username: row.username,
                        gamesPlayed: row.games_played,
                        gamesWon: row.games_won,
                        totalScore: row.total_score,
                        totalTricks: row.total_tricks,
                        eggsCount: row.eggs_count,
                        golayaCount: row.golaya_count,
                        winrate: Number(row.winrate),
                        complexRating: complexRating,
                        isQualified: isQualified,
                        eloRating: row.elo_rating || this.RATING_CONSTANTS.BASE_ELO
                    }
                ];
            });
            // Сортируем по ELO рейтингу
            playersWithRating.sort((a, b) => {
                const aStats = a[1];
                const bStats = b[1];
                if (aStats.isQualified && !bStats.isQualified)
                    return -1;
                if (!aStats.isQualified && bStats.isQualified)
                    return 1;
                if (aStats.isQualified && bStats.isQualified) {
                    return bStats.eloRating - aStats.eloRating;
                }
                else {
                    if (bStats.winrate !== aStats.winrate) {
                        return bStats.winrate - aStats.winrate;
                    }
                    return bStats.gamesPlayed - aStats.gamesPlayed;
                }
            });
            return playersWithRating.slice(offset, offset + limit);
        }
        catch (error) {
            console.error('Error getting improved chat leaderboard:', error);
            return [];
        }
        finally {
            client.release();
        }
    }
    async getPlayerStats(playerId) {
        const client = await db_1.default.connect();
        try {
            const result = await client.query(`
                SELECT 
                    p.username,
                    g.games_played,
                    g.games_won,
                    g.total_score,
                    g.total_tricks,
                    g.eggs_count,
                    g.golaya_count
                FROM 
                    global_stats g
                JOIN 
                    players p ON g.player_id = p.player_id
                WHERE 
                    g.player_id = $1
            `, [playerId]);
            if (result.rows.length === 0) {
                return {
                    username: '',
                    gamesPlayed: 0,
                    gamesWon: 0,
                    totalScore: 0,
                    totalTricks: 0,
                    eggsCount: 0,
                    golayaCount: 0
                };
            }
            const row = result.rows[0];
            return {
                username: row.username,
                gamesPlayed: row.games_played,
                gamesWon: row.games_won,
                totalScore: row.total_score,
                totalTricks: row.total_tricks,
                eggsCount: row.eggs_count,
                golayaCount: row.golaya_count
            };
        }
        catch (error) {
            console.error('Error getting player stats:', error);
            return {
                username: '',
                gamesPlayed: 0,
                gamesWon: 0,
                totalScore: 0,
                totalTricks: 0,
                eggsCount: 0,
                golayaCount: 0
            };
        }
        finally {
            client.release();
        }
    }

    // Определение ранга по ELO
    getRankByELO(elo) {
        for (const rank of Object.values(this.ELO_RANKS)) {
            if (elo >= rank.min && elo <= rank.max) {
                return rank;
            }
        }
        // Если ЭЛО выше максимального, возвращаем высший ранг
        return this.ELO_RANKS.LEGEND;
    }

    // Получение прогресса до следующего ранга
    getRankProgress(elo) {
        const currentRank = this.getRankByELO(elo);
        const ranks = Object.values(this.ELO_RANKS);
        const currentIndex = ranks.findIndex(rank => rank.min === currentRank.min);
        const nextRank = currentIndex < ranks.length - 1 ? ranks[currentIndex + 1] : null;
        
        if (!nextRank) {
            return {
                current: currentRank,
                next: null,
                progress: 100,
                eloToNext: 0
            };
        }

        const eloInCurrentRank = elo - currentRank.min;
        const rankRange = currentRank.max - currentRank.min + 1;
        const progress = Math.min(100, Math.round((eloInCurrentRank / rankRange) * 100));
        const eloToNext = nextRank.min - elo;

        return {
            current: currentRank,
            next: nextRank,
            progress,
            eloToNext: Math.max(0, eloToNext)
        };
    }

    // Получение списка всех рангов для отображения
    getAllRanks() {
        return Object.values(this.ELO_RANKS);
    }
}
exports.StatsService = StatsService;
