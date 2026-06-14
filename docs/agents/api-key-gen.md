# api-key-gen.md

외부 API 연동을 위해 환경 변수에 설정할 API Key 발급 경로이다.

## API Key 발급 사이트

- **OpenCode (OpenCode Zen)**: `https://opencode.ai/workspace/{워크스페이스 아이디}/keys`에서 발급한다.
  - 참조 파일: `backend/services/agent-service/.env.example`
  - 적용 파일: `backend/services/agent-service/.env` (`OPENCODE_ZEN_API_KEY`)
- **Gemini (Google AI Studio)**: `https://aistudio.google.com/api-keys`에서 발급한다.
  - 참조 파일: `backend/services/agent-service/.env.example`
  - 적용 파일: `backend/services/agent-service/.env` (`GEMINI_API_KEY`)
- **OpenRouter**: `https://openrouter.ai/workspaces/default/keys`에서 발급한다.
  - 참조 파일: `backend/services/agent-service/.env.example`
  - 적용 파일: `backend/services/agent-service/.env` (`OPENROUTER_API_KEY`)
- **Ollama**: `https://ollama.com/settings/keys`에서 발급한다.
  - 참조 파일: `backend/services/agent-service/.env.example`
  - 적용 파일: `backend/services/agent-service/.env` (`OLLAMA_API_KEY`)
- **Google Cloud (Google OAuth)**: `https://console.cloud.google.com/apis/credentials?project={프로젝트-ID}`에 접속하여 **웹 애플리케이션** 유형으로 OAuth 2.0 클라이언트 자격증명을 생성한다.
  - **승인된 JavaScript 원본**: `http://localhost:9000`
  - **승인된 리디렉션 URI**: `http://localhost:9000/source/oauth/callback/google/`
  - 자격증명 값 매핑:
    - 콘솔의 **클라이언트 ID** 값을 `GOOGLE_CLIENT_ID`에 저장한다.
    - 콘솔의 **클라이언트 보안 비밀번호** 값을 `GOOGLE_CLIENT_SECRET`에 저장한다.
  - 참조 및 적용 파일:
    - 루트 디렉터리: `.env.example` -> `.env`

## 주요 파일

- [backend/services/agent-service/.env.example](../../backend/services/agent-service/.env.example)
- [frontend/.env.example](../../frontend/.env.example)
- [.env.example](../../.env.example)
