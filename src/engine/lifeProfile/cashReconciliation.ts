import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  type CashEventPayload,
  CashDirection,
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";
import {
  type PersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  type LifeEventId,
  LifeEventStatus,
  orderLifeEvents,
} from "#engine/lifeProfile/timeline";

export const CashReconciliationStatus = {
  UnmatchedPlanned: "unmatched-planned",
  Reconciled: "reconciled",
  StandaloneActual: "standalone-actual",
} as const;
export type CashReconciliationStatus = (typeof CashReconciliationStatus)[keyof typeof CashReconciliationStatus];

export function toCashReconciliationStatus(value: string): CashReconciliationStatus {
  if (!Object.values(CashReconciliationStatus).includes(value as CashReconciliationStatus)) {
    throw new TypeError("Invalid cash reconciliation status.");
  }
  return value as CashReconciliationStatus;
}

export interface CashVariance {
  readonly planned: LifeEvent<CashEventPayload>;
  readonly actual: LifeEvent<CashEventPayload>;
  readonly sameDirection: boolean;
  readonly dateChanged: boolean;
  /** Signed actual minus planned amount when both entries share the same cash direction. */
  readonly amountDifference?: EuroCents;
  /** Signed net cash balance impact difference (actual signed flow minus planned signed flow). */
  readonly netImpactDifference: EuroCents;
}

function toSafeCents(value: bigint): EuroCents {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new TypeError("Cash variance exceeds the supported safe integer cent range.");
  }
  return toEuroCents(Number(value));
}

function signedFlow(payload: CashEventPayload): bigint {
  const cents = BigInt(payload.amount);
  return payload.direction === CashDirection.Inflow ? cents : -cents;
}

function scopedCashEvents(
  events: readonly LifeEvent<unknown>[],
  personId?: PersonId,
): readonly LifeEvent<CashEventPayload>[] {
  return orderLifeEvents(events.filter((event) => event.kind === cashEventModule.kind
    && (personId === undefined || event.personId === personId)))
    .map((event) => ({
      ...event,
      payload: cashEventModule.parsePayload(event.payload),
    }));
}

/** Maps each reconciled planned cash event ID to the actual cash event that settles it. */
export function reconcilingActualByPlannedId(
  events: readonly LifeEvent<unknown>[],
  personId?: PersonId,
): ReadonlyMap<LifeEventId, LifeEvent<CashEventPayload>> {
  const cash = scopedCashEvents(events, personId);
  const plannedById = new Map<LifeEventId, LifeEvent<CashEventPayload>>();
  for (const event of cash) {
    if (event.status === LifeEventStatus.Planned) {
      plannedById.set(event.id, event);
    }
  }
  const links = new Map<LifeEventId, LifeEvent<CashEventPayload>>();
  for (const event of cash) {
    const plannedId = event.payload.reconcilesEventId;
    if (event.status !== LifeEventStatus.Actual || plannedId === undefined) {
      continue;
    }
    const planned = plannedById.get(plannedId);
    if (planned && planned.personId === event.personId) {
      links.set(planned.id, event);
    }
  }
  return links;
}

/** Maps each reconciling actual cash event ID to the planned cash event it settles. */
export function reconciledPlannedByActualId(
  events: readonly LifeEvent<unknown>[],
  personId?: PersonId,
): ReadonlyMap<LifeEventId, LifeEvent<CashEventPayload>> {
  const cash = scopedCashEvents(events, personId);
  const plannedById = new Map<LifeEventId, LifeEvent<CashEventPayload>>();
  for (const event of cash) {
    if (event.status === LifeEventStatus.Planned) {
      plannedById.set(event.id, event);
    }
  }
  const links = new Map<LifeEventId, LifeEvent<CashEventPayload>>();
  for (const event of cash) {
    const plannedId = event.payload.reconcilesEventId;
    if (event.status !== LifeEventStatus.Actual || plannedId === undefined) {
      continue;
    }
    const planned = plannedById.get(plannedId);
    if (planned && planned.personId === event.personId) {
      links.set(event.id, planned);
    }
  }
  return links;
}

/** Returns planned cash event IDs that have been reconciled by an actual entry. */
export function reconciledPlannedIds(
  events: readonly LifeEvent<unknown>[],
  personId?: PersonId,
): ReadonlySet<LifeEventId> {
  return new Set(reconcilingActualByPlannedId(events, personId).keys());
}

/** Lists open (unreconciled) planned cash entries for a person, optionally keeping the target currently linked to an edited actual entry. */
export function openPlannedCashEvents(
  events: readonly LifeEvent<unknown>[],
  personId: PersonId,
  includeLinkedToActualId?: LifeEventId,
): readonly LifeEvent<CashEventPayload>[] {
  const cash = scopedCashEvents(events, personId);
  const settledBy = reconcilingActualByPlannedId(cash, personId);
  return cash.filter((event) => {
    if (event.status !== LifeEventStatus.Planned) {
      return false;
    }
    const linkedActual = settledBy.get(event.id);
    return linkedActual === undefined || linkedActual.id === includeLinkedToActualId;
  });
}

/** Compares a reconciled planned cash entry against its actual transaction in exact integer cents. */
export function comparePlannedAndActualCash(
  planned: LifeEvent<CashEventPayload>,
  actual: LifeEvent<CashEventPayload>,
): CashVariance {
  if (planned.status !== LifeEventStatus.Planned || actual.status !== LifeEventStatus.Actual) {
    throw new TypeError("Cash reconciliation requires a planned entry and an actual entry.");
  }
  if (planned.personId !== actual.personId) {
    throw new TypeError("Reconciled cash entries must belong to the same person.");
  }
  if (actual.payload.reconcilesEventId !== planned.id) {
    throw new TypeError("Actual cash entry does not reference this planned entry.");
  }
  const sameDirection = planned.payload.direction === actual.payload.direction;
  const amountDifference = sameDirection
    ? toSafeCents(BigInt(actual.payload.amount) - BigInt(planned.payload.amount))
    : undefined;
  const netImpactDifference = toSafeCents(signedFlow(actual.payload) - signedFlow(planned.payload));
  return Object.freeze({
    planned,
    actual,
    sameDirection,
    dateChanged: planned.date !== actual.date,
    ...(amountDifference === undefined ? {} : { amountDifference }),
    netImpactDifference,
  });
}
