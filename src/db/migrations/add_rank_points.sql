-- Visible seasonal rank progression. ELO remains the hidden skill rating.
ALTER TABLE chat_stats
  ADD COLUMN IF NOT EXISTS rank_tier SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rank_points SMALLINT NOT NULL DEFAULT 0;

-- Existing players begin at Жауынгер with zero RP.
UPDATE chat_stats
SET rank_tier = 1, rank_points = 0
WHERE rank_tier IS NULL OR rank_points IS NULL;
