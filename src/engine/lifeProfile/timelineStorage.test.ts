import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  it,
} from "node:test";

it("round-trips timeline events, preserves older backups and protects linked people", () => {
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
    const { StorageMode, setStorageMode, exportAllData, importAllData, clearAllData } = await import("#engine/storage/appStorage");
    const { readPeople, writePeople } = await import("#engine/lifeProfile/peopleStorage");
    const { readTimeline, writeTimeline } = await import("#engine/lifeProfile/timelineStorage");
    setStorageMode(StorageMode.Session, true);
    const people = { version: 1, people: [{ id: "p", name: "Alex" }] };
    const timeline = { version: 1, events: [{ id: "e", kind: "note", personId: "p", date: "2026-01-01", status: "planned", payload: { title: "Move" } }] };
    assert.equal(writePeople(people), true);
    assert.equal(writeTimeline(timeline), true);
    assert.equal(writePeople({ version: 1, people: [] }), false);
    const backup = exportAllData();
    assert.equal(writeTimeline({ version: 1, events: [] }), true);
    importAllData(backup);
    assert.equal(readTimeline().record.events[0].payload.title, "Move");
    importAllData(JSON.stringify({ format: "rechner-backup", version: 1, entries: {} }));
    assert.equal(readPeople().record.people[0].name, "Alex");
    assert.equal(readTimeline().record.events[0].id, "e");
    const invalid = JSON.stringify({ format: "rechner-backup", version: 1,
      entries: { "rechner:life-profile:people:v1": JSON.stringify({ version: 1, people: [] }) } });
    assert.throws(() => importAllData(invalid));
    assert.equal(readPeople().record.people[0].name, "Alex");
    assert.equal(setStorageMode(StorageMode.Memory, true), true);
    clearAllData();
    assert.equal(globalThis.sessionStorage.getItem("rechner:privacy:memory-restore:v1"), null);
    assert.equal(readPeople().status, "missing");
    assert.equal(readTimeline().status, "missing");
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    stdio: "pipe",
  }));
});
