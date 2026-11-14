import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  describe,
  it,
} from "node:test";
import {
  deserializeUnifiedLifeProfile,
  serializeUnifiedLifeProfile,
} from "#engine/lifeProfile/storage";
import {
  createDefaultUnifiedLifeProfile,
} from "#engine/lifeProfile/types";
import {
  toGrossSalary,
} from "#engine/types";

describe("Unified Life Profile Storage Serialization & Privacy Mode Isolation", () => {
  it("round-trips serialized profiles and rejects invalid JSON payloads", () => {
    const profile = {
      ...createDefaultUnifiedLifeProfile(),
      primaryAnnualGrossEur: toGrossSalary(82000),
      dependentChildrenCount: 3,
    };
    const json = serializeUnifiedLifeProfile(profile);
    const restored = deserializeUnifiedLifeProfile(json);
    assert.ok(restored);
    assert.equal(restored.primaryAnnualGrossEur, 82000);
    assert.equal(restored.dependentChildrenCount, 3);
    assert.equal(deserializeUnifiedLifeProfile("not-json{"), null);
    assert.equal(deserializeUnifiedLifeProfile("[]"), null);
  });

  it("persists under rechner:life-profile:v1: only when storage mode allows and never touches app keys", () => {
    const script = `
      import assert from "node:assert/strict";
      const localMap = new Map();
      const sessionMap = new Map();
      globalThis.window = globalThis;
      globalThis.localStorage = { getItem: k => localMap.get(k) ?? null, setItem: (k, v) => localMap.set(k, v), removeItem: k => localMap.delete(k) };
      globalThis.sessionStorage = { getItem: k => sessionMap.get(k) ?? null, setItem: (k, v) => sessionMap.set(k, v), removeItem: k => sessionMap.delete(k) };

      const { StorageMode, setStorageMode } = await import("#engine/storage/appStorage");
      const { LIFE_PROFILE_STORAGE_KEY } = await import("#engine/lifeProfile/types");
      const { readUnifiedLifeProfile, writeUnifiedLifeProfile, clearUnifiedLifeProfile } = await import("#engine/lifeProfile/storage");

      // Memory mode: never writes to browser storage
      assert.equal(readUnifiedLifeProfile().primaryAnnualGrossEur, 65000);
      assert.equal(localMap.size, 0);
      assert.equal(writeUnifiedLifeProfile({ ...readUnifiedLifeProfile(), primaryAnnualGrossEur: 90000 }), false);
      assert.equal(localMap.size, 0);

      // Persistent mode: writes exclusively to rechner:life-profile:v1:profile
      assert.equal(setStorageMode(StorageMode.Persistent, true), true);
      const keysBeforeWrite = new Set(localMap.keys());
      assert.equal(writeUnifiedLifeProfile({ ...readUnifiedLifeProfile(), primaryAnnualGrossEur: 91000 }), true);
      const addedKeys = [...localMap.keys()].filter(k => !keysBeforeWrite.has(k));
      assert.deepEqual(addedKeys, [LIFE_PROFILE_STORAGE_KEY]);
      assert.equal(readUnifiedLifeProfile().primaryAnnualGrossEur, 91000);

      clearUnifiedLifeProfile();
      assert.equal(localMap.has(LIFE_PROFILE_STORAGE_KEY), false);
    `;
    assert.doesNotThrow(() =>
      execFileSync(process.execPath, ["--input-type=module", "-e", script], {
        cwd: process.cwd(),
        stdio: "pipe",
      }));
  });
});
