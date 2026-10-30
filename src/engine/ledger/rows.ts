import {
  type MonthlyLedgerEntry,
  type SimulationResult,
  type ActionRowItem,
  type SpecialEventItem,
  type ActionId,
  type EventId,
  type MonthId,
  type EuroAmount,
  toEuroAmount,
} from "#engine/types";

export const LedgerRowKind = {
  Action: "ACTION",
  FinancialEvent: "FINANCIAL_EVENT",
  Month: "MONTH_BASE",
} as const;
export type LedgerRowKind = typeof LedgerRowKind[keyof typeof LedgerRowKind];

export function toLedgerRowKind(value: unknown): LedgerRowKind {
  if (!Object.values(LedgerRowKind).some((kind) => kind === value)) {
    throw new TypeError("Invalid ledger row kind.");
  }
  return value as LedgerRowKind;
}

interface RowContext {
  readonly month: MonthlyLedgerEntry;
  readonly deltaAmount: EuroAmount | null;
  readonly deltaCumulative: EuroAmount | null;
}
interface ActionRow extends RowContext {
  readonly kind: typeof LedgerRowKind.Action;
  readonly rowId: ActionId;
  readonly action: ActionRowItem;
  readonly amount: null;
  readonly cumulative: null;
}
interface FinancialRow extends RowContext {
  readonly kind: typeof LedgerRowKind.FinancialEvent;
  readonly rowId: EventId;
  readonly event: SpecialEventItem;
  readonly amount: EuroAmount;
  readonly cumulative: EuroAmount;
}
interface MonthRow extends RowContext {
  readonly kind: typeof LedgerRowKind.Month;
  readonly rowId: MonthId;
  readonly amount: EuroAmount;
  readonly cumulative: EuroAmount;
}
export type LedgerRow = ActionRow | FinancialRow | MonthRow;

/** One cash stream: actions have no values, events precede regular pay, and no event is paid twice.
 * Comparisons match absolute event IDs. An unmatched event retains the last matched baseline
 * checkpoint; the base row always compares complete month-end balances.
 */
export function projectLedgerMonth(month: MonthlyLedgerEntry, baseline?: MonthlyLedgerEntry): readonly LedgerRow[] {
  if (baseline && baseline.monthId !== month.monthId) {
    throw new TypeError("Ledger comparisons require the same absolute calendar month.");
  }
  const eventTotal = toEuroAmount(month.specialEvents.reduce((sum, event) => sum + event.amount, 0));
  if (eventTotal !== month.specialEventsTotal || toEuroAmount(month.regularMonthlyTotal + eventTotal) !== month.monthlyTotal) {
    throw new TypeError("Ledger event rows do not reconcile with the monthly cash total.");
  }
  const rows: LedgerRow[] = (month.startingActions ?? []).map((action) => Object.freeze({ kind: LedgerRowKind.Action,
    rowId: action.actionId,
    month,
    action,
    amount: null,
    cumulative: null,
    deltaAmount: null,
    deltaCumulative: null }));
  let cumulative = toEuroAmount(month.cumulatedTotal - month.monthlyTotal);
  let baselineCumulative = baseline ? toEuroAmount(baseline.cumulatedTotal - baseline.monthlyTotal) : toEuroAmount(0);
  const baselineOpening = baselineCumulative;
  for (const event of month.specialEvents) {
    cumulative = toEuroAmount(cumulative + event.amount);
    const matchedIndex = baseline?.specialEvents.findIndex((candidate) => candidate.eventId === event.eventId) ?? -1;
    const matched = matchedIndex < 0 ? undefined : baseline!.specialEvents[matchedIndex];
    if (matched) {
      baselineCumulative = toEuroAmount(baselineOpening + baseline!.specialEvents.slice(0, matchedIndex + 1).reduce((sum, candidate) => sum + candidate.amount, 0));
    }
    rows.push(Object.freeze({ kind: LedgerRowKind.FinancialEvent,
      rowId: event.eventId,
      month,
      event,
      amount: event.amount,
      cumulative,
      deltaAmount: baseline ? toEuroAmount(event.amount - (matched?.amount ?? 0)) : null,
      deltaCumulative: baseline ? toEuroAmount(cumulative - baselineCumulative) : null }));
  }
  rows.push(Object.freeze({ kind: LedgerRowKind.Month,
    rowId: month.monthId,
    month,
    amount: month.regularMonthlyTotal,
    cumulative: month.cumulatedTotal,
    deltaAmount: baseline ? toEuroAmount(month.regularMonthlyTotal - baseline.regularMonthlyTotal) : null,
    deltaCumulative: baseline ? toEuroAmount(month.cumulatedTotal - baseline.cumulatedTotal) : null }));
  return Object.freeze(rows);
}

export function projectScenarioRows(result: SimulationResult, baseline?: SimulationResult): readonly LedgerRow[] {
  const byMonth = new Map(baseline?.months.map((month) => [month.monthId, month]));
  return Object.freeze(result.months.flatMap((month) => projectLedgerMonth(month, byMonth.get(month.monthId))));
}
