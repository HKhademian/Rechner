import type {
  JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import {
  LawId,
} from "#engine/laws/types";
import {
  FormulaId,
} from "#engine/formulas/types";
import {
  PlanCapDiagnosticStatus,
  TaxSwitchDiagnosticStatus,
} from "#engine/formulas/pure/parentalPlanDiagnostics";
import {
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  displayedWorkbenchCurrentScenario,
  displayedWorkbenchDiagnostics,
  workbenchLastCalcDurationMs,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";

/** Whisper-quiet 1-line statutory diagnostics & collapsible Audit bar (Concept A). */
export function PlanDiagnosticsStrip(): JSX.Element {
  const [auditOpen, setAuditOpen] = useState(false);
  const s = workbenchState.value;
  const diag = displayedWorkbenchDiagnostics.value;
  const current = displayedWorkbenchCurrentScenario.value;
  const durationMs = workbenchLastCalcDurationMs.value;

  const capTone = diag.incomeCap.status === PlanCapDiagnosticStatus.OverCap
    ? "plw-diag-bar__mark--loss"
    : diag.incomeCap.status === PlanCapDiagnosticStatus.NearCap ||
        diag.incomeCap.status === PlanCapDiagnosticStatus.UnknownZvE
      ? "plw-diag-bar__mark--warn"
      : "plw-diag-bar__mark--ok";

  const capMark = diag.incomeCap.status === PlanCapDiagnosticStatus.Eligible ? "✓" : "!";

  const switchTone = diag.taxSwitch.status === TaxSwitchDiagnosticStatus.OptimalLead
    ? "plw-diag-bar__mark--ok"
    : diag.taxSwitch.status === TaxSwitchDiagnosticStatus.ShortLead ||
        diag.taxSwitch.status === TaxSwitchDiagnosticStatus.OpportunityAvailable
      ? "plw-diag-bar__mark--warn"
      : "plw-diag-bar__mark--muted";

  const switchMark = diag.taxSwitch.status === TaxSwitchDiagnosticStatus.OptimalLead ? "✓" : "!";

  const profiles = current.configuration?.taxProfiles ?? [];
  const projectedYears = profiles.filter((p) => p.projected).map((p) => p.calendarYear);

  return (
    <section className="plw-diag-bar-wrap" aria-label="Plan diagnostics and audit status">
      <div className="plw-diag-bar">
        <div className="plw-diag-bar__items">
          <span className="plw-diag-bar__item">
            <strong className={capTone} aria-hidden="true">{capMark}</strong>
            <span>
              Income Cap (
              <WikiRefLink target={{ kind: WikiRefKind.Law,
                id: LawId.BEEG_1 }}>§ 1 Abs. 8 BEEG</WikiRefLink>
              ): {diag.incomeCap.headline}
            </span>
          </span>

          <span className="plw-diag-bar__item">
            <strong className={switchTone} aria-hidden="true">{switchMark}</strong>
            <span>
              Lead Window (
              <WikiRefLink target={{ kind: WikiRefKind.Law,
                id: LawId.BEEG_2b }}>§ 2b BEEG</WikiRefLink>
              ): {diag.taxSwitch.headline}
            </span>
          </span>

          <span className="plw-diag-bar__item">
            <strong className="plw-diag-bar__mark--brand" aria-hidden="true">§</strong>
            <span>
              <WikiRefLink target={{ kind: WikiRefKind.Formula,
                id: FormulaId.ParentalAllowanceEntitlement }}>Elterngeld Formula</WikiRefLink>
              : {diag.allowanceRate.headline}
            </span>
          </span>
        </div>

        <button
          type="button"
          className="plw-diag-bar__audit"
          aria-expanded={auditOpen}
          onClick={() => setAuditOpen(!auditOpen)}
        >
          Audit ✓{durationMs !== null ? ` ${durationMs} ms` : ""} {auditOpen ? "▴" : "▾"}
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
