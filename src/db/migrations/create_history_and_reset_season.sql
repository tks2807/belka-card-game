-- Migration: Create history tables and reset for new season
-- This preserves all previous data while starting fresh with new ELO system

-- Create history table for global stats
CREATE TABLE IF NOT EXISTS global_stats_history (
  id SERIAL PRIMARY KEY,
  season_name VARCHAR(255) NOT NULL DEFAULT 'Season 1',
  ended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  player_id BIGINT NOT NULL,
  username VARCHAR(255) NOT NULL,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  total_tricks INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 0,
  eggs_count INTEGER DEFAULT 0,
  golaya_count INTEGER DEFAULT 0,
  final_elo_rating INTEGER DEFAULT 1000,
  win_rate DECIMAL(5,2) DEFAULT 0,
  avg_score_per_round DECIMAL(10,2) DEFAULT 0,
  avg_tricks_per_round DECIMAL(10,2) DEFAULT 0
);

-- Create history table for chat stats
CREATE TABLE IF NOT EXISTS chat_stats_history (
  id SERIAL PRIMARY KEY,
  season_name VARCHAR(255) NOT NULL DEFAULT 'Season 1',
  ended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  chat_id BIGINT NOT NULL,
  player_id BIGINT NOT NULL,
  username VARCHAR(255) NOT NULL,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  total_tricks INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 0,
  eggs_count INTEGER DEFAULT 0,
  golaya_count INTEGER DEFAULT 0,
  final_elo_rating INTEGER DEFAULT 1000,
  win_rate DECIMAL(5,2) DEFAULT 0,
  avg_score_per_round DECIMAL(10,2) DEFAULT 0,
  avg_tricks_per_round DECIMAL(10,2) DEFAULT 0
);

-- Transfer current global stats to history with calculated averages
INSERT INTO global_stats_history (
  season_name, 
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
)
SELECT 
  'Season 1' as season_name,
  gs.player_id,
  p.username,
  gs.games_played,
  gs.games_won,
  gs.total_score,
  gs.total_tricks,
  gs.total_rounds,
  gs.eggs_count,
  gs.golaya_count,
  gs.elo_rating,
  CASE 
    WHEN gs.games_played > 0 THEN ROUND((gs.games_won::decimal / gs.games_played) * 100, 2)
    ELSE 0 
  END as win_rate,
  CASE 
    WHEN gs.total_rounds > 0 THEN ROUND(gs.total_score::decimal / gs.total_rounds, 2)
    ELSE 0 
  END as avg_score_per_round,
  CASE 
    WHEN gs.total_rounds > 0 THEN ROUND(gs.total_tricks::decimal / gs.total_rounds, 2)
    ELSE 0 
  END as avg_tricks_per_round
FROM global_stats gs
JOIN players p ON gs.player_id = p.player_id
WHERE gs.games_played > 0; -- Only transfer players who actually played

-- Transfer current chat stats to history with calculated averages
INSERT INTO chat_stats_history (
  season_name,
  chat_id,
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
)
SELECT 
  'Season 1' as season_name,
  cs.chat_id,
  cs.player_id,
  p.username,
  cs.games_played,
  cs.games_won,
  cs.total_score,
  cs.total_tricks,
  cs.total_rounds,
  cs.eggs_count,
  cs.golaya_count,
  cs.elo_rating,
  CASE 
    WHEN cs.games_played > 0 THEN ROUND((cs.games_won::decimal / cs.games_played) * 100, 2)
    ELSE 0 
  END as win_rate,
  CASE 
    WHEN cs.total_rounds > 0 THEN ROUND(cs.total_score::decimal / cs.total_rounds, 2)
    ELSE 0 
  END as avg_score_per_round,
  CASE 
    WHEN cs.total_rounds > 0 THEN ROUND(cs.total_tricks::decimal / cs.total_rounds, 2)
    ELSE 0 
  END as avg_tricks_per_round
FROM chat_stats cs
JOIN players p ON cs.player_id = p.player_id
WHERE cs.games_played > 0; -- Only transfer players who actually played

-- Reset global stats for new season (Season 2)
UPDATE global_stats SET
  games_played = 0,
  games_won = 0,
  total_score = 0,
  total_tricks = 0,
  total_rounds = 0,
  eggs_count = 0,
  golaya_count = 0,
  elo_rating = 1000;

-- Reset chat stats for new season (Season 2)
UPDATE chat_stats SET
  games_played = 0,
  games_won = 0,
  total_score = 0,
  total_tricks = 0,
  total_rounds = 0,
  eggs_count = 0,
  golaya_count = 0,
  elo_rating = 1000;

-- Add season tracking table
CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  season_name VARCHAR(255) NOT NULL UNIQUE,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT
);

-- Insert season history
INSERT INTO seasons (season_name, ended_at, is_current, description) 
VALUES ('Season 1', CURRENT_TIMESTAMP, FALSE, 'Первый сезон с исходной системой ELO');

-- Insert current season
INSERT INTO seasons (season_name, is_current, description) 
VALUES ('Season 2', TRUE, 'Новый сезон с улучшенной системой ELO и подсчетом раундов'); 