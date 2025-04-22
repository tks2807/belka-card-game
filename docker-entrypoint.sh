#!/bin/sh

# Проверяем, существует ли файл schema.sql в директории dist/bot/db
if [ ! -f /app/dist/bot/db/schema.sql ]; then
  echo "WARNING: schema.sql not found in /app/dist/bot/db/"
  
  # Проверяем, есть ли файл в исходной директории src
  if [ -f /app/src/db/schema.sql ]; then
    echo "Found schema.sql in source directory, copying it..."
    # Создаем директорию, если она не существует
    mkdir -p /app/dist/bot/db
    # Копируем файл
    cp /app/src/db/schema.sql /app/dist/bot/db/
    echo "schema.sql copied successfully."
  else
    echo "ERROR: schema.sql not found in source directory either!"
    # Создаем пустой файл схемы с базовой структурой
    mkdir -p /app/dist/bot/db
    cat > /app/dist/bot/db/schema.sql << 'EOF'
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
EOF
    echo "Created default schema.sql with basic structure."
  fi
fi

# Start nginx in background
nginx

# Start the compiled bot
cd /app && node dist/bot/index.js 