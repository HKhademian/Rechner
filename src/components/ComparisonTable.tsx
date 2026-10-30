import "./ComparisonTable.css";
import ScenarioParameterInput from "#components/ScenarioParameterInput";
import LiveCalculationSummary from "#components/LiveCalculationSummary";
import LiveCalculatorSettings from "#components/LiveCalculatorSettings";
import germanStates from "../data/germanStates.json" with { type: "json" };
import {
  LiveNumberInput,
  LiveChoiceInput,
  LiveToggleInput,
} from "#components/LiveCalculatorInputs";
import {
  TaxClass,
  toGrossSalary,
  toChildrenCount,
  toMonthDuration,
} from "#engine/types";
import {
  toSalaryPaymentCount,
} from "#engine/tax/employmentPeriod";
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
  type HouseholdScenarioData,
  type CalculatorInputs,
  type PersonDeductions,
  getCurrentInputs,
  inputMode,
  hasPartner,
  grossIncome,
  taxBracket,
  hasChurchTax,
  state,
  children,
  workingMonths,
  salariesPerYear,
  partnerGrossIncome,
  partnerTaxBracket,
  partnerHasChurchTax,
  partnerState,
  partnerWorkingMonths,
  partnerSalariesPerYear,
  deductions,
  savedScenarios,
  calculateScenarioData,
  activeScenarioId,
  scenarioDraft,
  saveScenario,
  deleteScenario,
  loadScenario,
  editScenario,
  saveDraft,
  updateScenarioMetaData,
  cancelEdit,
} from "#store/calculatorStore";
import {
  AddActionIcon,
  ExportDataIcon,
  RemoveItemIcon,
  SaveConfigurationIcon,
  EditSettingsIcon,
} from "#components/Icons";

export default function ComparisonTable(): JSX.Element | null {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    // Initialize first scenario if none exist
    if (savedScenarios.peek().length === 0) {
      saveScenario(
        "My First Scenario",
        "Default starting point",
        deductions.peek(),
      );
    }
  }, []);

  if (!mounted) {
    return null;
  }
  return <ComparisonTableContent />;
}

/** The live calculation remains available even after the last saved scenario is removed. */
export function ComparisonTableContent(): JSX.Element {
  const showSavedComparison = useSignal(false);
  const invalidInputs = useSignal<Record<string, boolean>>({});
  const trackValidity = (id: string) => (valid: boolean): void => {
    const previous = invalidInputs.peek();
    if (Boolean(previous[id]) === !valid) {
      return;
    }
    const next = { ...previous };
    if (valid) {
      delete next[id];
    }
    else {
      next[id] = true;
    }
    invalidInputs.value = next;
  };
  const hasInvalidLive = Object.keys(invalidInputs.value).some((id) => id.startsWith("live-"));
  const hasInvalidSaved = (id: string): boolean => Object.keys(invalidInputs.value).some((key) => key.startsWith(`scenario-${id}-`));
  const displayMode = useSignal<"yearly" | "monthly">("yearly");

  const format = (num: number): string => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const isMonthly = displayMode.value === "monthly";
  const hasAnyPartner = Boolean(deductions.value.partner || savedScenarios.value.some((scenario) => scenario.data.partner));

  const validateLive = <K extends keyof CalculatorInputs>(field: K) => (value: CalculatorInputs[K]): void => {
    calculateScenarioData({ ...getCurrentInputs(),
      [field]: value });
  };
  const liveStateOptions = germanStates.map((value) => ({ value,
    label: value }));
  const liveClassOptions = Object.values(TaxClass).map((value, index) => ({ value: String(index + 1),
    label: `Class ${value}` }));
  const salaryUnit = (mode: CalculatorInputs["inputMode"]): string => mode === "monthly" ? "€ / month" : "€ / year";
  const liveControls = {
    inputMode: <LiveChoiceInput<CalculatorInputs["inputMode"]> onValidityChange={trackValidity("live-inputMode")} label="Gross input period" value={inputMode} options={[{ value: "monthly",
      label: "Monthly gross input" }, { value: "yearly",
      label: "Yearly gross input" }]} beforeChange={validateLive("inputMode")} />,
    hasPartner: <LiveToggleInput onValidityChange={trackValidity("live-hasPartner")} label="Include partner" value={hasPartner} beforeChange={validateLive("hasPartner")} />,
    grossIncome: <LiveNumberInput onValidityChange={trackValidity("live-grossIncome")} id="live-gross" label={`Gross income (${salaryUnit(inputMode.value)})`} value={grossIncome} construct={toGrossSalary} beforeChange={validateLive("grossIncome")} step={0.01} />,
    state: <LiveChoiceInput onValidityChange={trackValidity("live-state")} label="Federal state" value={state} options={liveStateOptions} beforeChange={validateLive("state")} />,
    taxBracket: <LiveChoiceInput onValidityChange={trackValidity("live-taxBracket")} label="Tax class" value={taxBracket} options={liveClassOptions} beforeChange={validateLive("taxBracket")} />,
    hasChurchTax: <LiveToggleInput onValidityChange={trackValidity("live-hasChurchTax")} label="Church tax" value={hasChurchTax} beforeChange={validateLive("hasChurchTax")} />,
    children: <LiveNumberInput onValidityChange={trackValidity("live-children")} id="live-children" label="Children" value={children} construct={toChildrenCount} beforeChange={validateLive("children")} />,
    workingMonths: <LiveNumberInput onValidityChange={trackValidity("live-workingMonths")} id="live-months" label="Working months" value={workingMonths} construct={toMonthDuration} beforeChange={validateLive("workingMonths")} />,
    salariesPerYear: <LiveNumberInput onValidityChange={trackValidity("live-salariesPerYear")} id="live-salaries" label="Salaries per year" value={salariesPerYear} construct={toSalaryPaymentCount} beforeChange={validateLive("salariesPerYear")} step={0.5} />,
    partnerGrossIncome: <LiveNumberInput onValidityChange={trackValidity("live-partnerGrossIncome")} id="live-partner-gross" label={`Partner gross income (${salaryUnit(inputMode.value)})`} value={partnerGrossIncome} construct={toGrossSalary} beforeChange={validateLive("partnerGrossIncome")} step={0.01} />,
    partnerState: <LiveChoiceInput onValidityChange={trackValidity("live-partnerState")} label="Partner federal state" value={partnerState} options={liveStateOptions} beforeChange={validateLive("partnerState")} />,
    partnerTaxBracket: <LiveChoiceInput onValidityChange={trackValidity("live-partnerTaxBracket")} label="Partner tax class" value={partnerTaxBracket} options={liveClassOptions} beforeChange={validateLive("partnerTaxBracket")} />,
    partnerHasChurchTax: <LiveToggleInput onValidityChange={trackValidity("live-partnerHasChurchTax")} label="Partner church tax" value={partnerHasChurchTax} beforeChange={validateLive("partnerHasChurchTax")} />,
    partnerWorkingMonths: <LiveNumberInput onValidityChange={trackValidity("live-partnerWorkingMonths")} id="live-partner-months" label="Partner working months" value={partnerWorkingMonths} construct={toMonthDuration} beforeChange={validateLive("partnerWorkingMonths")} />,
    partnerSalariesPerYear: <LiveNumberInput onValidityChange={trackValidity("live-partnerSalariesPerYear")} id="live-partner-salaries" label="Partner salaries per year" value={partnerSalariesPerYear} construct={toSalaryPaymentCount} beforeChange={validateLive("partnerSalariesPerYear")} step={0.5} />,
  };

  const getMetric = (
    snapshot: HouseholdScenarioData,
    personKey: "person1" | "partner",
    metricKey: Exclude<keyof PersonDeductions, "assumptions">,
    useDivider = true,
  ): number => {
    const person = snapshot[personKey];
    if (!person) {
      return 0;
    }
    const divider = isMonthly && useDivider ? Math.max(1, person.monthsWorked) : 1;
    return person[metricKey] / divider;
  };

  const getHouseholdMetric = (
    snapshot: HouseholdScenarioData,
    metricKey: "grossYearly" | "netIncome" | "totalDeductions",
  ): number => {
    if (!isMonthly) {
      return snapshot.household[metricKey];
    }
    const p1Monthly = getMetric(snapshot, "person1", metricKey);
    const p2Monthly = snapshot.partner
      ? getMetric(snapshot, "partner", metricKey)
      : 0;
    return p1Monthly + p2Monthly;
  };

  const renderPerPaycheckRow = (
    personKey: "person1" | "partner" | null,
    isHousehold = false,
  ): JSX.Element | null => {
    if (!isMonthly) {
      return null;
    }
    const cells: JSX.Element[] = [];

    const getPaycheckVal = (
      snapshot: HouseholdScenarioData,
    ): { val: number;
      hint: string } => {
      if (isHousehold) {
        const p1 = snapshot.person1;
        const p2 = snapshot.partner;
        const p1Val = p1 ? p1.netIncome / (p1.salariesReceived || 12) : 0;
        const p2Val = p2 ? p2.netIncome / (p2.salariesReceived || 12) : 0;
        return { val: p1Val + p2Val,
          hint: "" };
      }
      else if (personKey) {
        const p = snapshot[personKey];
        if (!p) {
          return { val: 0,
            hint: "" };
        }
        const salaries = p.salariesReceived || 12;
        return { val: p.netIncome / salaries,
          hint: `(x${salaries})` };
      }
      return { val: 0,
        hint: "" };
    };

    // Current Story
    const current = getPaycheckVal(deductions.value);
    cells.push(
      <td
        key="current"
        class="tabular-nums"
        style={{
          padding: "12px 16px",
          fontWeight: "bold",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--color-gain-bg)",
          minWidth: "220px",
          color: "var(--color-gain)",
        }}
      >
        {format(current.val)}{" "}
        <span
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            fontWeight: "normal",
          }}
        >
          {current.hint}
        </span>
      </td>,
    );

    savedScenarios.value.forEach((scenario) => {
      const isActive = activeScenarioId.value === scenario.id;
      const dataToUse =
        isActive && scenarioDraft.value
          ? scenarioDraft.value.data
          : calculateScenarioData(scenario.inputs);
      const saved = getPaycheckVal(dataToUse);
      cells.push(
        <td
          key={scenario.id}
          class="tabular-nums"
          style={{
            padding: "12px 16px",
            fontWeight: "bold",
            borderBottom: "1px solid var(--border-subtle)",
            minWidth: "220px",
            color: isActive ? "var(--color-primary)" : "var(--text-primary)",
            background: isActive ? "var(--color-primary-bg)" : "transparent",
          }}
        >
          {format(saved.val)}{" "}
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              fontWeight: "normal",
            }}
          >
            {saved.hint}
          </span>
        </td>,
      );
    });

    return (
      <tr class="comparison-row">
        <td
          style={{
            padding: "12px 16px",
            fontWeight: 600,
            borderBottom: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
            position: "sticky",
            left: 0,
            background: "var(--bg-surface)",
            zIndex: 10,
            borderRight: "2px solid var(--border-subtle)",
          }}
        >
          Net Per Paycheck
        </td>
        {cells}
      </tr>
    );
  };

  const renderAverageMonthlyNetRow = (
    personKey: "person1" | "partner" | null,
    isHousehold = false,
  ): JSX.Element => {
    const cells: JSX.Element[] = [];

    const getAvgVal = (snapshot: HouseholdScenarioData): number => {
      if (isHousehold) {
        return snapshot.household.netIncome / 12;
      }
      else if (personKey) {
        const p = snapshot[personKey];
        return p ? p.netIncome / 12 : 0;
      }
      return 0;
    };

    const currentVal = getAvgVal(deductions.value);
    cells.push(
      <td
        key="current"
        class="tabular-nums"
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--color-gain-bg)",
          minWidth: "220px",
          color: "var(--color-gain)",
          fontWeight: 600,
        }}
      >
        {format(currentVal)}{" "}
        <span style={{ fontSize: "0.8rem",
          color: "var(--text-muted)" }}>
          / mo
        </span>
      </td>,
    );

    savedScenarios.value.forEach((scenario) => {
      const isActive = activeScenarioId.value === scenario.id;
      const dataToUse =
        isActive && scenarioDraft.value
          ? scenarioDraft.value.data
          : calculateScenarioData(scenario.inputs);
      const savedVal = getAvgVal(dataToUse);

      cells.push(
        <td
          key={scenario.id}
          class="tabular-nums"
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-subtle)",
            minWidth: "220px",
            color: "var(--text-primary)",
            background: isActive ? "var(--color-primary-bg)" : "transparent",
          }}
        >
          {format(savedVal)}{" "}
          <span style={{ fontSize: "0.8rem",
            color: "var(--text-muted)" }}>
            / mo
          </span>
        </td>,
      );
    });

    return (
      <tr class="comparison-row">
        <td
          style={{
            padding: "12px 16px",
            fontWeight: 500,
            borderBottom: "1px solid var(--border-subtle)",
            color: "var(--text-muted)",
            position: "sticky",
            left: 0,
            background: "var(--bg-surface)",
            zIndex: 10,
            borderRight: "2px solid var(--border-subtle)",
          }}
        >
          Avg. Monthly Net{" "}
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginLeft: "4px",
            }}
          >
            (Yearly / 12)
          </span>
        </td>
        {cells}
      </tr>
    );
  };

  const renderRow = (
    label: string,
    personKey: "person1" | "partner" | null,
    metricKey: Exclude<keyof PersonDeductions, "assumptions">,
    isHousehold = false,
    isHeader = false,
  ): JSX.Element => {
    const cells: JSX.Element[] = [];

    // Current Story
    const currentVal = isHousehold
      ? getHouseholdMetric(
        deductions.value,
        metricKey as "grossYearly" | "netIncome" | "totalDeductions",
      )
      : personKey
        ? getMetric(
          deductions.value,
          personKey,
          metricKey,
        )
        : 0;

    cells.push(
      <td
        key="current"
        class="tabular-nums"
        style={{
          padding: "12px 16px",
          fontWeight: isHeader ? "bold" : "normal",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--color-gain-bg)",
          minWidth: "220px",
        }}
      >
        {format(currentVal)}
      </td>,
    );

    savedScenarios.value.forEach((scenario) => {
      const isActive = activeScenarioId.value === scenario.id;
      const dataToUse =
        isActive && scenarioDraft.value
          ? scenarioDraft.value.data
          : calculateScenarioData(scenario.inputs);

      const savedVal = isHousehold
        ? getHouseholdMetric(
          dataToUse,
          metricKey as "grossYearly" | "netIncome" | "totalDeductions",
        )
        : personKey
          ? getMetric(dataToUse, personKey, metricKey)
          : 0;

      cells.push(
        <td
          key={scenario.id}
          class="tabular-nums"
          style={{
            padding: "12px 16px",
            fontWeight: isHeader ? "bold" : "normal",
            borderBottom: "1px solid var(--border-subtle)",
            minWidth: "220px",
            background: isActive ? "var(--color-primary-bg)" : "transparent",
          }}
        >
          {format(savedVal)}
        </td>,
      );
    });

    return (
      <tr class="comparison-row">
        <td
          style={{
            padding: "12px 16px",
            fontWeight: 600,
            borderBottom: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            position: "sticky",
            left: 0,
            background: "var(--bg-surface)",
            zIndex: 10,
            borderRight: "2px solid var(--border-subtle)",
          }}
        >
          {label}
        </td>
        {cells}
      </tr>
    );
  };

  const renderInputRow = <K extends keyof typeof liveControls>(
    label: string,
    fieldKey: K,
    _type: "select" | "checkbox" | "number",
    options: { value: string;
      label: string }[] | null,
    formatFn: (inputs: Partial<CalculatorInputs>) => string | number,
  ): JSX.Element => {
    const cells: JSX.Element[] = [];
    cells.push(
      <td
        key="current"
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--color-gain-bg)",
          color: "var(--text-primary)",
          fontSize: "0.9rem",
        }}
      >
        {liveControls[fieldKey]}
        {(fieldKey === "grossIncome" || fieldKey === "partnerGrossIncome") && <small>{salaryUnit(inputMode.value)}</small>}
      </td>,
    );

    savedScenarios.value.forEach((scenario) => {
      const isActive = activeScenarioId.value === scenario.id;
      const inputsToUse =
        isActive && scenarioDraft.value
          ? scenarioDraft.value.inputs
          : scenario.inputs || {};
      const rawVal = inputsToUse[fieldKey];
      const savedVal = formatFn(inputsToUse);

      let content: JSX.Element | string | number = savedVal;
      if (isActive) {
        content = <ScenarioParameterInput id={`scenario-${scenario.id}-${fieldKey}`} label={label} scope={`Saved scenario ${scenario.title}`} field={fieldKey} onValidityChange={trackValidity(`scenario-${scenario.id}-${fieldKey}`)} value={rawVal} options={options} />;
      }

      cells.push(
        <td
          key={scenario.id}
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            background: isActive ? "var(--color-primary-bg)" : "transparent",
          }}
        >
          {content}
          {(fieldKey === "grossIncome" || fieldKey === "partnerGrossIncome") && <div><small>{salaryUnit(inputsToUse.inputMode ?? "yearly")}</small></div>}
        </td>,
      );
    });

    return (
      <tr class="comparison-row">
        <td
          style={{
            padding: "12px 16px",
            fontWeight: 500,
            borderBottom: "1px solid var(--border-subtle)",
            color: "var(--text-muted)",
            position: "sticky",
            left: 0,
            background: "var(--bg-surface)",
            zIndex: 10,
            borderRight: "2px solid var(--border-subtle)",
            fontSize: "0.9rem",
          }}
        >
          {label}
        </td>
        {cells}
      </tr>
    );
  };

  const handleAddScenario = (): void => {
    const count = savedScenarios.peek().length + 1;
    saveScenario(`Scenario ${count}`, "New simulation", deductions.peek());
  };

  return (
    <div
      class={`glass-panel fade-in comparison-shell${showSavedComparison.value ? " comparison-show-saved" : ""}`}
      style={{
        maxWidth: "95vw",
        margin: "0 auto 40px auto",
        padding: "25px",
        position: "relative",
        borderTop: "4px solid var(--color-primary)",
      }}
    >
      <div className="comparison-heading"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Scenario Manager &amp; Household Models</h2>
          <p
            style={{
              margin: "5px 0 0 0",
              fontSize: "0.9rem",
              color: "var(--text-muted)",
            }}
          >
            Compare your active live inputs against saved household planning
            scenarios.
          </p>
        </div>

        <div role="group" aria-label="Result display period" style={{ display: "flex",
          gap: "15px",
          alignItems: "center" }}>
          <span>Results</span>
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
              aria-pressed={isMonthly}
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
              aria-pressed={!isMonthly}
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
      </div>

      {savedScenarios.value.length > 0 && <button className="comparison-mobile-toggle" aria-expanded={showSavedComparison.value} aria-controls="household-comparison-table"
        onClick={() => {
          showSavedComparison.value = !showSavedComparison.value;
        }}>
        {showSavedComparison.value ? "Show live inputs only" : "Compare saved scenarios"}
      </button>}
      <LiveCalculationSummary data={deductions.value} hasInvalidInputs={hasInvalidLive} />

      <div className="comparison-scroll" style={{ overflowX: "auto",
        paddingBottom: "10px" }}>
        <table id="household-comparison-table" className="comparison-matrix" aria-label="Live and saved household calculations"
          style={{
            tableLayout: "fixed",
            width: "max-content",
            borderCollapse: "separate",
            borderSpacing: 0,
            textAlign: "left",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  padding: "16px",
                  borderBottom: "2px solid var(--border-subtle)",
                  width: "250px",
                  position: "sticky",
                  left: 0,
                  top: 0,
                  background: "var(--bg-surface)",
                  zIndex: 20,
                  borderRight: "2px solid var(--border-subtle)",
                }}
              ></th>

              <th
                style={{
                  padding: "16px",
                  borderBottom: "2px solid var(--color-gain)",
                  background: "var(--color-gain-bg)",
                  position: "sticky",
                  top: 0,
                  zIndex: 15,
                  width: "300px",
                  borderTop: "2px solid var(--color-gain)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                      gap: "8px",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "1.1rem",
                          color: "var(--color-gain)",
                          padding: "2px 4px",
                          fontWeight: "bold",
                        }}
                      >
                        Live Calculation
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: "normal",
                          color: "var(--text-muted)",
                          padding: "2px 4px",
                        }}
                      >
                        Edit inputs below; results update immediately
                      </div>
                    </div>

                    <button
                      onClick={handleAddScenario}
                      disabled={hasInvalidLive}
                      aria-label="Save as New Scenario"
                      style={{
                        background: "transparent",
                        color: "var(--color-gain)",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "4px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0.8,
                        transition: "opacity 0.2s",
                      }}
                      title={hasInvalidLive ? "Complete or correct live inputs before saving" : "Save as New Scenario"}
                    >
                      <AddActionIcon />
                    </button>
                  </div>
                </div>
                <LiveCalculatorSettings />
              </th>

              {savedScenarios.value.map((scenario) => {
                const isActive = activeScenarioId.value === scenario.id;

                return (
                  <th
                    key={scenario.id}
                    style={{
                      padding: "16px",
                      borderBottom: `2px solid ${isActive ? "var(--color-primary)" : "var(--border-subtle)"}`,
                      position: "sticky",
                      top: 0,
                      background: isActive
                        ? "var(--color-primary-bg)"
                        : "var(--bg-surface)",
                      zIndex: 15,
                      width: "300px",
                      borderTop: isActive
                        ? "2px solid var(--color-primary)"
                        : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          gap: "8px",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            value={
                              isActive && scenarioDraft.value
                                ? scenarioDraft.value.title
                                : scenario.title
                            }
                            onChange={(e) => {
                              if (isActive && scenarioDraft.value) {
                                updateScenarioMetaData(
                                  (e.target as HTMLInputElement).value,
                                  scenarioDraft.value.description,
                                );
                              }
                            }}
                            style={{
                              background: "transparent",
                              border: "1px solid transparent",
                              color: isActive
                                ? "var(--color-primary)"
                                : "var(--text-primary)",
                              fontSize: "1.1rem",
                              fontWeight: "bold",
                              width: "100%",
                              padding: "2px 4px",
                              borderRadius: "4px",
                              outline: "none",
                              transition: "0.2s",
                              pointerEvents: isActive ? "auto" : "none",
                            }}
                            title={isActive ? "Edit title" : scenario.title}
                          />
                          <input
                            type="text"
                            value={
                              isActive && scenarioDraft.value
                                ? scenarioDraft.value.description
                                : scenario.description
                            }
                            placeholder={isActive ? "Add description..." : ""}
                            onChange={(e) => {
                              if (isActive && scenarioDraft.value) {
                                updateScenarioMetaData(
                                  scenarioDraft.value.title,
                                  (e.target as HTMLInputElement).value,
                                );
                              }
                            }}
                            style={{
                              background: "transparent",
                              border: "1px solid transparent",
                              color: "var(--text-muted)",
                              fontSize: "0.8rem",
                              fontWeight: "normal",
                              width: "100%",
                              padding: "2px 4px",
                              borderRadius: "4px",
                              outline: "none",
                              transition: "0.2s",
                              pointerEvents: isActive ? "auto" : "none",
                            }}
                            title={
                              isActive
                                ? "Edit description"
                                : scenario.description
                            }
                          />
                        </div>

                        <div style={{ display: "flex",
                          gap: "4px" }}>
                          {!isActive && (
                            <>
                              <button
                                onClick={() => loadScenario(scenario.id)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "var(--color-gain)",
                                  cursor: "pointer",
                                  padding: "4px",
                                  borderRadius: "4px",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  opacity: 0.8,
                                  transition: "opacity 0.2s",
                                }}
                                title="Load into Live Calculator"
                              >
                                <ExportDataIcon />
                              </button>
                              <button
                                onClick={() => editScenario(scenario.id)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "var(--color-primary)",
                                  cursor: "pointer",
                                  padding: "4px",
                                  borderRadius: "4px",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  opacity: 0.8,
                                  transition: "opacity 0.2s",
                                }}
                                title="Edit Scenario"
                              >
                                <EditSettingsIcon />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteScenario(scenario.id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--color-loss)",
                              cursor: "pointer",
                              padding: "4px",
                              borderRadius: "4px",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: 0.7,
                              transition: "opacity 0.2s",
                            }}
                            title="Delete Scenario"
                          >
                            <RemoveItemIcon />
                          </button>
                        </div>
                      </div>

                      {isActive && (
                        <div style={{ display: "flex",
                          gap: "5px" }}>
                          <button
                            onClick={saveDraft}
                            disabled={hasInvalidSaved(scenario.id)}
                            style={{
                              background: "var(--color-primary)",
                              color: "white",
                              border: "none",
                              padding: "6px 8px",
                              borderRadius: "4px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px",
                            }}
                            title={hasInvalidSaved(scenario.id) ? "Complete or correct scenario inputs before saving" : "Save changes to scenario"}
                          >
                            <SaveConfigurationIcon /> Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={{
                              background: "transparent",
                              color: "var(--text-secondary)",
                              border: "1px solid var(--border-subtle)",
                              padding: "6px 8px",
                              borderRadius: "4px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              flex: 1,
                            }}
                            title="Cancel editing"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={savedScenarios.value.length + 2}
                style={{
                  padding: "20px 16px 8px 16px",
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  color: "var(--text-muted)",
                  fontWeight: 700,
                  background: "var(--bg-surface-secondary)",
                }}
              >
                Household Summary
              </td>
            </tr>
            {renderRow(
              isMonthly ? "Household Avg Gross" : "Household Gross",
              null,
              "grossYearly",
              true,
              true,
            )}
            {renderRow(
              isMonthly ? "Household Avg Net" : "Household Net Pay",
              null,
              "netIncome",
              true,
              true,
            )}
            {renderAverageMonthlyNetRow(null, true)}
            {renderPerPaycheckRow(null, true)}
            {renderRow(
              isMonthly ? "Household Avg Deductions" : "Total Deductions",
              null,
              "totalDeductions",
              true,
            )}

            {renderInputRow(
              "Gross input period",
              "inputMode",
              "select",
              [{ value: "monthly",
                label: "Monthly gross input" }, { value: "yearly",
                label: "Yearly gross input" }],
              (inputs) => inputs.inputMode === "monthly" ? "Monthly gross input" : "Yearly gross input",
            )}
            {renderInputRow(
              "Include partner",
              "hasPartner",
              "checkbox",
              null,
              (inputs) => inputs.hasPartner ? "Yes" : "No",
            )}

            <tr>
              <td
                colSpan={savedScenarios.value.length + 2}
                style={{
                  padding: "25px 16px 8px 16px",
                  fontSize: "0.8rem",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  background: "var(--bg-surface-secondary)",
                }}
              >
                Person 1 Parameters
              </td>
            </tr>
            {(() => {
              const taxBracketOptions = [
                { value: "1",
                  label: "Class I" },
                { value: "2",
                  label: "Class II" },
                { value: "3",
                  label: "Class III" },
                { value: "4",
                  label: "Class IV" },
                { value: "5",
                  label: "Class V" },
                { value: "6",
                  label: "Class VI" },
              ];
              const stateOptions = [
                "Baden-Württemberg",
                "Bayern",
                "Berlin",
                "Brandenburg",
                "Bremen",
                "Hamburg",
                "Hessen",
                "Mecklenburg-Vorpommern",
                "Niedersachsen",
                "Nordrhein-Westfalen",
                "Rheinland-Pfalz",
                "Saarland",
                "Sachsen",
                "Sachsen-Anhalt",
                "Schleswig-Holstein",
                "Thüringen",
              ].map((s) => ({ value: s,
                label: s }));

              return (
                <>
                  {renderInputRow(
                    "Gross Income",
                    "grossIncome",
                    "number",
                    null,
                    (s) => format(s.grossIncome || 0),
                  )}
                  {renderInputRow(
                    "Federal State",
                    "state",
                    "select",
                    stateOptions,
                    (s) => s.state || "-",
                  )}
                  {renderInputRow(
                    "Tax Class",
                    "taxBracket",
                    "select",
                    taxBracketOptions,
                    (s) => (s.taxBracket ? `Class ${s.taxBracket}` : "-"),
                  )}
                  {renderInputRow(
                    "Church Tax",
                    "hasChurchTax",
                    "checkbox",
                    null,
                    (s) => (s.hasChurchTax ? "Yes" : "No"),
                  )}
                  {renderInputRow(
                    "Children",
                    "children",
                    "number",
                    null,
                    (s) => s.children ?? "-",
                  )}
                  {renderInputRow(
                    "Working Months",
                    "workingMonths",
                    "number",
                    null,
                    (s) =>
                      s.workingMonths ? `${s.workingMonths} Months` : "-",
                  )}
                  {renderInputRow(
                    "Salaries / Year",
                    "salariesPerYear",
                    "number",
                    null,
                    (s) =>
                      s.salariesPerYear ? `${s.salariesPerYear} Salaries` : "-",
                  )}
                </>
              );
            })()}

            {hasAnyPartner && (
              <>
                <tr>
                  <td
                    colSpan={savedScenarios.value.length + 2}
                    style={{
                      padding: "25px 16px 8px 16px",
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      background: "var(--bg-surface-secondary)",
                    }}
                  >
                    Partner Parameters
                  </td>
                </tr>
                {(() => {
                  const taxBracketOptions = [
                    { value: "1",
                      label: "Class I" },
                    { value: "2",
                      label: "Class II" },
                    { value: "3",
                      label: "Class III" },
                    { value: "4",
                      label: "Class IV" },
                    { value: "5",
                      label: "Class V" },
                    { value: "6",
                      label: "Class VI" },
                  ];
                  const stateOptions = [
                    "Baden-Württemberg",
                    "Bayern",
                    "Berlin",
                    "Brandenburg",
                    "Bremen",
                    "Hamburg",
                    "Hessen",
                    "Mecklenburg-Vorpommern",
                    "Niedersachsen",
                    "Nordrhein-Westfalen",
                    "Rheinland-Pfalz",
                    "Saarland",
                    "Sachsen",
                    "Sachsen-Anhalt",
                    "Schleswig-Holstein",
                    "Thüringen",
                  ].map((s) => ({ value: s,
                    label: s }));

                  return (
                    <>
                      {renderInputRow(
                        "Partner Gross",
                        "partnerGrossIncome",
                        "number",
                        null,
                        (s) => format(s.partnerGrossIncome || 0),
                      )}
                      {renderInputRow(
                        "Partner Federal State",
                        "partnerState",
                        "select",
                        stateOptions,
                        (s) => s.partnerState || "-",
                      )}
                      {renderInputRow(
                        "Partner Tax Class",
                        "partnerTaxBracket",
                        "select",
                        taxBracketOptions,
                        (s) =>
                          s.partnerTaxBracket
                            ? `Class ${s.partnerTaxBracket}`
                            : "-",
                      )}
                      {renderInputRow(
                        "Partner Church Tax",
                        "partnerHasChurchTax",
                        "checkbox",
                        null,
                        (s) => (s.partnerHasChurchTax ? "Yes" : "No"),
                      )}
                      {renderInputRow(
                        "Partner Working Months",
                        "partnerWorkingMonths",
                        "number",
                        null,
                        (s) =>
                          s.partnerWorkingMonths
                            ? `${s.partnerWorkingMonths} Months`
                            : "-",
                      )}
                      {renderInputRow(
                        "Partner Salaries",
                        "partnerSalariesPerYear",
                        "number",
                        null,
                        (s) =>
                          s.partnerSalariesPerYear
                            ? `${s.partnerSalariesPerYear} Salaries`
                            : "-",
                      )}
                    </>
                  );
                })()}
              </>
            )}

            <tr>
              <td
                colSpan={savedScenarios.value.length + 2}
                style={{
                  padding: "25px 16px 8px 16px",
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  color: "var(--text-muted)",
                  fontWeight: 700,
                  background: "var(--bg-surface-secondary)",
                }}
              >
                Person 1 Summary
              </td>
            </tr>
            {renderRow(
              isMonthly ? "Avg Gross" : "Gross Income",
              "person1",
              "grossYearly",
              false,
              true,
            )}
            {renderRow(
              isMonthly ? "Avg Net" : "Net Take-Home Pay",
              "person1",
              "netIncome",
              false,
              true,
            )}
            {renderAverageMonthlyNetRow("person1", false)}
            {renderPerPaycheckRow("person1", false)}
            {renderRow(
              isMonthly ? "Avg Wage Tax" : "Wage Tax (Lohnsteuer)",
              "person1",
              "tax",
            )}
            {renderRow(
              isMonthly ? "Avg Health Care" : "Health Insurance",
              "person1",
              "healthCare",
            )}
            {renderRow(
              isMonthly ? "Avg Pension" : "Pension Insurance",
              "person1",
              "pension",
            )}



            {hasAnyPartner && (
              <>
                <tr>
                  <td
                    colSpan={savedScenarios.value.length + 2}
                    style={{
                      padding: "25px 16px 8px 16px",
                      fontSize: "0.85rem",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      color: "var(--text-muted)",
                      fontWeight: 700,
                      background: "var(--bg-surface-secondary)",
                    }}
                  >
                    Partner Summary
                  </td>
                </tr>
                {renderRow(
                  isMonthly ? "Avg Gross" : "Gross Income",
                  "partner",
                  "grossYearly",
                  false,
                  true,
                )}
                {renderRow(
                  isMonthly ? "Avg Net" : "Net Take-Home Pay",
                  "partner",
                  "netIncome",
                  false,
                  true,
                )}
                {renderAverageMonthlyNetRow("partner", false)}
                {renderPerPaycheckRow("partner", false)}
                {renderRow(
                  isMonthly ? "Avg Wage Tax" : "Wage Tax (Lohnsteuer)",
                  "partner",
                  "tax",
                )}


              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
