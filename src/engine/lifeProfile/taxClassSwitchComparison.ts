import {
  type EuroCents,
  type TaxFactor,
  TaxClass,
  toChildrenCount,
  toEuroCents,
  toFullCalendarYear,
  toGrossSalary,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  toSourceUrl,
} from "#engine/config/benefitRules";
import {
  type CalculationExplanation,
  ExplanationFormulaKind,
  ExplanationStatus,
  toFormulaVersion,
} from "#engine/lifeProfile/calculationExplanation";
import {
  type LifeDate,
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  JurisdictionCode,
  RuleResolutionStatus,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  TaxClassCombination,
} from "#engine/lifeProfile/taxSwitchEvent";
import {
  computeGrossToNetBreakdown,
  computeTaxFactor,
} from "#engine/tax/wageTax";
import {
  computeJointTaxLiability,
} from "#engine/tax/jointAssessment";
import {
  annualWithholdingTaxBase,
  payrollInputs,
} from "#engine/tax/payroll";
import {
  DEFAULT_TAX_RULES,
  VERIFIED_TAX_YEARS,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

export interface TaxClassSwitchInput {
  readonly taxYear: number;
  readonly primaryMonthlyGrossEur: number;
  readonly secondaryMonthlyGrossEur: number;
  readonly childrenCount: number;
  readonly initialCombination: TaxClassCombination;
  readonly targetCombination: TaxClassCombination;
  /** 1-based calendar month when targetCombination takes effect (1 = full year in target, 13 = no switch). */
  readonly switchMonth: number;
  readonly jurisdiction: JurisdictionCode;
}

export interface MonthlyPayrollWithholdingView {
  readonly combination: TaxClassCombination;
  readonly primaryMonthlyNetCents: EuroCents;
  readonly secondaryMonthlyNetCents: EuroCents;
  readonly combinedMonthlyNetCents: EuroCents;
  readonly combinedMonthlyTaxWithheldCents: EuroCents;
  readonly factor?: number;
}

export interface SwitchDateWithholdingScenario {
  readonly label: string;
  readonly switchMonth: number;
  readonly monthsInInitial: number;
  readonly monthsInTarget: number;
  readonly annualCombinedNetCents: EuroCents;
  readonly annualCombinedTaxWithheldCents: EuroCents;
  /** Positive = estimated refund (Erstattung); negative = estimated back-payment (Nachzahlung). */
  readonly estimatedYearEndSettlementCents: EuroCents;
}

export interface FinalAnnualJointTaxView {
  readonly primaryAnnualTaxableBaseCents: EuroCents;
  readonly secondaryAnnualTaxableBaseCents: EuroCents;
  readonly annualJointIncomeTaxCents: EuroCents;
  readonly annualJointSolzCents: EuroCents;
  readonly totalFinalJointTaxCents: EuroCents;
  readonly mandatoryFilingRequired: boolean;
}

export interface TaxClassSwitchComparisonResult {
  readonly supported: boolean;
  readonly taxYear: number;
  readonly beforeSwitch?: MonthlyPayrollWithholdingView;
  readonly afterSwitch?: MonthlyPayrollWithholdingView;
  readonly selectedSwitchScenario?: SwitchDateWithholdingScenario;
  readonly switchDateComparisons: readonly SwitchDateWithholdingScenario[];
  readonly finalAnnualTax?: FinalAnnualJointTaxView;
  readonly explanation: CalculationExplanation;
}

export const TAX_SWITCH_FORMULA_VERSION = toFormulaVersion("de-estg-38b-39f-26b-v1");
const ESTG_38B_SOURCE = toSourceUrl("https://www.gesetze-im-internet.de/estg/__38b.html");

function eurToCents(amount: number): EuroCents {
  return toEuroCents(Math.round(amount * 100));
}

function resolveClasses(combination: TaxClassCombination): {
  readonly primary: TaxClass;
  readonly secondary: TaxClass;
  readonly usesFactor: boolean;
} {
  if (combination === TaxClassCombination.III_V) {
    return { primary: TaxClass.III,
      secondary: TaxClass.V,
      usesFactor: false };
  }
  if (combination === TaxClassCombination.V_III) {
    return { primary: TaxClass.V,
      secondary: TaxClass.III,
      usesFactor: false };
  }
  if (combination === TaxClassCombination.IV_IV_Factor) {
    return { primary: TaxClass.IV,
      secondary: TaxClass.IV,
      usesFactor: true };
  }
  return { primary: TaxClass.IV,
    secondary: TaxClass.IV,
    usesFactor: false };
}

function evaluateMonthlyWithholding(
  primaryGrossEur: number,
  secondaryGrossEur: number,
  childrenCount: number,
  combination: TaxClassCombination,
  rules = DEFAULT_TAX_RULES,
): MonthlyPayrollWithholdingView {
  const { primary, secondary, usesFactor } = resolveClasses(combination);
  const pGross = toGrossSalary(primaryGrossEur);
  const sGross = toGrossSalary(secondaryGrossEur);

  let taxFactor: TaxFactor | undefined;
  if (usesFactor) {
    taxFactor = computeTaxFactor(pGross, sGross, childrenCount, rules);
  }

  const primaryBreakdown = computeGrossToNetBreakdown(pGross, primary, childrenCount, undefined, taxFactor, rules);
  const secondaryBreakdown = computeGrossToNetBreakdown(sGross, secondary, childrenCount, undefined, taxFactor, rules);

  const primaryTax = primaryBreakdown.monthlyWageTax + primaryBreakdown.monthlySolidaritySurcharge;
  const secondaryTax = secondaryBreakdown.monthlyWageTax + secondaryBreakdown.monthlySolidaritySurcharge;

  return Object.freeze({
    combination,
    primaryMonthlyNetCents: eurToCents(primaryBreakdown.monthlyNetTakeHome),
    secondaryMonthlyNetCents: eurToCents(secondaryBreakdown.monthlyNetTakeHome),
    combinedMonthlyNetCents: eurToCents(primaryBreakdown.monthlyNetTakeHome + secondaryBreakdown.monthlyNetTakeHome),
    combinedMonthlyTaxWithheldCents: eurToCents(primaryTax + secondaryTax),
    ...(taxFactor !== undefined ? { factor: Number(taxFactor) } : {}),
  });
}

function buildSwitchScenario(
  label: string,
  switchMonth: number,
  initialView: MonthlyPayrollWithholdingView,
  targetView: MonthlyPayrollWithholdingView,
  totalFinalJointTaxCents: EuroCents,
): SwitchDateWithholdingScenario {
  const monthsInInitial = Math.max(0, Math.min(12, switchMonth - 1));
  const monthsInTarget = 12 - monthsInInitial;
  const annualCombinedNetCents = toEuroCents(
    (initialView.combinedMonthlyNetCents * monthsInInitial) + (targetView.combinedMonthlyNetCents * monthsInTarget),
  );
  const annualCombinedTaxWithheldCents = toEuroCents(
    (initialView.combinedMonthlyTaxWithheldCents * monthsInInitial)
    + (targetView.combinedMonthlyTaxWithheldCents * monthsInTarget),
  );
  const estimatedYearEndSettlementCents = toEuroCents(annualCombinedTaxWithheldCents - totalFinalJointTaxCents);

  return Object.freeze({
    label,
    switchMonth,
    monthsInInitial,
    monthsInTarget,
    annualCombinedNetCents,
    annualCombinedTaxWithheldCents,
    estimatedYearEndSettlementCents,
  });
}

/**
 * Compares German spousal tax class switch dates and household combinations, keeping
 * monthly payroll withholding strictly separate from final annual joint tax assessment.
 */
export function compareTaxClassSwitches(input: TaxClassSwitchInput): TaxClassSwitchComparisonResult {
  const yearSupported = (VERIFIED_TAX_YEARS as readonly number[]).includes(input.taxYear);
  const effectiveDate: LifeDate = toLifeDate(`${String(Math.max(2000, Math.min(2099, input.taxYear))).padStart(4, "0")}-01-01`);

  if (input.jurisdiction !== JurisdictionCode.GermanyFederal || !yearSupported) {
    return Object.freeze({
      supported: false,
      taxYear: input.taxYear,
      switchDateComparisons: Object.freeze([]),
      explanation: Object.freeze({
        kind: ExplanationFormulaKind.Statutory,
        status: ExplanationStatus.Unsupported,
        formulaName: "German Tax Class Switch Comparison",
        formulaExpression: "monthly withholding (§ 38b/§ 39b/§ 39f EStG) vs. annual joint tax (§ 26b/§ 32a EStG)",
        formulaVersion: TAX_SWITCH_FORMULA_VERSION,
        jurisdiction: input.jurisdiction,
        effectiveDate,
        unsupportedReason: input.jurisdiction !== JurisdictionCode.GermanyFederal
          ? `Tax class switching is only supported for Germany (DE), not ${input.jurisdiction}.`
          : `Verified German tax tables are not available for year ${input.taxYear}.`,
        inputs: Object.freeze([
          { label: "Tax year",
            value: String(input.taxYear),
            source: "User selection" },
        ]),
        parameters: Object.freeze([]),
        lawIds: Object.freeze([LawId.EStG_38b, LawId.EStG_26b]),
        topicIds: Object.freeze(["tax-class", "joint-assessment"]),
        assumptions: Object.freeze([
          "Only verified German EStG calendar years are supported without projection.",
        ]),
      }),
    });
  }

  const rules = createTaxRules(toFullCalendarYear(input.taxYear));
  const clampedSwitch = Math.max(1, Math.min(13, Math.round(input.switchMonth)));

  const beforeSwitch = evaluateMonthlyWithholding(
    input.primaryMonthlyGrossEur,
    input.secondaryMonthlyGrossEur,
    input.childrenCount,
    input.initialCombination,
    rules,
  );
  const afterSwitch = evaluateMonthlyWithholding(
    input.primaryMonthlyGrossEur,
    input.secondaryMonthlyGrossEur,
    input.childrenCount,
    input.targetCombination,
    rules,
  );

  // Compute annual joint assessed tax (invariant to tax class choice!)
  const children = toChildrenCount(input.childrenCount);
  const primaryTaxBase = annualWithholdingTaxBase(
    payrollInputs(toGrossSalary(input.primaryMonthlyGrossEur), TaxClass.IV, children, rules, {}),
    rules,
  );
  const secondaryTaxBase = annualWithholdingTaxBase(
    payrollInputs(toGrossSalary(input.secondaryMonthlyGrossEur), TaxClass.IV, children, rules, {}),
    rules,
  );
  const jointLiability = computeJointTaxLiability(primaryTaxBase, secondaryTaxBase, rules);
  const totalFinalJointTaxCents = eurToCents(jointLiability.totalTaxLiability);

  const usesMandatoryFilingClass = [input.initialCombination, input.targetCombination].some((combo) =>
    combo === TaxClassCombination.III_V
    || combo === TaxClassCombination.V_III
    || combo === TaxClassCombination.IV_IV_Factor);

  const finalAnnualTax: FinalAnnualJointTaxView = Object.freeze({
    primaryAnnualTaxableBaseCents: eurToCents(primaryTaxBase),
    secondaryAnnualTaxableBaseCents: eurToCents(secondaryTaxBase),
    annualJointIncomeTaxCents: eurToCents(jointLiability.jointTax),
    annualJointSolzCents: eurToCents(jointLiability.jointSolidaritySurcharge),
    totalFinalJointTaxCents,
    mandatoryFilingRequired: usesMandatoryFilingClass,
  });

  const selectedSwitchScenario = buildSwitchScenario(
    clampedSwitch === 13
      ? `No switch (all year ${input.initialCombination})`
      : `Switch to ${input.targetCombination} from month ${clampedSwitch}`,
    clampedSwitch,
    beforeSwitch,
    afterSwitch,
    totalFinalJointTaxCents,
  );

  const switchDateComparisons: readonly SwitchDateWithholdingScenario[] = Object.freeze([
    buildSwitchScenario(`Full year ${input.targetCombination} (Jan)`, 1, beforeSwitch, afterSwitch, totalFinalJointTaxCents),
    buildSwitchScenario("Switch in April (month 4)", 4, beforeSwitch, afterSwitch, totalFinalJointTaxCents),
    buildSwitchScenario("Switch in July (month 7)", 7, beforeSwitch, afterSwitch, totalFinalJointTaxCents),
    buildSwitchScenario("Switch in October (month 10)", 10, beforeSwitch, afterSwitch, totalFinalJointTaxCents),
    buildSwitchScenario(`Keep ${input.initialCombination} all year`, 13, beforeSwitch, afterSwitch, totalFinalJointTaxCents),
  ]);

  const explanation: CalculationExplanation = Object.freeze({
    kind: ExplanationFormulaKind.Statutory,
    status: ExplanationStatus.Supported,
    formulaName: "Payroll Withholding vs. Final Joint Tax Assessment",
    formulaExpression: "yearEndSettlement = Σ(monthly Lohnsteuer + Solz withheld) − finalJointTax(§ 26b/§ 32a EStG)",
    formulaVersion: TAX_SWITCH_FORMULA_VERSION,
    jurisdiction: JurisdictionCode.GermanyFederal,
    effectiveDate,
    inputs: Object.freeze([
      {
        label: "Primary monthly gross",
        value: formatIntegerEuroCents(eurToCents(input.primaryMonthlyGrossEur)),
        source: "Household scenario input",
      },
      {
        label: "Secondary monthly gross",
        value: formatIntegerEuroCents(eurToCents(input.secondaryMonthlyGrossEur)),
        source: "Household scenario input",
      },
      {
        label: "Switch transition",
        value: `${input.initialCombination} → ${input.targetCombination} (month ${clampedSwitch})`,
        source: "User selection",
      },
    ]),
    parameters: Object.freeze([
      Object.freeze({
        label: `German BMF PAP & EStG tariff (${input.taxYear})`,
        value: `Basic allowance ${rules.parameters.basicAllowance.value} €`,
        jurisdiction: JurisdictionCode.GermanyFederal,
        effectiveFrom: toLifeDate(`${input.taxYear}-01-01`),
        effectiveTo: toLifeDate(`${input.taxYear}-12-31`),
        status: RuleResolutionStatus.Current,
        sourceUrl: ESTG_38B_SOURCE,
        lawIds: Object.freeze([LawId.EStG_38b, LawId.EStG_39b, LawId.EStG_39f, LawId.EStG_26b, LawId.EStG_32a]),
      }),
    ]),
    lawIds: Object.freeze([LawId.EStG_38b, LawId.EStG_39b, LawId.EStG_39f, LawId.EStG_26b, LawId.EStG_32a]),
    topicIds: Object.freeze(["tax-class", "joint-assessment"]),
    assumptions: Object.freeze([
      "Tax class choice alters monthly payroll withholding (Lohnsteuerabzug) only; annual joint income tax (Zusammenveranlagung) depends on combined taxable income.",
      "Standard statutory public health/pension/care/unemployment insurance and zero church tax are assumed unless otherwise modeled in Net Pay.",
      "III/V and IV/IV-factor combinations trigger mandatory annual income tax filing (§ 46 Abs. 2 Nr. 3a EStG).",
      "Does not model wage-replacement progression (Progressionsvorbehalt, e.g. Elterngeld) or itemized deductions.",
    ]),
  });

  return Object.freeze({
    supported: true,
    taxYear: input.taxYear,
    beforeSwitch,
    afterSwitch,
    selectedSwitchScenario,
    switchDateComparisons,
    finalAnnualTax,
    explanation,
  });
}
