import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";

/** Pure arithmetic in cents; inflows and expenses are supplied assumptions. */
export function closingCashBalance(opening: EuroCents, inflow: EuroCents, expense: EuroCents): EuroCents {
  if (![opening, inflow, expense].every(Number.isSafeInteger) || inflow < 0 || expense < 0) {
    throw new TypeError("Cash amounts must be safe integer cents; inflows and expenses cannot be negative.");
  }
  const closing = BigInt(opening) + BigInt(inflow) - BigInt(expense);
  if (closing > BigInt(Number.MAX_SAFE_INTEGER) || closing < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new TypeError("The closing cash balance exceeds the supported range.");
  }
  return toEuroCents(Number(closing));
}
