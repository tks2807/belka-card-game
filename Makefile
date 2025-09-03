.PHONY: help build up down restart logs clean migrate backup

# Colors for output
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

help: ## Show this help
	@echo "$(GREEN)Belka Bot Docker Management$(NC)"
	@echo "$(YELLOW)Available commands:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-12s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all containers
	@echo "$(YELLOW)Building Belka Bot containers...$(NC)"
	docker-compose build --no-cache

up: ## Start all services
	@echo "$(YELLOW)Starting Belka Bot services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✅ All services started!$(NC)"
	@echo "$(YELLOW)Check status with: make status$(NC)"

down: ## Stop all services
	@echo "$(YELLOW)Stopping Belka Bot services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✅ All services stopped!$(NC)"

restart: ## Restart bot service
	@echo "$(YELLOW)Restarting Belka Bot...$(NC)"
	docker-compose restart belka-game
	@echo "$(GREEN)✅ Bot restarted!$(NC)"

status: ## Show services status
	@echo "$(YELLOW)Services status:$(NC)"
	@docker-compose ps

logs: ## Show bot logs (live)
	@echo "$(YELLOW)Showing bot logs (Ctrl+C to exit):$(NC)"
	docker-compose logs -f belka-game

logs-db: ## Show database logs
	@echo "$(YELLOW)Showing database logs:$(NC)"
	docker-compose logs db

migrate: ## Migrate existing database to support ELO rating
	@echo "$(YELLOW)Running database migration...$(NC)"
	@chmod +x docker/migrate-db.sh
	@./docker/migrate-db.sh
	@echo "$(GREEN)✅ Migration completed!$(NC)"

backup: ## Create database backup
	@echo "$(YELLOW)Creating database backup...$(NC)"
	@mkdir -p backups
	@docker-compose exec -T db pg_dump -U postgres belka_bot > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Backup created in backups/ directory$(NC)"

restore: ## Restore database from backup (Usage: make restore BACKUP=filename.sql)
	@if [ -z "$(BACKUP)" ]; then \
		echo "$(RED)❌ Please specify backup file: make restore BACKUP=filename.sql$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Restoring database from $(BACKUP)...$(NC)"
	@docker-compose stop belka-game
	@docker-compose exec -T db psql -U postgres belka_bot < $(BACKUP)
	@echo "$(YELLOW)Applying ELO migration...$(NC)"
	@./docker/migrate-db.sh
	@docker-compose start belka-game
	@echo "$(GREEN)✅ Database restored and bot restarted!$(NC)"

clean: ## Remove all containers and volumes (WARNING: DELETES ALL DATA!)
	@echo "$(RED)⚠️  This will delete ALL data including database!$(NC)"
	@read -p "Are you sure? Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ]
	docker-compose down -v
	docker system prune -f
	@echo "$(GREEN)✅ All data cleaned!$(NC)"

dev: ## Start in development mode with live logs
	@echo "$(YELLOW)Starting in development mode...$(NC)"
	docker-compose up --build

shell: ## Open shell in bot container
	@echo "$(YELLOW)Opening shell in bot container...$(NC)"
	docker-compose exec belka-game sh

db-shell: ## Open PostgreSQL shell
	@echo "$(YELLOW)Opening database shell...$(NC)"
	docker-compose exec db psql -U postgres belka_bot

stats: ## Show ELO statistics
	@echo "$(YELLOW)Top 10 players by ELO rating:$(NC)"
	@docker-compose exec db psql -U postgres belka_bot -c "SELECT username, games_played, elo_rating FROM global_stats g JOIN players p ON g.player_id = p.player_id WHERE games_played >= 5 ORDER BY elo_rating DESC LIMIT 10;"

install: ## Initial setup (first time)
	@echo "$(GREEN)🎮 Setting up Belka Bot with ELO rating system...$(NC)"
	@echo "$(YELLOW)Step 1: Building containers...$(NC)"
	@make build
	@echo "$(YELLOW)Step 2: Starting services...$(NC)"
	@make up
	@echo "$(YELLOW)Step 3: Waiting for database...$(NC)"
	@sleep 15
	@echo "$(GREEN)✅ Belka Bot is ready!$(NC)"
	@echo "$(YELLOW)📊 New commands available:$(NC)"
	@echo "  /rating - Hybrid ELO rating (recommended)"
	@echo "  /ratingchat - Chat ELO rating"
	@echo "$(YELLOW)📋 Management commands:$(NC)"
	@echo "  make logs - View logs"
	@echo "  make status - Check status"
	@echo "  make restart - Restart bot" 