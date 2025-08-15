import { PlayerStats } from '../types/game.types';
import pool from '../db';

export class StatsService {
    constructor() {
        // No need to load stats from file anymore
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
      countGame: boolean = true
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
              (player_id, games_played, games_won, total_score, total_tricks, eggs_count, golaya_count) 
              VALUES ($1, 1, $2, $3, $4, $5, $6)
              ON CONFLICT (player_id) DO UPDATE SET
              games_played = global_stats.games_played + 1,
              games_won = global_stats.games_won + $2,
              total_score = global_stats.total_score + $3,
              total_tricks = global_stats.total_tricks + $4,
              eggs_count = global_stats.eggs_count + $5,
              golaya_count = global_stats.golaya_count + $6
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
              VALUES ($1, $2, 1, $3, $4, $5, $6, $7)
              ON CONFLICT (chat_id, player_id) DO UPDATE SET
              games_played = chat_stats.games_played + 1,
              games_won = chat_stats.games_won + $3,
              total_score = chat_stats.total_score + $4,
              total_tricks = chat_stats.total_tricks + $5,
              eggs_count = chat_stats.eggs_count + $6,
              golaya_count = chat_stats.golaya_count + $7
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
} 
