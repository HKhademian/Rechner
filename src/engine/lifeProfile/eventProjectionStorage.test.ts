import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  it,
} from "node:test";

it("restores reproducible event projections and reports timeline changes in every storage mode", () => {
  const script = `
    import assert from "node:assert/strict";
    const makeStorage = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null,
      setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k), key: i => [...data.keys()][i] ?? null,
      get length() { return data.size; } }; };
    globalThis.window = globalThis; globalThis.localStorage = makeStorage(); globalThis.sessionStorage = makeStorage();
    const app = await import("#engine/storage/appStorage");
    const rec = await import("#engine/lifeProfile/eventProjectionRecord");
    const store = await import("#engine/lifeProfile/eventProjectionStorage");
    const people = await import("#engine/lifeProfile/peopleStorage");
    const timeline = await import("#engine/lifeProfile/timelineStorage");
    const { projectCashEvents } = await import("#engine/lifeProfile/cashEventProjection");
    const { toReplayMonth } = await import("#engine/lifeProfile/monthlyReplay");
    const actual = { id: "actual", kind: "cash.entry", personId: "p", date: "2026-11-03", status: "actual", payload: { title: "Rent", direction: "outflow", amount: 10001 } };
    const planned = { ...actual, id: "planned", date: "2026-12-03", status: "planned", payload: { ...actual.payload, title: "Trip" } };
    const empty = { version: 1, projections: [] };
    for (const mode of [app.StorageMode.Memory, app.StorageMode.Session, app.StorageMode.Persistent]) {
      assert.equal(app.setStorageMode(mode, true), true);
      const storage = app.browserWebStorageForCurrentMode();
      for (const key of [rec.EVENT_PROJECTION_STORAGE_KEY, "rechner:life-profile:people:v1", "rechner:life-profile:timeline:v1"]) storage.removeItem(key);
      assert.equal(people.writePeople({ version: 1, people: [{ id: "p", name: "Example" }] }), true);
      assert.equal(timeline.writeTimeline({ version: 2, events: [actual, planned] }), true);
      const events = timeline.readTimeline().record.events;
      const scenario = { id: "run", name: "Example", personId: "p", origin: "2026-11", opening: 100000, includePlanned: true,
        sources: rec.eventProjectionSources(events, "p", "2026-11") };
      const record = { version: 1, projections: [scenario] };
      assert.equal(store.writeEventProjections(record, empty), true);
      const saved = store.readEventProjections().record.projections[0];
      assert.deepEqual(rec.describeEventChanges(saved, events), { added: 0, changed: 0, removed: 0 });
      const extra = { ...actual, id: "new", date: "2027-01-04" };
      assert.deepEqual(rec.describeEventChanges(saved, [...events, extra]), { added: 1, changed: 0, removed: 0 });
      const start = toReplayMonth(2026, 11), end = toReplayMonth(2027, 4);
      const replay = (s, es) => projectCashEvents(start, start, end, s.opening, es, s.personId, s.includePlanned);
      const expected = replay(saved, events);
      const backup = app.exportAllData();
      const converted = { ...planned, status: "actual", payload: { ...planned.payload, amount: 15000 } };
      assert.equal(timeline.writeTimeline({ version: 2, events: [converted] }), true);
      assert.deepEqual(rec.describeEventChanges(saved, timeline.readTimeline().record.events), { added: 0, changed: 1, removed: 1 });
      const details = rec.eventProjectionChangeDetails(saved, timeline.readTimeline().record.events);
      assert.equal(details.changed[0].before.status, "planned");
      assert.equal(details.changed[0].after.status, "actual");
      assert.equal(details.removed[0].payload.title, "Rent");
      const convertedRows = replay(saved, timeline.readTimeline().record.events);
      assert.equal(convertedRows[1].state.contribution.sources.length, 1);
      assert.equal(convertedRows[1].state.closing, 85000);
      app.importAllData(backup);
      assert.deepEqual(replay(store.readEventProjections().record.projections[0], timeline.readTimeline().record.events), expected);
      app.importAllData(JSON.stringify({ format: "rechner-backup", version: 1, entries: {} }));
      assert.equal(store.readEventProjections().record.projections[0].name, "Example");
      assert.equal(store.writeEventProjections(empty, empty), false);
      const existing = store.readEventProjections().record;
      const retainedEvents = timeline.readTimeline().record.events;
      assert.equal(store.writeEventProjections(empty, existing), true);
      assert.deepEqual(timeline.readTimeline().record.events, retainedEvents);
      assert.equal(store.writeEventProjections(existing, empty), true);
      assert.equal(timeline.writeTimeline({ version: 2, events: [] }), true);
      assert.equal(people.writePeople({ version: 1, people: [] }), false);
      const orphaningBackup = JSON.stringify({ format: "rechner-backup", version: 1,
        entries: { "rechner:life-profile:people:v1": JSON.stringify({ version: 1, people: [] }),
          "rechner:life-profile:timeline:v1": JSON.stringify({ version: 2, events: [] }) } });
      assert.throws(() => app.importAllData(orphaningBackup));
      assert.equal(people.readPeople().record.people[0].id, "p");
      const retained = store.readEventProjections().record;
      assert.equal(store.writeEventProjections(empty, retained), true);
      assert.equal(people.writePeople({ version: 1, people: [] }), true);
      assert.equal(store.writeEventProjections(record, empty), false);
      app.importAllData(backup);
      if (mode === app.StorageMode.Persistent) {
        const previous = store.readEventProjections().record;
        const updated = { version: 1, projections: [{ ...previous.projections[0], opening: 50000 }] };
        assert.equal(store.writeEventProjections(updated, previous), true);
        const originalSet = storage.setItem;
        let fail = true;
        storage.setItem = (key, value) => {
          if (key === rec.EVENT_PROJECTION_STORAGE_KEY && fail) { fail = false; throw new Error("disk full"); }
          originalSet(key, value);
        };
        assert.throws(() => app.importAllData(backup));
        storage.setItem = originalSet;
        assert.equal(store.readEventProjections().record.projections[0].opening, 50000);
      }
      storage.setItem(rec.EVENT_PROJECTION_STORAGE_KEY, '{"version":2,"projections":[]}');
      assert.equal(store.writeEventProjections(empty, empty), false);
      assert.equal(people.writePeople({ version: 1, people: [] }), false);
      assert.throws(() => app.importAllData(backup));
      storage.removeItem(rec.EVENT_PROJECTION_STORAGE_KEY);

      // Reconciled planned-to-actual pair spanning across the 6-month projection boundary
      const crossPlan = { id: "cross-plan", kind: "cash.entry", personId: "p", date: "2026-10-25", status: "planned",
        payload: { title: "Expense", direction: "outflow", amount: 10000 } };
      const crossActual = { id: "cross-actual", kind: "cash.entry", personId: "p", date: "2026-11-05", status: "actual",
        payload: { title: "Expense", direction: "outflow", amount: 11050, reconcilesEventId: "cross-plan" } };
      assert.equal(timeline.writeTimeline({ version: 2, events: [crossPlan, crossActual] }), true);
      const crossEvents = timeline.readTimeline().record.events;
      const crossSources = rec.eventProjectionSources(crossEvents, "p", "2026-11");
      assert.deepEqual(crossSources.map((entry) => entry.id), ["cross-plan", "cross-actual"]);
      const crossProj = { version: 1, projections: [{ id: "cross-run", name: "Cross", personId: "p", origin: "2026-11",
        opening: 100000, includePlanned: true, sources: crossSources }] };
      assert.equal(store.writeEventProjections(crossProj, empty), true);
      const crossBackup = app.exportAllData();
      assert.equal(store.writeEventProjections(empty, crossProj), true);
      app.importAllData(crossBackup);
      assert.deepEqual(store.readEventProjections().record.projections[0].sources.map((entry) => entry.id), ["cross-plan", "cross-actual"]);
      const crossReplay = projectCashEvents(toReplayMonth(2026, 11), toReplayMonth(2026, 11), toReplayMonth(2027, 4), 100000, crossEvents, "p", true);
      assert.equal(crossReplay[0].state.closing, 88950);
    }
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: process.cwd(),
    stdio: "pipe" }));
});
