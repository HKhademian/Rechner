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
} from "#/components/ui/index.ts";
import {
  ChevronDownIcon,
  ParameterSlidersIcon,
  ResetDefaultsIcon,
} from "#components/Icons";
import {
  LifeDampeningKey,
  countActiveLifeDampened,
  lifeWorkbenchDampening,
  resetLifeDampening,
  toggleLifeDampening,
} from "#/apps/life-planner/store/lifeWorkbenchDampening.ts";
import {
  CalculationStatus,
  lifeCalculationStatus,
  lifePendingChanges,
} from "#/apps/life-planner/store/lifeWorkbenchSimulation.ts";
import {
  LifeScenarioView,
  activeLifeScenarioView,
} from "#/apps/life-planner/store/lifeWorkbenchUiState.ts";

const DAMPENING_ITEMS: readonly {
  readonly key: LifeDampeningKey;
  readonly label: string;
}[] = Object.freeze([
  { key: LifeDampeningKey.Career,
    label: "Suppress Career & Raises" },
  { key: LifeDampeningKey.Family,
    label: "Suppress Family & Childcare" },
  { key: LifeDampeningKey.HousingAsset,
    label: "Suppress Housing & Major Assets" },
  { key: LifeDampeningKey.Tax,
    label: "Suppress Tax Switches & Deductibles" },
  { key: LifeDampeningKey.ExpenseTravel,
    label: "Suppress Travel & One-Offs" },
  { key: LifeDampeningKey.InflationIndexing,
    label: "Suppress Inflation & Indexation (0%)" },
]);

/**
 * Concept A Right-Hand Workspace Controls:
 * Segmented Planned | Baseline | Stress Test | Compare switcher + Levers popover + status pill.
 */
export function LifeScenarioSwitcherBar(): JSX.Element {
  const [leversOpen, setLeversOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const view = activeLifeScenarioView.value;
  const damp = lifeWorkbenchDampening.value;
  const activeDampened = countActiveLifeDampened(damp);
  const status = lifeCalculationStatus.value;
  const pending = lifePendingChanges.value;

  useEffect(() => {
    if (!leversOpen || typeof document === "undefined") {
      return undefined;
    }
    const handlePointerDown = (e: Event): void => {
      if (e.target instanceof Node && popoverRef.current && !popoverRef.current.contains(e.target)) {
        setLeversOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setLeversOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [leversOpen]);

  const isDampened = (key: LifeDampeningKey): boolean => {
    switch (key) {
      case LifeDampeningKey.Career:
        return damp.dampenCareer;
      case LifeDampeningKey.Family:
        return damp.dampenFamily;
      case LifeDampeningKey.HousingAsset:
        return damp.dampenHousingAsset;
      case LifeDampeningKey.Tax:
        return damp.dampenTax;
      case LifeDampeningKey.ExpenseTravel:
        return damp.dampenExpenseTravel;
      case LifeDampeningKey.InflationIndexing:
        return damp.dampenInflationIndexing;
    }
  };

  return (
    <div className="lpw-scenario-controls">
      <div className="lpw-segmented" role="group" aria-label="Life scenario selector">
        <button
          type="button"
          className={`lpw-segmented__btn${view === LifeScenarioView.Planned ? " lpw-segmented__btn--active" : ""}`}
          onClick={() => {
            activeLifeScenarioView.value = LifeScenarioView.Planned;
          }}
        >
          Planned
        </button>
        <button
          type="button"
          className={`lpw-segmented__btn${view === LifeScenarioView.Baseline ? " lpw-segmented__btn--active" : ""}`}
          onClick={() => {
            activeLifeScenarioView.value = LifeScenarioView.Baseline;
          }}
        >
          Baseline
        </button>
        <button
          type="button"
          className={`lpw-segmented__btn${view === LifeScenarioView.StressTest ? " lpw-segmented__btn--active" : ""}`}
          onClick={() => {
            activeLifeScenarioView.value = LifeScenarioView.StressTest;
          }}
        >
          Stress Test
        </button>
        <button
          type="button"
          className={`lpw-segmented__btn${view === LifeScenarioView.Compare ? " lpw-segmented__btn--active" : ""}`}
          onClick={() => {
            activeLifeScenarioView.value = LifeScenarioView.Compare;
          }}
        >
          Compare
        </button>
      </div>

      <div className="lpw-popover-anchor" ref={popoverRef}>
        <button
          type="button"
          className="lpw-plan-menu-trigger"
          aria-expanded={leversOpen}
          onClick={() => setLeversOpen(!leversOpen)}
        >
          <ParameterSlidersIcon size={12} />
          <span>Levers</span>
          {activeDampened > 0 && <Badge tone={BadgeTone.Warning}>{activeDampened}</Badge>}
          <ChevronDownIcon size={12} />
        </button>

        {leversOpen && (
          <div className="lpw-plan-menu" role="dialog" aria-label="Non-destructive scenario levers">
            <div className="lpw-plan-menu__section">Non-Destructive Levers</div>
            {DAMPENING_ITEMS.map((item) => (
              <label key={item.key} className="lpw-plan-menu__item">
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={isDampened(item.key)}
                  onChange={() => toggleLifeDampening(item.key)}
                />
              </label>
            ))}
            {activeDampened > 0 && (
              <>
                <div className="lpw-plan-menu__divider" />
                <Button
                  size={ButtonSize.Sm}
                  variant={ButtonVariant.Ghost}
                  onClick={resetLifeDampening}
                >
                  <ResetDefaultsIcon size={12} />
                  <span>Reset All Levers</span>
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <span className="lpw-status-pill" aria-live="polite">
        {status === CalculationStatus.Pending
          ? `Updating (${pending})…`
          : status === CalculationStatus.Calculating
            ? "Simulating…"
            : "Live"}
      </span>
    </div>
  );
}
