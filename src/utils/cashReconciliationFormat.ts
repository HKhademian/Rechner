import {
  type CashEventPayload,
  CashDirection,
} from "#engine/lifeProfile/cashEvent";
import {
  comparePlannedAndActualCash,
} from "#engine/lifeProfile/cashReconciliation";
import {
  type LifeEvent,
} from "#engine/lifeProfile/timeline";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

/** Formats a concise planned-versus-actual comparison note for a reconciled cash transaction. */
export function formatCashReconciliationNote(
  planned: LifeEvent<CashEventPayload>,
  actual: LifeEvent<CashEventPayload>,
): string {
  const variance = comparePlannedAndActualCash(planned, actual);
  const datePart = variance.dateChanged && planned.date ? ` on ${planned.date}` : "";
  if (!variance.sameDirection || variance.amountDifference === undefined) {
    const plannedType = planned.payload.direction === CashDirection.Inflow ? "inflow" : "expense";
    return `Reconciles planned ${plannedType} ${formatIntegerEuroCents(planned.payload.amount)}${datePart} (direction changed)`;
  }
  const deltaText = variance.amountDifference === 0
    ? "matched"
    : `${variance.amountDifference > 0 ? "+" : ""}${formatIntegerEuroCents(variance.amountDifference)}`;
  return `Reconciles planned ${formatIntegerEuroCents(planned.payload.amount)}${datePart} (${deltaText})`;
}
