.PHONY: dev infra api-catalog api-gen frontend clean

infra:
	@echo "Starting Docker Compose infrastructure..."
	@docker compose up -d --build
	@echo "Waiting for authentik and Traefik..."
	@sleep 8

api-catalog:
	@echo "Building Orval catalog from docker-compose labels..."
	@cd frontend && npm run api:catalog

api-gen: api-catalog
	@echo "Generating API clients from docker-compose label catalog..."
	@cd frontend && npm run api:gen:only

frontend:
	@echo "Running Better Auth database migrations..."
	@cd frontend && npm run db:migrate
	@echo "Starting Next.js outside the compose network..."
	@echo "If you encounter a 'Service Unavailable' error from Authentik, please terminate this terminal (Ctrl+C) and restart only the frontend by running 'make frontend'."
	@cd frontend && npm run dev

dev: infra frontend

down:
	@docker compose down

clean:
	@docker compose down -v
