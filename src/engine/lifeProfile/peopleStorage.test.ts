import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  it,
} from "node:test";

it("keeps people portable and refuses to overwrite unsupported records in each storage mode", () => {
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
    const { PEOPLE_STORAGE_KEY, PeopleRecordStatus } = await import("#engine/lifeProfile/peopleRecord");
    const { readPeople, writePeople } = await import("#engine/lifeProfile/peopleStorage");
    const person = { version: 1, people: [{ id: "one", name: "Alex" }] };
    for (const mode of [StorageMode.Memory, StorageMode.Session, StorageMode.Persistent]) {
      assert.equal(setStorageMode(mode, true), true);
      assert.equal(writePeople(person), true);
      const backup = exportAllData();
      assert.equal(writePeople({ version: 1, people: [] }), true);
      importAllData(backup);
      assert.equal(readPeople().record.people[0].name, "Alex");
      const storage = browserWebStorageForCurrentMode();
      storage.setItem(PEOPLE_STORAGE_KEY, '{"version":2,"people":[]}');
      assert.equal(readPeople().status, PeopleRecordStatus.Unsupported);
      assert.equal(writePeople(person), false);
      assert.equal(storage.getItem(PEOPLE_STORAGE_KEY), '{"version":2,"people":[]}');
      storage.removeItem(PEOPLE_STORAGE_KEY);
    }
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    stdio: "pipe",
  }));
});
