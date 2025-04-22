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

# Выводим информацию об окружении
echo "==================================="
echo "Environment information:"
echo "NODE_VERSION: $(node -v)"
echo "NPM_VERSION: $(npm -v)"
echo "HTTPS_PROXY: ${HTTPS_PROXY:-not set}"
echo "HTTP_PROXY: ${HTTP_PROXY:-not set}"
echo "NODE_TLS_REJECT_UNAUTHORIZED: ${NODE_TLS_REJECT_UNAUTHORIZED:-not set}"
echo "==================================="

# Проверяем подключение к Telegram API
echo "Testing connection to Telegram API..."
TELEGRAM_API_URL="https://api.telegram.org"

# Попытка подключения без прокси
echo "Testing direct connection to Telegram API..."
curl -m 10 -s -o /dev/null -w "%{http_code}" $TELEGRAM_API_URL
DIRECT_STATUS=$?
echo "Direct connection status: $DIRECT_STATUS"

# Если есть прокси, пробуем через него
if [ ! -z "$HTTPS_PROXY" ]; then
  echo "Testing connection via proxy: $HTTPS_PROXY"
  curl -m 10 -s -o /dev/null -w "%{http_code}" --proxy $HTTPS_PROXY $TELEGRAM_API_URL
  PROXY_STATUS=$?
  echo "Proxy connection status: $PROXY_STATUS"
  
  # Если прокси работает лучше, используем его
  if [ $PROXY_STATUS -eq 0 ] && [ $DIRECT_STATUS -ne 0 ]; then
    echo "Proxy connection is working, using it."
    export USE_PROXY=true
    export NODE_TLS_REJECT_UNAUTHORIZED=0
  elif [ $PROXY_STATUS -ne 0 ] && [ $DIRECT_STATUS -eq 0 ]; then
    echo "Direct connection is working, not using proxy."
    export USE_PROXY=false
    unset HTTPS_PROXY
    unset HTTP_PROXY
  elif [ $PROXY_STATUS -ne 0 ] && [ $DIRECT_STATUS -ne 0 ]; then
    echo "WARNING: Neither direct nor proxy connection to Telegram API works."
    echo "Будем пытаться запустить бота, но возможны проблемы с соединением."
  fi
else
  # Если прямое соединение не работает и прокси не задан, предупреждаем
  if [ $DIRECT_STATUS -ne 0 ]; then
    echo "WARNING: Cannot connect to Telegram API, consider setting HTTPS_PROXY."
    echo "Example: docker run -e HTTPS_PROXY=http://proxy:port ..."
  fi
fi

# Попробуем подключиться альтернативным способом
echo "Testing connection to telegram.org..."
curl -m 10 -s -o /dev/null -w "%{http_code}" https://telegram.org
TELEGRAM_ORG_STATUS=$?
echo "telegram.org connection status: $TELEGRAM_ORG_STATUS"

# Start nginx in background
echo "Starting nginx server..."
nginx
echo "Nginx started."

# Увеличиваем тайм-аут для запросов Node.js
export NODE_OPTIONS="--dns-result-order=ipv4first --no-warnings --max-http-header-size=16384 --http-parser=legacy"

# Устанавливаем переменные среды для бота
export TELEGRAM_API_URL="https://api.telegram.org"
export TELEGRAF_LOGGING_LEVEL="debug"

# Дополнительная диагностика перед запуском бота
echo "==================================="
echo "Checking installed Node modules:"
npm list https-proxy-agent || echo "https-proxy-agent not installed globally"
npm list proxy-agent || echo "proxy-agent not installed globally"
npm list socks-proxy-agent || echo "socks-proxy-agent not installed globally"
echo "==================================="

# Вывод информации перед запуском бота
echo "Starting bot with the following configuration:"
echo "USE_PROXY: ${USE_PROXY:-false}"
echo "NODE_OPTIONS: $NODE_OPTIONS"
echo "==================================="

# Start the compiled bot
cd /app && node dist/bot/index.js 