const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

const shortDateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" });

export function formatShortDate(isoDate: string): string {
  // new Date("2026-08-06") se interpreta en UTC medianoche -- en
  // huso horario negativo (AR) eso cae al día anterior local. Se
  // parsea a mano para que la fecha mostrada sea la misma que mandó
  // el backend, no un día antes.
  const [year, month, day] = isoDate.split("-").map(Number);
  return shortDateFormatter.format(new Date(year, month - 1, day));
}
