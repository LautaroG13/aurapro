from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.customers.models import Customer
from app.modules.customers.schemas import CustomerCreate, CustomerUpdate


class CustomerNotFoundError(Exception):
    pass


class CustomerInUseError(Exception):
    pass


async def create_customer(db: AsyncSession, tenant_id: UUID, payload: CustomerCreate) -> Customer:
    customer = Customer(tenant_id=tenant_id, **payload.model_dump())
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


async def list_customers(db: AsyncSession, skip: int = 0, limit: int = 50) -> list[Customer]:
    result = await db.execute(
        select(Customer).order_by(Customer.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


async def get_customer(db: AsyncSession, customer_id: UUID) -> Customer:
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if customer is None:
        raise CustomerNotFoundError(f"Cliente {customer_id} no encontrado")
    return customer


async def update_customer(db: AsyncSession, customer_id: UUID, payload: CustomerUpdate) -> Customer:
    customer = await get_customer(db, customer_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    await db.commit()
    await db.refresh(customer)
    return customer


async def delete_customer(db: AsyncSession, customer_id: UUID) -> None:
    customer = await get_customer(db, customer_id)
    await db.delete(customer)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise CustomerInUseError(
            f"Cliente {customer_id} no se puede eliminar: tiene ventas asociadas"
        ) from exc
