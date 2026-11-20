import {
  type SourceUrl,
} from "#engine/config/benefitRules";
import {
  type FormulaId,
} from "#engine/formulas/types";
import {
  type LawId,
} from "#engine/laws/types";
import {
  type ParameterId,
} from "#engine/parameters/types";
import {
  type Brand,
  type EuroCents,
} from "#engine/types";
import {
  CashOverlapPolicy,
} from "#engine/lifeProfile/cashForecastOverlap";
import {
  type LifeDate,
} from "#engine/lifeProfile/person";
import {
  type JurisdictionCode,
  type RuleResolutionStatus,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

export type FormulaVersion = Brand<string, "FormulaVersion">;

export function toFormulaVersion(value: string): FormulaVersion {
  if (!/^[a-z0-9.-]+$/i.test(value.trim()) || value.trim() !== value) {
    throw new TypeError("Formula version must be a non-empty version identifier.");
  }
  return value as FormulaVersion;
}

export const ExplanationFormulaKind = {
  Statutory: "statutory",
  PureArithmetic: "pure-arithmetic",
} as const;
export type ExplanationFormulaKind = (typeof ExplanationFormulaKind)[keyof typeof ExplanationFormulaKind];

export function toExplanationFormulaKind(value: string): ExplanationFormulaKind {
  if (!Object.values(ExplanationFormulaKind).includes(value as ExplanationFormulaKind)) {
    throw new TypeError("Invalid explanation formula kind.");
  }
  return value as ExplanationFormulaKind;
}

export const ExplanationStatus = {
  Supported: "supported",
  Projected: "projected",
  Unsupported: "unsupported",
} as const;
export type ExplanationStatus = (typeof ExplanationStatus)[keyof typeof ExplanationStatus];

export function toExplanationStatus(value: string): ExplanationStatus {
  if (!Object.values(ExplanationStatus).includes(value as ExplanationStatus)) {
    throw new TypeError("Invalid explanation status.");
  }
  return value as ExplanationStatus;
}

export interface ExplanationInput {
  readonly label: string;
  readonly value: string;
  readonly source: string;
}

export interface ExplanationParameter {
  readonly label: string;
  readonly value: string;
  readonly parameterId?: ParameterId;
  readonly jurisdiction: JurisdictionCode;
  readonly effectiveFrom: LifeDate;
  readonly effectiveTo: LifeDate;
  readonly status: RuleResolutionStatus;
  readonly sourceUrl: SourceUrl;
  readonly lawIds: readonly LawId[];
}

export interface CalculationExplanation {
  readonly kind: ExplanationFormulaKind;
  readonly status: ExplanationStatus;
  readonly formulaName: string;
  readonly formulaExpression: string;
  readonly formulaVersion: FormulaVersion;
  readonly formulaId?: FormulaId;
  readonly jurisdiction?: JurisdictionCode;
  readonly effectiveDate?: LifeDate;
  readonly unsupportedReason?: string;
  readonly inputs: readonly ExplanationInput[];
  readonly parameters: readonly ExplanationParameter[];
  readonly lawIds: readonly LawId[];
  readonly topicIds: readonly string[];
  readonly assumptions: readonly string[];
}

export const CASH_BALANCE_FORMULA_VERSION = toFormulaVersion("cash-balance-v1");

function describeOverlapPolicy(policy: CashOverlapPolicy): string {
  if (policy === CashOverlapPolicy.AddExplicitExtraEventsOnly) {
    return "Add explicitly checked extra cash events on top of recurring monthly assumptions";
  }
  if (policy === CashOverlapPolicy.EventsReplaceRecurringInEventMonths) {
    return "Replace recurring monthly assumptions with cash events in months that have entries";
  }
  return "Keep recurring monthly assumptions separate from timeline cash events";
}

/** Builds a structured explanation for a recurring or combined monthly cash balance projection. */
export function explainRecurringCashProjection(input: {
  readonly originMonth: string;
  readonly monthCount: number;
  readonly opening?: EuroCents;
  readonly recurringInflow?: EuroCents;
  readonly recurringExpense?: EuroCents;
  readonly policy: CashOverlapPolicy;
  readonly selectedExtraCount: number;
}): CalculationExplanation {
  const inputs: ExplanationInput[] = [
    {
      label: "Start month",
      value: input.originMonth || "Not selected",
      source: "View date",
    },
    {
      label: "Projection horizon",
      value: `${input.monthCount} months`,
      source: "Fixed preview window",
    },
    {
      label: "Opening balance",
      value: input.opening === undefined ? "Unknown" : formatIntegerEuroCents(input.opening),
      source: "Manual what-if input",
    },
    {
      label: "Recurring monthly inflow",
      value: input.recurringInflow === undefined ? "Unknown" : formatIntegerEuroCents(input.recurringInflow),
      source: "Manual what-if input",
    },
    {
      label: "Recurring monthly expenses",
      value: input.recurringExpense === undefined ? "Unknown" : formatIntegerEuroCents(input.recurringExpense),
      source: "Manual what-if input",
    },
    {
      label: "Timeline overlap rule",
      value: describeOverlapPolicy(input.policy),
      source: "Explicit overlap setting",
    },
  ];
  if (input.policy === CashOverlapPolicy.AddExplicitExtraEventsOnly) {
    inputs.push({
      label: "Selected extra one-off events",
      value: `${input.selectedExtraCount}`,
      source: "Explicitly checked timeline cash entries",
    });
  }
  return Object.freeze({
    kind: ExplanationFormulaKind.PureArithmetic,
    status: ExplanationStatus.Supported,
    formulaName: "Monthly Cash Balance Carry",
    formulaExpression: "closing = opening + monthly inflows − monthly expenses (exact integer EUR cents)",
    formulaVersion: CASH_BALANCE_FORMULA_VERSION,
    inputs: Object.freeze(inputs),
    parameters: Object.freeze([]),
    lawIds: Object.freeze([]),
    topicIds: Object.freeze([]),
    assumptions: Object.freeze([
      "No statutory tax, interest, inflation or benefit rules are applied.",
      "Opening balance and recurring amounts are manual assumptions, not inferred from employment or bank records.",
      "Reconciled planned cash entries are counted once via their linked actual transaction.",
      "Negative balances indicate an unfunded shortfall; no overdraft or borrowing is assumed.",
    ]),
  });
}

/** Builds a structured explanation for an event-only cash projection. */
export function explainEventCashProjection(input: {
  readonly originMonth: string;
  readonly monthCount: number;
  readonly opening?: EuroCents;
  readonly includePlanned: boolean;
  readonly includedEventCount: number;
  readonly reconciledPlanCount: number;
}): CalculationExplanation {
  return Object.freeze({
    kind: ExplanationFormulaKind.PureArithmetic,
    status: ExplanationStatus.Supported,
    formulaName: "Sourced Cash Events Balance",
    formulaExpression: "closing = opening + sum(active inflow events) − sum(active outflow events) (exact integer EUR cents)",
    formulaVersion: CASH_BALANCE_FORMULA_VERSION,
    inputs: Object.freeze([
      {
        label: "Start month",
        value: input.originMonth || "Not selected",
        source: "View date",
      },
      {
        label: "Projection horizon",
        value: `${input.monthCount} months`,
        source: "Fixed preview window",
      },
      {
        label: "Opening balance",
        value: input.opening === undefined ? "Unknown" : formatIntegerEuroCents(input.opening),
        source: "Manual assumption",
      },
      {
        label: "Open planned entries",
        value: input.includePlanned ? "Included" : "Excluded",
        source: "Timeline view filter",
      },
      {
        label: "Active cash entries included",
        value: `${input.includedEventCount}`,
        source: "User-entered timeline cash entries",
      },
      {
        label: "Reconciled planned entries preserved",
        value: `${input.reconciledPlanCount} (not double-counted)`,
        source: "Linked planned-versus-actual cash history",
      },
    ]),
    parameters: Object.freeze([]),
    lawIds: Object.freeze([]),
    topicIds: Object.freeze([]),
    assumptions: Object.freeze([
      "Uses only user-entered cash events for the selected person in the displayed months.",
      "Excludes recurring what-if assumptions and all unrecorded income or spending.",
      "No statutory rules, interest or overdraft financing are applied.",
    ]),
  });
}
