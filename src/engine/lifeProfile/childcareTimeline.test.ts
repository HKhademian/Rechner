import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  ChildcareApplicationStatus,
  ChildcareFacilityKind,
  childcarePlanModule,
} from "#engine/lifeProfile/childcareEvent";
import {
  ChildcareDeadlineKind,
  summarizeChildcareTimeline,
} from "#engine/lifeProfile/childcareTimeline";
import {
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  LifeEventStatus,
  toLifeEventDate,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";
import {
  toEuroCents,
} from "#engine/types";

it("summarizes local Kita/Krippe options, sorts deadlines and calculates monthly/annual costs", () => {
  const childId = toPersonId("child-1");
  const events = [
    {
      id: toLifeEventId("opt-1"),
      kind: childcarePlanModule.kind,
      personId: childId,
      date: toLifeEventDate("2027-09-01"),
      status: LifeEventStatus.Planned,
      payload: {
        facilityKind: ChildcareFacilityKind.Krippe,
        providerName: "Krippe Nord",
        municipality: "Munich",
        desiredStartDate: toLifeDate("2027-09-01"),
        applicationDeadline: toLifeDate("2027-02-15"),
        applicationStatus: ChildcareApplicationStatus.Shortlisted,
        monthlyFeeCents: toEuroCents(30000),
        monthlyMealCents: toEuroCents(9000),
      },
    },
    {
      id: toLifeEventId("opt-2"),
      kind: childcarePlanModule.kind,
      personId: childId,
      date: toLifeEventDate("2026-09-01"),
      status: LifeEventStatus.Actual,
      payload: {
        facilityKind: ChildcareFacilityKind.Kita,
        providerName: "Kita Mitte",
        desiredStartDate: toLifeDate("2026-09-01"),
        applicationStatus: ChildcareApplicationStatus.Enrolled,
        monthlyFeeCents: toEuroCents(15000),
        monthlyMealCents: toEuroCents(7500),
      },
    },
  ];

  const summary = summarizeChildcareTimeline({
    events,
    asOf: toLifeDate("2027-02-01"),
    includePlanned: true,
  });

  assert.equal(summary.options.length, 2);
  assert.equal(summary.enrolledMonthlyTotalCents, 22500);
  assert.equal(summary.enrolledAnnualTotalCents, 270000);
  assert.equal(summary.minShortlistedMonthlyCents, 39000);
  assert.equal(summary.maxShortlistedMonthlyCents, 39000);
  assert.equal(summary.deadlines[0].providerName, "Kita Mitte");
  assert.equal(summary.deadlines[1].kind, ChildcareDeadlineKind.Application);
  assert.equal(summary.deadlines[1].daysUntil, 14);
});
