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
  SavedColumnTools,
} from "#components/CalculatorColumnTools";
import "./ComparisonTable.css";
import ScenarioParameterInput from "#components/ScenarioParameterInput";
import {
  TaxableIncomeSummary,
  CalculationSummary,
  PayrollEvidenceSummary,
} from "#components/CalculatorResultSummaries";
import GrossPeriodPreview from "#components/GrossPeriodPreview";
import germanStates from "../data/germanStates.json" with { type: "json" };
import {
  TaxClass,
  SalaryPeriod,
} from "#engine/types";
import type {
  JSX,
} from "preact";
import {
  useState,
  useEffect,
} from "preact/hooks";
import {
  type HouseholdScenarioData,
  type CalculatorInputs,
  type PersonDeductions,
  getCurrentInputs,
  CALCULATOR_PARTNER_SHORTCUT,
  calculatorViewPeriod,
  calculatorInvalidInputs,
  updateDraftGrossInput,
  hasPartner,
  deductions,
  savedScenarios,
  calculateScenarioData,
  activeScenarioId,
  scenarioDraft,
  hasUnsavedScenarioChanges,
  saveScenario,
  saveWhatIfScenario,
  deleteScenario,
  pendingScenarioDeletion,
  undoScenarioDeletion,
  loadScenario,
  editScenario,
  saveDraft,
  updateScenarioMetaData,
  cancelEdit,
} from "#store/calculatorStore";
import {
  ExportDataIcon,
  RemoveItemIcon,
  SaveConfigurationIcon,
  EditSettingsIcon,
  DismissIcon,
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
 * Side-by-side comparison of saved scenarios against the live calculation above.
 * Keeps live input entry isolated in `NetPayWorkspace` while retaining full saved-draft editing.
 */
export function ComparisonTableContent(): JSX.Element {
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

  const renderWhatIfActions = (showSnapshotButton = true): JSX.Element => (
    <div className="comparison-whatif-bar" role="group" aria-label="Quick what-if scenario comparators">
      <span className="comparison-whatif-bar__label">What if:</span>
      {whatIfScenarios.map((spec) => (
        <button
          key={spec.kind}
          type="button"
          className="ui-btn"
          disabled={hasInvalidLive}
          title={hasInvalidLive ? "Check inputs before adding a comparison" : spec.description}
          onClick={() => {
            saveWhatIfScenario(spec.kind);
          }}
        >
          {spec.buttonLabel}
        </button>
      ))}
      {showSnapshotButton && (
        <button
          type="button"
          className="ui-btn ui-btn--tint"
          disabled={hasInvalidLive}
          onClick={handleAddScenario}
        >
          <SaveConfigurationIcon size={16} />
          <span>Save snapshot</span>
        </button>
      )}
      <span className="comparison-whatif-bar__spacer" aria-hidden="true" />
      <a href={calculatorPath(AppId.ParentalLeave)} className="ui-btn">
        Plan parental leave forecast
      </a>
    </div>
  );

  if (savedScenarios.value.length === 0) {
    return (
      <section className="comparison-shell" aria-label="Saved scenario comparison">
        {pendingScenarioDeletion.value && (
          <div className="comparison-empty" role="status">
            <p>Deleted “{pendingScenarioDeletion.value.scenario.title}”.</p>
            <button type="button" className="ui-btn" onClick={undoScenarioDeletion}>
              Undo deletion
            </button>
          </div>
        )}
        <div className="ui-card comparison-empty-card">
          <div>
            <h2 className="ui-card__title">What-If &amp; Saved Scenario Comparison</h2>
            <p className="ui-card__subtitle">
              Test a raise, partner tax splitting, or an additional child using the same payroll &amp; tax math, or save a snapshot to edit side by side.
            </p>
          </div>
          {renderWhatIfActions(true)}
        </div>
      </section>
    );
  }

  const renderDetailRow = (label: string, render: (data: HouseholdScenarioData, id: string, live: boolean, context: string) => JSX.Element): JSX.Element => (
    <tr className="comparison-detail-row">
      <th scope="row">{label}</th>
      <td className="comparison-detail-cell" aria-label={`Live calculation: ${label}`}>
        {hasInvalidLive && <p role="status">Last valid inputs</p>}
        {render(deductions.value, "live-comparison", true, "Live Calculation")}
      </td>
      {savedScenarios.value.map((scenario) => {
        const data = activeScenarioId.value === scenario.id && scenarioDraft.value
          ? scenarioDraft.value.data : calculateScenarioData(scenario.inputs);
        return <td key={scenario.id} className="comparison-detail-cell" aria-label={`${scenario.title}: ${label}`}>
          {hasInvalidSaved(scenario.id) && <p role="status">Last valid inputs</p>}
          {render(data, `scenario-${scenario.id}`, false, `${scenario.title}${activeScenarioId.value === scenario.id ? " (draft)" : ""}`)}
        </td>;
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

  const renderSectionRow = (label: string, major = false): JSX.Element => (
    <tr className="comparison-section-row">
      <th scope="row" className={major ? "comparison-section-heading" : "comparison-subsection-heading"}>{label}</th>
      <td className={major ? "comparison-section-heading" : "comparison-subsection-heading"} colSpan={savedScenarios.value.length + 1} aria-hidden="true" />
    </tr>
  );

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

  const renderScenarioComparisonRow = (
    label: string,
    fieldKey: keyof CalculatorInputs,
    options: { value: string;
      label: string }[] | null,
    formatFn: (inputs: Partial<CalculatorInputs>) => string | number,
  ): JSX.Element => {
    const partnerField = fieldKey.startsWith("partner");
    const optionalField = partnerField || fieldKey === "assessmentMode";
    const accessibleLabel = partnerField ? `Partner ${label.toLowerCase()}` : label;

    const liveGrossField = fieldKey === CalculatorGrossField.Primary
      ? CalculatorGrossField.Primary
      : fieldKey === CalculatorGrossField.Partner
        ? CalculatorGrossField.Partner
        : undefined;
    const liveIncluded = !optionalField || liveInputs.hasPartner;
    const liveGrossValue = liveGrossField && liveIncluded
      ? grossInputForPeriod(liveInputs, liveGrossField, calculatorViewPeriod.value)
      : undefined;
    const liveDisplay = !liveIncluded
      ? "—"
      : liveGrossField
        ? liveGrossValue === undefined ? "Unset" : format(liveGrossValue)
        : formatFn(liveInputs);

    const cells: JSX.Element[] = [
      <td
        key="current"
        class="tabular-nums"
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--color-gain-bg)",
          color: "var(--text-primary)",
          fontSize: "0.9rem",
        }}
      >
        {liveDisplay}
      </td>,
    ];

    savedScenarios.value.forEach((scenario) => {
      const isActive = activeScenarioId.value === scenario.id;
      const inputsToUse =
        isActive && scenarioDraft.value
          ? scenarioDraft.value.inputs
          : scenario.inputs || {};
      const rawVal = fieldKey === "assessmentMode" ? inputsToUse.assessmentMode ?? TaxAssessment.Unspecified : inputsToUse[fieldKey];
      const grossField = fieldKey === CalculatorGrossField.Primary ? CalculatorGrossField.Primary : fieldKey === CalculatorGrossField.Partner ? CalculatorGrossField.Partner : undefined;
      const included = !optionalField || inputsToUse.hasPartner;
      const grossValue = grossField && included ? grossInputForPeriod(inputsToUse, grossField, calculatorViewPeriod.value) : undefined;
      const savedVal = grossField
        ? !included ? "Not included" : grossValue === undefined ? "Unset" : formatEurCents(grossValue)
        : formatFn(inputsToUse);
      const grossData = fieldKey === "grossIncome" || fieldKey === "partnerGrossIncome"
        ? isActive && scenarioDraft.value ? scenarioDraft.value.data : calculateScenarioData(scenario.inputs)
        : undefined;

      let content: JSX.Element | string | number = included ? savedVal : "—";
      if (isActive && included) {
        content = grossField
          ? <CalculatorGrossInput
            inputs={inputsToUse}
            field={grossField}
            id={`scenario-${scenario.id}-${fieldKey}`}
            descriptionId={`scenario-${scenario.id}-${fieldKey}-preview`}
            label={`${scenario.title}: ${accessibleLabel}`}
            onChange={(amount) => updateDraftGrossInput(grossField, amount)}
            onValidityChange={trackValidity(`scenario-${scenario.id}-${fieldKey}`)}
          />
          : <ScenarioParameterInput
            id={`scenario-${scenario.id}-${fieldKey}`}
            label={accessibleLabel}
            scope={`Saved scenario ${scenario.title}`}
            field={fieldKey}
            onValidityChange={trackValidity(`scenario-${scenario.id}-${fieldKey}`)}
            value={rawVal}
            options={options}
          />;
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
          {included && (fieldKey === "grossIncome" || fieldKey === "partnerGrossIncome") && <div><small>{salaryUnit(viewMode)}</small></div>}
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

  return (
    <section className="comparison-shell" aria-label="Saved scenario comparison">
      <div className="comparison-section-bar">
        <div>
          <h2 className="ui-card__title">What-If &amp; Saved Scenario Comparison</h2>
          <p className="ui-card__subtitle">Compare your active estimate on the left against quick life-event scenarios or custom snapshots.</p>
        </div>
        <span className="badge-neutral">{savedScenarios.value.length} saved</span>
      </div>

      <div style={{ marginBottom: "14px" }}>
        {renderWhatIfActions(true)}
      </div>

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
                  Metric
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
                                color: "white",
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

            <tbody aria-label="Results and summaries">
              {renderSectionRow("Results", true)}
              {renderSectionRow("Household")}
              {renderRow(isMonthly ? "Household Avg Gross" : "Household Gross", null, "grossYearly", true, true)}
              {renderRow(isMonthly ? "Household Avg Net" : "Household Net Pay", null, "netIncome", true, true)}
              {renderHouseholdNetDeltaRow()}
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

            <tbody aria-label="Inputs summary and saved scenario editing">
              {renderSectionRow("Assumptions & Inputs", true)}
              {renderSectionRow("Person 1")}
              {renderScenarioComparisonRow("Gross Income", "grossIncome", null, (s) => format(s.grossIncome || 0))}
              {renderScenarioComparisonRow("Federal State", "state", liveStateOptions, (s) => s.state || "-")}
              {renderScenarioComparisonRow("Tax Class", "taxBracket", taxBracketOptions, (s) => (s.taxBracket ? `Class ${s.taxBracket}` : "-"))}
              {renderScenarioComparisonRow("Church Tax", "hasChurchTax", null, (s) => (s.hasChurchTax ? "Yes" : "No"))}
              {renderScenarioComparisonRow("Children", "children", null, (s) => s.children ?? "-")}
              {renderScenarioComparisonRow("Working Months", "workingMonths", null, (s) => (s.workingMonths ? `${s.workingMonths} Months` : "-"))}
              {renderScenarioComparisonRow("Salaries / Year", "salariesPerYear", null, (s) => (s.salariesPerYear ? `${s.salariesPerYear} Salaries` : "-"))}
              {renderScenarioComparisonRow(
                "Relationship",
                "relationshipStatus",
                relationshipOptions,
                (inputs) => relationshipOptions.find((option) => option.value === (inputs.relationshipStatus ?? HouseholdRelationship.Unspecified))?.label ?? "Select…",
              )}
              {renderScenarioComparisonRow("Partner 2 payroll", "hasPartner", null, (inputs) => (inputs.hasPartner ? "Yes" : "No"))}
              {showAssessmentRow && renderScenarioComparisonRow(
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
                  field: "partnerState",
                  label: "Partner Federal State",
                  options: liveStateOptions,
                },
                {
                  field: "partnerTaxBracket",
                  label: "Partner Tax Class",
                  options: liveClassOptions,
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
              ] as const).map(({ field, label, options }) => renderScenarioComparisonRow(label, field, options, (inputs) => {
                const value = inputs[field];
                return value === undefined
                  ? "—"
                  : typeof value === "boolean"
                    ? value ? "Yes" : "No"
                    : options?.find((option) => option.value === String(value))?.label ?? value;
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
