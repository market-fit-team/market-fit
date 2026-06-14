.PHONY: dev infra api-catalog api-gen frontend clean

infra:
	@echo "Starting MSA infrastructure..."
	@docker compose up -d --build
	@echo "Waiting for Keycloak, Consul, Discovery, and API Edge..."
	@sleep 8

api-catalog:
	@echo "Fetching Discovery catalog for Orval..."
	@cd frontend && npm run api:catalog

api-gen: api-catalog
	@echo "Generating API clients from Discovery catalog..."
	@cd frontend && npm run api:gen:only

frontend:
	@echo "Running Better Auth database migrations..."
	@cd frontend && npm run db:migrate
	@echo "Starting Next.js outside the compose network..."
	@cd frontend && npm run dev

dev: infra api-gen frontend

clean:
	@docker compose down -v
