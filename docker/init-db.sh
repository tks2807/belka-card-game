#!/bin/bash
set -e

# Function to execute SQL file
execute_sql() {
    echo "Executing $1..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$1"
}

echo "Initializing Belka Bot database..."

# Create initial schema
execute_sql "/docker-entrypoint-initdb.d/schema.sql"

# Apply ELO rating updates
execute_sql "/docker-entrypoint-initdb.d/add_elo_rating.sql"

echo "Database initialization completed!" 