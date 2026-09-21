export function formatMoney(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("es-CO")} ${currencyCode}`;
  }
}

export function formatMoneyCompact(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currencyCode,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return formatMoney(amount, currencyCode);
  }
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

const MONTHS_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export function monthLabel(month: number): string {
  return MONTHS_ES[month - 1] ?? String(month);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
