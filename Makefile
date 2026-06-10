.PHONY: dev

dev:
	@echo "Starting Docker Compose services..."
	@docker compose up -d --build
	@echo "Waiting for database and openapi to be ready..."
	@sleep 10
	@echo "restarting nginx..."
	@docker compose restart nginx
	@echo "Running database migrations..."
	@cd frontend && npm run db:migrate
	@echo "Starting development server..."
	@cd frontend && npm run dev
