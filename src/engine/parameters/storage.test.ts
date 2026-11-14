import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  describe,
  it,
} from "node:test";
import {
  SHARED_PARAMETERS_STORAGE_KEY,
  deserializeSharedParameterSnapshot,
  serializeSharedParameterSnapshot,
} from "#engine/parameters/storage";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  toFullCalendarYear,
} from "#engine/types";

describe("Shared Parameter Storage Serialization & Validation", () => {
  it("serializes and deserializes active parameter year and valid Customizable overrides cleanly", () => {
    const serialized = serializeSharedParameterSnapshot(
      toFullCalendarYear(2025),
      {
        [ParameterId.Tax_HealthSupplementTotalRate]: 0.031,
        [ParameterId.Convention_MotherOrdinaryPlusMonths]: 8,
      },
    );

    const parsed = deserializeSharedParameterSnapshot(serialized);
    assert.ok(parsed);
    assert.equal(parsed.year, 2025);
    assert.equal(parsed.overrides[ParameterId.Tax_HealthSupplementTotalRate], 0.031);
    assert.equal(parsed.overrides[ParameterId.Convention_MotherOrdinaryPlusMonths], 8);
  });

  it("strips locked statutory parameters, invalid IDs, and out-of-bounds values during deserialization", () => {
    const untrustedPayload = JSON.stringify({
      version: 1,
      year: 2026,
      overrides: {
        [ParameterId.Tax_BasicAllowance]: 99999,
        [ParameterId.Benefit_BasisMaximum]: 5000,
        [ParameterId.Convention_MotherOrdinaryPlusMonths]: -4,
        [ParameterId.Tax_HealthSupplementTotalRate]: 0.033,
        "unknown.fake": 123,
      },
    });

    const parsed = deserializeSharedParameterSnapshot(untrustedPayload);
    assert.ok(parsed);
    assert.equal(parsed.year, 2026);
    assert.equal(parsed.overrides[ParameterId.Tax_BasicAllowance], undefined);
    assert.equal(parsed.overrides[ParameterId.Benefit_BasisMaximum], undefined);
    assert.equal(parsed.overrides[ParameterId.Convention_MotherOrdinaryPlusMonths], undefined);
    assert.equal(parsed.overrides[ParameterId.Tax_HealthSupplementTotalRate], 0.033);
    assert.equal(SHARED_PARAMETERS_STORAGE_KEY, "rechner:shared:parameters:v1");
  });

  it("returns null on malformed JSON or unsupported schema versions", () => {
    assert.equal(deserializeSharedParameterSnapshot("not valid json"), null);
    assert.equal(deserializeSharedParameterSnapshot(JSON.stringify({ version: 2,
      year: 2026 })), null);
    assert.equal(deserializeSharedParameterSnapshot(null), null);
  });

  it("persists shared parameters under rechner:shared: without writing on memory mode or polluting app stores", () => {
    const script = `
      import assert from "node:assert/strict";
      const localMap = new Map();
      const sessionMap = new Map();
      globalThis.window = globalThis;
      globalThis.localStorage = { getItem: k => localMap.get(k) ?? null, setItem: (k, v) => localMap.set(k, v), removeItem: k => localMap.delete(k) };
      globalThis.sessionStorage = { getItem: k => sessionMap.get(k) ?? null, setItem: (k, v) => sessionMap.set(k, v), removeItem: k => sessionMap.delete(k) };

      const store = await import("#store/parameterStore");
      assert.equal(localMap.size, 0);
      assert.equal(sessionMap.size, 0);

      store.modifyParameterValue("tax.healthSupplementTotalRate", 0.033);
      assert.equal(localMap.size, 0);
      assert.equal(sessionMap.size, 0);

      const { setStorageMode, StorageMode } = await import("#engine/storage/appStorage");
      assert.equal(setStorageMode(StorageMode.Session, false), true);
      store.setParameterYear(2025);
      store.modifyParameterValue("convention.motherOrdinaryPlusMonths", 9);

      const raw = sessionMap.get("rechner:shared:parameters:v1");
      assert.ok(raw);
      assert.equal(localMap.size, 0);
      assert.equal([...sessionMap.keys()].some(k => k.startsWith("rechner:net-pay:") || k.startsWith("rechner:parental-leave:")), false);

      store.resetAllParameterOverrides();
      assert.equal(sessionMap.get("rechner:shared:parameters:v1"), undefined);
    `;
    assert.doesNotThrow(() =>
      execFileSync(process.execPath, ["--input-type=module", "-e", script], {
        cwd: process.cwd(),
        stdio: "pipe",
      }));
  });
});
