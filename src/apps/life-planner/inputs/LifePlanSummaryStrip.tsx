import type {
  JSX,
} from "preact";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  lifeWorkbenchPlan,
} from "#/apps/life-planner/store/lifeWorkbenchState.ts";
import {
  LifeDrawerSection,
  openLifeInputsDrawer,
} from "#/apps/life-planner/store/lifeWorkbenchUiState.ts";

/**
 * Concept A clickable summary pills inside the Quiet Command Header.
 * Clicking any pill jumps directly to that section in the slide-over Plan Inputs drawer.
 */
export function LifePlanSummaryStrip(): JSX.Element {
  const { baseline, events } = lifeWorkbenchPlan.value;
  const householdGross = baseline.primary.monthlyGross + (baseline.partner?.monthlyGross ?? 0);
  const horizonYears = Math.round((baseline.horizonMonths / 12) * 10) / 10;

  return (
    <div className="lpw-summary-strip" aria-label="Plan summary quick jumps">
      <button
        type="button"
        className="lpw-summary-pill"
        onClick={() => openLifeInputsDrawer(LifeDrawerSection.Household)}
      >
        <span>Income</span>
        <strong>{formatEur(householdGross)}/mo</strong>
      </button>

      <button
        type="button"
        className="lpw-summary-pill"
        onClick={() => openLifeInputsDrawer(LifeDrawerSection.Housing)}
      >
        <span>Cash</span>
        <strong>{formatEur(baseline.openingLiquidCash)}</strong>
      </button>

      <button
        type="button"
        className="lpw-summary-pill"
        onClick={() => openLifeInputsDrawer(LifeDrawerSection.Career)}
      >
        <span>Events</span>
        <strong>{events.length}</strong>
      </button>

      <button
        type="button"
        className="lpw-summary-pill"
        onClick={() => openLifeInputsDrawer(LifeDrawerSection.HorizonDisaster)}
      >
        <span>Horizon</span>
        <strong>{horizonYears}y</strong>
      </button>
    </div>
  );
}
