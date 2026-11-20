import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  closingCashBalance,
} from "#engine/lifeProfile/cashFlowFormula";
import {
  type CalculationExplanation,
  ExplanationFormulaKind,
  ExplanationStatus,
  toFormulaVersion,
} from "#engine/lifeProfile/calculationExplanation";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

export const TransitionMonthPhase = {
  WaitingPeriod: "waiting-period",
  BenefitPeriod: "benefit-period",
  UnfundedSearch: "unfunded-search",
  NewJob: "new-job",
} as const;
export type TransitionMonthPhase = (typeof TransitionMonthPhase)[keyof typeof TransitionMonthPhase];

export function toTransitionMonthPhase(value: string): TransitionMonthPhase {
  if (!Object.values(TransitionMonthPhase).includes(value as TransitionMonthPhase)) {
    throw new TypeError("Invalid transition month phase.");
  }
  return value as TransitionMonthPhase;
}

export interface ResignationRunwayInput {
  readonly label: string;
  readonly openingSavingsCents: EuroCents;
  readonly finalPayCents: EuroCents;
  readonly monthlyExpensesCents: EuroCents;
  readonly jobSearchMonths: number;
  readonly waitingPeriodMonths: number;
  readonly monthlyBenefitCents: EuroCents;
  readonly newJobMonthlyNetCents: EuroCents;
  readonly horizonMonths: number;
}

export interface ResignationRunwayMonth {
  readonly monthIndex: number;
  readonly phase: TransitionMonthPhase;
  readonly openingBalanceCents: EuroCents;
  readonly inflowCents: EuroCents;
  readonly expenseCents: EuroCents;
  readonly closingBalanceCents: EuroCents;
}

export interface ResignationRunwayResult {
  readonly label: string;
  readonly months: readonly ResignationRunwayMonth[];
  readonly minimumBalanceCents: EuroCents;
  readonly endingBalanceCents: EuroCents;
  readonly shortfallMonthIndex?: number;
  readonly solventMonths: number;
  readonly explanation: CalculationExplanation;
}

export const RESIGNATION_RUNWAY_FORMULA_VERSION = toFormulaVersion("resignation-runway-v1");

function assertNonNegativeInteger(value: number, name: string, max: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) {
    throw new RangeError(`${name} must be an integer between 0 and ${max}.`);
  }
}

/** Projects month-by-month savings runway across a job transition using exact integer euro cents. */
export function simulateResignationRunway(input: ResignationRunwayInput): ResignationRunwayResult {
  if (!input.label.trim()) {
    throw new TypeError("Scenario label must not be empty.");
  }
  if (input.finalPayCents < 0 || input.monthlyExpensesCents < 0
    || input.monthlyBenefitCents < 0 || input.newJobMonthlyNetCents < 0) {
    throw new RangeError("Cash flows cannot be negative.");
  }
  assertNonNegativeInteger(input.jobSearchMonths, "jobSearchMonths", 36);
  assertNonNegativeInteger(input.waitingPeriodMonths, "waitingPeriodMonths", 12);
  if (!Number.isSafeInteger(input.horizonMonths) || input.horizonMonths < 1 || input.horizonMonths > 60) {
    throw new RangeError("horizonMonths must be an integer between 1 and 60.");
  }

  const months: ResignationRunwayMonth[] = [];
  let balance = input.openingSavingsCents;
  let minimumBalance = input.openingSavingsCents;
  let shortfallMonthIndex: number | undefined;

  for (let monthIndex = 1; monthIndex <= input.horizonMonths; monthIndex++) {
    const openingBalanceCents = balance;
    let phase: TransitionMonthPhase;
    let baseInflow: number;

    if (monthIndex <= input.jobSearchMonths) {
      if (input.monthlyBenefitCents > 0 && monthIndex <= input.waitingPeriodMonths) {
        phase = TransitionMonthPhase.WaitingPeriod;
        baseInflow = 0;
      }
      else if (input.monthlyBenefitCents > 0) {
        phase = TransitionMonthPhase.BenefitPeriod;
        baseInflow = input.monthlyBenefitCents;
      }
      else {
        phase = TransitionMonthPhase.UnfundedSearch;
        baseInflow = 0;
      }
    }
    else {
      phase = TransitionMonthPhase.NewJob;
      baseInflow = input.newJobMonthlyNetCents;
    }

    const finalPayInMonth = monthIndex === 1 ? input.finalPayCents : 0;
    const inflowCents = toEuroCents(baseInflow + finalPayInMonth);
    const closingBalanceCents = closingCashBalance(
      openingBalanceCents,
      inflowCents,
      input.monthlyExpensesCents,
    );

    if (closingBalanceCents < minimumBalance) {
      minimumBalance = closingBalanceCents;
    }
    if (shortfallMonthIndex === undefined && closingBalanceCents < 0) {
      shortfallMonthIndex = monthIndex;
    }

    months.push(Object.freeze({
      monthIndex,
      phase,
      openingBalanceCents,
      inflowCents,
      expenseCents: input.monthlyExpensesCents,
      closingBalanceCents,
    }));
    balance = closingBalanceCents;
  }

  const solventMonths = shortfallMonthIndex === undefined ? input.horizonMonths : shortfallMonthIndex - 1;
  const explanation: CalculationExplanation = Object.freeze({
    kind: ExplanationFormulaKind.PureArithmetic,
    status: ExplanationStatus.Supported,
    formulaName: "Employment Transition Savings Runway",
    formulaExpression: "closing[m] = opening[m] + finalPay(m=1) + benefitOrNewNet[m] − monthlyExpenses (exact integer EUR cents)",
    formulaVersion: RESIGNATION_RUNWAY_FORMULA_VERSION,
    inputs: Object.freeze([
      {
        label: "Opening liquid savings",
        value: formatIntegerEuroCents(input.openingSavingsCents),
        source: "User scenario input",
      },
      {
        label: "Final pay / payout (month 1)",
        value: formatIntegerEuroCents(input.finalPayCents),
        source: "User scenario or job-end event",
      },
      {
        label: "Monthly expenses",
        value: formatIntegerEuroCents(input.monthlyExpensesCents),
        source: "User scenario input",
      },
      {
        label: "Job-search duration",
        value: `${input.jobSearchMonths} months`,
        source: "User scenario input",
      },
      {
        label: "Benefit waiting period (e.g. Sperrzeit)",
        value: `${input.waitingPeriodMonths} months`,
        source: "User scenario input",
      },
      {
        label: "Estimated monthly benefit after waiting period",
        value: formatIntegerEuroCents(input.monthlyBenefitCents),
        source: "User scenario input",
      },
      {
        label: "Expected new-job monthly net pay",
        value: formatIntegerEuroCents(input.newJobMonthlyNetCents),
        source: "User scenario input",
      },
    ]),
    parameters: Object.freeze([]),
    lawIds: Object.freeze([]),
    topicIds: Object.freeze([]),
    assumptions: Object.freeze([
      "Final pay is credited in month 1; actual payroll and severance tax timing can differ.",
      "Unemployment benefit eligibility, amount and waiting period (Sperrzeit) are manual estimates, not an Agentur für Arbeit decision.",
      "Negative balances show an unfunded shortfall without overdraft or credit assumptions.",
    ]),
  });

  return Object.freeze({
    label: input.label,
    months: Object.freeze(months),
    minimumBalanceCents: minimumBalance,
    endingBalanceCents: balance,
    ...(shortfallMonthIndex !== undefined ? { shortfallMonthIndex } : {}),
    solventMonths,
    explanation,
  });
}

/** Compares multiple employment transition scenarios side-by-side. */
export function compareResignationScenarios(
  scenarios: readonly ResignationRunwayInput[],
): readonly ResignationRunwayResult[] {
  return Object.freeze(scenarios.map((scenario) => simulateResignationRunway(scenario)));
}
