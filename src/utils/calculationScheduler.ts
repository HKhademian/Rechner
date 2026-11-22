/**
 * Domain-Agnostic Trailing-Debounce Calculation Scheduler
 *
 * Accumulates rapid user input mutations over a quiet window (`debounceMs`) before
 * triggering expensive recalculation, exposing a strict 3-phase lifecycle:
 * `Calculated -> Reevaluating -> Calculating -> Calculated`.
 */

/** Strongly-typed lifecycle states for coalesced interactive recalculation (Rule 11). */
export const CalculationStatus = {
  Calculated: "calculated",
  Reevaluating: "reevaluating",
  Calculating: "calculating",
} as const;
export type CalculationStatus =
  (typeof CalculationStatus)[keyof typeof CalculationStatus];

const CALCULATION_STATUS_SET: ReadonlySet<string> = new Set<string>(
  Object.values(CalculationStatus),
);

/** Runtime type guard validating a `CalculationStatus`. */
export function isCalculationStatus(value: string): value is CalculationStatus {
  return CALCULATION_STATUS_SET.has(value);
}

/** Validated runtime constructor for `CalculationStatus` (Rule 11). */
export function toCalculationStatus(value: string): CalculationStatus {
  if (!isCalculationStatus(value)) {
    throw new TypeError(
      `Invalid CalculationStatus: "${value}". Expected one of: ${Object.values(CalculationStatus).join(", ")}.`,
    );
  }
  return value;
}

export interface CalculationSchedulerOptions {
  /** Quiet window in milliseconds before starting calculation (default: 250ms). */
  readonly debounceMs?: number;
  /** Invoked whenever status or accumulated pending change count transitions. */
  readonly onStatusChange: (
    status: CalculationStatus,
    pendingChanges: number,
  ) => void;
  /** Invoked to commit the heavy recomputation after the quiet window elapses. */
  readonly onCalculate: () => void;
  /** Optional timer hooks for deterministic testing. */
  readonly scheduleTimeout?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  readonly cancelTimeout?: (handle: ReturnType<typeof setTimeout>) => void;
  /** Optional paint-yield hook so the browser renders `Calculating` before heavy work. */
  readonly schedulePaint?: (fn: () => void) => number;
  readonly cancelPaint?: (handle: number) => void;
}

export interface CalculationScheduler {
  /** Records an incoming user input mutation and restarts the trailing quiet window. */
  notifyInputChange(): void;
  /** Immediately commits any pending recalculation synchronously. */
  flush(): void;
  /** Cancels any pending timers/frames without running calculation. */
  dispose(): void;
  /** Current lifecycle status. */
  getStatus(): CalculationStatus;
  /** Number of input mutations accumulated since the last completed calculation. */
  getPendingChanges(): number;
}

function defaultSchedulePaint(fn: () => void): number {
  if (typeof globalThis.requestAnimationFrame === "function") {
    return globalThis.requestAnimationFrame(() => {
      fn();
    });
  }
  return Number(setTimeout(fn, 0));
}

function defaultCancelPaint(handle: number): void {
  if (typeof globalThis.cancelAnimationFrame === "function") {
    globalThis.cancelAnimationFrame(handle);
    return;
  }
  clearTimeout(handle);
}

/** Creates a trailing-debounce calculation scheduler with explicit status transitions. */
export function createCalculationScheduler(
  options: CalculationSchedulerOptions,
): CalculationScheduler {
  const debounceMs = Math.max(0, options.debounceMs ?? 250);
  const scheduleTimeout = options.scheduleTimeout ?? ((fn, ms) => setTimeout(fn, ms));
  const cancelTimeout = options.cancelTimeout ?? ((handle) => clearTimeout(handle));
  const schedulePaint = options.schedulePaint ?? defaultSchedulePaint;
  const cancelPaint = options.cancelPaint ?? defaultCancelPaint;

  let status: CalculationStatus = CalculationStatus.Calculated;
  let pendingChanges = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let paintHandle: number | null = null;

  const clearScheduled = (): void => {
    if (debounceTimer !== null) {
      cancelTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (paintHandle !== null) {
      cancelPaint(paintHandle);
      paintHandle = null;
    }
  };

  const emitStatus = (nextStatus: CalculationStatus, nextPending: number): void => {
    status = nextStatus;
    pendingChanges = nextPending;
    options.onStatusChange(status, pendingChanges);
  };

  const executeCalculation = (): void => {
    try {
      options.onCalculate();
    }
    finally {
      emitStatus(CalculationStatus.Calculated, 0);
    }
  };

  return {
    notifyInputChange(): void {
      clearScheduled();
      emitStatus(CalculationStatus.Reevaluating, pendingChanges + 1);
      debounceTimer = scheduleTimeout(() => {
        debounceTimer = null;
        emitStatus(CalculationStatus.Calculating, pendingChanges);
        paintHandle = schedulePaint(() => {
          paintHandle = null;
          executeCalculation();
        });
      }, debounceMs);
    },

    flush(): void {
      const hasPending = pendingChanges > 0 || status !== CalculationStatus.Calculated;
      clearScheduled();
      if (!hasPending) {
        return;
      }
      emitStatus(CalculationStatus.Calculating, pendingChanges);
      executeCalculation();
    },

    dispose(): void {
      clearScheduled();
    },

    getStatus(): CalculationStatus {
      return status;
    },

    getPendingChanges(): number {
      return pendingChanges;
    },
  };
}
