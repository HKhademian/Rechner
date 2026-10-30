import {
  type GrossSalary,
  type EuroAmount,
  toEuroAmount,
} from "#engine/types";
import {
  type TaxRules,
} from "#engine/tax/taxRules";

/** Actual annual employment receipts and employee contributions, including one-off wages. */
export interface AnnualEmploymentIncome {
  readonly gross: GrossSalary;
  readonly health: EuroAmount;
  readonly care: EuroAmount;
  readonly pension: EuroAmount;
  readonly unemployment: EuroAmount;
}

/** Joint taxable employment income for ordinary employer-insured spouses, before child allowances.
 * Deduct actual contributions, rather than PAP's wage-withholding Vorsorgepauschale.
 * EStG §§9a, 10(1), 10(3)-(4), 10c; additional actual expenses are outside this bounded model.
 */
export function computeAnnualEmploymentTaxBase(
  husband: AnnualEmploymentIncome,
  wife: AnnualEmploymentIncome,
  rules: TaxRules,
) {
  for (const income of [husband, wife]) {
    if (Object.values(income).some((amount) => !Number.isFinite(amount) || amount < 0)) {
      throw new TypeError("Annual wages and employee contributions must be non-negative finite amounts.");
    }
  }
  const p = rules.parameters;
  const husbandWorkExpenses = toEuroAmount(Math.min(husband.gross, p.workExpenseAllowance.value));
  const wifeWorkExpenses = toEuroAmount(Math.min(wife.gross, p.workExpenseAllowance.value));
  const health = toEuroAmount(husband.health + wife.health);
  const care = toEuroAmount(husband.care + wife.care);
  const pensionDeduction = toEuroAmount((husband.pension + wife.pension) * p.pensionDeductibleFraction.value);
  const protectedInsurance = toEuroAmount(health * p.healthDeductibleFraction.value + care);
  // Joint assessment pools both limits. Basic health/care remains fully deductible;
  // the sickness-pay share of health and unemployment insurance use only remaining capacity.
  const insuranceDeduction = toEuroAmount(Math.max(
    protectedInsurance,
    Math.min(health + care + husband.unemployment + wife.unemployment, 2 * p.otherInsuranceDeductionLimit.value),
  ));
  const specialExpenses = toEuroAmount(2 * p.specialExpenseAllowance.value);
  const gross = toEuroAmount(husband.gross + wife.gross);
  const taxableIncome = toEuroAmount(Math.max(0, gross - husbandWorkExpenses - wifeWorkExpenses -
    pensionDeduction - insuranceDeduction - specialExpenses));
  // Preserve each partner's contribution before the deductions pooled by joint assessment.
  const incomeByPartner = Object.freeze({
    husband: Object.freeze({ gross: husband.gross,
      workExpenses: husbandWorkExpenses,
      employmentIncome: toEuroAmount(husband.gross - husbandWorkExpenses) }),
    wife: Object.freeze({ gross: wife.gross,
      workExpenses: wifeWorkExpenses,
      employmentIncome: toEuroAmount(wife.gross - wifeWorkExpenses) }),
  });
  return Object.freeze({ gross,
    incomeByPartner,
    husbandWorkExpenses,
    wifeWorkExpenses,
    husbandUnusedWorkAllowance: toEuroAmount(p.workExpenseAllowance.value - husbandWorkExpenses),
    wifeUnusedWorkAllowance: toEuroAmount(p.workExpenseAllowance.value - wifeWorkExpenses),
    pensionDeduction,
    protectedInsurance,
    insuranceDeduction,
    specialExpenses,
    taxableIncome });
}
