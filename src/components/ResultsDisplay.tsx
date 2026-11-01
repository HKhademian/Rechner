import type {
  JSX,
} from "preact";
import {
  SalaryPeriod,
} from "#engine/types";
import {
  type HouseholdScenarioData,
  type PersonDeductions,
  deductions,
  calculatorViewPeriod,
} from "#store/calculatorStore";

/** Every breakdown follows the calculator-wide presentation period. */
export default function ResultsDisplay({ data = deductions.value }: { data?: HouseholdScenarioData }): JSX.Element {


  const format = (num: number): string => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(num);
  };

  const d = data;
  const isMonthly = calculatorViewPeriod.value === SalaryPeriod.Monthly;

  // Percentage of gross
  const pct = (val: number, gross: number): string =>
    gross > 0 ? `${((val / gross) * 100).toFixed(1)} %` : "0 %";

  const renderPerson = (
    title: string,
    personData: PersonDeductions | null,
  ): JSX.Element | null => {
    if (!personData || personData.grossYearly <= 0) {
      return null;
    }

    // Match every summary with a calendar-month average of annual totals.
    const divider = isMonthly ? 12 : 1;
    const gross = personData.grossYearly / divider;

    return (
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          padding: "15px",
          borderRadius: "var(--border-radius-sm)",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            color: "var(--text-primary)",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: "8px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{title}</span>
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              fontWeight: "normal",
              marginTop: "4px",
            }}
          >
            {isMonthly ? "Calendar-month average" : "Yearly Total"}
          </span>
        </h3>

        <div
          class="deduction-item"
          style={{
            color: "var(--text-primary)",
            fontWeight: 600,
            marginBottom: "15px",
          }}
        >
          <span>Gross pay</span>
          <span class="amount tabular-nums">{format(gross)}</span>
        </div>

        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "0.78rem",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontWeight: 600,
          }}
        >
          Social insurance
        </div>
        <div class="deduction-item">
          <span>
            Health insurance{" "}
            <small>
              ({pct(personData.healthCare, personData.grossYearly)})
            </small>
          </span>
          <span
            class="amount tabular-nums"
            style={{ color: "var(--color-loss)" }}
          >
            - {format(personData.healthCare / divider)}
          </span>
        </div>
        <div class="deduction-item">
          <span>
            Pension insurance{" "}
            <small>({pct(personData.pension, personData.grossYearly)})</small>
          </span>
          <span
            class="amount tabular-nums"
            style={{ color: "var(--color-loss)" }}
          >
            - {format(personData.pension / divider)}
          </span>
        </div>
        <div class="deduction-item">
          <span>
            Unemployment insurance{" "}
            <small>
              ({pct(personData.unemployment, personData.grossYearly)})
            </small>
          </span>
          <span
            class="amount tabular-nums"
            style={{ color: "var(--color-loss)" }}
          >
            - {format(personData.unemployment / divider)}
          </span>
        </div>
        <div class="deduction-item">
          <span>
            Care insurance{" "}
            <small>({pct(personData.care, personData.grossYearly)})</small>
          </span>
          <span
            class="amount tabular-nums"
            style={{ color: "var(--color-loss)" }}
          >
            - {format(personData.care / divider)}
          </span>
        </div>

        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "0.78rem",
            marginBottom: "8px",
            marginTop: "15px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontWeight: 600,
          }}
        >
          Taxes
        </div>
        <div class="deduction-item">
          <span>
            Wage tax{" "}
            <small>({pct(personData.tax, personData.grossYearly)})</small>
          </span>
          <span
            class="amount tabular-nums"
            style={{ color: "var(--color-loss)" }}
          >
            - {format(personData.tax / divider)}
          </span>
        </div>
        {personData.solidarity > 0 && (
          <div class="deduction-item">
            <span>Solidarity surcharge</span>
            <span class="amount tabular-nums">- {format(personData.solidarity / divider)}</span>
          </div>
        )}
        {personData.churchTax > 0 && (
          <div class="deduction-item">
            <span>
              Church tax{" "}
              <small>
                ({pct(personData.churchTax, personData.grossYearly)})
              </small>
            </span>
            <span
              class="amount tabular-nums"
              style={{ color: "var(--color-loss)" }}
            >
              - {format(personData.churchTax / divider)}
            </span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "15px",
            paddingTop: "10px",
            borderTop: "1px dashed var(--border-subtle)",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          <span>Net pay</span>
          <span
            class="tabular-nums"
            style={{ color: "var(--color-gain)",
              fontWeight: 800 }}
          >
            {format(personData.netIncome / divider)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div class="glass-panel fade-in" style={{ animationDelay: "0.1s" }}>
      <div style={{ display: "flex",
        flexDirection: "column",
        gap: "10px" }}>
        {renderPerson("Person 1", d.person1)}
        {Boolean(d.partner) &&
          renderPerson(
            "Partner",
            d.partner,
          )}
      </div>

      <div
        class="total-net fade-in"
        style={{
          background: "var(--color-gain-bg)",
          padding: "20px",
          borderRadius: "var(--border-radius-sm)",
          border: "1px solid var(--color-gain-border)",
        }}
      >
        <span>
          {d.partner ? "Household Net Pay" : "Total Net Income"}
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              fontWeight: "normal",
              marginTop: "4px",
            }}
          >
            {isMonthly ? "Calendar-month average (annual / 12)" : "Yearly net total"}
          </div>
        </span>
        <span style={{ alignSelf: "center" }} class="tabular-nums">
          {format(d.household.netIncome / (isMonthly ? 12 : 1))}
        </span>
      </div>

      <div
        style={{
          marginTop: "1rem",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.8rem",
        }}
      >
        Deductions / gross:{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          {pct(d.household.totalDeductions, d.household.grossYearly)}
        </strong>
      </div>
      <details>
        <summary>Assumptions</summary>
        <p>Withholding estimate; final assessment may differ.</p>
        <ul>{[...new Set([...d.person1.assumptions, ...(d.partner?.assumptions ?? [])])].map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
      </details>
    </div>
  );
}
