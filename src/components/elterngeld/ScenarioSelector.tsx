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
  /** Scenario card header title (e.g. 'Scenario C'). */
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
      title: "Apply tax switches",
      badge: "Scenario C",
      description: "Use your planned tax-class switches alongside births, leave and working-hour changes.",
      highlights: resultHighlights(scenarioCData.value),
    },
    {
      scenarioViewId: ActiveScenarioView.UnoptimizedBaseline,
      title: "Keep tax classes",
      badge: "Scenario B",
      description: "Keep the initial tax classes with the same planned births, leave and working-hour changes.",
      highlights: resultHighlights(scenarioBData.value),
    },
    {
      scenarioViewId: ActiveScenarioView.StatusQuo,
      title: "Without planned births",
      badge: "Scenario A",
      description: "Exclude planned births and tax switches; retain existing children, hours, raises and financial events.",
      highlights: resultHighlights(scenarioAData.value),
    },
    {
      scenarioViewId: ActiveScenarioView.Compare,
      title: "Compare scenarios",
      badge: "A / B / C",
      description: "Compare monthly cash flow and cumulative totals across all three scenarios.",
      highlights: ["Chart and timeline comparison", "Summary figures use Scenario C"],
    },
  ];

  return (
    <section className="scenario-selector" aria-labelledby="scenario-heading">
      <div className="scenario-selector__header">
        <div>
          <h2 id="scenario-heading">Choose a scenario</h2>
          <p>Update the summary, timeline and chart below.</p>
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
