import { PlayerStats } from '../types/game.types';
import pool from '../db';

export class StatsService {
    constructor() {
        // No need to load stats from file anymore
    }

    // Константы для расчета рейтинга
    private readonly RATING_CONSTANTS = {
        BASE_ELO: 1000,           // Базовый ELO рейтинг
        MIN_GAMES_FOR_RATING: 5,  // Минимум игр для участия в рейтинге
        SCORE_WEIGHT: 0.3,        // Вес очков в комплексном рейтинге
        TRICKS_WEIGHT: 0.2,       // Вес взяток
        WINRATE_WEIGHT: 0.4,      // Вес процента побед
        SPECIAL_WEIGHT: 0.1       // Вес специальных достижений (яйца, голые)
    };

    // Калибровка только в начале сезона: карточная игра достаточно дисперсна,
    // поэтому после неё рейтинг двигается медленнее.
    private getDynamicKFactor(gamesPlayed: number): number {
        return gamesPlayed < 10 ? 24 : 12;
    }

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

    // Расчет нового ELO рейтинга (устаревший, используется getDynamicKFactor)
    private calculateNewELO(currentELO: number, actualScore: number, expectedScore: number, kFactor = 24): number {
        return Math.round(currentELO + kFactor * (actualScore - expectedScore));
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

    /**
     * Updates one completed 2v2 match from a single, locked rating snapshot.
     * A player's individual tricks, points, and hand are intentionally excluded:
     * ELO measures the result of the pair, not an intra-team competition.
     */
    public async updateTeamRatings(
        winners: Array<{ id: number; username: string }>,
        losers: Array<{ id: number; username: string }>,
        isGolden: boolean,
        chatId: number
    ): Promise<Map<number, { oldElo: number; newElo: number; delta: number; gamesPlayed: number }>> {
        if (winners.length !== 2 || losers.length !== 2) {
            throw new Error('Team ELO requires exactly two players per team');
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const players = [...winners, ...losers];
            const playerIds = players.map(player => player.id);
            for (const player of players) {
                await client.query(
                    'INSERT INTO players (player_id, username) VALUES ($1, $2) ON CONFLICT (player_id) DO UPDATE SET username = EXCLUDED.username',
                    [player.id, player.username]
                );
                await client.query('INSERT INTO global_stats (player_id) VALUES ($1) ON CONFLICT (player_id) DO NOTHING', [player.id]);
                await client.query('INSERT INTO chat_stats (chat_id, player_id) VALUES ($1, $2) ON CONFLICT (chat_id, player_id) DO NOTHING', [chatId, player.id]);
            }

            const globalRows = await client.query(
                'SELECT player_id, elo_rating, COALESCE(season_games_played, 0) AS season_games_played FROM global_stats WHERE player_id = ANY($1::bigint[]) FOR UPDATE',
                [playerIds]
            );
            const chatRows = await client.query(
                'SELECT player_id, elo_rating, COALESCE(season_games_played, 0) AS season_games_played FROM chat_stats WHERE chat_id = $1 AND player_id = ANY($2::bigint[]) FOR UPDATE',
                [chatId, playerIds]
            );

            const toRatings = (rows: any[]) => new Map(rows.map(row => [
                Number(row.player_id),
                { elo: Number(row.elo_rating), games: Number(row.season_games_played) }
            ]));
            const global = toRatings(globalRows.rows);
            const chat = toRatings(chatRows.rows);

            const calculateDeltas = (ratings: Map<number, { elo: number; games: number }>) => {
                const winnerRating = (ratings.get(winners[0].id)!.elo + ratings.get(winners[1].id)!.elo) / 2;
                const loserRating = (ratings.get(losers[0].id)!.elo + ratings.get(losers[1].id)!.elo) / 2;
                const gamesBeforeMatch = Math.min(...playerIds.map(id => ratings.get(id)!.games));
                const k = this.getDynamicKFactor(gamesBeforeMatch);
                const expectedWinner = this.calculateExpectedScore(winnerRating, loserRating);
                const baseWinnerDelta = Math.round(k * (1 - expectedWinner));
                const winnerDelta = baseWinnerDelta + (isGolden ? 10 : 0);
                return { winnerDelta, loserDelta: -baseWinnerDelta, k };
            };

            const globalDelta = calculateDeltas(global);
            const chatDelta = calculateDeltas(chat);
            const changes = new Map<number, { oldElo: number; newElo: number; delta: number; gamesPlayed: number }>();

            for (const player of players) {
                const won = winners.some(winner => winner.id === player.id);
                const globalOld = global.get(player.id)!;
                const chatOld = chat.get(player.id)!;
                const nextGlobal = Math.min(Math.max(globalOld.elo + (won ? globalDelta.winnerDelta : globalDelta.loserDelta), 500), 9999);
                const nextChat = Math.min(Math.max(chatOld.elo + (won ? chatDelta.winnerDelta : chatDelta.loserDelta), 500), 9999);

                await client.query('UPDATE global_stats SET elo_rating = $2 WHERE player_id = $1', [player.id, nextGlobal]);
                await client.query('UPDATE chat_stats SET elo_rating = $3 WHERE chat_id = $1 AND player_id = $2', [chatId, player.id, nextChat]);
                changes.set(player.id, {
                    oldElo: chatOld.elo,
                    newElo: nextChat,
                    delta: won ? chatDelta.winnerDelta : chatDelta.loserDelta,
                    gamesPlayed: chatOld.games + 1
                });
            }

            await client.query('COMMIT');

            console.log(`Командный ELO обновлён: global K=${globalDelta.k}, chat K=${chatDelta.k}, голая=${isGolden}`);
            return changes;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating team rating:', error);
            throw error;
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

          // Update global stats (alltime + season columns)
          await client.query(`
              INSERT INTO global_stats 
              (player_id, games_played, games_won, total_score, total_tricks, total_rounds, eggs_count, golaya_count,
               season_games_played, season_games_won, season_total_score, season_total_tricks, season_eggs_count, season_golaya_count) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $2, $3, $4, $5, $7, $8)
              ON CONFLICT (player_id) DO UPDATE SET
              games_played = global_stats.games_played + $2,
              games_won = global_stats.games_won + $3,
              total_score = global_stats.total_score + $4,
              total_tricks = global_stats.total_tricks + $5,
              total_rounds = global_stats.total_rounds + $6,
              eggs_count = global_stats.eggs_count + $7,
              golaya_count = global_stats.golaya_count + $8,
              season_games_played = global_stats.season_games_played + $2,
              season_games_won = global_stats.season_games_won + $3,
              season_total_score = global_stats.season_total_score + $4,
              season_total_tricks = global_stats.season_total_tricks + $5,
              season_eggs_count = global_stats.season_eggs_count + $7,
              season_golaya_count = global_stats.season_golaya_count + $8
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

          // Update chat stats (alltime + season columns)
          await client.query(`
              INSERT INTO chat_stats
              (chat_id, player_id, games_played, games_won, total_score, total_tricks, total_rounds, eggs_count, golaya_count,
               season_games_played, season_games_won, season_total_score, season_total_tricks, season_eggs_count, season_golaya_count) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $3, $4, $5, $6, $8, $9)
              ON CONFLICT (chat_id, player_id) DO UPDATE SET
              games_played = chat_stats.games_played + $3,
              games_won = chat_stats.games_won + $4,
              total_score = chat_stats.total_score + $5,
              total_tricks = chat_stats.total_tricks + $6,
              total_rounds = chat_stats.total_rounds + $7,
              eggs_count = chat_stats.eggs_count + $8,
              golaya_count = chat_stats.golaya_count + $9,
              season_games_played = chat_stats.season_games_played + $3,
              season_games_won = chat_stats.season_games_won + $4,
              season_total_score = chat_stats.season_total_score + $5,
              season_total_tricks = chat_stats.season_total_tricks + $6,
              season_eggs_count = chat_stats.season_eggs_count + $8,
              season_golaya_count = chat_stats.season_golaya_count + $9
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

          if (countGame) {
              const featureResult = await client.query(
                  `SELECT win_streak, best_win_streak, active_title, unlocked_titles
                   FROM player_chat_features WHERE chat_id = $1 AND player_id = $2 FOR UPDATE`,
                  [chatId, playerId]
              );
              const feature = featureResult.rows[0] || { win_streak: 0, best_win_streak: 0, active_title: null, unlocked_titles: [] };
              const streak = won ? Number(feature.win_streak) + 1 : 0;
              const bestStreak = Math.max(Number(feature.best_win_streak), streak);
              const totals = await client.query(
                  `SELECT season_games_played, season_games_won, season_golaya_count
                   FROM chat_stats WHERE chat_id = $1 AND player_id = $2`,
                  [chatId, playerId]
              );
              const total = totals.rows[0];
              const titles = Array.isArray(feature.unlocked_titles) ? [...feature.unlocked_titles] : [];
              const unlock = (title: string, condition: boolean) => { if (condition && !titles.includes(title)) titles.push(title); };
              unlock('🎯 Победитель', Number(total.season_games_won) >= 1);
              unlock('🔥 На серии', bestStreak >= 3);
              unlock('⚡ Неостановим', bestStreak >= 5);
              unlock('🎯 Голая рука', Number(total.season_golaya_count) >= 1);
              unlock('👑 Мастер голой', Number(total.season_golaya_count) >= 3);
              unlock('🃏 Ветеран', Number(total.season_games_played) >= 25);
              unlock('🏆 Чемпион', Number(total.season_games_won) >= 25);
              unlock('💯 Сотник', Number(total.season_games_played) >= 100);
              const activeTitle = feature.active_title && titles.includes(feature.active_title) ? feature.active_title : (titles[titles.length - 1] || null);
              await client.query(
                  `INSERT INTO player_chat_features (chat_id, player_id, win_streak, best_win_streak, active_title, unlocked_titles)
                   VALUES ($1, $2, $3, $4, $5, $6::jsonb)
                   ON CONFLICT (chat_id, player_id) DO UPDATE SET
                     win_streak = EXCLUDED.win_streak, best_win_streak = EXCLUDED.best_win_streak,
                     active_title = EXCLUDED.active_title, unlocked_titles = EXCLUDED.unlocked_titles`,
                  [chatId, playerId, streak, bestStreak, activeTitle, JSON.stringify(titles)]
              );
          }

          await client.query('COMMIT');
      } catch (error) {
          await client.query('ROLLBACK');
          console.error('Error updating player stats:', error);
          throw error;
      } finally {
          client.release();
      }
  }

    public async getChatFeatures(playerId: number, chatId: number): Promise<{ winStreak: number; bestWinStreak: number; activeTitle: string | null; titles: string[] }> {
        const result = await pool.query(
            'SELECT win_streak, best_win_streak, active_title, unlocked_titles FROM player_chat_features WHERE chat_id = $1 AND player_id = $2',
            [chatId, playerId]
        );
        const row = result.rows[0];
        return row ? { winStreak: Number(row.win_streak), bestWinStreak: Number(row.best_win_streak), activeTitle: row.active_title, titles: Array.isArray(row.unlocked_titles) ? row.unlocked_titles : [] } : { winStreak: 0, bestWinStreak: 0, activeTitle: null, titles: [] };
    }

    public async setActiveTitle(playerId: number, chatId: number, title: string): Promise<boolean> {
        const features = await this.getChatFeatures(playerId, chatId);
        if (!features.titles.includes(title)) return false;
        await pool.query('UPDATE player_chat_features SET active_title = $3 WHERE chat_id = $1 AND player_id = $2', [chatId, playerId, title]);
        return true;
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
    public async getLeaderboardAllImproved(offset = 0, limit = 5): Promise<Array<[number, PlayerStats & { winrate: number, complexRating: number, isQualified: boolean, eloRating: number, rank: any, seasonGamesPlayed: number, seasonGamesWon: number }]>> {
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
                    COALESCE(g.season_games_played, 0) as season_games_played,
                    COALESCE(g.season_games_won, 0) as season_games_won,
                    COALESCE(g.season_golaya_count, 0) as season_golaya_count,
                    COALESCE(g.season_eggs_count, 0) as season_eggs_count,
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
                        rank: rank,
                        seasonGamesPlayed: Number(row.season_games_played || 0),
                        seasonGamesWon: Number(row.season_games_won || 0),
                        seasonGolayaCount: Number(row.season_golaya_count || 0),
                        seasonEggsCount: Number(row.season_eggs_count || 0)
                    }
                ] as [number, PlayerStats & { winrate: number, complexRating: number, isQualified: boolean, eloRating: number, rank: any, seasonGamesPlayed: number, seasonGamesWon: number, seasonGolayaCount: number, seasonEggsCount: number }];
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
    public async getLeaderboardChatImproved(chatId: number, offset = 0, limit = 5): Promise<Array<[number, PlayerStats & { winrate: number, complexRating: number, isQualified: boolean, eloRating: number, rank: any, seasonGamesPlayed: number, seasonGamesWon: number }]>> {
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
                    COALESCE(c.season_games_played, 0) as season_games_played,
                    COALESCE(c.season_games_won, 0) as season_games_won,
                    COALESCE(c.season_golaya_count, 0) as season_golaya_count,
                    COALESCE(c.season_eggs_count, 0) as season_eggs_count,
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
                        rank: rank,
                        seasonGamesPlayed: Number(row.season_games_played || 0),
                        seasonGamesWon: Number(row.season_games_won || 0),
                        seasonGolayaCount: Number(row.season_golaya_count || 0),
                        seasonEggsCount: Number(row.season_eggs_count || 0)
                    }
                ] as [number, PlayerStats & { winrate: number, complexRating: number, isQualified: boolean, eloRating: number, rank: any, seasonGamesPlayed: number, seasonGamesWon: number, seasonGolayaCount: number, seasonEggsCount: number }];
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

    // === Season management methods (#11) ===

    // Получить игрока с наибольшим ELO (чемпион сезона)
    public async getSeasonChampion(): Promise<{ player_id: number; username: string; elo_rating: number } | null> {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT g.player_id, p.username, g.elo_rating
                FROM global_stats g
                JOIN players p ON g.player_id = p.player_id
                WHERE g.season_games_played >= 1
                ORDER BY g.elo_rating DESC
                LIMIT 1
            `);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    // Завершить текущий сезон и начать новый
    public async endSeason(): Promise<{ endedSeasonName: string; newSeasonName: string; champion: { username: string; elo: number } | null }> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Получаем текущий сезон
            const currentSeasonResult = await client.query(
                'SELECT id, season_name FROM seasons WHERE is_current = true LIMIT 1'
            );
            if (currentSeasonResult.rows.length === 0) {
                throw new Error('Текущий сезон не найден');
            }
            const currentSeason = currentSeasonResult.rows[0];
            const currentSeasonName = currentSeason.season_name;

            // Получаем чемпиона (игрок с наибольшим ELO)
            const championResult = await client.query(`
                SELECT g.player_id, p.username, g.elo_rating
                FROM global_stats g
                JOIN players p ON g.player_id = p.player_id
                WHERE g.season_games_played >= 1
                ORDER BY g.elo_rating DESC
                LIMIT 1
            `);
            const champion = championResult.rows[0] || null;

            // Определяем номер нового сезона
            const seasonNumMatch = currentSeasonName.match(/(\d+)/);
            const currentNum = seasonNumMatch ? parseInt(seasonNumMatch[1]) : 1;
            const newSeasonName = `Season ${currentNum + 1}`;

            // Завершаем текущий сезон
            await client.query(`
                UPDATE seasons SET
                    is_current = false,
                    ended_at = NOW(),
                    champion_player_id = $1,
                    champion_username = $2
                WHERE id = $3
            `, [champion?.player_id || null, champion?.username || null, currentSeason.id]);

            // Создаём новый сезон
            await client.query(`
                INSERT INTO seasons (season_name, started_at, is_current, description)
                VALUES ($1, NOW(), true, $2)
            `, [newSeasonName, `Сезон ${currentNum + 1}`]);

            // Сбрасываем ELO всех игроков до 1000
            await client.query('UPDATE global_stats SET elo_rating = 1000');
            await client.query('UPDATE chat_stats SET elo_rating = 1000');

            // Сбрасываем сезонные колонки
            await client.query(`
                UPDATE global_stats SET
                    season_games_played = 0,
                    season_games_won = 0,
                    season_total_score = 0,
                    season_total_tricks = 0,
                    season_eggs_count = 0,
                    season_golaya_count = 0
            `);
            await client.query(`
                UPDATE chat_stats SET
                    season_games_played = 0,
                    season_games_won = 0,
                    season_total_score = 0,
                    season_total_tricks = 0,
                    season_eggs_count = 0,
                    season_golaya_count = 0
            `);

            await client.query('COMMIT');

            return {
                endedSeasonName: currentSeasonName,
                newSeasonName,
                champion: champion ? { username: champion.username, elo: champion.elo_rating } : null
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // История чемпионов (завершённые сезоны)
    public async getChampionsHistory(): Promise<Array<{ season_name: string; champion_username: string | null; ended_at: Date | null; is_current: boolean }>> {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT season_name, champion_username, ended_at, is_current
                FROM seasons
                ORDER BY started_at ASC
            `);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Получить alltime статистику игрока (для /alltime)
    public async getLeaderboardAlltime(offset = 0, limit = 10): Promise<Array<{ player_id: number; username: string; games_played: number; games_won: number; golaya_count: number; eggs_count: number; total_tricks: number; winrate: number }>> {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT g.player_id, p.username,
                    g.games_played, g.games_won, g.golaya_count, g.eggs_count, g.total_tricks,
                    CASE WHEN g.games_played > 0 THEN ROUND((g.games_won::decimal / g.games_played) * 100) ELSE 0 END AS winrate
                FROM global_stats g
                JOIN players p ON g.player_id = p.player_id
                WHERE g.games_played > 0
                ORDER BY g.games_played DESC, g.games_won DESC
                OFFSET $1 LIMIT $2
            `, [offset, limit]);
            return result.rows;
        } finally {
            client.release();
        }
    }

} 
