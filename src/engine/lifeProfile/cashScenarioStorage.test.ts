import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  it,
} from "node:test";

it("round-trips named scenarios and projections in every storage mode without overwriting unknown or stale data", () => {
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
    const { StorageMode, setStorageMode, browserWebStorageForCurrentMode, exportAllData, importAllData } = await import("#engine/storage/appStorage");
    const { CASH_SCENARIO_STORAGE_KEY, CashScenarioStatus, decodeCashScenarios } = await import("#engine/lifeProfile/cashScenarioRecord");
    const { readCashScenarios, writeCashScenarios } = await import("#engine/lifeProfile/cashScenarioStorage");
    const { projectCashFlow } = await import("#engine/lifeProfile/cashFlowProjection");
    const { toReplayMonth } = await import("#engine/lifeProfile/monthlyReplay");
    const blank = { version: 1, scenarios: [] };
    const one = { version: 1, scenarios: [{ id: "first", name: "Plan", origin: "2026-11", opening: 100000, inflow: 300000, expense: 200000 }] };
    const changed = { version: 1, scenarios: [{ ...one.scenarios[0], name: "Updated", expense: 400000 }] };
    const start = toReplayMonth(2026, 11), through = toReplayMonth(2027, 4);
    const project = scenario => projectCashFlow(start, start, through, scenario.opening, { inflow: scenario.inflow, expense: scenario.expense });
    for (const mode of [StorageMode.Memory, StorageMode.Session, StorageMode.Persistent]) {
      assert.equal(setStorageMode(mode, true), true);
      const storage = browserWebStorageForCurrentMode();
      storage.removeItem(CASH_SCENARIO_STORAGE_KEY);
      assert.equal(writeCashScenarios(one, blank), true);
      const backup = exportAllData();
      const expected = project(readCashScenarios().record.scenarios[0]);
      assert.equal(writeCashScenarios(changed, one), true);
      assert.equal(writeCashScenarios(one, one), false);
      importAllData(backup);
      assert.deepEqual(project(readCashScenarios().record.scenarios[0]), expected);
      importAllData(JSON.stringify({ format: "rechner-backup", version: 1, entries: {} }));
      assert.equal(readCashScenarios().record.scenarios[0].name, "Plan");
      if (mode === StorageMode.Persistent) {
        assert.equal(writeCashScenarios(changed, one), true);
        const originalSet = storage.setItem;
        let fail = true;
        storage.setItem = (key, value) => {
          if (key === CASH_SCENARIO_STORAGE_KEY && fail) { fail = false; throw new Error("disk full"); }
          originalSet(key, value);
        };
        assert.throws(() => importAllData(backup));
        storage.setItem = originalSet;
        assert.equal(readCashScenarios().record.scenarios[0].name, "Updated");
      }
      assert.equal(decodeCashScenarios(JSON.stringify({version: 1, scenarios: [{...one.scenarios[0], extra: true}]})).status, CashScenarioStatus.Unsupported);
      storage.setItem(CASH_SCENARIO_STORAGE_KEY, '{"version":2,"scenarios":[]}');
      assert.equal(writeCashScenarios(one, blank), false);
      assert.throws(() => importAllData(backup));
      assert.equal(storage.getItem(CASH_SCENARIO_STORAGE_KEY), '{"version":2,"scenarios":[]}');
      storage.removeItem(CASH_SCENARIO_STORAGE_KEY);
    }
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: process.cwd(),
    stdio: "pipe" }));
});
