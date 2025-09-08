-- Create players table
CREATE TABLE IF NOT EXISTS players (
  player_id BIGINT PRIMARY KEY,
  username VARCHAR(255) NOT NULL
);

-- Create global stats table
CREATE TABLE IF NOT EXISTS global_stats (
  player_id BIGINT PRIMARY KEY REFERENCES players(player_id) ON DELETE CASCADE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  total_tricks INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 0,
  eggs_count INTEGER DEFAULT 0,
  golaya_count INTEGER DEFAULT 0,
  elo_rating INTEGER DEFAULT 1000
);

-- Create table for chat-specific stats
CREATE TABLE IF NOT EXISTS chat_stats (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  player_id BIGINT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  total_tricks INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 0,
  eggs_count INTEGER DEFAULT 0,
  golaya_count INTEGER DEFAULT 0,
  elo_rating INTEGER DEFAULT 1000,
  UNIQUE(chat_id, player_id)
);

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

-- Create season tracking table
CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  season_name VARCHAR(255) NOT NULL UNIQUE,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT
); 