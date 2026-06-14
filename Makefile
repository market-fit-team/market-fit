.PHONY: dev infra api-catalog api-gen frontend clean

infra:
	@echo "Starting Docker Compose infrastructure..."
	@docker compose up -d --build
	@echo "Waiting for Keycloak and Traefik..."
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
	@cd frontend && npm run dev

dev: infra frontend

clean:
	@docker compose down -v
