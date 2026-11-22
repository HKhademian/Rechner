import type {
  JSX,
} from "preact";
import {
  lifeProfilePath,
} from "#/apps/appDefinition.ts";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  PlanCapDiagnosticStatus,
} from "#engine/formulas/pure/parentalPlanDiagnostics";
import {
  activeStatutoryContext,
} from "#store/parameterStore";
import {
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  displayedWorkbenchDiagnostics,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";
import {
  WorkbenchGranularModal,
  openWorkbenchModal,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

/** Card 5: Compact Horizon, ZvE Income Cap, CPI & Life Profile strip matching the approved sketch. */
export function HorizonMacroCard(): JSX.Element {
  const s = workbenchState.value;
  const diag = displayedWorkbenchDiagnostics.value;
  const ctx = activeStatutoryContext.value;
  const cpiPercent = (ctx.getParameterNumber(ParameterId.Planning_AnnualInflationRate) * 100).toFixed(0);

  const zveClass = diag.incomeCap.status === PlanCapDiagnosticStatus.OverCap
    ? "plw-compact-strip__danger"
    : diag.incomeCap.status === PlanCapDiagnosticStatus.NearCap ||
        diag.incomeCap.status === PlanCapDiagnosticStatus.UnknownZvE
      ? "plw-compact-strip__warn"
      : "plw-compact-strip__ok";

  const zveText = diag.incomeCap.recordedZveEur !== undefined
    ? `ZvE €${Math.round(diag.incomeCap.recordedZveEur / 1000)}k ${diag.incomeCap.status === PlanCapDiagnosticStatus.OverCap ? "Over" : "OK"}`
    : diag.incomeCap.status === PlanCapDiagnosticStatus.NoBirths
      ? "No cap needed"
      : "ZvE unverified";

  return (
    <section className="plw-card plw-card--compact" aria-label="Horizon, income cap, and macro assumptions">
      <div className="plw-compact-strip">
        <div className="plw-compact-strip__meta">
          <strong>{s.simulationDurationMonths}M</strong>
          <span>·</span>
          <span className={zveClass}>{zveText}</span>
          <span>·</span>
          <span>{cpiPercent}% CPI</span>
        </div>
        <button
          type="button"
          className="plw-granular-btn"
          onClick={() => openWorkbenchModal(WorkbenchGranularModal.Macro)}
        >
          Horizon, cap &amp; macro…
        </button>
      </div>

      <div className="plw-card__footer">
        <span>Full multi-domain life events?</span>
        <a href={lifeProfilePath()} className="plw-link-btn">
          Life Profile &amp; Dashboard →
        </a>
      </div>
    </section>
  );
}
