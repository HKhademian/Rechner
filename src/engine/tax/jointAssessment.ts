import {
  computeJointProgressionTax,
} from "#engine/tax/progressionTax";
import {
  type TaxRules,
  DEFAULT_TAX_RULES,
  createTaxRules,
} from "#engine/tax/taxRules";
/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Spousal Joint Assessment Engine
 *
 * Implements spousal splitting tax liability (§ 26b, § 32a Abs. 5 EStG), monthly tax class swap
 * cash-net comparisons and statutory child allowance favorability checks
 * (Kinderfreibetrag Günstigerprüfung § 31, § 32 Abs. 6 EStG). Actual annual settlements use annualTaxSettlement.ts.
 */

import {
  type EuroAmount,
  type NetSalary,
  type CalendarMonth,
  type FullCalendarYear,
  type ChildIndex,
  type GuenstigerpruefungResult,
  toEuroAmount,
  toStatutoryCitation,
  toFullCalendarYear,
} from "#engine/types";
import {
  computeAnnualIncomeTax,
  computeSolidaritySurcharge,
} from "#engine/tax/wageTax";

/**
 * Calculates spousal joint tax liability under Ehegatten-Splitting (§ 26b, § 32a Abs. 5 EStG).
 * Joint Tax = 2 * Tarif((Husband ZvE + Wife ZvE) / 2).
 *
 * @param husbandAnnualZvE - Husband's annual taxable income (ZvE) in EUR.
 * @param wifeAnnualZvE - Wife's annual taxable income (ZvE) in EUR.
 * @returns Joint tax, solidarity surcharge, and total joint tax liability in EUR.
 */
export function computeJointTaxLiability(
  husbandAnnualZvE: number,
  wifeAnnualZvE: number,
  rules: TaxRules = DEFAULT_TAX_RULES,
): {
  readonly jointTax: EuroAmount;
  readonly jointSolidaritySurcharge: EuroAmount;
  readonly totalTaxLiability: EuroAmount;
} {
  const totalZvE = Math.max(0, husbandAnnualZvE + wifeAnnualZvE);
  const halfZvE = totalZvE / 2;

  // Splitting Tariff: 2 * Tarif(totalZvE / 2)
  const singleTaxOnHalf = computeAnnualIncomeTax(halfZvE, rules);
  const jointTax = toEuroAmount(singleTaxOnHalf * 2);

  const jointSolz = computeSolidaritySurcharge(jointTax, true, rules);
  const total = toEuroAmount(jointTax + jointSolz);

  return {
    jointTax,
    jointSolidaritySurcharge: jointSolz,
    totalTaxLiability: total,
  };
}

/**
 * Calculates the monthly temporary tax withholding variance during the proactive tax class swap phase (§ 38b EStG).
 * When husband swaps from Class III to V and wife swaps from Class V to III:
 * Monthly Deficit = (Husband Class III Net - Husband Class V Net) - (Wife Class III Net - Wife Class V Net).
 * This cash-net comparison does not establish an annual tax refund.
 *
 * @param husbandClass3Net - Husband's standard take-home net in Tax Class III.
 * @param husbandClass5Net - Husband's take-home net in swapped Tax Class V.
 * @param wifeClass3Net - Wife's take-home net in swapped Tax Class III.
 * @param wifeClass5Net - Wife's standard take-home net in Tax Class V.
 * @returns Monthly cash flow withholding deficit in EUR.
 */
export function computeMonthlySwapWithholdingVariance(
  husbandClass3Net: NetSalary,
  husbandClass5Net: NetSalary,
  wifeClass3Net: NetSalary,
  wifeClass5Net: NetSalary,
): EuroAmount {
  const husbandLoss = husbandClass3Net - husbandClass5Net;
  const wifeGain = wifeClass3Net - wifeClass5Net;
  const monthlyVariance = husbandLoss - wifeGain;
  return toEuroAmount(Math.max(0, monthlyVariance));
}

/**
 * Child Presence Record for Annual Calendar Year Tax Assessment.
 * Tracks birth year and month to determine full-year or prorated child tax allowance eligibility.
 */
export interface ChildYearPresence {
  /** Ordinal index of the child. */
  readonly childIndex: ChildIndex;
  /** 4-digit Gregorian calendar birth year (e.g. 2026). */
  readonly birthCalendarYear: FullCalendarYear;
  /** 1-based calendar birth month (1..12). */
  readonly birthCalendarMonth: CalendarMonth;
}

/**
 * Statutory Child Allowance Favorability Assessment (§ 31, § 32 Abs. 6 EStG Günstigerprüfung).
 * Compares income-tax relief from the year-specific Kinderfreibetrag + BEA
 * against total Kindergeld received (§ 66 EStG).
 * Any excess tax savings is added to the annual tax refund.
 *
 * @param jointAnnualZvE - Combined spousal annual taxable income (ZvE) in EUR.
 * @param children - Array of child presence records in the household.
 * @param reconciledYear - Calendar year being reconciled.
 * @param monthlyKindergeldPerChild - Monthly Kindergeld amount per child (defaults to the selected year profile).
 * @returns Complete `GuenstigerpruefungResult` structure.
 */
export function computeKinderfreibetragGuenstigerpruefung(
  jointAnnualZvE: number,
  children: readonly ChildYearPresence[],
  reconciledYear: number,
  monthlyKindergeldPerChild?: number,
  progressionIncome: EuroAmount = toEuroAmount(0),
): GuenstigerpruefungResult {
  const rules = createTaxRules(toFullCalendarYear(reconciledYear));
  const fullAllowance = rules.parameters.childAllowanceAnnual.value;
  const monthlyKindergeld = monthlyKindergeldPerChild ?? rules.parameters.childBenefitMonthly.value;

  let totalKinderfreibetrag = 0;
  let totalKindergeldReceived = 0;

  children.forEach((child) => {
    if (child.birthCalendarYear < reconciledYear) {
      // Child alive for the entire reconciled calendar year
      totalKinderfreibetrag += fullAllowance;
      totalKindergeldReceived += monthlyKindergeld * 12;
    }
    else if (child.birthCalendarYear === reconciledYear) {
      // Child born during the reconciled calendar year -> Prorated by months (§ 32 Abs. 6 Satz 5 EStG)
      const monthsAlive = Math.max(1, 12 - child.birthCalendarMonth + 1);
      const proratedAllowance = toEuroAmount(
        (monthsAlive / 12) * fullAllowance,
      );
      totalKinderfreibetrag += proratedAllowance;
      totalKindergeldReceived += monthlyKindergeld * monthsAlive;
    }
  });

  // 1. Joint tax liability WITHOUT Kinderfreibetrag
  const taxWithout = computeJointProgressionTax(toEuroAmount(Math.max(0, jointAnnualZvE)), progressionIncome, rules).incomeTax;

  // 2. Joint tax liability WITH Kinderfreibetrag (§ 32 Abs. 6 EStG)
  const reducedZvE = Math.max(0, jointAnnualZvE - totalKinderfreibetrag);
  const taxWith = computeJointProgressionTax(toEuroAmount(reducedZvE), progressionIncome, rules).incomeTax;

  // §31 compares income tax only. Solidarity relief is assessed independently.
  // 3. Tax Savings
  const taxSavings = Math.max(0, taxWithout - taxWith);

  // 4. Statutory Favorability Comparison (§ 31 Satz 4 EStG Günstigerprüfung)
  const isFavorable = taxSavings > totalKindergeldReceived;
  const extraTaxRefund = isFavorable
    ? Math.max(0, taxSavings - totalKindergeldReceived)
    : 0;

  return {
    jointAnnualZvE: toEuroAmount(jointAnnualZvE),
    totalKinderfreibetrag: toEuroAmount(totalKinderfreibetrag),
    jointTaxWithoutAllowance: toEuroAmount(taxWithout),
    jointTaxWithAllowance: toEuroAmount(taxWith),
    taxSavingsFromAllowance: toEuroAmount(taxSavings),
    totalKindergeldReceived: toEuroAmount(totalKindergeldReceived),
    extraTaxRefund: toEuroAmount(extraTaxRefund),
    isKinderfreibetragFavorable: isFavorable,
    statutoryCitation: toStatutoryCitation(
      "§ 31, § 32 Abs. 6 EStG (Familienleistungsausgleich Günstigerprüfung)",
    ),
  };
}
