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
  eggs_count INTEGER DEFAULT 0,
  golaya_count INTEGER DEFAULT 0
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
  eggs_count INTEGER DEFAULT 0,
  golaya_count INTEGER DEFAULT 0,
  UNIQUE(chat_id, player_id)
); 