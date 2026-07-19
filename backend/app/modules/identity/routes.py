from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.async_session import get_async_db
from app.db.tenant_session import get_tenant_db
from app.modules.identity.dependencies import CurrentUser, get_current_user, require_role
from app.modules.identity.models import User, UserRole
from app.modules.identity.schemas import SalespersonRead, TenantRegister, TokenResponse, UserLogin, UserRead
from app.modules.identity.services import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    TenantSuspendedError,
    authenticate_user,
    issue_token_for_user,
    list_salespeople,
    register_tenant,
)

router = APIRouter()

WRITE_ROLES = (UserRole.ADMIN.value, UserRole.VENDEDOR.value)


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(payload: TenantRegister, db: AsyncSession = Depends(get_async_db)) -> TokenResponse:
    try:
        _tenant, admin = await register_tenant(
            db, payload.tenant_name, payload.admin_email, payload.admin_password
        )
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return TokenResponse(access_token=issue_token_for_user(admin))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_async_db)) -> TokenResponse:
    try:
        user = await authenticate_user(db, payload.email, payload.password)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except TenantSuspendedError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    return TokenResponse(access_token=issue_token_for_user(user))


@router.get("/me", response_model=UserRead)
async def me(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> UserRead:
    result = await db.execute(select(User).where(User.id == current_user.user_id))
    user = result.scalar_one()
    return UserRead.model_validate(user)


@router.get("/users", response_model=list[UserRead])
async def list_users(
    _current_user: CurrentUser = Depends(require_role(UserRole.ADMIN.value)),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[UserRead]:
    """Admin-only, y de paso la prueba de que el filtrado por tenant es
    automático: este SELECT no tiene ningún .where(tenant_id == ...)
    escrito acá -- lo agrega get_tenant_db. Devuelve solo los usuarios
    del tenant del token, nunca los de otro."""
    result = await db.execute(select(User))
    return [UserRead.model_validate(u) for u in result.scalars().all()]


@router.get("/salespeople", response_model=list[SalespersonRead])
async def list_salespeople_endpoint(
    _current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[SalespersonRead]:
    salespeople = await list_salespeople(db)
    return [SalespersonRead.model_validate(s) for s in salespeople]
