.PHONY: dev infra status api-catalog api-gen frontend down clean

infra:
	@echo "Docker Compose 인프라를 시작합니다..."
	@docker compose up -d --build

status:
	@echo "authentik, traefik의 현재 상태를 확인합니다..."
	@curl -fsS http://localhost:9000/application/o/pickle-web/.well-known/openid-configuration >/dev/null \
		&& echo "authentik 상태: ok" \
		|| echo "authentik 상태: fail"
	@docker inspect -f '{{.State.Status}}' traefik >/dev/null 2>&1 \
		&& echo "traefik 상태: running" \
		|| echo "traefik 상태: fail"


api-catalog:
	@echo "docker-compose 라벨을 기준으로 Orval 카탈로그를 생성합니다..."
	@cd frontend && npm run api:catalog

api-gen: api-catalog
	@echo "docker-compose 라벨 카탈로그를 기준으로 API 클라이언트를 생성합니다..."
	@cd frontend && npm run api:gen:only

frontend:
	@echo "authentik, traefik은 실행에 시간이 필요합니다. 프론트엔드에서 에러 발생 시 이 터미널을 종료한 뒤(Ctrl+C) 'make frontend'로 프론트엔드만 다시 시작하세요. 'make status'로 authentik, traefik의 상태를 확인할 수 있습니다."
	@echo "Compose 네트워크 바깥에서 Next.js를 시작합니다..."
	@cd frontend && npm run dev

dev: infra status frontend

down:
	@docker compose down

clean:
	@docker compose down --remove-orphans -v
