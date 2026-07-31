"""Resolución de precio mayorista, compartida entre Sale y Quote --
misma regla en los dos lugares: el tipo de cliente decide si
corresponde, cada producto decide si tiene un precio mayorista cargado."""

from typing import Protocol


class _CustomerTypeLike(Protocol):
    is_wholesale: bool


class _CustomerLike(Protocol):
    customer_type: "_CustomerTypeLike | None"


class _ProductLike(Protocol):
    price: float
    wholesale_price: float | None


def is_wholesale_customer(customer: _CustomerLike) -> bool:
    return customer.customer_type is not None and customer.customer_type.is_wholesale


def resolve_unit_price(customer: _CustomerLike, product: _ProductLike) -> float:
    if is_wholesale_customer(customer) and product.wholesale_price is not None:
        return float(product.wholesale_price)
    return float(product.price)
