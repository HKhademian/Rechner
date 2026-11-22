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
  displayedCurrentScenarioData,
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
  evaluatePregnancyAllowanceBudgetInContext,
  resolveFatherAllowancePlanMode,
  resolveMotherAllowancePlanMode,
} from "#engine/benefits/allowanceVariant";
import {
  evaluateAllowanceVariantConversionInContext,
} from "#engine/formulas/context/statutoryEvaluators";
import {
  addCalendarMonthsClamped,
  buildIsoDate,
  daysInCalendarMonth,
  parseIsoDateParts,
} from "#engine/formulas/pure/maternityAndLifeMonthFormulas";
import {
  buildWorkingHoursSchedulePreview,
} from "#utils/workingHoursPreview";

import {
  type MonthRef,
  type CalendarLabel,
  AllowancePlanMode,
  DaycareBookingHoursTier,
  ElterngeldVariant,
  FederalStateKitaPresetId,
  TaxClass,
  TargetPerson,
  FinancialEventCategory,
  SalaryPeriod,
  AnnualSalariesCount,
  BonusDistributionPreset,
  formatGermanDate,
  isIsoCalendarDate,
  toDaycareBookingHoursTier,
  toFederalStateKitaPresetId,
  toIsoCalendarDate,
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
  toMonthRef,
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
    <div className="ui-card sandbox-panel">
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
          className="sandbox-body"
        >
          {/* Quick Presets & Reset Bar */}
          <div
            className="sandbox-toolbar"
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
            className="sandbox-batches"
          >
            {/* ======================================================== */}
            {/* BATCH 1: PREGNANCY POSITIVE DECISIONS & MILESTONES */}
            {/* ======================================================== */}
            <div
              className="sandbox-batch"
            >
              <div
                className="sandbox-batch__header"
              >
                <div
                  className="sandbox-batch__title-group"
                >
                  <span
                    className="sandbox-batch__title"
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
                      className="sandbox-remove-btn sandbox-remove-btn--ghost"
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
                      motherAllowancePlanMode: AllowancePlanMode.Auto,
                      fatherAllowancePlanMode: AllowancePlanMode.Auto,
                    });
                  }}
                  className="sandbox-action-btn sandbox-action-btn--primary"
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
                  className="sandbox-empty"
                >
                  No pregnancies planned yet. Add a pregnancy to see its expected birth and related benefits.
                </div>
              ) : (
                <div
                  className="sandbox-grid"
                >
                  {customPregnancies.value.map((preg, idx) => {
                    const pSimMonth = preg.positiveTestSimulationMonth;
                    const dSimMonth = preg.calculatedDeliverySimulationMonth;
                    const isFirst = idx === 0;

                    return (
                      <div
                        key={preg.pregnancyId || `preg-${idx}`}
                        className="sandbox-card"
                      >
                        <div>
                          <div
                            className="sandbox-card__header"
                          >
                            <span
                              className="sandbox-card__title-sm"
                            >
                              Child #{preg.childIndex} Pregnancy
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removePregnancyAction(preg.pregnancyId)
                              }
                              className="sandbox-remove-btn"
                            >
                              <RemoveItemIcon size={11} />
                              <span>Remove</span>
                            </button>
                          </div>

                          {isFirst ? (
                            <div>
                              <div
                                className="sandbox-grid-2"
                              >
                                <div>
                                  <label
                                    className="sandbox-field-label"
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
                                    className="sandbox-select"
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
                                    className="sandbox-field-label"
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
                                    className="sandbox-select"
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
                                className="sandbox-row--between-xs"
                              >
                                <span>
                                  Positive:{" "}
                                  <strong
                                    className="sandbox-text-loss"
                                  >
                                    {getRelativeMonthLabel(pSimMonth)}
                                  </strong>{" "}
                                  ({getCalDate(pSimMonth)})
                                </span>
                                <span>
                                  Birth 1:{" "}
                                  <strong
                                    className="sandbox-text-primary"
                                  >
                                    {getRelativeMonthLabel(dSimMonth)}
                                  </strong>{" "}
                                  ({preg.expectedDueDate ? formatGermanDate(preg.expectedDueDate) : getCalDate(dSimMonth)})
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div
                                className="sandbox-grid-2"
                              >
                                <div>
                                  <label
                                    className="sandbox-field-label"
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
                                    className="sandbox-select"
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
                                    className="sandbox-field-label"
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
                                    className="sandbox-select"
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
                                className="sandbox-row--between-xs"
                              >
                                <span>
                                  Positive:{" "}
                                  <strong
                                    className="sandbox-text-loss"
                                  >
                                    {getRelativeMonthLabel(pSimMonth)}
                                  </strong>{" "}
                                  ({getCalDate(pSimMonth)})
                                </span>
                                <span>
                                  Birth #{preg.childIndex}:{" "}
                                  <strong
                                    className="sandbox-text-primary"
                                  >
                                    {getRelativeMonthLabel(dSimMonth)}
                                  </strong>{" "}
                                  ({preg.expectedDueDate ? formatGermanDate(preg.expectedDueDate) : getCalDate(dSimMonth)})
                                </span>
                              </div>
                              <div
                                className={`sandbox-status-line ${dSimMonth - (customPregnancies.value[idx - 1]?.calculatedDeliverySimulationMonth || 0) < 36 ? "sandbox-status-line--gain" : "sandbox-status-line--warning"}`}
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

                          {/* Day-Exact Expected Due Date, Mutterschutz & Vacation Inputs */}
                          {(() => {
                            const estElapsed = startCalendarMonth.value - 1 + (dSimMonth - 1);
                            const estYear = startCalendarYear.value + Math.floor(estElapsed / 12);
                            const estMonth = ((estElapsed % 12) + 12) % 12 + 1;
                            const estimatedDueIso = buildIsoDate(estYear, estMonth, 15);
                            return (
                              <div className="sandbox-mt-2">
                                <div className="sandbox-grid-2">
                                  <div>
                                    <label
                                      htmlFor={`preg-due-date-${preg.pregnancyId}`}
                                      className="sandbox-field-label"
                                    >
                                      Exact due date (optional)
                                    </label>
                                    <input
                                      id={`preg-due-date-${preg.pregnancyId}`}
                                      type="date"
                                      value={preg.expectedDueDate ?? ""}
                                      onChange={(e) => {
                                        const raw = (e.target as HTMLInputElement).value;
                                        if (!raw) {
                                          updatePregnancyAction(preg.pregnancyId, {
                                            expectedDueDate: undefined,
                                          });
                                          return;
                                        }
                                        if (!isIsoCalendarDate(raw)) {
                                          return;
                                        }
                                        const dueIso = toIsoCalendarDate(raw);
                                        const dueParts = parseIsoDateParts(dueIso);
                                        const posIso = addCalendarMonthsClamped(dueIso, -8);
                                        const posParts = parseIsoDateParts(posIso);
                                        if (isFirst) {
                                          setPregnancy1PositiveDate(posParts.year, posParts.month);
                                          updatePregnancyAction(preg.pregnancyId, {
                                            expectedDueDate: dueIso,
                                          });
                                        }
                                        else {
                                          const newDSim = Math.max(
                                            1,
                                            (dueParts.year - startCalendarYear.value) * 12 +
                                              (dueParts.month - startCalendarMonth.value) +
                                              1,
                                          );
                                          const newPSim = Math.max(1, newDSim - 8);
                                          updatePregnancyAction(preg.pregnancyId, {
                                            expectedDueDate: dueIso,
                                            positiveTestCalendarMonth: posParts.month,
                                            positiveTestCalendarYear: posParts.year,
                                            positiveTestSimulationMonth: toSimulationMonth(newPSim),
                                            calculatedDeliverySimulationMonth: toSimulationMonth(newDSim),
                                          });
                                        }
                                      }}
                                      className="sandbox-input sandbox-input--regular"
                                    />
                                    <div className="sandbox-chip-wrap sandbox-mt-1">
                                      <button
                                        type="button"
                                        id={`preg-due-date-estimate-${preg.pregnancyId}`}
                                        className={`sandbox-chip-btn ${preg.expectedDueDate === estimatedDueIso ? "sandbox-chip-btn--active-primary" : ""}`}
                                        title="Populate estimated mid-month due date (+8 months from positive test)"
                                        onClick={() =>
                                          updatePregnancyAction(preg.pregnancyId, {
                                            expectedDueDate: estimatedDueIso,
                                          })
                                        }
                                      >
                                        Estimate ({formatGermanDate(estimatedDueIso)})
                                      </button>
                                      {preg.expectedDueDate && (
                                        <button
                                          type="button"
                                          className="sandbox-chip-btn"
                                          onClick={() =>
                                            updatePregnancyAction(preg.pregnancyId, {
                                              expectedDueDate: undefined,
                                            })
                                          }
                                        >
                                          Clear
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <label
                                      htmlFor={`preg-vac-days-${preg.pregnancyId}`}
                                      className="sandbox-field-label"
                                    >
                                      Annual vacation (days)
                                    </label>
                                    <input
                                      id={`preg-vac-days-${preg.pregnancyId}`}
                                      type="number"
                                      min={0}
                                      max={60}
                                      step={1}
                                      value={preg.motherAnnualVacationDays ?? 30}
                                      onInput={(e) => {
                                        const v = Math.max(
                                          0,
                                          Math.min(60, Number((e.target as HTMLInputElement).value) || 0),
                                        );
                                        updatePregnancyAction(preg.pregnancyId, {
                                          motherAnnualVacationDays: v,
                                        });
                                      }}
                                      className="sandbox-input sandbox-input--regular"
                                    />
                                  </div>
                                </div>

                                <div className="sandbox-grid-2 sandbox-mt-2">
                                  <div>
                                    <label
                                      htmlFor={`preg-vac-taken-${preg.pregnancyId}`}
                                      className="sandbox-field-label"
                                    >
                                      Vacation taken pre-leave (days)
                                    </label>
                                    <input
                                      id={`preg-vac-taken-${preg.pregnancyId}`}
                                      type="number"
                                      min={0}
                                      max={60}
                                      step={0.5}
                                      value={preg.motherVacationDaysTakenPreLeave ?? 0}
                                      onInput={(e) => {
                                        const v = Math.max(
                                          0,
                                          Math.min(60, Number((e.target as HTMLInputElement).value) || 0),
                                        );
                                        updatePregnancyAction(preg.pregnancyId, {
                                          motherVacationDaysTakenPreLeave: v,
                                        });
                                      }}
                                      className="sandbox-input sandbox-input--regular"
                                    />
                                  </div>
                                  <div className="sandbox-row--between-sm">
                                    <label className="sandbox-check-label">
                                      <input
                                        id={`preg-twins-${preg.pregnancyId}`}
                                        type="checkbox"
                                        checked={Boolean(preg.isMultipleOrPrematureBirth)}
                                        onChange={(e) =>
                                          updatePregnancyAction(preg.pregnancyId, {
                                            isMultipleOrPrematureBirth: (
                                              e.target as HTMLInputElement
                                            ).checked,
                                          })
                                        }
                                      />
                                      <span>Twins / premature (+4 wks MuSchG)</span>
                                    </label>
                                  </div>
                                </div>

                                {preg.expectedDueDate && (
                                  <div className="sandbox-note sandbox-note--sm">
                                    ↳ Exact due date {formatGermanDate(preg.expectedDueDate)} active:
                                    enables day-exact Mutterschutz proration, BEEG Life Months, and
                                    statutory deadline calendar below.
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Parental Allowance Variant & Duration (§§ 4, 4a BEEG) */}
                        {(() => {
                          const statutoryContext = activeStatutoryContext.value;
                          const motherPlanMode = resolveMotherAllowancePlanMode(preg);
                          const fatherPlanMode = resolveFatherAllowancePlanMode(preg);
                          const isAutoActive =
                            motherPlanMode === AllowancePlanMode.Auto ||
                            fatherPlanMode === AllowancePlanMode.Auto;
                          const budget = evaluatePregnancyAllowanceBudgetInContext(
                            preg,
                            statutoryContext,
                          ).value;
                          const motherMonthOptions = Array.from(
                            {
                              length:
                                Math.max(
                                  motherPlanMode === AllowancePlanMode.Auto ? 24 : budget.maxMotherOrdinaryMonths,
                                  budget.motherOrdinaryMonths,
                                  preg.motherAllowanceMonthsCount ?? 0,
                                ) + 1,
                            },
                            (_, count) => count,
                          );
                          const fatherMonthOptions = Array.from(
                            {
                              length:
                                Math.max(
                                  fatherPlanMode === AllowancePlanMode.Auto ? 24 : budget.maxFatherOrdinaryMonths,
                                  budget.fatherOrdinaryMonths,
                                ) + 1,
                            },
                            (_, count) => count,
                          );
                          const simulatedSummary = (() => {
                            if (!isAutoActive) {
                              return null;
                            }
                            let mBasis = 0;
                            let mPlus = 0;
                            let fBasis = 0;
                            let fPlus = 0;
                            for (const monthEntry of displayedCurrentScenarioData.value.months) {
                              for (const payment of monthEntry.benefitPayments ?? []) {
                                if (payment.pregnancyId !== preg.pregnancyId || payment.partnershipBonus || payment.payment <= 0) {
                                  continue;
                                }
                                if (payment.parent === TargetPerson.Wife) {
                                  if (payment.variant === ElterngeldVariant.Basis) {
                                    mBasis += 1;
                                  }
                                  else {
                                    mPlus += 1;
                                  }
                                }
                                else if (payment.parent === TargetPerson.Husband) {
                                  if (payment.variant === ElterngeldVariant.Basis) {
                                    fBasis += 1;
                                  }
                                  else {
                                    fPlus += 1;
                                  }
                                }
                              }
                            }
                            const formatSide = (basisCount: number, plusCount: number): string => {
                              const parts: string[] = [];
                              if (basisCount > 0) {
                                parts.push(`${basisCount}M Basis`);
                              }
                              if (plusCount > 0) {
                                parts.push(`${plusCount}M Plus`);
                              }
                              return parts.length > 0 ? parts.join(" + ") : "0M";
                            };
                            return `M: ${formatSide(mBasis, mPlus)} · F: ${formatSide(fBasis, fPlus)}`;
                          })();
                          const handleMotherPlanChange = (
                            targetMode: AllowancePlanMode,
                          ): void => {
                            if (targetMode === AllowancePlanMode.Auto) {
                              updatePregnancyAction(preg.pregnancyId, {
                                motherAllowancePlanMode: AllowancePlanMode.Auto,
                                motherAllowanceMonthsCount: undefined,
                              });
                              return;
                            }
                            const targetVariant = targetMode === AllowancePlanMode.Basis
                              ? ElterngeldVariant.Basis
                              : ElterngeldVariant.Plus;
                            const nextBudget = evaluatePregnancyAllowanceBudgetInContext(
                              {
                                ...preg,
                                motherAllowancePlanMode: targetMode,
                                motherAllowanceVariant: targetVariant,
                                motherAllowanceMonthsCount: toMonthDuration(0),
                              },
                              statutoryContext,
                            ).value;
                            const nextMonths = evaluateAllowanceVariantConversionInContext(
                              {
                                currentMonths: budget.motherOrdinaryMonths,
                                fromVariant: budget.motherVariant,
                                toVariant: targetVariant,
                                maxMonthsInTargetVariant: nextBudget.maxMotherOrdinaryMonths,
                              },
                              statutoryContext,
                            ).value;
                            updatePregnancyAction(preg.pregnancyId, {
                              motherAllowancePlanMode: targetMode,
                              motherAllowanceVariant: targetVariant,
                              motherAllowanceMonthsCount: nextMonths,
                            });
                          };
                          const handleFatherPlanChange = (
                            targetMode: AllowancePlanMode,
                          ): void => {
                            if (targetMode === AllowancePlanMode.Auto) {
                              updatePregnancyAction(preg.pregnancyId, {
                                fatherAllowancePlanMode: AllowancePlanMode.Auto,
                              });
                              return;
                            }
                            const targetVariant = targetMode === AllowancePlanMode.Basis
                              ? ElterngeldVariant.Basis
                              : ElterngeldVariant.Plus;
                            const nextBudget = evaluatePregnancyAllowanceBudgetInContext(
                              {
                                ...preg,
                                fatherAllowancePlanMode: targetMode,
                                fatherAllowanceVariant: targetVariant,
                                fatherPartnerMonthsCount: toMonthDuration(0),
                              },
                              statutoryContext,
                            ).value;
                            const nextMonths = evaluateAllowanceVariantConversionInContext(
                              {
                                currentMonths: budget.fatherOrdinaryMonths,
                                fromVariant: budget.fatherVariant,
                                toVariant: targetVariant,
                                maxMonthsInTargetVariant: nextBudget.maxFatherOrdinaryMonths,
                              },
                              statutoryContext,
                            ).value;
                            updatePregnancyAction(preg.pregnancyId, {
                              fatherAllowancePlanMode: targetMode,
                              fatherAllowanceVariant: targetVariant,
                              fatherPartnerMonthsCount: nextMonths,
                            });
                          };
                          return (
                            <div className="sandbox-surface-box sandbox-surface-box--stack">
                              <div className="sandbox-row--between-xs">
                                <span>Elterngeld Plan (§§ 4, 4a BEEG)</span>
                                <strong className="sandbox-val-tab">
                                  {simulatedSummary ?? `${budget.totalBasisUnits} / ${budget.maxFamilyBasisUnits} Basis units`}
                                </strong>
                              </div>

                              <div className="sandbox-grid-2-1">
                                <div>
                                  <span className="sandbox-field-label sandbox-field-label--xs">
                                    Mother mode:
                                  </span>
                                  <div className="sandbox-chip-wrap">
                                    <button
                                      type="button"
                                      aria-pressed={motherPlanMode === AllowancePlanMode.Auto}
                                      onClick={() => handleMotherPlanChange(AllowancePlanMode.Auto)}
                                      className={`sandbox-chip-btn ${motherPlanMode === AllowancePlanMode.Auto ? "sandbox-chip-btn--active-wife" : ""}`}
                                    >
                                      Auto (0h Basis / PT Plus)
                                    </button>
                                    <button
                                      type="button"
                                      aria-pressed={motherPlanMode === AllowancePlanMode.Basis}
                                      onClick={() => handleMotherPlanChange(AllowancePlanMode.Basis)}
                                      className={`sandbox-chip-btn ${motherPlanMode === AllowancePlanMode.Basis ? "sandbox-chip-btn--active-wife" : ""}`}
                                    >
                                      Basis (max 1.800 €)
                                    </button>
                                    <button
                                      type="button"
                                      aria-pressed={motherPlanMode === AllowancePlanMode.Plus}
                                      onClick={() => handleMotherPlanChange(AllowancePlanMode.Plus)}
                                      className={`sandbox-chip-btn ${motherPlanMode === AllowancePlanMode.Plus ? "sandbox-chip-btn--active-wife" : ""}`}
                                    >
                                      Plus (max 900 €)
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label className="sandbox-field-label sandbox-field-label--xs">
                                    Mother mo:
                                  </label>
                                  <select
                                    aria-label={`Child ${preg.childIndex}: mother allowance months`}
                                    value={
                                      motherPlanMode === AllowancePlanMode.Auto
                                        ? (preg.motherAllowanceMonthsCount ?? "")
                                        : budget.motherOrdinaryMonths
                                    }
                                    onChange={(e) => {
                                      const raw = (e.target as HTMLSelectElement).value;
                                      updatePregnancyAction(preg.pregnancyId, {
                                        motherAllowanceMonthsCount:
                                          raw === "" ? undefined : toMonthDuration(Number(raw)),
                                      });
                                    }}
                                    className="sandbox-select"
                                  >
                                    {motherPlanMode === AllowancePlanMode.Auto && (
                                      <option value="">Auto (full budget)</option>
                                    )}
                                    {motherMonthOptions.map((count) => (
                                      <option key={`m-eg-${count}`} value={count}>
                                        {count}M {motherPlanMode === AllowancePlanMode.Auto ? "max" : motherPlanMode === AllowancePlanMode.Basis ? "Basis" : "Plus"}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="sandbox-grid-2-1">
                                <div>
                                  <span className="sandbox-field-label sandbox-field-label--xs">
                                    Father mode:
                                  </span>
                                  <div className="sandbox-chip-wrap">
                                    <button
                                      type="button"
                                      aria-pressed={fatherPlanMode === AllowancePlanMode.Auto}
                                      onClick={() => handleFatherPlanChange(AllowancePlanMode.Auto)}
                                      className={`sandbox-chip-btn ${fatherPlanMode === AllowancePlanMode.Auto ? "sandbox-chip-btn--active-primary" : ""}`}
                                    >
                                      Auto (0h Basis / PT Plus)
                                    </button>
                                    <button
                                      type="button"
                                      aria-pressed={fatherPlanMode === AllowancePlanMode.Basis}
                                      onClick={() => handleFatherPlanChange(AllowancePlanMode.Basis)}
                                      className={`sandbox-chip-btn ${fatherPlanMode === AllowancePlanMode.Basis ? "sandbox-chip-btn--active-primary" : ""}`}
                                    >
                                      Basis (max 1.800 €)
                                    </button>
                                    <button
                                      type="button"
                                      aria-pressed={fatherPlanMode === AllowancePlanMode.Plus}
                                      onClick={() => handleFatherPlanChange(AllowancePlanMode.Plus)}
                                      className={`sandbox-chip-btn ${fatherPlanMode === AllowancePlanMode.Plus ? "sandbox-chip-btn--active-primary" : ""}`}
                                    >
                                      Plus (max 900 €)
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label className="sandbox-field-label sandbox-field-label--xs">
                                    Father mo:
                                  </label>
                                  <select
                                    aria-label={`Child ${preg.childIndex}: father allowance months`}
                                    value={budget.fatherOrdinaryMonths}
                                    onChange={(e) => {
                                      const val = Number(
                                        (e.target as HTMLSelectElement).value,
                                      );
                                      updatePregnancyAction(preg.pregnancyId, {
                                        fatherPartnerMonthsCount: toMonthDuration(val),
                                      });
                                    }}
                                    className="sandbox-select"
                                  >
                                    {fatherMonthOptions.map((count) => (
                                      <option key={`f-eg-${count}`} value={count}>
                                        {count}M {fatherPlanMode === AllowancePlanMode.Auto ? "Auto" : fatherPlanMode === AllowancePlanMode.Basis ? "Basis" : "Plus"}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        <div
                          className="sandbox-note sandbox-note--box"
                        >
                          {isFirst ? (
                            <>
                              ↳ Forecast Start:{" "}
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
              className="sandbox-batch"
            >
              <div
                className="sandbox-batch__header"
              >
                <div
                  className="sandbox-batch__title-group"
                >
                  <LawRefLink
                    lawId={LEGAL_RULE_LAW_MAP[LegalRuleKey.BEEG_TaxSwap].lawId}
                    groupId={LEGAL_RULE_LAW_MAP[LegalRuleKey.BEEG_TaxSwap].groupId}
                    variant="plain"
                    onOpen={() => {
                      activeLegalRuleKey.value = LegalRuleKey.BEEG_TaxSwap;
                    }}
                    className="sandbox-batch__title sandbox-batch__title--gain"
                    title="§ 2b BEEG & BEEG § 2c(3) tax optimization rules — Click for quick popup · Ctrl+Click for full page"
                  >
                    <span>2. Tax classes</span>
                    <span
                      className="sandbox-inline-link"
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
                      className="sandbox-remove-btn sandbox-remove-btn--ghost"
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
                  className="sandbox-action-btn sandbox-action-btn--gain"
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
                className="sandbox-grid"
              >
                {/* ENTRY 1: Initial Baseline Tax Class Selection ($M1$ Precondition) */}
                <div
                  className="sandbox-card"
                >
                  <div>
                    <div
                      className="sandbox-card__heading sandbox-card__heading--gain"
                    >
                      <TaxClassSwapMilestoneIcon size={13} />
                      <span>Starting tax classes</span>
                    </div>
                    <div
                      className="sandbox-stack-sm"
                    >
                      <button
                        type="button"
                        aria-pressed={husbandInitialTaxClass.value === TaxClass.III && wifeInitialTaxClass.value === TaxClass.V && !useInitialTaxFactor.value}
                        onClick={() =>
                          setInitialTaxClasses(TaxClass.III, TaxClass.V, false)
                        }
                        className={`sandbox-choice-btn ${husbandInitialTaxClass.value === TaxClass.III && wifeInitialTaxClass.value === TaxClass.V && !useInitialTaxFactor.value ? "sandbox-choice-btn--active-gain" : ""}`}
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
                        className={`sandbox-choice-btn ${husbandInitialTaxClass.value === TaxClass.IV && wifeInitialTaxClass.value === TaxClass.IV && !useInitialTaxFactor.value ? "sandbox-choice-btn--active-gain" : ""}`}
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
                        className={`sandbox-choice-btn ${husbandInitialTaxClass.value === TaxClass.IV && wifeInitialTaxClass.value === TaxClass.IV && useInitialTaxFactor.value ? "sandbox-choice-btn--active-gain" : ""}`}
                      >
                        <span>Husband: IV / Wife: IV + factor (§ 39f)</span>
                        <span
                          className="sandbox-row sandbox-row--tight"
                        >
                          <span
                            className="sandbox-badge-mini"
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
                        className={`sandbox-choice-btn ${husbandInitialTaxClass.value === TaxClass.V && wifeInitialTaxClass.value === TaxClass.III && !useInitialTaxFactor.value ? "sandbox-choice-btn--active-gain" : ""}`}
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
                    className="sandbox-note"
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
                      className="sandbox-card sandbox-card--spaced"
                    >
                      <div>
                        <div
                          className="sandbox-card__header"
                        >
                          <span
                            className="sandbox-card__title-gain"
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
                            className="sandbox-remove-btn"
                          >
                            <RemoveItemIcon size={11} />
                          </button>
                        </div>

                        {/* Quick Presets for Target Tax Class Combination */}
                        <div
                          className="sandbox-grid-2 sandbox-grid-2--tight"
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
                            className={`sandbox-choice-btn sandbox-choice-btn--compact ${targetH === TaxClass.V && targetW === TaxClass.III && !useFac ? "sandbox-choice-btn--active-gain" : ""}`}
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
                            className={`sandbox-choice-btn sandbox-choice-btn--compact ${targetH === TaxClass.IV && targetW === TaxClass.IV && !useFac ? "sandbox-choice-btn--active-gain" : ""}`}
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
                            className={`sandbox-choice-btn sandbox-choice-btn--compact ${targetH === TaxClass.IV && targetW === TaxClass.IV && useFac ? "sandbox-choice-btn--active-gain" : ""}`}
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
                            className={`sandbox-choice-btn sandbox-choice-btn--compact ${targetH === TaxClass.III && targetW === TaxClass.V && !useFac ? "sandbox-choice-btn--active-gain" : ""}`}
                          >
                            III / V (Standard)
                          </button>
                        </div>

                        {/* Timing Controls */}
                        <div
                          className="sandbox-grid-2"
                        >
                          <div>
                            <label
                              className="sandbox-field-label sandbox-field-label--xs"
                            >
                              Effective ({getShortMonthLabel(sMonth)} ·{" "}
                              {getCalDate(sMonth)}):
                            </label>
                            <select
                              aria-label={`Switch ${idx + 1}: effective month`}
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
                              className="sandbox-select sandbox-select--spaced"
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
                                  {getRelativeMonthLabel(m)} · {getCalDate(m)}
                                </option>
                              ))}
                            </select>
                            <div
                              className="sandbox-text-gain-xs"
                            >
                              {getRelativeMonthLabel(sMonth)} · {getCalDate(sMonth)}
                            </div>
                          </div>
                          <div>
                            <label
                              className="sandbox-field-label sandbox-field-label--xs"
                            >
                              Revert ({getShortMonthLabel(rMonth)} ·{" "}
                              {getCalDate(rMonth)}):
                            </label>
                            <select
                              aria-label={`Switch ${idx + 1}: revert month`}
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
                              className="sandbox-select sandbox-select--spaced"
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
                                  {getRelativeMonthLabel(m)} · {getCalDate(m)}
                                </option>
                              ))}
                            </select>
                            <div
                              className="sandbox-text-warning-xs"
                            >
                              {getRelativeMonthLabel(rMonth)} · {getCalDate(rMonth)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        className="sandbox-note sandbox-note--box-flush"
                      >
                        ↳ {sw.statutoryReason}
                      </div>
                    </div>
                  );
                })}

                {/* Pure Derived Display: Automatic Tax Swap Take-Home (§ 38b, § 39f EStG) */}
                <div
                  className="sandbox-card sandbox-card--spaced"
                >
                  <div>
                    <div
                      className="sandbox-card__heading sandbox-card__heading--gain sandbox-card__heading--tight"
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
                      className="sandbox-note sandbox-note--bottom"
                    >
                      Estimated from the salaries and tax classes in this plan.
                    </div>

                    {/* Wife Optimized Class III FT Net */}
                    <div
                      className="sandbox-surface-box sandbox-surface-box--gain"
                    >
                      <div
                        className="sandbox-row--between-xs"
                      >
                        <span>Wife in class III:</span>
                        <strong
                          className="sandbox-val-tab--gain-sm"
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
                        className="sandbox-row--between-muted"
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
                        className="sandbox-text-gain-note"
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
                      className="sandbox-surface-box sandbox-surface-box--warning"
                    >
                      <div
                        className="sandbox-row--between-xs"
                      >
                        <span>Husband in Class V (During Swap):</span>
                        <strong
                          className="sandbox-val-tab--warning-sm"
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
                        className="sandbox-row--between-muted"
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
                      className="sandbox-surface-box sandbox-surface-box--flush"
                    >
                      <div
                        className="sandbox-row--between-xs"
                      >
                        <span>Class IV / IV (Standard Equal):</span>
                        <span
                          className="sandbox-val-tab--bold"
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
                        className="sandbox-row--between-gain"
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
                          className="sandbox-val-tab"
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
                    className="sandbox-surface-box sandbox-surface-box--row"
                  >
                    <span className="sandbox-text-secondary">
                      Combined Net Shift (Swap vs III/V):
                    </span>
                    <strong
                      className="sandbox-val-tab--ink"
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
              className="sandbox-batch"
            >
              <div
                className="sandbox-batch__header"
              >
                <div
                  className="sandbox-batch__title-group"
                >
                  <span
                    className="sandbox-batch__title sandbox-batch__title--warning"
                  >
                    3. Pay &amp; working hours
                  </span>
                  <span className="badge-warning">
                    {customWorkingHoursChanges.value.length} hour changes ·{" "}
                    {customSalaryRaises.value.length} pay changes
                  </span>
                </div>

                <div className="sandbox-row sandbox-row--wrap">
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
                    className="sandbox-action-btn sandbox-action-btn--primary"
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
                    className="sandbox-action-btn sandbox-action-btn--warning"
                  >
                    <AddActionIcon size={12} />
                    <span>+ Add Salary Change / Promotion</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Salaries & Career Controls Grid: Columns with Auto-Wrap */}
              <div
                className="sandbox-grid sandbox-grid--compact"
              >
                {/* ENTRY 1: Salary Cadence Switcher */}
                <div
                  className="sandbox-card"
                >
                  <div
                    className="sandbox-card__header"
                  >
                    <span
                      className="sandbox-inline-icon--secondary-sm"
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
                    className="sandbox-note sandbox-note--flush"
                  >
                    Controls slider units across husband and wife salaries.
                  </div>
                </div>

                {/* ENTRY 2: PRIMARY HUSBAND GROSS COMPENSATION & WORKING TIMES */}
                <div
                  className="sandbox-card"
                >
                  <div>
                    <div
                      className="sandbox-card__heading"
                    >
                      <EmploymentCompensationIcon size={13} />
                      <span>Husband Gross Compensation</span>
                    </div>
                    {/* Gross Amount */}
                    <div className="sandbox-mb-3">
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
                    <div className="sandbox-mb-3">
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
                    <div className="sandbox-mb-2">
                      <div className="sandbox-mb-1">
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
                          className="sandbox-surface-box sandbox-surface-box--stack"
                        >
                          <div
                            className="sandbox-text-muted-2xs"
                          >
                            13th Salary Distribution Ratio:
                          </div>
                          <div
                            className="sandbox-chip-wrap"
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
                                className={`sandbox-chip-btn ${husbandBonusPreset.value === preset.val ? "sandbox-chip-btn--active-primary" : ""}`}
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
                          className="sandbox-surface-box sandbox-surface-box--stack"
                        >
                          <div
                            className="sandbox-text-muted-2xs"
                          >
                            14th Salary Distribution:
                          </div>
                          <div
                            className="sandbox-chip-wrap"
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
                                className={`sandbox-chip-btn ${husbandBonusPreset.value === preset.val ? "sandbox-chip-btn--active-primary" : ""}`}
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
                          className="sandbox-surface-box sandbox-surface-box--stack"
                        >
                          <div
                            className="sandbox-text-muted-2xs"
                          >
                            15th Salary Distribution:
                          </div>
                          <div
                            className="sandbox-chip-wrap"
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
                                className={`sandbox-chip-btn ${husbandBonusPreset.value === preset.val ? "sandbox-chip-btn--active-primary" : ""}`}
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
                    className="sandbox-chip-wrap--top"
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
                  className="sandbox-card"
                >
                  <div>
                    <div
                      className="sandbox-card__heading sandbox-card__heading--wife"
                    >
                      <EmploymentCompensationIcon size={13} />
                      <span>Wife Pre-Pregnancy Full-Time Compensation</span>
                    </div>
                    {/* Full-Time Gross Amount */}
                    <div className="sandbox-mb-3">
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
                    <div className="sandbox-mb-3">
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
                    <div className="sandbox-mb-2">
                      <div className="sandbox-mb-1">
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
                          className="sandbox-surface-box sandbox-surface-box--stack"
                        >
                          <div
                            className="sandbox-text-muted-2xs"
                          >
                            13th Salary Distribution Ratio:
                          </div>
                          <div
                            className="sandbox-chip-wrap"
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
                                className={`sandbox-chip-btn ${wifeBonusPreset.value === preset.val ? "sandbox-chip-btn--active-wife" : ""}`}
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
                          className="sandbox-surface-box sandbox-surface-box--stack"
                        >
                          <div
                            className="sandbox-text-muted-2xs"
                          >
                            14th Salary Distribution:
                          </div>
                          <div
                            className="sandbox-chip-wrap"
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
                                className={`sandbox-chip-btn ${wifeBonusPreset.value === preset.val ? "sandbox-chip-btn--active-wife" : ""}`}
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
                          className="sandbox-surface-box sandbox-surface-box--stack"
                        >
                          <div
                            className="sandbox-text-muted-2xs"
                          >
                            15th Salary Distribution:
                          </div>
                          <div
                            className="sandbox-chip-wrap"
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
                                className={`sandbox-chip-btn ${wifeBonusPreset.value === preset.val ? "sandbox-chip-btn--active-wife" : ""}`}
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
                    className="sandbox-chip-wrap--top"
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
                  const preview = buildWorkingHoursSchedulePreview(
                    whc,
                    displayedCurrentScenarioData.value.months,
                    salaryPeriod.value,
                  );

                  return (
                    <div
                      key={whc.changeId || `hours-change-${idx}`}
                      className={`sandbox-card sandbox-card--spaced ${isWife ? "sandbox-card--wife" : isHusband ? "sandbox-card--husband" : ""}`}
                    >
                      <div>
                        {/* Header: Title & Delete Button */}
                        <div
                          className="sandbox-card__header"
                        >
                          <span
                            className={`sandbox-card__title-person ${isWife ? "sandbox-card__title-person--wife" : isHusband ? "sandbox-card__title-person--husband" : ""}`}
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
                            className="sandbox-remove-btn"
                          >
                            <RemoveItemIcon size={11} />
                          </button>
                        </div>

                        {/* Target Person & Effective Month Selectors */}
                        <div
                          className="sandbox-grid-2"
                        >
                          <div>
                            <label
                              className="sandbox-field-label sandbox-field-label--xs"
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
                              className="sandbox-input sandbox-input--regular"
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
                              className="sandbox-field-label sandbox-field-label--xs"
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
                              className="sandbox-input sandbox-input--regular"
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
                                  {getRelativeMonthLabel(m)} · {getCalDate(m)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Optional Day-Exact Effective Date (e.g. 28.12.2027 return from Elternzeit) */}
                        {(() => {
                          const firstOfMonthIso = buildIsoDate(
                            whc.effectiveCalendarYear,
                            whc.effectiveCalendarMonth,
                            1,
                          );
                          const datedPreg = [...customPregnancies.value]
                            .filter(
                              (p) =>
                                p.expectedDueDate !== undefined &&
                                p.calculatedDeliverySimulationMonth <= whc.effectiveSimulationMonth,
                            )
                            .sort(
                              (a, b) =>
                                b.calculatedDeliverySimulationMonth -
                                a.calculatedDeliverySimulationMonth,
                            )[0];
                          const lifeMonthStartIso = datedPreg?.expectedDueDate
                            ? buildIsoDate(
                              whc.effectiveCalendarYear,
                              whc.effectiveCalendarMonth,
                              Math.min(
                                parseIsoDateParts(datedPreg.expectedDueDate).day,
                                daysInCalendarMonth(
                                  whc.effectiveCalendarYear,
                                  whc.effectiveCalendarMonth,
                                ),
                              ),
                            )
                            : undefined;
                          return (
                            <div className="sandbox-mb-2">
                              <label
                                htmlFor={`whc-exact-date-${whc.changeId}`}
                                className="sandbox-field-label sandbox-field-label--xs"
                              >
                                Exact Effective Day (optional · day-prorated salary &amp; Life-Month check):
                              </label>
                              <input
                                id={`whc-exact-date-${whc.changeId}`}
                                type="date"
                                value={whc.effectiveDate ?? ""}
                                onChange={(e) => {
                                  const raw = (e.target as HTMLInputElement).value;
                                  if (!raw) {
                                    updateWorkingHoursChangeAction(whc.changeId, {
                                      effectiveDate: undefined,
                                    });
                                    return;
                                  }
                                  if (!isIsoCalendarDate(raw)) {
                                    return;
                                  }
                                  const iso = toIsoCalendarDate(raw);
                                  const parts = parseIsoDateParts(iso);
                                  const simMonth = Math.max(
                                    1,
                                    (parts.year - startCalendarYear.value) * 12 +
                                      (parts.month - startCalendarMonth.value) +
                                      1,
                                  );
                                  updateWorkingHoursChangeAction(whc.changeId, {
                                    effectiveDate: iso,
                                    effectiveSimulationMonth: toSimulationMonth(simMonth),
                                    effectiveCalendarYear: parts.year,
                                    effectiveCalendarMonth: parts.month,
                                  });
                                }}
                                className="sandbox-input sandbox-input--regular"
                              />
                              <div className="sandbox-chip-wrap sandbox-mt-1">
                                {lifeMonthStartIso && lifeMonthStartIso !== firstOfMonthIso && (
                                  <button
                                    type="button"
                                    className={`sandbox-chip-btn ${whc.effectiveDate === lifeMonthStartIso ? "sandbox-chip-btn--active-primary" : ""}`}
                                    title="Snap to exact BEEG Life-Month start day to avoid Elterngeld income overlap"
                                    onClick={() =>
                                      updateWorkingHoursChangeAction(whc.changeId, {
                                        effectiveDate: lifeMonthStartIso,
                                      })
                                    }
                                  >
                                    Life-Month Start ({formatGermanDate(lifeMonthStartIso)})
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className={`sandbox-chip-btn ${whc.effectiveDate === firstOfMonthIso ? "sandbox-chip-btn--active-primary" : ""}`}
                                  onClick={() =>
                                    updateWorkingHoursChangeAction(whc.changeId, {
                                      effectiveDate: firstOfMonthIso,
                                    })
                                  }
                                >
                                  1st ({formatGermanDate(firstOfMonthIso)})
                                </button>
                                {whc.effectiveDate && (
                                  <button
                                    type="button"
                                    className="sandbox-chip-btn"
                                    onClick={() =>
                                      updateWorkingHoursChangeAction(whc.changeId, {
                                        effectiveDate: undefined,
                                      })
                                    }
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Working Hours Exact Input & Slider */}
                        <div className="sandbox-mb-2">
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
                              if (newHours === 0) {
                                for (const preg of customPregnancies.value) {
                                  const patch: Partial<{
                                    motherAllowancePlanMode: AllowancePlanMode;
                                    fatherAllowancePlanMode: AllowancePlanMode;
                                  }> = {};
                                  if (
                                    !isHusband &&
                                    preg.motherAllowancePlanMode === undefined &&
                                    preg.motherAllowanceVariant === undefined
                                  ) {
                                    patch.motherAllowancePlanMode = AllowancePlanMode.Auto;
                                  }
                                  if (
                                    !isWife &&
                                    preg.fatherAllowancePlanMode === undefined &&
                                    preg.fatherAllowanceVariant === undefined
                                  ) {
                                    patch.fatherAllowancePlanMode = AllowancePlanMode.Auto;
                                  }
                                  if (Object.keys(patch).length > 0) {
                                    updatePregnancyAction(preg.pregnancyId, patch);
                                  }
                                }
                              }
                            }}
                          />
                        </div>

                        {/* Reason input */}
                        <div className="sandbox-mb-2">
                          <input
                            type="text"
                            value={whc.reason}
                            placeholder="Reason (e.g. Part-time return)"
                            onInput={(e) => {
                              updateWorkingHoursChangeAction(whc.changeId, {
                                reason: (e.target as HTMLInputElement).value,
                              });
                            }}
                            className="sandbox-input sandbox-input--regular"
                          />
                        </div>

                        {/* Statutory Corridor Validation Indicator */}
                        {hours > 32 ? (
                          <div
                            className="sandbox-alert-btn sandbox-alert-btn--loss"
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
                            className="sandbox-alert-btn sandbox-alert-btn--gain"
                            title="§ 4b BEEG Partnership Bonus rules and worked example — Click for quick popup · Ctrl+Click for full page"
                          >
                            <EligibilityConfirmedIcon size={11} />
                            <span>
                              Partnerschaftsbonus (§ 4b BEEG) OK (24–32h / 3–4d)
                            </span>
                            <StatutorySectionIcon size={10} />
                          </LawRefLink>
                        ) : hours === 0 ? (
                          <div className="sandbox-stack-sm">
                            <div
                              className="sandbox-alert-box--primary"
                            >
                              <InformationalNoticeIcon size={11} />
                              <span>
                                Full Parental Leave (0h / week · 100% leave · Basis or Plus)
                              </span>
                            </div>
                            {preview.inHorizon &&
                              preview.hasOrdinaryPlusPayment &&
                              !preview.hasBasisPayment && (
                              <button
                                type="button"
                                onClick={() => {
                                  const targets = preview.activeOrdinaryPregnancyId
                                    ? customPregnancies.value.filter(
                                      (preg) => preg.pregnancyId === preview.activeOrdinaryPregnancyId,
                                    )
                                    : customPregnancies.value;
                                  for (const preg of targets) {
                                    updatePregnancyAction(preg.pregnancyId, {
                                      ...(!isHusband
                                        ? {
                                          motherAllowancePlanMode: AllowancePlanMode.Auto,
                                          motherAllowanceMonthsCount: undefined,
                                        }
                                        : {}),
                                      ...(!isWife
                                        ? {
                                          fatherAllowancePlanMode: AllowancePlanMode.Auto,
                                        }
                                        : {}),
                                    });
                                  }
                                }}
                                className="sandbox-alert-btn sandbox-alert-btn--warning"
                              >
                                <StatutoryLimitationWarningIcon size={11} />
                                <span>
                                  0h leave is on ElterngeldPlus — Switch to Auto (Basiselterngeld up to 1.800 €/mo)
                                </span>
                              </button>
                            )}
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
                            className="sandbox-alert-btn sandbox-alert-btn--warning"
                            title="§ 4b BEEG corridor requirements — Click for quick popup · Ctrl+Click for full page"
                          >
                            <InformationalNoticeIcon size={11} />
                            <span>
                              Elterngeld eligible, outside PB corridor
                              (24–32h)
                            </span>
                            <StatutorySectionIcon size={10} />
                          </LawRefLink>
                        )}
                      </div>

                      {/* Engine-Simulated Effective Month Cash Flow Breakdown */}
                      <div
                        className="sandbox-surface-box sandbox-surface-box--stack"
                      >
                        {!preview.inHorizon ? (
                          <div className="sandbox-text-muted-2xs">
                            Effective month exceeds active simulation horizon (
                            {simulationDurationMonths.value} months).
                          </div>
                        ) : (
                          <>
                            <div className="sandbox-text-muted-2xs">
                              Simulated · {preview.calendarLabel} (
                              {preview.relativeMonthLabel})
                            </div>
                            <div
                              className="sandbox-row--between-meta"
                            >
                              <span>
                                {salaryPeriod.value === SalaryPeriod.Yearly
                                  ? "Annualized Gross:"
                                  : "Simulated Gross:"}
                              </span>
                              <strong
                                className="sandbox-val-tab"
                              >
                                {preview.grossAmount === undefined
                                  ? "Manual net mode"
                                  : `${formatCurrency(preview.grossAmount)}${preview.periodSuffix}`}
                              </strong>
                            </div>
                            <div
                              className="sandbox-row--between-meta"
                            >
                              <span>Take-Home Net:</span>
                              <strong
                                className="sandbox-val-tab"
                              >
                                {formatCurrency(preview.netAmount)}
                                {preview.periodSuffix}
                              </strong>
                            </div>
                            {preview.mutterschutzAmount > 0 && (
                              <div
                                className="sandbox-row--between-meta"
                              >
                                <span>Mutterschutz:</span>
                                <strong
                                  className="sandbox-val-tab--primary"
                                >
                                  +{formatCurrency(preview.mutterschutzAmount)}
                                  {preview.periodSuffix}
                                </strong>
                              </div>
                            )}
                            <div
                              className="sandbox-row--between-meta"
                            >
                              <span>{preview.elterngeldLabel}:</span>
                              {preview.elterngeldUnavailable ? (
                                <strong className="sandbox-val-tab--warning-sm">
                                  Unavailable
                                </strong>
                              ) : (
                                <strong
                                  className={
                                    preview.elterngeldAmount > 0
                                      ? "sandbox-val-tab--gain"
                                      : "sandbox-val-tab"
                                  }
                                >
                                  {preview.elterngeldAmount > 0 ? "+" : ""}
                                  {formatCurrency(preview.elterngeldAmount)}
                                  {preview.periodSuffix}
                                </strong>
                              )}
                            </div>
                            <div
                              className="sandbox-row--between-total"
                            >
                              <span>Total Inflow:</span>
                              <span
                                className="sandbox-val-tab--gain"
                              >
                                {formatCurrency(preview.totalInflow)}
                                {preview.periodSuffix}
                              </span>
                            </div>
                          </>
                        )}
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
              className="sandbox-batch"
            >
              <div
                className="sandbox-batch__header"
              >
                <div
                  className="sandbox-batch__title-group"
                >
                  <span
                    className="sandbox-batch__title"
                  >
                    4. Other income &amp; costs
                  </span>
                  <span className="badge-neutral">
                    {customFinancialEvents.value.length} events
                  </span>
                </div>

                {/* Add Cost and Inflow Buttons */}
                <div className="sandbox-row sandbox-row--wrap">
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
                    className="sandbox-action-btn sandbox-action-btn--loss"
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
                    className="sandbox-action-btn sandbox-action-btn--gain"
                  >
                    <AddActionIcon size={12} />
                    <span>Add Inflow (+1.500 €)</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Financial Events Auto-Wrapping Columns */}
              <div
                className="sandbox-grid"
              >
                {/* ENTRY 1: Standing Recurring Inflows (13th Month, Bonus, Capital Returns) */}
                <div
                  className="sandbox-card"
                >
                  <div>
                    <div
                      className="sandbox-card__heading sandbox-card__heading--mother"
                    >
                      <FinancialInflowIcon size={13} />
                      <span>Standing Recurring Inflow Channels</span>
                    </div>

                    {/* Extra Salaries & Bonus Summary Badge */}
                    <div
                      className="sandbox-surface-box sandbox-surface-box--header-row"
                    >
                      <span
                        className="sandbox-text-secondary-sm"
                      >
                        13th-15th Salaries:
                      </span>
                      <span
                        className="sandbox-text-primary-xs"
                      >
                        Husband: {husbandSalariesCount.value}x | Wife:{" "}
                        {wifeSalariesCount.value}x
                      </span>
                    </div>

                    {/* Annual Performance Bonus */}
                    <div className="sandbox-mb-2">
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
                          className="sandbox-row--between-top"
                        >
                          <span
                            className="sandbox-note sandbox-note--flush"
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
                            className="sandbox-select sandbox-input--tiny-select"
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
                    className="sandbox-note"
                  >
                    Examples include dividends, rent, and ETF income (
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
                      className={`sandbox-card ${isCost ? "sandbox-card--loss" : "sandbox-card--gain"}`}
                    >
                      <div>
                        <div
                          className="sandbox-card__header"
                        >
                          <div
                            className="sandbox-row"
                          >
                            <span className={`${isCost ? "badge-loss" : "badge-gain"} sandbox-inline-icon`}>
                              <FinancialInflowIcon size={11} />
                              <span>{isCost ? "COST" : "INFLOW"}</span>
                            </span>
                            <span
                              className={`sandbox-card__title-event ${isCost ? "sandbox-card__title-event--loss" : ""}`}
                            >
                              {fe.title}
                            </span>
                          </div>
                          <div
                            className="sandbox-row"
                          >
                            <span
                              className={`sandbox-card__amount ${isCost ? "sandbox-card__amount--loss" : ""}`}
                            >
                              {formatCurrency(fe.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removeFinancialEventAction(fe.eventId)
                              }
                              className="sandbox-remove-btn"
                            >
                              <RemoveItemIcon size={11} />
                            </button>
                          </div>
                        </div>
                        <div
                          className="sandbox-row--between-xs"
                        >
                          <span>
                            Effective:{" "}
                            <strong
                              className={isCost ? "sandbox-text-loss" : "sandbox-text-gain"}
                            >
                              {getRelativeMonthLabel(sMonth)} · {getCalDate(sMonth)}
                            </strong>
                          </span>
                          <span
                            className="sandbox-text-muted-xs"
                          >
                            {fe.category}
                          </span>
                        </div>
                      </div>
                      <div
                        className="sandbox-note sandbox-note--box"
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
              className="sandbox-batch"
            >
              <div
                className="sandbox-batch__header"
              >
                <div
                  className="sandbox-batch__title-row"
                >
                  <span
                    className="sandbox-batch__title"
                  >
                    Starting conditions &amp; forecast period
                  </span>
                </div>
                <span
                  className="sandbox-batch__pill"
                >
                  Start: {getRelativeMonthLabel(1)} ({getCalDate(1)}) · {simulationDurationMonths.value}M
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
                className="sandbox-grid sandbox-grid--compact"
              >
                {/* ENTRY 1: Forecast Start Date & Horizon */}
                <div
                  className="sandbox-card"
                >
                  <div>
                    <div
                      className="sandbox-row--between-sm"
                    >
                      <span
                        className="sandbox-inline-icon--secondary"
                      >
                        <SimulationPeriodIcon size={12} />
                        <span>Forecast Period &amp; Horizon:</span>
                      </span>
                      <span
                        className="sandbox-val-tab--primary"
                      >
                        {getRelativeMonthLabel(1)} ({getCalDate(1)}) →{" "}
                        {getRelativeMonthLabel(endSimMonth)} ({getCalDate(endSimMonth)}) ·{" "}
                        {simulationDurationMonths.value}M
                      </span>
                    </div>
                    <div
                      className="sandbox-grid-2-1"
                    >
                      <select
                        aria-label="Forecast start month"
                        value={startCalendarMonth.value}
                        onChange={(e) => {
                          startCalendarMonth.value = toCalendarMonth(
                            Number((e.target as HTMLSelectElement).value),
                          );
                        }}
                        className="sandbox-input sandbox-input--inline"
                      >
                        {MONTH_NAMES.map((name, idx) => (
                          <option key={`start-m-${idx + 1}`} value={idx + 1}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="Forecast start year"
                        value={startCalendarYear.value}
                        onChange={(e) => {
                          startCalendarYear.value = toFullCalendarYear(
                            Number((e.target as HTMLSelectElement).value),
                          );
                        }}
                        className="sandbox-input sandbox-input--inline"
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
                    className="sandbox-chip-wrap"
                  >
                    {[12, 24, 36, 48, 60, 72, 84, 96, 100, 108, 120].map(
                      (dur) => (
                        <button
                          key={`dur-btn-${dur}`}
                          type="button"
                          aria-label={`${dur} months`}
                          aria-pressed={simulationDurationMonths.value === dur}
                          onClick={() => {
                            simulationDurationMonths.value =
                              toMonthDuration(dur);
                          }}
                          className={`sandbox-duration-btn ${simulationDurationMonths.value === dur ? "sandbox-duration-btn--active" : ""}`}
                        >
                          {dur}M
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {/* ENTRY 2: Preconditions Baseline Summary Card */}
                <div
                  className="sandbox-card"
                >
                  <div>
                    <div
                      className="sandbox-card__heading"
                    >
                      <InformationalNoticeIcon size={13} />
                      <span>Conditions at simulation start</span>
                    </div>
                    <div
                      className="sandbox-surface-box sandbox-surface-box--summary"
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
                    className="sandbox-note"
                  >
                    Values at the start of the forecast.
                    Defaults to 0 if unreported.
                  </div>
                </div>

                {/* ENTRY 3: Kindergeld Rate */}
                <div
                  className="sandbox-card"
                >
                  <div>
                    <div
                      className="sandbox-row--between-sm-tight"
                    >
                      <LawRefLink
                        lawId={LEGAL_RULE_LAW_MAP[LegalRuleKey.EStG_Kindergeld].lawId}
                        groupId={LEGAL_RULE_LAW_MAP[LegalRuleKey.EStG_Kindergeld].groupId}
                        variant="plain"
                        onOpen={() => {
                          activeLegalRuleKey.value = LegalRuleKey.EStG_Kindergeld;
                        }}
                        className="sandbox-law-heading"
                        title="§ 66 EStG Kindergeld legal rule & example — Click for quick popup · Ctrl+Click for full page"
                      >
                        <span>Kindergeld</span>
                        <span
                          className="sandbox-inline-link sandbox-inline-link--primary"
                        >
                          <span>(§ 66 EStG)</span>
                          <StatutorySectionIcon size={10} />
                        </span>
                        :
                      </LawRefLink>
                      <span
                        className="sandbox-val-tab--loss"
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
                    className="sandbox-note"
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
                  className="sandbox-card"
                >
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setShowDeductionsBreakdown(!showDeductionsBreakdown)
                      }
                      className="sandbox-disclosure-btn"
                    >
                      <span
                        className="sandbox-inline-icon--bold"
                      >
                        <SimulatorNavigationIcon size={12} />
                        <span>Tax &amp; Social Deductions</span>
                      </span>
                      <span
                        className="sandbox-inline-icon"
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
                        className="sandbox-surface-box sandbox-surface-box--detail"
                      >
                        <div
                          className="sandbox-text-primary-label"
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
                          className="sandbox-grid-2 sandbox-grid-2--mini"
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
                          className="sandbox-text-wife-label"
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
                          className="sandbox-grid-2 sandbox-grid-2--mini-flush"
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
                        className="sandbox-note sandbox-note--padded"
                      >
                        View granular statutory social insurance (BBG) and wage
                        tax allocations.
                      </div>
                    )}
                  </div>
                </div>

                {/* ENTRY 5: Prior Living Children (Pre-Simulation) */}
                <div
                  className="sandbox-card"
                >
                  <div>
                    <div
                      className="sandbox-row--between-sm"
                    >
                      <span
                        className="sandbox-inline-icon--secondary"
                      >
                        <ChildBirthMilestoneIcon size={12} />
                        <span>Children before the plan:</span>
                      </span>
                      <span
                        className="sandbox-val-tab--primary"
                      >
                        {existingChildrenCount.value}{" "}
                        {existingChildrenCount.value === 1 ? "child" : "children"}
                      </span>
                    </div>
                    <div
                      className="sandbox-row"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExistingChildrenCount(existingChildrenCount.value - 1)
                        }
                        disabled={existingChildrenCount.value <= 0}
                        aria-label="Decrease prior living children"
                        className="sandbox-stepper-btn"
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
                        className="sandbox-input sandbox-input--counter"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setExistingChildrenCount(existingChildrenCount.value + 1)
                        }
                        disabled={existingChildrenCount.value >= 10}
                        aria-label="Increase prior living children"
                        className="sandbox-stepper-btn"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div
                    className={`sandbox-note sandbox-note--md ${existingChildrenCount.value > 0 ? "sandbox-note--warning" : ""}`}
                  >
                    {existingChildrenCount.value > 0 ? (
                      <>
                        ↳ Kindergeld (<LawRefLink lawId={LawId.EStG_66} label="§ 66 EStG" />),{" "}
                        SGB XI care discount (<LawRefLink lawId={LawId.SGB11_55} label="§ 55 SGB XI" />),{" "}
                        and tax allowances scale for {existingChildrenCount.value} prior child(ren).{" "}
                        <LawRefLink lawId={LawId.BEEG_2a} label="§ 2a BEEG" /> sibling bonus requires modeled birth ages.
                      </>
                    ) : (
                      <>
                        Enter existing children here, or add pregnancies above for automatic{" "}
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
                      className="sandbox-card"
                    >
                      <div>
                        <div
                          className="sandbox-row--between-sm"
                        >
                          <label
                            className="sandbox-check-label"
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
                          className="sandbox-select sandbox-select--regular sandbox-select--spaced-md"
                        >
                          {presets.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.label}
                            </option>
                          ))}
                          <option value={FederalStateKitaPresetId.Custom}>
                            Custom Monthly Fee Per Child
                          </option>
                        </select>

                        {selectedPreset?.bookingHourTiers && (
                          <select
                            id="kita-booking-hours-select"
                            aria-label="Daily Booking Hours"
                            value={kita.bookingHoursTier ?? DaycareBookingHoursTier.H8_9}
                            disabled={!kita.enabled}
                            onChange={(e) =>
                              updateChildcarePlan({
                                bookingHoursTier: toDaycareBookingHoursTier(
                                  (e.target as HTMLSelectElement).value,
                                ),
                              })
                            }
                            className="sandbox-select sandbox-select--regular sandbox-select--spaced-md"
                          >
                            <option value={DaycareBookingHoursTier.H3_4}>
                              3–4 hrs/day (Krippe €0–€145/mo)
                            </option>
                            <option value={DaycareBookingHoursTier.H4_5}>
                              4–5 hrs/day (Krippe €0–€162/mo)
                            </option>
                            <option value={DaycareBookingHoursTier.H5_6}>
                              5–6 hrs/day (Krippe €0–€179/mo)
                            </option>
                            <option value={DaycareBookingHoursTier.H6_7}>
                              6–7 hrs/day (Krippe €0–€196/mo)
                            </option>
                            <option value={DaycareBookingHoursTier.H7_8}>
                              7–8 hrs/day (Krippe €0–€213/mo)
                            </option>
                            <option value={DaycareBookingHoursTier.H8_9}>
                              8–9 hrs/day (Krippe €0–€230/mo · Standard)
                            </option>
                            <option value={DaycareBookingHoursTier.Over9}>
                              &gt; 9 hrs/day (Krippe €0–€250/mo)
                            </option>
                          </select>
                        )}

                        {selectedPreset && selectedPreset.defaultMonthlyMealFee > 0 && (
                          <div className="sandbox-row--between-sm">
                            <label className="sandbox-check-label">
                              <input
                                id="kita-meal-fees-toggle"
                                type="checkbox"
                                disabled={!kita.enabled}
                                checked={Boolean(kita.includeMealFees)}
                                onChange={(e) =>
                                  updateChildcarePlan({
                                    includeMealFees: (e.target as HTMLInputElement).checked,
                                  })
                                }
                              />
                              <span>
                                Include Verpflegungsgeld (€{selectedPreset.defaultMonthlyMealFee}/mo · non-deductible)
                              </span>
                            </label>
                          </div>
                        )}

                        {kita.presetId === FederalStateKitaPresetId.Custom && (
                          <div
                            className="sandbox-row--between-field"
                          >
                            <span className="sandbox-text-secondary">
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
                              className="sandbox-input sandbox-input--compact-num"
                            />
                          </div>
                        )}

                        <div
                          className="sandbox-grid-2 sandbox-grid-2--flush"
                        >
                          <label
                            className="sandbox-stack-xs"
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
                              className="sandbox-input sandbox-input--inline"
                            />
                          </label>
                          <label
                            className="sandbox-stack-xs"
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
                              className="sandbox-input sandbox-input--inline"
                            />
                          </label>
                        </div>
                      </div>
                      <div
                        className="sandbox-note sandbox-note--md"
                      >
                        {selectedPreset?.id === FederalStateKitaPresetId.BavariaMunich ? (
                          <>
                            ↳ Official Munich Kita-Gebührensatzung (S580, effective 31.08.2024): Krippe (0–3 yrs) income-tiered (≤50k €0, ≤60k €100, ≤70k..&gt;80k by hours); Kindergarten (3–6 yrs) €0 net care fee after €100 BayKiBiG subsidy; 2nd child drops 1 bracket, 3rd+ child €0. Core care fees &amp; Batch 4 Childcare events flow into annual § 10(1)5 EStG tax refunds (80%, max €4,800/child from 2025); meal fees &amp; Baby Equipment are non-deductible.
                          </>
                        ) : (
                          <>
                            ↳ {selectedPreset
                              ? `${selectedPreset.federalState}: sibling discount ${Math.round(selectedPreset.siblingDiscountRateSecondChild * 100)}% (2nd)${selectedPreset.feeFreeFromAgeMonths !== null ? `, fee-free from age ${selectedPreset.feeFreeFromAgeMonths}mo` : ""}.`
                              : "Flat monthly rate per active child."}{" "}
                            Core care fees &amp; Batch 4 Childcare events flow into annual § 10(1)5 EStG tax refunds (80%, max €4,800/child from 2025); meal fees &amp; Baby Equipment are non-deductible.
                          </>
                        )}
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
                      className="sandbox-card"
                    >
                      <div>
                        <div
                          className="sandbox-row--between-sm"
                        >
                          <span
                            className="sandbox-text-secondary-bold"
                          >
                            Inflation &amp; Purchasing Power
                          </span>
                          <LawRefLink
                            lawId={LawId.InflG}
                            label="InflG / § 32a EStG"
                          />
                        </div>

                        <div
                          className="sandbox-grid-3"
                        >
                          <label
                            className="sandbox-stack-xs"
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
                              className="sandbox-input sandbox-input--inline"
                            />
                          </label>
                          <label
                            className="sandbox-stack-xs"
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
                              className="sandbox-input sandbox-input--inline"
                            />
                          </label>
                          <label
                            className="sandbox-stack-xs"
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
                              className="sandbox-input sandbox-input--inline"
                            />
                          </label>
                        </div>

                        <label
                          className="sandbox-check-label sandbox-check-label--sm"
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
                        className="sandbox-note sandbox-note--md"
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
