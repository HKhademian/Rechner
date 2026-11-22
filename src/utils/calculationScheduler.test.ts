import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  CalculationStatus,
  createCalculationScheduler,
  isCalculationStatus,
  toCalculationStatus,
} from "#utils/calculationScheduler";

describe("calculationScheduler (Trailing Debounce & Status Lifecycle)", () => {
  it("validates CalculationStatus const enum strictly", () => {
    assert.equal(isCalculationStatus(CalculationStatus.Calculated), true);
    assert.equal(isCalculationStatus(CalculationStatus.Reevaluating), true);
    assert.equal(isCalculationStatus(CalculationStatus.Calculating), true);
    assert.equal(toCalculationStatus("reevaluating"), CalculationStatus.Reevaluating);
    assert.equal(isCalculationStatus("idle"), false);
    assert.throws(() => toCalculationStatus("idle"), TypeError);
  });

  it("accumulates rapid input bursts and transitions Calculated -> Reevaluating -> Calculating -> Calculated once", () => {
    const transitions: Array<{ status: CalculationStatus;
      pending: number }> = [];
    let calcRuns = 0;

    let timerSeq = 0;
    const timers = new Map<number, () => void>();
    let paintSeq = 0;
    const paints = new Map<number, () => void>();

    const scheduler = createCalculationScheduler({
      debounceMs: 250,
      onStatusChange: (status, pending) => {
        transitions.push({ status,
          pending });
      },
      onCalculate: () => {
        calcRuns += 1;
      },
      scheduleTimeout: (fn) => {
        const id = ++timerSeq;
        timers.set(id, fn);
        return id as unknown as ReturnType<typeof setTimeout>;
      },
      cancelTimeout: (handle) => {
        timers.delete(handle as unknown as number);
      },
      schedulePaint: (fn) => {
        const id = ++paintSeq;
        paints.set(id, fn);
        return id;
      },
      cancelPaint: (handle) => {
        paints.delete(handle);
      },
    });

    assert.equal(scheduler.getStatus(), CalculationStatus.Calculated);

    // Simulate typing 4 digits rapidly ("4" -> "45" -> "450" -> "4500")
    scheduler.notifyInputChange();
    scheduler.notifyInputChange();
    scheduler.notifyInputChange();
    scheduler.notifyInputChange();

    assert.equal(scheduler.getStatus(), CalculationStatus.Reevaluating);
    assert.equal(scheduler.getPendingChanges(), 4);
    assert.equal(calcRuns, 0);
    // Only the latest trailing timer must remain active
    assert.equal(timers.size, 1);

    // Advance trailing quiet window -> transitions to Calculating and queues paint frame
    const [timerFn] = [...timers.values()];
    timers.clear();
    timerFn();
    assert.equal(scheduler.getStatus(), CalculationStatus.Calculating);
    assert.equal(calcRuns, 0);
    assert.equal(paints.size, 1);

    // Another input arrives before paint fires -> cancels paint and returns to Reevaluating!
    scheduler.notifyInputChange();
    assert.equal(scheduler.getStatus(), CalculationStatus.Reevaluating);
    assert.equal(scheduler.getPendingChanges(), 5);
    assert.equal(paints.size, 0);
    assert.equal(timers.size, 1);

    // Let quiet window + paint frame complete -> single calculation run!
    const [timerFn2] = [...timers.values()];
    timers.clear();
    timerFn2();
    assert.equal(scheduler.getStatus(), CalculationStatus.Calculating);
    const [paintFn] = [...paints.values()];
    paints.clear();
    paintFn();

    assert.equal(calcRuns, 1);
    assert.equal(scheduler.getStatus(), CalculationStatus.Calculated);
    assert.equal(scheduler.getPendingChanges(), 0);
    assert.deepEqual(
      transitions.map((t) => `${t.status}:${t.pending}`),
      [
        "reevaluating:1",
        "reevaluating:2",
        "reevaluating:3",
        "reevaluating:4",
        "calculating:4",
        "reevaluating:5",
        "calculating:5",
        "calculated:0",
      ],
    );
  });

  it("supports immediate synchronous flush() and safe no-op when already calculated", () => {
    let calcRuns = 0;
    const statuses: CalculationStatus[] = [];
    const timers = new Map<number, () => void>();
    let timerSeq = 0;

    const scheduler = createCalculationScheduler({
      debounceMs: 300,
      onStatusChange: (status) => {
        statuses.push(status);
      },
      onCalculate: () => {
        calcRuns += 1;
      },
      scheduleTimeout: (fn) => {
        const id = ++timerSeq;
        timers.set(id, fn);
        return id as unknown as ReturnType<typeof setTimeout>;
      },
      cancelTimeout: (handle) => {
        timers.delete(handle as unknown as number);
      },
    });

    // Flushing when already calculated is a no-op
    scheduler.flush();
    assert.equal(calcRuns, 0);
    assert.deepEqual(statuses, []);

    scheduler.notifyInputChange();
    scheduler.notifyInputChange();
    assert.equal(timers.size, 1);

    scheduler.flush();
    assert.equal(timers.size, 0);
    assert.equal(calcRuns, 1);
    assert.equal(scheduler.getStatus(), CalculationStatus.Calculated);
    assert.deepEqual(statuses, [
      CalculationStatus.Reevaluating,
      CalculationStatus.Reevaluating,
      CalculationStatus.Calculating,
      CalculationStatus.Calculated,
    ]);
  });
});
