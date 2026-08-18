/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Transaction Factory
 *
 * Provides factory functions and parameter interfaces for creating immutable,
 * double-entry accounting transactions with complete statutory audit trails.
 */

import {
  type MonthId,
  type MonthRef,
  type MonthSimRef,
  type SimulationMonth,
  type CalendarYear,
  type TransactionType,
  type TransactionDirection,
  type EuroAmount,
  type AccountingTransaction,
  toTransactionId,
  toStatutoryCitation,
  toMonthId,
  toMonthRef,
  toMonthSimRef,
} from "#engine/types";

/**
 * Parameters for Constructing an Immutable Double-Entry Accounting Transaction.
 */
export interface CreateTransactionParams {
  /** Raw or nominal transaction identifier. */
  readonly transactionId: string;
  /** Absolute calendar month identifier (e.g. 'M09.2027'). */
  readonly monthId: MonthId;
  /** Statutory relative month reference notation (e.g. 'M9 (Birth 1)'). */
  readonly monthRef?: MonthRef;
  /** Simulation start relative index notation (e.g. 'Sim21'). */
  readonly monthSimRef?: MonthSimRef;
  /** Optional display label for relative month reference. */
  readonly relativeMonthLabel?: MonthRef;
  /** 1-based chronological simulation month index (1..120). */
  readonly month: SimulationMonth;
  /** 1-based simulation horizon year index (1..10). */
  readonly year: CalendarYear;
  /** Detailed transaction classification type (e.g. SALARY_BASE, BENEFIT_ELTERNGELD_PLUS_MOTHER). */
  readonly type: TransactionType;
  /** Cash flow movement direction (INFLOW or OUTFLOW). */
  readonly direction: TransactionDirection;
  /** Exact integer EUR transaction amount. */
  readonly amount: EuroAmount;
  /** Formal statutory legal citation string (e.g. 'BEEG § 4', 'EStG § 66'). */
  readonly statutoryCitation: string;
  /** Active tax class configuration label (e.g. 'III / V'). */
  readonly taxClassLabel: string;
  /** Human-readable transaction summary description. */
  readonly description: string;
  /** Detailed mathematical derivation audit trail string. */
  readonly auditTrail: string;
}

/**
 * Factory creating a fully validated, immutable `AccountingTransaction` record
 * with normalized nominal brand types.
 *
 * @param params - Configuration parameters specifying cash flow amount, direction, and statutory grounding.
 * @returns Strongly-typed `AccountingTransaction` record.
 */
export function createTransaction(
  params: CreateTransactionParams,
): AccountingTransaction {
  return {
    transactionId: toTransactionId(params.transactionId),
    monthId: toMonthId(params.monthId),
    monthRef: params.monthRef
      ? toMonthRef(params.monthRef)
      : params.relativeMonthLabel
        ? toMonthRef(params.relativeMonthLabel)
        : undefined,
    monthSimRef: params.monthSimRef
      ? toMonthSimRef(params.monthSimRef)
      : undefined,
    relativeMonthLabel: params.relativeMonthLabel
      ? toMonthRef(params.relativeMonthLabel)
      : params.monthRef
        ? toMonthRef(params.monthRef)
        : undefined,
    month: params.month,
    year: params.year,
    type: params.type,
    direction: params.direction,
    amount: params.amount,
    statutoryCitation: toStatutoryCitation(params.statutoryCitation),
    taxClassLabel: params.taxClassLabel,
    description: params.description,
    auditTrail: params.auditTrail,
  };
}
