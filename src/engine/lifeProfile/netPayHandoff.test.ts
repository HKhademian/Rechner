import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  calculateScenarioData,
  getCurrentInputs,
} from "#store/calculatorStore";
import {
  projectEmploymentAtDate,
} from "#engine/lifeProfile/employmentProjection";
import {
  prepareNetPayHandoff,
} from "#engine/lifeProfile/netPayHandoff";
import {
  decodeTimelineRecord,
} from "#engine/lifeProfile/timelineRecord";
import {
  lifeEventCatalog,
} from "#engine/lifeProfile/eventCatalog";
import {
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  SalaryPeriod,
  toFullCalendarYear,
} from "#engine/types";

it("previews a midyear rate as a hypothetical comparison without changing the baseline or payment schedule", () => {
  const events = [{ id: "start",
    kind: "employment.started",
    personId: "p",
    date: "2026-01-01",
    status: "actual",
    payload: { jobId: "job",
      employer: "Example",
      gross: 4000,
      grossPeriod: "MONTHLY" } },
  { id: "raise",
    kind: "employment.changed",
    personId: "p",
    date: "2026-07-01",
    status: "actual",
    payload: { jobId: "job",
      gross: 5000,
      grossPeriod: "MONTHLY" } }];
  const decoded = decodeTimelineRecord(JSON.stringify({ version: 2,
    events }), lifeEventCatalog);
  assert.ok(decoded.record);
  const date = toLifeDate("2026-08-01");
  const job = projectEmploymentAtDate(decoded.record.events, toPersonId("p"), date, false)[0];
  const base = { ...getCurrentInputs(),
    taxYear: toFullCalendarYear(2026),
    workingMonths: 9,
    salariesPerYear: 13 };
  const copy = structuredClone(base);
  const preview = prepareNetPayHandoff(base, job, date);
  assert.equal(preview.grossIncome, 5000);
  assert.equal(preview.inputMode, "monthly");
  assert.equal(preview.workingMonths, 9);
  assert.equal(preview.salariesPerYear, 13);
  assert.equal(calculateScenarioData(preview).person1.grossYearly, 48750);
  assert.deepEqual(base, copy);
  assert.throws(() => prepareNetPayHandoff(base, job, toLifeDate("2027-01-01")));
  assert.throws(() => prepareNetPayHandoff(base, { ...job,
    gross: { ...job.gross,
      value: { ...job.gross.value!,
        period: SalaryPeriod.Yearly } } }, date));
});
