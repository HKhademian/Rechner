import type {
  JSX, 
} from "preact";
import {
  activeScenario,
  comparisonMetrics,
  openExportImportModal,
} from "#store/elterngeldStore";
import {
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
  /** Promotional badge text (e.g. 'Recommended'). */
  badge: string;
  /** CSS styling variant for badge. */
  badgeClass: string;
  /** Short scenario summary description. */
  description: string;
  /** Key strategic highlight bullet points. */
  highlights: string[];
}

export default function ScenarioSelector(): JSX.Element {
  const current = activeScenario.value;
  const metrics = comparisonMetrics.value;

  const scenarios: ScenarioCardItem[] = [
    {
      scenarioViewId: ActiveScenarioView.StatutoryOptimized,
      title: "Statutory Optimized",
      subtitle: "Fully Optimized (Recommended)",
      badge: "Maximum State Benefit",
      badgeClass: "badge-gain",
      description:
        "Proactive tax class swap (*Steuerklassenwechsel* III/V § 39e EStG) + Synthetic Net (*Fiktives Netto* § 2e BEEG) + Sibling Bonus (*Geschwisterbonus*) + Joint Tax Refund (*Ehegatten-Splitting*).",
      highlights: [
        "Mother: ElterngeldPlus capped at maximum €900 / month (§ 4 BEEG)",
        "Maternity Protection (*Mutterschutz* MuSchG) net pay at €2,603 / month",
        "Sibling Bonus (*Geschwisterbonus* § 2a BEEG) +10% until Child 1 turns 3",
        `Tax Office Refund (*Finanzamt-Erstattung* § 26b EStG): +${formatCurrency(metrics.taxRefundC)}`,
      ],
    },
    {
      scenarioViewId: ActiveScenarioView.UnoptimizedBaseline,
      title: "Unoptimized Baseline",
      subtitle: "Static Baseline Withholding (III/V)",
      badge: "Standard Baseline",
      badgeClass: "badge-warning",
      description:
        "No tax class changes. Mother receives maternity and ElterngeldPlus calculated under Tax Class V (*Steuerklasse V*).",
      highlights: [
        "Mother ElterngeldPlus: €500.50 / month (Child 1)",
        "Child 2: Diluted to base €150 / month (*14-Monate-Falle* § 2b BEEG)",
        "Maternity Protection (*Mutterschutz*) net pay at €1,975 / month",
        `Forfeits ${formatCurrency(metrics.gainCvsB)} in statutory benefits`,
      ],
    },
    {
      scenarioViewId: ActiveScenarioView.StatusQuo,
      title: "Status Quo",
      subtitle: "Continuous Career (No Children)",
      badge: "Constant Employment",
      badgeClass: "badge-muted",
      description:
        "No children. Continuous standard wage flow (Husband €2,895 + Wife €1,975 = €6,125 / month net).",
      highlights: [
        "Constant €6,125 / month household net income stream",
        "No parental leave / zero wage replacement benefits",
        "No part-time working hours reduction",
        "5-Year Total Net Inflow: €367,500",
      ],
    },
    {
      scenarioViewId: ActiveScenarioView.Compare,
      title: "Multi-Strategy Matrix",
      subtitle: "Side-by-Side Comparison",
      badge: "Overlay View",
      badgeClass: "badge-brand",
      description:
        "Direct comparison of monthly liquidity curves and 5-year cumulative household asset accumulation.",
      highlights: [
        "Monthly cash flow curves compared side-by-side",
        "Cumulative financial differential tracking",
        "Direct subsidy & tax reconciliation comparison",
        "Transparent decision framework",
      ],
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
