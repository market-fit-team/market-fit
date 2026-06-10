from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str | None = None

