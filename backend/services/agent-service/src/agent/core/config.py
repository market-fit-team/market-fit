from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "My Harness API"
    app_version: str = "0.1.0"

    jwks_url: str = "http://authentik-server:9000/application/o/pickle-web/jwks/"
    jwt_issuer: str = "http://localhost:9000/application/o/pickle-web/"
    jwt_audience: str = "pickle-web"
    jwt_algorithm: str = "RS256"

    ollama_api_key: str | None = None
    ollama_base_url: str = "https://ollama.com"
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    opencode_zen_api_key: str | None = None
    opencode_zen_base_url: str = "https://opencode.ai/zen/v1"

    gemini_api_key: str | None = None
    health_show_timestamp: bool = True
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    database_url: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/agent"
    database_echo: bool = False
    auto_create_schema: bool = True
    agent_server_internal_url: str = "http://127.0.0.1:2024"
    onboarding_service_url: str = "http://onboarding-service:8000"
    service_request_timeout_seconds: float = 10.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
