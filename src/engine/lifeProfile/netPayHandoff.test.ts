import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  it,
} from "node:test";
import {
  calculateScenarioData,
  getCurrentInputs,
  saveScenarioInputs,
  savedScenarios,
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
  const liveBefore = structuredClone(getCurrentInputs());
  const savedBefore = savedScenarios.peek().length;
  const scenario = saveScenarioInputs("Profile example", "Constant monthly rate", preview, { edit: false });
  assert.equal(savedScenarios.peek().length, savedBefore + 1);
  assert.equal(scenario.inputs.grossIncome, 5000);
  assert.deepEqual(getCurrentInputs(), liveBefore);
  assert.throws(() => prepareNetPayHandoff(base, job, toLifeDate("2027-01-01")));
  assert.throws(() => prepareNetPayHandoff(base, { ...job,
    gross: { ...job.gross,
      value: { ...job.gross.value!,
        period: SalaryPeriod.Yearly } } }, date));
});

it("connects saved profile events to a new comparison without replacing live inputs", () => {
  const script = `
    import assert from "node:assert/strict";
    const makeStorage = () => {
      const values = new Map();
      return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key), key: index => [...values.keys()][index] ?? null,
        get length() { return values.size; } };
    };
    globalThis.window = globalThis;
    globalThis.localStorage = makeStorage();
    globalThis.sessionStorage = makeStorage();
    const { StorageMode, setStorageMode } = await import("#engine/storage/appStorage");
    setStorageMode(StorageMode.Session, true);
    const { writePeople, readPeople } = await import("#engine/lifeProfile/peopleStorage");
    const { writeTimeline, readTimeline } = await import("#engine/lifeProfile/timelineStorage");
    const { projectEmploymentAtDate } = await import("#engine/lifeProfile/employmentProjection");
    const { prepareNetPayHandoff } = await import("#engine/lifeProfile/netPayHandoff");
    const { toLifeDate } = await import("#engine/lifeProfile/person");
    const { getCurrentInputs, saveScenarioInputs, savedScenarios } = await import("#store/calculatorStore");
    assert.equal(writePeople({ version: 1, people: [{ id: "p", name: "Alex" }] }), true);
    assert.equal(writeTimeline({ version: 2, events: [
      { id: "start", kind: "employment.started", personId: "p", date: "2026-01-01", status: "actual",
        payload: { jobId: "job", employer: "Example", gross: 4000, grossPeriod: "MONTHLY" } },
      { id: "raise", kind: "employment.changed", personId: "p", date: "2026-07-01", status: "actual",
        payload: { jobId: "job", gross: 5000, grossPeriod: "MONTHLY" } }
    ] }), true);
    const date = toLifeDate("2026-08-01");
    const job = projectEmploymentAtDate(readTimeline().record.events, readPeople().record.people[0].id, date, false)[0];
    const live = structuredClone(getCurrentInputs());
    const preview = prepareNetPayHandoff(live, job, date);
    const saved = saveScenarioInputs("Profile comparison", "Example", preview, { edit: false });
    assert.equal(saved.inputs.grossIncome, 5000);
    assert.equal(savedScenarios.value.at(-1).id, saved.id);
    assert.deepEqual(getCurrentInputs(), live);
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    stdio: "pipe",
  }));
});
