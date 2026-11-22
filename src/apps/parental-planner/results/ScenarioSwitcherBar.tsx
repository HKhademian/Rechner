import type {
  JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from "#/components/ui/index.ts";
import {
  ActiveScenarioView,
} from "#engine/types";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  setWorkbenchActiveScenario,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  CalculationStatus,
  displayedWorkbenchCurrentScenario,
  displayedWorkbenchScenarioA,
  displayedWorkbenchScenarioB,
  displayedWorkbenchScenarioC,
  flushWorkbenchCalculations,
  workbenchCalculationStatus,
  workbenchLastCalcDurationMs,
  workbenchPendingChanges,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";

/** Sticky Strategy Cards Switcher (C / B / A / Compare) matching the approved design sketch. */
export function ScenarioSwitcherBar(): JSX.Element {
  const [auditOpen, setAuditOpen] = useState(false);
  const s = workbenchState.value;
  const status = workbenchCalculationStatus.value;
  const pending = workbenchPendingChanges.value;
  const durationMs = workbenchLastCalcDurationMs.value;
  const current = displayedWorkbenchCurrentScenario.value;
  const aTotal = displayedWorkbenchScenarioA.value.summary.grandTotal;
  const bTotal = displayedWorkbenchScenarioB.value.summary.grandTotal;
  const cTotal = displayedWorkbenchScenarioC.value.summary.grandTotal;

  const isStale = status === CalculationStatus.Reevaluating || status === CalculationStatus.Calculating;
  const statusLabel = status === CalculationStatus.Calculating
    ? "Calculating…"
    : status === CalculationStatus.Reevaluating
      ? `Updating (${pending}) · Audit`
      : durationMs !== null
        ? `All calculations complete (${durationMs} ms) · Audit ▾`
        : "All calculations complete · Audit ▾";

  const profiles = current.configuration?.taxProfiles ?? [];
  const projectedYears = profiles.filter((p) => p.projected).map((p) => p.calendarYear);

  return (
    <section className="plw-sticky-bar" aria-label="Scenario switcher">
      <div className="plw-sticky-bar__row">
        <div className="plw-sticky-bar__lead">
          <strong>View Calculation</strong>
          <span>Same inputs · Compare strategies</span>
        </div>

        <div className="plw-toolbar__group">
          {isStale && (
            <Button
              size={ButtonSize.Sm}
              variant={ButtonVariant.Tint}
              onClick={flushWorkbenchCalculations}
            >
              Calculate now
            </Button>
          )}
          <button
            type="button"
            className={`plw-audit-pill${isStale ? " plw-audit-pill--stale" : ""}`}
            aria-expanded={auditOpen}
            onClick={() => setAuditOpen(!auditOpen)}
          >
            {statusLabel}
          </button>
        </div>
      </div>

      <div className="plw-scenario-grid" role="group" aria-label="Choose calculation view">
        <button
          type="button"
          className={`plw-scenario-card${s.activeScenario === ActiveScenarioView.StatutoryOptimized ? " plw-scenario-card--active" : ""}`}
          aria-pressed={s.activeScenario === ActiveScenarioView.StatutoryOptimized}
          onClick={() => setWorkbenchActiveScenario(ActiveScenarioView.StatutoryOptimized)}
        >
          <div className="plw-scenario-card__top">
            <span className="plw-scenario-card__name">Planned Switches (C)</span>
            <span className="plw-scenario-card__tag">
              {s.activeScenario === ActiveScenarioView.StatutoryOptimized ? "Active" : "Optimized"}
            </span>
          </div>
          <div className="plw-scenario-card__val">{formatEur(cTotal)}</div>
        </button>

        <button
          type="button"
          className={`plw-scenario-card${s.activeScenario === ActiveScenarioView.UnoptimizedBaseline ? " plw-scenario-card--active" : ""}`}
          aria-pressed={s.activeScenario === ActiveScenarioView.UnoptimizedBaseline}
          onClick={() => setWorkbenchActiveScenario(ActiveScenarioView.UnoptimizedBaseline)}
        >
          <div className="plw-scenario-card__top">
            <span className="plw-scenario-card__name">Original Classes (B)</span>
            <span className="plw-scenario-card__tag">Baseline</span>
          </div>
          <div className="plw-scenario-card__val">{formatEur(bTotal)}</div>
        </button>

        <button
          type="button"
          className={`plw-scenario-card${s.activeScenario === ActiveScenarioView.StatusQuo ? " plw-scenario-card--active" : ""}`}
          aria-pressed={s.activeScenario === ActiveScenarioView.StatusQuo}
          onClick={() => setWorkbenchActiveScenario(ActiveScenarioView.StatusQuo)}
        >
          <div className="plw-scenario-card__top">
            <span className="plw-scenario-card__name">No Planned Births (A)</span>
            <span className="plw-scenario-card__tag">Reference</span>
          </div>
          <div className="plw-scenario-card__val">{formatEur(aTotal)}</div>
        </button>

        <button
          type="button"
          className={`plw-scenario-card${s.activeScenario === ActiveScenarioView.Compare ? " plw-scenario-card--active" : ""}`}
          aria-pressed={s.activeScenario === ActiveScenarioView.Compare}
          onClick={() => setWorkbenchActiveScenario(ActiveScenarioView.Compare)}
        >
          <div className="plw-scenario-card__top">
            <span className="plw-scenario-card__name">Compare All Three</span>
            <span className="plw-scenario-card__tag">Overlay</span>
          </div>
          <div className="plw-scenario-card__sub">C vs B vs A curve</div>
        </button>
      </div>

      {auditOpen && (
        <div className="plw-audit-panel">
          <div className="plw-audit-panel__item">
            <strong>Benefits:</strong> BEEG §§ 1–4b + {current.months.length}M ledger
          </div>
          <div className="plw-audit-panel__item">
            <strong>Payroll:</strong> Official {profiles[0]?.sourceYear ?? s.startCalendarYear} PAP
            {projectedYears.length > 0 ? ` (${projectedYears.join(", ")} projected)` : ""}
          </div>
          <div className="plw-audit-panel__item">
            <strong>Annual Tax:</strong> EStG §§ 26b, 32b ({(current.assumptions ?? []).length} audit notes)
          </div>
        </div>
      )}
    </section>
  );
}
