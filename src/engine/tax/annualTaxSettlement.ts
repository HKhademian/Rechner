import {
  type FullCalendarYear,
  type EuroAmount,
  toEuroAmount,
} from "#engine/types";
import {
  type TaxRules,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  type ChildYearPresence,
  computeKinderfreibetragGuenstigerpruefung,
} from "#engine/tax/jointAssessment";
import {
  computeSolidaritySurcharge,
} from "#engine/tax/wageTax";

/** Complete-year joint-assessment inputs for the supported non-church employment model. */
export interface AnnualTaxSettlementInput {
  readonly calendarYear: FullCalendarYear;
  readonly taxableIncome: EuroAmount;
  /** Positive replacement benefits after any unused employee work allowance. */
  readonly progressionIncome: EuroAmount;
  readonly withheldIncomeTax: EuroAmount;
  readonly withheldSolidarity: EuroAmount;
  readonly children: readonly ChildYearPresence[];
  /** Optional pre-resolved/overridden or future-indexed tax rules for this assessment year. */
  readonly taxRules?: TaxRules;
}

/** Reconcile credited actual withholding against modeled annual liability, including repayments.
 * Deductions and receipt completeness are established before calling this pure calculation.
 */
export function computeAnnualTaxSettlement(input: AnnualTaxSettlementInput) {
  for (const amount of [input.taxableIncome, input.progressionIncome, input.withheldIncomeTax, input.withheldSolidarity]) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new TypeError("Annual settlement inputs must be non-negative finite amounts.");
    }
  }
  const rules = input.taxRules ?? createTaxRules(input.calendarYear);
  const childComparison = computeKinderfreibetragGuenstigerpruefung(
    input.taxableIncome,
    input.children,
    input.calendarYear,
    undefined,
    input.progressionIncome,
    rules,
  );
  const incomeTaxLiability = toEuroAmount(childComparison.isKinderfreibetragFavorable
    ? childComparison.jointTaxWithAllowance + childComparison.totalKindergeldReceived
    : childComparison.jointTaxWithoutAllowance);
  // SolzG §3(2): child allowances apply to its basis even if Kindergeld is preferable.
  // The favorable-comparison Kindergeld addback is not part of that solidarity basis.
  const solidarityLiability = computeSolidaritySurcharge(childComparison.jointTaxWithAllowance, true, rules);
  // EStG §36(3) rounds each aggregate credit upward to euros. SolzG §1(2)
  // applies the EStG collection provisions correspondingly to the separate solidarity credit.
  const creditedIncomeTax = toEuroAmount(Math.ceil(input.withheldIncomeTax));
  const creditedSolidarity = toEuroAmount(Math.ceil(input.withheldSolidarity));
  const creditRoundingAdjustment = toEuroAmount(creditedIncomeTax + creditedSolidarity - input.withheldIncomeTax - input.withheldSolidarity);
  const totalLiability = toEuroAmount(incomeTaxLiability + solidarityLiability);
  const settlement = toEuroAmount(creditedIncomeTax + creditedSolidarity - totalLiability);
  return Object.freeze({ calendarYear: input.calendarYear,
    taxableIncome: input.taxableIncome,
    taxableIncomeForNonTaxLaw: toEuroAmount(Math.max(0, input.taxableIncome - childComparison.totalKinderfreibetrag)),
    progressionIncome: input.progressionIncome,
    withheldIncomeTax: input.withheldIncomeTax,
    withheldSolidarity: input.withheldSolidarity,
    creditedIncomeTax,
    creditedSolidarity,
    creditRoundingAdjustment,
    incomeTaxLiability,
    solidarityLiability,
    totalLiability,
    settlement,
    childComparison,
    taxRules: rules });
}
