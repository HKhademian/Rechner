import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  it,
} from "node:test";

it("previews backup additions, overwrites, older-backup preservation, duplicates and conflicts without mutating storage", () => {
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
    const { StorageMode, setStorageMode, exportAllData, inspectBackupImport, importAllData } = await import("#engine/storage/appStorage");
    const { writePeople, readPeople } = await import("#engine/lifeProfile/peopleStorage");
    const { writeTimeline, readTimeline } = await import("#engine/lifeProfile/timelineStorage");
    setStorageMode(StorageMode.Session, true);

    assert.equal(writePeople({ version: 1, people: [{ id: "p1", name: "Alex" }] }), true);
    assert.equal(writeTimeline({ version: 2, events: [
      { id: "e1", kind: "cash.entry", personId: "p1", date: "2026-11-10", status: "actual",
        payload: { title: "Rent", direction: "outflow", amount: 100000 } },
    ] }), true);
    const baselineBackup = exportAllData();

    // Create an incoming backup with a duplicate person name, an added event, and a duplicate cash conflict
    assert.equal(writePeople({ version: 1, people: [{ id: "p1", name: "Alex" }, { id: "p2", name: "alex" }] }), true);
    assert.equal(writeTimeline({ version: 2, events: [
      { id: "e1", kind: "cash.entry", personId: "p1", date: "2026-11-10", status: "actual",
        payload: { title: "Rent", direction: "outflow", amount: 100000 } },
      { id: "e2", kind: "cash.entry", personId: "p1", date: "2026-11-10", status: "planned",
        payload: { title: "Rent", direction: "outflow", amount: 100000 } },
    ] }), true);
    const incomingBackup = exportAllData();

    // Restore baseline, then inspect incoming without mutating storage
    importAllData(baselineBackup);
    const preview = inspectBackupImport(incomingBackup);
    assert.equal(preview.valid, true);
    assert.deepEqual(preview.peopleDiff, { added: 1, changed: 0, removed: 0 });
    assert.deepEqual(preview.timelineDiff, { added: 1, changed: 0, removed: 0 });
    assert.equal(preview.duplicatePersonNames.length, 2);
    assert.equal(preview.incomingTimelineConflicts, 1);
    assert.equal(readPeople().record.people.length, 1);
    assert.equal(readTimeline().record.events.length, 1);

    // Older backup preview reports preserved keys
    const olderPreview = inspectBackupImport(JSON.stringify({ format: "rechner-backup", version: 1, entries: {} }));
    assert.equal(olderPreview.valid, true);
    assert.equal(olderPreview.preservedKeyCount, 2);

    // Invalid backup returns valid: false with error message
    const bad = inspectBackupImport("{not-json");
    assert.equal(bad.valid, false);
    assert.ok(bad.error);
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    stdio: "pipe",
  }));
});
