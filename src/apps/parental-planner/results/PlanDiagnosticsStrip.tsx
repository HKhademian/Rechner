import type {
  JSX,
} from "preact";
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
  displayedWorkbenchDiagnostics,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";

/** Soft-tinted 3-card Plan Diagnostics Strip matching the approved prototype sketch. */
export function PlanDiagnosticsStrip(): JSX.Element {
  const diag = displayedWorkbenchDiagnostics.value;

  const capModifier = diag.incomeCap.status === PlanCapDiagnosticStatus.OverCap
    ? "plw-diag-card--danger"
    : diag.incomeCap.status === PlanCapDiagnosticStatus.NearCap ||
        diag.incomeCap.status === PlanCapDiagnosticStatus.UnknownZvE
      ? "plw-diag-card--warn"
      : "plw-diag-card--ok";

  const capIcon = diag.incomeCap.status === PlanCapDiagnosticStatus.OverCap
    ? "!"
    : diag.incomeCap.status === PlanCapDiagnosticStatus.NearCap ||
        diag.incomeCap.status === PlanCapDiagnosticStatus.UnknownZvE
      ? "!"
      : "✓";

  const switchModifier = diag.taxSwitch.status === TaxSwitchDiagnosticStatus.OptimalLead
    ? "plw-diag-card--ok"
    : diag.taxSwitch.status === TaxSwitchDiagnosticStatus.ShortLead ||
        diag.taxSwitch.status === TaxSwitchDiagnosticStatus.OpportunityAvailable
      ? "plw-diag-card--warn"
      : "";

  const switchIcon = diag.taxSwitch.status === TaxSwitchDiagnosticStatus.OptimalLead ? "✓" : "!";

  return (
    <section className="plw-diag-grid" aria-label="Plan diagnostics">
      <div className={`plw-diag-card ${capModifier}`}>
        <span className="plw-diag-card__icon" aria-hidden="true">{capIcon}</span>
        <div>
          <div className="plw-diag-card__title">
            Income Cap (
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.BEEG_1 }}>§ 1 Abs. 8 BEEG</WikiRefLink>
            )
          </div>
          <p className="plw-diag-card__detail">{diag.incomeCap.headline}</p>
        </div>
      </div>

      <div className={`plw-diag-card ${switchModifier}`}>
        <span className="plw-diag-card__icon" aria-hidden="true">{switchIcon}</span>
        <div>
          <div className="plw-diag-card__title">
            Tax-Switch Lead Window (
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.BEEG_2b }}>§ 2b BEEG</WikiRefLink>
            )
          </div>
          <p className="plw-diag-card__detail">{diag.taxSwitch.headline}</p>
        </div>
      </div>

      <div className="plw-diag-card">
        <span className="plw-diag-card__icon plw-diag-card__icon--brand" aria-hidden="true">§</span>
        <div>
          <div className="plw-diag-card__title">
            Monthly{" "}
            <WikiRefLink target={{ kind: WikiRefKind.Formula,
              id: FormulaId.ParentalAllowanceEntitlement }}>Elterngeld Formula</WikiRefLink>
          </div>
          <p className="plw-diag-card__detail">{diag.allowanceRate.headline}</p>
        </div>
      </div>
    </section>
  );
}
