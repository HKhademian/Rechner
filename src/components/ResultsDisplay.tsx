import type {
  JSX, 
} from "preact";
import {
  useState,
  useEffect,
} from "preact/hooks";
import {
  useSignal, 
} from "@preact/signals";
import {
  type PersonDeductions,
  deductions,
  hasPartner,
  salariesPerYear,
  partnerSalariesPerYear,
} from "#store/calculatorStore";

export default function ResultsDisplay(): JSX.Element {
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => setMounted(true), []);

  const displayMode = useSignal<"monthly" | "yearly">("monthly");

  if (!mounted) {
    return <div class="glass-panel fade-in">Loading results...</div>;
  }

  const format = (num: number): string => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(num);
  };

  const d = deductions.value;
  const isMonthly = displayMode.value === "monthly";

  // Percentage of gross
  const pct = (val: number, gross: number): string =>
    gross > 0 ? `${((val / gross) * 100).toFixed(1)} %` : "0 %";

  const renderPerson = (
    title: string,
    personData: PersonDeductions | null,
    personSalaries: number,
  ): JSX.Element | null => {
    if (!personData || personData.grossYearly <= 0) {
      return null;
    }

    // Divide by the number of salaries received (e.g. 12, 13) in monthly view
    const divider = isMonthly ? personSalaries : 1;
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
            {isMonthly ? "Monthly Average" : "Yearly Total"}
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
          <span>Gross Income</span>
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
          Social Security Contributions (*Sozialabgaben*)
        </div>
        <div class="deduction-item">
          <span>
            Health Insurance (*Krankenversicherung - GKV*){" "}
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
            Pension Insurance (*Rentenversicherung - GRV*){" "}
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
            Unemployment (*Arbeitslosenversicherung - ALV*){" "}
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
            Long-Term Care (*Pflegeversicherung - PV*){" "}
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
          Taxes &amp; Surcharges (*Steuern*)
        </div>
        <div class="deduction-item">
          <span>
            Wage Tax (*Lohnsteuer - EStG*){" "}
            <small>({pct(personData.tax, personData.grossYearly)})</small>
          </span>
          <span
            class="amount tabular-nums"
            style={{ color: "var(--color-loss)" }}
          >
            - {format(personData.tax / divider)}
          </span>
        </div>
        {personData.churchTax > 0 && (
          <div class="deduction-item">
            <span>
              Church Tax (*Kirchensteuer*){" "}
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
          <span>Net Take-Home Pay</span>
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0 }}>Calculation Breakdown</h2>

        <div
          style={{
            display: "flex",
            gap: "5px",
            background: "var(--bg-surface-secondary)",
            padding: "4px",
            borderRadius: "var(--border-radius-sm)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <button
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              transition: "var(--transition)",
              fontSize: "0.8rem",
              fontWeight: "bold",
              background: isMonthly ? "var(--color-primary)" : "transparent",
              color: isMonthly ? "#ffffff" : "var(--text-secondary)",
            }}
            onClick={() => {
              displayMode.value = "monthly";
            }}
          >
            Monthly
          </button>
          <button
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              transition: "var(--transition)",
              fontSize: "0.8rem",
              fontWeight: "bold",
              background: !isMonthly ? "var(--color-primary)" : "transparent",
              color: !isMonthly ? "#ffffff" : "var(--text-secondary)",
            }}
            onClick={() => {
              displayMode.value = "yearly";
            }}
          >
            Yearly
          </button>
        </div>
      </div>

      <div style={{ display: "flex",
        flexDirection: "column",
        gap: "10px" }}>
        {renderPerson("Person 1", d.person1, salariesPerYear.value)}
        {hasPartner.value &&
          renderPerson(
            "Spouse / Partner (*Ehegatte*)",
            d.partner,
            partnerSalariesPerYear.value,
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
          {hasPartner.value ? "Household Net Pay" : "Total Net Income"}
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              fontWeight: "normal",
              marginTop: "4px",
            }}
          >
            {isMonthly ? "Sum of monthly net salaries" : "Yearly net total"}
          </div>
        </span>
        <span style={{ alignSelf: "center" }} class="tabular-nums">
          {isMonthly
            ? format(
              d.person1.netIncome / salariesPerYear.value +
                  (hasPartner.value && d.partner
                    ? d.partner.netIncome / partnerSalariesPerYear.value
                    : 0),
            )
            : format(d.household.netIncome)}
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
        Effective Tax &amp; Social Security Rate:{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          {pct(d.household.totalDeductions, d.household.grossYearly)}
        </strong>
      </div>
      <div
        style={{
          marginTop: "0.5rem",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.75rem",
        }}
      >
        Computed in compliance with German § 32a EStG and Social Insurance
        Assessment Ceilings (*Beitragsbemessungsgrenzen - BBG*).
      </div>
    </div>
  );
}
