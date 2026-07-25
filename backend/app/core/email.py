"""Envío de emails transaccionales vía la API REST de Resend
(https://resend.com/docs/api-reference/emails/send-email). Sin SDK
dedicado -- un POST con httpx alcanza y evita sumar una dependencia
extra para un solo endpoint."""

import httpx

from app.core.config import settings

RESEND_API_URL = "https://api.resend.com/emails"


class EmailNotConfiguredError(Exception):
    pass


class EmailSendError(Exception):
    pass


async def send_email(*, to: str, subject: str, html: str) -> None:
    if not settings.resend_api_key:
        raise EmailNotConfiguredError("RESEND_API_KEY no está configurada")

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": settings.email_from, "to": [to], "subject": subject, "html": html},
        )
    if response.status_code >= 400:
        raise EmailSendError(response.json().get("message", response.text))
