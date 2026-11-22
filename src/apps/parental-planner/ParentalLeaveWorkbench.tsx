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
  WorkbenchTab,
  activeWorkbenchTab,
  openWorkbenchExportImport,
} from "#/apps/parental-planner/store/workbenchUiState.ts";
import {
  HouseholdIncomeCard,
} from "#/apps/parental-planner/inputs/HouseholdIncomeCard.tsx";
import {
  ChildrenLeaveCard,
} from "#/apps/parental-planner/inputs/ChildrenLeaveCard.tsx";
import {
  TaxAndWorkCard,
} from "#/apps/parental-planner/inputs/TaxAndWorkCard.tsx";
import {
  CostsBenefitsCard,
} from "#/apps/parental-planner/inputs/CostsBenefitsCard.tsx";
import {
  HorizonMacroCard,
} from "#/apps/parental-planner/inputs/HorizonMacroCard.tsx";
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
 * Parental Leave Workbench (Beta) — Progressive Two-Zone Elterngeld & Family Cashflow Planner.
 * Steady-salary baseline by default, per-section granular drill-down modals, and inline wiki cross-links.
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
        subtitle="Salaries stay steady by default so parental-leave & tax-class trade-offs stay crystal clear. Expand any section with its granular button whenever you need raises, bonuses, benefits, or deductible expenses."
        actions={(
          <div className="plw-header-controls">
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
        <div className="plw-layout">
          <aside className="plw-rail" aria-label="Plan configuration inputs">
            <HouseholdIncomeCard />
            <ChildrenLeaveCard />
            <TaxAndWorkCard />
            <CostsBenefitsCard />
            <HorizonMacroCard />
          </aside>

          <div className="plw-canvas">
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

          <IncomeAdjustmentsModal />
          <ChildDetailModal />
          <TaxAndScheduleModal />
          <CostsBenefitsModal />
          <HorizonMacroModal />
          <WorkbenchExportImportModal />
        </div>
      ) : (
        <div className="plw-card">
          <p className="plw-card__hint">Loading Parental Leave Workbench…</p>
        </div>
      )}
    </AppShell>
  );
}
