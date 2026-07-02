"""El mecanismo que hace real la promesa de "ningún tenant ve datos de
otro": una sesión de SQLAlchemy con un listener de evento
(`do_orm_execute`) que inyecta automáticamente
`with_loader_criteria(TenantModel, tenant_id == <el del JWT>)` en toda
query SELECT/UPDATE/DELETE contra cualquier clase que herede de
TenantModel. No depende de que cada desarrollador se acuerde de escribir
`.where(Model.tenant_id == ...)` en cada query -- si te olvidás, el
filtro se aplica igual.

`tenant_id` sale de `request.state.tenant_id`, que dejó el
TenancyMiddleware después de validar el JWT (app/middleware/tenancy.py).
Si no hay tenant_id (no hay JWT válido), esta dependency rechaza con 401
antes de abrir ninguna sesión -- no existe una sesión tenant-scoped sin
tenant.

*** SuperAdmin bypass -- leer antes de tocar esto ***
Si request.state.is_superadmin es True, esta función directamente NO
registra el listener: la sesión que devuelve queda sin ningún filtro de
tenant. Esto no está limitado a app/modules/admin/ -- es la MISMA
get_tenant_db que usan products/customers/sales. Un token con
is_superadmin=True ve datos de TODOS los tenants a través de
CUALQUIER endpoint existente que dependa de get_tenant_db (ej.
`GET /api/v1/products` devolvería los productos de todo el sistema, no
solo los del tenant "propio" del superadmin). Es exactamente lo que se
pidió ("que el filtro se desactive"), pero el radio de alcance es
deliberadamente amplio -- no es exclusivo de la consola de admin. Si en
algún momento se quiere un bypass acotado solo a app/modules/admin/, la
forma correcta es una dependency nueva (ej. get_superadmin_db) en vez de
tocar esta, para no ampliar el radio de todos los endpoints existentes
sin decidirlo explícitamente.

is_superadmin sale del JWT (firmado, validado por TenancyMiddleware) --
nunca de un header o campo de un request body, así que no es
falsificable por un cliente que no controle ese token.
"""

from collections.abc import AsyncGenerator
from uuid import UUID

from fastapi import HTTPException, Request
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import with_loader_criteria

from app.db.async_session import AsyncSessionLocal
from app.shared.tenant_model import TenantModel


async def get_tenant_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    tenant_id: UUID | None = getattr(request.state, "tenant_id", None)
    if tenant_id is None:
        raise HTTPException(status_code=401, detail="No autenticado")

    is_superadmin: bool = getattr(request.state, "is_superadmin", False)

    async with AsyncSessionLocal() as session:
        if not is_superadmin:

            @event.listens_for(session.sync_session, "do_orm_execute")
            def _filter_by_tenant(execute_state):
                if execute_state.is_select or execute_state.is_update or execute_state.is_delete:
                    execute_state.statement = execute_state.statement.options(
                        with_loader_criteria(
                            TenantModel,
                            lambda cls: cls.tenant_id == tenant_id,
                            include_aliases=True,
                        )
                    )

        yield session
