from datetime import date

from pydantic import BaseModel, ConfigDict


class DashboardSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    revenue_today: float
    revenue_month: float
    sales_today_count: int
    average_ticket_month: float
    customer_debt_total: float
    low_stock_count: int


class RevenuePoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: date
    total: float


class TopProduct(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: str
    product_name: str
    quantity: int
    revenue: float


class PaymentMethodTotal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    payment_method: str
    total: float
