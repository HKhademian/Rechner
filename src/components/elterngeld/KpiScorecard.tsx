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
      <div className="glass-panel" style={{ gridColumn: "1 / -1",
        padding: "16px" }}>
        <strong>{current.benefitsComplete ? "Benefits modeled under the stated assumptions" : "Incomplete benefit calculation"}</strong>
        {current.payrollComplete === false && <p>Payroll amounts include supplied values or provisional estimates. Review the calculation assumptions.</p>}
        {current.taxComplete === false && <p>Some annual tax balances are unavailable. Displayed cash totals omit those settlements.</p>}
        {!current.benefitsComplete && <p>Displayed totals omit unavailable benefit payments and are a partial modeled cash flow.</p>}
        {(current.unavailableReasons ?? []).map((reason) => <p key={reason}>{reason}</p>)}
        <details>
          <summary>Assessment history and assumptions</summary>
          <ul>{(current.assumptions ?? []).map((note) => <li key={note}>{note}</li>)}</ul>
          {(current.benefitAssessments ?? []).map((assessment) => (
            <p key={`${assessment.pregnancyId}-${assessment.parent}`}>
              {assessment.parent}, birth {assessment.birthMonthId}: class {assessment.taxClass};
              {" "}assessment months {assessment.selectedMonths.join(", ")}.
              {assessment.assumedMonths.length > 0 && ` Repeated initial inputs: ${assessment.assumedMonths.join(", ")}.`}
              {assessment.reason && ` Unavailable: ${assessment.reason}`}
            </p>
          ))}
        </details>
        <details>
          <summary>Annual tax settlements and cash timing</summary>
          <p>Signed tax cash flow within the period: {formatCurrency(current.summary.totalTaxRefunds, 2)}</p>
          <ul>{(current.annualTaxRecords ?? []).map((record) => (
            <li key={record.calendarYear}>
              {record.calendarYear}: {record.assessment ? formatCurrency(record.assessment.settlement, 2) : "Unavailable"}.
              {" "}Planned {record.settlementMonthId}, {record.scheduledMonthInHorizon ? "within" : "outside"} the cash-flow period.
              {record.reasons.map((reason) => <p key={reason}>{reason}</p>)}
            </li>
          ))}</ul>
        </details>
      </div>
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
                  {formatCurrency(current.summary.grandTotal / 60)}
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

      {/* KPI Card 4: Scenario C Cash-Flow Differential */}
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
              Cash-Flow Difference (C vs B)
            </div>
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
