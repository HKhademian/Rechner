import {
  formatEur,
} from "#utils/currencyFormat";
import "./SandboxControls.css";
import SalaryChangeEditor from "./SalaryChangeEditor";
import HouseholdIncomeInputs from "#components/HouseholdIncomeInputs";
import PayrollPersonalInputs from "#components/PayrollPersonalInputs";
import LawRefLink from "#components/laws/LawRefLink";
import {
  NumberField,
} from "#components/ui/NumberField";
import {
  SegmentedControl,
} from "#components/ui/SegmentedControl";
import {
  ToggleSwitch,
} from "#components/ui/ToggleSwitch";
import {
  LawId,
} from "#engine/laws/types";
import type {
  JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  salaryPeriod,
  assumeManualNetIsAssessmentNet,
  householdTaxableIncome,
  husbandGross,
  husbandPayrollOptions,
  wifePayrollOptions,
  wifeGross,
  husbandGrossYearly,
  wifeGrossYearly,
  setHusbandGross,
  setWifeGross,
  setHusbandGrossYearly,
  setWifeGrossYearly,
  setHusbandHours,
  setWifeInitialHours,
  setWifePostBirthHours,
  husbandInitialTaxClass,
  wifeInitialTaxClass,
  useInitialTaxFactor,
  setInitialTaxClasses,
  annualBonusGross,
  annualBonusMonth,
  investmentReturnMonthly,
  setAnnualBonusGross,
  setAnnualBonusMonth,
  setInvestmentReturnMonthly,
  setSalaryPeriod,
  derivedSpousalSet,
  husbandHours,
  husbandSalariesCount,
  husbandBonusPreset,
  setHusbandSalariesCount,
  setHusbandBonusPreset,
  wifeClass5PartTimeNet,
  wifeClass3PartTimeNet,
  wifeInitialHours,
  wifePostBirthHours,
  wifeSalariesCount,
  wifeBonusPreset,
  setWifeSalariesCount,
  setWifeBonusPreset,
  kindergeldPerChild,
  existingChildrenCount,
  setExistingChildrenCount,
  childcarePlan,
  updateChildcarePlan,
  indexFutureTaxBrackets,
  setIndexFutureTaxBrackets,
  startCalendarYear,
  startCalendarMonth,
  simulationDurationMonths,
  prePregnancyPlanningMonths,
  child1BirthMonth,
  birthSpacingMonths,
  setPregnancy1PositiveDate,
  customPregnancies,
  customTaxClassSwitches,
  customSalaryRaises,
  customWorkingHoursChanges,
  customFinancialEvents,
  addPregnancyAction,
  updatePregnancyAction,
  removePregnancyAction,
  removeAllPregnancyActions,
  addTaxClassSwitchAction,
  updateTaxClassSwitchAction,
  removeTaxClassSwitchAction,
  removeAllTaxClassSwitchActions,
  addSalaryRaiseAction,
  addWorkingHoursChangeAction,
  updateWorkingHoursChangeAction,
  removeWorkingHoursChangeAction,
  addFinancialEventAction,
  removeFinancialEventAction,
  removeAllCustomActions,
  resetToDefaults,
  resetToEmptyScenario,
  importSimulationState,
  openExportImportModal,
  LEGAL_RULE_LAW_MAP,
  LegalRuleKey,
  activeLegalRuleKey,
} from "#store/elterngeldStore";
import {
  activeStatutoryContext,
  modifyParameterValue,
} from "#store/parameterStore";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  getAllMunicipalDaycarePresets,
} from "#engine/benefits/childcare";

import {
  type MonthId,
  type MonthRef,
  type MonthSimRef,
  type CalendarLabel,
  FederalStateKitaPresetId,
  TaxClass,
  TargetPerson,
  FinancialEventCategory,
  SalaryPeriod,
  AnnualSalariesCount,
  BonusDistributionPreset,
  toFederalStateKitaPresetId,
  toWorkingHours,
  toSimulationMonth,
  toCalendarMonth,
  toEuroAmount,
  toNetSalary,
  toFullCalendarYear,
  toMonthDuration,
  toChildIndex,
  toPercentageRate,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  toHoursChangeId,
  toFinancialEventId,
  toMonthId,
  toMonthRef,
  toMonthSimRef,
  toCalendarLabel,
} from "#engine/types";
import {
  getDefaultPersistedState,
  validateAndSanitizePersistedState,
} from "#engine/storage/persistence";
import {
  BUILTIN_SCENARIO_CATALOG,
} from "#data/scenarios/scenarioRegistry";

import {
  SimulationPeriodIcon,
  ChildBirthMilestoneIcon,
  EmploymentCompensationIcon,
  TaxClassSwapMilestoneIcon,
  FinancialInflowIcon,
  AddActionIcon,
  RemoveItemIcon,
  DeleteActionIcon,
  EligibilityConfirmedIcon,
  StatutoryLimitationWarningIcon,
  StatutorySectionIcon,
  ExpandSectionIcon,
  CollapseSectionIcon,
  SimulatorNavigationIcon,
  ResetDefaultsIcon,
  InformationalNoticeIcon,
  ImportDataIcon,
  DownloadFileIcon,
} from "#components/Icons";

function formatCurrency(amount: number): string {
  return formatEur(amount || 0);
}

function formatWorkingTime(hours: number): string {
  const h = Math.max(0, hours || 0);
  const days = (h / 8).toFixed(1).replace(/\.0$/, "");
  const fte = Math.round((h / 40) * 100);
  return `${h} h/week (${days} d/wk · ${fte}% FTE)`;
}

const MONTH_NAMES = [
  "01 - January (Januar)",
  "02 - February (Februar)",
  "03 - March (März)",
  "04 - April (April)",
  "05 - May (Mai)",
  "06 - June (Juni)",
  "07 - July (Juli)",
  "08 - August (August)",
  "09 - September (September)",
  "10 - October (Oktober)",
  "11 - November (November)",
  "12 - December (Dezember)",
];

export default function SandboxControls(): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [showDeductionsBreakdown, setShowDeductionsBreakdown] =
    useState<boolean>(false);

  // Helper to compute calendar date for simulation month offset (e.g. 09.2026)
  const getCalDate = (simMonth: number): CalendarLabel => {
    const totalElapsed = startCalendarMonth.value - 1 + (simMonth - 1);
    const m = (totalElapsed % 12) + 1;
    const y = startCalendarYear.value + Math.floor(totalElapsed / 12);
    return toCalendarLabel(m, y);
  };

  // Helper to compute statutory absolute MonthId (e.g. M09.2027)
  const getMonthId = (simMonth: number): MonthId => {
    const totalElapsed = startCalendarMonth.value - 1 + (simMonth - 1);
    const m = (totalElapsed % 12) + 1;
    const y = startCalendarYear.value + Math.floor(totalElapsed / 12);
    return toMonthId(m, y);
  };

  // Helper to compute simulation start-relative reference (e.g. Sim1, Sim21, Sim60)
  const getMonthSimRef = (simMonth: number): MonthSimRef => {
    return toMonthSimRef(simMonth);
  };

  // Helper to compute pregnancy-relative month label (e.g. M-8, M1 (Pregnancy Positive), M9 (Birth 1), ..., Birth N)
  const getRelativeMonthLabel = (simMonth: number): MonthRef => {
    if (customPregnancies.value.length === 0) {
      return toMonthRef(simMonth);
    }
    const ordered = [...customPregnancies.value].sort(
      (a, b) => a.calculatedDeliverySimulationMonth - b.calculatedDeliverySimulationMonth,
    );
    const first = ordered[0];
    const p1 =
      first?.positiveTestSimulationMonth ??
      Math.max(
        1,
        (first?.calculatedDeliverySimulationMonth ?? 12) - 8,
      );

    if (simMonth < p1) {
      return toMonthRef(simMonth - p1);
    }
    const idx = simMonth - p1 + 1;
    if (simMonth === p1) {
      return toMonthRef(idx, "Pregnancy Positive");
    }
    const delivered = ordered.find(
      (preg) => preg.calculatedDeliverySimulationMonth === simMonth,
    );
    if (delivered) {
      return toMonthRef(idx, `Birth ${delivered.childIndex}`);
    }
    return toMonthRef(idx);
  };

  // Helper for short relative month label (e.g. M-8, M1, M9, M12)
  const getShortMonthLabel = (simMonth: number): MonthRef => {
    if (customPregnancies.value.length === 0) {
      return toMonthRef(simMonth);
    }
    const p1 =
      customPregnancies.value[0]?.positiveTestSimulationMonth ??
      Math.max(
        1,
        (customPregnancies.value[0]?.calculatedDeliverySimulationMonth ?? 12) -
          8,
      );
    if (simMonth < p1) {
      return toMonthRef(simMonth - p1);
    }
    return toMonthRef(simMonth - p1 + 1);
  };

  // Preset Handlers
  const applyPreset = (presetKey: string): void => {
    if (presetKey === "empty") {
      resetToEmptyScenario();
      return;
    }
    const item = BUILTIN_SCENARIO_CATALOG.find((sc) => sc.id === presetKey);
    if (item) {
      importSimulationState(validateAndSanitizePersistedState(item.data));
      return;
    }
    resetToDefaults();
  };

  const endSimMonth = simulationDurationMonths.value;

  return (
    <div
      className="ui-card"
      style={{ marginBottom: "28px" }}
    >
      <div className="planner-input-header" id="planner-inputs">
        <div>
          <h3>
            <button
              type="button"
              className="planner-input-toggle"
              aria-expanded={isOpen}
              aria-controls={isOpen ? "planner-input-fields" : undefined}
              onClick={() => setIsOpen((open) => !open)}
            >
              <span>Your plan inputs</span>
              <span className="planner-input-toggle__state">
                {isOpen ? "Hide inputs" : "Show inputs"}
                {isOpen ? <CollapseSectionIcon size={16} /> : <ExpandSectionIcon size={16} />}
              </span>
            </button>
          </h3>
          <p>Edit your household, planned births, tax choices and working hours.</p>
          <a className="planner-results-link" href="#scenario-heading">Jump to results ↓</a>
        </div>
      </div>

      {isOpen && (
        <div
          id="planner-input-fields"
          style={{
            marginTop: "20px",
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "18px",
          }}
        >
          {/* Quick Presets & Reset Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "20px",
              background: "var(--bg-surface-secondary)",
              padding: "10px 14px",
              borderRadius: "var(--border-radius-sm)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <details className="planner-examples">
              <summary>Example plans</summary>
              <p>Loading an example replaces your current plan.</p>
              <div className="planner-examples__list">
                {BUILTIN_SCENARIO_CATALOG.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="ui-btn ui-btn--sm"
                    onClick={() => applyPreset(preset.id)}
                    title={preset.description}
                  >
                    {preset.id === "empty" ? "Empty plan" : preset.name}
                  </button>
                ))}
              </div>
            </details>

            <details className="planner-examples">
              <summary>Plan tools</summary>
              <div className="planner-examples__list">
                <button
                  type="button"
                  className="ui-btn ui-btn--sm ui-btn--tint"
                  onClick={() => openExportImportModal("export")}
                  id="export-data-btn"
                >
                  <DownloadFileIcon size={13} />
                  Export Data
                </button>

                <button
                  type="button"
                  className="ui-btn ui-btn--sm"
                  onClick={() => openExportImportModal("import")}
                  id="import-data-btn"
                >
                  <ImportDataIcon size={13} />
                  Import Data
                </button>

                <button
                  type="button"
                  className="ui-btn ui-btn--sm"
                  onClick={resetToDefaults}
                >
                  <ResetDefaultsIcon size={13} />
                  Reset to Defaults
                </button>

                <button
                  type="button"
                  className="ui-btn ui-btn--sm ui-btn--danger"
                  onClick={removeAllCustomActions}
                  title="Remove all planned events"
                >
                  <DeleteActionIcon size={13} />
                  Clear All Actions
                </button>
              </div>
            </details>
          </div>

          {/* Discrete Batches: Full-Width Rows Layout with Auto-Wrapping Column Entries */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* ======================================================== */}
            {/* BATCH 1: PREGNANCY POSITIVE DECISIONS & MILESTONES */}
            {/* ======================================================== */}
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "16px 18px",
                borderRadius: "var(--border-radius)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "10px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "0.92rem",
                      color: "var(--color-primary)",
                    }}
                  >
                    1. Pregnancies &amp; births
                  </span>
                  <span className="badge-brand">
                    {customPregnancies.value.length} planned
                  </span>
                  {customPregnancies.value.length > 0 && (
                    <button
                      type="button"
                      onClick={removeAllPregnancyActions}
                      style={{
                        padding: "2px 6px",
                        background: "none",
                        border: "1px solid var(--color-loss-border)",
                        borderRadius: "3px",
                        color: "var(--color-loss)",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                      title="Remove all pregnancy actions"
                    >
                      <RemoveItemIcon size={10} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {/* Add Pregnancy Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    const count = customPregnancies.value.length;
                    const maxChildIdx = Math.max(
                      0,
                      ...customPregnancies.value.map((p) => p.childIndex),
                    );
                    const nextChildIdx = Math.min(10, maxChildIdx + 1);
                    const maxStart = Math.max(1, simulationDurationMonths.value - 10);
                    let newSimMonth: number;
                    if (count === 0) {
                      newSimMonth = Math.max(
                        1,
                        Math.min(
                          maxStart,
                          prePregnancyPlanningMonths.value > 0
                            ? prePregnancyPlanningMonths.value + 1
                            : 9,
                        ),
                      );
                    }
                    else {
                      const lastPreg = customPregnancies.value[count - 1];
                      const lastDeliv =
                        lastPreg.calculatedDeliverySimulationMonth;
                      newSimMonth = Math.max(
                        1,
                        Math.min(
                          maxStart,
                          lastDeliv + 19,
                        ),
                      );
                    }

                    const totalElapsed =
                      startCalendarMonth.value - 1 + (newSimMonth - 1);
                    const calMonth = toCalendarMonth((totalElapsed % 12) + 1);
                    const calYear =
                      startCalendarYear.value + Math.floor(totalElapsed / 12);

                    const defs = getDefaultPersistedState();
                    addPregnancyAction({
                      pregnancyId: toPregnancyId(`PREG-CUSTOM-${nextChildIdx}-${count + 1}`),
                      childIndex: toChildIndex(nextChildIdx),
                      positiveTestCalendarMonth: calMonth,
                      positiveTestCalendarYear: toFullCalendarYear(calYear),
                      positiveTestSimulationMonth:
                        toSimulationMonth(newSimMonth),
                      calculatedDeliverySimulationMonth: toSimulationMonth(
                        newSimMonth + 8,
                      ),
                      motherPostBirthPartTimeHours: toWorkingHours(
                        wifePostBirthHours.value ?? defs.wifePostBirthHours,
                      ),
                      motherPostBirthPartTimeClass5Net: toNetSalary(
                        wifeClass5PartTimeNet.value,
                      ),
                      motherPostBirthPartTimeClass3Net: toNetSalary(
                        wifeClass3PartTimeNet.value,
                      ),
                      fatherPartnerMonthsCount: toMonthDuration(
                        defs.customPregnancies[0]?.fatherPartnerMonthsCount ??
                          4,
                      ),
                    });
                  }}
                  style={{
                    padding: "5px 12px",
                    background: "var(--color-primary-bg)",
                    color: "var(--color-primary)",
                    border: "1px solid var(--color-primary-border)",
                    borderRadius: "var(--border-radius-sm)",
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <AddActionIcon size={12} />
                  <span>
                    Add pregnancy (child #{Math.min(10, Math.max(0, ...customPregnancies.value.map((p) => p.childIndex)) + 1)})
                  </span>
                </button>
              </div>

              {/* Dynamic Pregnancies Auto-Wrapping Columns */}
              {customPregnancies.value.length === 0 ? (
                <div
                  style={{
                    padding: "16px 20px",
                    background: "var(--bg-surface-secondary)",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px dashed var(--border-subtle)",
                    color: "var(--text-muted)",
                    fontSize: "0.78rem",
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  No pregnancies planned yet. Add a pregnancy to see its expected birth and related benefits.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(310px, 1fr))",
                    gap: "14px",
                  }}
                >
                  {customPregnancies.value.map((preg, idx) => {
                    const pSimMonth = preg.positiveTestSimulationMonth;
                    const dSimMonth = preg.calculatedDeliverySimulationMonth;
                    const isFirst = idx === 0;

                    return (
                      <div
                        key={preg.pregnancyId || `preg-${idx}`}
                        style={{
                          background: "var(--bg-surface-secondary)",
                          padding: "12px 14px",
                          borderRadius: "var(--border-radius-sm)",
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "8px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.80rem",
                                fontWeight: 800,
                                color: "var(--color-loss)",
                              }}
                            >
                              Child #{preg.childIndex} Pregnancy
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removePregnancyAction(preg.pregnancyId)
                              }
                              style={{
                                background: "var(--color-loss-bg)",
                                color: "var(--color-loss)",
                                border: "1px solid var(--color-loss-border)",
                                borderRadius: "3px",
                                padding: "2px 6px",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <RemoveItemIcon size={11} />
                              <span>Remove</span>
                            </button>
                          </div>

                          {isFirst ? (
                            <div>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: "6px",
                                  marginBottom: "8px",
                                }}
                              >
                                <div>
                                  <label
                                    style={{
                                      fontSize: "0.68rem",
                                      color: "var(--text-muted)",
                                      display: "block",
                                      marginBottom: "2px",
                                    }}
                                  >
                                    Positive test month
                                  </label>
                                  <select
                                    aria-label={`Child ${preg.childIndex}: positive test month`}
                                    value={
                                      ((startCalendarMonth.value -
                                        1 +
                                        pSimMonth -
                                        1) %
                                        12) +
                                      1
                                    }
                                    onChange={(e) => {
                                      const m = Number(
                                        (e.target as HTMLSelectElement).value,
                                      );
                                      const curY =
                                        startCalendarYear.value +
                                        Math.floor(
                                          (startCalendarMonth.value -
                                            1 +
                                            (pSimMonth - 1)) /
                                            12,
                                        );
                                      setPregnancy1PositiveDate(curY, m);
                                    }}
                                    style={{
                                      width: "100%",
                                      background: "var(--bg-surface)",
                                      color: "var(--text-primary)",
                                      border: "1px solid var(--border-subtle)",
                                      borderRadius: "4px",
                                      padding: "4px 5px",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {MONTH_NAMES.map((name, mIdx) => (
                                      <option key={mIdx + 1} value={mIdx + 1}>
                                        {name.split(" (")[0]}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label
                                    style={{
                                      fontSize: "0.68rem",
                                      color: "var(--text-muted)",
                                      display: "block",
                                      marginBottom: "2px",
                                    }}
                                  >
                                    Positive test year
                                  </label>
                                  <select
                                    aria-label={`Child ${preg.childIndex}: positive test year`}
                                    value={
                                      startCalendarYear.value +
                                      Math.floor(
                                        (startCalendarMonth.value -
                                          1 +
                                          (pSimMonth - 1)) /
                                          12,
                                      )
                                    }
                                    onChange={(e) => {
                                      const y = Number(
                                        (e.target as HTMLSelectElement).value,
                                      );
                                      const curM =
                                        ((startCalendarMonth.value -
                                          1 +
                                          pSimMonth -
                                          1) %
                                          12) +
                                        1;
                                      setPregnancy1PositiveDate(y, curM);
                                    }}
                                    style={{
                                      width: "100%",
                                      background: "var(--bg-surface)",
                                      color: "var(--text-primary)",
                                      border: "1px solid var(--border-subtle)",
                                      borderRadius: "4px",
                                      padding: "4px 5px",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {[
                                      2024, 2025, 2026, 2027, 2028, 2029, 2030,
                                      2031, 2032, 2033, 2034, 2035,
                                    ].map((y) => (
                                      <option key={y} value={y}>
                                        {y}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: "0.72rem",
                                  color: "var(--text-secondary)",
                                  marginBottom: "6px",
                                }}
                              >
                                <span>
                                  Positive:{" "}
                                  <strong
                                    style={{ color: "var(--color-loss)" }}
                                  >
                                    {getCalDate(pSimMonth)}
                                  </strong>{" "}
                                  ({getRelativeMonthLabel(pSimMonth)}) ·{" "}
                                  {getMonthId(pSimMonth)}
                                </span>
                                <span>
                                  Birth 1:{" "}
                                  <strong
                                    style={{ color: "var(--color-primary)" }}
                                  >
                                    {getCalDate(dSimMonth)}
                                  </strong>{" "}
                                  ({getRelativeMonthLabel(dSimMonth)}) ·{" "}
                                  {getMonthId(dSimMonth)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: "6px",
                                  marginBottom: "8px",
                                }}
                              >
                                <div>
                                  <label
                                    style={{
                                      fontSize: "0.68rem",
                                      color: "var(--text-muted)",
                                      display: "block",
                                      marginBottom: "2px",
                                    }}
                                  >
                                    Positive test month
                                  </label>
                                  <select
                                    aria-label={`Child ${preg.childIndex}: positive test month`}
                                    value={
                                      ((startCalendarMonth.value -
                                        1 +
                                        pSimMonth -
                                        1) %
                                        12) +
                                      1
                                    }
                                    onChange={(e) => {
                                      const m = Number(
                                        (e.target as HTMLSelectElement).value,
                                      );
                                      const curY =
                                        startCalendarYear.value +
                                        Math.floor(
                                          (startCalendarMonth.value -
                                            1 +
                                            (pSimMonth - 1)) /
                                            12,
                                        );
                                      const totalElapsed =
                                        (curY - startCalendarYear.value) * 12 +
                                        (m - startCalendarMonth.value);
                                      const newPSim = Math.max(
                                        1,
                                        totalElapsed + 1,
                                      );
                                      const newDSim = newPSim + 8;
                                      updatePregnancyAction(preg.pregnancyId, {
                                        positiveTestCalendarMonth:
                                          toCalendarMonth(m),
                                        positiveTestCalendarYear:
                                          toFullCalendarYear(curY),
                                        positiveTestSimulationMonth:
                                          toSimulationMonth(newPSim),
                                        calculatedDeliverySimulationMonth:
                                          toSimulationMonth(newDSim),
                                      });
                                    }}
                                    style={{
                                      width: "100%",
                                      background: "var(--bg-surface)",
                                      color: "var(--text-primary)",
                                      border: "1px solid var(--border-subtle)",
                                      borderRadius: "4px",
                                      padding: "4px 5px",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {MONTH_NAMES.map((name, mIdx) => (
                                      <option key={mIdx + 1} value={mIdx + 1}>
                                        {name.split(" (")[0]}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label
                                    style={{
                                      fontSize: "0.68rem",
                                      color: "var(--text-muted)",
                                      display: "block",
                                      marginBottom: "2px",
                                    }}
                                  >
                                    Positive test year
                                  </label>
                                  <select
                                    aria-label={`Child ${preg.childIndex}: positive test year`}
                                    value={
                                      startCalendarYear.value +
                                      Math.floor(
                                        (startCalendarMonth.value -
                                          1 +
                                          (pSimMonth - 1)) /
                                          12,
                                      )
                                    }
                                    onChange={(e) => {
                                      const y = Number(
                                        (e.target as HTMLSelectElement).value,
                                      );
                                      const curM =
                                        ((startCalendarMonth.value -
                                          1 +
                                          pSimMonth -
                                          1) %
                                          12) +
                                        1;
                                      const totalElapsed =
                                        (y - startCalendarYear.value) * 12 +
                                        (curM - startCalendarMonth.value);
                                      const newPSim = Math.max(
                                        1,
                                        totalElapsed + 1,
                                      );
                                      const newDSim = newPSim + 8;
                                      updatePregnancyAction(preg.pregnancyId, {
                                        positiveTestCalendarMonth:
                                          toCalendarMonth(curM),
                                        positiveTestCalendarYear:
                                          toFullCalendarYear(y),
                                        positiveTestSimulationMonth:
                                          toSimulationMonth(newPSim),
                                        calculatedDeliverySimulationMonth:
                                          toSimulationMonth(newDSim),
                                      });
                                    }}
                                    style={{
                                      width: "100%",
                                      background: "var(--bg-surface)",
                                      color: "var(--text-primary)",
                                      border: "1px solid var(--border-subtle)",
                                      borderRadius: "4px",
                                      padding: "4px 5px",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {[
                                      2024, 2025, 2026, 2027, 2028, 2029, 2030,
                                      2031, 2032, 2033, 2034, 2035,
                                    ].map((y) => (
                                      <option key={y} value={y}>
                                        {y}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: "0.72rem",
                                  color: "var(--text-secondary)",
                                  marginBottom: "6px",
                                }}
                              >
                                <span>
                                  Positive:{" "}
                                  <strong
                                    style={{ color: "var(--color-loss)" }}
                                  >
                                    {getCalDate(pSimMonth)}
                                  </strong>{" "}
                                  ({getRelativeMonthLabel(pSimMonth)}) ·{" "}
                                  {getMonthId(pSimMonth)}
                                </span>
                                <span>
                                  Birth #{preg.childIndex}:{" "}
                                  <strong
                                    style={{ color: "var(--color-primary)" }}
                                  >
                                    {getCalDate(dSimMonth)}
                                  </strong>{" "}
                                  ({getRelativeMonthLabel(dSimMonth)}) ·{" "}
                                  {getMonthId(dSimMonth)}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: "0.66rem",
                                  color:
                                    dSimMonth -
                                      (customPregnancies.value[idx - 1]
                                        ?.calculatedDeliverySimulationMonth ||
                                        0) <
                                    36
                                      ? "var(--color-gain)"
                                      : "var(--color-warning)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  marginBottom: "4px",
                                }}
                              >
                                {dSimMonth -
                                  (customPregnancies.value[idx - 1]
                                    ?.calculatedDeliverySimulationMonth || 0) <
                                36 ? (
                                    <>
                                      <EligibilityConfirmedIcon size={11} />
                                      <span>
                                        Sibling Bonus (+10%) eligible (
                                        {dSimMonth -
                                        (customPregnancies.value[idx - 1]
                                          ?.calculatedDeliverySimulationMonth ||
                                          0)}
                                        M spacing)
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <RemoveItemIcon size={11} />
                                      <span>
                                        Sibling bonus expired (
                                        {dSimMonth -
                                        (customPregnancies.value[idx - 1]
                                          ?.calculatedDeliverySimulationMonth ||
                                          0)}
                                        M spacing)
                                      </span>
                                    </>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            fontSize: "0.65rem",
                            color: "var(--text-muted)",
                            background: "var(--bg-surface)",
                            padding: "3px 6px",
                            borderRadius: "3px",
                            marginTop: "6px",
                          }}
                        >
                          {isFirst ? (
                            <>
                              ↳ Sim Start:{" "}
                              <strong>{String(startCalendarMonth.value).padStart(2, "0")}.{startCalendarYear.value}</strong> (
                              {Math.max(0, (preg.positiveTestCalendarYear - startCalendarYear.value) * 12 + preg.positiveTestCalendarMonth - startCalendarMonth.value)}M planning
                              before pregnancy)
                            </>
                          ) : (
                            <>
                              ↳ Assessment period based on prior 12-month net
                              earnings (
                              <LawRefLink lawId={LawId.BEEG_2b} />
                              ).
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* BATCH 2: TAX CLASSES & STRATEGY (§ 2b BEEG) */}
            {/* ======================================================== */}
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "16px 18px",
                borderRadius: "var(--border-radius)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "10px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <LawRefLink
                    lawId={LEGAL_RULE_LAW_MAP[LegalRuleKey.BEEG_TaxSwap].lawId}
                    groupId={LEGAL_RULE_LAW_MAP[LegalRuleKey.BEEG_TaxSwap].groupId}
                    variant="plain"
                    onOpen={() => {
                      activeLegalRuleKey.value = LegalRuleKey.BEEG_TaxSwap;
                    }}
                    style={{
                      fontWeight: 800,
                      fontSize: "0.92rem",
                      color: "var(--color-gain)",
                      textAlign: "left",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    title="§ 2b BEEG & BEEG § 2c(3) tax optimization rules — Click for quick popup · Ctrl+Click for full page"
                  >
                    <span>2. Tax classes</span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        textDecoration: "underline",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      <span>(§ 2b BEEG)</span>
                      <StatutorySectionIcon size={10} />
                    </span>
                  </LawRefLink>
                  <span className="badge-gain">
                    {customTaxClassSwitches.value.length} changes
                  </span>
                  {customTaxClassSwitches.value.length > 0 && (
                    <button
                      type="button"
                      onClick={removeAllTaxClassSwitchActions}
                      style={{
                        padding: "2px 6px",
                        background: "none",
                        border: "1px solid var(--color-loss-border)",
                        borderRadius: "3px",
                        color: "var(--color-loss)",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                      title="Remove all tax class switch actions"
                    >
                      <RemoveItemIcon size={10} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {/* Add Tax Class Switch Button */}
                <button
                  type="button"
                  onClick={() => {
                    const count = customTaxClassSwitches.value.length;
                    const nextChild =
                      customPregnancies.value[count] ||
                      customPregnancies.value[
                        customPregnancies.value.length - 1
                      ];
                    const delivery =
                      nextChild?.calculatedDeliverySimulationMonth ||
                      (customPregnancies.value.length === 0
                        ? 12
                        : child1BirthMonth.value + birthSpacingMonths.value);
                    const start = Math.max(1, delivery - 8);
                    const totalElapsed =
                      startCalendarMonth.value - 1 + (start - 1);
                    const sMonth = toCalendarMonth((totalElapsed % 12) + 1);
                    const sYear =
                      startCalendarYear.value + Math.floor(totalElapsed / 12);

                    addTaxClassSwitchAction({
                      switchId: toSwitchId(`SWAP-CHILD-${count + 1}`),
                      effectiveSimulationMonth: toSimulationMonth(start),
                      effectiveCalendarMonth: sMonth,
                      effectiveCalendarYear: toFullCalendarYear(sYear),
                      targetHusbandTaxClass: TaxClass.V,
                      targetWifeTaxClass: TaxClass.III,
                      statutoryReason: `Optimize Child ${count + 1} Elterngeld assessment baseline (§ 2b BEEG)`,
                      revertSimulationMonth: toSimulationMonth(delivery),
                    });
                  }}
                  style={{
                    padding: "5px 12px",
                    background: "var(--color-gain-bg)",
                    color: "var(--color-gain)",
                    border: "1px solid var(--color-gain-border)",
                    borderRadius: "var(--border-radius-sm)",
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <AddActionIcon size={12} />
                  <span>
                    Add Tax Class Switch (Swap #
                    {customTaxClassSwitches.value.length + 1})
                  </span>
                </button>
              </div>

              {/* Dynamic Tax Class Switches Auto-Wrapping Columns */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
                  gap: "14px",
                }}
              >
                {/* ENTRY 1: Initial Baseline Tax Class Selection ($M1$ Precondition) */}
                <div
                  style={{
                    background: "var(--bg-surface-secondary)",
                    padding: "12px 14px",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.76rem",
                        fontWeight: 800,
                        color: "var(--color-gain)",
                        marginBottom: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <TaxClassSwapMilestoneIcon size={13} />
                      <span>Starting tax classes</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        marginBottom: "6px",
                      }}
                    >
                      <button
                        type="button"
                        aria-pressed={husbandInitialTaxClass.value === TaxClass.III && wifeInitialTaxClass.value === TaxClass.V && !useInitialTaxFactor.value}
                        onClick={() =>
                          setInitialTaxClasses(TaxClass.III, TaxClass.V, false)
                        }
                        style={{
                          padding: "8px 10px",
                          minHeight: "40px",
                          borderRadius: "4px",
                          border:
                            husbandInitialTaxClass.value === TaxClass.III &&
                            wifeInitialTaxClass.value === TaxClass.V &&
                            !useInitialTaxFactor.value
                              ? "1px solid var(--color-gain)"
                              : "1px solid var(--border-subtle)",
                          background:
                            husbandInitialTaxClass.value === TaxClass.III &&
                            wifeInitialTaxClass.value === TaxClass.V &&
                            !useInitialTaxFactor.value
                              ? "var(--color-gain-bg)"
                              : "var(--bg-surface)",
                          color:
                            husbandInitialTaxClass.value === TaxClass.III &&
                            wifeInitialTaxClass.value === TaxClass.V &&
                            !useInitialTaxFactor.value
                              ? "var(--color-gain)"
                              : "var(--text-secondary)",
                          fontSize: "0.70rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>Husband: III / Wife: V</span>
                        {husbandInitialTaxClass.value === TaxClass.III &&
                          wifeInitialTaxClass.value === TaxClass.V &&
                          !useInitialTaxFactor.value && (
                          <EligibilityConfirmedIcon size={12} />
                        )}
                      </button>

                      <button
                        type="button"
                        aria-pressed={husbandInitialTaxClass.value === TaxClass.IV && wifeInitialTaxClass.value === TaxClass.IV && !useInitialTaxFactor.value}
                        onClick={() =>
                          setInitialTaxClasses(TaxClass.IV, TaxClass.IV, false)
                        }
                        style={{
                          padding: "8px 10px",
                          minHeight: "40px",
                          borderRadius: "4px",
                          border:
                            husbandInitialTaxClass.value === TaxClass.IV &&
                            wifeInitialTaxClass.value === TaxClass.IV &&
                            !useInitialTaxFactor.value
                              ? "1px solid var(--color-gain)"
                              : "1px solid var(--border-subtle)",
                          background:
                            husbandInitialTaxClass.value === TaxClass.IV &&
                            wifeInitialTaxClass.value === TaxClass.IV &&
                            !useInitialTaxFactor.value
                              ? "var(--color-gain-bg)"
                              : "var(--bg-surface)",
                          color:
                            husbandInitialTaxClass.value === TaxClass.IV &&
                            wifeInitialTaxClass.value === TaxClass.IV &&
                            !useInitialTaxFactor.value
                              ? "var(--color-gain)"
                              : "var(--text-secondary)",
                          fontSize: "0.70rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>Husband: IV / Wife: IV</span>
                        {husbandInitialTaxClass.value === TaxClass.IV &&
                          wifeInitialTaxClass.value === TaxClass.IV &&
                          !useInitialTaxFactor.value && (
                          <EligibilityConfirmedIcon size={12} />
                        )}
                      </button>

                      <button
                        type="button"
                        aria-pressed={husbandInitialTaxClass.value === TaxClass.IV && wifeInitialTaxClass.value === TaxClass.IV && useInitialTaxFactor.value}
                        onClick={() =>
                          setInitialTaxClasses(TaxClass.IV, TaxClass.IV, true)
                        }
                        style={{
                          padding: "8px 10px",
                          minHeight: "40px",
                          borderRadius: "4px",
                          border:
                            husbandInitialTaxClass.value === TaxClass.IV &&
                            wifeInitialTaxClass.value === TaxClass.IV &&
                            useInitialTaxFactor.value
                              ? "1px solid var(--color-gain)"
                              : "1px solid var(--border-subtle)",
                          background:
                            husbandInitialTaxClass.value === TaxClass.IV &&
                            wifeInitialTaxClass.value === TaxClass.IV &&
                            useInitialTaxFactor.value
                              ? "var(--color-gain-bg)"
                              : "var(--bg-surface)",
                          color:
                            husbandInitialTaxClass.value === TaxClass.IV &&
                            wifeInitialTaxClass.value === TaxClass.IV &&
                            useInitialTaxFactor.value
                              ? "var(--color-gain)"
                              : "var(--text-secondary)",
                          fontSize: "0.70rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>Husband: IV / Wife: IV + factor (§ 39f)</span>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.60rem",
                              background: "var(--bg-surface-secondary)",
                              padding: "1px 4px",
                              borderRadius: "3px",
                              border: "1px solid var(--border-subtle)",
                              color: "var(--text-muted)",
                              fontWeight: 600,
                            }}
                          >
                            F ={" "}
                            {(derivedSpousalSet.value.taxFactor ?? 1.0).toFixed(
                              3,
                            )}
                          </span>
                          {husbandInitialTaxClass.value === TaxClass.IV &&
                            wifeInitialTaxClass.value === TaxClass.IV &&
                            useInitialTaxFactor.value && (
                            <EligibilityConfirmedIcon size={12} />
                          )}
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-pressed={husbandInitialTaxClass.value === TaxClass.V && wifeInitialTaxClass.value === TaxClass.III && !useInitialTaxFactor.value}
                        onClick={() =>
                          setInitialTaxClasses(TaxClass.V, TaxClass.III, false)
                        }
                        style={{
                          padding: "8px 10px",
                          minHeight: "40px",
                          borderRadius: "4px",
                          border:
                            husbandInitialTaxClass.value === TaxClass.V &&
                            wifeInitialTaxClass.value === TaxClass.III &&
                            !useInitialTaxFactor.value
                              ? "1px solid var(--color-gain)"
                              : "1px solid var(--border-subtle)",
                          background:
                            husbandInitialTaxClass.value === TaxClass.V &&
                            wifeInitialTaxClass.value === TaxClass.III &&
                            !useInitialTaxFactor.value
                              ? "var(--color-gain-bg)"
                              : "var(--bg-surface)",
                          color:
                            husbandInitialTaxClass.value === TaxClass.V &&
                            wifeInitialTaxClass.value === TaxClass.III &&
                            !useInitialTaxFactor.value
                              ? "var(--color-gain)"
                              : "var(--text-secondary)",
                          fontSize: "0.70rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>Husband: V / Wife: III</span>
                        {husbandInitialTaxClass.value === TaxClass.V &&
                          wifeInitialTaxClass.value === TaxClass.III &&
                          !useInitialTaxFactor.value && (
                          <EligibilityConfirmedIcon size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "0.64rem",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                    }}
                  >
                    These are your tax classes before any planned changes.
                  </div>
                </div>

                {/* Dynamic Switch Cards */}
                {customTaxClassSwitches.value.map((sw, idx) => {
                  const sMonth = sw.effectiveSimulationMonth;
                  const rMonth =
                    sw.revertSimulationMonth ??
                    toSimulationMonth(Math.min(120, sMonth + 8));
                  const targetH = sw.targetHusbandTaxClass;
                  const targetW = sw.targetWifeTaxClass;
                  const useFac = sw.targetUseTaxFactor ?? false;

                  return (
                    <div
                      key={sw.switchId || `switch-${idx}`}
                      style={{
                        background: "var(--bg-surface-secondary)",
                        padding: "12px 14px",
                        borderRadius: "var(--border-radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 800,
                              color: "var(--color-gain)",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <TaxClassSwapMilestoneIcon size={13} />
                            <span>
                              Switch #{idx + 1}: H: {targetH}
                              {useFac && targetH === TaxClass.IV
                                ? " (F)"
                                : ""}{" "}
                              | W: {targetW}
                              {useFac && targetW === TaxClass.IV ? " (F)" : ""}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              removeTaxClassSwitchAction(sw.switchId)
                            }
                            style={{
                              background: "var(--color-loss-bg)",
                              color: "var(--color-loss)",
                              border: "1px solid var(--color-loss-border)",
                              borderRadius: "3px",
                              padding: "2px 6px",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <RemoveItemIcon size={11} />
                          </button>
                        </div>

                        {/* Quick Presets for Target Tax Class Combination */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "4px",
                            marginBottom: "8px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              updateTaxClassSwitchAction(sw.switchId, {
                                targetHusbandTaxClass: TaxClass.V,
                                targetWifeTaxClass: TaxClass.III,
                                targetUseTaxFactor: false,
                              })
                            }
                            style={{
                              padding: "4px 6px",
                              borderRadius: "3px",
                              border:
                                targetH === TaxClass.V &&
                                targetW === TaxClass.III &&
                                !useFac
                                  ? "1px solid var(--color-gain)"
                                  : "1px solid var(--border-subtle)",
                              background:
                                targetH === TaxClass.V &&
                                targetW === TaxClass.III &&
                                !useFac
                                  ? "var(--color-gain-bg)"
                                  : "var(--bg-surface)",
                              color:
                                targetH === TaxClass.V &&
                                targetW === TaxClass.III &&
                                !useFac
                                  ? "var(--color-gain)"
                                  : "var(--text-secondary)",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              textAlign: "center",
                            }}
                          >
                            V / III (Swap Boost)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateTaxClassSwitchAction(sw.switchId, {
                                targetHusbandTaxClass: TaxClass.IV,
                                targetWifeTaxClass: TaxClass.IV,
                                targetUseTaxFactor: false,
                              })
                            }
                            style={{
                              padding: "4px 6px",
                              borderRadius: "3px",
                              border:
                                targetH === TaxClass.IV &&
                                targetW === TaxClass.IV &&
                                !useFac
                                  ? "1px solid var(--color-gain)"
                                  : "1px solid var(--border-subtle)",
                              background:
                                targetH === TaxClass.IV &&
                                targetW === TaxClass.IV &&
                                !useFac
                                  ? "var(--color-gain-bg)"
                                  : "var(--bg-surface)",
                              color:
                                targetH === TaxClass.IV &&
                                targetW === TaxClass.IV &&
                                !useFac
                                  ? "var(--color-gain)"
                                  : "var(--text-secondary)",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              textAlign: "center",
                            }}
                          >
                            IV / IV (Equal)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateTaxClassSwitchAction(sw.switchId, {
                                targetHusbandTaxClass: TaxClass.IV,
                                targetWifeTaxClass: TaxClass.IV,
                                targetUseTaxFactor: true,
                                targetTaxFactor:
                                  derivedSpousalSet.value.taxFactor,
                              })
                            }
                            style={{
                              padding: "4px 6px",
                              borderRadius: "3px",
                              border:
                                targetH === TaxClass.IV &&
                                targetW === TaxClass.IV &&
                                useFac
                                  ? "1px solid var(--color-gain)"
                                  : "1px solid var(--border-subtle)",
                              background:
                                targetH === TaxClass.IV &&
                                targetW === TaxClass.IV &&
                                useFac
                                  ? "var(--color-gain-bg)"
                                  : "var(--bg-surface)",
                              color:
                                targetH === TaxClass.IV &&
                                targetW === TaxClass.IV &&
                                useFac
                                  ? "var(--color-gain)"
                                  : "var(--text-secondary)",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              textAlign: "center",
                            }}
                          >
                            IV / IV + Factor (§ 39f)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateTaxClassSwitchAction(sw.switchId, {
                                targetHusbandTaxClass: TaxClass.III,
                                targetWifeTaxClass: TaxClass.V,
                                targetUseTaxFactor: false,
                              })
                            }
                            style={{
                              padding: "4px 6px",
                              borderRadius: "3px",
                              border:
                                targetH === TaxClass.III &&
                                targetW === TaxClass.V &&
                                !useFac
                                  ? "1px solid var(--color-gain)"
                                  : "1px solid var(--border-subtle)",
                              background:
                                targetH === TaxClass.III &&
                                targetW === TaxClass.V &&
                                !useFac
                                  ? "var(--color-gain-bg)"
                                  : "var(--bg-surface)",
                              color:
                                targetH === TaxClass.III &&
                                targetW === TaxClass.V &&
                                !useFac
                                  ? "var(--color-gain)"
                                  : "var(--text-secondary)",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              textAlign: "center",
                            }}
                          >
                            III / V (Standard)
                          </button>
                        </div>

                        {/* Timing Controls */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "8px",
                            marginBottom: "6px",
                          }}
                        >
                          <div>
                            <label
                              style={{
                                fontSize: "0.64rem",
                                color: "var(--text-muted)",
                                display: "block",
                                marginBottom: "2px",
                              }}
                            >
                              Effective ({getShortMonthLabel(sMonth)} ·{" "}
                              {getMonthId(sMonth)} · {getMonthSimRef(sMonth)}):
                            </label>
                            <select
                              value={sMonth}
                              onChange={(e) => {
                                const newM = parseInt(
                                  (e.target as HTMLSelectElement).value,
                                  10,
                                );
                                const totalElapsed =
                                  startCalendarMonth.value - 1 + (newM - 1);
                                updateTaxClassSwitchAction(sw.switchId, {
                                  effectiveSimulationMonth:
                                    toSimulationMonth(newM),
                                  effectiveCalendarMonth: toCalendarMonth(
                                    (totalElapsed % 12) + 1,
                                  ),
                                  effectiveCalendarYear: toFullCalendarYear(
                                    startCalendarYear.value +
                                      Math.floor(totalElapsed / 12),
                                  ),
                                });
                              }}
                              style={{
                                width: "100%",
                                background: "var(--bg-surface)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "4px",
                                padding: "4px 5px",
                                fontSize: "0.70rem",
                                fontWeight: 700,
                                marginBottom: "4px",
                              }}
                            >
                              {Array.from(
                                {
                                  length: Math.max(
                                    120,
                                    simulationDurationMonths.value,
                                  ),
                                },
                                (_, i) => i + 1,
                              ).map((m) => (
                                <option
                                  key={`sw-eff-opt-${sw.switchId}-${m}`}
                                  value={m}
                                >
                                  {getMonthSimRef(m)} · {getCalDate(m)} (
                                  {getRelativeMonthLabel(m)}) · {getMonthId(m)}
                                </option>
                              ))}
                            </select>
                            <input
                              type="range"
                              min="1"
                              max={Math.max(
                                120,
                                simulationDurationMonths.value,
                              )}
                              value={sMonth}
                              onChange={(e) => {
                                const newM = parseInt(
                                  (e.target as HTMLInputElement).value,
                                  10,
                                );
                                const totalElapsed =
                                  startCalendarMonth.value - 1 + (newM - 1);
                                updateTaxClassSwitchAction(sw.switchId, {
                                  effectiveSimulationMonth:
                                    toSimulationMonth(newM),
                                  effectiveCalendarMonth: toCalendarMonth(
                                    (totalElapsed % 12) + 1,
                                  ),
                                  effectiveCalendarYear: toFullCalendarYear(
                                    startCalendarYear.value +
                                      Math.floor(totalElapsed / 12),
                                  ),
                                });
                              }}
                              style={{
                                width: "100%",
                                accentColor: "var(--color-gain)",
                              }}
                            />
                            <div
                              style={{
                                fontSize: "0.68rem",
                                color: "var(--color-gain)",
                                fontWeight: 700,
                              }}
                            >
                              {getMonthSimRef(sMonth)} · {getCalDate(sMonth)} (
                              {getRelativeMonthLabel(sMonth)}) ·{" "}
                              {getMonthId(sMonth)}
                            </div>
                          </div>
                          <div>
                            <label
                              style={{
                                fontSize: "0.64rem",
                                color: "var(--text-muted)",
                                display: "block",
                                marginBottom: "2px",
                              }}
                            >
                              Revert ({getShortMonthLabel(rMonth)} ·{" "}
                              {getMonthId(rMonth)} · {getMonthSimRef(rMonth)}):
                            </label>
                            <select
                              value={rMonth}
                              onChange={(e) => {
                                const newM = parseInt(
                                  (e.target as HTMLSelectElement).value,
                                  10,
                                );
                                updateTaxClassSwitchAction(sw.switchId, {
                                  revertSimulationMonth:
                                    toSimulationMonth(newM),
                                });
                              }}
                              style={{
                                width: "100%",
                                background: "var(--bg-surface)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "4px",
                                padding: "4px 5px",
                                fontSize: "0.70rem",
                                fontWeight: 700,
                                marginBottom: "4px",
                              }}
                            >
                              {Array.from(
                                {
                                  length: Math.max(
                                    120,
                                    simulationDurationMonths.value,
                                  ),
                                },
                                (_, i) => i + 1,
                              ).map((m) => (
                                <option
                                  key={`sw-rev-opt-${sw.switchId}-${m}`}
                                  value={m}
                                >
                                  {getMonthSimRef(m)} · {getCalDate(m)} (
                                  {getRelativeMonthLabel(m)}) · {getMonthId(m)}
                                </option>
                              ))}
                            </select>
                            <input
                              type="range"
                              min="1"
                              max={Math.max(
                                120,
                                simulationDurationMonths.value,
                              )}
                              value={rMonth}
                              onChange={(e) => {
                                const newM = parseInt(
                                  (e.target as HTMLInputElement).value,
                                  10,
                                );
                                updateTaxClassSwitchAction(sw.switchId, {
                                  revertSimulationMonth:
                                    toSimulationMonth(newM),
                                });
                              }}
                              style={{
                                width: "100%",
                                accentColor: "var(--color-warning)",
                              }}
                            />
                            <div
                              style={{
                                fontSize: "0.68rem",
                                color: "var(--color-warning)",
                                fontWeight: 700,
                              }}
                            >
                              {getMonthSimRef(rMonth)} · {getCalDate(rMonth)} (
                              {getRelativeMonthLabel(rMonth)}) ·{" "}
                              {getMonthId(rMonth)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "0.64rem",
                          color: "var(--text-muted)",
                          background: "var(--bg-surface)",
                          padding: "4px 6px",
                          borderRadius: "3px",
                        }}
                      >
                        ↳ {sw.statutoryReason}
                      </div>
                    </div>
                  );
                })}

                {/* Pure Derived Display: Automatic Tax Swap Take-Home (§ 38b, § 39f EStG) */}
                <div
                  style={{
                    background: "var(--bg-surface-secondary)",
                    padding: "12px 14px",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.76rem",
                        fontWeight: 800,
                        color: "var(--color-gain)",
                        marginBottom: "3px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <TaxClassSwapMilestoneIcon size={13} />
                      <span>
                        Estimated take-home pay by tax class (
                        <LawRefLink
                          lawId={LawId.EStG_38b}
                          label="§ 38b"
                        />
                        ,{" "}
                        <LawRefLink
                          lawId={LawId.EStG_39f}
                          label="§ 39f EStG"
                        />
                        )
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.64rem",
                        color: "var(--text-muted)",
                        marginBottom: "8px",
                      }}
                    >
                      Estimated from the salaries and tax classes in this plan.
                    </div>

                    {/* Wife Optimized Class III FT Net */}
                    <div
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--color-gain-border)",
                        borderRadius: "5px",
                        padding: "6px 8px",
                        marginBottom: "6px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.70rem",
                          color: "var(--text-secondary)",
                          marginBottom: "2px",
                        }}
                      >
                        <span>Wife in class III:</span>
                        <strong
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            color: "var(--color-gain)",
                            fontSize: "0.76rem",
                          }}
                        >
                          {formatCurrency(
                            salaryPeriod.value === SalaryPeriod.Yearly
                              ? derivedSpousalSet.value.wifeClass3FullTimeNet *
                                  12
                              : derivedSpousalSet.value.wifeClass3FullTimeNet,
                          )}
                          {salaryPeriod.value === SalaryPeriod.Yearly
                            ? "/yr"
                            : "/mo"}
                        </strong>
                      </div>
                      <div
                        style={{
                          fontSize: "0.62rem",
                          color: "var(--text-muted)",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>Baseline in Class V:</span>
                        <span>
                          {formatCurrency(
                            salaryPeriod.value === SalaryPeriod.Yearly
                              ? derivedSpousalSet.value.wifeClass5FullTimeNet *
                                  12
                              : derivedSpousalSet.value.wifeClass5FullTimeNet,
                          )}
                          {salaryPeriod.value === SalaryPeriod.Yearly
                            ? "/yr"
                            : "/mo"}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.62rem",
                          color: "var(--color-gain)",
                          fontWeight: 600,
                          marginTop: "2px",
                        }}
                      >
                        ↳ +
                        {formatCurrency(
                          derivedSpousalSet.value.wifeClass3FullTimeNet -
                            derivedSpousalSet.value.wifeClass5FullTimeNet,
                        )}
                        /mo difference between class III and V
                      </div>
                    </div>

                    {/* Husband Class V Net during Swap */}
                    <div
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--color-warning-border)",
                        borderRadius: "5px",
                        padding: "6px 8px",
                        marginBottom: "6px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.70rem",
                          color: "var(--text-secondary)",
                          marginBottom: "2px",
                        }}
                      >
                        <span>Husband in Class V (During Swap):</span>
                        <strong
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            color: "var(--color-warning)",
                            fontSize: "0.76rem",
                          }}
                        >
                          {formatCurrency(
                            salaryPeriod.value === SalaryPeriod.Yearly
                              ? derivedSpousalSet.value.husbandClass5Net * 12
                              : derivedSpousalSet.value.husbandClass5Net,
                          )}
                          {salaryPeriod.value === SalaryPeriod.Yearly
                            ? "/yr"
                            : "/mo"}
                        </strong>
                      </div>
                      <div
                        style={{
                          fontSize: "0.62rem",
                          color: "var(--text-muted)",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>Baseline in Class III:</span>
                        <span>
                          {formatCurrency(
                            salaryPeriod.value === SalaryPeriod.Yearly
                              ? derivedSpousalSet.value.husbandClass3Net * 12
                              : derivedSpousalSet.value.husbandClass3Net,
                          )}
                          {salaryPeriod.value === SalaryPeriod.Yearly
                            ? "/yr"
                            : "/mo"}
                        </span>
                      </div>
                    </div>

                    {/* Class IV Equal vs Class IV + Factor Reference */}
                    <div
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "5px",
                        padding: "6px 8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.68rem",
                          color: "var(--text-secondary)",
                          marginBottom: "3px",
                        }}
                      >
                        <span>Class IV / IV (Standard Equal):</span>
                        <span
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 700,
                            fontSize: "0.70rem",
                          }}
                        >
                          H:{" "}
                          {formatCurrency(
                            derivedSpousalSet.value.husbandClass4Net,
                          )}{" "}
                          · W:{" "}
                          {formatCurrency(
                            derivedSpousalSet.value.wifeClass4FullTimeNet,
                          )}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.68rem",
                          color: "var(--color-gain)",
                        }}
                      >
                        <span>
                          Class IV + Factor (
                          <LawRefLink
                            lawId={LawId.EStG_39f}
                            label="§ 39f"
                          />{" "}
                          · F ={" "}
                          {(derivedSpousalSet.value.taxFactor ?? 1.0).toFixed(
                            3,
                          )}
                          ):
                        </span>
                        <strong
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontSize: "0.72rem",
                          }}
                        >
                          H:{" "}
                          {formatCurrency(
                            derivedSpousalSet.value.husbandClass4WithFactorNet,
                          )}{" "}
                          · W:{" "}
                          {formatCurrency(
                            derivedSpousalSet.value.wifeClass4WithFactorNet,
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Net Family Monthly Shift */}
                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "5px",
                      padding: "5px 8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.66rem",
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      Combined Net Shift (Swap vs III/V):
                    </span>
                    <strong
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--text-primary)",
                      }}
                    >
                      {formatCurrency(
                        derivedSpousalSet.value.husbandClass5Net +
                          derivedSpousalSet.value.wifeClass3FullTimeNet -
                          (derivedSpousalSet.value.husbandClass3Net +
                            derivedSpousalSet.value.wifeClass5FullTimeNet),
                      )}
                      /mo
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* BATCH 3: SALARIES, WORKING TIMES & CAREER PROGRESSION */}
            {/* ======================================================== */}
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "16px 18px",
                borderRadius: "var(--border-radius)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "10px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "0.92rem",
                      color: "var(--color-warning)",
                    }}
                  >
                    3. Pay &amp; working hours
                  </span>
                  <span className="badge-warning">
                    {customWorkingHoursChanges.value.length} hour changes ·{" "}
                    {customSalaryRaises.value.length} pay changes
                  </span>
                </div>

                <div style={{ display: "flex",
                  gap: "8px",
                  flexWrap: "wrap" }}>
                  {/* Add Working Hours Adjustment Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const count = customWorkingHoursChanges.value.length;
                      const target =
                        count % 2 === 0
                          ? TargetPerson.Wife
                          : TargetPerson.Husband;
                      const defaultMonth = Math.min(
                        simulationDurationMonths.value,
                        child1BirthMonth.value + (count === 0 ? 2 : 14),
                      );
                      const totalElapsed =
                        startCalendarMonth.value - 1 + (defaultMonth - 1);
                      const sMonth = toCalendarMonth((totalElapsed % 12) + 1);
                      const sYear =
                        startCalendarYear.value + Math.floor(totalElapsed / 12);

                      const defs = getDefaultPersistedState();
                      addWorkingHoursChangeAction({
                        changeId: toHoursChangeId(`HOURS-${Date.now()}`),
                        effectiveSimulationMonth:
                          toSimulationMonth(defaultMonth),
                        effectiveCalendarMonth: sMonth,
                        effectiveCalendarYear: toFullCalendarYear(sYear),
                        targetPerson: target,
                        weeklyHours: toWorkingHours(
                          target === TargetPerson.Husband
                            ? (husbandHours.value ?? defs.husbandHours)
                            : (wifePostBirthHours.value ??
                                defs.wifePostBirthHours),
                        ),
                        reason:
                          target === TargetPerson.Husband
                            ? "Husband Parental Leave Hours (§ 4b BEEG)"
                            : "Wife Post-Birth Part-Time Return",
                      });
                    }}
                    style={{
                      padding: "5px 12px",
                      background: "var(--color-primary-bg)",
                      color: "var(--color-primary)",
                      border:
                        "1px solid var(--color-primary-border, var(--border-subtle))",
                      borderRadius: "var(--border-radius-sm)",
                      fontSize: "0.74rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AddActionIcon size={12} />
                    <span>+ Add Working Time Change</span>
                  </button>

                  {/* Add Career Raise Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const raiseId = toRaiseId(`RAISE-CUSTOM-${crypto.randomUUID()}`);
                      addSalaryRaiseAction({
                        raiseId,
                        effectiveSimulationMonth: toSimulationMonth(1),
                        effectiveCalendarMonth: startCalendarMonth.value,
                        effectiveCalendarYear: startCalendarYear.value,
                        targetPerson: TargetPerson.Husband,
                        percentageIncrease: toPercentageRate(0),
                        reason: "",
                      });
                      requestAnimationFrame(() => document.getElementById(`salary-change-${raiseId}-method`)?.focus());
                    }}
                    style={{
                      padding: "5px 12px",
                      background: "var(--color-warning-bg)",
                      color: "var(--color-warning)",
                      border: "1px solid var(--color-warning-border)",
                      borderRadius: "var(--border-radius-sm)",
                      fontSize: "0.74rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AddActionIcon size={12} />
                    <span>+ Add Salary Change / Promotion</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Salaries & Career Controls Grid: Columns with Auto-Wrap */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                  gap: "14px",
                }}
              >
                {/* ENTRY 1: Salary Cadence Switcher */}
                <div
                  style={{
                    background: "var(--bg-surface-secondary)",
                    padding: "12px 14px",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--text-secondary)",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <SimulationPeriodIcon size={12} />
                      <span>Salary Cadence Mode:</span>
                    </span>
                  </div>
                  <SegmentedControl
                    compact
                    fullWidth
                    label="Salary cadence"
                    value={salaryPeriod.value}
                    onChange={(period) => setSalaryPeriod(period)}
                    options={[
                      {
                        value: SalaryPeriod.Monthly,
                        label: "Monthly (€/mo)",
                      },
                      {
                        value: SalaryPeriod.Yearly,
                        label: "Yearly (€/yr)",
                      },
                    ]}
                  />
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Controls slider units across husband and wife salaries.
                  </div>
                </div>

                {/* ENTRY 2: PRIMARY HUSBAND GROSS COMPENSATION & WORKING TIMES */}
                <div
                  style={{
                    background: "var(--bg-surface-secondary)",
                    padding: "12px 14px",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.76rem",
                        fontWeight: 800,
                        color: "var(--color-primary)",
                        marginBottom: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <EmploymentCompensationIcon size={13} />
                      <span>Husband Gross Compensation</span>
                    </div>
                    {/* Gross Amount */}
                    <div style={{ marginBottom: "10px" }}>
                      <NumberField
                        compact
                        id="sim-husband-gross"
                        label="Gross Salary"
                        unit={salaryPeriod.value === SalaryPeriod.Yearly ? "€ / yr" : "€ / mo"}
                        asideValue={
                          salaryPeriod.value === SalaryPeriod.Yearly
                            ? `${formatCurrency(husbandGross.value)} / mo`
                            : `${formatCurrency(husbandGrossYearly.value)} / yr`
                        }
                        value={
                          salaryPeriod.value === SalaryPeriod.Yearly
                            ? husbandGrossYearly.value
                            : husbandGross.value
                        }
                        min={0}
                        step={salaryPeriod.value === SalaryPeriod.Yearly ? 100 : 10}
                        slider={{
                          min: 0,
                          max: salaryPeriod.value === SalaryPeriod.Yearly ? 150000 : 12000,
                          step: salaryPeriod.value === SalaryPeriod.Yearly ? 500 : 50,
                        }}
                        onChange={(val) => {
                          if (salaryPeriod.value === SalaryPeriod.Yearly) {
                            setHusbandGrossYearly(val);
                          }
                          else {
                            setHusbandGross(val);
                          }
                        }}
                      />
                    </div>

                    {/* Husband Working Hours */}
                    <div style={{ marginBottom: "10px" }}>
                      <NumberField
                        compact
                        id="sim-husband-hours"
                        label="Working Time"
                        unit="h / wk"
                        asideValue={formatWorkingTime(husbandHours.value)}
                        value={husbandHours.value}
                        min={0}
                        max={60}
                        step={0.5}
                        slider={{ min: 0,
                          max: 60,
                          step: 1 }}
                        presets={[
                          { label: "40h (5d)",
                            value: 40 },
                          { label: "32h (4d)",
                            value: 32 },
                          { label: "24h (3d)",
                            value: 24 },
                          { label: "0h (Leave)",
                            value: 0 },
                        ]}
                        onChange={setHusbandHours}
                      />
                    </div>

                    {/* Husband Annual Salaries Count & Bonus Distribution */}
                    <div style={{ marginBottom: "8px" }}>
                      <div style={{ marginBottom: "4px" }}>
                        <SegmentedControl
                          compact
                          fullWidth
                          label="Husband annual salaries"
                          value={husbandSalariesCount.value}
                          onChange={(count) => setHusbandSalariesCount(count)}
                          options={[
                            { label: "12x",
                              value: AnnualSalariesCount.Twelve },
                            { label: "13x",
                              value: AnnualSalariesCount.Thirteen },
                            { label: "14x",
                              value: AnnualSalariesCount.Fourteen },
                            { label: "15x",
                              value: AnnualSalariesCount.Fifteen },
                          ]}
                        />
                      </div>

                      {/* Husband Bonus Distribution Options if > 12 */}
                      {husbandSalariesCount.value ===
                        AnnualSalariesCount.Thirteen && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            padding: "4px 6px",
                            background: "var(--bg-surface)",
                            borderRadius: "3px",
                            border: "1px solid var(--border-subtle)",
                            marginTop: "3px",
                          }}
                        >
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.60rem",
                              fontWeight: 600,
                            }}
                          >
                            13th Salary Distribution Ratio:
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "3px",
                              flexWrap: "wrap",
                            }}
                          >
                            {[
                              {
                                label: "40/60 (May/Nov)",
                                val: BonusDistributionPreset.Ratio40_60,
                              },
                              {
                                label: "50/50 (Jun/Nov)",
                                val: BonusDistributionPreset.Ratio50_50,
                              },
                              {
                                label: "100% Nov",
                                val: BonusDistributionPreset.Single100Nov,
                              },
                              {
                                label: "100% Dec",
                                val: BonusDistributionPreset.Single100Dec,
                              },
                            ].map((preset) => (
                              <button
                                key={`h-preset-${preset.val}`}
                                type="button"
                                onClick={() =>
                                  setHusbandBonusPreset(preset.val)
                                }
                                style={{
                                  padding: "1px 4px",
                                  fontSize: "0.58rem",
                                  borderRadius: "3px",
                                  border:
                                    husbandBonusPreset.value === preset.val
                                      ? "1px solid var(--color-primary)"
                                      : "1px solid var(--border-subtle)",
                                  background:
                                    husbandBonusPreset.value === preset.val
                                      ? "var(--color-primary-bg)"
                                      : "transparent",
                                  color:
                                    husbandBonusPreset.value === preset.val
                                      ? "var(--color-primary)"
                                      : "var(--text-secondary)",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {husbandSalariesCount.value ===
                        AnnualSalariesCount.Fourteen && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            padding: "4px 6px",
                            background: "var(--bg-surface)",
                            borderRadius: "3px",
                            border: "1px solid var(--border-subtle)",
                            marginTop: "3px",
                          }}
                        >
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.60rem",
                              fontWeight: 600,
                            }}
                          >
                            14th Salary Distribution:
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "3px",
                              flexWrap: "wrap",
                            }}
                          >
                            {[
                              {
                                label: "100%/100% (Jun/Nov)",
                                val: BonusDistributionPreset.Double100_100,
                              },
                              {
                                label: "Quarterly 50%",
                                val: BonusDistributionPreset.Quarterly,
                              },
                            ].map((preset) => (
                              <button
                                key={`h-preset-${preset.val}`}
                                type="button"
                                onClick={() =>
                                  setHusbandBonusPreset(preset.val)
                                }
                                style={{
                                  padding: "1px 4px",
                                  fontSize: "0.58rem",
                                  borderRadius: "3px",
                                  border:
                                    husbandBonusPreset.value === preset.val
                                      ? "1px solid var(--color-primary)"
                                      : "1px solid var(--border-subtle)",
                                  background:
                                    husbandBonusPreset.value === preset.val
                                      ? "var(--color-primary-bg)"
                                      : "transparent",
                                  color:
                                    husbandBonusPreset.value === preset.val
                                      ? "var(--color-primary)"
                                      : "var(--text-secondary)",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {husbandSalariesCount.value ===
                        AnnualSalariesCount.Fifteen && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            padding: "4px 6px",
                            background: "var(--bg-surface)",
                            borderRadius: "3px",
                            border: "1px solid var(--border-subtle)",
                            marginTop: "3px",
                          }}
                        >
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.60rem",
                              fontWeight: 600,
                            }}
                          >
                            15th Salary Distribution:
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "3px",
                              flexWrap: "wrap",
                            }}
                          >
                            {[
                              {
                                label: "100% Mar/Jun/Nov",
                                val: BonusDistributionPreset.Triple100_100_100,
                              },
                              {
                                label: "Quarterly 75%",
                                val: BonusDistributionPreset.Quarterly,
                              },
                            ].map((preset) => (
                              <button
                                key={`h-preset-${preset.val}`}
                                type="button"
                                onClick={() =>
                                  setHusbandBonusPreset(preset.val)
                                }
                                style={{
                                  padding: "1px 4px",
                                  fontSize: "0.58rem",
                                  borderRadius: "3px",
                                  border:
                                    husbandBonusPreset.value === preset.val
                                      ? "1px solid var(--color-primary)"
                                      : "1px solid var(--border-subtle)",
                                  background:
                                    husbandBonusPreset.value === preset.val
                                      ? "var(--color-primary-bg)"
                                      : "transparent",
                                  color:
                                    husbandBonusPreset.value === preset.val
                                      ? "var(--color-primary)"
                                      : "var(--text-secondary)",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Husband Tax Class Badges */}
                  <div
                    style={{
                      display: "flex",
                      gap: "4px",
                      fontSize: "0.66rem",
                      flexWrap: "wrap",
                      marginTop: "4px",
                    }}
                  >
                    <span className="badge-brand">
                      Class III:{" "}
                      <strong>
                        {formatCurrency(
                          salaryPeriod.value === SalaryPeriod.Yearly
                            ? derivedSpousalSet.value.husbandClass3Net * 12
                            : derivedSpousalSet.value.husbandClass3Net,
                        )}
                      </strong>
                      {salaryPeriod.value === SalaryPeriod.Yearly ? "/yr" : ""}
                    </span>
                    <span className="badge-warning">
                      Class V:{" "}
                      <strong>
                        {formatCurrency(
                          salaryPeriod.value === SalaryPeriod.Yearly
                            ? derivedSpousalSet.value.husbandClass5Net * 12
                            : derivedSpousalSet.value.husbandClass5Net,
                        )}
                      </strong>
                      {salaryPeriod.value === SalaryPeriod.Yearly ? "/yr" : ""}
                    </span>
                    <span className="badge-muted">
                      Class IV:{" "}
                      {formatCurrency(
                        salaryPeriod.value === SalaryPeriod.Yearly
                          ? derivedSpousalSet.value.husbandClass4Net * 12
                          : derivedSpousalSet.value.husbandClass4Net,
                      )}
                    </span>
                  </div>
                </div>

                {/* ENTRY 3: WIFE FULL-TIME PRE-PREGNANCY COMPENSATION & WORKING TIMES */}
                <div
                  style={{
                    background: "var(--bg-surface-secondary)",
                    padding: "12px 14px",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.76rem",
                        fontWeight: 800,
                        color: "var(--series-salary-wife)",
                        marginBottom: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <EmploymentCompensationIcon size={13} />
                      <span>Wife Pre-Pregnancy Full-Time Compensation</span>
                    </div>
                    {/* Full-Time Gross Amount */}
                    <div style={{ marginBottom: "10px" }}>
                      <NumberField
                        compact
                        id="sim-wife-gross"
                        label="Full-Time Gross"
                        unit={salaryPeriod.value === SalaryPeriod.Yearly ? "€ / yr" : "€ / mo"}
                        asideValue={
                          salaryPeriod.value === SalaryPeriod.Yearly
                            ? `${formatCurrency(wifeGross.value)} / mo`
                            : `${formatCurrency(wifeGrossYearly.value)} / yr`
                        }
                        value={
                          salaryPeriod.value === SalaryPeriod.Yearly
                            ? wifeGrossYearly.value
                            : wifeGross.value
                        }
                        min={0}
                        step={salaryPeriod.value === SalaryPeriod.Yearly ? 100 : 10}
                        slider={{
                          min: 0,
                          max: salaryPeriod.value === SalaryPeriod.Yearly ? 100000 : 8000,
                          step: salaryPeriod.value === SalaryPeriod.Yearly ? 500 : 50,
                        }}
                        onChange={(val) => {
                          if (salaryPeriod.value === SalaryPeriod.Yearly) {
                            setWifeGrossYearly(val);
                          }
                          else {
                            setWifeGross(val);
                          }
                        }}
                      />
                    </div>

                    {/* Wife Pre-Pregnancy Hours */}
                    <div style={{ marginBottom: "10px" }}>
                      <NumberField
                        compact
                        id="sim-wife-hours"
                        label="Pre-Pregnancy Working Time"
                        unit="h / wk"
                        asideValue={formatWorkingTime(wifeInitialHours.value)}
                        value={wifeInitialHours.value}
                        min={0}
                        max={60}
                        step={0.5}
                        slider={{ min: 0,
                          max: 60,
                          step: 1 }}
                        presets={[
                          { label: "40h (5d)",
                            value: 40 },
                          { label: "32h (4d)",
                            value: 32 },
                          { label: "24h (3d)",
                            value: 24 },
                          { label: "0h (Leave)",
                            value: 0 },
                        ]}
                        onChange={setWifeInitialHours}
                      />
                    </div>

                    {/* Wife Annual Salaries Count & Bonus Distribution */}
                    <div style={{ marginBottom: "8px" }}>
                      <div style={{ marginBottom: "4px" }}>
                        <SegmentedControl
                          compact
                          fullWidth
                          label="Wife annual salaries"
                          value={wifeSalariesCount.value}
                          onChange={(count) => setWifeSalariesCount(count)}
                          options={[
                            { label: "12x",
                              value: AnnualSalariesCount.Twelve },
                            { label: "13x",
                              value: AnnualSalariesCount.Thirteen },
                            { label: "14x",
                              value: AnnualSalariesCount.Fourteen },
                            { label: "15x",
                              value: AnnualSalariesCount.Fifteen },
                          ]}
                        />
                      </div>

                      {/* Wife Bonus Distribution Options if > 12 */}
                      {wifeSalariesCount.value ===
                        AnnualSalariesCount.Thirteen && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            padding: "4px 6px",
                            background: "var(--bg-surface)",
                            borderRadius: "3px",
                            border: "1px solid var(--border-subtle)",
                            marginTop: "3px",
                          }}
                        >
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.60rem",
                              fontWeight: 600,
                            }}
                          >
                            13th Salary Distribution Ratio:
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "3px",
                              flexWrap: "wrap",
                            }}
                          >
                            {[
                              {
                                label: "40/60 (May/Nov)",
                                val: BonusDistributionPreset.Ratio40_60,
                              },
                              {
                                label: "50/50 (Jun/Nov)",
                                val: BonusDistributionPreset.Ratio50_50,
                              },
                              {
                                label: "100% Nov",
                                val: BonusDistributionPreset.Single100Nov,
                              },
                              {
                                label: "100% Dec",
                                val: BonusDistributionPreset.Single100Dec,
                              },
                            ].map((preset) => (
                              <button
                                key={`w-preset-${preset.val}`}
                                type="button"
                                onClick={() => setWifeBonusPreset(preset.val)}
                                style={{
                                  padding: "1px 4px",
                                  fontSize: "0.58rem",
                                  borderRadius: "3px",
                                  border:
                                    wifeBonusPreset.value === preset.val
                                      ? "1px solid var(--series-salary-wife)"
                                      : "1px solid var(--border-subtle)",
                                  background:
                                    wifeBonusPreset.value === preset.val
                                      ? "var(--color-primary-bg)"
                                      : "transparent",
                                  color:
                                    wifeBonusPreset.value === preset.val
                                      ? "var(--series-salary-wife)"
                                      : "var(--text-secondary)",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {wifeSalariesCount.value ===
                        AnnualSalariesCount.Fourteen && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            padding: "4px 6px",
                            background: "var(--bg-surface)",
                            borderRadius: "3px",
                            border: "1px solid var(--border-subtle)",
                            marginTop: "3px",
                          }}
                        >
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.60rem",
                              fontWeight: 600,
                            }}
                          >
                            14th Salary Distribution:
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "3px",
                              flexWrap: "wrap",
                            }}
                          >
                            {[
                              {
                                label: "100%/100% (Jun/Nov)",
                                val: BonusDistributionPreset.Double100_100,
                              },
                              {
                                label: "Quarterly 50%",
                                val: BonusDistributionPreset.Quarterly,
                              },
                            ].map((preset) => (
                              <button
                                key={`w-preset-${preset.val}`}
                                type="button"
                                onClick={() => setWifeBonusPreset(preset.val)}
                                style={{
                                  padding: "1px 4px",
                                  fontSize: "0.58rem",
                                  borderRadius: "3px",
                                  border:
                                    wifeBonusPreset.value === preset.val
                                      ? "1px solid var(--series-salary-wife)"
                                      : "1px solid var(--border-subtle)",
                                  background:
                                    wifeBonusPreset.value === preset.val
                                      ? "var(--color-primary-bg)"
                                      : "transparent",
                                  color:
                                    wifeBonusPreset.value === preset.val
                                      ? "var(--series-salary-wife)"
                                      : "var(--text-secondary)",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {wifeSalariesCount.value ===
                        AnnualSalariesCount.Fifteen && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            padding: "4px 6px",
                            background: "var(--bg-surface)",
                            borderRadius: "3px",
                            border: "1px solid var(--border-subtle)",
                            marginTop: "3px",
                          }}
                        >
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.60rem",
                              fontWeight: 600,
                            }}
                          >
                            15th Salary Distribution:
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "3px",
                              flexWrap: "wrap",
                            }}
                          >
                            {[
                              {
                                label: "100% Mar/Jun/Nov",
                                val: BonusDistributionPreset.Triple100_100_100,
                              },
                              {
                                label: "Quarterly 75%",
                                val: BonusDistributionPreset.Quarterly,
                              },
                            ].map((preset) => (
                              <button
                                key={`w-preset-${preset.val}`}
                                type="button"
                                onClick={() => setWifeBonusPreset(preset.val)}
                                style={{
                                  padding: "1px 4px",
                                  fontSize: "0.58rem",
                                  borderRadius: "3px",
                                  border:
                                    wifeBonusPreset.value === preset.val
                                      ? "1px solid var(--series-salary-wife)"
                                      : "1px solid var(--border-subtle)",
                                  background:
                                    wifeBonusPreset.value === preset.val
                                      ? "var(--color-primary-bg)"
                                      : "transparent",
                                  color:
                                    wifeBonusPreset.value === preset.val
                                      ? "var(--series-salary-wife)"
                                      : "var(--text-secondary)",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Wife FT Tax Class Badges */}
                  <div
                    style={{
                      display: "flex",
                      gap: "4px",
                      fontSize: "0.66rem",
                      flexWrap: "wrap",
                      marginTop: "4px",
                    }}
                  >
                    <span className="badge-warning">
                      Class V:{" "}
                      <strong>
                        {formatCurrency(
                          salaryPeriod.value === SalaryPeriod.Yearly
                            ? derivedSpousalSet.value.wifeClass5FullTimeNet * 12
                            : derivedSpousalSet.value.wifeClass5FullTimeNet,
                        )}
                      </strong>
                      {salaryPeriod.value === SalaryPeriod.Yearly ? "/yr" : ""}
                    </span>
                    <span className="badge-gain">
                      Class III:{" "}
                      <strong>
                        {formatCurrency(
                          salaryPeriod.value === SalaryPeriod.Yearly
                            ? derivedSpousalSet.value.wifeClass3FullTimeNet * 12
                            : derivedSpousalSet.value.wifeClass3FullTimeNet,
                        )}
                      </strong>{" "}
                    </span>
                  </div>
                </div>

                {/* ENTRY 4: DYNAMIC SCHEDULE & WORKING TIME ADJUSTMENT CARDS */}
                {customWorkingHoursChanges.value.map((whc, idx) => {
                  const isWife = whc.targetPerson === TargetPerson.Wife;
                  const isHusband = whc.targetPerson === TargetPerson.Husband;
                  const hours = whc.weeklyHours;

                  // Proportional earnings & benefits estimation
                  const baselineWifeH = wifeInitialHours.value || 40;
                  const baselineHusbandH = husbandHours.value || 40;
                  const wifeRatio =
                    baselineWifeH > 0 ? hours / baselineWifeH : 0;
                  const husbandRatio =
                    baselineHusbandH > 0 ? hours / baselineHusbandH : 0;

                  const ptGross = isWife
                    ? Math.round(wifeGross.value * wifeRatio)
                    : Math.round(husbandGross.value * husbandRatio);

                  const ptNet = isWife
                    ? Math.round(
                      derivedSpousalSet.value.wifeClass5FullTimeNet *
                          wifeRatio,
                    )
                    : Math.round(
                      derivedSpousalSet.value.husbandClass3Net * husbandRatio,
                    );

                  const estimatedEgPlus = isWife
                    ? hours > 32
                      ? 0
                      : Math.min(
                        900,
                        Math.max(
                          150,
                          Math.round(
                            Math.max(
                              0,
                              derivedSpousalSet.value.wifeClass3FullTimeNet -
                                  ptNet,
                            ) * 0.65,
                          ),
                        ),
                      )
                    : hours >= 24 && hours <= 32
                      ? 150
                      : 0;

                  const totalInflow = ptNet + estimatedEgPlus;

                  return (
                    <div
                      key={whc.changeId || `hours-change-${idx}`}
                      style={{
                        background: "var(--bg-surface-secondary)",
                        padding: "12px 14px",
                        borderRadius: "var(--border-radius-sm)",
                        border: isWife
                          ? "1px solid var(--series-mutterschutz)"
                          : isHusband
                            ? "1px solid var(--color-primary-border)"
                            : "1px solid var(--border-subtle)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <div>
                        {/* Header: Title & Delete Button */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 800,
                              color: isWife
                                ? "var(--series-mutterschutz)"
                                : isHusband
                                  ? "var(--color-primary)"
                                  : "var(--series-salary-wife)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <ChildBirthMilestoneIcon size={13} />
                            <span>
                              Schedule #{idx + 1}:{" "}
                              {whc.targetPerson.toUpperCase()}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              removeWorkingHoursChangeAction(whc.changeId)
                            }
                            style={{
                              background: "var(--color-loss-bg)",
                              color: "var(--color-loss)",
                              border: "1px solid var(--color-loss-border)",
                              borderRadius: "3px",
                              padding: "2px 6px",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <RemoveItemIcon size={11} />
                          </button>
                        </div>

                        {/* Target Person & Effective Month Selectors */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "6px",
                            marginBottom: "8px",
                          }}
                        >
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: "0.65rem",
                                color: "var(--text-muted)",
                                marginBottom: "2px",
                              }}
                            >
                              Person:
                            </label>
                            <select
                              value={whc.targetPerson}
                              onChange={(e) => {
                                updateWorkingHoursChangeAction(whc.changeId, {
                                  targetPerson: (e.target as HTMLSelectElement)
                                    .value as TargetPerson,
                                });
                              }}
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                fontSize: "0.72rem",
                                borderRadius: "4px",
                                border: "1px solid var(--border-subtle)",
                                background: "var(--bg-surface)",
                                color: "var(--text-primary)",
                              }}
                            >
                              <option value={TargetPerson.Wife}>
                                Wife (Mother)
                              </option>
                              <option value={TargetPerson.Husband}>
                                Husband (Father)
                              </option>
                              <option value={TargetPerson.Both}>
                                Both Spouses
                              </option>
                            </select>
                          </div>
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: "0.65rem",
                                color: "var(--text-muted)",
                                marginBottom: "2px",
                              }}
                            >
                              Effective Date:
                            </label>
                            <select
                              value={whc.effectiveSimulationMonth}
                              onChange={(e) => {
                                const newMonth = Number(
                                  (e.target as HTMLSelectElement).value,
                                );
                                const totalElapsed =
                                  startCalendarMonth.value - 1 + (newMonth - 1);
                                const calM = toCalendarMonth(
                                  (totalElapsed % 12) + 1,
                                );
                                const calY =
                                  startCalendarYear.value +
                                  Math.floor(totalElapsed / 12);
                                updateWorkingHoursChangeAction(whc.changeId, {
                                  effectiveSimulationMonth:
                                    toSimulationMonth(newMonth),
                                  effectiveCalendarMonth: calM,
                                  effectiveCalendarYear:
                                    toFullCalendarYear(calY),
                                });
                              }}
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                fontSize: "0.72rem",
                                borderRadius: "4px",
                                border: "1px solid var(--border-subtle)",
                                background: "var(--bg-surface)",
                                color: "var(--text-primary)",
                              }}
                            >
                              {Array.from(
                                {
                                  length: Math.max(
                                    120,
                                    simulationDurationMonths.value,
                                  ),
                                },
                                (_, i) => i + 1,
                              ).map((m) => (
                                <option key={`whc-m-${m}`} value={m}>
                                  {getMonthSimRef(m)} · {getCalDate(m)} (
                                  {getRelativeMonthLabel(m)}) · {getMonthId(m)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Working Hours Exact Input & Slider */}
                        <div style={{ marginBottom: "8px" }}>
                          <NumberField
                            compact
                            id={`sim-whc-${whc.changeId}`}
                            label="Working Time"
                            unit="h / wk"
                            asideValue={formatWorkingTime(whc.weeklyHours)}
                            value={whc.weeklyHours}
                            min={0}
                            max={60}
                            step={0.5}
                            slider={{ min: 0,
                              max: 60,
                              step: 1 }}
                            presets={[
                              { label: "40h (5d)",
                                value: 40 },
                              { label: "32h (4d PB)",
                                value: 32 },
                              { label: "24h (3d PB)",
                                value: 24 },
                              { label: "16h (2d)",
                                value: 16 },
                              { label: "0h (Leave)",
                                value: 0 },
                            ]}
                            onChange={(newHours) => {
                              updateWorkingHoursChangeAction(whc.changeId, {
                                weeklyHours: toWorkingHours(newHours),
                              });
                              if (isWife && idx === 0) {
                                setWifePostBirthHours(newHours);
                              }
                            }}
                          />
                        </div>

                        {/* Reason input */}
                        <div style={{ marginBottom: "6px" }}>
                          <input
                            type="text"
                            value={whc.reason}
                            placeholder="Reason (e.g. Part-time return)"
                            onInput={(e) => {
                              updateWorkingHoursChangeAction(whc.changeId, {
                                reason: (e.target as HTMLInputElement).value,
                              });
                            }}
                            style={{
                              width: "100%",
                              padding: "4px 6px",
                              fontSize: "0.68rem",
                              borderRadius: "4px",
                              border: "1px solid var(--border-subtle)",
                              background: "var(--bg-surface)",
                              color: "var(--text-primary)",
                            }}
                          />
                        </div>

                        {/* Statutory Corridor Validation Indicator */}
                        {hours > 32 ? (
                          <div
                            style={{
                              width: "100%",
                              textAlign: "left",
                              fontSize: "0.65rem",
                              color: "var(--color-loss)",
                              background: "var(--color-loss-bg)",
                              padding: "3px 5px",
                              borderRadius: "4px",
                              marginTop: "4px",
                              fontWeight: 600,
                              border: "1px solid var(--color-loss-border)",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <StatutoryLimitationWarningIcon size={11} />
                            <span>
                              &gt; 32h/week disqualifies from Elterngeld (
                              <LawRefLink lawId={LawId.BEEG_1} />
                              ).
                            </span>
                          </div>
                        ) : hours >= 24 && hours <= 32 ? (
                          <LawRefLink
                            lawId={LEGAL_RULE_LAW_MAP[LegalRuleKey.BEEG_PartnershipBonus].lawId}
                            groupId={LEGAL_RULE_LAW_MAP[LegalRuleKey.BEEG_PartnershipBonus].groupId}
                            variant="plain"
                            onOpen={() => {
                              activeLegalRuleKey.value =
                                LegalRuleKey.BEEG_PartnershipBonus;
                            }}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              fontSize: "0.65rem",
                              color: "var(--color-gain)",
                              background: "var(--color-gain-bg)",
                              padding: "3px 5px",
                              borderRadius: "4px",
                              marginTop: "4px",
                              fontWeight: 600,
                              border: "1px solid var(--color-gain-border)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            title="§ 4b BEEG Partnership Bonus rules and worked example — Click for quick popup · Ctrl+Click for full page"
                          >
                            <EligibilityConfirmedIcon size={11} />
                            <span>
                              Partnerschaftsbonus (§ 4b BEEG) OK (24–32h / 3–4d)
                            </span>
                            <StatutorySectionIcon size={10} />
                          </LawRefLink>
                        ) : hours === 0 ? (
                          <div
                            style={{
                              fontSize: "0.65rem",
                              color: "var(--color-primary)",
                              background: "var(--color-primary-bg)",
                              padding: "3px 5px",
                              borderRadius: "4px",
                              marginTop: "4px",
                            }}
                          >
                            ℹ Full Parental Leave (0h / week · 100% leave)
                          </div>
                        ) : (
                          <LawRefLink
                            lawId={LEGAL_RULE_LAW_MAP[LegalRuleKey.BEEG_PartnershipBonus].lawId}
                            groupId={LEGAL_RULE_LAW_MAP[LegalRuleKey.BEEG_PartnershipBonus].groupId}
                            variant="plain"
                            onOpen={() => {
                              activeLegalRuleKey.value =
                                LegalRuleKey.BEEG_PartnershipBonus;
                            }}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              fontSize: "0.65rem",
                              color: "var(--color-warning)",
                              background: "var(--color-warning-bg)",
                              padding: "3px 5px",
                              borderRadius: "4px",
                              marginTop: "4px",
                              fontWeight: 600,
                              border: "1px solid var(--color-warning-border)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            title="§ 4b BEEG corridor requirements — Click for quick popup · Ctrl+Click for full page"
                          >
                            <InformationalNoticeIcon size={11} />
                            <span>
                              ElterngeldPlus eligible, outside PB corridor
                              (24–32h)
                            </span>
                            <StatutorySectionIcon size={10} />
                          </LawRefLink>
                        )}
                      </div>

                      {/* Proportional Salary Preview & Total Inflow */}
                      <div
                        style={{
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "5px",
                          padding: "5px 7px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.66rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>Proportional Gross:</span>
                          <strong
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {formatCurrency(
                              salaryPeriod.value === SalaryPeriod.Yearly
                                ? ptGross * 12
                                : ptGross,
                            )}
                            {salaryPeriod.value === SalaryPeriod.Yearly
                              ? "/yr"
                              : "/mo"}
                          </strong>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.66rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>Part-Time Net:</span>
                          <strong
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {formatCurrency(
                              salaryPeriod.value === SalaryPeriod.Yearly
                                ? ptNet * 12
                                : ptNet,
                            )}
                            {salaryPeriod.value === SalaryPeriod.Yearly
                              ? "/yr"
                              : "/mo"}
                          </strong>
                        </div>
                        {isWife && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.66rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <span>ElterngeldPlus (+65%):</span>
                            <strong
                              style={{
                                color: "var(--color-gain)",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              +{formatCurrency(estimatedEgPlus)}/mo
                            </strong>
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.68rem",
                            color: "var(--text-primary)",
                            borderTop: "1px solid var(--border-subtle)",
                            paddingTop: "2px",
                            fontWeight: 700,
                          }}
                        >
                          <span>Total Inflow:</span>
                          <span
                            style={{
                              color: "var(--color-gain)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatCurrency(
                              salaryPeriod.value === SalaryPeriod.Yearly
                                ? totalInflow * 12
                                : totalInflow,
                            )}
                            {salaryPeriod.value === SalaryPeriod.Yearly
                              ? "/yr"
                              : "/mo"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* ENTRY 5: Editable salary changes */}
                {customSalaryRaises.value.map((action, index) => (
                  <SalaryChangeEditor key={action.raiseId} action={action} index={index} />
                ))}
              </div>
            </div>

            {/* ======================================================== */}
            {/* BATCH 4: FINANCIAL EVENTS, RECURRING INFLOWS & COSTS */}
            {/* ======================================================== */}
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "16px 18px",
                borderRadius: "var(--border-radius)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "10px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "0.92rem",
                      color: "var(--color-primary)",
                    }}
                  >
                    4. Financial Events, Recurring Inflows &amp; Costs
                  </span>
                  <span className="badge-neutral">
                    {customFinancialEvents.value.length} Events Active
                  </span>
                </div>

                {/* Add Cost and Inflow Buttons */}
                <div style={{ display: "flex",
                  gap: "8px",
                  flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const count = customFinancialEvents.value.length;
                      const defaultMonth = Math.min(
                        simulationDurationMonths.value,
                        child1BirthMonth.value + count * 6,
                      );
                      const totalElapsed =
                        startCalendarMonth.value - 1 + (defaultMonth - 1);
                      const sMonth = toCalendarMonth((totalElapsed % 12) + 1);
                      const sYear =
                        startCalendarYear.value + Math.floor(totalElapsed / 12);

                      addFinancialEventAction({
                        eventId: toFinancialEventId(
                          `FIN-CUSTOM-COST-${count + 1}`,
                        ),
                        effectiveSimulationMonth:
                          toSimulationMonth(defaultMonth),
                        effectiveCalendarMonth: sMonth,
                        effectiveCalendarYear: toFullCalendarYear(sYear),
                        title: `Child Expense / Equipment #${count + 1}`,
                        amount: toEuroAmount(-1000),
                        category: FinancialEventCategory.BabyEquipment,
                        description:
                          "Custom family nursery or childcare expense",
                      });
                    }}
                    style={{
                      padding: "5px 10px",
                      background: "var(--color-loss-bg)",
                      color: "var(--color-loss)",
                      border: "1px solid var(--color-loss-border)",
                      borderRadius: "4px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                    }}
                  >
                    <AddActionIcon size={12} />
                    <span>Add Cost (-1.000 €)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const count = customFinancialEvents.value.length;
                      const defaultMonth = Math.min(
                        simulationDurationMonths.value,
                        12 + count * 6,
                      );
                      const totalElapsed =
                        startCalendarMonth.value - 1 + (defaultMonth - 1);
                      const sMonth = toCalendarMonth((totalElapsed % 12) + 1);
                      const sYear =
                        startCalendarYear.value + Math.floor(totalElapsed / 12);

                      addFinancialEventAction({
                        eventId: toFinancialEventId(
                          `FIN-CUSTOM-INCOME-${count + 1}`,
                        ),
                        effectiveSimulationMonth:
                          toSimulationMonth(defaultMonth),
                        effectiveCalendarMonth: sMonth,
                        effectiveCalendarYear: toFullCalendarYear(sYear),
                        title: `Family Bonus / Grant #${count + 1}`,
                        amount: toEuroAmount(1500),
                        category: FinancialEventCategory.CareerBonus,
                        description: "Special employer bonus or one-off grant",
                      });
                    }}
                    style={{
                      padding: "5px 10px",
                      background: "var(--color-gain-bg)",
                      color: "var(--color-gain)",
                      border: "1px solid var(--color-gain-border)",
                      borderRadius: "4px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                    }}
                  >
                    <AddActionIcon size={12} />
                    <span>Add Inflow (+1.500 €)</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Financial Events Auto-Wrapping Columns */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
                  gap: "14px",
                }}
              >
                {/* ENTRY 1: Standing Recurring Inflows (13th Month, Bonus, Capital Returns) */}
                <div
                  style={{
                    background: "var(--bg-surface-secondary)",
                    padding: "12px 14px",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.76rem",
                        fontWeight: 800,
                        color: "var(--series-elterngeld-mother)",
                        marginBottom: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <FinancialInflowIcon size={13} />
                      <span>Standing Recurring Inflow Channels</span>
                    </div>

                    {/* Extra Salaries & Bonus Summary Badge */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "6px",
                        padding: "4px 8px",
                        background: "var(--bg-surface)",
                        borderRadius: "var(--border-radius-xs)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-secondary)",
                          fontWeight: 600,
                        }}
                      >
                        13th-15th Salaries:
                      </span>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          color: "var(--color-primary)",
                        }}
                      >
                        Husband: {husbandSalariesCount.value}x | Wife:{" "}
                        {wifeSalariesCount.value}x
                      </span>
                    </div>

                    {/* Annual Performance Bonus */}
                    <div style={{ marginBottom: "8px" }}>
                      <NumberField
                        compact
                        id="sim-annual-bonus"
                        label="Performance Bonus"
                        unit="€ / yr"
                        min={0}
                        step={100}
                        value={annualBonusGross.value}
                        slider={{ min: 0,
                          max: 30000,
                          step: 500 }}
                        onChange={setAnnualBonusGross}
                      />
                      {annualBonusGross.value > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "2px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.64rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            Payout Month:
                          </span>
                          <select
                            value={annualBonusMonth.value}
                            onChange={(e) => {
                              setAnnualBonusMonth(
                                Number((e.target as HTMLSelectElement).value),
                              );
                            }}
                            style={{
                              background: "var(--bg-surface)",
                              color: "var(--text-primary)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "3px",
                              padding: "1px 4px",
                              fontSize: "0.66rem",
                            }}
                          >
                            {MONTH_NAMES.map((mName, idx) => (
                              <option
                                key={`bonus-m-${idx + 1}`}
                                value={idx + 1}
                              >
                                {mName}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Monthly Investment Returns & Capital Income */}
                    <div>
                      <NumberField
                        compact
                        id="sim-investment-return"
                        label="Investment Returns"
                        unit="€ / mo"
                        min={0}
                        step={10}
                        value={investmentReturnMonthly.value}
                        slider={{ min: 0,
                          max: 5000,
                          step: 50 }}
                        onChange={setInvestmentReturnMonthly}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "0.64rem",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                    }}
                  >
                    ↳ Precondition channels: dividend, rental, ETF cash flow (
                    <LawRefLink lawId={LawId.EStG_20} />
                    ).
                  </div>
                </div>

                {/* One-Off Events List */}
                {customFinancialEvents.value.map((fe, idx) => {
                  const sMonth = fe.effectiveSimulationMonth;
                  const isCost = fe.amount < 0;

                  return (
                    <div
                      key={fe.eventId || `fe-${idx}`}
                      style={{
                        background: "var(--bg-surface-secondary)",
                        padding: "12px 14px",
                        borderRadius: "var(--border-radius-sm)",
                        border: isCost
                          ? "1px solid var(--color-loss-border)"
                          : "1px solid var(--color-gain-border)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "6px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span
                              className={isCost ? "badge-loss" : "badge-gain"}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                            >
                              <FinancialInflowIcon size={11} />
                              <span>{isCost ? "COST" : "INFLOW"}</span>
                            </span>
                            <span
                              style={{
                                fontSize: "0.76rem",
                                fontWeight: 800,
                                color: isCost
                                  ? "var(--color-loss)"
                                  : "var(--color-gain)",
                              }}
                            >
                              {fe.title}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span
                              style={{
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: 800,
                                fontSize: "0.80rem",
                                color: isCost
                                  ? "var(--color-loss)"
                                  : "var(--color-gain)",
                              }}
                            >
                              {formatCurrency(fe.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removeFinancialEventAction(fe.eventId)
                              }
                              style={{
                                background: "var(--color-loss-bg)",
                                color: "var(--color-loss)",
                                border: "1px solid var(--color-loss-border)",
                                borderRadius: "3px",
                                padding: "2px 6px",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <RemoveItemIcon size={11} />
                            </button>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.72rem",
                            color: "var(--text-secondary)",
                            marginBottom: "4px",
                          }}
                        >
                          <span>
                            Effective:{" "}
                            <strong
                              style={{
                                color: isCost
                                  ? "var(--color-loss)"
                                  : "var(--color-gain)",
                              }}
                            >
                              {getMonthSimRef(sMonth)} · {getCalDate(sMonth)}
                            </strong>{" "}
                            ({getRelativeMonthLabel(sMonth)}) ·{" "}
                            {getMonthId(sMonth)}
                          </span>
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.66rem",
                            }}
                          >
                            {fe.category}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                          background: "var(--bg-surface)",
                          padding: "4px 6px",
                          borderRadius: "3px",
                          marginTop: "6px",
                        }}
                      >
                        {fe.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ======================================================== */}
            {/* BATCH 0: PREEXISTING CONDITIONS & SIMULATION PARAMETERS */}
            {/* ======================================================== */}
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "16px 18px",
                borderRadius: "var(--border-radius)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "10px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "0.92rem",
                      color: "var(--color-primary)",
                    }}
                  >
                    0. Preexisting Conditions &amp; Simulation Parameters
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.70rem",
                    color: "var(--text-muted)",
                    background: "var(--bg-surface-secondary)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontWeight: 600,
                  }}
                >
                  Start: {getCalDate(1)} ({getRelativeMonthLabel(1)}) ·{" "}
                  {getMonthId(1)} ({simulationDurationMonths.value}M)
                </span>
              </div>

              <ToggleSwitch
                id="sim-assume-manual-net"
                label="In manual-net mode, use supplied take-home values as unverified BEEG-net estimates"
                hint="Payroll take-home and statutory assessment net differ; leave unchecked to report missing assessments."
                checked={assumeManualNetIsAssessmentNet.value}
                onChange={(checked) => {
                  assumeManualNetIsAssessmentNet.value = checked;
                }}
              />
              <HouseholdIncomeInputs values={householdTaxableIncome} suggestedYear={toFullCalendarYear(startCalendarYear.value - 1)} />
              <h4>Husband payroll details</h4>
              <PayrollPersonalInputs id="simulator-husband" options={husbandPayrollOptions} showLocation />
              <h4>Wife payroll details</h4>
              <PayrollPersonalInputs id="simulator-wife" options={wifePayrollOptions} showLocation />
              {/* Entries Grid: Columns with Auto-Wrap */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                  gap: "14px",
                }}
              >
                {/* ENTRY 1: Simulation Start Date & Horizon */}
                <div
                  style={{
                    background: "var(--bg-surface-secondary)",
                    padding: "12px 14px",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.76rem",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--text-secondary)",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <SimulationPeriodIcon size={12} />
                        <span>Sim Start &amp; Horizon:</span>
                      </span>
                      <span
                        style={{
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 700,
                          color: "var(--color-primary)",
                        }}
                      >
                        {getCalDate(1)} ({getRelativeMonthLabel(1)}) ·{" "}
                        {getMonthId(1)} → {getCalDate(endSimMonth)} (
                        {getRelativeMonthLabel(endSimMonth)}) ·{" "}
                        {getMonthId(endSimMonth)} (
                        {simulationDurationMonths.value}M)
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr",
                        gap: "6px",
                        marginBottom: "8px",
                      }}
                    >
                      <select
                        value={startCalendarMonth.value}
                        onChange={(e) => {
                          startCalendarMonth.value = toCalendarMonth(
                            Number((e.target as HTMLSelectElement).value),
                          );
                        }}
                        style={{
                          background: "var(--bg-surface)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "4px",
                          padding: "4px 6px",
                          fontSize: "0.74rem",
                        }}
                      >
                        {MONTH_NAMES.map((name, idx) => (
                          <option key={`start-m-${idx + 1}`} value={idx + 1}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={startCalendarYear.value}
                        onChange={(e) => {
                          startCalendarYear.value = toFullCalendarYear(
                            Number((e.target as HTMLSelectElement).value),
                          );
                        }}
                        style={{
                          background: "var(--bg-surface)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "4px",
                          padding: "4px 6px",
                          fontSize: "0.74rem",
                        }}
                      >
                        {[
                          2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032,
                          2033, 2034, 2035,
                        ].map((yr) => (
                          <option key={`start-y-${yr}`} value={yr}>
                            Year {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "4px",
                      flexWrap: "wrap",
                    }}
                  >
                    {[12, 24, 36, 48, 60, 72, 84, 96, 100, 108, 120].map(
                      (dur) => (
                        <button
                          key={`dur-btn-${dur}`}
                          type="button"
                          onClick={() => {
                            simulationDurationMonths.value =
                              toMonthDuration(dur);
                          }}
                          style={{
                            padding: "3px 8px",
                            borderRadius: "3px",
                            border:
                              simulationDurationMonths.value === dur
                                ? "1px solid var(--color-primary)"
                                : "1px solid var(--border-subtle)",
                            background:
                              simulationDurationMonths.value === dur
                                ? "var(--color-primary)"
                                : "var(--bg-surface)",
                            color:
                              simulationDurationMonths.value === dur
                                ? "var(--text-inverse)"
                                : "var(--text-secondary)",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {dur}M
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {/* ENTRY 2: Preconditions Baseline Summary Card */}
                <div
                  style={{
                    background: "var(--bg-surface-secondary)",
                    padding: "12px 14px",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.76rem",
                        fontWeight: 800,
                        color: "var(--color-primary)",
                        marginBottom: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <InformationalNoticeIcon size={13} />
                      <span>Conditions at simulation start</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                        fontSize: "0.68rem",
                        color: "var(--text-secondary)",
                        background: "var(--bg-surface)",
                        padding: "6px 8px",
                        borderRadius: "4px",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div>
                        <strong>Husband:</strong>{" "}
                        {formatCurrency(husbandGross.value)}/mo (
                        {formatWorkingTime(husbandHours.value)}) · Class{" "}
                        {husbandInitialTaxClass.value}
                      </div>
                      <div>
                        <strong>Wife:</strong> {formatCurrency(wifeGross.value)}
                        /mo ({formatWorkingTime(wifeInitialHours.value)}) ·
                        Class {wifeInitialTaxClass.value}
                      </div>
                      <div>
                        <strong>Children:</strong> {existingChildrenCount.value}{" "}
                        {existingChildrenCount.value === 1 ? "prior child" : "prior children"}{" "}
                        · Kindergeld {formatCurrency(kindergeldPerChild.value)}/mo
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "0.64rem",
                      color: "var(--text-muted)",
                      marginTop: "6px",
                    }}
                  >
                    ↳ Precondition: baseline status at simulation start.
                    Defaults to 0 if unreported.
                  </div>
                </div>

                {/* ENTRY 3: Kindergeld Rate */}
                <div
                  style={{
                    background: "var(--bg-surface-secondary)",
                    padding: "12px 14px",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.76rem",
                        marginBottom: "4px",
                      }}
                    >
                      <LawRefLink
                        lawId={LEGAL_RULE_LAW_MAP[LegalRuleKey.EStG_Kindergeld].lawId}
                        groupId={LEGAL_RULE_LAW_MAP[LegalRuleKey.EStG_Kindergeld].groupId}
                        variant="plain"
                        onOpen={() => {
                          activeLegalRuleKey.value = LegalRuleKey.EStG_Kindergeld;
                        }}
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          textAlign: "left",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        title="§ 66 EStG Kindergeld legal rule & example — Click for quick popup · Ctrl+Click for full page"
                      >
                        <span>Kindergeld</span>
                        <span
                          style={{
                            color: "var(--color-primary)",
                            textDecoration: "underline",
                            fontSize: "0.72rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "2px",
                          }}
                        >
                          <span>(§ 66 EStG)</span>
                          <StatutorySectionIcon size={10} />
                        </span>
                        :
                      </LawRefLink>
                      <span
                        style={{
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 700,
                          color: "var(--color-loss)",
                        }}
                      >
                        {formatCurrency(kindergeldPerChild.value)} / mo
                      </span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="350"
                      step="5"
                      value={kindergeldPerChild.value}
                      onInput={(e) => {
                        kindergeldPerChild.value = toEuroAmount(
                          Number((e.target as HTMLInputElement).value),
                        );
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: "0.64rem",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                    }}
                  >
                    ↳ Reconciled in tax return (
                    <LawRefLink
                      lawId={LawId.EStG_31}
                      label="Günstigerprüfung § 31 EStG"
                    />
                    ).
                  </div>
                </div>

                {/* ENTRY 4: Deductions Breakdown */}
                <div
                  style={{
                    background: "var(--bg-surface-secondary)",
                    padding: "12px 14px",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setShowDeductionsBreakdown(!showDeductionsBreakdown)
                      }
                      style={{
                        width: "100%",
                        padding: "4px 6px",
                        borderRadius: "4px",
                        border: "1px solid var(--border-subtle)",
                        background: "var(--bg-surface)",
                        color: "var(--text-secondary)",
                        fontSize: "0.70rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontWeight: 700,
                        }}
                      >
                        <SimulatorNavigationIcon size={12} />
                        <span>Tax &amp; Social Deductions</span>
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        {showDeductionsBreakdown ? (
                          <>
                            <CollapseSectionIcon size={11} />
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <ExpandSectionIcon size={11} />
                            <span>Expand</span>
                          </>
                        )}
                      </span>
                    </button>

                    {showDeductionsBreakdown ? (
                      <div
                        style={{
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "4px",
                          padding: "6px 8px",
                          fontSize: "0.66rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            color: "var(--color-primary)",
                            marginBottom: "2px",
                          }}
                        >
                          Husband (Class III):{" "}
                          {formatCurrency(
                            (derivedSpousalSet.value.husbandBreakdownClass3
                              .monthlyGross -
                              derivedSpousalSet.value.husbandBreakdownClass3
                                .monthlyNetTakeHome) *
                              (salaryPeriod.value === SalaryPeriod.Yearly
                                ? 12
                                : 1),
                          )}{" "}
                          (
                          {
                            derivedSpousalSet.value.husbandBreakdownClass3
                              .effectiveTotalDeductionRatePercent
                          }
                          %)
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "2px",
                            marginBottom: "4px",
                            fontSize: "0.64rem",
                          }}
                        >
                          <span>
                            • Social:{" "}
                            {formatCurrency(
                              derivedSpousalSet.value.husbandBreakdownClass3
                                .totalSocialSecurity *
                                (salaryPeriod.value === SalaryPeriod.Yearly
                                  ? 12
                                  : 1),
                            )}
                          </span>
                          <span>
                            • Tax:{" "}
                            {formatCurrency(
                              derivedSpousalSet.value.husbandBreakdownClass3
                                .monthlyWageTax *
                                (salaryPeriod.value === SalaryPeriod.Yearly
                                  ? 12
                                  : 1),
                            )}
                          </span>
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "var(--series-salary-wife)",
                            marginBottom: "2px",
                          }}
                        >
                          Wife FT (Class V):{" "}
                          {formatCurrency(
                            (derivedSpousalSet.value.wifeBreakdownClass5FT
                              .monthlyGross -
                              derivedSpousalSet.value.wifeBreakdownClass5FT
                                .monthlyNetTakeHome) *
                              (salaryPeriod.value === SalaryPeriod.Yearly
                                ? 12
                                : 1),
                          )}{" "}
                          (
                          {
                            derivedSpousalSet.value.wifeBreakdownClass5FT
                              .effectiveTotalDeductionRatePercent
                          }
                          %)
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "2px",
                            fontSize: "0.64rem",
                          }}
                        >
                          <span>
                            • Social:{" "}
                            {formatCurrency(
                              derivedSpousalSet.value.wifeBreakdownClass5FT
                                .totalSocialSecurity *
                                (salaryPeriod.value === SalaryPeriod.Yearly
                                  ? 12
                                  : 1),
                            )}
                          </span>
                          <span>
                            • Tax:{" "}
                            {formatCurrency(
                              derivedSpousalSet.value.wifeBreakdownClass5FT
                                .monthlyWageTax *
                                (salaryPeriod.value === SalaryPeriod.Yearly
                                  ? 12
                                  : 1),
                            )}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                          padding: "2px 0",
                        }}
                      >
                        View granular statutory social insurance (BBG) and wage
                        tax allocations.
                      </div>
                    )}
                  </div>
                </div>

                {/* ENTRY 5: Prior Living Children (Pre-Simulation) */}
                <div
                  style={{
                    background: "var(--bg-surface-secondary)",
                    padding: "12px 14px",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.76rem",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--text-secondary)",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <ChildBirthMilestoneIcon size={12} />
                        <span>Prior Living Children ($t=0$):</span>
                      </span>
                      <span
                        style={{
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 700,
                          color: "var(--color-primary)",
                        }}
                      >
                        {existingChildrenCount.value}{" "}
                        {existingChildrenCount.value === 1 ? "child" : "children"}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExistingChildrenCount(existingChildrenCount.value - 1)
                        }
                        disabled={existingChildrenCount.value <= 0}
                        aria-label="Decrease prior living children"
                        style={{
                          padding: "4px 10px",
                          borderRadius: "4px",
                          border: "1px solid var(--border-subtle)",
                          background: "var(--bg-surface)",
                          color: "var(--text-primary)",
                          fontWeight: 700,
                          cursor:
                            existingChildrenCount.value <= 0
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        -
                      </button>
                      <input
                        id="prior-children-count-input"
                        type="number"
                        min={0}
                        max={10}
                        value={existingChildrenCount.value}
                        onInput={(e) =>
                          setExistingChildrenCount(
                            Number((e.target as HTMLInputElement).value),
                          )
                        }
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontVariantNumeric: "tabular-nums",
                          background: "var(--bg-surface)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "4px",
                          padding: "4px 6px",
                          fontSize: "0.76rem",
                          fontWeight: 700,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setExistingChildrenCount(existingChildrenCount.value + 1)
                        }
                        disabled={existingChildrenCount.value >= 10}
                        aria-label="Increase prior living children"
                        style={{
                          padding: "4px 10px",
                          borderRadius: "4px",
                          border: "1px solid var(--border-subtle)",
                          background: "var(--bg-surface)",
                          color: "var(--text-primary)",
                          fontWeight: 700,
                          cursor:
                            existingChildrenCount.value >= 10
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "0.64rem",
                      color:
                        existingChildrenCount.value > 0
                          ? "var(--color-warning)"
                          : "var(--text-muted)",
                      marginTop: "6px",
                      lineHeight: 1.4,
                    }}
                  >
                    {existingChildrenCount.value > 0 ? (
                      <>
                        ↳ Kindergeld (<LawRefLink lawId={LawId.EStG_66} label="§ 66 EStG" />),{" "}
                        SGB XI care discount (<LawRefLink lawId={LawId.SGB11_55} label="§ 55 SGB XI" />),{" "}
                        and tax allowances scale for {existingChildrenCount.value} prior child(ren).{" "}
                        <LawRefLink lawId={LawId.BEEG_2a} label="§ 2a BEEG" /> sibling bonus stays locked unless birth ages are modeled in Batch 1.
                      </>
                    ) : (
                      <>
                        ↳ Model prior children here, or add Child #1..#N pregnancies in Batch 1 for automatic{" "}
                        <LawRefLink lawId={LawId.BEEG_2a} label="§ 2a BEEG" /> sibling-bonus tracking.
                      </>
                    )}
                  </div>
                </div>

                {/* ENTRY 6: Municipal Daycare (Kita) & § 10 Abs. 1 Nr. 5 EStG */}
                {(() => {
                  const kita = childcarePlan.value;
                  const presets = getAllMunicipalDaycarePresets();
                  const selectedPreset =
                    kita.presetId !== FederalStateKitaPresetId.Custom
                      ? presets.find((item) => item.id === kita.presetId)
                      : undefined;
                  return (
                    <div
                      style={{
                        background: "var(--bg-surface-secondary)",
                        padding: "12px 14px",
                        borderRadius: "var(--border-radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "0.76rem",
                            marginBottom: "6px",
                          }}
                        >
                          <label
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              color: "var(--text-secondary)",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <input
                              id="kita-enabled-toggle"
                              type="checkbox"
                              checked={kita.enabled}
                              onChange={(e) =>
                                updateChildcarePlan({
                                  enabled: (e.target as HTMLInputElement).checked,
                                })
                              }
                            />
                            <span>Daycare / Kita Costs</span>
                          </label>
                          <LawRefLink
                            lawId={LawId.EStG_10_1_5}
                            label="§ 10(1)5 EStG"
                          />
                        </div>

                        <select
                          id="kita-preset-select"
                          value={kita.presetId}
                          disabled={!kita.enabled}
                          onChange={(e) =>
                            updateChildcarePlan({
                              presetId: toFederalStateKitaPresetId(
                                (e.target as HTMLSelectElement).value,
                              ),
                            })
                          }
                          style={{
                            width: "100%",
                            background: "var(--bg-surface)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "4px",
                            padding: "4px 6px",
                            fontSize: "0.72rem",
                            marginBottom: "6px",
                          }}
                        >
                          {presets.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.label} (Illustrative Municipal Table)
                            </option>
                          ))}
                          <option value={FederalStateKitaPresetId.Custom}>
                            Custom Monthly Fee Per Child
                          </option>
                        </select>

                        {kita.presetId === FederalStateKitaPresetId.Custom && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "6px",
                              marginBottom: "6px",
                              fontSize: "0.70rem",
                            }}
                          >
                            <span style={{ color: "var(--text-secondary)" }}>
                              Fee / Child / Mo (EUR):
                            </span>
                            <input
                              id="kita-custom-fee-input"
                              type="number"
                              min={0}
                              max={2500}
                              step={10}
                              disabled={!kita.enabled}
                              value={kita.customMonthlyFeePerChild}
                              onInput={(e) =>
                                updateChildcarePlan({
                                  customMonthlyFeePerChild: toEuroAmount(
                                    Number((e.target as HTMLInputElement).value),
                                  ),
                                })
                              }
                              style={{
                                width: "90px",
                                textAlign: "right",
                                fontVariantNumeric: "tabular-nums",
                                background: "var(--bg-surface)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "4px",
                                padding: "3px 6px",
                                fontSize: "0.72rem",
                              }}
                            />
                          </div>
                        )}

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "6px",
                            fontSize: "0.68rem",
                          }}
                        >
                          <label
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              color: "var(--text-muted)",
                            }}
                          >
                            <span>Entry Age (months)</span>
                            <input
                              id="kita-start-age-input"
                              type="number"
                              min={0}
                              max={167}
                              disabled={!kita.enabled}
                              value={kita.startAgeMonths}
                              onInput={(e) =>
                                updateChildcarePlan({
                                  startAgeMonths: Number(
                                    (e.target as HTMLInputElement).value,
                                  ),
                                })
                              }
                              style={{
                                background: "var(--bg-surface)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "4px",
                                padding: "3px 6px",
                                fontSize: "0.72rem",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            />
                          </label>
                          <label
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              color: "var(--text-muted)",
                            }}
                          >
                            <span>End Age (months)</span>
                            <input
                              id="kita-end-age-input"
                              type="number"
                              min={kita.startAgeMonths}
                              max={168}
                              disabled={!kita.enabled}
                              value={kita.endAgeMonths}
                              onInput={(e) =>
                                updateChildcarePlan({
                                  endAgeMonths: Number(
                                    (e.target as HTMLInputElement).value,
                                  ),
                                })
                              }
                              style={{
                                background: "var(--bg-surface)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "4px",
                                padding: "3px 6px",
                                fontSize: "0.72rem",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "0.64rem",
                          color: "var(--text-muted)",
                          marginTop: "6px",
                          lineHeight: 1.4,
                        }}
                      >
                        ↳ Illustrative municipal reference schedule (not statutory federal rates).{" "}
                        {selectedPreset
                          ? `${selectedPreset.federalState}: sibling discount ${Math.round(selectedPreset.siblingDiscountRateSecondChild * 100)}% (2nd)${selectedPreset.feeFreeFromAgeMonths !== null ? `, fee-free from age ${selectedPreset.feeFreeFromAgeMonths}mo` : ""}.`
                          : "Flat monthly rate per active child."}{" "}
                        Deductible up to 80% / max €4,800/child from 2025.
                      </div>
                    </div>
                  );
                })()}

                {/* ENTRY 7: Inflation, Wage Growth & Future Bracket Indexing */}
                {(() => {
                  const ctx = activeStatutoryContext.value;
                  const cpiPct = Number(
                    (
                      ctx.getParameterNumber(ParameterId.Planning_AnnualInflationRate) *
                      100
                    ).toFixed(2),
                  );
                  const wagePct = Number(
                    (
                      ctx.getParameterNumber(ParameterId.Planning_AnnualWageGrowthRate) *
                      100
                    ).toFixed(2),
                  );
                  const bracketPct = Number(
                    (
                      ctx.getParameterNumber(ParameterId.Planning_AnnualBracketIndexRate) *
                      100
                    ).toFixed(2),
                  );
                  return (
                    <div
                      style={{
                        background: "var(--bg-surface-secondary)",
                        padding: "12px 14px",
                        borderRadius: "var(--border-radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "0.76rem",
                            marginBottom: "6px",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--text-secondary)",
                              fontWeight: 700,
                            }}
                          >
                            Inflation &amp; Purchasing Power
                          </span>
                          <LawRefLink
                            lawId={LawId.InflG}
                            label="InflG / § 32a EStG"
                          />
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: "6px",
                            fontSize: "0.66rem",
                            marginBottom: "6px",
                          }}
                        >
                          <label
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              color: "var(--text-muted)",
                            }}
                          >
                            <span>CPI Infl. (%/yr)</span>
                            <input
                              id="planning-inflation-rate-input"
                              type="number"
                              min={0}
                              max={25}
                              step={0.5}
                              value={cpiPct}
                              onInput={(e) => {
                                const pct = Math.max(
                                  0,
                                  Math.min(
                                    25,
                                    Number((e.target as HTMLInputElement).value) || 0,
                                  ),
                                );
                                modifyParameterValue(
                                  ParameterId.Planning_AnnualInflationRate,
                                  pct / 100,
                                );
                              }}
                              style={{
                                background: "var(--bg-surface)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "4px",
                                padding: "3px 5px",
                                fontSize: "0.72rem",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            />
                          </label>
                          <label
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              color: "var(--text-muted)",
                            }}
                          >
                            <span>Wage Gr. (%/yr)</span>
                            <input
                              id="planning-wage-growth-input"
                              type="number"
                              min={0}
                              max={25}
                              step={0.5}
                              value={wagePct}
                              onInput={(e) => {
                                const pct = Math.max(
                                  0,
                                  Math.min(
                                    25,
                                    Number((e.target as HTMLInputElement).value) || 0,
                                  ),
                                );
                                modifyParameterValue(
                                  ParameterId.Planning_AnnualWageGrowthRate,
                                  pct / 100,
                                );
                              }}
                              style={{
                                background: "var(--bg-surface)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "4px",
                                padding: "3px 5px",
                                fontSize: "0.72rem",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            />
                          </label>
                          <label
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              color: "var(--text-muted)",
                            }}
                          >
                            <span>Bracket (%/yr)</span>
                            <input
                              id="planning-bracket-index-input"
                              type="number"
                              min={0}
                              max={25}
                              step={0.5}
                              disabled={!indexFutureTaxBrackets.value}
                              value={bracketPct}
                              onInput={(e) => {
                                const pct = Math.max(
                                  0,
                                  Math.min(
                                    25,
                                    Number((e.target as HTMLInputElement).value) || 0,
                                  ),
                                );
                                modifyParameterValue(
                                  ParameterId.Planning_AnnualBracketIndexRate,
                                  pct / 100,
                                );
                              }}
                              style={{
                                background: "var(--bg-surface)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "4px",
                                padding: "3px 5px",
                                fontSize: "0.72rem",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            />
                          </label>
                        </div>

                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.68rem",
                            color: "var(--text-secondary)",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            id="index-future-brackets-toggle"
                            type="checkbox"
                            checked={indexFutureTaxBrackets.value}
                            onChange={(e) =>
                              setIndexFutureTaxBrackets(
                                (e.target as HTMLInputElement).checked,
                              )
                            }
                          />
                          <span>
                            Index future &sect; 32a EStG brackets (unverified years only)
                          </span>
                        </label>
                      </div>
                      <div
                        style={{
                          fontSize: "0.64rem",
                          color: "var(--text-muted)",
                          marginTop: "6px",
                          lineHeight: 1.4,
                        }}
                      >
                        ↳ Discounts future cash flows to Month-1 purchasing power. Published statutory tax years stay unmodified.
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
