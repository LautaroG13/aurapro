from fastapi import APIRouter, Depends, HTTPException

from app.cache.redis_client import redis_client
from app.modules.identity.dependencies import CurrentUser, get_current_user
from app.schemas.stock_alert import StockAlertResponse
from app.services.stock_alerts import ForecastNotFoundError, StockNotFoundError, get_stock_alert

router = APIRouter()


@router.get("/stock-alert/{product_id}", response_model=StockAlertResponse)
async def stock_alert(
    product_id: str,
    current_user: CurrentUser = Depends(get_current_user),
) -> StockAlertResponse:
    # tenant_id sale del JWT, nunca de un query param -- antes este
    # endpoint no tenía NINGÚN Depends de auth y aceptaba tenant_id
    # como query param controlado por el cliente: cualquiera, sin
    # login, podía pedir el pronóstico de stock de cualquier tenant
    # adivinando/enumerando IDs.
    try:
        return await get_stock_alert(redis_client, str(current_user.tenant_id), product_id)
    except ForecastNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except StockNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
