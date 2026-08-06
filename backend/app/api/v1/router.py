from fastapi import APIRouter

from app.api.v1.endpoints import analytics, dashboard, system
from app.modules.admin.routes import router as admin_router
from app.modules.customers.routes import router as customers_router
from app.modules.identity.routes import router as identity_router
from app.modules.integrations.routes import router as integrations_router
from app.modules.order_notes.routes import router as order_notes_router
from app.modules.products.routes import router as products_router
from app.modules.quotes.routes import router as quotes_router
from app.modules.sales.routes import router as sales_router
from app.modules.treasury.routes import router as treasury_router

api_router = APIRouter()

api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(identity_router, prefix="/auth", tags=["identity"])
api_router.include_router(products_router, prefix="/products", tags=["products"])
api_router.include_router(customers_router, prefix="/customers", tags=["customers"])
api_router.include_router(sales_router, prefix="/sales", tags=["sales"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(treasury_router, prefix="/treasury", tags=["treasury"])
api_router.include_router(integrations_router, prefix="/integrations", tags=["integrations"])
api_router.include_router(quotes_router, prefix="/quotes", tags=["quotes"])
api_router.include_router(order_notes_router, prefix="/order-notes", tags=["order-notes"])
