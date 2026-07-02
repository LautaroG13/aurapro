from pydantic import BaseModel, ConfigDict


class ServiceStatus(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    healthy: bool
    detail: str | None = None


class SystemStatusResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    postgres: ServiceStatus
    redis: ServiceStatus
    kafka: ServiceStatus


class OutboxStatsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pending_count: int
