import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  it,
} from "node:test";
import {
  LegacyConfirmationStatus,
  LegacyProfileFieldGroup,
  decodeLegacyConfirmations,
  toLegacyProfileFieldGroup,
} from "#engine/lifeProfile/legacyConfirmation";

it("decodes, validates and protects legacy profile confirmation records", () => {
  assert.equal(toLegacyProfileFieldGroup("household-basics"), LegacyProfileFieldGroup.HouseholdBasics);
  assert.throws(() => toLegacyProfileFieldGroup("unknown"));

  assert.equal(decodeLegacyConfirmations(null).status, LegacyConfirmationStatus.Missing);
  const valid = decodeLegacyConfirmations(JSON.stringify({
    version: 1,
    confirmedGroups: [LegacyProfileFieldGroup.EmploymentGross, LegacyProfileFieldGroup.HouseholdBasics, LegacyProfileFieldGroup.EmploymentGross],
  }));
  assert.equal(valid.status, LegacyConfirmationStatus.Valid);
  assert.deepEqual(valid.record?.confirmedGroups, [
    LegacyProfileFieldGroup.EmploymentGross,
    LegacyProfileFieldGroup.HouseholdBasics,
  ]);
  assert.equal(decodeLegacyConfirmations(JSON.stringify({ version: 2,
    confirmedGroups: [] })).status, LegacyConfirmationStatus.Unsupported);
  assert.equal(decodeLegacyConfirmations(JSON.stringify({ version: 1,
    confirmedGroups: ["bad"] })).status, LegacyConfirmationStatus.Invalid);
});

it("round-trips legacy confirmations through backup/restore and preserves older backups", () => {
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
    const conf = await import("#engine/lifeProfile/legacyConfirmation");
    const confStore = await import("#engine/lifeProfile/legacyConfirmationStorage");
    setStorageMode(StorageMode.Session, true);
    assert.equal(confStore.writeLegacyConfirmations({ version: 1, confirmedGroups: [conf.LegacyProfileFieldGroup.HouseholdBasics] }), true);
    const backup = exportAllData();
    assert.equal(confStore.writeLegacyConfirmations({ version: 1, confirmedGroups: [] }), true);
    importAllData(backup);
    assert.deepEqual(confStore.readLegacyConfirmations().record.confirmedGroups, [conf.LegacyProfileFieldGroup.HouseholdBasics]);
    // Older backup without legacy confirmations preserves existing confirmations
    importAllData(JSON.stringify({ format: "rechner-backup", version: 1, entries: {} }));
    assert.deepEqual(confStore.readLegacyConfirmations().record.confirmedGroups, [conf.LegacyProfileFieldGroup.HouseholdBasics]);
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    stdio: "pipe",
  }));
});
