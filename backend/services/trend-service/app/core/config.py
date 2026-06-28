from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "trend-service"
    service_version: str = "0.1.0"
    frontend_origin: str = "http://localhost:3000"
    frontend_origin_alt: str = "http://127.0.0.1:3000"
    # sample: repo 동봉 합성 CSV(로컬/CI/오프라인), db: trend-db(Postgres) 실데이터
    data_mode: str = "sample"
    database_url: str = "postgresql+psycopg://trend:trend@trend-db:5432/trend"
    database_echo: bool = False
    # 운영 서버는 부팅 중 대용량 원천 파일을 읽지 않는다. 적재/학습은 배치에서만 수행한다.
    auto_ingest_sample_on_empty: bool = False
    # 운영 환경에서는 원천 CSV를 다시 읽지 않고 DB에 저장된 최신 배너 스냅샷을 우선 서빙한다.
    serve_banner_snapshot_from_db: bool = True
    # DB 스냅샷이 없을 때 API 요청 중 원천 CSV로 즉석 계산할지 여부. 운영에서는 false를 유지한다.
    allow_runtime_banner_compute: bool = False
    # 서울 열린데이터 Open API 키(증분 fetch용). 비어 있으면 fetch를 비활성화한다.
    seoul_api_key: str = ""

    model_config = SettingsConfigDict(env_prefix="TREND_SERVICE_")


settings = Settings()
