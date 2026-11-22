import {
  type EuroAmount,
  type FullCalendarYear,
  type HouseholdTaxableIncomeInput,
  type PercentageRate,
  type PreexistingConditions,
  type PregnancyAction,
  type SimulationResult,
  type TaxClassSwitchAction,
  toCalendarMonth,
  toEuroAmount,
  toFullCalendarYear,
  toNetSalary,
  toPercentageRate,
  toWorkingHours,
} from "#engine/types";
import {
  IncomeEligibilityStatus,
  assessCoupleBenefitIncome,
} from "#engine/benefits/incomeEligibility";
import {
  computeElterngeldBenefits,
} from "#engine/benefits/elterngeldPlus";
import {
  simMonthToCalendarDate,
} from "#engine/simulator/calendarNavigation";

export const PlanCapDiagnosticStatus = {
  Eligible: "ELIGIBLE",
  NearCap: "NEAR_CAP",
  OverCap: "OVER_CAP",
  UnknownZvE: "UNKNOWN_ZVE",
  NoBirths: "NO_BIRTHS",
} as const;
export type PlanCapDiagnosticStatus =
  (typeof PlanCapDiagnosticStatus)[keyof typeof PlanCapDiagnosticStatus];

export function toPlanCapDiagnosticStatus(value: string): PlanCapDiagnosticStatus {
  if (!Object.values(PlanCapDiagnosticStatus).includes(value as PlanCapDiagnosticStatus)) {
    throw new TypeError(`Unknown plan cap diagnostic status: ${value}`);
  }
  return value as PlanCapDiagnosticStatus;
}

export const TaxSwitchDiagnosticStatus = {
  OptimalLead: "OPTIMAL_LEAD",
  ShortLead: "SHORT_LEAD",
  OpportunityAvailable: "OPPORTUNITY_AVAILABLE",
  NotApplicable: "NOT_APPLICABLE",
} as const;
export type TaxSwitchDiagnosticStatus =
  (typeof TaxSwitchDiagnosticStatus)[keyof typeof TaxSwitchDiagnosticStatus];

export function toTaxSwitchDiagnosticStatus(value: string): TaxSwitchDiagnosticStatus {
  if (!Object.values(TaxSwitchDiagnosticStatus).includes(value as TaxSwitchDiagnosticStatus)) {
    throw new TypeError(`Unknown tax switch diagnostic status: ${value}`);
  }
  return value as TaxSwitchDiagnosticStatus;
}

export interface IncomeCapDiagnostic {
  readonly status: PlanCapDiagnosticStatus;
  readonly relevantIncomeYear?: FullCalendarYear;
  readonly statutoryCapEur?: EuroAmount;
  readonly recordedZveEur?: EuroAmount;
  readonly headroomEur?: EuroAmount;
  readonly headline: string;
  readonly detail: string;
}

export interface TaxSwitchDiagnostic {
  readonly status: TaxSwitchDiagnosticStatus;
  readonly cashFlowGainVsBaseline: EuroAmount;
  readonly hasActiveSwitches: boolean;
  readonly headline: string;
  readonly detail: string;
}

export interface AllowanceRateDiagnostic {
  readonly hasBirths: boolean;
  readonly estimatedBasisMonthly: EuroAmount;
  readonly estimatedPlusMonthly: EuroAmount;
  readonly replacementRate: PercentageRate;
  readonly headline: string;
  readonly detail: string;
}

export interface ParentalPlanDiagnostics {
  readonly incomeCap: IncomeCapDiagnostic;
  readonly taxSwitch: TaxSwitchDiagnostic;
  readonly allowanceRate: AllowanceRateDiagnostic;
  readonly advisories: readonly string[];
}

export interface ParentalPlanDiagnosticsInputs {
  readonly preexisting: PreexistingConditions;
  readonly pregnancies: readonly PregnancyAction[];
  readonly taxClassSwitches: readonly TaxClassSwitchAction[];
  readonly householdTaxableIncome: readonly HouseholdTaxableIncomeInput[];
  readonly scenarioC: SimulationResult;
  readonly scenarioB: SimulationResult;
}

const NEAR_CAP_HEADROOM_RATIO = 0.1;

function resolvePriorYearZve(
  relevantYear: FullCalendarYear,
  explicitInputs: readonly HouseholdTaxableIncomeInput[],
  scenarioC: SimulationResult,
): EuroAmount | undefined {
  const explicit = explicitInputs.find((item) => item.calendarYear === relevantYear);
  if (explicit) {
    return explicit.taxableIncome;
  }
  const modeled = scenarioC.annualTaxRecords?.find(
    (record) => record.calendarYear === relevantYear && record.incomeAvailable,
  );
  return modeled?.taxBase?.taxableIncome;
}

function evaluateIncomeCapDiagnostic(
  inputs: ParentalPlanDiagnosticsInputs,
): IncomeCapDiagnostic {
  if (inputs.pregnancies.length === 0) {
    return Object.freeze({
      status: PlanCapDiagnosticStatus.NoBirths,
      headline: "No planned births",
      detail: "Add a child in Section 2 to evaluate the § 1 Abs. 8 BEEG household income cap.",
    });
  }

  const firstBirth = [...inputs.pregnancies].sort(
    (a, b) => a.calculatedDeliverySimulationMonth - b.calculatedDeliverySimulationMonth,
  )[0];
  const birthDate = simMonthToCalendarDate(
    firstBirth.calculatedDeliverySimulationMonth,
    inputs.preexisting.startCalendarYear,
    inputs.preexisting.startCalendarMonth,
  );
  const baseLimit = assessCoupleBenefitIncome(
    birthDate.calendarYear,
    toCalendarMonth(birthDate.calendarMonth),
  );
  const recordedZve = resolvePriorYearZve(
    baseLimit.relevantIncomeYear,
    inputs.householdTaxableIncome,
    inputs.scenarioC,
  );

  if (recordedZve === undefined) {
    return Object.freeze({
      status: PlanCapDiagnosticStatus.UnknownZvE,
      relevantIncomeYear: baseLimit.relevantIncomeYear,
      statutoryCapEur: baseLimit.maximum,
      headline: `Cap €${Math.round(baseLimit.maximum).toLocaleString("en-US")} (${baseLimit.relevantIncomeYear} zvE needed)`,
      detail: `Enter prior-year couple taxable income (${baseLimit.relevantIncomeYear}) to verify § 1 Abs. 8 BEEG eligibility.`,
    });
  }

  const assessment = assessCoupleBenefitIncome(
    birthDate.calendarYear,
    toCalendarMonth(birthDate.calendarMonth),
    recordedZve,
  );
  const headroom = toEuroAmount(Math.max(0, assessment.maximum - recordedZve));

  if (assessment.status === IncomeEligibilityStatus.Ineligible) {
    return Object.freeze({
      status: PlanCapDiagnosticStatus.OverCap,
      relevantIncomeYear: assessment.relevantIncomeYear,
      statutoryCapEur: assessment.maximum,
      recordedZveEur: recordedZve,
      headroomEur: toEuroAmount(0),
      headline: `Over €${Math.round(assessment.maximum).toLocaleString("en-US")} cap`,
      detail: `${assessment.relevantIncomeYear} zvE (€${Math.round(recordedZve).toLocaleString("en-US")}) exceeds the § 1 Abs. 8 BEEG threshold; Elterngeld is €0.`,
    });
  }

  const isNearCap = headroom <= assessment.maximum * NEAR_CAP_HEADROOM_RATIO;
  return Object.freeze({
    status: isNearCap ? PlanCapDiagnosticStatus.NearCap : PlanCapDiagnosticStatus.Eligible,
    relevantIncomeYear: assessment.relevantIncomeYear,
    statutoryCapEur: assessment.maximum,
    recordedZveEur: recordedZve,
    headroomEur: headroom,
    headline: isNearCap
      ? `Near cap (€${Math.round(headroom).toLocaleString("en-US")} headroom)`
      : `Eligible (€${Math.round(headroom).toLocaleString("en-US")} headroom)`,
    detail: `${assessment.relevantIncomeYear} zvE €${Math.round(recordedZve).toLocaleString("en-US")} / €${Math.round(assessment.maximum).toLocaleString("en-US")} statutory cap.`,
  });
}

function evaluateTaxSwitchDiagnostic(
  inputs: ParentalPlanDiagnosticsInputs,
): TaxSwitchDiagnostic {
  const gain = toEuroAmount(
    Math.round((inputs.scenarioC.summary.grandTotal - inputs.scenarioB.summary.grandTotal) * 100) / 100,
  );

  if (inputs.pregnancies.length === 0) {
    return Object.freeze({
      status: TaxSwitchDiagnosticStatus.NotApplicable,
      cashFlowGainVsBaseline: toEuroAmount(0),
      hasActiveSwitches: inputs.taxClassSwitches.length > 0,
      headline: "No birth planned",
      detail: "Add a birth to evaluate § 2b BEEG tax-class switch lead timing.",
    });
  }

  const firstBirth = [...inputs.pregnancies].sort(
    (a, b) => a.calculatedDeliverySimulationMonth - b.calculatedDeliverySimulationMonth,
  )[0];
  const recommendedLatestStart = Math.max(1, firstBirth.calculatedDeliverySimulationMonth - 8);

  if (inputs.taxClassSwitches.length === 0) {
    return Object.freeze({
      status: TaxSwitchDiagnosticStatus.OpportunityAvailable,
      cashFlowGainVsBaseline: gain,
      hasActiveSwitches: false,
      headline: "No switch active",
      detail: "Apply the optimal § 2b BEEG switch in Section 3 to check potential Elterngeld gain.",
    });
  }

  const earliestSwitch = [...inputs.taxClassSwitches].sort(
    (a, b) => a.effectiveSimulationMonth - b.effectiveSimulationMonth,
  )[0];
  const switchDate = simMonthToCalendarDate(
    earliestSwitch.effectiveSimulationMonth,
    inputs.preexisting.startCalendarYear,
    inputs.preexisting.startCalendarMonth,
  );

  if (earliestSwitch.effectiveSimulationMonth <= recommendedLatestStart) {
    return Object.freeze({
      status: TaxSwitchDiagnosticStatus.OptimalLead,
      cashFlowGainVsBaseline: gain,
      hasActiveSwitches: true,
      headline: `7-month lead met (${switchDate.calendarLabel})`,
      detail: `Switch starts ${switchDate.calendarLabel}, establishing predominant class before Mutterschutz.`,
    });
  }

  return Object.freeze({
    status: TaxSwitchDiagnosticStatus.ShortLead,
    cashFlowGainVsBaseline: gain,
    hasActiveSwitches: true,
    headline: `Lead window short (${switchDate.calendarLabel})`,
    detail: "Switch starts fewer than 7 months before Mutterschutz; previous tax class may remain predominant.",
  });
}

function evaluateAllowanceRateDiagnostic(
  inputs: ParentalPlanDiagnosticsInputs,
): AllowanceRateDiagnostic {
  if (inputs.pregnancies.length === 0) {
    return Object.freeze({
      hasBirths: false,
      estimatedBasisMonthly: toEuroAmount(0),
      estimatedPlusMonthly: toEuroAmount(0),
      replacementRate: toPercentageRate(0.65),
      headline: "No allowance modeled",
      detail: "Add a planned child to estimate monthly Basiselterngeld and ElterngeldPlus.",
    });
  }

  const assessment = inputs.scenarioC.benefitAssessments?.find((a) => a.preBirthNet !== undefined);
  const preBirthNet = assessment?.preBirthNet !== undefined
    ? toNetSalary(assessment.preBirthNet)
    : inputs.preexisting.wifeInitialFullTimeNet;
  const entitlement = computeElterngeldBenefits(
    preBirthNet,
    toNetSalary(0),
    toWorkingHours(0),
  );
  const ratePct = (entitlement.replacementRate * 100).toFixed(0);

  return Object.freeze({
    hasBirths: true,
    estimatedBasisMonthly: entitlement.basiselterngeld,
    estimatedPlusMonthly: entitlement.elterngeldPlus,
    replacementRate: entitlement.replacementRate,
    headline: `Basis €${Math.round(entitlement.basiselterngeld).toLocaleString("en-US")} · Plus €${Math.round(entitlement.elterngeldPlus).toLocaleString("en-US")}`,
    detail: `${ratePct}% replacement rate on €${Math.round(entitlement.assessablePreBirthNet).toLocaleString("en-US")} assessable Elterngeld-Netto.`,
  });
}

/**
 * Pure diagnostic evaluator producing at-a-glance income-cap headroom, § 2b tax-switch lead checks,
 * monthly Elterngeld replacement-rate estimates, and completeness advisories for the Workbench.
 */
export function evaluateParentalPlanDiagnostics(
  inputs: ParentalPlanDiagnosticsInputs,
): ParentalPlanDiagnostics {
  const incomeCap = evaluateIncomeCapDiagnostic(inputs);
  const taxSwitch = evaluateTaxSwitchDiagnostic(inputs);
  const allowanceRate = evaluateAllowanceRateDiagnostic(inputs);

  const advisories: string[] = [];
  if (inputs.scenarioC.benefitsComplete !== true) {
    advisories.push("Some benefit payments are unavailable under current inputs; review Calculation Status.");
  }
  if (inputs.scenarioC.payrollComplete === false) {
    advisories.push("Payroll includes provisional or manually supplied values.");
  }
  if (inputs.scenarioC.taxComplete === false) {
    advisories.push("One or more annual tax settlements are incomplete or outside the forecast horizon.");
  }
  if (incomeCap.status === PlanCapDiagnosticStatus.UnknownZvE) {
    advisories.push(`Enter ${incomeCap.relevantIncomeYear ?? toFullCalendarYear(2026)} couple zvE to confirm § 1 Abs. 8 eligibility.`);
  }

  return Object.freeze({
    incomeCap,
    taxSwitch,
    allowanceRate,
    advisories: Object.freeze(advisories),
  });
}
