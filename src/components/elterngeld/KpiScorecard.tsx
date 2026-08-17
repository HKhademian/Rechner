import type { JSX } from "preact";
import {
  currentScenarioData,
  comparisonMetrics,
  activeScenario,
  scenarioBData,
  scrollToLegalRule,
  LegalRuleKey,
} from "#store/elterngeldStore";
import {
  CheckmarkIcon,
  WarningTriangleIcon,
  ExternalLinkIcon,
} from "#components/Icons";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function KpiScorecard(): JSX.Element {
  const current = currentScenarioData.value;
  const metrics = comparisonMetrics.value;
  const scenario = activeScenario.value;
  const bSummary = scenarioBData.value.summary;

  const isScenarioC = scenario === "C";
  const isScenarioB = scenario === "B";

  const totalHusbandSalary = current.months.reduce(
    (acc, m) => acc + (m.husbandSalary as number),
    0,
  );
  const totalWifeSalary = current.months.reduce(
    (acc, m) => acc + (m.wifeSalary as number),
    0,
  );
  const percentGainCvsB = (
    (metrics.gainCvsB / ((bSummary.grandTotal as number) || 1)) *
    100
  ).toFixed(1);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "20px",
        marginBottom: "28px",
      }}
    >
      {/* KPI Card 1: Total Earned Salaries */}
      <div
        className="glass-panel"
        style={{
          padding: "20px 24px",
          position: "relative",
          overflow: "hidden",
          borderLeft: "4px solid var(--series-salary-husband)",
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
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Total Net Working Salaries
            </div>
            <div
              style={{
                fontSize: "1.9rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: "6px 0 4px 0",
              }}
              className="tabular-nums"
            >
              {formatCurrency(current.summary.totalSalaries as number)}
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <span>
                Husband:{" "}
                <strong className="tabular-nums">
                  {formatCurrency(totalHusbandSalary)}
                </strong>
              </span>
              <span>
                Wife:{" "}
                <strong className="tabular-nums">
                  {formatCurrency(totalWifeSalary)}
                </strong>
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: "12px",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          {isScenarioC
            ? "Reflects optimized part-time return & marital tax swaps"
            : isScenarioB
              ? "Reflects standard unoptimized Tax Class V part-time"
              : "Baseline full-time careers without parental leave"}
        </div>
      </div>

      {/* KPI Card 2: Total State Benefits (Subsidies & Tax Returns) */}
      <div
        className="glass-panel"
        style={{
          padding: "20px 24px",
          position: "relative",
          overflow: "hidden",
          borderLeft: "4px solid var(--color-gain)",
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
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Total State Benefits &amp; Subsidies
            </div>
            <div
              style={{
                fontSize: "1.9rem",
                fontWeight: 800,
                color: "var(--color-gain)",
                margin: "6px 0 4px 0",
              }}
              className="tabular-nums"
            >
              {formatCurrency(current.summary.totalBenefits as number)}
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span>
                EG+:{" "}
                <strong className="tabular-nums">
                  {formatCurrency(
                    (current.summary.totalWifeElterngeld as number) +
                      (current.summary.totalHusbandElterngeld as number),
                  )}
                </strong>
              </span>
              <span>•</span>
              <span>
                KG:{" "}
                <strong className="tabular-nums">
                  {formatCurrency(current.summary.totalKindergeld as number)}
                </strong>
              </span>
              <span>•</span>
              <span>
                Tax:{" "}
                <strong className="tabular-nums">
                  +{formatCurrency(current.summary.totalTaxRefunds as number)}
                </strong>
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: "12px",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          {isScenarioC ? (
            <span
              style={{
                color: "var(--color-gain)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <CheckmarkIcon size={13} />
              <span>
                Maximized via Class III booster, Sibling &amp; Partnership
                bonuses
              </span>
            </span>
          ) : isScenarioB ? (
            <span
              style={{
                color: "var(--color-warning)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <WarningTriangleIcon size={13} />
              <span>Minimum base rate due to unoptimized Tax Class V</span>
            </span>
          ) : (
            "0 € state parental allowance (no children)"
          )}
        </div>
      </div>

      {/* KPI Card 3: 5-Year Progressive Cumulative Total */}
      <div
        className="glass-panel"
        style={{
          padding: "20px 24px",
          position: "relative",
          overflow: "hidden",
          borderLeft: "4px solid var(--color-primary)",
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
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              60-Month Net Cash Inflow
            </div>
            <div
              style={{
                fontSize: "1.9rem",
                fontWeight: 800,
                color: "var(--color-primary)",
                margin: "6px 0 4px 0",
              }}
              className="tabular-nums"
            >
              {formatCurrency(current.summary.grandTotal as number)}
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                display: "flex",
                gap: "8px",
              }}
            >
              <span>
                Average / Month:{" "}
                <strong className="tabular-nums">
                  {formatCurrency((current.summary.grandTotal as number) / 60)}
                </strong>
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: "12px",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          Combined household net cash flow over the entire 5-year simulation
          horizon
        </div>
      </div>

      {/* KPI Card 4: Scenario C Optimization Differential (The Value-Add) */}
      <div
        className="glass-panel"
        style={{
          padding: "20px 24px",
          position: "relative",
          overflow: "hidden",
          borderLeft: "4px solid var(--color-gain)",
          background: "var(--color-gain-bg)",
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
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--color-gain)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Optimization Net Benefit (C vs B)
            </div>
            <div
              style={{
                fontSize: "1.9rem",
                fontWeight: 800,
                color: "var(--color-gain)",
                margin: "6px 0 4px 0",
              }}
              className="tabular-nums"
            >
              +{formatCurrency(metrics.gainCvsB as number)}
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span>
                Elterngeld Booster:{" "}
                <strong
                  style={{ color: "var(--color-gain)" }}
                  className="tabular-nums"
                >
                  +{formatCurrency(metrics.wifeEgGainCvsB as number)}
                </strong>
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: "10px",
            fontSize: "0.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          <span style={{ color: "var(--color-gain)", fontWeight: 700 }}>
            +{percentGainCvsB}% net cash gain
          </span>
          <button
            type="button"
            onClick={() => scrollToLegalRule(LegalRuleKey.BEEG_TaxSwap)}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-primary)",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: "0.72rem",
              padding: 0,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
            title="View § 2b BEEG legal basis and strategy"
          >
            <span>How is this calculated? (§ 2b BEEG)</span>
            <ExternalLinkIcon size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
