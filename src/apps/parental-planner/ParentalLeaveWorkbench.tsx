import "./ParentalLeaveWorkbench.css";
import type {
  JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  AppShell,
} from "#components/ui/AppShell";
import {
  Badge,
  BadgeTone,
  Button,
  ButtonSize,
  ButtonVariant,
  PageHeader,
  useHydrated,
} from "#/components/ui/index.ts";
import {
  ClearFormIcon,
  ExportDataIcon,
  ParameterSlidersIcon,
  SamplePresetIcon,
} from "#components/Icons";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  WORKBENCH_PRESETS,
  WorkbenchPresetId,
  toWorkbenchPresetId,
} from "#engine/simulator/workbenchPresets";
import {
  StatutoryDeadlineSeverity,
  toSimulationMonth,
} from "#engine/types";
import {
  simMonthToCalendarDate,
} from "#engine/simulator/calendarNavigation";
import {
  applyWorkbenchPreset,
  clearWorkbenchPlan,
  syncWorkbenchFromLifeProfile,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  flushWorkbenchCalculations,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";
import {
  ExportImportMode,
  WorkbenchDrawerSection,
  WorkbenchTab,
  activeWorkbenchTab,
  openPlanInputsDrawer,
  openWorkbenchExportImport,
} from "#/apps/parental-planner/store/workbenchUiState.ts";
import {
  PlanSummaryStrip,
} from "#/apps/parental-planner/inputs/PlanSummaryStrip.tsx";
import {
  PlanInputsDrawer,
} from "#/apps/parental-planner/inputs/PlanInputsDrawer.tsx";
import {
  IncomeAdjustmentsModal,
} from "#/apps/parental-planner/inputs/IncomeAdjustmentsModal.tsx";
import {
  ChildDetailModal,
} from "#/apps/parental-planner/inputs/ChildDetailModal.tsx";
import {
  TaxAndScheduleModal,
} from "#/apps/parental-planner/inputs/TaxAndScheduleModal.tsx";
import {
  CostsBenefitsModal,
} from "#/apps/parental-planner/inputs/CostsBenefitsModal.tsx";
import {
  HorizonMacroModal,
} from "#/apps/parental-planner/inputs/HorizonMacroModal.tsx";
import {
  ScenarioSwitcherBar,
} from "#/apps/parental-planner/results/ScenarioSwitcherBar.tsx";
import {
  WorkbenchKpiStrip,
} from "#/apps/parental-planner/results/WorkbenchKpiStrip.tsx";
import {
  PlanDiagnosticsStrip,
} from "#/apps/parental-planner/results/PlanDiagnosticsStrip.tsx";
import {
  OverviewTab,
} from "#/apps/parental-planner/results/OverviewTab.tsx";
import {
  LedgerTab,
} from "#/apps/parental-planner/results/LedgerTab.tsx";
import {
  DeadlinesTab,
  evaluateWorkbenchDeadlines,
} from "#/apps/parental-planner/results/DeadlinesTab.tsx";
import {
  AnnualTaxTab,
} from "#/apps/parental-planner/results/AnnualTaxTab.tsx";
import {
  RulesAndParametersTab,
} from "#/apps/parental-planner/results/RulesAndParametersTab.tsx";
import {
  WorkbenchExportImportModal,
} from "#/apps/parental-planner/modals/WorkbenchExportImportModal.tsx";

const CURRENT_PATH = calculatorPath(AppId.ParentalPlanner);

/**
 * Parental Planner — Full-Screen Analysis Canvas with Slide-Over Plan Inputs Drawer,
 * Live Scenario Comparator & Non-Destructive Dampening Switches, and Inline Wiki Cross-Links.
 */
export default function ParentalLeaveWorkbench(): JSX.Element {
  const hydrated = useHydrated();
  const [selectedPreset, setSelectedPreset] = useState<WorkbenchPresetId>(WorkbenchPresetId.ClassicOneChild);
  const tab = activeWorkbenchTab.value;

  const deadlineWarningCount = hydrated
    ? evaluateWorkbenchDeadlines()
      .flatMap((r) => r.deadlines)
      .filter((d) => d.severity === StatutoryDeadlineSeverity.Warning).length
    : 0;

  const handlePresetChange = (value: string): void => {
    const id = toWorkbenchPresetId(value);
    setSelectedPreset(id);
    applyWorkbenchPreset(id);
    flushWorkbenchCalculations();
  };

  const handleSyncProfile = (): void => {
    syncWorkbenchFromLifeProfile();
    flushWorkbenchCalculations();
  };

  const handleClear = (): void => {
    setSelectedPreset(WorkbenchPresetId.BlankPlan);
    clearWorkbenchPlan();
    flushWorkbenchCalculations();
  };

  const s = workbenchState.value;
  const endCal = simMonthToCalendarDate(
    toSimulationMonth(s.simulationDurationMonths),
    s.startCalendarYear,
    s.startCalendarMonth,
  );
  const horizonEyebrow = `Parental Leave · BEEG & EStG · ${String(s.startCalendarMonth).padStart(2, "0")}.${s.startCalendarYear} – ${String(endCal.calendarMonth).padStart(2, "0")}.${endCal.calendarYear} · ${s.simulationDurationMonths} months`;

  return (
    <AppShell currentPath={CURRENT_PATH} wide>
      <PageHeader
        eyebrow={horizonEyebrow}
        title="Parental Planner"
        subtitle="Full-screen overview, chart, and monthly ledger with live scenario comparison and lever dampening. Open Plan Inputs whenever you want to adjust household figures."
        actions={(
          <div className="plw-header-controls">
            <Button
              size={ButtonSize.Sm}
              variant={ButtonVariant.Primary}
              onClick={() => openPlanInputsDrawer(WorkbenchDrawerSection.All)}
            >
              <ParameterSlidersIcon size={13} />
              <span>Edit Plan</span>
            </Button>
            <label htmlFor="plw-preset-picker" className="plw-inline-control__label">
              <SamplePresetIcon size={13} />
            </label>
            <select
              id="plw-preset-picker"
              className="plw-preset-select"
              aria-label="Load starter template"
              value={selectedPreset}
              onChange={(event) => handlePresetChange(event.currentTarget.value)}
            >
              {WORKBENCH_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
            <Button size={ButtonSize.Sm} variant={ButtonVariant.Ghost} onClick={handleClear}>
              <ClearFormIcon size={13} />
              <span>Clear</span>
            </Button>
            <Button size={ButtonSize.Sm} variant={ButtonVariant.Ghost} onClick={handleSyncProfile}>
              Sync Life Profile
            </Button>
            <Button
              size={ButtonSize.Sm}
              variant={ButtonVariant.Tint}
              onClick={() => openWorkbenchExportImport(ExportImportMode.Export)}
            >
              <ExportDataIcon size={13} />
              <span>Export / Import</span>
            </Button>
          </div>
        )}
      />

      {hydrated ? (
        <div className="plw-layout plw-layout--fullscreen">
          <PlanSummaryStrip />
          <ScenarioSwitcherBar />
          <WorkbenchKpiStrip />
          <PlanDiagnosticsStrip />

          <section className="plw-workspace-card" aria-label="Analysis workspace">
            <div className="plw-tabs" role="tablist" aria-label="Workbench analysis views">
              <button
                type="button"
                role="tab"
                aria-selected={tab === WorkbenchTab.Overview}
                className={`plw-tab${tab === WorkbenchTab.Overview ? " plw-tab--active" : ""}`}
                onClick={() => {
                  activeWorkbenchTab.value = WorkbenchTab.Overview;
                }}
              >
                Overview &amp; Chart
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === WorkbenchTab.Ledger}
                className={`plw-tab${tab === WorkbenchTab.Ledger ? " plw-tab--active" : ""}`}
                onClick={() => {
                  activeWorkbenchTab.value = WorkbenchTab.Ledger;
                }}
              >
                Monthly Ledger
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === WorkbenchTab.Deadlines}
                className={`plw-tab${tab === WorkbenchTab.Deadlines ? " plw-tab--active" : ""}`}
                onClick={() => {
                  activeWorkbenchTab.value = WorkbenchTab.Deadlines;
                }}
              >
                <span>Action Deadlines</span>
                {deadlineWarningCount > 0 && (
                  <Badge tone={BadgeTone.Loss}>{deadlineWarningCount}</Badge>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === WorkbenchTab.AnnualTax}
                className={`plw-tab${tab === WorkbenchTab.AnnualTax ? " plw-tab--active" : ""}`}
                onClick={() => {
                  activeWorkbenchTab.value = WorkbenchTab.AnnualTax;
                }}
              >
                Annual Tax
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === WorkbenchTab.Rules}
                className={`plw-tab${tab === WorkbenchTab.Rules ? " plw-tab--active" : ""}`}
                onClick={() => {
                  activeWorkbenchTab.value = WorkbenchTab.Rules;
                }}
              >
                Rules &amp; Parameters
              </button>
            </div>

            <div className="plw-tab-panel" role="tabpanel">
              {tab === WorkbenchTab.Overview && <OverviewTab />}
              {tab === WorkbenchTab.Ledger && <LedgerTab />}
              {tab === WorkbenchTab.Deadlines && <DeadlinesTab />}
              {tab === WorkbenchTab.AnnualTax && <AnnualTaxTab />}
              {tab === WorkbenchTab.Rules && <RulesAndParametersTab />}
            </div>
          </section>
        </div>
      ) : (
        <section className="plw-card" aria-busy="true">
          <div className="plw-card__body">
            <p className="plw-hint">Loading Parental Planner…</p>
          </div>
        </section>
      )}

      <PlanInputsDrawer />
      <IncomeAdjustmentsModal />
      <ChildDetailModal />
      <TaxAndScheduleModal />
      <CostsBenefitsModal />
      <HorizonMacroModal />
      <WorkbenchExportImportModal />
    </AppShell>
  );
}
