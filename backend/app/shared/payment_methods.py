"""Labels en español para los valores de payment_method usados en Sale
y CustomerPayment. El valor guardado en la DB es un slug estable en
inglés (no se traduce ahí para no romper los chequeos existentes como
CASH_PAYMENT_METHOD/ACCOUNT_PAYMENT_METHOD en treasury/services.py) --
esto solo mapea a texto legible para mostrar/imprimir.
"""

PAYMENT_METHOD_LABELS: dict[str, str] = {
    "cash": "Efectivo",
    "card_debit": "Tarjeta de débito",
    "card_credit": "Tarjeta de crédito",
    "transfer": "Transferencia",
    "account": "Cuenta corriente",
}


def payment_method_label(payment_method: str) -> str:
    return PAYMENT_METHOD_LABELS.get(payment_method, payment_method)


def is_card_payment(payment_method: str) -> bool:
    return payment_method in ("card_debit", "card_credit")
