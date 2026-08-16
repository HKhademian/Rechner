import {
  type TransactionId,
  type SimulationMonth,
  type CalendarYear,
  type TransactionType,
  type TransactionDirection,
  type EuroAmount,
  type StatutoryCitation,
  type AccountingTransaction,
  toTransactionId,
  toStatutoryCitation
} from '../types.ts';

export interface CreateTransactionParams {
  readonly id: string;
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
export function createTransaction(params: CreateTransactionParams): AccountingTransaction {
  return {
    id: toTransactionId(params.id),
    month: params.month,
    year: params.year,
    type: params.type,
    direction: params.direction,
    amount: params.amount,
    statutoryCitation: toStatutoryCitation(params.statutoryCitation),
    taxClassLabel: params.taxClassLabel,
    description: params.description,
    auditTrail: params.auditTrail
  };
}
