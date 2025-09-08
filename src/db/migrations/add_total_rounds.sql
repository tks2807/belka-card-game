-- Migration: Add total_rounds field to statistics tables
-- This allows calculating average scores per round instead of per game

-- Add total_rounds to global_stats table
ALTER TABLE global_stats ADD COLUMN IF NOT EXISTS total_rounds INTEGER DEFAULT 0;

-- Add total_rounds to chat_stats table  
ALTER TABLE chat_stats ADD COLUMN IF NOT EXISTS total_rounds INTEGER DEFAULT 0;