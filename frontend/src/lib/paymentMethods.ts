// Labels en español para los valores de payment_method. El valor
// guardado en la DB es un slug estable en inglés (no se traduce ahí
// para no romper la lógica de caja/cuenta corriente en el backend que
// compara contra "cash"/"account" literal) -- esto solo mapea a texto
// legible para mostrar en la UI. Espeja backend/app/shared/payment_methods.py.

export const PAYMENT_METHODS = ["cash", "card_debit", "card_credit", "transfer", "account"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card_debit: "Tarjeta de débito",
  card_credit: "Tarjeta de crédito",
  transfer: "Transferencia",
  account: "Cuenta corriente",
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function isCardPayment(method: string): boolean {
  return method === "card_debit" || method === "card_credit";
}
