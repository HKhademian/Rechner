const formatterCache = new Map<string, Intl.NumberFormat>();

function getEurFormatter(minimumFractionDigits: number, maximumFractionDigits: number): Intl.NumberFormat {
  const key = `${minimumFractionDigits}:${maximumFractionDigits}`;
  const cached = formatterCache.get(key);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits,
    maximumFractionDigits,
  });
  formatterCache.set(key, formatter);
  return formatter;
}

/** Format a numeric Euro amount using German locale conventions. */
export function formatEur(amount: number, maximumFractionDigits = 0): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return getEurFormatter(0, maximumFractionDigits).format(safe);
}

/** Format a Euro amount with two fixed decimal places for exact withholding and cent values. */
export function formatEurCents(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return getEurFormatter(2, 2).format(safe);
}

/** Format integer cents exactly, including at the safe-integer boundary. */
export function formatIntegerEuroCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new TypeError("Expected safe integer cents.");
  }
  const value = BigInt(cents);
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? "-" : ""}${new Intl.NumberFormat("de-DE").format(absolute / 100n)},${String(absolute % 100n).padStart(2, "0")}\u00a0€`;
}

/** Format an optional Euro amount or display a consistent unavailable fallback. */
export function formatEurOrUnavailable(
  amount: number | undefined,
  maximumFractionDigits = 2,
  fallback = "Unavailable",
): string {
  if (amount === undefined || !Number.isFinite(amount)) {
    return fallback;
  }
  return maximumFractionDigits === 2 ? formatEurCents(amount) : formatEur(amount, maximumFractionDigits);
}

/** Format a signed Euro delta with an optional percentage change against a baseline. */
export function formatSignedEurDelta(
  delta: number,
  baseline?: number,
  maximumFractionDigits = 0,
): string {
  const safeDelta = Number.isFinite(delta) ? delta : 0;
  const rounded = maximumFractionDigits === 0 ? Math.round(safeDelta) : Math.round(safeDelta * 100) / 100;
  if (rounded === 0) {
    return "No difference";
  }
  const prefix = rounded > 0 ? "+" : "";
  const formattedAmount = `${prefix}${formatEur(safeDelta, maximumFractionDigits)}`;
  if (baseline === undefined || !Number.isFinite(baseline) || baseline <= 0) {
    return formattedAmount;
  }
  const pct = ((safeDelta / baseline) * 100).toFixed(1);
  return `${formattedAmount} (${prefix}${pct}%)`;
}
