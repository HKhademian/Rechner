import {
  type EuroAmount,
  type PercentageRate,
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

const HANDOFF_KEY = "rechner:mortgage:handoff:v1";

type HandoffStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface MortgageHandoff {
  readonly principal: EuroAmount;
  readonly kfwPrincipal: EuroAmount;
  readonly propertyPrice: EuroAmount;
  readonly annualInterest: PercentageRate;
  readonly initialRepayment: PercentageRate;
}

/** Transfer inputs once within the same tab without putting financial values in a URL. */
export function writeMortgageHandoff(storage: HandoffStorage, input: MortgageHandoff): boolean {
  try {
    storage.setItem(HANDOFF_KEY, JSON.stringify(input));
    return true;
  }
  catch {
    return false;
  }
}

export function takeMortgageHandoff(storage: HandoffStorage): MortgageHandoff | null {
  try {
    const raw = storage.getItem(HANDOFF_KEY);
    storage.removeItem(HANDOFF_KEY);
    if (!raw) {
      return null;
    }
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || !("principal" in value) || !("kfwPrincipal" in value) || !("propertyPrice" in value) || !("annualInterest" in value) || !("initialRepayment" in value)
      || typeof value.principal !== "number" || !Number.isFinite(value.principal) || value.principal < 0 || value.principal > 20000000
      || typeof value.kfwPrincipal !== "number" || !Number.isFinite(value.kfwPrincipal) || value.kfwPrincipal < 0 || value.kfwPrincipal > 20000000
      || typeof value.propertyPrice !== "number" || !Number.isFinite(value.propertyPrice) || value.propertyPrice < 0 || value.propertyPrice > 20000000
      || typeof value.annualInterest !== "number" || !Number.isFinite(value.annualInterest) || value.annualInterest < 0 || value.annualInterest > 0.15
      || typeof value.initialRepayment !== "number" || !Number.isFinite(value.initialRepayment) || value.initialRepayment < 0 || value.initialRepayment > 0.2) {
      return null;
    }
    return {
      principal: toEuroAmount(value.principal),
      kfwPrincipal: toEuroAmount(value.kfwPrincipal),
      propertyPrice: toEuroAmount(value.propertyPrice),
      annualInterest: toPercentageRate(value.annualInterest),
      initialRepayment: toPercentageRate(value.initialRepayment),
    };
  }
  catch {
    return null;
  }
}
