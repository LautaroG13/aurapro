from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.customers.models import Customer, CustomerType
from app.modules.customers.schemas import CustomerCreate, CustomerTypeCreate, CustomerUpdate
from app.modules.identity.models import User


class CustomerNotFoundError(Exception):
    pass


class CustomerInUseError(Exception):
    pass


class CustomerTypeNotFoundError(Exception):
    pass


class CustomerTypeDuplicateNameError(Exception):
    pass


class InvalidSalespersonError(Exception):
    pass


class InvalidCustomerTypeError(Exception):
    pass


async def _validate_salesperson(db: AsyncSession, user_id: UUID | None) -> None:
    """None se deja pasar -- campo opcional. get_tenant_db ya filtra
    este SELECT por tenant (mismo mecanismo que get_product), así que
    un user_id de otro tenant simplemente no aparece acá -- no hace
    falta comparar tenant_id a mano."""
    if user_id is None:
        return
    result = await db.execute(select(User.id).where(User.id == user_id))
    if result.scalar_one_or_none() is None:
        raise InvalidSalespersonError(f"Usuario {user_id} no existe en este tenant")


async def _validate_customer_type(db: AsyncSession, customer_type_id: UUID | None) -> None:
    if customer_type_id is None:
        return
    result = await db.execute(select(CustomerType.id).where(CustomerType.id == customer_type_id))
    if result.scalar_one_or_none() is None:
        raise InvalidCustomerTypeError(f"Tipo de cliente {customer_type_id} no existe en este tenant")


async def create_customer(db: AsyncSession, tenant_id: UUID, payload: CustomerCreate) -> Customer:
    await _validate_salesperson(db, payload.default_salesperson_id)
    await _validate_customer_type(db, payload.customer_type_id)
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
    updates = payload.model_dump(exclude_unset=True)
    if "default_salesperson_id" in updates:
        await _validate_salesperson(db, updates["default_salesperson_id"])
    if "customer_type_id" in updates:
        await _validate_customer_type(db, updates["customer_type_id"])
    for field, value in updates.items():
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


async def create_customer_type(
    db: AsyncSession, tenant_id: UUID, payload: CustomerTypeCreate
) -> CustomerType:
    customer_type = CustomerType(tenant_id=tenant_id, **payload.model_dump())
    db.add(customer_type)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise CustomerTypeDuplicateNameError(
            f"Ya existe un tipo de cliente llamado '{payload.name}'"
        ) from exc
    await db.refresh(customer_type)
    return customer_type


async def list_customer_types(db: AsyncSession) -> list[CustomerType]:
    result = await db.execute(select(CustomerType).order_by(CustomerType.created_at.desc()))
    return list(result.scalars().all())


async def delete_customer_type(db: AsyncSession, customer_type_id: UUID) -> None:
    result = await db.execute(select(CustomerType).where(CustomerType.id == customer_type_id))
    customer_type = result.scalar_one_or_none()
    if customer_type is None:
        raise CustomerTypeNotFoundError(f"Tipo de cliente {customer_type_id} no encontrado")
    await db.delete(customer_type)
    await db.commit()
    # Sin try/except IntegrityError acá: ondelete=SET NULL en
    # Customer.customer_type_id significa que Postgres nunca va a
    # rechazar este DELETE por referencias existentes -- los clientes
    # que tenían este tipo simplemente quedan con customer_type_id=NULL.
