"""Middleware de tenancy.

Qué hace, con precisión, para no sobre-prometer: en cada request, si
viene un JWT válido en `Authorization: Bearer <token>`, lo decodifica y
deja `tenant_id` / `user_id` / `role` / `is_superadmin` en
`request.state`. Si el header viene pero el token es inválido o expiró,
corta acá con 401. Si no viene ningún header, deja `request.state` en
None/False y sigue -- no rechaza la request por sí solo.

`is_superadmin` es lo que le permite a app/db/tenant_session.py
desactivar el filtrado automático por tenant para ese usuario (ver el
docstring de get_tenant_db). Sale exclusivamente del JWT, que a su vez
sale de la columna users.is_superadmin en el momento del login -- no
hay ningún endpoint que permita auto-otorgárselo.

Lo que este middleware NO hace: no filtra ni reescribe ninguna query de
SQLAlchemy. Un middleware HTTP no tiene visibilidad sobre el ORM que
corre después, dentro del handler. El filtrado automático real de
"ningún tenant ve datos de otro" pasa en app/db/tenant_session.py, que
usa el tenant_id que este middleware dejó en request.state. Las dos
piezas trabajan juntas: este middleware certifica *quién* pide y de qué
tenant es; tenant_session.py es lo que hace que sea imposible -- no solo
improbable -- que una query devuelva datos de otro tenant.

Qué ruta requiere estar autenticado NO se decide acá (no hay un
path-prefix allowlist para mantener sincronizado a mano): cada router
lo declara explícitamente vía `Depends(get_current_user)`
(app/modules/identity/dependencies.py). Así una ruta pública nueva
(ej. un futuro /health de otro módulo) no necesita que nadie se acuerde
de agregarla a una lista acá.
"""

from uuid import UUID

import jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.security import decode_access_token


class TenancyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request.state.tenant_id = None
        request.state.user_id = None
        request.state.role = None
        # False por default: un token viejo (emitido antes de que este
        # campo existiera) o cualquier ausencia de dato nunca debe
        # interpretarse como "sí, es superadmin".
        request.state.is_superadmin = False

        auth_header = request.headers.get("authorization")
        if auth_header is None:
            return await call_next(request)

        if not auth_header.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"detail": "Authorization header mal formado"})

        token = auth_header.removeprefix("Bearer ")
        try:
            payload = decode_access_token(token)
            tenant_id = UUID(payload["tenant_id"])
            user_id = UUID(payload["sub"])
        except (jwt.PyJWTError, KeyError, ValueError) as exc:
            return JSONResponse(status_code=401, content={"detail": f"Token inválido: {exc}"})

        request.state.tenant_id = tenant_id
        request.state.user_id = user_id
        request.state.role = payload["role"]
        # bool(...) explícito: el valor sale de un JWT firmado por
        # nosotros mismos (decode_access_token ya validó la firma), así
        # que es confiable -- pero nunca truthy-coercionar sin querer
        # un valor inesperado en el payload.
        request.state.is_superadmin = bool(payload.get("is_superadmin", False))

        return await call_next(request)
