import type {
  JSX,
} from "preact";
import {
  ChildBirthMilestoneIcon,
  ChildcareKitaIcon,
  EmploymentCompensationIcon,
  ParameterSlidersIcon,
  SimulationPeriodIcon,
  TaxClassSwitchIcon,
} from "#components/Icons";
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
 * Thin clickable Plan Summary Strip sitting above the full-screen analysis canvas.
 * Summarizes all 5 input domains at a glance; clicking any chip opens the slide-over
 * Plan Inputs Drawer directly to that section.
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
  let childSummary = "No planned births";
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
    childSummary = `${kids.length} Children planned`;
  }

  const switchCount = s.customTaxClassSwitches.length;
  const taxSummary = switchCount > 0
    ? damp.dampenTaxSwitches
      ? `§ 2b Muted · ${s.wifePostBirthHours}h`
      : `§ 2b Switch (${switchCount}) · ${s.wifePostBirthHours}h`
    : `No switch · ${s.wifePostBirthHours}h`;

  const kitaEnabled = Boolean(s.childcarePlan?.enabled);
  const hasExtraBenefits = hasConfiguredBenefitsOrDeductibles(s, extras);
  const kitaLabel = kitaEnabled
    ? damp.dampenKitaCosts
      ? "Kita Muted"
      : "Kita On"
    : "Kita Off";
  const costsSummary = hasExtraBenefits
    ? damp.dampenBenefitsAndDeductibles
      ? `${kitaLabel} · Extras Muted`
      : `${kitaLabel} + Extras`
    : kitaLabel;

  const zve = s.householdTaxableIncome?.[0]?.taxableIncome;
  const zveShort = zve !== undefined ? `ZvE €${Math.round(zve / 1000)}k` : "ZvE —";
  const capOk = diagnostics.incomeCap.status === PlanCapDiagnosticStatus.Eligible
    ? "OK"
    : diagnostics.incomeCap.status === PlanCapDiagnosticStatus.NearCap
      ? "Near"
      : diagnostics.incomeCap.status === PlanCapDiagnosticStatus.OverCap
        ? "Over"
        : "—";
  const horizonSummary = `${s.simulationDurationMonths}M · ${zveShort} (${capOk})`;

  return (
    <section className="plw-summary-strip" aria-label="Active plan parameters">
      <div className="plw-summary-strip__chips">
        <button
          type="button"
          className={`plw-summary-chip${hasRaises && damp.dampenRaisesAndBonuses ? " plw-summary-chip--muted" : ""}`}
          onClick={() => openPlanInputsDrawer(WorkbenchDrawerSection.Income)}
        >
          <EmploymentCompensationIcon size={13} />
          <span className="plw-summary-chip__k">Income</span>
          <strong className="plw-summary-chip__v tabular-nums">
            {formatEur(p1Pay)} / {formatEur(p2Pay)} · {classSummary}
          </strong>
        </button>

        <button
          type="button"
          className="plw-summary-chip"
          onClick={() => openPlanInputsDrawer(WorkbenchDrawerSection.Children)}
        >
          <ChildBirthMilestoneIcon size={13} />
          <span className="plw-summary-chip__k">Leave</span>
          <strong className="plw-summary-chip__v">{childSummary}</strong>
        </button>

        <button
          type="button"
          className={`plw-summary-chip${damp.dampenTaxSwitches ? " plw-summary-chip--muted" : ""}`}
          onClick={() => openPlanInputsDrawer(WorkbenchDrawerSection.TaxWork)}
        >
          <TaxClassSwitchIcon size={13} />
          <span className="plw-summary-chip__k">Tax</span>
          <strong className="plw-summary-chip__v">{taxSummary}</strong>
        </button>

        <button
          type="button"
          className={`plw-summary-chip${damp.dampenKitaCosts || damp.dampenBenefitsAndDeductibles ? " plw-summary-chip--muted" : ""}`}
          onClick={() => openPlanInputsDrawer(WorkbenchDrawerSection.Costs)}
        >
          <ChildcareKitaIcon size={13} />
          <span className="plw-summary-chip__k">Costs</span>
          <strong className="plw-summary-chip__v">{costsSummary}</strong>
        </button>

        <button
          type="button"
          className={`plw-summary-chip${damp.dampenInflationIndexing ? " plw-summary-chip--muted" : ""}`}
          onClick={() => openPlanInputsDrawer(WorkbenchDrawerSection.Macro)}
        >
          <SimulationPeriodIcon size={13} />
          <span className="plw-summary-chip__k">Horizon</span>
          <strong className="plw-summary-chip__v tabular-nums">{horizonSummary}</strong>
        </button>
      </div>

      <button
        type="button"
        className="plw-summary-strip__edit"
        onClick={() => openPlanInputsDrawer(WorkbenchDrawerSection.All)}
      >
        <ParameterSlidersIcon size={13} />
        <span>All Inputs</span>
      </button>
    </section>
  );
}
