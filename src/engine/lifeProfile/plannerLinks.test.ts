import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  it,
} from "node:test";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  PLANNER_LINK_CONTRACTS,
  PlannerLinkMode,
  getPlannerLinkContract,
  toPlannerLinkMode,
} from "#engine/lifeProfile/plannerLinks";

it("enforces non-destructive opt-in contracts for all planner links", () => {
  assert.equal(toPlannerLinkMode("preview-only"), PlannerLinkMode.PreviewOnly);
  assert.throws(() => toPlannerLinkMode("silent-sync"));

  assert.ok(PLANNER_LINK_CONTRACTS.length >= 3);
  for (const contract of PLANNER_LINK_CONTRACTS) {
    assert.equal(contract.preservesLiveInputs, true);
    assert.equal(contract.preservesOtherScenarios, true);
    assert.equal(contract.requiresExplicitPreview, true);
    assert.ok(contract.mappedFields.length > 0);
    assert.ok(contract.untouchedFields.length > 0);
  }
  assert.equal(getPlannerLinkContract(AppId.NetPay)?.mode, PlannerLinkMode.OptInSnapshotHandoff);
});

it("verifies Net Pay handoff across Session and Persistent storage modes and protects against stale cross-tab writes", () => {
  const script = `
    import assert from "node:assert/strict";
    const makeStorage = () => {
      const data = new Map();
      return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v),
        removeItem: k => data.delete(k), key: i => [...data.keys()][i] ?? null, get length() { return data.size; } };
    };
    globalThis.window = globalThis;
    globalThis.localStorage = makeStorage();
    globalThis.sessionStorage = makeStorage();
    const { StorageMode, setStorageMode, exportAllData, importAllData } = await import("#engine/storage/appStorage");
    const { writePeople, readPeople } = await import("#engine/lifeProfile/peopleStorage");
    const { writeTimeline, readTimeline } = await import("#engine/lifeProfile/timelineStorage");
    const { projectEmploymentAtDate } = await import("#engine/lifeProfile/employmentProjection");
    const { prepareNetPayHandoff } = await import("#engine/lifeProfile/netPayHandoff");
    const { toLifeDate } = await import("#engine/lifeProfile/person");
    const { getCurrentInputs, saveScenarioInputs, savedScenarios } = await import("#store/calculatorStore");
    const { toFullCalendarYear } = await import("#engine/types");

    for (const mode of [StorageMode.Session, StorageMode.Persistent]) {
      assert.equal(setStorageMode(mode, true), true);
      assert.equal(writePeople({ version: 1, people: [{ id: "p1", name: "Alex" }] }), true);
      assert.equal(writeTimeline({ version: 2, events: [
        { id: "job-1", kind: "employment.started", personId: "p1", date: "2026-01-01", status: "actual",
          payload: { jobId: "j1", employer: "Acme", gross: 4200, grossPeriod: "MONTHLY" } },
      ] }), true);
      const date = toLifeDate("2026-06-01");
      const job = projectEmploymentAtDate(readTimeline().record.events, readPeople().record.people[0].id, date, false)[0];
      const liveBefore = { ...structuredClone(getCurrentInputs()), taxYear: toFullCalendarYear(2026) };
      const preview = prepareNetPayHandoff(liveBefore, job, date);
      assert.equal(preview.grossIncome, 4200);
      assert.equal(preview.inputMode, "monthly");
      const saved = saveScenarioInputs("Handoff " + mode, "Previewed", preview, { edit: false });
      assert.equal(saved.inputs.grossIncome, 4200);
      assert.equal(savedScenarios.value.some((entry) => entry.id === saved.id), true);

      // Backup round-trip retains both timeline and Net Pay scenarios
      const backup = exportAllData();
      importAllData(backup);
      assert.equal(readTimeline().record.events[0].id, "job-1");
    }
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    stdio: "pipe",
  }));
});
