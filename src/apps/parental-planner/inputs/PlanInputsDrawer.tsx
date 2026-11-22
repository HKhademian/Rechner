import type {
  JSX,
} from "preact";
import {
  useId,
  useLayoutEffect,
} from "preact/hooks";
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from "#/components/ui/index.ts";
import {
  CloseIcon,
} from "#components/Icons";
import {
  lockBodyScroll,
} from "#utils/uiHelpers";
import {
  formatEur,
} from "#utils/currencyFormat";
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
  displayedWorkbenchCurrentScenario,
  displayedWorkbenchMetrics,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";
import {
  WorkbenchDrawerSection,
  WorkbenchGranularModal,
  activeDrawerSection,
  activeWorkbenchModal,
  closePlanInputsDrawer,
  isPlanInputsDrawerOpen,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

const DRAWER_SECTION_TABS: readonly {
  readonly id: WorkbenchDrawerSection;
  readonly label: string;
}[] = Object.freeze([
  { id: WorkbenchDrawerSection.All,
    label: "All (5)" },
  { id: WorkbenchDrawerSection.Income,
    label: "Income" },
  { id: WorkbenchDrawerSection.Children,
    label: "Children" },
  { id: WorkbenchDrawerSection.TaxWork,
    label: "Tax & Work" },
  { id: WorkbenchDrawerSection.Costs,
    label: "Costs" },
  { id: WorkbenchDrawerSection.Macro,
    label: "Horizon" },
]);

/**
 * Slide-over Plan Inputs Drawer housing the 5 steady-salary configuration cards
 * while keeping the default view 100% full-screen on the analysis canvas.
 */
export function PlanInputsDrawer(): JSX.Element | null {
  const open = isPlanInputsDrawerOpen.value;
  const section = activeDrawerSection.value;
  const headingId = useId();

  useLayoutEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }
    const unlockScroll = lockBodyScroll(
      document,
      typeof window !== "undefined" && typeof window.getComputedStyle === "function"
        ? (body) => window.getComputedStyle(body).paddingRight
        : undefined,
    );
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.key === "Escape" &&
        activeWorkbenchModal.peek() === WorkbenchGranularModal.None
      ) {
        event.stopPropagation();
        closePlanInputsDrawer();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      unlockScroll();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const current = displayedWorkbenchCurrentScenario.value;
  const metrics = displayedWorkbenchMetrics.value;
  const showAll = section === WorkbenchDrawerSection.All;

  return (
    <div
      className="plw-drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closePlanInputsDrawer();
        }
      }}
    >
      <aside className="plw-drawer-panel" aria-label="Plan configuration inputs">
        <div className="plw-drawer-panel__header">
          <div>
            <h2 id={headingId} className="plw-drawer-panel__title">
              Plan Inputs
            </h2>
            <p className="plw-drawer-panel__sub">
              Changes recalculate the full-screen overview &amp; ledger live.
            </p>
          </div>
          <button
            type="button"
            className="plw-drawer-panel__close"
            aria-label="Close plan inputs drawer"
            onClick={closePlanInputsDrawer}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="plw-drawer-nav" role="tablist" aria-label="Filter input sections">
          {DRAWER_SECTION_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={section === item.id}
              className={`plw-drawer-nav__pill${section === item.id ? " plw-drawer-nav__pill--active" : ""}`}
              onClick={() => {
                activeDrawerSection.value = item.id;
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="plw-drawer-panel__body">
          {(showAll || section === WorkbenchDrawerSection.Income) && <HouseholdIncomeCard />}
          {(showAll || section === WorkbenchDrawerSection.Children) && <ChildrenLeaveCard />}
          {(showAll || section === WorkbenchDrawerSection.TaxWork) && <TaxAndWorkCard />}
          {(showAll || section === WorkbenchDrawerSection.Costs) && <CostsBenefitsCard />}
          {(showAll || section === WorkbenchDrawerSection.Macro) && <HorizonMacroCard />}
        </div>

        <div className="plw-drawer-panel__footer">
          <div className="plw-drawer-panel__live-stat">
            <span>Net Cash Flow</span>
            <strong className="tabular-nums">{formatEur(current.summary.grandTotal)}</strong>
            <span className="plw-drawer-panel__delta tabular-nums">
              § 2b: {metrics.gainCvsB >= 0 ? "+" : ""}{formatEur(metrics.gainCvsB)}
            </span>
          </div>
          <Button
            size={ButtonSize.Sm}
            variant={ButtonVariant.Primary}
            onClick={closePlanInputsDrawer}
          >
            Done · Full Screen
          </Button>
        </div>
      </aside>
    </div>
  );
}
