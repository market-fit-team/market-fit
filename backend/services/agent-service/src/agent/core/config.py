from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "My Harness API"
    app_version: str = "0.1.0"
    api_key: str | None = None

    jwks_url: str = "http://host.docker.internal:3000/api/auth/jwks"
    jwt_issuer: str = "http://localhost:3000"
    jwt_audience: str = "frontend-api"
    jwt_algorithm: str = "RS256"

    ollama_api_key: str | None = None
    ollama_base_url: str = "https://ollama.com"
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    opencode_zen_api_key: str | None = None
    opencode_zen_base_url: str = "https://opencode.ai/zen/v1"

    gemini_api_key: str | None = None
    embedding_model: str = "gemini-embedding-2"
    embedding_dimension: int = 768

    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "pickle_rag_embeddings_gemini2_768_v1"
    qdrant_collection_alias: str = "pickle_rag_embeddings_current"
    qdrant_distance: str = "COSINE"

    media_fetch_timeout_seconds: float = 10.0
    health_show_timestamp: bool = True
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
