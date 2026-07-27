from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.email import EmailNotConfiguredError, EmailSendError, send_email
from app.db.async_session import get_async_db
from app.db.tenant_session import get_tenant_db
from app.modules.identity.dependencies import CurrentUser, get_current_user, require_role
from app.modules.identity.models import Tenant, User, UserRole
from app.modules.identity.schemas import (
    ForgotPasswordRequest,
    InvitationAccept,
    InvitationCreate,
    InvitationPreview,
    InvitationRead,
    ResetPasswordRequest,
    SalespersonRead,
    TenantRegister,
    TokenResponse,
    UserLogin,
    UserRead,
    UserUpdate,
)
from app.modules.identity.services import (
    CannotDeleteLastAdminError,
    CannotDeleteSelfError,
    CannotDemoteLastAdminError,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    InvitationAlreadyAcceptedError,
    InvitationExpiredError,
    InvitationNotFoundError,
    PasswordResetAlreadyUsedError,
    PasswordResetExpiredError,
    PasswordResetNotFoundError,
    TenantSuspendedError,
    UserNotFoundError,
    accept_invitation,
    authenticate_user,
    create_invitation,
    delete_user,
    get_invitation_preview,
    issue_token_for_user,
    list_invitations,
    list_salespeople,
    register_tenant,
    request_password_reset,
    reset_password,
    update_user,
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


@router.post("/forgot-password", status_code=202)
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_async_db)) -> None:
    """Siempre responde 202, exista o no el email -- no le confirmamos
    a un desconocido si una dirección está registrada en el sistema."""
    result = await request_password_reset(db, payload.email)
    if result is None:
        return

    user, token = result
    reset_link = f"{settings.frontend_url}/reset-password/{token}"
    try:
        await send_email(
            to=user.email,
            subject="Recuperar tu contraseña en AuraPro",
            html=(
                "<p>Pediste recuperar tu contraseña en AuraPro.</p>"
                f'<p><a href="{reset_link}">Elegir una contraseña nueva</a></p>'
                "<p>Este link expira en 1 hora. Si no fuiste vos, ignorá este email.</p>"
            ),
        )
    except (EmailNotConfiguredError, EmailSendError):
        # No se propaga como error HTTP: el token ya quedó creado y el
        # response sigue siendo genérico (202) para no filtrar si el
        # email existe. Si el envío falla, el usuario simplemente no
        # recibe el link -- mismo comportamiento observable que "no
        # existe ese email" desde afuera.
        pass


@router.post("/reset-password/{token}", response_model=TokenResponse, status_code=201)
async def reset_password_endpoint(
    token: str, payload: ResetPasswordRequest, db: AsyncSession = Depends(get_async_db)
) -> TokenResponse:
    try:
        user = await reset_password(db, token, payload.password)
    except PasswordResetNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (PasswordResetExpiredError, PasswordResetAlreadyUsedError) as exc:
        raise HTTPException(status_code=410, detail=str(exc)) from exc

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


@router.patch("/users/{user_id}", response_model=UserRead)
async def update_user_endpoint(
    user_id: UUID,
    payload: UserUpdate,
    _current_user: CurrentUser = Depends(require_role(UserRole.ADMIN.value)),
    db: AsyncSession = Depends(get_tenant_db),
) -> UserRead:
    try:
        user = await update_user(db, user_id, payload)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CannotDemoteLastAdminError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return UserRead.model_validate(user)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user_endpoint(
    user_id: UUID,
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN.value)),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    try:
        await delete_user(db, user_id, current_user.user_id)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CannotDeleteSelfError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except CannotDeleteLastAdminError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/salespeople", response_model=list[SalespersonRead])
async def list_salespeople_endpoint(
    _current_user: CurrentUser = Depends(require_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[SalespersonRead]:
    salespeople = await list_salespeople(db)
    return [SalespersonRead.model_validate(s) for s in salespeople]


@router.post("/invitations", response_model=InvitationRead, status_code=201)
async def invite_user(
    payload: InvitationCreate,
    current_user: CurrentUser = Depends(require_role(UserRole.ADMIN.value)),
    db: AsyncSession = Depends(get_tenant_db),
) -> InvitationRead:
    try:
        invitation = await create_invitation(
            db, current_user.tenant_id, current_user.user_id, payload.email, payload.role
        )
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    tenant_result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = tenant_result.scalar_one()
    invite_link = f"{settings.frontend_url}/invite/{invitation.token}"
    try:
        await send_email(
            to=invitation.email,
            subject=f"Te invitaron a {tenant.name} en AuraPro",
            html=(
                f"<p>Te invitaron a sumarte a <strong>{tenant.name}</strong> en AuraPro "
                f"como {invitation.role.value}.</p>"
                f'<p><a href="{invite_link}">Aceptar invitación</a></p>'
                "<p>Este link expira en 7 días.</p>"
            ),
        )
    except EmailNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except EmailSendError as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo enviar el email de invitación: {exc}") from exc

    return InvitationRead.model_validate(invitation)


@router.get("/invitations", response_model=list[InvitationRead])
async def list_invitations_endpoint(
    _current_user: CurrentUser = Depends(require_role(UserRole.ADMIN.value)),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[InvitationRead]:
    invitations = await list_invitations(db)
    return [InvitationRead.model_validate(i) for i in invitations]


@router.get("/invitations/{token}", response_model=InvitationPreview)
async def preview_invitation(token: str, db: AsyncSession = Depends(get_async_db)) -> InvitationPreview:
    try:
        invitation, tenant = await get_invitation_preview(db, token)
    except InvitationNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (InvitationExpiredError, InvitationAlreadyAcceptedError) as exc:
        raise HTTPException(status_code=410, detail=str(exc)) from exc

    return InvitationPreview(tenant_name=tenant.name, email=invitation.email, role=invitation.role)


@router.post("/invitations/{token}/accept", response_model=TokenResponse, status_code=201)
async def accept_invitation_endpoint(
    token: str, payload: InvitationAccept, db: AsyncSession = Depends(get_async_db)
) -> TokenResponse:
    try:
        user = await accept_invitation(db, token, payload.password)
    except InvitationNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (InvitationExpiredError, InvitationAlreadyAcceptedError) as exc:
        raise HTTPException(status_code=410, detail=str(exc)) from exc
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return TokenResponse(access_token=issue_token_for_user(user))
