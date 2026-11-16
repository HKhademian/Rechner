import {
  type AnnualTaxLiabilitySnapshot,
  computeAnnualDeductionTaxSavings,
  resolveTaxRulesForPlanningYear,
} from "#engine/formulas/pure/annualTaxDeltaHelper";
import {
  type EuroAmount,
  type FullCalendarYear,
  toEuroAmount,
  toFullCalendarYear,
  toPercentageRate,
} from "#engine/types";
import commuterRulesJson from "../../../data/commuterRules.json" with { type: "json" };

export const CommuteTransportMode = {
  MotorVehicle: "motor_vehicle",
  PublicTransitOrBike: "public_transit_or_bike",
} as const;
export type CommuteTransportMode = (typeof CommuteTransportMode)[keyof typeof CommuteTransportMode];

export function toCommuteTransportMode(value: string): CommuteTransportMode {
  if (!Object.values(CommuteTransportMode).includes(value as CommuteTransportMode)) {
    throw new TypeError(`Unknown commute transport mode: ${value}`);
  }
  return value as CommuteTransportMode;
}

export interface CommuterYearRulesSnapshot {
  readonly calendarYear: FullCalendarYear;
  readonly sourceYear: FullCalendarYear;
  readonly projected: boolean;
  readonly first20KmRateEur: EuroAmount;
  readonly from21KmRateEur: EuroAmount;
  readonly nonCarAnnualCapEur: EuroAmount;
  readonly homeOfficeDailyEur: EuroAmount;
  readonly homeOfficeAnnualMaxEur: EuroAmount;
  readonly deutschlandticketMonthlyEur: EuroAmount;
  readonly workExpenseAllowanceEur: EuroAmount;
}

export interface CommuterAllowanceInputs {
  readonly calendarYear: FullCalendarYear;
  readonly oneWayCommuteKm: number;
  readonly officeDaysPerYear: number;
  readonly transportMode: CommuteTransportMode;
  readonly homeOfficeDaysPerYear: number;
  readonly otherAnnualWorkExpensesEur: EuroAmount;
  readonly monthlyTransitTicketCostEur: EuroAmount;
  readonly monthlyEmployerJobTicketSubsidyEur: EuroAmount;
  readonly taxableIncomeZvEEur: EuroAmount;
  readonly isMarriedJointAssessment: boolean;
  readonly hasChurchTax: boolean;
  readonly isBavariaOrBadenWuerttemberg: boolean;
  readonly workExpenseAllowanceOverrideEur?: EuroAmount;
}

export interface CommuterScenarioResult {
  readonly commuteAllowanceEur: EuroAmount;
  readonly usedActualTicketCostInsteadOfDistance: boolean;
  readonly homeOfficeDeductionEur: EuroAmount;
  readonly totalWorkExpensesEur: EuroAmount;
  readonly excessAboveWorkAllowanceEur: EuroAmount;
  readonly annualTaxSavingsEur: EuroAmount;
  readonly annualEmployeeTicketCostEur: EuroAmount;
  readonly netAnnualBenefitAfterTicketEur: EuroAmount;
  readonly baselineTax: AnnualTaxLiabilitySnapshot;
  readonly postDeductionTax: AnnualTaxLiabilitySnapshot;
}

export interface CommuterAllowanceEvaluationResult {
  readonly rulesSnapshot: CommuterYearRulesSnapshot;
  readonly uncappedDistanceAllowanceEur: EuroAmount;
  readonly cappedDistanceAllowanceEur: EuroAmount;
  readonly annualEmployerSubsidyEur: EuroAmount;
  readonly selfPaidScenario: CommuterScenarioResult;
  readonly jobTicketScenario: CommuterScenarioResult;
  readonly jobTicketNetAnnualAdvantageEur: EuroAmount;
  readonly jobTicketNetMonthlyAdvantageEur: EuroAmount;
  readonly effectiveCommuteOffsetByJobTicketEur: EuroAmount;
}

function roundToCent(amount: number): number {
  return Math.round(amount * 100 + Number.EPSILON * amount * 100) / 100;
}

/** Resolves statutory § 9 EStG commuter rates and reference Deutschlandticket price for a year. */
export function resolveCommuterRulesForYear(
  calendarYear: FullCalendarYear,
): CommuterYearRulesSnapshot {
  const requested = toFullCalendarYear(calendarYear);
  const availableYears = Object.keys(commuterRulesJson)
    .map(Number)
    .filter((year) => year <= requested)
    .sort((a, b) => b - a);
  const sourceYearNum = availableYears[0] ?? Math.min(...Object.keys(commuterRulesJson).map(Number));
  const entry = commuterRulesJson[String(sourceYearNum) as keyof typeof commuterRulesJson];
  const taxRules = resolveTaxRulesForPlanningYear(requested);

  return Object.freeze({
    calendarYear: requested,
    sourceYear: toFullCalendarYear(sourceYearNum),
    projected: requested !== sourceYearNum,
    first20KmRateEur: toEuroAmount(entry.parameters.first20KmRateEur.value),
    from21KmRateEur: toEuroAmount(entry.parameters.from21KmRateEur.value),
    nonCarAnnualCapEur: toEuroAmount(entry.parameters.nonCarAnnualCapEur.value),
    homeOfficeDailyEur: toEuroAmount(entry.parameters.homeOfficeDailyEur.value),
    homeOfficeAnnualMaxEur: toEuroAmount(entry.parameters.homeOfficeAnnualMaxEur.value),
    deutschlandticketMonthlyEur: toEuroAmount(entry.parameters.deutschlandticketMonthlyEur.value),
    workExpenseAllowanceEur: taxRules.parameters.workExpenseAllowance.value,
  });
}

/**
 * Evaluates statutory commuter distance deductions (§ 9 Abs. 1 Nr. 4 EStG), Homeoffice-Pauschale,
 * €1,230 Arbeitnehmer-Pauschbetrag absorption (§ 9a EStG), and tax-free § 3 Nr. 15 EStG JobTicket subsidies.
 */
export function evaluateCommuterAllowanceAndJobTicket(
  inputs: Readonly<CommuterAllowanceInputs>,
): CommuterAllowanceEvaluationResult {
  if (!Number.isFinite(inputs.oneWayCommuteKm) || inputs.oneWayCommuteKm < 0 || inputs.oneWayCommuteKm > 1000) {
    throw new TypeError("One-way commute distance must be between 0 and 1,000 km.");
  }
  if (!Number.isInteger(inputs.officeDaysPerYear) || inputs.officeDaysPerYear < 0 || inputs.officeDaysPerYear > 366) {
    throw new TypeError("Annual office commuting days must be an integer between 0 and 366.");
  }
  if (!Number.isInteger(inputs.homeOfficeDaysPerYear) || inputs.homeOfficeDaysPerYear < 0 || inputs.homeOfficeDaysPerYear > 366) {
    throw new TypeError("Annual home-office days must be an integer between 0 and 366.");
  }
  if (!Number.isFinite(inputs.otherAnnualWorkExpensesEur) || inputs.otherAnnualWorkExpensesEur < 0) {
    throw new TypeError("Other work expenses must be non-negative.");
  }
  if (!Number.isFinite(inputs.monthlyTransitTicketCostEur) || inputs.monthlyTransitTicketCostEur < 0) {
    throw new TypeError("Monthly public transit ticket cost must be non-negative.");
  }
  if (!Number.isFinite(inputs.monthlyEmployerJobTicketSubsidyEur) || inputs.monthlyEmployerJobTicketSubsidyEur < 0) {
    throw new TypeError("Monthly employer JobTicket subsidy must be non-negative.");
  }
  if (!Number.isFinite(inputs.taxableIncomeZvEEur) || inputs.taxableIncomeZvEEur < 0) {
    throw new TypeError("Taxable income (zvE) must be non-negative.");
  }

  const calendarYear = toFullCalendarYear(inputs.calendarYear);
  const rulesSnapshot = resolveCommuterRulesForYear(calendarYear);
  const taxRules = resolveTaxRulesForPlanningYear(calendarYear);
  const workAllowance = inputs.workExpenseAllowanceOverrideEur ?? rulesSnapshot.workExpenseAllowanceEur;
  const effectiveSnapshot = inputs.workExpenseAllowanceOverrideEur !== undefined
    ? Object.freeze({ ...rulesSnapshot,
      workExpenseAllowanceEur: workAllowance })
    : rulesSnapshot;

  const fullKm = Math.max(0, Math.floor(inputs.oneWayCommuteKm));
  const first20Km = Math.min(20, fullKm);
  const beyond20Km = Math.max(0, fullKm - 20);
  const dailyCommuteAllowance =
    first20Km * effectiveSnapshot.first20KmRateEur +
    beyond20Km * effectiveSnapshot.from21KmRateEur;
  const uncappedDistanceAllowanceEur = toEuroAmount(
    roundToCent(inputs.officeDaysPerYear * dailyCommuteAllowance),
  );
  const cappedDistanceAllowanceEur = inputs.transportMode === CommuteTransportMode.PublicTransitOrBike
    ? toEuroAmount(Math.min(effectiveSnapshot.nonCarAnnualCapEur, uncappedDistanceAllowanceEur))
    : uncappedDistanceAllowanceEur;

  const homeOfficeDeductionEur = toEuroAmount(
    Math.min(
      effectiveSnapshot.homeOfficeAnnualMaxEur,
      roundToCent(inputs.homeOfficeDaysPerYear * effectiveSnapshot.homeOfficeDailyEur),
    ),
  );

  const churchTaxRate = inputs.hasChurchTax
    ? (inputs.isBavariaOrBadenWuerttemberg
      ? taxRules.parameters.churchRateBavariaBadenWuerttemberg.value
      : taxRules.parameters.churchRateOther.value)
    : toPercentageRate(0);

  const annualTicketGrossEur = toEuroAmount(roundToCent(inputs.monthlyTransitTicketCostEur * 12));
  const annualEmployerSubsidyEur = toEuroAmount(
    roundToCent(inputs.monthlyEmployerJobTicketSubsidyEur * 12),
  );

  const buildScenario = (
    commuteAllowanceBeforeOffset: EuroAmount,
    usedActualTicket: boolean,
    taxFreeSubsidyReduction: EuroAmount,
    employeeTicketOutflow: EuroAmount,
  ): CommuterScenarioResult => {
    const netCommuteAllowance = toEuroAmount(
      Math.max(0, roundToCent(commuteAllowanceBeforeOffset - taxFreeSubsidyReduction)),
    );
    const totalWorkExpensesEur = toEuroAmount(
      roundToCent(netCommuteAllowance + homeOfficeDeductionEur + inputs.otherAnnualWorkExpensesEur),
    );
    const excessAboveWorkAllowanceEur = toEuroAmount(
      Math.max(0, roundToCent(totalWorkExpensesEur - workAllowance)),
    );

    const savings = computeAnnualDeductionTaxSavings({
      baselineZvEEur: inputs.taxableIncomeZvEEur,
      deductionEur: excessAboveWorkAllowanceEur,
      isMarriedJointAssessment: inputs.isMarriedJointAssessment,
      churchTaxRate,
      rules: taxRules,
    });

    return Object.freeze({
      commuteAllowanceEur: netCommuteAllowance,
      usedActualTicketCostInsteadOfDistance: usedActualTicket,
      homeOfficeDeductionEur,
      totalWorkExpensesEur,
      excessAboveWorkAllowanceEur,
      annualTaxSavingsEur: savings.annualTaxSavingsEur,
      annualEmployeeTicketCostEur: employeeTicketOutflow,
      netAnnualBenefitAfterTicketEur: toEuroAmount(
        roundToCent(savings.annualTaxSavingsEur - employeeTicketOutflow),
      ),
      baselineTax: savings.baseline,
      postDeductionTax: savings.reduced,
    });
  };

  // § 9 Abs. 2 S. 2 EStG allows deducting actual self-paid public transit ticket costs if higher.
  const canUseHigherActualTicketSelfPaid =
    inputs.transportMode === CommuteTransportMode.PublicTransitOrBike &&
    annualTicketGrossEur > cappedDistanceAllowanceEur;
  const selfPaidCommuteClaim = canUseHigherActualTicketSelfPaid
    ? annualTicketGrossEur
    : cappedDistanceAllowanceEur;
  const selfPaidTicketOutflow = inputs.transportMode === CommuteTransportMode.PublicTransitOrBike
    ? annualTicketGrossEur
    : toEuroAmount(0);

  const selfPaidScenario = buildScenario(
    selfPaidCommuteClaim,
    canUseHigherActualTicketSelfPaid,
    toEuroAmount(0),
    selfPaidTicketOutflow,
  );

  // § 3 Nr. 15 S. 3 EStG reduces claimable distance/ticket Werbungskosten dollar-for-dollar by the tax-free subsidy.
  const employeeCoPayAfterSubsidy =
    inputs.transportMode === CommuteTransportMode.MotorVehicle && annualEmployerSubsidyEur === 0
      ? toEuroAmount(0)
      : toEuroAmount(Math.max(0, roundToCent(annualTicketGrossEur - annualEmployerSubsidyEur)));
  const preOffsetJobTicketClaim = inputs.transportMode === CommuteTransportMode.PublicTransitOrBike &&
    annualTicketGrossEur > cappedDistanceAllowanceEur &&
    employeeCoPayAfterSubsidy > cappedDistanceAllowanceEur
    ? employeeCoPayAfterSubsidy
    : cappedDistanceAllowanceEur;

  const jobTicketScenario = buildScenario(
    preOffsetJobTicketClaim,
    inputs.transportMode === CommuteTransportMode.PublicTransitOrBike &&
      annualTicketGrossEur > cappedDistanceAllowanceEur,
    annualEmployerSubsidyEur,
    employeeCoPayAfterSubsidy,
  );

  const effectiveCommuteOffsetByJobTicketEur = toEuroAmount(
    Math.max(0, roundToCent(preOffsetJobTicketClaim - jobTicketScenario.commuteAllowanceEur)),
  );
  const jobTicketNetAnnualAdvantageEur = toEuroAmount(
    roundToCent(
      jobTicketScenario.netAnnualBenefitAfterTicketEur -
        selfPaidScenario.netAnnualBenefitAfterTicketEur,
    ),
  );
  const jobTicketNetMonthlyAdvantageEur = toEuroAmount(
    roundToCent(jobTicketNetAnnualAdvantageEur / 12),
  );

  return Object.freeze({
    rulesSnapshot: effectiveSnapshot,
    uncappedDistanceAllowanceEur,
    cappedDistanceAllowanceEur,
    annualEmployerSubsidyEur,
    selfPaidScenario,
    jobTicketScenario,
    jobTicketNetAnnualAdvantageEur,
    jobTicketNetMonthlyAdvantageEur,
    effectiveCommuteOffsetByJobTicketEur,
  });
}
