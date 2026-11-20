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
    const { recordedLifeMonths } = await import("#engine/lifeProfile/recordedLifeMonths");
    const { toReplayMonth } = await import("#engine/lifeProfile/monthlyReplay");
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
    const partial = { version: 2, events: [{ ...timeline.events[0], date: "2026-03" },
      { ...timeline.events[0], id: "unknown", date: undefined }] };
    assert.equal(writeTimeline(partial), true);
    const partialBackup = exportAllData();
    assert.equal(writeTimeline({ version: 2, events: [] }), true);
    importAllData(partialBackup);
    assert.equal(readTimeline().record.events[0].date, "2026-03");
    assert.equal(readTimeline().record.events[1].date, undefined);
    const job = { id: "job-event", kind: "employment.started", personId: "p", date: "2026-04", status: "actual",
      payload: { jobId: "job-1", employer: "Example", weeklyHours: 32 } };
    assert.equal(writeTimeline({ version: 2, events: [...partial.events, job] }), true);
    const jobBackup = exportAllData();
    assert.equal(writeTimeline({ version: 2, events: [] }), true);
    importAllData(jobBackup);
    assert.equal(readTimeline().record.events[2].payload.weeklyHours, 32);
    assert.equal(readTimeline().record.events[2].payload.gross, undefined);
    const change = { id: "raise", kind: "employment.changed", personId: "p", date: "2027", status: "planned",
      payload: { jobId: "job-1", gross: 5000, grossPeriod: "MONTHLY" } };
    assert.equal(writeTimeline({ version: 2, events: [...partial.events, job, change] }), true);
    assert.equal(writeTimeline({ version: 2, events: [...partial.events, change] }), false);
    const changeBackup = exportAllData();
    assert.equal(writeTimeline({ version: 2, events: [] }), true);
    importAllData(changeBackup);
    assert.equal(readTimeline().record.events[3].payload.gross, 5000);
    const move = { id: "move", kind: "residence.move", personId: "p", date: "2027", status: "planned",
      payload: { placeId: "place", location: "Berlin" } };
    assert.equal(writeTimeline({ version: 2, events: [...partial.events, job, change, move] }), true);
    const month = toReplayMonth(2027, 12);
    const before = recordedLifeMonths(readTimeline().record.events, readPeople().record.people[0].id, month, month, month, true);
    const mixedBackup = exportAllData();
    assert.equal(writeTimeline({ version: 2, events: [] }), true);
    importAllData(mixedBackup);
    assert.equal(readTimeline().record.events[4].payload.location, "Berlin");
    assert.deepEqual(recordedLifeMonths(readTimeline().record.events, readPeople().record.people[0].id, month, month, month, true), before);
    const paid = { id: "paid", kind: "cash.entry", personId: "p", date: "2027-12-01", status: "actual",
      payload: { title: "Rent", direction: "outflow", amount: 100001 } };
    const plannedCash = { ...paid, id: "planned-cash", date: "2027-12-31", status: "planned",
      payload: { title: "Trip", direction: "outflow", amount: 10000 } };
    const reconciledCash = { id: "reconciled-cash", kind: "cash.entry", personId: "p", date: "2027-12-31", status: "actual",
      payload: { title: "Trip", direction: "outflow", amount: 11050, reconcilesEventId: "planned-cash" } };
    assert.equal(writeTimeline({ version: 2, events: [...partial.events, job, change, move, paid, plannedCash, reconciledCash] }), true);
    assert.equal(writeTimeline({ version: 2, events: [...partial.events, job, change, move, paid, reconciledCash] }), false);
    const cashBackup = exportAllData();
    assert.equal(writeTimeline({ version: 2, events: [] }), true);
    importAllData(cashBackup);
    assert.deepEqual(readTimeline().record.events.slice(-3), [paid, plannedCash, reconciledCash]);
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
