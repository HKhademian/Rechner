import {
  type Brand,
  type EuroAmount,
  toEuroAmount,
} from "#engine/types";
import {
  type TaxRules,
} from "#engine/tax/taxRules";
import {
  computeAnnualIncomeTax,
} from "#engine/tax/wageTax";

/** A fractional special rate keeps the precision selected by the tax profile. */
export type ProgressionTaxRate = Brand<number, "ProgressionTaxRate">;

export function toProgressionTaxRate(value: number): ProgressionTaxRate {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError("A progression tax rate must be a finite fraction from zero to one.");
  }
  return value as ProgressionTaxRate;
}

/** Joint splitting tax with positive progression income, EStG §§32a(5), 32b.
 * The special percentage rate is truncated to the configured precision; final tax is floored.
 * https://www.gesetze-im-internet.de/estg/__32b.html
 */
export function computeJointProgressionTax(
  taxableIncome: EuroAmount,
  progressionIncome: EuroAmount,
  rules: TaxRules,
) {
  if (![taxableIncome, progressionIncome].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new TypeError("This progression model requires non-negative taxable income and benefits.");
  }
  const taxable = Math.floor(taxableIncome);
  const rateIncome = Math.floor(taxable + progressionIncome);
  const hypotheticalTax = toEuroAmount(2 * computeAnnualIncomeTax(rateIncome / 2, rules));
  if (progressionIncome === 0 || rateIncome === 0) {
    return Object.freeze({ incomeTax: hypotheticalTax,
      rateIncome: toEuroAmount(rateIncome),
      hypotheticalTax,
      specialRate: undefined });
  }
  // Two additional decimal places convert percentage precision into fractional-rate precision.
  // Integer arithmetic prevents a binary representation from truncating an exact boundary twice.
  const scale = 10 ** (rules.parameters.progressionRatePercentDecimalPlaces.value + 2);
  const rateUnits = BigInt(hypotheticalTax) * BigInt(scale) / BigInt(rateIncome);
  const incomeTax = toEuroAmount(Number(rateUnits * BigInt(taxable) / BigInt(scale)));
  return Object.freeze({ incomeTax,
    rateIncome: toEuroAmount(rateIncome),
    hypotheticalTax,
    specialRate: toProgressionTaxRate(Number(rateUnits) / scale) });
}
