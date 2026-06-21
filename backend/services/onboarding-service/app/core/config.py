from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "onboarding-service"
    service_version: str = "0.1.0"
    model_id: str = "onboarding_two_tower"
    frontend_origin: str = "http://localhost:3000"
    frontend_origin_alt: str = "http://127.0.0.1:3000"
    frontend_two_tower_base_url: str = "http://localhost:3000/example/two-tower"
    database_url: str = "postgresql+psycopg://onboarding:onboarding@onboarding-db:5432/onboarding"
    database_echo: bool = False
    auto_create_schema: bool = True
    demo_auth_user_uuid: str = "123e4567-e89b-12d3-a456-426614174000"
    bootstrap_train_if_missing: bool = True
    bootstrap_train_epochs: int = 1
    bootstrap_seed_demo_profile: bool = False
    bootstrap_migrate_legacy_schema: bool = True
    bootstrap_sync_profile_codes: bool = True

    model_config = SettingsConfigDict(env_prefix="ONBOARDING_SERVICE_")


settings = Settings()
