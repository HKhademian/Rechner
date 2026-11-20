import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toEuroCents,
} from "#engine/types";
import {
  type CashEventPayload,
  CashDirection,
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";
import {
  CashReconciliationStatus,
  comparePlannedAndActualCash,
  openPlannedCashEvents,
  reconciledPlannedByActualId,
  reconciledPlannedIds,
  reconcilingActualByPlannedId,
  toCashReconciliationStatus,
} from "#engine/lifeProfile/cashReconciliation";
import {
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  LifeEventStatus,
  toLifeEventDate,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";

function makeCashEvent(
  id: string,
  personId: string,
  date: string,
  status: LifeEventStatus,
  payload: CashEventPayload,
): LifeEvent<CashEventPayload> {
  return {
    id: toLifeEventId(id),
    personId: toPersonId(personId),
    kind: cashEventModule.kind,
    date: toLifeEventDate(date),
    status,
    payload,
  };
}

it("compares planned and actual cash amounts exactly, including direction and date changes", () => {
  assert.equal(toCashReconciliationStatus("reconciled"), CashReconciliationStatus.Reconciled);
  assert.throws(() => toCashReconciliationStatus("unknown"));

  const plannedExpense = makeCashEvent("plan-1", "p", "2026-11-10", LifeEventStatus.Planned, {
    title: "Utility bill",
    direction: CashDirection.Outflow,
    amount: toEuroCents(10000),
  });
  const actualExpense = makeCashEvent("actual-1", "p", "2026-11-12", LifeEventStatus.Actual, {
    title: "Utility bill",
    direction: CashDirection.Outflow,
    amount: toEuroCents(11050),
    reconcilesEventId: plannedExpense.id,
  });

  const variance = comparePlannedAndActualCash(plannedExpense, actualExpense);
  assert.equal(variance.sameDirection, true);
  assert.equal(variance.dateChanged, true);
  assert.equal(variance.amountDifference, 1050);
  assert.equal(variance.netImpactDifference, -1050);

  const lowerExpense = makeCashEvent("actual-2", "p", "2026-11-10", LifeEventStatus.Actual, {
    title: "Utility bill",
    direction: CashDirection.Outflow,
    amount: toEuroCents(8500),
    reconcilesEventId: plannedExpense.id,
  });
  const underBudget = comparePlannedAndActualCash(plannedExpense, lowerExpense);
  assert.equal(underBudget.dateChanged, false);
  assert.equal(underBudget.amountDifference, -1500);
  assert.equal(underBudget.netImpactDifference, 1500);

  const flippedToRefund = makeCashEvent("actual-3", "p", "2026-11-15", LifeEventStatus.Actual, {
    title: "Utility refund",
    direction: CashDirection.Inflow,
    amount: toEuroCents(2000),
    reconcilesEventId: plannedExpense.id,
  });
  const flipped = comparePlannedAndActualCash(plannedExpense, flippedToRefund);
  assert.equal(flipped.sameDirection, false);
  assert.equal(flipped.amountDifference, undefined);
  assert.equal(flipped.netImpactDifference, 12000);

  // Rejects mismatched or overflow inputs
  assert.throws(() => comparePlannedAndActualCash(plannedExpense, makeCashEvent("actual-4", "p", "2026-11-10", LifeEventStatus.Actual, {
    title: "Unlinked",
    direction: CashDirection.Outflow,
    amount: toEuroCents(10000),
  })));
  const maxPlanned = makeCashEvent("plan-max", "p", "2026-11-10", LifeEventStatus.Planned, {
    title: "Max outflow",
    direction: CashDirection.Outflow,
    amount: toEuroCents(Number.MAX_SAFE_INTEGER),
  });
  const maxActual = makeCashEvent("actual-max", "p", "2026-11-10", LifeEventStatus.Actual, {
    title: "Max inflow",
    direction: CashDirection.Inflow,
    amount: toEuroCents(Number.MAX_SAFE_INTEGER),
    reconcilesEventId: maxPlanned.id,
  });
  assert.throws(() => comparePlannedAndActualCash(maxPlanned, maxActual));
});

it("indexes reconciled links and lists open planned cash entries for separate linking", () => {
  const person = toPersonId("p");
  const planSettled = makeCashEvent("plan-1", "p", "2026-11-05", LifeEventStatus.Planned, {
    title: "Rent",
    direction: CashDirection.Outflow,
    amount: toEuroCents(100000),
  });
  const planOpen = makeCashEvent("plan-2", "p", "2026-11-20", LifeEventStatus.Planned, {
    title: "Bonus",
    direction: CashDirection.Inflow,
    amount: toEuroCents(50000),
  });
  const otherPersonPlan = makeCashEvent("plan-other", "q", "2026-11-20", LifeEventStatus.Planned, {
    title: "Other",
    direction: CashDirection.Outflow,
    amount: toEuroCents(1000),
  });
  const actualSettling = makeCashEvent("actual-1", "p", "2026-11-06", LifeEventStatus.Actual, {
    title: "Rent",
    direction: CashDirection.Outflow,
    amount: toEuroCents(102500),
    reconcilesEventId: planSettled.id,
  });
  const events = [planSettled, planOpen, otherPersonPlan, actualSettling];

  assert.deepEqual([...reconciledPlannedIds(events, person)], [planSettled.id]);
  assert.equal(reconcilingActualByPlannedId(events, person).get(planSettled.id)?.id, actualSettling.id);
  assert.equal(reconciledPlannedByActualId(events, person).get(actualSettling.id)?.id, planSettled.id);
  assert.deepEqual(openPlannedCashEvents(events, person).map((entry) => entry.id), [planOpen.id]);
  assert.deepEqual(
    openPlannedCashEvents(events, person, actualSettling.id).map((entry) => entry.id),
    [planSettled.id, planOpen.id],
  );
});
