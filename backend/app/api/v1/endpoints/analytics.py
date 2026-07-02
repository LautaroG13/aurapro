from fastapi import APIRouter, HTTPException, Query

from app.cache.redis_client import redis_client
from app.schemas.stock_alert import StockAlertResponse
from app.services.stock_alerts import ForecastNotFoundError, StockNotFoundError, get_stock_alert

router = APIRouter()


@router.get("/stock-alert/{product_id}", response_model=StockAlertResponse)
async def stock_alert(
    product_id: str,
    tenant_id: str = Query(..., description="Tenant dueño del producto"),
) -> StockAlertResponse:
    try:
        return await get_stock_alert(redis_client, tenant_id, product_id)
    except ForecastNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except StockNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
