#!/usr/bin/env bash
set -euo pipefail

# 이 스크립트는 zip을 프로젝트 루트에 푼 뒤 실행하는 보조 스크립트입니다.
# 기존 simple-agent template 잔여물이 새 native Agent Server와 충돌하지 않도록 제거합니다.

rm -rf backend/services/agent-service/src/simple_agent
rm -f backend/services/agent-service/uv.lock

echo "Agent Server patch cleanup complete. Next: cp backend/services/agent-service/.env.example backend/services/agent-service/.env"
