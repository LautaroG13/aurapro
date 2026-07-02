"""Dependencies de FastAPI para rutas protegidas.

`get_current_user` es lo que convierte una ruta en "requiere estar
logueado": si el TenancyMiddleware no dejó un user_id válido en
request.state (no vino JWT, o vino inválido), 401 acá. El middleware
por sí solo nunca rechaza una ruta -- esta dependency es la que decide,
por ruta, si hace falta.
"""

from uuid import UUID

from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel


class CurrentUser(BaseModel):
    user_id: UUID
    tenant_id: UUID
    role: str
    is_superadmin: bool = False


def get_current_user(request: Request) -> CurrentUser:
    user_id = getattr(request.state, "user_id", None)
    if user_id is None:
        raise HTTPException(status_code=401, detail="No autenticado")

    return CurrentUser(
        user_id=user_id,
        tenant_id=request.state.tenant_id,
        role=request.state.role,
        is_superadmin=getattr(request.state, "is_superadmin", False),
    )


def require_role(*allowed_roles: str):
    """RBAC básico: Depends(require_role(UserRole.ADMIN.value)) en un
    router. 403 si el rol del token no está en la lista permitida.
    Ortogonal a is_superadmin -- un superadmin sin el `role` de tenant
    correcto igual recibe 403 acá; usar require_superadmin para la
    consola global."""

    def _check(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Requiere uno de estos roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return _check


def require_superadmin(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Gate de la consola global (app/modules/admin). Cualquier usuario
    autenticado que no tenga is_superadmin=True en su token -- sin
    importar su `role` de tenant, incluido ADMIN -- recibe 403."""
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Requiere acceso de SuperAdmin")
    return current_user
