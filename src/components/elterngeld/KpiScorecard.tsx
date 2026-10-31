import CalculationStatus from "./CalculationStatus";
import type {
  JSX,
} from "preact";
import {
  currentScenarioData,
  comparisonMetrics,
  scenarioBData,
  scrollToLegalRule,
  LegalRuleKey,
} from "#store/elterngeldStore";


import {
  ExternalLegalSourceIcon,
} from "#components/Icons";

function formatCurrency(amount: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits,
  }).format(amount || 0);
}

export default function KpiScorecard(): JSX.Element {
  const current = currentScenarioData.value;
  const metrics = comparisonMetrics.value;
  const bSummary = scenarioBData.value.summary;


  const totalHusbandSalary = current.months.reduce(
    (acc, m) => acc + m.husbandSalary,
    0,
  );
  const totalWifeSalary = current.months.reduce(
    (acc, m) => acc + m.wifeSalary,
    0,
  );
  const gainColor = metrics.gainCvsB < 0 ? "var(--color-loss)" : "var(--color-gain)";
  const percentGainCvsB = bSummary.grandTotal === 0 ? undefined : ((metrics.gainCvsB / Math.abs(bSummary.grandTotal)) * 100).toFixed(1);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "20px",
        marginBottom: "28px",
      }}
    >
      <CalculationStatus result={current} />
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
              {formatCurrency(current.summary.totalSalaries)}
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
          Salaries reflect the modeled working hours and actual tax classes.
        </div>
      </div>

      {/* KPI Card 2: Total State Benefits */}
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
              {formatCurrency(current.summary.totalBenefits)}
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
                    current.summary.totalWifeElterngeld +
                      current.summary.totalHusbandElterngeld,
                  )}
                </strong>
              </span>
              <span>•</span>
              <span>
                KG:{" "}
                <strong className="tabular-nums">
                  {formatCurrency(current.summary.totalKindergeld)}
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
          Benefits follow each parent's assessment history and income/hour eligibility. Review the calculation audit above.
        </div>
      </div>

      {/* KPI Card 3: Cash Flow Over the Configured Period */}
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
              {current.months.length}-Month Net Cash Flow
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
              {formatCurrency(current.summary.grandTotal)}
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
                  {current.months.length > 0 ? formatCurrency(current.summary.grandTotal / current.months.length) : "Unavailable"}
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
          Combined household cash flow from {current.months[0]?.calendarLabel} to {current.months.at(-1)?.calendarLabel}.
        </div>
      </div>

      {/* Compare the same birth and leave plan with changed versus original tax classes. */}
      <div
        className="glass-panel"
        style={{
          padding: "20px 24px",
          position: "relative",
          overflow: "hidden",
          borderLeft: `4px solid ${gainColor}`,
          background: metrics.gainCvsB < 0 ? "var(--color-loss-bg)" : "var(--color-gain-bg)",
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
                color: gainColor,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Effect of your tax-class changes
            </div>
            <p>Compared with keeping your original tax classes for the same plan.</p>
            <div
              style={{
                fontSize: "1.9rem",
                fontWeight: 800,
                color: gainColor,
                margin: "6px 0 4px 0",
              }}
              className="tabular-nums"
            >
              {metrics.gainCvsB > 0 ? "+" : ""}{formatCurrency(metrics.gainCvsB)}
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
                Mother Elterngeld difference:{" "}
                <strong
                  style={{ color: metrics.wifeEgGainCvsB < 0 ? "var(--color-loss)" : "var(--color-gain)" }}
                  className="tabular-nums"
                >
                  {metrics.wifeEgGainCvsB > 0 ? "+" : ""}{formatCurrency(metrics.wifeEgGainCvsB)}
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
          <span style={{ color: gainColor,
            fontWeight: 700 }}>
            {percentGainCvsB === undefined ? "Percentage unavailable for a zero baseline" : `${Number(percentGainCvsB) > 0 ? "+" : ""}${percentGainCvsB}% cash-flow difference`}
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
            <ExternalLegalSourceIcon size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
