import type {
  JSX,
} from "preact";
import {
  useEffect,
  useRef,
  useState,
} from "preact/hooks";
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from "#/components/ui/index.ts";
import {
  ChevronDownIcon,
  ParameterSlidersIcon,
  ResetDefaultsIcon,
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
  displayedWorkbenchMetrics,
  displayedWorkbenchScenarioA,
  displayedWorkbenchScenarioB,
  displayedWorkbenchScenarioC,
  flushWorkbenchCalculations,
  workbenchCalculationStatus,
  workbenchPendingChanges,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";
import {
  WorkbenchGranularModal,
  lastSingleScenarioView,
  openWorkbenchModal,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

function formatShortEuroK(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1000) {
    return `${amount < 0 ? "-" : ""}€${Math.round(abs / 1000)}k`;
  }
  return formatEur(amount);
}

/**
 * Concept A Unified Workspace Right-Hand Controls:
 * Compact segmented Scenario Switcher (C | B | A | Compare) + clean Levers ▾ popover.
 */
export function ScenarioSwitcherBar(): JSX.Element {
  const [leversOpen, setLeversOpen] = useState(false);
  const popoverWrapRef = useRef<HTMLDivElement>(null);

  const s = workbenchState.value;
  const extras = workbenchExtras.value;
  const damp = workbenchDampening.value;
  const status = workbenchCalculationStatus.value;
  const pending = workbenchPendingChanges.value;
  const metrics = displayedWorkbenchMetrics.value;
  const aTotal = displayedWorkbenchScenarioA.value.summary.grandTotal;
  const bTotal = displayedWorkbenchScenarioB.value.summary.grandTotal;
  const cTotal = displayedWorkbenchScenarioC.value.summary.grandTotal;

  useEffect(() => {
    if (!leversOpen || typeof document === "undefined") {
      return undefined;
    }
    const handlePointerDown = (event: Event): void => {
      if (
        event.target instanceof Node &&
        popoverWrapRef.current &&
        !popoverWrapRef.current.contains(event.target)
      ) {
        setLeversOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setLeversOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [leversOpen]);

  const selectScenario = (view: ActiveScenarioView): void => {
    if (view !== ActiveScenarioView.Compare) {
      lastSingleScenarioView.value = view;
    }
    setWorkbenchActiveScenario(view);
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
      setLeversOpen(false);
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
      setLeversOpen(false);
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
      setLeversOpen(false);
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

  const dampenedCount = countActiveDampenedSwitches(damp);
  const activeLeverCount =
    (taxSwitchActive ? 1 : 0) +
    (kitaActive ? 1 : 0) +
    (raisesActive ? 1 : 0) +
    (extrasActive ? 1 : 0) +
    (indexingActive ? 1 : 0);
  const isStale = status === CalculationStatus.Reevaluating || status === CalculationStatus.Calculating;

  return (
    <div className="plw-workspace-controls">
      {isStale && (
        <Button
          size={ButtonSize.Sm}
          variant={ButtonVariant.Tint}
          onClick={flushWorkbenchCalculations}
        >
          {status === CalculationStatus.Calculating ? "Calculating…" : `Apply (${pending})`}
        </Button>
      )}

      <div className="plw-seg-scenarios" role="group" aria-label="Select scenario strategy">
        <button
          type="button"
          className={`plw-seg-scenarios__btn${s.activeScenario === ActiveScenarioView.StatutoryOptimized ? " plw-seg-scenarios__btn--active" : ""}`}
          aria-pressed={s.activeScenario === ActiveScenarioView.StatutoryOptimized}
          title={`Planned Switches (C): ${formatEur(cTotal)}`}
          onClick={() => selectScenario(ActiveScenarioView.StatutoryOptimized)}
        >
          <span>C</span>
          <span className="plw-seg-scenarios__amt tabular-nums">{formatShortEuroK(cTotal)}</span>
        </button>

        <button
          type="button"
          className={`plw-seg-scenarios__btn${s.activeScenario === ActiveScenarioView.UnoptimizedBaseline ? " plw-seg-scenarios__btn--active" : ""}`}
          aria-pressed={s.activeScenario === ActiveScenarioView.UnoptimizedBaseline}
          title={`Original Classes (B): ${formatEur(bTotal)}`}
          onClick={() => selectScenario(ActiveScenarioView.UnoptimizedBaseline)}
        >
          <span>B</span>
          <span className="plw-seg-scenarios__amt tabular-nums">{formatShortEuroK(bTotal)}</span>
        </button>

        <button
          type="button"
          className={`plw-seg-scenarios__btn${s.activeScenario === ActiveScenarioView.StatusQuo ? " plw-seg-scenarios__btn--active" : ""}`}
          aria-pressed={s.activeScenario === ActiveScenarioView.StatusQuo}
          title={`No Planned Births (A): ${formatEur(aTotal)}`}
          onClick={() => selectScenario(ActiveScenarioView.StatusQuo)}
        >
          <span>A</span>
          <span className="plw-seg-scenarios__amt tabular-nums">{formatShortEuroK(aTotal)}</span>
        </button>

        <button
          type="button"
          className={`plw-seg-scenarios__btn${s.activeScenario === ActiveScenarioView.Compare ? " plw-seg-scenarios__btn--active" : ""}`}
          aria-pressed={s.activeScenario === ActiveScenarioView.Compare}
          title={`Compare C vs B vs A (C vs B: ${metrics.gainCvsB >= 0 ? "+" : ""}${formatEur(metrics.gainCvsB)})`}
          onClick={() => selectScenario(ActiveScenarioView.Compare)}
        >
          Compare
        </button>
      </div>

      <div className="plw-popover-anchor" ref={popoverWrapRef}>
        <button
          type="button"
          className={`plw-levers-trigger${dampenedCount > 0 ? " plw-levers-trigger--muted" : ""}`}
          aria-expanded={leversOpen}
          aria-haspopup="menu"
          onClick={() => setLeversOpen(!leversOpen)}
        >
          <ParameterSlidersIcon size={12} />
          <span>
            {dampenedCount > 0 ? `Levers (${dampenedCount} muted)` : `Levers (${activeLeverCount}/5)`}
          </span>
          <ChevronDownIcon size={12} />
        </button>

        {leversOpen && (
          <div className="plw-levers-popover" role="menu" aria-label="Scenario dampening switches">
            <div className="plw-levers-popover__head">
              <strong>Scenario Levers</strong>
              <span>Mute or enable without losing inputs</span>
            </div>

            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={taxSwitchActive}
              className="plw-levers-popover__row"
              onClick={handleToggleTaxSwitch}
            >
              <div>
                <div className="plw-levers-popover__title">§ 2b Tax-Class Switch</div>
                <div className="plw-levers-popover__sub">
                  {hasTaxSwitches
                    ? `${s.customTaxClassSwitches.length} switch(es) · ${metrics.gainCvsB >= 0 ? "+" : ""}${formatEur(metrics.gainCvsB)}`
                    : "Synthesize optimal § 2b switch"}
                </div>
              </div>
              <span className={`plw-levers-popover__pill${taxSwitchActive ? " plw-levers-popover__pill--on" : damp.dampenTaxSwitches ? " plw-levers-popover__pill--muted" : ""}`}>
                {taxSwitchActive ? "ON" : damp.dampenTaxSwitches ? "MUTED" : "OFF"}
              </span>
            </button>

            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={kitaActive}
              className="plw-levers-popover__row"
              onClick={handleToggleKita}
            >
              <div>
                <div className="plw-levers-popover__title">Kita Childcare Fees</div>
                <div className="plw-levers-popover__sub">
                  {hasKitaConfigured ? "Configured childcare schedule" : "Enable default Kita fee"}
                </div>
              </div>
              <span className={`plw-levers-popover__pill${kitaActive ? " plw-levers-popover__pill--on" : damp.dampenKitaCosts ? " plw-levers-popover__pill--muted" : ""}`}>
                {kitaActive ? "ON" : damp.dampenKitaCosts ? "MUTED" : "OFF"}
              </span>
            </button>

            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={raisesActive}
              className="plw-levers-popover__row"
              onClick={handleToggleRaises}
            >
              <div>
                <div className="plw-levers-popover__title">Raises &amp; Bonuses</div>
                <div className="plw-levers-popover__sub">
                  {hasRaises ? "Custom raises, bonus, or 13th month" : "Steady baseline · click to add"}
                </div>
              </div>
              <span className={`plw-levers-popover__pill${raisesActive ? " plw-levers-popover__pill--on" : damp.dampenRaisesAndBonuses ? " plw-levers-popover__pill--muted" : ""}`}>
                {raisesActive ? "ON" : damp.dampenRaisesAndBonuses ? "MUTED" : "ADD +"}
              </span>
            </button>

            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={extrasActive}
              className="plw-levers-popover__row"
              onClick={handleToggleExtras}
            >
              <div>
                <div className="plw-levers-popover__title">Benefits &amp; Deductibles</div>
                <div className="plw-levers-popover__sub">
                  {hasExtras ? "Regional grants, events, or §§ 9/10/35a" : "None configured · click to add"}
                </div>
              </div>
              <span className={`plw-levers-popover__pill${extrasActive ? " plw-levers-popover__pill--on" : damp.dampenBenefitsAndDeductibles ? " plw-levers-popover__pill--muted" : ""}`}>
                {extrasActive ? "ON" : damp.dampenBenefitsAndDeductibles ? "MUTED" : "ADD +"}
              </span>
            </button>

            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={indexingActive}
              className="plw-levers-popover__row"
              onClick={handleToggleIndexing}
            >
              <div>
                <div className="plw-levers-popover__title">Bracket / CPI Indexing</div>
                <div className="plw-levers-popover__sub">Future tax bracket inflation adjustment</div>
              </div>
              <span className={`plw-levers-popover__pill${indexingActive ? " plw-levers-popover__pill--on" : damp.dampenInflationIndexing ? " plw-levers-popover__pill--muted" : ""}`}>
                {indexingActive ? "ON" : damp.dampenInflationIndexing ? "MUTED" : "OFF"}
              </span>
            </button>

            {dampenedCount > 0 && (
              <div className="plw-levers-popover__footer">
                <button
                  type="button"
                  className="plw-dampening-bar__restore"
                  onClick={() => {
                    resetWorkbenchDampening();
                    flushWorkbenchCalculations();
                  }}
                >
                  <ResetDefaultsIcon size={12} />
                  <span>Restore all muted levers</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
