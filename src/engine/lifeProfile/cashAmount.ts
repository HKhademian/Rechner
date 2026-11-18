import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";

export function parseAmount(value: string, allowNegative: boolean): EuroCents | undefined {
  if (value.trim() === "") {
    return undefined;
  }
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) {
    throw new TypeError("Enter an amount with at most two decimal places.");
  }
  if (!allowNegative && match[1]) {
    throw new TypeError("Income and expenses must be non-negative.");
  }
  const cents = (BigInt(match[2]) * 100n + BigInt((match[3] ?? "").padEnd(2, "0"))) * (match[1] ? -1n : 1n);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new TypeError("Amount is outside the supported range.");
  }
  return toEuroCents(Number(cents));
}

export function amountText(cents: EuroCents): string {
  const value = BigInt(cents);
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}
