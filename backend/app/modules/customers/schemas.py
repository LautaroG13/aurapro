from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CustomerTypeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)


class CustomerTypeRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    tenant_id: UUID
    name: str
    created_at: datetime


class CustomerCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    credit_limit: float | None = Field(default=None, ge=0)
    default_salesperson_id: UUID | None = None
    customer_type_id: UUID | None = None


class CustomerUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1)
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    credit_limit: float | None = Field(default=None, ge=0)
    default_salesperson_id: UUID | None = None
    customer_type_id: UUID | None = None


class CustomerRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    tenant_id: UUID
    name: str
    email: str | None
    phone: str | None
    address: str | None
    credit_limit: float | None
    default_salesperson_id: UUID | None
    customer_type_id: UUID | None
    created_at: datetime
