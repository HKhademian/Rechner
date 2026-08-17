import {
  type TransactionId,
  type MonthId,
  type MonthRef,
  type MonthSimRef,
  type SimulationMonth,
  type CalendarYear,
  type TransactionType,
  type TransactionDirection,
  type EuroAmount,
  type StatutoryCitation,
  type AccountingTransaction,
  toTransactionId,
  toStatutoryCitation,
  toMonthId,
  toMonthRef,
  toMonthSimRef,
} from "#engine/types";

export interface CreateTransactionParams {
  readonly transactionId: string;
  readonly monthId: MonthId | string;
  readonly monthRef?: MonthRef | string;
  readonly monthSimRef?: MonthSimRef | string;
  readonly relativeMonthLabel?: MonthRef | string;
  readonly month: SimulationMonth;
  readonly year: CalendarYear;
  readonly type: TransactionType;
  readonly direction: TransactionDirection;
  readonly amount: EuroAmount;
  readonly statutoryCitation: string;
  readonly taxClassLabel: string;
  readonly description: string;
  readonly auditTrail: string;
}

/**
 * Creates an immutable, traceable accounting transaction entry
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
