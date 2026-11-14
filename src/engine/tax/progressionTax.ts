import {
  type ProgressionTaxRate,
  evaluateProgressionRateTaxFormula,
  toProgressionTaxRate,
} from "#engine/formulas/pure/incomeTaxFormulas";
import {
  type EuroAmount,
} from "#engine/types";
import {
  type TaxRules,
} from "#engine/tax/taxRules";
import {
  extractIncomeTaxTariffConstants,
} from "#engine/tax/wageTax";

export {
  type ProgressionTaxRate,
  toProgressionTaxRate,
};

/** Joint splitting tax with positive progression income, EStG §§32a(5), 32b.
 * The special percentage rate is truncated to the configured precision; final tax is floored.
 * https://www.gesetze-im-internet.de/estg/__32b.html
 */
export function computeJointProgressionTax(
  taxableIncome: EuroAmount,
  progressionIncome: EuroAmount,
  rules: TaxRules,
) {
  return evaluateProgressionRateTaxFormula({
    taxableIncome,
    progressionIncome,
    ratePrecisionDecimalPlaces: rules.parameters.progressionRatePercentDecimalPlaces.value,
    ...extractIncomeTaxTariffConstants(rules),
  });
}
