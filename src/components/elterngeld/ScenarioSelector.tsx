import {
  plannerCalculationLabels,
} from "#utils/plannerCalculationLabels";
import "./ScenarioSelector.css";
import type {
  JSX, 
} from "preact";
import {
  activeScenario,
  scenarioAData,
  scenarioBData,
  scenarioCData,
  openExportImportModal,
} from "#store/elterngeldStore";
import {
  type SimulationResult,
  ScenarioId,
  ActiveScenarioView, 
} from "#engine/types";
import {
  DownloadFileIcon, 
} from "#components/Icons";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Scenario Selection Card View Model.
 */
interface ScenarioCardItem {
  /** Target active scenario view selection. */
  scenarioViewId: ActiveScenarioView;
  /** Plain-language calculation title. */
  title: string;
  /** Scenario identifier or comparison mode. */
  badge: string;
  /** Short scenario summary description. */
  description: string;
  /** Current modeled cash and calculation availability. */
  highlights: string[];
}

function resultHighlights(result: SimulationResult): string[] {
  const partial = result.benefitsComplete !== true || result.taxComplete === false;
  return [
    `Modeled cash flow: ${formatCurrency(result.summary.grandTotal)}`,
    partial
      ? "Partial total · unavailable payments omitted"
      : result.payrollComplete === false
        ? "Provisional payroll · review assumptions"
        : "Modeled under stated assumptions",
  ];
}

export default function ScenarioSelector(): JSX.Element {
  const current = activeScenario.value;

  const scenarios: ScenarioCardItem[] = [
    {
      scenarioViewId: ActiveScenarioView.StatutoryOptimized,
      title: plannerCalculationLabels[ScenarioId.C],
      badge: "Your plan",
      description: "Use your planned tax-class switches alongside births, leave and working-hour changes.",
      highlights: resultHighlights(scenarioCData.value),
    },
    {
      scenarioViewId: ActiveScenarioView.UnoptimizedBaseline,
      title: plannerCalculationLabels[ScenarioId.B],
      badge: "Your plan",
      description: "Keep the initial tax classes with the same planned births, leave and working-hour changes.",
      highlights: resultHighlights(scenarioBData.value),
    },
    {
      scenarioViewId: ActiveScenarioView.StatusQuo,
      title: plannerCalculationLabels[ScenarioId.A],
      badge: "Reference",
      description: "Exclude planned births and tax switches; retain existing children, hours, raises and financial events.",
      highlights: resultHighlights(scenarioAData.value),
    },
    {
      scenarioViewId: ActiveScenarioView.Compare,
      title: "Compare all three",
      badge: "Comparison",
      description: "Compare monthly cash flow and cumulative totals across all three calculations.",
      highlights: ["Chart and timeline comparison", "Summary figures use your planned tax-class changes"],
    },
  ];

  return (
    <section className="scenario-selector" aria-labelledby="scenario-heading">
      <div className="scenario-selector__header">
        <div>
          <h2 id="scenario-heading">Compare versions of your plan</h2>
          <p>These are different calculations using your inputs above. Choose which results to view; your inputs stay the same.</p>
        </div>
        <button
          type="button"
          className="scenario-selector__export"
          onClick={() => openExportImportModal("export")}
          id="scenario-export-btn"
        >
          <DownloadFileIcon size={16} />
          Export / Import
        </button>
      </div>
      <div className="scenario-selector__grid" role="group" aria-labelledby="scenario-heading">
        {scenarios.map((sc) => (
          <button
            key={sc.scenarioViewId}
            type="button"
            className="scenario-card"
            aria-pressed={current === sc.scenarioViewId}
            onClick={() => {
              activeScenario.value = sc.scenarioViewId;
            }}
          >
            <span className="scenario-card__identifier">{sc.badge}</span>
            <span className="scenario-card__title">{sc.title}</span>
            <span className="scenario-card__description">{sc.description}</span>
            <span className="scenario-card__result">
              <span className={sc.scenarioViewId === ActiveScenarioView.Compare ? "scenario-card__comparison" : "scenario-card__cash"}>{sc.highlights[0]}</span>
              <span className="scenario-card__status">{sc.highlights[1]}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
