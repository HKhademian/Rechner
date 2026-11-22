import type {
  JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  Badge,
  BadgeTone,
  Button,
  ButtonSize,
  ButtonVariant,
} from "#/components/ui/index.ts";
import {
  CareerPromotionMilestoneIcon,
  ChildcareKitaIcon,
  FinancialInflowIcon,
  OptimizationInsightIcon,
  ResetDefaultsIcon,
  SimulationPeriodIcon,
  TaxClassSwitchIcon,
} from "#components/Icons";
import {
  ActiveScenarioView,
} from "#engine/types";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  applyOptimalWorkbenchTaxSwitches,
  setWorkbenchActiveScenario,
  updateWorkbenchState,
  workbenchExtras,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  WorkbenchDampeningKey,
  countActiveDampenedSwitches,
  hasConfiguredBenefitsOrDeductibles,
  hasConfiguredRaisesOrBonuses,
  resetWorkbenchDampening,
  setWorkbenchDampening,
  toggleWorkbenchDampening,
  workbenchDampening,
} from "#/apps/parental-planner/store/workbenchDampening.ts";
import {
  CalculationStatus,
  displayedWorkbenchCurrentScenario,
  displayedWorkbenchMetrics,
  displayedWorkbenchScenarioA,
  displayedWorkbenchScenarioB,
  displayedWorkbenchScenarioC,
  flushWorkbenchCalculations,
  workbenchCalculationStatus,
  workbenchLastCalcDurationMs,
  workbenchPendingChanges,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";
import {
  WorkbenchGranularModal,
  lastSingleScenarioView,
  openWorkbenchModal,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

/**
 * Full-width Scenario Comparator & Live Dampening Switches Bar.
 * Lets users switch strategies (C / B / A / Compare) and toggle individual plan levers
 * on or off non-destructively right above the full-screen chart & ledger.
 */
export function ScenarioSwitcherBar(): JSX.Element {
  const [auditOpen, setAuditOpen] = useState(false);
  const s = workbenchState.value;
  const extras = workbenchExtras.value;
  const damp = workbenchDampening.value;
  const status = workbenchCalculationStatus.value;
  const pending = workbenchPendingChanges.value;
  const durationMs = workbenchLastCalcDurationMs.value;
  const current = displayedWorkbenchCurrentScenario.value;
  const metrics = displayedWorkbenchMetrics.value;
  const aTotal = displayedWorkbenchScenarioA.value.summary.grandTotal;
  const bTotal = displayedWorkbenchScenarioB.value.summary.grandTotal;
  const cTotal = displayedWorkbenchScenarioC.value.summary.grandTotal;

  const isCompare = s.activeScenario === ActiveScenarioView.Compare;
  const dampenedCount = countActiveDampenedSwitches(damp);

  const selectScenario = (view: ActiveScenarioView): void => {
    if (view !== ActiveScenarioView.Compare) {
      lastSingleScenarioView.value = view;
    }
    setWorkbenchActiveScenario(view);
  };

  const toggleComparator = (): void => {
    if (isCompare) {
      setWorkbenchActiveScenario(lastSingleScenarioView.peek());
    }
    else {
      lastSingleScenarioView.value = s.activeScenario;
      setWorkbenchActiveScenario(ActiveScenarioView.Compare);
    }
  };

  const hasTaxSwitches = s.customTaxClassSwitches.length > 0;
  const taxSwitchActive = hasTaxSwitches && !damp.dampenTaxSwitches;
  const handleToggleTaxSwitch = (): void => {
    if (hasTaxSwitches) {
      toggleWorkbenchDampening(WorkbenchDampeningKey.TaxSwitches);
    }
    else if (s.customPregnancies.length > 0) {
      setWorkbenchDampening(WorkbenchDampeningKey.TaxSwitches, false);
      applyOptimalWorkbenchTaxSwitches();
    }
    else {
      openWorkbenchModal(WorkbenchGranularModal.TaxWork);
      return;
    }
    flushWorkbenchCalculations();
  };

  const hasKitaConfigured = Boolean(s.childcarePlan?.enabled);
  const kitaActive = hasKitaConfigured && !damp.dampenKitaCosts;
  const handleToggleKita = (): void => {
    if (hasKitaConfigured) {
      toggleWorkbenchDampening(WorkbenchDampeningKey.KitaCosts);
    }
    else {
      setWorkbenchDampening(WorkbenchDampeningKey.KitaCosts, false);
      updateWorkbenchState((prev) => ({
        ...prev,
        childcarePlan: prev.childcarePlan
          ? Object.freeze({
            ...prev.childcarePlan,
            enabled: true,
          })
          : prev.childcarePlan,
      }));
    }
    flushWorkbenchCalculations();
  };

  const hasRaises = hasConfiguredRaisesOrBonuses(s);
  const raisesActive = hasRaises && !damp.dampenRaisesAndBonuses;
  const handleToggleRaises = (): void => {
    if (!hasRaises) {
      openWorkbenchModal(WorkbenchGranularModal.Income);
      return;
    }
    toggleWorkbenchDampening(WorkbenchDampeningKey.RaisesAndBonuses);
    flushWorkbenchCalculations();
  };

  const hasExtras = hasConfiguredBenefitsOrDeductibles(s, extras);
  const extrasActive = hasExtras && !damp.dampenBenefitsAndDeductibles;
  const handleToggleExtras = (): void => {
    if (!hasExtras) {
      openWorkbenchModal(WorkbenchGranularModal.Costs);
      return;
    }
    toggleWorkbenchDampening(WorkbenchDampeningKey.BenefitsAndDeductibles);
    flushWorkbenchCalculations();
  };

  const hasIndexing = Boolean(s.indexFutureTaxBrackets);
  const indexingActive = hasIndexing && !damp.dampenInflationIndexing;
  const handleToggleIndexing = (): void => {
    if (hasIndexing) {
      toggleWorkbenchDampening(WorkbenchDampeningKey.InflationIndexing);
    }
    else {
      setWorkbenchDampening(WorkbenchDampeningKey.InflationIndexing, false);
      updateWorkbenchState((prev) => ({
        ...prev,
        indexFutureTaxBrackets: true,
      }));
    }
    flushWorkbenchCalculations();
  };

  const handleResetDampening = (): void => {
    resetWorkbenchDampening();
    flushWorkbenchCalculations();
  };

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
    <section className="plw-sticky-bar" aria-label="Scenario comparator and dampening controls">
      <div className="plw-sticky-bar__row">
        <div className="plw-sticky-bar__lead">
          <strong>Scenario Comparator</strong>
          <span>Compare strategies &amp; isolate levers live</span>
        </div>

        <div className="plw-toolbar__group">
          <Button
            size={ButtonSize.Sm}
            variant={isCompare ? ButtonVariant.Primary : ButtonVariant.Tint}
            onClick={toggleComparator}
          >
            <OptimizationInsightIcon size={13} />
            <span>{isCompare ? "Comparing C · B · A" : "Compare C vs B vs A"}</span>
          </Button>
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
          onClick={() => selectScenario(ActiveScenarioView.StatutoryOptimized)}
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
          onClick={() => selectScenario(ActiveScenarioView.UnoptimizedBaseline)}
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
          onClick={() => selectScenario(ActiveScenarioView.StatusQuo)}
        >
          <div className="plw-scenario-card__top">
            <span className="plw-scenario-card__name">No Planned Births (A)</span>
            <span className="plw-scenario-card__tag">Reference</span>
          </div>
          <div className="plw-scenario-card__val">{formatEur(aTotal)}</div>
        </button>

        <button
          type="button"
          className={`plw-scenario-card${isCompare ? " plw-scenario-card--active" : ""}`}
          aria-pressed={isCompare}
          onClick={() => selectScenario(ActiveScenarioView.Compare)}
        >
          <div className="plw-scenario-card__top">
            <span className="plw-scenario-card__name">Compare All Three</span>
            <span className="plw-scenario-card__tag">Overlay</span>
          </div>
          <div className="plw-scenario-card__sub tabular-nums">
            C vs B: {metrics.gainCvsB >= 0 ? "+" : ""}{formatEur(metrics.gainCvsB)}
          </div>
        </button>
      </div>

      <div className="plw-dampening-bar" role="group" aria-label="Scenario dampening switches">
        <span className="plw-dampening-bar__label">Scenario Levers</span>

        <div className="plw-dampening-bar__switches">
          <button
            type="button"
            role="switch"
            aria-checked={taxSwitchActive}
            className={`plw-lever-pill${taxSwitchActive ? " plw-lever-pill--on" : damp.dampenTaxSwitches ? " plw-lever-pill--dampened" : ""}`}
            onClick={handleToggleTaxSwitch}
          >
            <TaxClassSwitchIcon size={12} />
            <span>§ 2b Tax Switch</span>
            <span className="plw-lever-pill__state">
              {taxSwitchActive ? "On" : damp.dampenTaxSwitches ? "Muted" : "Off"}
            </span>
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={kitaActive}
            className={`plw-lever-pill${kitaActive ? " plw-lever-pill--on" : damp.dampenKitaCosts ? " plw-lever-pill--dampened" : ""}`}
            onClick={handleToggleKita}
          >
            <ChildcareKitaIcon size={12} />
            <span>Kita Childcare</span>
            <span className="plw-lever-pill__state">
              {kitaActive ? "On" : damp.dampenKitaCosts ? "Muted" : "Off"}
            </span>
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={raisesActive}
            className={`plw-lever-pill${raisesActive ? " plw-lever-pill--on" : damp.dampenRaisesAndBonuses ? " plw-lever-pill--dampened" : ""}`}
            onClick={handleToggleRaises}
          >
            <CareerPromotionMilestoneIcon size={12} />
            <span>Raises &amp; Bonuses</span>
            <span className="plw-lever-pill__state">
              {raisesActive ? "On" : damp.dampenRaisesAndBonuses ? "Muted" : "Steady +"}
            </span>
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={extrasActive}
            className={`plw-lever-pill${extrasActive ? " plw-lever-pill--on" : damp.dampenBenefitsAndDeductibles ? " plw-lever-pill--dampened" : ""}`}
            onClick={handleToggleExtras}
          >
            <FinancialInflowIcon size={12} />
            <span>Benefits &amp; Deductibles</span>
            <span className="plw-lever-pill__state">
              {extrasActive ? "On" : damp.dampenBenefitsAndDeductibles ? "Muted" : "None +"}
            </span>
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={indexingActive}
            className={`plw-lever-pill${indexingActive ? " plw-lever-pill--on" : damp.dampenInflationIndexing ? " plw-lever-pill--dampened" : ""}`}
            onClick={handleToggleIndexing}
          >
            <SimulationPeriodIcon size={12} />
            <span>CPI Indexing</span>
            <span className="plw-lever-pill__state">
              {indexingActive ? "On" : damp.dampenInflationIndexing ? "Muted" : "Off"}
            </span>
          </button>
        </div>

        {dampenedCount > 0 && (
          <div className="plw-dampening-bar__reset">
            <Badge tone={BadgeTone.Warning}>{dampenedCount} muted</Badge>
            <button
              type="button"
              className="plw-dampening-bar__restore"
              onClick={handleResetDampening}
            >
              <ResetDefaultsIcon size={12} />
              <span>Restore all</span>
            </button>
          </div>
        )}
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
