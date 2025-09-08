import { PlayerStats } from '../types/game.types';
import pool from '../db';

export class StatsService {
    constructor() {
        // No need to load stats from file anymore
    }

    // Константы для расчета рейтинга
    private readonly RATING_CONSTANTS = {
        BASE_ELO: 1000,           // Базовый ELO рейтинг
        K_FACTOR: 32,             // K-фактор для ELO системы
        MIN_GAMES_FOR_RATING: 5,  // Минимум игр для участия в рейтинге
        SCORE_WEIGHT: 0.3,        // Вес очков в комплексном рейтинге
        TRICKS_WEIGHT: 0.2,       // Вес взяток
        WINRATE_WEIGHT: 0.4,      // Вес процента побед
        SPECIAL_WEIGHT: 0.1       // Вес специальных достижений (яйца, голые)
    };

    // Система рангов в казахском стиле
    private readonly ELO_RANKS = {
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
        LEGEND: { min: 2600, max: 9999, name: "Аңыз", nameKz: "Аңыз", icon: "💫", description: "Легенда белки" }
    };

    // Определение ранга по ELO
    public getRankByELO(elo: number): { name: string, nameKz: string, icon: string, description: string, min: number, max: number } {
        for (const rank of Object.values(this.ELO_RANKS)) {
            if (elo >= rank.min && elo <= rank.max) {
                return rank;
            }
        }
        // Если ЭЛО выше максимального, возвращаем высший ранг
        return this.ELO_RANKS.LEGEND;
    }

    // Получение прогресса до следующего ранга
    public getRankProgress(elo: number): { current: any, next: any | null, progress: number, eloToNext: number } {
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
    public getAllRanks(): Array<{ name: string, nameKz: string, icon: string, description: string, min: number, max: number }> {
        return Object.values(this.ELO_RANKS);
    }

    // Расчет ожидаемого результата для ELO системы
    private calculateExpectedScore(playerRating: number, opponentRating: number): number {
        return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    }

    // Расчет нового ELO рейтинга
    private calculateNewELO(currentELO: number, actualScore: number, expectedScore: number): number {
        return Math.round(currentELO + this.RATING_CONSTANTS.K_FACTOR * (actualScore - expectedScore));
    }

    // Получение текущего ELO рейтинга игрока (глобального)
    public async getPlayerELO(playerId: number): Promise<number> {
        const client = await pool.connect();
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
    public async getPlayerChatELO(playerId: number, chatId: number): Promise<number> {
        const client = await pool.connect();
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
    private calculatePerformanceModifier(
        score: number,
        tricks: number,
        isGolden: boolean,
        avgScore: number,
        avgTricks: number
    ): number {
        let modifier = 1.0; // Базовый модификатор

        // Модификатор за очки (±20%)
        const scoreRatio = avgScore > 0 ? score / avgScore : 1;
        const scoreModifier = Math.min(Math.max(scoreRatio, 0.5), 2.0); // Ограничиваем от 0.5 до 2.0
        modifier *= (0.8 + 0.4 * (scoreModifier - 0.5)); // Преобразуем в диапазон 0.8-1.2

        // Модификатор за взятки (±15%)
        const tricksRatio = avgTricks > 0 ? tricks / avgTricks : 1;
        const tricksModifier = Math.min(Math.max(tricksRatio, 0.5), 2.0);
        modifier *= (0.85 + 0.3 * (tricksModifier - 0.5)); // Преобразуем в диапазон 0.85-1.15

        // Бонус за голую победу (+50%)
        if (isGolden) {
            modifier *= 1.5;
        }

        // Ограничиваем итоговый модификатор от 0.5 до 2.0
        return Math.min(Math.max(modifier, 0.5), 2.0);
    }

    // Получение средних показателей игрока для расчета модификатора
    private async getPlayerAverages(playerId: number): Promise<{avgScore: number, avgTricks: number}> {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    CASE WHEN total_rounds > 0 THEN total_score::decimal / total_rounds ELSE 0 END as avg_score,
                    CASE WHEN total_rounds > 0 THEN total_tricks::decimal / total_rounds ELSE 0 END as avg_tricks
                FROM global_stats 
                WHERE player_id = $1
            `, [playerId]);
            
            if (result.rows.length > 0) {
                return {
                    avgScore: Number(result.rows[0].avg_score) || 60, // Дефолт 60 очков
                    avgTricks: Number(result.rows[0].avg_tricks) || 3  // Дефолт 3 взятки
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

    // Объединенное обновление гибридного рейтинга (ELO + качество игры)
    public async updateHybridRating(
        playerId: number,
        username: string,
        won: boolean,
        score: number,
        tricks: number,
        isGolden: boolean,
        teammateELO: number,
        opponent1ELO: number,
        opponent2ELO: number,
        chatId: number
    ): Promise<void> {
        const client = await pool.connect();
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

                        // Ограничиваем ELO в разумных пределах (500-9999)
            const clampedELO = Math.min(Math.max(newELO, 500), 9999);
            const clampedChatELO = Math.min(Math.max(newChatELO, 500), 9999);

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
    private calculateComplexRating(stats: any): number {
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

        const complexRating = 
            normalizedWinrate * this.RATING_CONSTANTS.WINRATE_WEIGHT +
            normalizedScore * this.RATING_CONSTANTS.SCORE_WEIGHT +
            normalizedTricks * this.RATING_CONSTANTS.TRICKS_WEIGHT +
            Math.min(specialBonus, 20) * this.RATING_CONSTANTS.SPECIAL_WEIGHT;

        return Math.round(complexRating);
    }

    public async updatePlayerStats(
      playerId: number,
      username: string,
      won: boolean,
      score: number,
      tricks: number,
      eggs: boolean,
      golaya: boolean,
      chatId: number,
      countGame: boolean = true,
      rounds: number = 0
  ): Promise<void> {
      const client = await pool.connect();
       const gamesPlayedInc = countGame ? 1 : 0;
       const gamesWonInc = won ? 1 : 0;
       const eggsInc = eggs ? 1 : 0;
       const golayaInc = golaya ? 1 : 0;
      try {
          await client.query('BEGIN');

          // Ensure player exists
          await client.query(
              'INSERT INTO players (player_id, username) VALUES ($1, $2) ON CONFLICT (player_id) DO UPDATE SET username = $2',
              [playerId, username]
          );

          // Update global stats
          await client.query(`
              INSERT INTO global_stats 
              (player_id, games_played, games_won, total_score, total_tricks, total_rounds, eggs_count, golaya_count) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (player_id) DO UPDATE SET
              games_played = global_stats.games_played + $2,
              games_won = global_stats.games_won + $3,
              total_score = global_stats.total_score + $4,
              total_tricks = global_stats.total_tricks + $5,
              total_rounds = global_stats.total_rounds + $6,
              eggs_count = global_stats.eggs_count + $7,
              golaya_count = global_stats.golaya_count + $8
          `, [
               playerId,
               gamesPlayedInc,
               gamesWonInc,
               score,
               tricks,
               rounds,
               eggsInc,
               golayaInc
          ]);

          // Update chat stats
          await client.query(`
              INSERT INTO chat_stats 
              (chat_id, player_id, games_played, games_won, total_score, total_tricks, total_rounds, eggs_count, golaya_count) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (chat_id, player_id) DO UPDATE SET
              games_played = chat_stats.games_played + $3,
              games_won = chat_stats.games_won + $4,
              total_score = chat_stats.total_score + $5,
              total_tricks = chat_stats.total_tricks + $6,
              total_rounds = chat_stats.total_rounds + $7,
              eggs_count = chat_stats.eggs_count + $8,
              golaya_count = chat_stats.golaya_count + $9
          `, [
              chatId,
              playerId,
              gamesPlayedInc,
              gamesWonInc,
              score,
              tricks,
              rounds,
              eggsInc,
              golayaInc
          ]);

          await client.query('COMMIT');
      } catch (error) {
          await client.query('ROLLBACK');
          console.error('Error updating player stats:', error);
          throw error;
      } finally {
          client.release();
      }
  }

    public async getLeaderboardAll(offset = 0, limit = 5): Promise<Array<[number, PlayerStats & { winrate: number }]>> {
        const client = await pool.connect();
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
        } catch (error) {
            console.error('Error getting global leaderboard:', error);
            return [];
        } finally {
            client.release();
        }
    }

    public async getLeaderboardChat(chatId: number, offset = 0, limit = 5): Promise<Array<[number, PlayerStats & { winrate: number }]>> {
        const client = await pool.connect();
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
        } catch (error) {
            console.error('Error getting chat leaderboard:', error);
            return [];
        } finally {
            client.release();
        }
    }

    // Получение улучшенного лидерборда с гибридным рейтингом
    public async getLeaderboardAllImproved(offset = 0, limit = 5): Promise<Array<[number, PlayerStats & { winrate: number, complexRating: number, isQualified: boolean, eloRating: number, rank: any }]>> {
        const client = await pool.connect();
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
                const eloRating = row.elo_rating || this.RATING_CONSTANTS.BASE_ELO;
                const rank = this.getRankByELO(eloRating);

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
                        eloRating: eloRating,
                        rank: rank
                    }
                ] as [number, PlayerStats & { winrate: number, complexRating: number, isQualified: boolean, eloRating: number, rank: any }];
            });

            // Сортируем по гибридному рейтингу (квалифицированные игроки сначала)
            playersWithRating.sort((a, b) => {
                const aStats = a[1];
                const bStats = b[1];
                
                // Сначала квалифицированные игроки
                if (aStats.isQualified && !bStats.isQualified) return -1;
                if (!aStats.isQualified && bStats.isQualified) return 1;
                
                // Если оба квалифицированы - сортируем по ELO
                if (aStats.isQualified && bStats.isQualified) {
                    return bStats.eloRating - aStats.eloRating;
                } else {
                    // Для неквалифицированных - по винрейту и количеству игр
                    if (bStats.winrate !== aStats.winrate) {
                        return bStats.winrate - aStats.winrate;
                    }
                    return bStats.gamesPlayed - aStats.gamesPlayed;
                }
            });

            // Применяем пагинацию
            return playersWithRating.slice(offset, offset + limit);

        } catch (error) {
            console.error('Error getting improved global leaderboard:', error);
            return [];
        } finally {
            client.release();
        }
    }

    // Получение улучшенного лидерборда для чата
    public async getLeaderboardChatImproved(chatId: number, offset = 0, limit = 5): Promise<Array<[number, PlayerStats & { winrate: number, complexRating: number, isQualified: boolean, eloRating: number, rank: any }]>> {
        const client = await pool.connect();
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
                const eloRating = row.elo_rating || this.RATING_CONSTANTS.BASE_ELO;
                const rank = this.getRankByELO(eloRating);

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
                        eloRating: eloRating,
                        rank: rank
                    }
                ] as [number, PlayerStats & { winrate: number, complexRating: number, isQualified: boolean, eloRating: number, rank: any }];
            });

            // Сортируем по ELO рейтингу
            playersWithRating.sort((a, b) => {
                const aStats = a[1];
                const bStats = b[1];
                
                if (aStats.isQualified && !bStats.isQualified) return -1;
                if (!aStats.isQualified && bStats.isQualified) return 1;
                
                if (aStats.isQualified && bStats.isQualified) {
                    return bStats.eloRating - aStats.eloRating;
                } else {
                    if (bStats.winrate !== aStats.winrate) {
                        return bStats.winrate - aStats.winrate;
                    }
                    return bStats.gamesPlayed - aStats.gamesPlayed;
                }
            });

            return playersWithRating.slice(offset, offset + limit);

        } catch (error) {
            console.error('Error getting improved chat leaderboard:', error);
            return [];
        } finally {
            client.release();
        }
    }

    public async getPlayerStats(playerId: number): Promise<PlayerStats> {
        const client = await pool.connect();
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
        } catch (error) {
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
        } finally {
            client.release();
        }
    }

    // Получение статистики предыдущих сезонов
    public async getSeasonHistory(playerId: number, season?: string): Promise<any[]> {
        const client = await pool.connect();
        try {
            let query = `
                SELECT 
                    season_name,
                    ended_at,
                    games_played,
                    games_won,
                    total_score,
                    total_tricks,
                    total_rounds,
                    eggs_count,
                    golaya_count,
                    final_elo_rating,
                    win_rate,
                    avg_score_per_round,
                    avg_tricks_per_round
                FROM global_stats_history 
                WHERE player_id = $1
            `;
            
            const params: any[] = [playerId];
            
            if (season) {
                query += ` AND season_name = $2`;
                params.push(season);
            }
            
            query += ` ORDER BY ended_at DESC`;
            
            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Получение статистики чата по сезонам
    public async getChatSeasonHistory(chatId: number, playerId?: number, season?: string): Promise<any[]> {
        const client = await pool.connect();
        try {
            let query = `
                SELECT 
                    season_name,
                    ended_at,
                    player_id,
                    username,
                    games_played,
                    games_won,
                    total_score,
                    total_tricks,
                    total_rounds,
                    eggs_count,
                    golaya_count,
                    final_elo_rating,
                    win_rate,
                    avg_score_per_round,
                    avg_tricks_per_round
                FROM chat_stats_history 
                WHERE chat_id = $1
            `;
            
            const params: any[] = [chatId];
            
            if (playerId) {
                query += ` AND player_id = $${params.length + 1}`;
                params.push(playerId);
            }
            
            if (season) {
                query += ` AND season_name = $${params.length + 1}`;
                params.push(season);
            }
            
            query += ` ORDER BY ended_at DESC, final_elo_rating DESC`;
            
            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Получение списка всех сезонов
    public async getAllSeasons(): Promise<any[]> {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    season_name,
                    started_at,
                    ended_at,
                    is_current,
                    description
                FROM seasons 
                ORDER BY started_at DESC
            `);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Получение текущего сезона
    public async getCurrentSeason(): Promise<any> {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    season_name,
                    started_at,
                    description
                FROM seasons 
                WHERE is_current = true
                LIMIT 1
            `);
            return result.rows[0] || { season_name: 'Season 2', started_at: new Date(), description: 'Текущий сезон' };
        } finally {
            client.release();
        }
    }

    // Получение топ игроков по сезонам
    public async getSeasonLeaderboard(season: string, chatId?: number, limit: number = 10): Promise<any[]> {
        const client = await pool.connect();
        try {
            let query, params;
            
            if (chatId) {
                query = `
                    SELECT 
                        username,
                        player_id,
                        games_played,
                        games_won,
                        win_rate,
                        final_elo_rating,
                        avg_score_per_round,
                        avg_tricks_per_round,
                        total_score,
                        total_tricks,
                        total_rounds
                    FROM chat_stats_history 
                    WHERE season_name = $1 AND chat_id = $2 AND games_played >= 5
                    ORDER BY final_elo_rating DESC, games_played DESC
                    LIMIT $3
                `;
                params = [season, chatId, limit];
            } else {
                query = `
                    SELECT 
                        username,
                        player_id,
                        games_played,
                        games_won,
                        win_rate,
                        final_elo_rating,
                        avg_score_per_round,
                        avg_tricks_per_round,
                        total_score,
                        total_tricks,
                        total_rounds
                    FROM global_stats_history 
                    WHERE season_name = $1 AND games_played >= 5
                    ORDER BY final_elo_rating DESC, games_played DESC
                    LIMIT $2
                `;
                params = [season, limit];
            }
            
            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

} 
