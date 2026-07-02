from fastapi import APIRouter, HTTPException

from app.schemas.system_status import OutboxStatsResponse, SystemStatusResponse
from app.services.system_status import count_pending_outbox, get_system_status

router = APIRouter()


@router.get("/status", response_model=SystemStatusResponse)
async def system_status() -> SystemStatusResponse:
    postgres_status, redis_status, kafka_status = await get_system_status()
    payload = SystemStatusResponse(postgres=postgres_status, redis=redis_status, kafka=kafka_status)

    if not (postgres_status.healthy and redis_status.healthy and kafka_status.healthy):
        raise HTTPException(status_code=503, detail=payload.model_dump())

    return payload


@router.get("/outbox-stats", response_model=OutboxStatsResponse)
async def outbox_stats() -> OutboxStatsResponse:
    pending_count = await count_pending_outbox()
    return OutboxStatsResponse(pending_count=pending_count)
