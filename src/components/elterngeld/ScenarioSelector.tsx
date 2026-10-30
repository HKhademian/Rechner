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
  /** Secondary subtitle describing scenario strategy. */
  subtitle: string;
  /** Scenario identifier or comparison mode. */
  badge: string;
  /** CSS styling variant for badge. */
  badgeClass: string;
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
      subtitle: "Planned births and leave",
      badge: "Scenario C",
      badgeClass: "badge-brand",
      description: "Use your planned tax-class switches alongside births, leave and working-hour changes.",
      highlights: resultHighlights(scenarioCData.value),
    },
    {
      scenarioViewId: ActiveScenarioView.UnoptimizedBaseline,
      title: "Keep tax classes",
      subtitle: "Planned births and leave",
      badge: "Scenario B",
      badgeClass: "badge-muted",
      description: "Keep the initial tax classes with the same planned births, leave and working-hour changes.",
      highlights: resultHighlights(scenarioBData.value),
    },
    {
      scenarioViewId: ActiveScenarioView.StatusQuo,
      title: "Without planned births",
      subtitle: "Career comparison",
      badge: "Scenario A",
      badgeClass: "badge-muted",
      description: "Exclude planned births and tax switches; retain existing children, hours, raises and financial events.",
      highlights: resultHighlights(scenarioAData.value),
    },
    {
      scenarioViewId: ActiveScenarioView.Compare,
      title: "Compare scenarios",
      subtitle: "Side-by-side view",
      badge: "A / B / C",
      badgeClass: "badge-muted",
      description: "Compare monthly cash flow and cumulative totals across all three scenarios.",
      highlights: ["Chart and timeline comparison", "Summary figures use Scenario C"],
    },
  ];

  return (
    <div style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex",
          alignItems: "center",
          gap: "8px" }}>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "var(--color-primary)",
            }}
          ></span>
          <span
            style={{
              fontSize: "0.86rem",
              fontWeight: 700,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Select Active Simulation Strategy:
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
            }}
          >
            Click card to activate timeline, table audit, and chart modes
          </div>

          <button
            type="button"
            onClick={() => openExportImportModal("export")}
            id="scenario-export-btn"
            style={{
              padding: "4px 10px",
              borderRadius: "4px",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-surface)",
              color: "var(--text-secondary)",
              fontSize: "0.74rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
            title="Export full reports or restore JSON presets"
          >
            <DownloadFileIcon size={12} />
            Export / Import
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {scenarios.map((sc) => {
          const isSelected = current === sc.scenarioViewId;

          return (
            <button
              key={sc.scenarioViewId}
              type="button"
              onClick={() => {
                activeScenario.value = sc.scenarioViewId;
              }}
              style={{
                textAlign: "left",
                padding: "18px 20px",
                borderRadius: "var(--border-radius)",
                border: isSelected
                  ? "2px solid var(--color-primary)"
                  : "1px solid var(--border-subtle)",
                background: isSelected
                  ? "var(--bg-surface)"
                  : "var(--bg-surface-secondary)",
                cursor: "pointer",
                transition: "var(--transition)",
                boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "1.15rem",
                      fontWeight: 800,
                      color: isSelected
                        ? "var(--color-primary)"
                        : "var(--text-primary)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {sc.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: isSelected
                        ? "var(--text-secondary)"
                        : "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    {sc.subtitle}
                  </div>
                </div>

                <span className={sc.badgeClass}>{sc.badge}</span>
              </div>

              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.45,
                }}
              >
                {sc.description}
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {sc.highlights.map((hl, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "0.74rem",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        color: isSelected
                          ? "var(--color-primary)"
                          : "var(--text-muted)",
                        fontSize: "0.7rem",
                      }}
                    >
                      •
                    </span>
                    <span>{hl}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
