from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.treasury.models import AccountMovementType, CashMovementType, CashSessionStatus


class AccountMovementRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    customer_id: UUID
    type: AccountMovementType
    amount: float
    description: str | None
    sale_id: UUID | None
    created_at: datetime


class CustomerAccountRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customer_id: UUID
    balance: float
    movements: list[AccountMovementRead]


class CustomerPaymentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount: float = Field(gt=0)
    payment_method: str = Field(min_length=1)
    description: str | None = None


class CashSessionOpen(BaseModel):
    model_config = ConfigDict(extra="forbid")

    opening_amount: float = Field(ge=0)


class CashSessionClose(BaseModel):
    model_config = ConfigDict(extra="forbid")

    closing_amount_declared: float = Field(ge=0)


class CashMovementCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: CashMovementType
    amount: float = Field(gt=0)
    description: str | None = None


class CashMovementRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    cash_session_id: UUID
    type: CashMovementType
    amount: float
    description: str | None
    sale_id: UUID | None
    created_at: datetime


class PaymentMethodSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    payment_method: str
    count: int
    total_amount: float


class CashSessionRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    opening_amount: float
    status: CashSessionStatus
    closed_at: datetime | None
    closing_amount_declared: float | None
    closing_amount_expected: float | None
    created_at: datetime
    movements: list[CashMovementRead] = []
