import type {
  JSX,
} from "preact";
import {
  AllowancePlanMode,
  SalaryInputMode,
} from "#engine/types";
import {
  PlanCapDiagnosticStatus,
} from "#engine/formulas/pure/parentalPlanDiagnostics";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  workbenchExtras,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  hasConfiguredBenefitsOrDeductibles,
  hasConfiguredRaisesOrBonuses,
  workbenchDampening,
} from "#/apps/parental-planner/store/workbenchDampening.ts";
import {
  displayedWorkbenchDiagnostics,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";
import {
  WorkbenchDrawerSection,
  openPlanInputsDrawer,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function formatShortDue(iso: string | undefined): string {
  if (!iso || iso.length < 7) {
    return "";
  }
  const year = iso.slice(0, 4);
  const monthIdx = Number(iso.slice(5, 7)) - 1;
  const mon = MONTH_SHORT[monthIdx] ?? iso.slice(5, 7);
  return `${mon} ${year}`;
}

/**
 * Whisper-quiet inline dotted-underline plan summary breadcrumbs rendered directly inside
 * the top command header. Clicking any item opens the slide-over Plan Inputs Drawer to that section.
 */
export function PlanSummaryStrip(): JSX.Element {
  const s = workbenchState.value;
  const extras = workbenchExtras.value;
  const damp = workbenchDampening.value;
  const diagnostics = displayedWorkbenchDiagnostics.value;

  const isGross = s.salaryInputMode === SalaryInputMode.Gross;
  const p1Pay = isGross ? s.husbandGross : s.husbandClass3Net;
  const p2Pay = isGross ? s.wifeGross : s.wifeClass5FullTimeNet;
  const classSummary = s.useInitialTaxFactor
    ? "IV+F"
    : `${s.husbandInitialTaxClass ?? "III"}/${s.wifeInitialTaxClass ?? "V"}`;
  const hasRaises = hasConfiguredRaisesOrBonuses(s);

  const kids = s.customPregnancies;
  let childSummary = "No births";
  if (kids.length === 1) {
    const k = kids[0];
    const modeLabel = k.motherAllowancePlanMode === AllowancePlanMode.Plus
      ? "Plus"
      : k.motherAllowancePlanMode === AllowancePlanMode.Auto
        ? "Mixed"
        : "Basis";
    const rawMotherMonths = k.motherAllowanceMonthsCount ?? 10;
    const mMonths = k.motherAllowancePlanMode === AllowancePlanMode.Plus
      ? rawMotherMonths
      : rawMotherMonths + 2;
    const due = formatShortDue(k.expectedDueDate);
    childSummary = due
      ? `1 Child (${due} · ${mMonths}+${k.fatherPartnerMonthsCount} ${modeLabel})`
      : `1 Child (${mMonths}+${k.fatherPartnerMonthsCount} ${modeLabel})`;
  }
  else if (kids.length > 1) {
    childSummary = `${kids.length} Children`;
  }

  const workSummary = `${s.wifePostBirthHours} h/wk`;

  const kitaEnabled = Boolean(s.childcarePlan?.enabled);
  const hasExtraBenefits = hasConfiguredBenefitsOrDeductibles(s, extras);
  const costsSummary = kitaEnabled
    ? damp.dampenKitaCosts
      ? "Kita muted"
      : "Kita On"
    : hasExtraBenefits
      ? damp.dampenBenefitsAndDeductibles
        ? "Extras muted"
        : "Extras On"
      : "Kita Off";

  const zve = s.householdTaxableIncome?.[0]?.taxableIncome;
  const zveShort = zve !== undefined ? `ZvE €${Math.round(zve / 1000)}k` : "ZvE —";
  const capSuffix = diagnostics.incomeCap.status === PlanCapDiagnosticStatus.OverCap
    ? " (Over)"
    : diagnostics.incomeCap.status === PlanCapDiagnosticStatus.NearCap
      ? " (Near)"
      : "";
  const horizonSummary = `${s.simulationDurationMonths}M · ${zveShort}${capSuffix}`;

  return (
    <div className="plw-inline-summary" aria-label="Quick-edit plan summary">
      <button
        type="button"
        className={`plw-inline-summary__item tabular-nums${hasRaises && damp.dampenRaisesAndBonuses ? " plw-inline-summary__item--muted" : ""}`}
        title="Click to edit household income and tax classes"
        onClick={() => openPlanInputsDrawer(WorkbenchDrawerSection.Income)}
      >
        {formatEur(p1Pay)} / {formatEur(p2Pay)} · {classSummary}
      </button>
      <span className="plw-inline-summary__sep" aria-hidden="true">·</span>
      <button
        type="button"
        className="plw-inline-summary__item"
        title="Click to edit children and parental leave split"
        onClick={() => openPlanInputsDrawer(WorkbenchDrawerSection.Children)}
      >
        {childSummary}
      </button>
      <span className="plw-inline-summary__sep" aria-hidden="true">·</span>
      <button
        type="button"
        className={`plw-inline-summary__item${damp.dampenTaxSwitches ? " plw-inline-summary__item--muted" : ""}`}
        title="Click to edit tax-class switches and post-leave working hours"
        onClick={() => openPlanInputsDrawer(WorkbenchDrawerSection.TaxWork)}
      >
        {workSummary}
      </button>
      <span className="plw-inline-summary__sep" aria-hidden="true">·</span>
      <button
        type="button"
        className={`plw-inline-summary__item${damp.dampenKitaCosts || damp.dampenBenefitsAndDeductibles ? " plw-inline-summary__item--muted" : ""}`}
        title="Click to edit Kita childcare, regional benefits, and deductibles"
        onClick={() => openPlanInputsDrawer(WorkbenchDrawerSection.Costs)}
      >
        {costsSummary}
      </button>
      <span className="plw-inline-summary__sep" aria-hidden="true">·</span>
      <button
        type="button"
        className={`plw-inline-summary__item tabular-nums${damp.dampenInflationIndexing ? " plw-inline-summary__item--muted" : ""}`}
        title="Click to edit planning horizon, ZvE cap, and CPI settings"
        onClick={() => openPlanInputsDrawer(WorkbenchDrawerSection.Macro)}
      >
        {horizonSummary}
      </button>
    </div>
  );
}
