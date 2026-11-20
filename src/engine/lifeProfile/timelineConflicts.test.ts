import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  SalaryPeriod,
  toEuroCents,
  toGrossSalary,
  toWorkingHours,
} from "#engine/types";
import {
  CashDirection,
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";
import {
  jobChangedModule,
  jobStartedModule,
  toLifeJobId,
} from "#engine/lifeProfile/employmentEvent";
import {
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  residenceMoveModule,
  toPlaceId,
} from "#engine/lifeProfile/residenceEvent";
import {
  LifeEventStatus,
  toLifeEventDate,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";
import {
  TimelineConflictKind,
  detectTimelineConflicts,
} from "#engine/lifeProfile/timelineConflicts";

it("detects same-day job/move conflicts, incomplete dates, and unlinked duplicate cash entries", () => {
  const person = toPersonId("p");
  const jobId = toLifeJobId("job-1");
  const events = [
    {
      id: toLifeEventId("job-start"),
      personId: person,
      kind: jobStartedModule.kind,
      date: toLifeEventDate("2026-01-01"),
      status: LifeEventStatus.Actual,
      payload: { jobId,
        employer: "Acme",
        gross: toGrossSalary(4000),
        grossPeriod: SalaryPeriod.Monthly,
        weeklyHours: toWorkingHours(40) },
    },
    {
      id: toLifeEventId("change-a"),
      personId: person,
      kind: jobChangedModule.kind,
      date: toLifeEventDate("2026-06-01"),
      status: LifeEventStatus.Actual,
      payload: { jobId,
        gross: toGrossSalary(4500),
        grossPeriod: SalaryPeriod.Monthly },
    },
    {
      id: toLifeEventId("change-b"),
      personId: person,
      kind: jobChangedModule.kind,
      date: toLifeEventDate("2026-06-01"),
      status: LifeEventStatus.Actual,
      payload: { jobId,
        gross: toGrossSalary(4800),
        grossPeriod: SalaryPeriod.Monthly },
    },
    {
      id: toLifeEventId("move-1"),
      personId: person,
      kind: residenceMoveModule.kind,
      date: toLifeEventDate("2026-08-01"),
      status: LifeEventStatus.Actual,
      payload: { placeId: toPlaceId("pl-1"),
        location: "Berlin" },
    },
    {
      id: toLifeEventId("move-2"),
      personId: person,
      kind: residenceMoveModule.kind,
      date: toLifeEventDate("2026-08-01"),
      status: LifeEventStatus.Actual,
      payload: { placeId: toPlaceId("pl-2"),
        location: "Munich" },
    },
    {
      id: toLifeEventId("move-partial"),
      personId: person,
      kind: residenceMoveModule.kind,
      date: toLifeEventDate("2027"),
      status: LifeEventStatus.Planned,
      payload: { placeId: toPlaceId("pl-3"),
        location: "Hamburg" },
    },
    {
      id: toLifeEventId("cash-plan"),
      personId: person,
      kind: cashEventModule.kind,
      date: toLifeEventDate("2026-11-10"),
      status: LifeEventStatus.Planned,
      payload: { title: "Rent",
        direction: CashDirection.Outflow,
        amount: toEuroCents(100000) },
    },
    {
      id: toLifeEventId("cash-actual-unlinked"),
      personId: person,
      kind: cashEventModule.kind,
      date: toLifeEventDate("2026-11-10"),
      status: LifeEventStatus.Actual,
      payload: { title: "Rent",
        direction: CashDirection.Outflow,
        amount: toEuroCents(100000) },
    },
  ];

  const conflicts = detectTimelineConflicts(events);
  const kinds = conflicts.map((conflict) => conflict.kind);
  assert.equal(kinds.includes(TimelineConflictKind.SameDayJobPayConflict), true);
  assert.equal(kinds.includes(TimelineConflictKind.SameDayMoveConflict), true);
  assert.equal(kinds.includes(TimelineConflictKind.IncompleteEventDate), true);
  assert.equal(kinds.includes(TimelineConflictKind.PossibleDuplicateCash), true);

  // Once the actual cash entry reconciles the planned entry, it is no longer flagged as duplicate
  const reconciled = events.map((entry) => entry.id === toLifeEventId("cash-actual-unlinked")
    ? { ...entry,
      payload: { ...entry.payload,
        reconcilesEventId: toLifeEventId("cash-plan") } }
    : entry);
  assert.equal(
    detectTimelineConflicts(reconciled).some((conflict) => conflict.kind === TimelineConflictKind.PossibleDuplicateCash),
    false,
  );
});
