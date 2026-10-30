import {
  type FullCalendarYear,
  type GrossSalary,
  type TaxClass,
  type TaxFactor,
  type NetSalary,
  type MonthDuration,
  TaxClass as Classes,
  toFullCalendarYear,
  toGrossSalary,
  toNetSalary,
  toEuroAmount,
  toChildrenCount,
  toPercentageRate,
  toTaxFactor,
} from "#engine/types";
import {
  type ChildAllowanceFactor,
  toChildAllowanceFactor,
  payrollInputs,
  calculatePayrollWithholding,
} from "#engine/tax/payroll";
import {
  type TaxRules,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  getEmploymentThresholds,
} from "#engine/tax/employmentThresholds";
import {
  type BenefitRules,
  DEFAULT_BENEFIT_RULES,
} from "#engine/config/benefitRules";
import {
  type AssessmentHistoryMonth,
  predominantCharacteristic,
} from "#engine/benefits/assessmentHistory";

export interface BenefitDeductionCharacteristics {
  readonly taxClass: TaxClass;
  readonly factor: TaxFactor;
  readonly childFactor: ChildAllowanceFactor;
  readonly churchTaxable: boolean;
}

/** § 2c(3) selects each deduction characteristic independently, with the latest evidence winning a tie. */
export function lockBenefitDeductionCharacteristics(records: readonly AssessmentHistoryMonth[]): BenefitDeductionCharacteristics {
  const taxClass = predominantCharacteristic(records, (record) => record.taxClass, Classes.IV);
  const childFactor = predominantCharacteristic(records, (record) => record.personal.childAllowanceFactor ??
    toChildAllowanceFactor(record.taxClass === Classes.V || record.taxClass === Classes.VI ? 0
      : record.children / (record.taxClass === Classes.III || record.taxClass === Classes.IV ? 1 : 2)), toChildAllowanceFactor(0));
  return Object.freeze({ taxClass: taxClass === Classes.VI ? Classes.IV : taxClass,
    factor: predominantCharacteristic(records, (record) => record.factor ?? toTaxFactor(1), toTaxFactor(1)),
    childFactor,
    churchTaxable: predominantCharacteristic(records, (record) => (record.personal.churchTaxRate ?? 0) > 0, false) });
}

/** The latest payroll revision is not automatically the January snapshot required by § 2e(1). */
export function selectBenefitTaxRules(birthYear: FullCalendarYear): { rules?: TaxRules;
  reason?: string } {
  const year = toFullCalendarYear(birthYear - 1);
  let rules: TaxRules;
  try {
    rules = createTaxRules(year);
  }
  catch {
    return { reason: `No verified January PAP snapshot is available for ${year}.` };
  }
  if (rules.papPublication.date > `${year}-01-01`) {
    return { reason: `The installed ${rules.sourceYear} PAP was published on ${rules.papPublication.date}; the January snapshot required for this birth is unavailable.` };
  }
  return { rules };
}

/** BEEG § 2f has its own contribution base and ignores ordinary contribution ceilings. */
export function computeBenefitContributionBase(
  gross: GrossSalary,
  incomeYear: FullCalendarYear,
  benefits: BenefitRules = DEFAULT_BENEFIT_RULES,
): GrossSalary {
  const thresholds = getEmploymentThresholds(incomeYear);
  const lower = thresholds.marginal.value;
  const upper = thresholds.transition.value;
  if (gross <= lower) {
    return toGrossSalary(0);
  }
  if (gross > upper) {
    return gross;
  }
  const rates = benefits.standardHealthCareDeduction.value + benefits.standardPensionDeduction.value + benefits.standardUnemploymentDeduction.value;
  if (rates === 0) {
    return gross;
  }
  // Official BEEG guidelines § 2f.2.3: double employee flat rates, then round F to four decimals.
  const factor = Math.round(benefits.transitionFlatRate.value / (rates * 2) * 10000) / 10000;
  return toGrossSalary(factor * lower + (upper / (upper - lower) - lower / (upper - lower) * factor) * (gross - lower));
}

export interface StandardizedBenefitNet {
  readonly net?: NetSalary;
  readonly reason?: string;
  readonly taxRules?: TaxRules;
  readonly assumptions: readonly string[];
}

/** Standard taxable employment with mandatory public health/pension/unemployment insurance. */
export function computeStandardizedBenefitNet(
  averageRegularGross: GrossSalary,
  socialAssessmentBase: GrossSalary,
  characteristics: BenefitDeductionCharacteristics,
  birthYear: FullCalendarYear,
  benefits: BenefitRules = DEFAULT_BENEFIT_RULES,
  employmentMonthsInAssessment: MonthDuration = benefits.assessmentMonths.value,
): StandardizedBenefitNet {
  if (!Number.isInteger(employmentMonthsInAssessment) || employmentMonthsInAssessment < 0 ||
    employmentMonthsInAssessment > benefits.assessmentMonths.value ||
    (averageRegularGross > 0 && employmentMonthsInAssessment === 0)) {
    throw new TypeError("Employment months must fit the income assessment window.");
  }
  if (averageRegularGross === 0) {
    return { net: toNetSalary(0),
      assumptions: [] };
  }
  const selection = selectBenefitTaxRules(birthYear);
  const rules = selection.rules;
  if (!rules) {
    return { reason: selection.reason,
      assumptions: [] };
  }
  const inputs = payrollInputs(
    averageRegularGross,
    characteristics.taxClass,
    toChildrenCount(0),
    rules,
    { isParent: true,
      childrenUnder25: toChildrenCount(0),
      childAllowanceFactor: characteristics.childFactor,
      churchTaxRate: toPercentageRate(characteristics.churchTaxable ? benefits.standardChurchTaxRate.value : 0) },
    characteristics.taxClass === Classes.IV ? characteristics.factor : undefined,
  );
  const withholding = calculatePayrollWithholding(inputs, rules);
  // Income-side expenses apply only in earning months; PAP still applies its own full tax allowance.
  const expense = toEuroAmount(rules.parameters.workExpenseAllowance.value / 12 *
    employmentMonthsInAssessment / benefits.assessmentMonths.value);
  const social = toEuroAmount(socialAssessmentBase * benefits.standardHealthCareDeduction.value) +
    toEuroAmount(socialAssessmentBase * benefits.standardPensionDeduction.value) +
    toEuroAmount(socialAssessmentBase * benefits.standardUnemploymentDeduction.value);
  const taxes = toEuroAmount(withholding.LSTLZZ / 100) + toEuroAmount(withholding.SOLZLZZ / 100) +
    toEuroAmount(withholding.BK / 100 * (characteristics.churchTaxable ? benefits.standardChurchTaxRate.value : 0));
  return { net: toNetSalary(Math.max(0, averageRegularGross - expense - social - taxes)),
    taxRules: rules,
    assumptions: ["BEEG deductions assume taxable ordinary employment and mandatory public health, pension and unemployment insurance.",
      ...(rules.projected ? [`The January ${rules.sourceYear} PAP is projected to the required ${rules.calendarYear} assessment year.`] : [])] };
}
