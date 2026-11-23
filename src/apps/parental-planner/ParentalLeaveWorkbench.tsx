import "./ParentalLeaveWorkbench.css";
import type {
  JSX,
} from "preact";
import {
  useEffect,
  useRef,
  useState,
} from "preact/hooks";


import {
  Badge,
  BadgeTone,
  Button,
  ButtonSize,
  ButtonVariant,
  useHydrated,
} from "#/components/ui/index.ts";
import {
  CheckmarkIcon,
  ChevronDownIcon,
  ClearFormIcon,
  ExportDataIcon,
  ParameterSlidersIcon,
  SyncProfileActionIcon,
} from "#components/Icons";


import {
  WORKBENCH_PRESETS,
  WorkbenchPresetId,
} from "#engine/simulator/workbenchPresets";
import {
  StatutoryDeadlineSeverity,
} from "#engine/types";
import {
  applyWorkbenchPreset,
  clearWorkbenchPlan,
  syncWorkbenchFromLifeProfile,
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

/**
 * Parental Planner — Concept A Quiet Command Header + Full-Screen Analysis Canvas.
 * Two ultra-slim hairline rows (~110px chrome) keep the Overview chart & Monthly Ledger
 * immediately above the fold, with slide-over Plan Inputs and non-destructive Scenario Levers.
 */
export default function ParentalLeaveWorkbench(): JSX.Element {
  const hydrated = useHydrated();
  const [selectedPreset, setSelectedPreset] = useState<WorkbenchPresetId>(WorkbenchPresetId.ClassicOneChild);
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const planMenuRef = useRef<HTMLDivElement>(null);
  const tab = activeWorkbenchTab.value;

  useEffect(() => {
    if (!planMenuOpen || typeof document === "undefined") {
      return undefined;
    }
    const handlePointerDown = (event: Event): void => {
      if (
        event.target instanceof Node &&
        planMenuRef.current &&
        !planMenuRef.current.contains(event.target)
      ) {
        setPlanMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setPlanMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [planMenuOpen]);

  const deadlineWarningCount = hydrated
    ? evaluateWorkbenchDeadlines()
      .flatMap((r) => r.deadlines)
      .filter((d) => d.severity === StatutoryDeadlineSeverity.Warning).length
    : 0;

  const handleSelectPreset = (id: WorkbenchPresetId): void => {
    setSelectedPreset(id);
    setPlanMenuOpen(false);
    applyWorkbenchPreset(id);
    flushWorkbenchCalculations();
  };

  const handleSyncProfile = (): void => {
    setPlanMenuOpen(false);
    syncWorkbenchFromLifeProfile();
    flushWorkbenchCalculations();
  };

  const handleClear = (): void => {
    setSelectedPreset(WorkbenchPresetId.BlankPlan);
    setPlanMenuOpen(false);
    clearWorkbenchPlan();
    flushWorkbenchCalculations();
  };

  const handleOpenExportImport = (): void => {
    setPlanMenuOpen(false);
    openWorkbenchExportImport(ExportImportMode.Export);
  };

  return (
    <>
      {hydrated ? (
        <div className="plw-layout plw-layout--fullscreen">
          {/* Row 1: Quiet Command Header */}
          <header className="plw-command-header">
            <div className="plw-command-header__lead">
              <h1 className="plw-command-header__title">Parental Planner</h1>
              <PlanSummaryStrip />
            </div>

            <div className="plw-command-header__actions">
              <Button
                size={ButtonSize.Sm}
                variant={ButtonVariant.Primary}
                onClick={() => openPlanInputsDrawer(WorkbenchDrawerSection.All)}
              >
                <ParameterSlidersIcon size={13} />
                <span>Edit Plan</span>
              </Button>

              <div className="plw-popover-anchor" ref={planMenuRef}>
                <button
                  type="button"
                  className="plw-plan-menu-trigger"
                  aria-expanded={planMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setPlanMenuOpen(!planMenuOpen)}
                >
                  <span>Plan</span>
                  <ChevronDownIcon size={12} />
                </button>

                {planMenuOpen && (
                  <div className="plw-plan-menu" role="menu" aria-label="Plan templates and actions">
                    <div className="plw-plan-menu__section">Starter Templates</div>
                    {WORKBENCH_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selectedPreset === preset.id}
                        className={`plw-plan-menu__item${selectedPreset === preset.id ? " plw-plan-menu__item--active" : ""}`}
                        onClick={() => handleSelectPreset(preset.id)}
                      >
                        <span>{preset.name}</span>
                        {selectedPreset === preset.id && <CheckmarkIcon size={13} />}
                      </button>
                    ))}

                    <div className="plw-plan-menu__divider" role="separator" />

                    <button
                      type="button"
                      role="menuitem"
                      className="plw-plan-menu__item"
                      onClick={handleSyncProfile}
                    >
                      <span className="plw-plan-menu__item-lead">
                        <SyncProfileActionIcon size={13} />
                        <span>Sync Life Profile</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className="plw-plan-menu__item"
                      onClick={handleOpenExportImport}
                    >
                      <span className="plw-plan-menu__item-lead">
                        <ExportDataIcon size={13} />
                        <span>Export / Import (ZIP · JSON · PDF)</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className="plw-plan-menu__item plw-plan-menu__item--danger"
                      onClick={handleClear}
                    >
                      <span className="plw-plan-menu__item-lead">
                        <ClearFormIcon size={13} />
                        <span>Clear Plan (€0)</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Row 2: Unified Workspace Bar (Tabs + Segmented Scenario + Levers Popover) */}
          <div className="plw-workspace-bar">
            <div className="plw-workspace-tabs" role="tablist" aria-label="Workbench analysis views">
              <button
                type="button"
                role="tab"
                aria-selected={tab === WorkbenchTab.Overview}
                className={`plw-workspace-tab${tab === WorkbenchTab.Overview ? " plw-workspace-tab--active" : ""}`}
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
                className={`plw-workspace-tab${tab === WorkbenchTab.Ledger ? " plw-workspace-tab--active" : ""}`}
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
                className={`plw-workspace-tab${tab === WorkbenchTab.Deadlines ? " plw-workspace-tab--active" : ""}`}
                onClick={() => {
                  activeWorkbenchTab.value = WorkbenchTab.Deadlines;
                }}
              >
                <span>Deadlines</span>
                {deadlineWarningCount > 0 && (
                  <Badge tone={BadgeTone.Loss}>{deadlineWarningCount}</Badge>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === WorkbenchTab.AnnualTax}
                className={`plw-workspace-tab${tab === WorkbenchTab.AnnualTax ? " plw-workspace-tab--active" : ""}`}
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
                className={`plw-workspace-tab${tab === WorkbenchTab.Rules ? " plw-workspace-tab--active" : ""}`}
                onClick={() => {
                  activeWorkbenchTab.value = WorkbenchTab.Rules;
                }}
              >
                Rules
              </button>
            </div>

            <ScenarioSwitcherBar />
          </div>

          {/* Main Workspace Canvas (immediately above the fold!) */}
          <section className="plw-canvas-body" role="tabpanel">
            {tab === WorkbenchTab.Overview && <OverviewTab />}
            {tab === WorkbenchTab.Ledger && <LedgerTab />}
            {tab === WorkbenchTab.Deadlines && <DeadlinesTab />}
            {tab === WorkbenchTab.AnnualTax && <AnnualTaxTab />}
            {tab === WorkbenchTab.Rules && <RulesAndParametersTab />}
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
    </>
  );
}
