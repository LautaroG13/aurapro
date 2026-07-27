from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class IntegrationConfigUpsert(BaseModel):
    """Write-only a propósito: el config completo (con los valores
    reales, ej. el access_token) solo viaja en este request. Nunca se
    devuelve en una respuesta -- ver IntegrationRead, que solo expone
    los nombres de las claves guardadas, mismo criterio que
    UserUpdate.new_password."""

    model_config = ConfigDict(extra="forbid")

    config: dict[str, str] = Field(min_length=1)


class IntegrationRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    provider: str
    config_keys: list[str]
    updated_at: datetime
