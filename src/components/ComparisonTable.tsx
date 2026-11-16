import {
  TopicHelp, 
} from "#components/topics/TopicHelp";
import {
  formatEur,
  formatEurCents,
  formatSignedEurDelta,
} from "#utils/currencyFormat";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  getAvailableWhatIfScenarios,
} from "#engine/tax/whatIfScenarios";
import {
  HouseholdRelationship,
  TaxAssessment,
} from "#engine/tax/taxAssessment";
import LawRefLink from "#components/laws/LawRefLink";
import {
  LawGroupId,
  LawId,
} from "#engine/laws/types";
import CalculatorGrossInput from "#components/CalculatorGrossInput";
import {
  CalculatorGrossField,
  grossInputForPeriod,
  inputModeForPeriod,
} from "#engine/tax/calculatorGrossPeriod";
import {
  LiveColumnImport,
  SavedColumnTools,
} from "#components/CalculatorColumnTools";
import "./ComparisonTable.css";
import ScenarioParameterInput from "#components/ScenarioParameterInput";
import {
  CalculationSummary,
  PayrollEvidenceSummary,
  TaxableIncomeSummary,
} from "#components/CalculatorResultSummaries";
import GrossPeriodPreview from "#components/GrossPeriodPreview";
import {
  LiveChoiceInput,
  LiveNumberInput,
  LiveToggleInput,
} from "#components/LiveCalculatorInputs";
import LiveCalculatorSettings from "#components/LiveCalculatorSettings";
import germanStates from "../data/germanStates.json" with { type: "json" };
import {
  DEFAULT_TAX_YEAR,
} from "#engine/tax/taxRules";
import {
  toSalaryPaymentCount,
} from "#engine/tax/employmentPeriod";
import {
  SalaryPeriod,
  TaxClass,
  toChildrenCount,
  toMonthDuration,
} from "#engine/types";
import type {
  JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";
import {
  useSignal,
} from "@preact/signals";
import {
  parseVerifiedTaxYear,
  selectedTaxYear,
  verifiedTaxYears,
} from "#store/taxConfigStore";
import {
  type CalculatorInputs,
  type HouseholdScenarioData,
  type PersonDeductions,
  CALCULATOR_PARTNER_SHORTCUT,
  activeScenarioId,
  assessmentMode,
  calculateScenarioData,
  calculatorInvalidInputs,
  calculatorViewPeriod,
  cancelEdit,
  children,
  deductions,
  deleteScenario,
  editScenario,
  getCurrentInputs,
  hasChurchTax,
  hasPartner,
  hasUnsavedScenarioChanges,
  loadScenario,
  partnerHasChurchTax,
  partnerSalariesPerYear,
  partnerState,
  partnerTaxBracket,
  partnerWorkingMonths,
  pendingScenarioDeletion,
  relationshipStatus,
  salariesPerYear,
  saveDraft,
  saveScenario,
  saveWhatIfScenario,
  savedScenarios,
  scenarioDraft,
  setLiveRelationshipStatus,
  setLiveTaxBracket,
  state,
  taxBracket,
  undoScenarioDeletion,
  updateDraftGrossInput,
  updateLiveGrossInput,
  updateScenarioMetaData,
  workingMonths,
} from "#store/calculatorStore";
import {
  DismissIcon,
  EditSettingsIcon,
  ExportDataIcon,
  RemoveItemIcon,
  SaveConfigurationIcon,
} from "#components/Icons";

export default function ComparisonTable(): JSX.Element | null {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  return <ComparisonTableContent />;
}

/**
 * Single unified Net Pay workspace and side-by-side scenario comparison.
 * Column 1 keeps Live inputs directly editable beside saved scenarios, with
 * headline net pay and delta on top, inputs immediately below, and detailed breakdowns last.
 */
export function ComparisonTableContent(): JSX.Element {
  const showSavedComparison = useSignal(false);
  const liveImportRevision = useSignal(0);
  const invalidInputs = calculatorInvalidInputs;
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
  const viewMode = inputModeForPeriod(calculatorViewPeriod.value);

  const format = (num: number): string => formatEur(num);

  const isMonthly = calculatorViewPeriod.value === SalaryPeriod.Monthly;
  const liveInputs = getCurrentInputs();
  const whatIfScenarios = getAvailableWhatIfScenarios(liveInputs);
  const handleAddScenario = (): void => {
    const count = savedScenarios.peek().length + 1;
    saveScenario(`Scenario ${count}`, "", deductions.peek());
  };

  const renderDetailRow = (
    label: string,
    render: (
      data: HouseholdScenarioData,
      id: string,
      live: boolean,
      context: string,
    ) => JSX.Element,
  ): JSX.Element => (
    <tr className="comparison-detail-row">
      <th scope="row">{label}</th>
      <td
        key={`live-details-${liveImportRevision.value}`}
        className="comparison-detail-cell"
        aria-label={`Live calculation: ${label}`}
      >
        {hasInvalidLive && <p role="status">Last valid inputs</p>}
        {render(deductions.value, "live", true, "Live Calculation")}
      </td>
      {savedScenarios.value.map((scenario) => {
        const data = activeScenarioId.value === scenario.id && scenarioDraft.value
          ? scenarioDraft.value.data
          : calculateScenarioData(scenario.inputs);
        return (
          <td
            key={scenario.id}
            className="comparison-detail-cell"
            aria-label={`${scenario.title}: ${label}`}
          >
            {hasInvalidSaved(scenario.id) && <p role="status">Last valid inputs</p>}
            {render(
              data,
              `scenario-${scenario.id}`,
              false,
              `${scenario.title}${activeScenarioId.value === scenario.id ? " (draft)" : ""}`,
            )}
          </td>
        );
      })}
    </tr>
  );

  const hasAnyPartner = hasPartner.value || savedScenarios.value.some((scenario) =>
    (activeScenarioId.value === scenario.id && scenarioDraft.value ? scenarioDraft.value.inputs : scenario.inputs).hasPartner);
  const canSelectAssessment = (inputs: Partial<CalculatorInputs>): boolean =>
    inputs.relationshipStatus === HouseholdRelationship.MarriedOrCivilPartners ||
    (Boolean(inputs.hasPartner) &&
      (!inputs.relationshipStatus || inputs.relationshipStatus === HouseholdRelationship.Unspecified)) ||
    inputs.assessmentMode === TaxAssessment.Joint;
  const showsAssessmentRowFor = (inputs: Partial<CalculatorInputs>): boolean =>
    Boolean(inputs.hasPartner) || canSelectAssessment(inputs);
  const showAssessmentRow = showsAssessmentRowFor(liveInputs) || savedScenarios.value.some((scenario) =>
    showsAssessmentRowFor(activeScenarioId.value === scenario.id && scenarioDraft.value ? scenarioDraft.value.inputs : scenario.inputs));

  // Keep section labels in their own sticky cell instead of scrolling a spanning label away.
  const renderSectionRow = (label: string, major = false): JSX.Element => (
    <tr className="comparison-section-row">
      <th scope="row" className={major ? "comparison-section-heading" : "comparison-subsection-heading"}>{label}</th>
      <td className={major ? "comparison-section-heading" : "comparison-subsection-heading"} colSpan={savedScenarios.value.length + 1} aria-hidden="true" />
    </tr>
  );

  const validateLive = <K extends keyof CalculatorInputs>(field: K) => (value: CalculatorInputs[K]): void => {
    calculateScenarioData({
      ...getCurrentInputs(),
      [field]: value,
    });
  };
  const verifiedTaxYearOptions = verifiedTaxYears.map((year) => {
    const parsed = parseVerifiedTaxYear(year);
    return {
      value: parsed,
      label: String(parsed),
    };
  });
  const savedTaxYearOptions = verifiedTaxYearOptions.map((option) => ({
    value: String(option.value),
    label: option.label,
  }));
  const liveStateOptions = germanStates.map((value) => ({
    value,
    label: value,
  }));
  const liveClassOptions = Object.values(TaxClass).map((value, index) => ({
    value: String(index + 1),
    label: `Class ${value}`,
  }));
  const relationshipOptions = [
    {
      value: HouseholdRelationship.Unspecified,
      label: "Select…",
    },
    {
      value: HouseholdRelationship.Single,
      label: "Single",
    },
    {
      value: HouseholdRelationship.UnmarriedPartners,
      label: "Unmarried partners",
    },
    {
      value: HouseholdRelationship.MarriedOrCivilPartners,
      label: "Married / registered partners",
    },
    {
      value: HouseholdRelationship.QualifyingWidowed,
      label: "Qualifying widowed (§ 32a Abs. 6)",
    },
  ];
  const assessmentOptions = [
    {
      value: TaxAssessment.Unspecified,
      label: "Auto",
    },
    {
      value: TaxAssessment.Individual,
      label: "Individual",
    },
    {
      value: TaxAssessment.Joint,
      label: "Joint (spouses)",
    },
  ];
  const salaryUnit = (mode: CalculatorInputs["inputMode"]): string => mode === "monthly" ? "€ / month" : "€ / year";

  const liveControls = {
    taxYear: (
      <LiveChoiceInput
        label="Tax year"
        value={selectedTaxYear}
        options={verifiedTaxYearOptions}
        beforeChange={validateLive("taxYear")}
        onValidityChange={trackValidity("live-taxYear")}
      />
    ),
    grossIncome: (
      <CalculatorGrossInput
        inputs={liveInputs}
        field={CalculatorGrossField.Primary}
        id="live-gross"
        descriptionId="live-gross-preview"
        label="Live Calculation: Gross income"
        onChange={(amount) => updateLiveGrossInput(CalculatorGrossField.Primary, amount)}
        onValidityChange={trackValidity("live-grossIncome")}
      />
    ),
    taxBracket: (
      <LiveChoiceInput
        onValidityChange={trackValidity("live-taxBracket")}
        label="Tax class"
        value={taxBracket}
        options={liveClassOptions}
        beforeChange={setLiveTaxBracket}
      />
    ),
    state: (
      <LiveChoiceInput
        onValidityChange={trackValidity("live-state")}
        label="Federal state"
        value={state}
        options={liveStateOptions}
        beforeChange={validateLive("state")}
      />
    ),
    hasChurchTax: (
      <LiveToggleInput
        onValidityChange={trackValidity("live-hasChurchTax")}
        label="Church tax"
        value={hasChurchTax}
        beforeChange={validateLive("hasChurchTax")}
      />
    ),
    children: (
      <LiveNumberInput
        onValidityChange={trackValidity("live-children")}
        id="live-children"
        label="Children"
        value={children}
        construct={toChildrenCount}
        beforeChange={validateLive("children")}
      />
    ),
    workingMonths: (
      <LiveNumberInput
        onValidityChange={trackValidity("live-workingMonths")}
        id="live-months"
        label="Working months"
        value={workingMonths}
        construct={toMonthDuration}
        beforeChange={validateLive("workingMonths")}
      />
    ),
    salariesPerYear: (
      <LiveNumberInput
        onValidityChange={trackValidity("live-salariesPerYear")}
        id="live-salaries"
        label="Salaries per year"
        value={salariesPerYear}
        construct={toSalaryPaymentCount}
        beforeChange={validateLive("salariesPerYear")}
        step={0.5}
      />
    ),
    relationshipStatus: (
      <LiveChoiceInput
        onValidityChange={trackValidity("live-relationshipStatus")}
        label="Relationship"
        value={relationshipStatus}
        options={relationshipOptions}
        beforeChange={setLiveRelationshipStatus}
      />
    ),
    hasPartner: (
      <LiveToggleInput
        onValidityChange={trackValidity("live-hasPartner")}
        label="Partner 2 payroll"
        value={hasPartner}
        beforeChange={validateLive("hasPartner")}
      />
    ),
    assessmentMode: (
      <LiveChoiceInput
        label="Assessment"
        value={assessmentMode}
        options={assessmentOptions}
        beforeChange={validateLive("assessmentMode")}
        onValidityChange={trackValidity("live-assessmentMode")}
      />
    ),
    partnerGrossIncome: (
      <CalculatorGrossInput
        inputs={liveInputs}
        field={CalculatorGrossField.Partner}
        id="live-partner-gross"
        descriptionId="live-partner-gross-preview"
        label="Live Calculation: Partner gross income"
        onChange={(amount) => updateLiveGrossInput(CalculatorGrossField.Partner, amount)}
        onValidityChange={trackValidity("live-partnerGrossIncome")}
      />
    ),
    partnerTaxBracket: (
      <LiveChoiceInput
        onValidityChange={trackValidity("live-partnerTaxBracket")}
        label="Partner tax class"
        value={partnerTaxBracket}
        options={liveClassOptions}
        beforeChange={validateLive("partnerTaxBracket")}
      />
    ),
    partnerState: (
      <LiveChoiceInput
        onValidityChange={trackValidity("live-partnerState")}
        label="Partner federal state"
        value={partnerState}
        options={liveStateOptions}
        beforeChange={validateLive("partnerState")}
      />
    ),
    partnerHasChurchTax: (
      <LiveToggleInput
        onValidityChange={trackValidity("live-partnerHasChurchTax")}
        label="Partner church tax"
        value={partnerHasChurchTax}
        beforeChange={validateLive("partnerHasChurchTax")}
      />
    ),
    partnerWorkingMonths: (
      <LiveNumberInput
        onValidityChange={trackValidity("live-partnerWorkingMonths")}
        id="live-partner-months"
        label="Partner working months"
        value={partnerWorkingMonths}
        construct={toMonthDuration}
        beforeChange={validateLive("partnerWorkingMonths")}
      />
    ),
    partnerSalariesPerYear: (
      <LiveNumberInput
        onValidityChange={trackValidity("live-partnerSalariesPerYear")}
        id="live-partner-salaries"
        label="Partner salaries per year"
        value={partnerSalariesPerYear}
        construct={toSalaryPaymentCount}
        beforeChange={validateLive("partnerSalariesPerYear")}
        step={0.5}
      />
    ),
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
    const divider = isMonthly && useDivider ? 12 : 1;
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

  const getHouseholdPaycheck = (snapshot: HouseholdScenarioData): number => {
    const p1Net = snapshot.person1.netIncome / (snapshot.person1.salariesReceived || 12);
    const p2Net = snapshot.partner ? snapshot.partner.netIncome / (snapshot.partner.salariesReceived || 12) : 0;
    return p1Net + p2Net;
  };

  const renderHeadlineNetRow = (): JSX.Element => {
    const rowLabel = hasAnyPartner
      ? (isMonthly ? "Household Net / mo" : "Household Net / yr")
      : (isMonthly ? "Net Take-Home / mo" : "Net Take-Home / yr");
    const liveSnapshot = deductions.value;
    const liveNet = getHouseholdMetric(liveSnapshot, "netIncome");
    const cells: JSX.Element[] = [
      <td
        key="current"
        class="tabular-nums"
        style={{
          padding: "12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--color-gain-bg)",
          color: "var(--color-gain)",
          minWidth: "220px",
        }}
      >
        <strong className="comparison-hero-value">{format(liveNet)}</strong>
        <span className="comparison-hero-sub">
          {isMonthly
            ? `Per paycheck: ${format(getHouseholdPaycheck(liveSnapshot))} · Annual: ${format(liveSnapshot.household.netIncome)}`
            : `Avg monthly: ${format(liveSnapshot.household.netIncome / 12)} / mo`}
        </span>
      </td>,
    ];

    savedScenarios.value.forEach((scenario) => {
      const isActive = activeScenarioId.value === scenario.id;
      const dataToUse = isActive && scenarioDraft.value
        ? scenarioDraft.value.data
        : calculateScenarioData(scenario.inputs);
      const savedNet = getHouseholdMetric(dataToUse, "netIncome");

      cells.push(
        <td
          key={scenario.id}
          class="tabular-nums"
          style={{
            padding: "12px",
            borderBottom: "1px solid var(--border-subtle)",
            minWidth: "220px",
            color: isActive ? "var(--color-primary)" : "var(--text-primary)",
            background: isActive ? "var(--color-primary-bg)" : "transparent",
          }}
        >
          <strong className="comparison-hero-value">{format(savedNet)}</strong>
          <span className="comparison-hero-sub">
            {isMonthly
              ? `Per paycheck: ${format(getHouseholdPaycheck(dataToUse))} · Annual: ${format(dataToUse.household.netIncome)}`
              : `Avg monthly: ${format(dataToUse.household.netIncome / 12)} / mo`}
          </span>
        </td>,
      );
    });

    return (
      <tr class="comparison-row">
        <td
          style={{
            padding: "12px",
            fontWeight: 700,
            borderBottom: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            position: "sticky",
            left: 0,
            background: "var(--bg-surface)",
            zIndex: 10,
            borderRight: "2px solid var(--border-subtle)",
          }}
        >
          {rowLabel}
        </td>
        {cells}
      </tr>
    );
  };

  const renderHouseholdNetDeltaRow = (): JSX.Element => {
    const liveNet = getHouseholdMetric(deductions.value, "netIncome");
    const cells: JSX.Element[] = [
      <td
        key="current"
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--color-gain-bg)",
          minWidth: "220px",
        }}
      >
        <span className="badge-neutral">Live baseline</span>
      </td>,
    ];

    savedScenarios.value.forEach((scenario) => {
      const isActive = activeScenarioId.value === scenario.id;
      const dataToUse = isActive && scenarioDraft.value
        ? scenarioDraft.value.data
        : calculateScenarioData(scenario.inputs);
      const savedNet = getHouseholdMetric(dataToUse, "netIncome");
      const diff = savedNet - liveNet;
      const roundedDiff = Math.round(diff);
      const deltaClass = roundedDiff > 0
        ? "comparison-delta--gain"
        : roundedDiff < 0
          ? "comparison-delta--loss"
          : "comparison-delta--neutral";

      cells.push(
        <td
          key={scenario.id}
          class="tabular-nums"
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid var(--border-subtle)",
            minWidth: "220px",
            background: isActive ? "var(--color-primary-bg)" : "transparent",
          }}
        >
          <span className={deltaClass}>
            {formatSignedEurDelta(diff, liveNet > 0 ? liveNet : undefined)}
          </span>
        </td>,
      );
    });

    return (
      <tr class="comparison-row">
        <td
          style={{
            padding: "8px 12px",
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
          Net Difference vs Live
        </td>
        {cells}
      </tr>
    );
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
        return {
          val: p1Val + p2Val,
          hint: "",
        };
      }
      else if (personKey) {
        const p = snapshot[personKey];
        if (!p) {
          return {
            val: 0,
            hint: "",
          };
        }
        const salaries = p.salariesReceived || 12;
        return {
          val: p.netIncome / salaries,
          hint: `(x${salaries})`,
        };
      }
      return {
        val: 0,
        hint: "",
      };
    };

    const current = getPaycheckVal(deductions.value);
    cells.push(
      <td
        key="current"
        class="tabular-nums"
        style={{
          padding: "8px 12px",
          fontWeight: "bold",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--color-gain-bg)",
          minWidth: "220px",
          color: "var(--color-gain)",
        }}
      >
        {format(current.val)}{" "}
        <span style={{ fontSize: "0.8rem",
          color: "var(--text-muted)",
          fontWeight: "normal" }}>
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
            padding: "8px 12px",
            fontWeight: "bold",
            borderBottom: "1px solid var(--border-subtle)",
            minWidth: "220px",
            color: isActive ? "var(--color-primary)" : "var(--text-primary)",
            background: isActive ? "var(--color-primary-bg)" : "transparent",
          }}
        >
          {format(saved.val)}{" "}
          <span style={{ fontSize: "0.8rem",
            color: "var(--text-muted)",
            fontWeight: "normal" }}>
            {saved.hint}
          </span>
        </td>,
      );
    });

    return (
      <tr class="comparison-row">
        <td
          style={{
            padding: "8px 12px",
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
  ): JSX.Element | null => {
    if (isMonthly) {
      return null;
    }
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
          padding: "8px 12px",
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
            padding: "8px 12px",
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
            padding: "8px 12px",
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
          <span style={{ fontSize: "0.75rem",
            color: "var(--text-muted)",
            marginLeft: "4px" }}>
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

    const currentVal = isHousehold
      ? getHouseholdMetric(
        deductions.value,
        metricKey as "grossYearly" | "netIncome" | "totalDeductions",
      )
      : personKey
        ? getMetric(deductions.value, personKey, metricKey)
        : 0;

    cells.push(
      <td
        key="current"
        class="tabular-nums"
        style={{
          padding: "8px 12px",
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
            padding: "8px 12px",
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
            padding: "8px 12px",
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
    options: { value: string;
      label: string }[] | null,
    formatFn: (inputs: Partial<CalculatorInputs>) => string | number,
  ): JSX.Element => {
    const partnerField = fieldKey.startsWith("partner");
    const accessibleLabel = partnerField ? `Partner ${label.toLowerCase()}` : label;
    const isIncludedFor = (candidate: Partial<CalculatorInputs>): boolean => {
      if (fieldKey === "assessmentMode") {
        return showsAssessmentRowFor(candidate);
      }
      if (partnerField) {
        return Boolean(candidate.hasPartner);
      }
      return true;
    };

    const liveIncluded = isIncludedFor(liveInputs);
    const liveIsGross = fieldKey === "grossIncome" || fieldKey === "partnerGrossIncome";
    const cells: JSX.Element[] = [
      <td
        key={`current-${liveImportRevision.value}`}
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--color-gain-bg)",
          color: "var(--text-primary)",
          fontSize: "0.9rem",
        }}
      >
        {liveIncluded ? (
          <>
            {liveControls[fieldKey]}
            {liveIsGross && <div><small>{salaryUnit(viewMode)}</small></div>}
            {liveIsGross && (
              <GrossPeriodPreview
                id={fieldKey === "grossIncome" ? "live-gross-preview" : "live-partner-gross-preview"}
                inputMode={viewMode}
                annualGross={fieldKey === "grossIncome" ? deductions.value.person1.grossYearly : deductions.value.partner?.grossYearly}
                lastValid={hasInvalidLive}
              />
            )}
          </>
        ) : "—"}
      </td>,
    ];

    savedScenarios.value.forEach((scenario) => {
      const isActive = activeScenarioId.value === scenario.id;
      const inputsToUse =
        isActive && scenarioDraft.value
          ? scenarioDraft.value.inputs
          : scenario.inputs || {};
      const rawVal = fieldKey === "assessmentMode"
        ? inputsToUse.assessmentMode ?? TaxAssessment.Unspecified
        : fieldKey === "taxYear"
          ? inputsToUse.taxYear ?? DEFAULT_TAX_YEAR
          : inputsToUse[fieldKey];
      const grossField = fieldKey === CalculatorGrossField.Primary
        ? CalculatorGrossField.Primary
        : fieldKey === CalculatorGrossField.Partner
          ? CalculatorGrossField.Partner
          : undefined;
      const included = isIncludedFor(inputsToUse);
      const grossValue = grossField && included
        ? grossInputForPeriod(inputsToUse, grossField, calculatorViewPeriod.value)
        : undefined;
      const savedVal = grossField
        ? !included ? "Not included" : grossValue === undefined ? "Unset" : formatEurCents(grossValue)
        : formatFn(inputsToUse);
      const grossData = liveIsGross
        ? isActive && scenarioDraft.value ? scenarioDraft.value.data : calculateScenarioData(scenario.inputs)
        : undefined;

      let content: JSX.Element | string | number = included ? savedVal : "—";
      if (isActive && included) {
        content = grossField
          ? (
            <CalculatorGrossInput
              inputs={inputsToUse}
              field={grossField}
              id={`scenario-${scenario.id}-${fieldKey}`}
              descriptionId={`scenario-${scenario.id}-${fieldKey}-preview`}
              label={`${scenario.title}: ${accessibleLabel}`}
              onChange={(amount) => updateDraftGrossInput(grossField, amount)}
              onValidityChange={trackValidity(`scenario-${scenario.id}-${fieldKey}`)}
            />
          )
          : (
            <ScenarioParameterInput
              id={`scenario-${scenario.id}-${fieldKey}`}
              label={accessibleLabel}
              scope={`Saved scenario ${scenario.title}`}
              field={fieldKey}
              onValidityChange={trackValidity(`scenario-${scenario.id}-${fieldKey}`)}
              value={rawVal}
              options={options}
            />
          );
      }

      cells.push(
        <td
          key={scenario.id}
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            background: isActive ? "var(--color-primary-bg)" : "transparent",
          }}
        >
          {content}
          {included && liveIsGross && <div><small>{salaryUnit(viewMode)}</small></div>}
          {included && grossData && (
            <GrossPeriodPreview
              id={`scenario-${scenario.id}-${fieldKey}-preview`}
              inputMode={viewMode}
              annualGross={fieldKey === "grossIncome" ? grossData.person1.grossYearly : grossData.partner?.grossYearly}
              lastValid={isActive && hasInvalidSaved(scenario.id)}
            />
          )}
        </td>,
      );
    });

    return (
      <tr class="comparison-row" key={fieldKey}>
        <td
          style={{
            padding: "8px 12px",
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
          {(fieldKey === "taxBracket" || fieldKey === "partnerTaxBracket") && <TopicHelp id="tax-class" />}
          {fieldKey === "assessmentMode" && <TopicHelp id="joint-assessment" />}
          {fieldKey === "assessmentMode" && (
            <small className="comparison-field-hint">
              <LawRefLink
                lawId={LawId.EStG_26}
                groupId={LawGroupId.EStG_TaxSplitting}
                label="Rules"
                title="Joint assessment: eligible spouses or registered partners (§ 26 EStG)"
              />
            </small>
          )}
          {fieldKey === "taxBracket" && (
            <small className="comparison-field-hint">
              <LawRefLink
                lawId={CALCULATOR_PARTNER_SHORTCUT.lawId}
                groupId={LawGroupId.EStG_PayrollWithholding}
                label="Class rules"
                title={`${CALCULATOR_PARTNER_SHORTCUT.classes.join("/")} enable partner (§ 38b EStG)`}
              />
            </small>
          )}
        </td>
        {cells}
      </tr>
    );
  };

  return (
    <section
      className={`comparison-shell${showSavedComparison.value ? " comparison-show-saved" : ""}`}
      aria-label="Net pay workspace and scenario comparison"
    >
      <div className="comparison-toolbar">
        <div className="comparison-whatif-bar" role="group" aria-label="Quick what-if scenario comparators">
          <span className="comparison-whatif-bar__label">What if:</span>
          {whatIfScenarios.map((spec) => (
            <button
              key={spec.kind}
              type="button"
              className="ui-btn ui-btn--sm"
              disabled={hasInvalidLive}
              title={hasInvalidLive ? "Check inputs before adding a comparison" : spec.description}
              onClick={() => {
                saveWhatIfScenario(spec.kind);
              }}
            >
              {spec.buttonLabel}
            </button>
          ))}
          <button
            type="button"
            className="ui-btn ui-btn--sm ui-btn--tint"
            disabled={hasInvalidLive}
            onClick={handleAddScenario}
          >
            <SaveConfigurationIcon size={15} />
            <span>+ Save snapshot</span>
          </button>
          <span className="comparison-whatif-bar__spacer" aria-hidden="true" />
          {savedScenarios.value.length > 0 && (
            <span className="badge-neutral">{savedScenarios.value.length} saved</span>
          )}
          <a href={calculatorPath(AppId.ParentalLeave)} className="ui-btn ui-btn--sm">
            Parental leave forecast
          </a>
        </div>
      </div>

      {savedScenarios.value.length > 0 && (
        <button
          type="button"
          className="comparison-mobile-toggle"
          aria-expanded={showSavedComparison.value}
          aria-controls="household-comparison-table"
          onClick={() => {
            showSavedComparison.value = !showSavedComparison.value;
          }}
        >
          {showSavedComparison.value
            ? "Show live inputs only"
            : `Compare saved scenarios (${savedScenarios.value.length})`}
        </button>
      )}

      {pendingScenarioDeletion.value && (
        <div className="comparison-empty" role="status">
          <p>Deleted “{pendingScenarioDeletion.value.scenario.title}”.</p>
          <button type="button" className="ui-btn" onClick={undoScenarioDeletion}>Undo deletion</button>
        </div>
      )}

      <div className="ui-card comparison-table-card">
        <div className="comparison-scroll" style={{ overflowX: "auto" }}>
          <table
            id="household-comparison-table"
            className="comparison-matrix"
            aria-label="Live and saved household calculations"
            style={{
              tableLayout: "fixed",
              width: "100%",
              minWidth: `calc(var(--comparison-label-width) + ${savedScenarios.value.length + 1} * var(--comparison-value-width))`,
              borderCollapse: "separate",
              borderSpacing: 0,
              textAlign: "left",
            }}
          >
            <colgroup>
              <col className="comparison-label-column" />
              <col span={savedScenarios.value.length + 1} />
            </colgroup>
            <thead>
              <tr>
                <th
                  style={{
                    padding: "16px",
                    borderBottom: "2px solid var(--border-subtle)",
                    position: "sticky",
                    left: 0,
                    top: 0,
                    background: "var(--bg-surface)",
                    zIndex: 20,
                    borderRight: "2px solid var(--border-subtle)",
                  }}
                >
                  Field
                </th>

                <th
                  style={{
                    padding: "16px",
                    borderBottom: "2px solid var(--color-gain)",
                    background: "var(--color-gain-bg)",
                    position: "sticky",
                    top: 0,
                    zIndex: 15,
                    borderTop: "2px solid var(--color-gain)",
                  }}
                >
                  <div className="comparison-live-header">
                    <span>Live</span>
                    <div className="comparison-live-header__actions">
                      <button
                        type="button"
                        onClick={handleAddScenario}
                        disabled={hasInvalidLive}
                        aria-label="Save scenario"
                        className="comparison-save-scenario"
                        title={hasInvalidLive ? "Check inputs before saving" : "Save current estimate"}
                      >
                        <SaveConfigurationIcon />
                      </button>
                      <LiveColumnImport
                        onImported={() => {
                          liveImportRevision.value += 1;
                          invalidInputs.value = Object.fromEntries(
                            Object.entries(invalidInputs.peek()).filter(([id]) => !id.startsWith("live-")),
                          );
                        }}
                      />
                    </div>
                    {hasInvalidLive && (
                      <small className="comparison-live-header__status" role="status">
                        Showing last valid inputs
                      </small>
                    )}
                  </div>
                </th>

                {savedScenarios.value.map((scenario, index) => {
                  const isActive = activeScenarioId.value === scenario.id;

                  return (
                    <th
                      key={scenario.id}
                      style={{
                        padding: "16px",
                        borderBottom: `2px solid ${isActive ? "var(--color-primary)" : "var(--border-subtle)"}`,
                        position: "sticky",
                        top: 0,
                        background: isActive ? "var(--color-primary-bg)" : "var(--bg-surface)",
                        zIndex: 15,
                        borderTop: isActive ? "2px solid var(--color-primary)" : "none",
                      }}
                    >
                      <div style={{ display: "flex",
                        flexDirection: "column",
                        gap: "10px" }}>
                        <div style={{ display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          gap: "8px" }}>
                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              value={isActive && scenarioDraft.value ? scenarioDraft.value.title : scenario.title}
                              onInput={(e) => {
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
                                color: isActive ? "var(--color-primary)" : "var(--text-primary)",
                                fontSize: "1.05rem",
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
                            {(isActive || scenario.description) && (
                              <input
                                type="text"
                                value={isActive && scenarioDraft.value ? scenarioDraft.value.description : scenario.description}
                                placeholder={isActive ? "Note" : ""}
                                onInput={(e) => {
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
                                title={isActive ? "Edit description" : scenario.description}
                              />
                            )}
                          </div>

                          <div style={{ display: "flex",
                            gap: "4px" }}>
                            {!isActive && (
                              <>
                                <button
                                  type="button"
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
                                  }}
                                  title="Load into Live Calculator"
                                >
                                  <ExportDataIcon />
                                </button>
                                <button
                                  type="button"
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
                                  }}
                                  title="Edit Scenario"
                                >
                                  <EditSettingsIcon />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
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
                              }}
                              title="Delete Scenario"
                            >
                              <RemoveItemIcon />
                            </button>
                          </div>
                        </div>

                        {isActive && hasUnsavedScenarioChanges.value && <small role="status">Unsaved changes</small>}
                        {isActive && (
                          <div style={{ display: "flex",
                            gap: "5px" }}>
                            <button
                              type="button"
                              aria-label={`${scenario.title}: Save changes`}
                              onClick={saveDraft}
                              disabled={hasInvalidSaved(scenario.id) || !hasUnsavedScenarioChanges.value}
                              style={{
                                background: "var(--color-primary)",
                                color: "var(--text-inverse)",
                                border: "none",
                                padding: "6px 8px",
                                borderRadius: "4px",
                                fontWeight: "bold",
                                cursor: "pointer",
                                width: "44px",
                                minHeight: "44px",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title={hasInvalidSaved(scenario.id) ? "Complete or correct scenario inputs before saving" : "Save changes to scenario"}
                            >
                              <SaveConfigurationIcon />
                            </button>
                            <button
                              type="button"
                              aria-label={`${scenario.title}: Cancel editing`}
                              onClick={cancelEdit}
                              style={{
                                background: "transparent",
                                color: "var(--text-secondary)",
                                border: "1px solid var(--border-subtle)",
                                padding: "6px 8px",
                                borderRadius: "4px",
                                fontWeight: "bold",
                                cursor: "pointer",
                                width: "44px",
                                minHeight: "44px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="Cancel editing"
                            >
                              <DismissIcon />
                            </button>
                          </div>
                        )}
                      </div>
                      <SavedColumnTools
                        scenario={scenario}
                        first={index === 0}
                        last={index === savedScenarios.value.length - 1}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody aria-label="Headline net pay summary">
              {renderHeadlineNetRow()}
              {renderHouseholdNetDeltaRow()}
            </tbody>

            <tbody aria-label="Inputs">
              {renderSectionRow("Inputs", true)}
              {renderInputRow(
                "Tax Year",
                "taxYear",
                savedTaxYearOptions,
                (s) => String(s.taxYear ?? DEFAULT_TAX_YEAR),
              )}

              {renderSectionRow("Person 1")}
              {renderInputRow("Gross Income", "grossIncome", null, (s) => format(s.grossIncome || 0))}
              {renderInputRow(
                "Tax Class",
                "taxBracket",
                liveClassOptions,
                (s) => liveClassOptions.find((option) => option.value === String(s.taxBracket))?.label ?? "-",
              )}
              {renderInputRow("Federal State", "state", liveStateOptions, (s) => s.state || "-")}
              {renderInputRow("Church Tax", "hasChurchTax", null, (s) => (s.hasChurchTax ? "Yes" : "No"))}
              {renderInputRow("Children", "children", null, (s) => s.children ?? "-")}
              {renderInputRow("Working Months", "workingMonths", null, (s) => (s.workingMonths ? `${s.workingMonths} Months` : "-"))}
              {renderInputRow("Salaries / Year", "salariesPerYear", null, (s) => (s.salariesPerYear ? `${s.salariesPerYear} Salaries` : "-"))}

              {renderSectionRow("Household & Partner")}
              {renderInputRow(
                "Relationship",
                "relationshipStatus",
                relationshipOptions,
                (inputs) => relationshipOptions.find((option) => option.value === (inputs.relationshipStatus ?? HouseholdRelationship.Unspecified))?.label ?? "Select…",
              )}
              {renderInputRow("Partner 2 payroll", "hasPartner", null, (inputs) => (inputs.hasPartner ? "Yes" : "No"))}
              {showAssessmentRow && renderInputRow(
                "Assessment",
                "assessmentMode",
                assessmentOptions,
                (inputs) => assessmentOptions.find((option) => option.value === (inputs.assessmentMode ?? TaxAssessment.Unspecified))?.label ?? "Auto",
              )}
              {hasAnyPartner && ([
                {
                  field: "partnerGrossIncome",
                  label: "Partner Gross Income",
                  options: null,
                },
                {
                  field: "partnerTaxBracket",
                  label: "Partner Tax Class",
                  options: liveClassOptions,
                },
                {
                  field: "partnerState",
                  label: "Partner Federal State",
                  options: liveStateOptions,
                },
                {
                  field: "partnerHasChurchTax",
                  label: "Partner Church Tax",
                  options: null,
                },
                {
                  field: "partnerWorkingMonths",
                  label: "Partner Working Months",
                  options: null,
                },
                {
                  field: "partnerSalariesPerYear",
                  label: "Partner Salaries / Year",
                  options: null,
                },
              ] as const).map(({ field, label, options }) => renderInputRow(label, field, options, (inputs) => {
                const value = inputs[field];
                return value === undefined
                  ? "—"
                  : typeof value === "boolean"
                    ? value ? "Yes" : "No"
                    : options?.find((option) => option.value === String(value))?.label ?? value;
              }))}

              {renderDetailRow("Payroll settings", (data, _id, live) => live
                ? <LiveCalculatorSettings onValidityChange={(id, valid) => trackValidity(`live-${id}`)(valid)} />
                : (
                  <LawRefLink
                    lawId={LawId.BMF_PAP}
                    groupId={LawGroupId.EStG_PayrollWithholding}
                    label={`${data.annualTaxableIncome.rules.calendarYear} payroll profile`}
                  />
                ))}
            </tbody>

            <tbody aria-label="Detailed deduction breakdown">
              {renderSectionRow("Detailed Breakdown", true)}
              {renderSectionRow("Household")}
              {renderRow(isMonthly ? "Household Avg Gross" : "Household Gross", null, "grossYearly", true, true)}
              {renderRow(isMonthly ? "Household Avg Net" : "Household Net Pay", null, "netIncome", true, true)}
              {renderAverageMonthlyNetRow(null, true)}
              {renderPerPaycheckRow(null, true)}
              {renderRow(isMonthly ? "Household Avg Deductions" : "Total Deductions", null, "totalDeductions", true)}

              {renderSectionRow("Person 1")}
              {renderRow(isMonthly ? "Avg Gross" : "Gross Income", "person1", "grossYearly", false, true)}
              {renderRow(isMonthly ? "Avg Net" : "Net Take-Home Pay", "person1", "netIncome", false, true)}
              {renderAverageMonthlyNetRow("person1", false)}
              {renderPerPaycheckRow("person1", false)}
              {renderRow(isMonthly ? "Avg Wage Tax" : "Wage Tax (Lohnsteuer)", "person1", "tax")}
              {renderRow(isMonthly ? "Avg Health Care" : "Health Insurance", "person1", "healthCare")}
              {renderRow(isMonthly ? "Avg Pension" : "Pension Insurance", "person1", "pension")}

              {hasAnyPartner && (
                <>
                  {renderSectionRow("Partner")}
                  {renderRow(isMonthly ? "Avg Gross" : "Gross Income", "partner", "grossYearly", false, true)}
                  {renderRow(isMonthly ? "Avg Net" : "Net Take-Home Pay", "partner", "netIncome", false, true)}
                  {renderAverageMonthlyNetRow("partner", false)}
                  {renderPerPaycheckRow("partner", false)}
                  {renderRow(isMonthly ? "Avg Wage Tax" : "Wage Tax (Lohnsteuer)", "partner", "tax")}
                </>
              )}
              {renderDetailRow("Annual taxable income", (data, id, _live, context) => <TaxableIncomeSummary data={data} id={id} context={context} />)}
              {renderDetailRow("Breakdown", (data, id, _live, context) => <CalculationSummary data={data} id={id} context={context} />)}
              {renderDetailRow("Payroll sources", (data, id, _live, context) => <PayrollEvidenceSummary data={data} id={id} context={context} />)}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
