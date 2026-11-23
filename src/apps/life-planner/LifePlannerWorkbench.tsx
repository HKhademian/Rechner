import "./LifePlannerWorkbench.css";
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
  AddActionIcon,
  CheckmarkIcon,
  ChevronDownIcon,
  ClearFormIcon,
  ExportDataIcon,
  ParameterSlidersIcon,
  SyncProfileActionIcon,
} from "#components/Icons";


import {
  type LifePlannerPresetId,
  LIFE_PLANNER_PRESETS,
} from "#engine/lifeSimulator/lifePlannerPresets";
import {
  LifeDeadlineSeverity,
} from "#engine/lifeSimulator/types";
import {
  applyLifePreset,
  clearLifePlan,
  importFromParentalPlanner,
  selectedLifePresetId,
  syncLifeWorkbenchFromProfile,
} from "#/apps/life-planner/store/lifeWorkbenchState.ts";
import {
  displayedActiveScenarioResult,
  flushLifeWorkbenchCalculations,
} from "#/apps/life-planner/store/lifeWorkbenchSimulation.ts";
import {
  LifeDrawerSection,
  LifeScenarioView,
  LifeWorkbenchTab,
  activeLifeScenarioView,
  activeLifeTab,
  openLifeEventComposer,
  openLifeExportImport,
  openLifeInputsDrawer,
} from "#/apps/life-planner/store/lifeWorkbenchUiState.ts";
import {
  LifePlanSummaryStrip,
} from "#/apps/life-planner/inputs/LifePlanSummaryStrip.tsx";
import {
  LifePlanInputsDrawer,
} from "#/apps/life-planner/inputs/LifePlanInputsDrawer.tsx";
import {
  LifeEventComposerModal,
} from "#/apps/life-planner/modals/LifeEventComposerModal.tsx";
import {
  LifeExportImportModal,
} from "#/apps/life-planner/modals/LifeExportImportModal.tsx";
import {
  CustomDisasterModal,
} from "#/apps/life-planner/modals/CustomDisasterModal.tsx";
import {
  LifeScenarioSwitcherBar,
} from "#/apps/life-planner/results/LifeScenarioSwitcherBar.tsx";
import {
  DisasterControlBar,
} from "#/apps/life-planner/results/DisasterControlBar.tsx";
import {
  LifeOverviewTab,
} from "#/apps/life-planner/results/LifeOverviewTab.tsx";
import {
  LifeTimelineTab,
} from "#/apps/life-planner/results/LifeTimelineTab.tsx";
import {
  LifeLedgerTab,
} from "#/apps/life-planner/results/LifeLedgerTab.tsx";
import {
  LifeAnnualTaxTab,
} from "#/apps/life-planner/results/LifeAnnualTaxTab.tsx";
import {
  LifeDeadlinesTab,
} from "#/apps/life-planner/results/LifeDeadlinesTab.tsx";
import {
  LifeRulesTab,
} from "#/apps/life-planner/results/LifeRulesTab.tsx";

/**
 * Life Planner Workbench — Concept A Quiet Command Header + Full-Screen Analysis Canvas.
 * Mirrors Parental Planner's two-row hairline chrome, slide-over Plan Inputs drawer,
 * non-destructive scenario levers, and contextual Life Disaster Simulator bar.
 */
export default function LifePlannerWorkbench(): JSX.Element {
  const hydrated = useHydrated();
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const planMenuRef = useRef<HTMLDivElement>(null);

  const tab = activeLifeTab.value;
  const view = activeLifeScenarioView.value;
  const activePreset = selectedLifePresetId.value;
  const showDisasterBar = view === LifeScenarioView.StressTest || view === LifeScenarioView.Compare;

  useEffect(() => {
    if (!planMenuOpen || typeof document === "undefined") {
      return undefined;
    }
    const handlePointerDown = (e: Event): void => {
      if (e.target instanceof Node && planMenuRef.current && !planMenuRef.current.contains(e.target)) {
        setPlanMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
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

  const warningDeadlinesCount = hydrated
    ? displayedActiveScenarioResult.value.deadlines.filter(
      (d) => d.severity === LifeDeadlineSeverity.Warning || d.severity === LifeDeadlineSeverity.Critical,
    ).length
    : 0;

  const handleSelectPreset = (id: LifePlannerPresetId): void => {
    setPlanMenuOpen(false);
    applyLifePreset(id);
    flushLifeWorkbenchCalculations();
  };

  const handleSyncProfile = (): void => {
    setPlanMenuOpen(false);
    syncLifeWorkbenchFromProfile();
    flushLifeWorkbenchCalculations();
  };

  const handleClear = (): void => {
    setPlanMenuOpen(false);
    clearLifePlan();
    flushLifeWorkbenchCalculations();
  };

  return (
    <>
      {hydrated ? (
        <div className="lpw-layout">
          {/* Row 1: Quiet Command Header */}
          <header className="lpw-command-header">
            <div className="lpw-command-header__lead">
              <div className="lpw-command-header__title-group">
                <h1 className="lpw-command-header__title">Life Planner</h1>
                <Badge tone={BadgeTone.Brand}>Beta</Badge>
              </div>
              <LifePlanSummaryStrip />
            </div>

            <div className="lpw-command-header__actions">
              <Button
                size={ButtonSize.Sm}
                variant={ButtonVariant.Secondary}
                onClick={openLifeEventComposer}
              >
                <AddActionIcon size={13} />
                <span>Add Event</span>
              </Button>

              <Button
                size={ButtonSize.Sm}
                variant={ButtonVariant.Primary}
                onClick={() => openLifeInputsDrawer(LifeDrawerSection.All)}
              >
                <ParameterSlidersIcon size={13} />
                <span>Edit Plan</span>
              </Button>

              <div className="lpw-popover-anchor" ref={planMenuRef}>
                <button
                  type="button"
                  className="lpw-plan-menu-trigger"
                  aria-expanded={planMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setPlanMenuOpen(!planMenuOpen)}
                >
                  <span>Plan</span>
                  <ChevronDownIcon size={12} />
                </button>

                {planMenuOpen && (
                  <div className="lpw-plan-menu" role="menu" aria-label="Life plan templates and actions">
                    <div className="lpw-plan-menu__section">Starter Templates</div>
                    {LIFE_PLANNER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={activePreset === preset.id}
                        className={`lpw-plan-menu__item${activePreset === preset.id ? " lpw-plan-menu__item--active" : ""}`}
                        onClick={() => handleSelectPreset(preset.id)}
                      >
                        <span>{preset.name}</span>
                        {activePreset === preset.id && <CheckmarkIcon size={13} />}
                      </button>
                    ))}

                    <div className="lpw-plan-menu__divider" role="separator" />

                    <button
                      type="button"
                      role="menuitem"
                      className="lpw-plan-menu__item"
                      onClick={handleSyncProfile}
                    >
                      <span className="lpw-plan-menu__item-lead">
                        <SyncProfileActionIcon size={13} />
                        <span>Sync Life Profile</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className="lpw-plan-menu__item"
                      onClick={() => {
                        setPlanMenuOpen(false);
                        if (importFromParentalPlanner()) {
                          flushLifeWorkbenchCalculations();
                        }
                      }}
                    >
                      <span className="lpw-plan-menu__item-lead">
                        <SyncProfileActionIcon size={13} />
                        <span>Import from Parental Planner</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className="lpw-plan-menu__item"
                      onClick={() => {
                        setPlanMenuOpen(false);
                        openLifeExportImport();
                      }}
                    >
                      <span className="lpw-plan-menu__item-lead">
                        <ExportDataIcon size={13} />
                        <span>Export / Import (JSON · CSV)</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      className="lpw-plan-menu__item lpw-plan-menu__item--danger"
                      onClick={handleClear}
                    >
                      <span className="lpw-plan-menu__item-lead">
                        <ClearFormIcon size={13} />
                        <span>Clear Plan (€0)</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Row 2: Unified Workspace Bar */}
          <div className="lpw-workspace-bar">
            <div className="lpw-workspace-tabs" role="tablist" aria-label="Life planner analysis views">
              <button
                type="button"
                role="tab"
                aria-selected={tab === LifeWorkbenchTab.Overview}
                className={`lpw-workspace-tab${tab === LifeWorkbenchTab.Overview ? " lpw-workspace-tab--active" : ""}`}
                onClick={() => {
                  activeLifeTab.value = LifeWorkbenchTab.Overview;
                }}
              >
                Overview &amp; Charts
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === LifeWorkbenchTab.Timeline}
                className={`lpw-workspace-tab${tab === LifeWorkbenchTab.Timeline ? " lpw-workspace-tab--active" : ""}`}
                onClick={() => {
                  activeLifeTab.value = LifeWorkbenchTab.Timeline;
                }}
              >
                Event Timeline
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === LifeWorkbenchTab.Ledger}
                className={`lpw-workspace-tab${tab === LifeWorkbenchTab.Ledger ? " lpw-workspace-tab--active" : ""}`}
                onClick={() => {
                  activeLifeTab.value = LifeWorkbenchTab.Ledger;
                }}
              >
                Monthly Ledger
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === LifeWorkbenchTab.AnnualTax}
                className={`lpw-workspace-tab${tab === LifeWorkbenchTab.AnnualTax ? " lpw-workspace-tab--active" : ""}`}
                onClick={() => {
                  activeLifeTab.value = LifeWorkbenchTab.AnnualTax;
                }}
              >
                Annual Tax
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === LifeWorkbenchTab.Deadlines}
                className={`lpw-workspace-tab${tab === LifeWorkbenchTab.Deadlines ? " lpw-workspace-tab--active" : ""}`}
                onClick={() => {
                  activeLifeTab.value = LifeWorkbenchTab.Deadlines;
                }}
              >
                <span>Deadlines</span>
                {warningDeadlinesCount > 0 && (
                  <Badge tone={BadgeTone.Warning}>{warningDeadlinesCount}</Badge>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === LifeWorkbenchTab.Rules}
                className={`lpw-workspace-tab${tab === LifeWorkbenchTab.Rules ? " lpw-workspace-tab--active" : ""}`}
                onClick={() => {
                  activeLifeTab.value = LifeWorkbenchTab.Rules;
                }}
              >
                Rules
              </button>
            </div>

            <LifeScenarioSwitcherBar />
          </div>

          {/* Contextual Disaster Simulator Bar (visible only in Stress Test or Compare) */}
          {showDisasterBar && <DisasterControlBar />}

          {/* Full-Width Analysis Canvas */}
          <section className="lpw-canvas-body" role="tabpanel">
            {tab === LifeWorkbenchTab.Overview && <LifeOverviewTab />}
            {tab === LifeWorkbenchTab.Timeline && <LifeTimelineTab />}
            {tab === LifeWorkbenchTab.Ledger && <LifeLedgerTab />}
            {tab === LifeWorkbenchTab.AnnualTax && <LifeAnnualTaxTab />}
            {tab === LifeWorkbenchTab.Deadlines && <LifeDeadlinesTab />}
            {tab === LifeWorkbenchTab.Rules && <LifeRulesTab />}
          </section>
        </div>
      ) : (
        <section className="lpw-card" aria-busy="true">
          <p className="lpw-hint">Loading Life Planner…</p>
        </section>
      )}

      <LifePlanInputsDrawer />
      <LifeEventComposerModal />
      <LifeExportImportModal />
      <CustomDisasterModal />
    </>
  );
}
