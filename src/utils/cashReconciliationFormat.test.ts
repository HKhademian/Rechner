import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toEuroCents,
} from "#engine/types";
import {
  CashDirection,
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";
import {
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  LifeEventStatus,
  toLifeEventDate,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";
import {
  formatCashReconciliationNote,
} from "#utils/cashReconciliationFormat";

it("formats exact planned-vs-actual variance notes for matched, changed, and direction-flipped cash entries", () => {
  const person = toPersonId("p");
  const planned = {
    id: toLifeEventId("plan-1"),
    personId: person,
    kind: cashEventModule.kind,
    date: toLifeEventDate("2026-11-10"),
    status: LifeEventStatus.Planned,
    payload: {
      title: "Expense",
      direction: CashDirection.Outflow,
      amount: toEuroCents(10000),
    },
  };
  const actualHigher = {
    id: toLifeEventId("actual-1"),
    personId: person,
    kind: cashEventModule.kind,
    date: toLifeEventDate("2026-11-12"),
    status: LifeEventStatus.Actual,
    payload: {
      title: "Expense",
      direction: CashDirection.Outflow,
      amount: toEuroCents(11050),
      reconcilesEventId: planned.id,
    },
  };
  assert.equal(
    formatCashReconciliationNote(planned, actualHigher),
    "Reconciles planned 100,00\u00a0€ on 2026-11-10 (+10,50\u00a0€)",
  );

  const actualMatched = {
    ...actualHigher,
    date: toLifeEventDate("2026-11-10"),
    payload: {
      ...actualHigher.payload,
      amount: toEuroCents(10000),
    },
  };
  assert.equal(
    formatCashReconciliationNote(planned, actualMatched),
    "Reconciles planned 100,00\u00a0€ (matched)",
  );

  const actualFlipped = {
    ...actualHigher,
    payload: {
      ...actualHigher.payload,
      direction: CashDirection.Inflow,
      amount: toEuroCents(2500),
    },
  };
  assert.equal(
    formatCashReconciliationNote(planned, actualFlipped),
    "Reconciles planned expense 100,00\u00a0€ on 2026-11-10 (direction changed)",
  );
});
