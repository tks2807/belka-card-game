#!/bin/bash
set -e

echo "🔄 Migrating existing database to support ELO rating system..."

# Database connection parameters from environment
DB_HOST=${DB_HOST:-167.86.110.195}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-belka-db}
DB_USER=${DB_USER:-belka}

# Function to execute SQL
execute_sql() {
    echo "Executing: $1"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "$1"
}

echo "📊 Adding ELO rating columns to existing tables..."

# Add ELO rating to global_stats table if not exists
execute_sql "ALTER TABLE global_stats ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1000;"

# Add ELO rating to chat_stats table if not exists  
execute_sql "ALTER TABLE chat_stats ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1000;"

echo "🔧 Setting default ELO rating for existing players..."

# Set default ELO rating for existing players
execute_sql "UPDATE global_stats SET elo_rating = 1000 WHERE elo_rating IS NULL;"
execute_sql "UPDATE chat_stats SET elo_rating = 1000 WHERE elo_rating IS NULL;"

echo "✅ Database migration completed successfully!"
echo "🎮 All players now have ELO rating = 1000"
echo "🏅 New hybrid rating system is ready to use!" 
