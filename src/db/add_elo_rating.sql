-- Add ELO rating column to existing tables
-- This script can be run to update existing databases

-- Add ELO rating to global_stats table if not exists
ALTER TABLE global_stats 
ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1000;

-- Add ELO rating to chat_stats table if not exists  
ALTER TABLE chat_stats 
ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1000;

-- Set default ELO rating for existing players
UPDATE global_stats SET elo_rating = 1000 WHERE elo_rating IS NULL;
UPDATE chat_stats SET elo_rating = 1000 WHERE elo_rating IS NULL; 