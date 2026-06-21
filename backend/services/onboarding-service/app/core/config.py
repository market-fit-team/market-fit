from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "onboarding-service"
    service_version: str = "0.1.0"
    model_id: str = "onboarding_two_tower"
    frontend_origin: str = "http://localhost:3000"
    frontend_origin_alt: str = "http://127.0.0.1:3000"

    model_config = SettingsConfigDict(env_prefix="ONBOARDING_SERVICE_")


settings = Settings()
