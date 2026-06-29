SHELL := /bin/bash

.PHONY: gateway data restore-db services frontend-codegen frontend train-onboarding-models train-trend-models train-models up up-mac ps logs status down clean

COMPOSE := docker compose --env-file .env -f compose/backend-public-stack.yml
MAC_COMPOSE := docker compose --env-file .env -f compose/backend-public-stack.yml -f compose/backend-public-stack.mac.yml
RESTORE_SCRIPT := ./scripts/restore-backend-db-market-franchise.sh
POST_RESTORE_SCRIPT := ./scripts/restore-post-db.sh
ONBOARDING_TRAIN_SCRIPT := ./scripts/train-onboarding-models.sh
TREND_TRAIN_SCRIPT := ./scripts/train-trend-models.sh
FRONTEND_API_GEN_SCRIPT := ./scripts/generate-frontend-api-clients.sh
AUTHENTIK_BLUEPRINT_REFRESH_SCRIPT := ./scripts/refresh-authentik-blueprint.sh

GATEWAY_SERVICES := traefik
DATA_SERVICES := authentik-db backend-db community-db onboarding-db agent-db post-db trend-db redis rabbitmq minio minio-init
APP_SERVICES := authentik-server authentik-worker profile-service echo-service franchise-service market-service onboarding-service agent-service community-service post-service trend-service
FRONTEND_SERVICE := frontend

gateway:
	@echo "Traefik 공개 게이트웨이를 시작합니다..."
	@$(COMPOSE) up -d $(GATEWAY_SERVICES)

data:
	@echo "배포용 데이터 저장소를 시작합니다..."
	@$(COMPOSE) up -d --build $(DATA_SERVICES)

restore-db:
	@if [[ "$${SKIP_RESTORE:-0}" == "1" ]]; then \
		echo "DB 덤프 복원을 건너뜁니다. SKIP_RESTORE=1"; \
	else \
		echo "market / franchise 덤프를 backend-db에 복원합니다..."; \
		$(RESTORE_SCRIPT); \
		echo "post-service 덤프를 post-db에 복원합니다..."; \
		$(POST_RESTORE_SCRIPT); \
	fi

services:
	@echo "백엔드 서비스를 빌드하고 시작합니다..."
	@$(COMPOSE) up -d --build $(APP_SERVICES)
	@bash $(AUTHENTIK_BLUEPRINT_REFRESH_SCRIPT)

# frontend 빌드 전에 현재 backend OpenAPI 기준으로 Orval 산출물을 다시 만든다.
frontend-codegen:
	@echo "프론트엔드 API 타입과 클라이언트를 생성합니다..."
	@bash $(FRONTEND_API_GEN_SCRIPT)

frontend: frontend-codegen
	@echo "프론트엔드 standalone 서비스를 빌드하고 시작합니다..."
	@$(COMPOSE) up -d --build $(FRONTEND_SERVICE)

train-onboarding-models:
	@echo "온보딩 모델 학습을 실행합니다..."
	@bash $(ONBOARDING_TRAIN_SCRIPT)

train-trend-models:
	@echo "트렌드 배치를 실행합니다..."
	@bash $(TREND_TRAIN_SCRIPT)

# 배포 기준 모델 후처리는 온보딩 학습과 trend 배치를 함께 묶어 다룬다.
train-models:
	@if [[ "$${SKIP_TRAIN:-0}" == "1" ]]; then \
		echo "모델 후처리를 건너뜁니다. SKIP_TRAIN=1"; \
	else \
		$(MAKE) train-onboarding-models; \
		$(MAKE) train-trend-models; \
	fi

up: gateway data restore-db services train-models

up-mac:
	@echo "Apple Silicon용 mac 오버라이드로 배포 스택을 시작합니다..."
	@$(MAC_COMPOSE) up -d --build $(GATEWAY_SERVICES) $(DATA_SERVICES)
	@# mac 오버라이드와 dump 오버라이드를 함께 넘겨 backend-db 구성을 맞춘다.
	@STACK_EXTRA_FILES="$(CURDIR)/compose/backend-public-stack.mac.yml $(CURDIR)/compose/backend-db-market-franchise.dump.yml $(CURDIR)/compose/post-db.dump.yml" $(MAKE) restore-db
	@$(MAC_COMPOSE) up -d --build $(APP_SERVICES)
	@$(MAKE) train-models

ps:
	@$(COMPOSE) ps

logs:
	@$(COMPOSE) logs -f --tail=200

status:
	@$(COMPOSE) ps
	@set -a; source .env; set +a; \
		echo "auth host 확인: $$AUTH_PUBLIC_ORIGIN/application/o/$$AUTHENTIK_CLIENT_ID/.well-known/openid-configuration"; \
		echo "market status 확인: $$API_PUBLIC_ORIGIN/api/market/api/v1/status"; \
		echo "franchise status 확인: $$API_PUBLIC_ORIGIN/api/franchise/api/v1/status"; \
		echo "onboarding health 확인: $$API_PUBLIC_ORIGIN/api/onboarding/health"; \
		echo "trend health 확인: $$API_PUBLIC_ORIGIN/api/trend/health"

down:
	@$(COMPOSE) down

clean:
	@$(COMPOSE) down --remove-orphans -v
