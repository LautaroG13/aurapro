from fastapi import APIRouter

from app.api.v1.endpoints import analytics, system
from app.modules.admin.routes import router as admin_router
from app.modules.customers.routes import router as customers_router
from app.modules.identity.routes import router as identity_router
from app.modules.products.routes import router as products_router
from app.modules.sales.routes import router as sales_router

api_router = APIRouter()

api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(identity_router, prefix="/auth", tags=["identity"])
api_router.include_router(products_router, prefix="/products", tags=["products"])
api_router.include_router(customers_router, prefix="/customers", tags=["customers"])
api_router.include_router(sales_router, prefix="/sales", tags=["sales"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
