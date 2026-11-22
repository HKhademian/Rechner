import type {
  JSX,
} from "preact";
import {
  CalculationStatus,
  flushPendingCalculations,
  lastCalculationDurationMs,
  simulationCalculationStatus,
  simulationPendingChanges,
} from "#store/elterngeldStore";
import "./CalculationStatusBanner.css";

/**
 * Sticky status indicator surfacing the coalesced recalculation lifecycle:
 * `Calculated -> Reevaluating -> Calculating -> Calculated`.
 */
export default function CalculationStatusBanner(): JSX.Element {
  const status = simulationCalculationStatus.value;
  const pending = simulationPendingChanges.value;
  const durationMs = lastCalculationDurationMs.value;

  const pillModifier =
    status === CalculationStatus.Reevaluating
      ? "calc-status__pill--reevaluating"
      : status === CalculationStatus.Calculating
        ? "calc-status__pill--calculating"
        : "calc-status__pill--calculated";

  const label =
    status === CalculationStatus.Reevaluating
      ? "Reevaluating…"
      : status === CalculationStatus.Calculating
        ? "Calculating…"
        : "Calculated";

  const meta =
    status === CalculationStatus.Reevaluating
      ? pending > 1
        ? `${pending} changes queued`
        : "Waiting for input pause"
      : status === CalculationStatus.Calculating
        ? "Updating scenarios"
        : durationMs !== null
          ? `Up to date · ${durationMs} ms`
          : "Up to date";

  return (
    <div
      className="calc-status"
      role="status"
      aria-live="polite"
      data-calculation-status={status}
    >
      <div className={`calc-status__pill ${pillModifier}`}>
        <span className="calc-status__dot" aria-hidden="true" />
        <span>{label}</span>
        <span className="calc-status__meta tabular-nums">{meta}</span>
        {status === CalculationStatus.Reevaluating && (
          <button
            type="button"
            className="calc-status__flush-btn"
            onClick={() => flushPendingCalculations()}
          >
            Calculate now
          </button>
        )}
      </div>
    </div>
  );
}
