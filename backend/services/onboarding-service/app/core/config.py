from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "onboarding-service"
    service_version: str = "0.1.0"
    model_id: str = "onboarding-service"
    frontend_origin: str = "http://localhost:3000"
    frontend_origin_alt: str = "http://127.0.0.1:3000"
    frontend_result_base_url: str = "http://localhost:3000/onboarding/result"
    database_url: str = "postgresql+psycopg://onboarding:onboarding@onboarding-db:5432/onboarding"
    database_echo: bool = False
    auto_create_schema: bool = True
    demo_auth_user_uuid: str = "123e4567-e89b-12d3-a456-426614174000"
    jwks_url: str = "http://authentik-server:9000/application/o/pickle-web/jwks/"
    jwt_issuer: str = "http://localhost:9000/application/o/pickle-web/"
    jwt_audience: str = "pickle-web"
    jwt_algorithm: str = "RS256"
    bootstrap_train_if_missing: bool = True
    bootstrap_train_epochs: int = 1

    model_config = SettingsConfigDict(env_prefix="ONBOARDING_SERVICE_")


settings = Settings()
