import enum


class TaxStatus(str, enum.Enum):
    """Situación fiscal ante AFIP/ARCA (Argentina). Determina qué tipo
    de comprobante corresponde emitir -- relevante para cuando se
    integre facturación electrónica, no usado todavía en ningún
    cálculo. Compartido entre Customer y Tenant (la empresa dueña de la
    cuenta también tiene su propia situación fiscal) -- vive en
    app/shared para que ninguno de los dos módulos tenga que importar
    del otro.
    """

    RESPONSABLE_INSCRIPTO = "RESPONSABLE_INSCRIPTO"
    MONOTRIBUTO = "MONOTRIBUTO"
    EXENTO = "EXENTO"
