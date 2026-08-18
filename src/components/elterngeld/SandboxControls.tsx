import type { JSX } from "preact";
import { useState } from "preact/hooks";
import {
  salaryInputMode,
  salaryPeriod,
  husbandGross,
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
  setSalaryInputMode,
  setSalaryPeriod,
  derivedSpousalSet,
  husbandClass3Net,
  husbandClass5Net,
  husbandHours,
  wifeClass5FullTimeNet,
  wifeClass3FullTimeNet,
  wifeClass5PartTimeNet,
  wifeClass3PartTimeNet,
  wifeInitialHours,
  wifePostBirthHours,
  kindergeldPerChild,
  enable13thSalary,
  bonus40Month,
  bonus60Month,
  taxReturnMonth,
  enableSalaryRaises,
  annualSalaryRaisePercent,
  startCalendarYear,
  startCalendarMonth,
  simulationDurationMonths,
  prePregnancyPlanningMonths,
  child1BirthMonth,
  birthSpacingMonths,
  swapLeadMonths,
  setPregnancy1PositiveDate,
  customPregnancies,
  customTaxClassSwitches,
  customSalaryRaises,
  customWorkingHoursChanges,
  customFinancialEvents,
  addPregnancyAction,
  updatePregnancyAction,
  removePregnancyAction,
  addTaxClassSwitchAction,
  updateTaxClassSwitchAction,
  removeTaxClassSwitchAction,
  addSalaryRaiseAction,
  removeSalaryRaiseAction,
  addWorkingHoursChangeAction,
  updateWorkingHoursChangeAction,
  removeWorkingHoursChangeAction,
  addFinancialEventAction,
  removeFinancialEventAction,
  updateFinancialEventAction,
  resetToDefaults,
  openExportImportModal,
  scrollToLegalRule,
  LegalRuleKey,
} from "#store/elterngeldStore";
import {
  TaxClass,
  toTaxClass,
  TargetPerson,
  FinancialEventCategory,
  SalaryInputMode,
  SalaryPeriod,
  toSalaryInputMode,
  toSimulationMonth,
  toCalendarMonth,
  toEuroAmount,
  toNetSalary,
  toWorkingHours,
  toFullCalendarYear,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  toHoursChangeId,
  toFinancialEventId,
  type WorkingHoursChangeAction,
  type TaxClassSwitchAction,
  type MonthId,
  type MonthRef,
  type MonthSimRef,
  toMonthId,
  toMonthRef,
  toMonthSimRef,
} from "#engine/types";
import { getDefaultPersistedState } from "#engine/storage/persistence";
import scenarioPresetsData from "../../data/scenarioPresets.json" with { type: "json" };

export interface ScenarioPresetConfig {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly useDefaultReset?: boolean;
  readonly salaryInputMode?: string;
  readonly husbandGross?: number;
  readonly wifeGross?: number;
  readonly wifeInitialHours?: number;
  readonly wifePostBirthHours?: number;
  readonly prePregnancyPlanningMonths?: number;
  readonly child1BirthMonth?: number;
  readonly birthSpacingMonths?: number;
  readonly swapLeadMonths?: number;
}

export type ScenarioPresetsMap = Record<string, ScenarioPresetConfig>;

const SCENARIO_PRESETS: ScenarioPresetsMap =
  scenarioPresetsData satisfies ScenarioPresetsMap;
import {
  ConfigureSandboxIcon,
  SimulationPeriodIcon,
  ChildBirthMilestoneIcon,
  EmploymentCompensationIcon,
  TaxClassSwapMilestoneIcon,
  CareerPromotionMilestoneIcon,
  FinancialInflowIcon,
  AddActionIcon,
  RemoveItemIcon,
  EligibilityConfirmedIcon,
  StatutoryLimitationWarningIcon,
  ExternalLegalSourceIcon,
  ExpandSectionIcon,
  CollapseSectionIcon,
  SimulatorNavigationIcon,
  ResetDefaultsIcon,
  InformationalNoticeIcon,
  ImportDataIcon,
  DownloadFileIcon,
} from "#components/Icons";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
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

const INITIAL_TAX_OPTIONS: {
  value: TaxClass;
  label: string;
  desc: string;
}[] = [
  {
    value: TaxClass.III,
    label: "Class III (Primary Earner)",
    desc: "Optimizes net pay for higher earner (partner in Class V)",
  },
  {
    value: TaxClass.IV,
    label: "Class IV (Equal / Standard)",
    desc: "Standard equal withholding without factor",
  },
  {
    value: TaxClass.V,
    label: "Class V (Secondary Earner)",
    desc: "Higher withholding for secondary earner (partner in Class III)",
  },
];

export default function SandboxControls(): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [showDeductionsBreakdown, setShowDeductionsBreakdown] =
    useState<boolean>(false);

  // Helper to compute calendar date for simulation month offset (e.g. 09.2026)
  const getCalDate = (simMonth: number): string => {
    const totalElapsed = startCalendarMonth.value - 1 + (simMonth - 1);
    const m = (totalElapsed % 12) + 1;
    const y = startCalendarYear.value + Math.floor(totalElapsed / 12);
    return `${String(m).padStart(2, "0")}.${y}`;
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

  // Helper to compute pregnancy-relative month label (e.g. M-8, M1 (Pregnancy Positive), M9 (Birth 1), M12)
  const getRelativeMonthLabel = (simMonth: number): MonthRef => {
    const p1 =
      (customPregnancies.value[0]?.positiveTestSimulationMonth as number) ??
      Math.max(
        1,
        ((customPregnancies.value[0]
          ?.calculatedDeliverySimulationMonth as number) ?? 12) - 8,
      );
    const d1 =
      (customPregnancies.value[0]
        ?.calculatedDeliverySimulationMonth as number) ?? 12;
    const d2 =
      (customPregnancies.value[1]
        ?.calculatedDeliverySimulationMonth as number) ?? 999;

    if (simMonth < p1) {
      return toMonthRef(simMonth - p1);
    }
    const idx = simMonth - p1 + 1;
    if (simMonth === p1) return toMonthRef(idx, "Pregnancy Positive");
    if (simMonth === d1) return toMonthRef(idx, "Birth 1");
    if (simMonth === d2) return toMonthRef(idx, "Birth 2");
    return toMonthRef(idx);
  };

  // Helper for short relative month label (e.g. M-8, M1, M9, M12)
  const getShortMonthLabel = (simMonth: number): MonthRef => {
    const p1 =
      (customPregnancies.value[0]?.positiveTestSimulationMonth as number) ??
      Math.max(
        1,
        ((customPregnancies.value[0]
          ?.calculatedDeliverySimulationMonth as number) ?? 12) - 8,
      );
    if (simMonth < p1) {
      return toMonthRef(simMonth - p1);
    }
    return toMonthRef(simMonth - p1 + 1);
  };

  // Preset Handlers
  const applyPreset = (presetKey: string): void => {
    const preset = SCENARIO_PRESETS[presetKey];
    if (!preset) return;

    if (preset.useDefaultReset) {
      resetToDefaults();
      return;
    }

    if (preset.salaryInputMode) {
      try {
        setSalaryInputMode(toSalaryInputMode(preset.salaryInputMode));
      } catch {
        setSalaryInputMode(SalaryInputMode.Gross);
      }
    }
    if (preset.husbandGross !== undefined) {
      setHusbandGross(preset.husbandGross);
    }
    if (preset.wifeGross !== undefined) {
      setWifeGross(preset.wifeGross);
    }
    if (preset.wifeInitialHours !== undefined) {
      setWifeInitialHours(preset.wifeInitialHours);
    }
    if (preset.wifePostBirthHours !== undefined) {
      setWifePostBirthHours(preset.wifePostBirthHours);
    }
    if (preset.prePregnancyPlanningMonths !== undefined) {
      prePregnancyPlanningMonths.value = preset.prePregnancyPlanningMonths;
    }
    if (preset.child1BirthMonth !== undefined) {
      child1BirthMonth.value = toSimulationMonth(preset.child1BirthMonth);
    }
    if (preset.birthSpacingMonths !== undefined) {
      birthSpacingMonths.value = preset.birthSpacingMonths;
    }
    if (preset.swapLeadMonths !== undefined) {
      swapLeadMonths.value = preset.swapLeadMonths;
    }
  };

  const endSimMonth = simulationDurationMonths.value;

  return (
    <div
      className="glass-panel"
      style={{ padding: "22px", marginBottom: "28px" }}
    >
      {/* Header with Collapsible Toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              background: "var(--color-primary-bg)",
              padding: "8px",
              borderRadius: "var(--border-radius-sm)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ConfigureSandboxIcon size={20} />
          </div>
          <div>
            <h3
              style={{
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Discrete Batch Action Sandbox & Simulation Runner
            </h3>
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                margin: "2px 0 0 0",
              }}
            >
              Configured via discrete batches: 1. Pregnancy Decisions → 2. Tax
              Switches → 3. Salary Raises → 4. Financial Events → 0. Preexisting
              Baseline &amp; Parameters
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--color-primary)",
              fontWeight: 600,
            }}
          >
            {isOpen ? "Collapse ▴" : "Expand ▾"}
          </span>
        </div>
      </div>

      {isOpen && (
        <div
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
                  fontSize: "0.76rem",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                Scenario Presets:
              </span>
              {Object.values(SCENARIO_PRESETS).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "4px",
                    border:
                      preset.id === "default"
                        ? "1px solid var(--color-primary-border)"
                        : "1px solid var(--border-subtle)",
                    background: "var(--bg-surface)",
                    color:
                      preset.id === "default"
                        ? "var(--color-primary)"
                        : "var(--text-primary)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => openExportImportModal("export")}
                id="export-data-btn"
                style={{
                  padding: "4px 12px",
                  borderRadius: "4px",
                  border: "1px solid var(--color-primary-border)",
                  background: "var(--color-primary-bg)",
                  color: "var(--color-primary)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <DownloadFileIcon size={13} />
                Export Data
              </button>

              <button
                type="button"
                onClick={() => openExportImportModal("import")}
                id="import-data-btn"
                style={{
                  padding: "4px 12px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <ImportDataIcon size={13} />
                Import Data
              </button>

              <button
                type="button"
                onClick={resetToDefaults}
                style={{
                  padding: "4px 12px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <ResetDefaultsIcon size={13} />
                Reset to Defaults
              </button>
            </div>
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
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "0.92rem",
                      color: "var(--color-loss)",
                    }}
                  >
                    1. Pregnancy Positive Decisions &amp; Milestones
                  </span>
                  <span className="badge-loss">
                    {customPregnancies.value.length} Pregnancies Active
                  </span>
                </div>

                {/* Add Pregnancy Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    const count = customPregnancies.value.length;
                    const lastPreg = customPregnancies.value[count - 1];
                    const lastDeliv =
                      lastPreg.calculatedDeliverySimulationMonth as number;
                    const newSimMonth = Math.min(
                      simulationDurationMonths.value - 10,
                      lastDeliv + 19,
                    );

                    const totalElapsed =
                      startCalendarMonth.value - 1 + (newSimMonth - 1);
                    const calMonth = toCalendarMonth((totalElapsed % 12) + 1);
                    const calYear =
                      startCalendarYear.value + Math.floor(totalElapsed / 12);

                    const defs = getDefaultPersistedState();
                    addPregnancyAction({
                      pregnancyId: toPregnancyId(`PREG-CUSTOM-${count + 1}`),
                      childIndex: count + 1,
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
                      fatherPartnerMonthsCount:
                        defs.customPregnancies[0]?.fatherPartnerMonthsCount ??
                        4,
                    });
                  }}
                  style={{
                    padding: "5px 12px",
                    background: "var(--color-loss-bg)",
                    color: "var(--color-loss)",
                    border: "1px solid var(--color-loss-border)",
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
                    Add Pregnancy (Child #{customPregnancies.value.length + 1})
                  </span>
                </button>
              </div>

              {/* Dynamic Pregnancies Auto-Wrapping Columns */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
                  gap: "14px",
                }}
              >
                {customPregnancies.value.map((preg, idx) => {
                  const pSimMonth = preg.positiveTestSimulationMonth as number;
                  const dSimMonth =
                    preg.calculatedDeliverySimulationMonth as number;
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
                          {customPregnancies.value.length > 1 && (
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
                          )}
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
                                  Positive Month:
                                </label>
                                <select
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
                                      {name.slice(0, 14)}
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
                                  Positive Year:
                                </label>
                                <select
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
                                    2031, 2032,
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
                                <strong style={{ color: "var(--color-loss)" }}>
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
                                  Positive Month:
                                </label>
                                <select
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
                                      {name.slice(0, 14)}
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
                                  Positive Year:
                                </label>
                                <select
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
                                    2031, 2032,
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
                                <strong style={{ color: "var(--color-loss)" }}>
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
                                    ((customPregnancies.value[idx - 1]
                                      ?.calculatedDeliverySimulationMonth as number) ||
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
                                ((customPregnancies.value[idx - 1]
                                  ?.calculatedDeliverySimulationMonth as number) ||
                                  0) <
                              36 ? (
                                <>
                                  <EligibilityConfirmedIcon size={11} />
                                  <span>
                                    Sibling Bonus (+10%) eligible (
                                    {dSimMonth -
                                      ((customPregnancies.value[idx - 1]
                                        ?.calculatedDeliverySimulationMonth as number) ||
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
                                      ((customPregnancies.value[idx - 1]
                                        ?.calculatedDeliverySimulationMonth as number) ||
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
                            <strong>01.{startCalendarYear.value}</strong> (
                            {prePregnancyPlanningMonths.value}M planning before
                            pregnancy)
                          </>
                        ) : (
                          <>
                            ↳ Assessment period based on prior 12-month net
                            earnings (§ 2b BEEG).
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                  }}
                >
                  <button
                    type="button"
                    onClick={() => scrollToLegalRule(LegalRuleKey.BEEG_TaxSwap)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: "0.92rem",
                      color: "var(--color-gain)",
                      textAlign: "left",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    title="Click to view § 2b BEEG & BFH VI R 2/13 tax optimization rules"
                  >
                    <span>2. Tax Classes &amp; Strategy</span>
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
                      <ExternalLegalSourceIcon size={10} />
                    </span>
                  </button>
                  <span className="badge-gain">
                    {customTaxClassSwitches.value.length} Switches Active
                  </span>
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
                      (nextChild?.calculatedDeliverySimulationMonth as number) ||
                      child1BirthMonth.value + birthSpacingMonths.value;
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
                      <span>Initial Baseline Tax Class ($M1$)</span>
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
                        onClick={() =>
                          setInitialTaxClasses(TaxClass.III, TaxClass.V, false)
                        }
                        style={{
                          padding: "5px 8px",
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
                        <span>H: Class III / W: Class V (Standard)</span>
                        {husbandInitialTaxClass.value === TaxClass.III &&
                          wifeInitialTaxClass.value === TaxClass.V &&
                          !useInitialTaxFactor.value && (
                            <EligibilityConfirmedIcon size={12} />
                          )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setInitialTaxClasses(TaxClass.IV, TaxClass.IV, false)
                        }
                        style={{
                          padding: "5px 8px",
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
                        <span>H: Class IV / W: Class IV (Equal)</span>
                        {husbandInitialTaxClass.value === TaxClass.IV &&
                          wifeInitialTaxClass.value === TaxClass.IV &&
                          !useInitialTaxFactor.value && (
                            <EligibilityConfirmedIcon size={12} />
                          )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setInitialTaxClasses(TaxClass.IV, TaxClass.IV, true)
                        }
                        style={{
                          padding: "5px 8px",
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
                        <span>H: IV / W: IV + Factor (§ 39f)</span>
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
                        onClick={() =>
                          setInitialTaxClasses(TaxClass.V, TaxClass.III, false)
                        }
                        style={{
                          padding: "5px 8px",
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
                        <span>H: Class V / W: Class III (Inverted)</span>
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
                    ↳ Precondition: baseline tax class pairing before pregnancy
                    switches.
                  </div>
                </div>

                {/* Dynamic Switch Cards */}
                {customTaxClassSwitches.value.map((sw, idx) => {
                  const sMonth = sw.effectiveSimulationMonth as number;
                  const rMonth = sw.revertSimulationMonth as number;
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
                          {customTaxClassSwitches.value.length > 1 && (
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
                          )}
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
                            <input
                              type="range"
                              min="1"
                              max="60"
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
                              {getCalDate(sMonth)} (
                              {getRelativeMonthLabel(sMonth)}) ·{" "}
                              {getMonthId(sMonth)} · {getMonthSimRef(sMonth)}
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
                            <input
                              type="range"
                              min="1"
                              max="60"
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
                              {getCalDate(rMonth)} (
                              {getRelativeMonthLabel(rMonth)}) ·{" "}
                              {getMonthId(rMonth)} · {getMonthSimRef(rMonth)}
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
                        Automatic Tax Take-Home & Factor (§ 38b, § 39f EStG)
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.64rem",
                        color: "var(--text-muted)",
                        marginBottom: "8px",
                      }}
                    >
                      Derived automatically from Batch 3 Gross Compensations via
                      German progressive wage tax formulas.
                    </div>

                    {/* Wife Optimized Class III FT Net */}
                    <div
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
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
                        <span>Wife in Class III (Swap Boost):</span>
                        <strong
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            color: "var(--color-gain)",
                            fontSize: "0.76rem",
                          }}
                        >
                          {formatCurrency(
                            salaryPeriod.value === SalaryPeriod.Yearly
                              ? (derivedSpousalSet.value
                                  .wifeClass3FullTimeNet as number) * 12
                              : (derivedSpousalSet.value
                                  .wifeClass3FullTimeNet as number),
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
                              ? (derivedSpousalSet.value
                                  .wifeClass5FullTimeNet as number) * 12
                              : (derivedSpousalSet.value
                                  .wifeClass5FullTimeNet as number),
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
                          (derivedSpousalSet.value
                            .wifeClass3FullTimeNet as number) -
                            (derivedSpousalSet.value
                              .wifeClass5FullTimeNet as number),
                        )}
                        /mo assessment booster!
                      </div>
                    </div>

                    {/* Husband Class V Net during Swap */}
                    <div
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid rgba(245, 158, 11, 0.25)",
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
                              ? (derivedSpousalSet.value
                                  .husbandClass5Net as number) * 12
                              : (derivedSpousalSet.value
                                  .husbandClass5Net as number),
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
                              ? (derivedSpousalSet.value
                                  .husbandClass3Net as number) * 12
                              : (derivedSpousalSet.value
                                  .husbandClass3Net as number),
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
                            derivedSpousalSet.value.husbandClass4Net as number,
                          )}{" "}
                          · W:{" "}
                          {formatCurrency(
                            derivedSpousalSet.value
                              .wifeClass4FullTimeNet as number,
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
                          Class IV + Factor (§ 39f · F ={" "}
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
                            derivedSpousalSet.value
                              .husbandClass4WithFactorNet as number,
                          )}{" "}
                          · W:{" "}
                          {formatCurrency(
                            derivedSpousalSet.value
                              .wifeClass4WithFactorNet as number,
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
                        (derivedSpousalSet.value.husbandClass5Net as number) +
                          (derivedSpousalSet.value
                            .wifeClass3FullTimeNet as number) -
                          ((derivedSpousalSet.value
                            .husbandClass3Net as number) +
                            (derivedSpousalSet.value
                              .wifeClass5FullTimeNet as number)),
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
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "0.92rem",
                      color: "var(--color-warning)",
                    }}
                  >
                    3. Salaries, Working Times &amp; Career Progression
                  </span>
                  <span className="badge-warning">
                    {customWorkingHoursChanges.value.length} Schedules ·{" "}
                    {customSalaryRaises.value.length} Raises
                  </span>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
                        (child1BirthMonth.value as number) +
                          (count === 0 ? 2 : 14),
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
                            ? `Husband Parental Leave Hours (§ 4b BEEG)`
                            : `Wife Post-Birth Part-Time Return`,
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
                      const count = customSalaryRaises.value.length;
                      const newSimMonth = (count + 2) * 12 + 1;
                      const totalElapsed =
                        startCalendarMonth.value - 1 + (newSimMonth - 1);
                      const sMonth = toCalendarMonth((totalElapsed % 12) + 1);
                      const sYear =
                        startCalendarYear.value + Math.floor(totalElapsed / 12);

                      addSalaryRaiseAction({
                        raiseId: toRaiseId(`RAISE-CUSTOM-${count + 1}`),
                        effectiveSimulationMonth: toSimulationMonth(
                          Math.min(simulationDurationMonths.value, newSimMonth),
                        ),
                        effectiveCalendarMonth: sMonth,
                        effectiveCalendarYear: toFullCalendarYear(sYear),
                        targetPerson: TargetPerson.Both,
                        percentageIncrease: 0.05,
                        reason: `Merit Promotion / Tariff Adjustment (+5%)`,
                      });
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
                    <span>+ Add Career Raise / Promotion</span>
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
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "6px",
                      marginBottom: "6px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSalaryPeriod(SalaryPeriod.Monthly)}
                      style={{
                        padding: "6px 8px",
                        borderRadius: "4px",
                        border:
                          salaryPeriod.value === SalaryPeriod.Monthly
                            ? "1px solid var(--color-primary)"
                            : "1px solid var(--border-subtle)",
                        background:
                          salaryPeriod.value === SalaryPeriod.Monthly
                            ? "var(--color-primary-bg)"
                            : "var(--bg-surface)",
                        color:
                          salaryPeriod.value === SalaryPeriod.Monthly
                            ? "var(--color-primary)"
                            : "var(--text-muted)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                    >
                      <SimulationPeriodIcon size={11} />
                      <span>Monthly (€/mo)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSalaryPeriod(SalaryPeriod.Yearly)}
                      style={{
                        padding: "6px 8px",
                        borderRadius: "4px",
                        border:
                          salaryPeriod.value === SalaryPeriod.Yearly
                            ? "1px solid var(--color-primary)"
                            : "1px solid var(--border-subtle)",
                        background:
                          salaryPeriod.value === SalaryPeriod.Yearly
                            ? "var(--color-primary-bg)"
                            : "var(--bg-surface)",
                        color:
                          salaryPeriod.value === SalaryPeriod.Yearly
                            ? "var(--color-primary)"
                            : "var(--text-muted)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                    >
                      <SimulationPeriodIcon size={11} />
                      <span>Yearly (€/yr)</span>
                    </button>
                  </div>
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
                    {/* Gross Amount Slider */}
                    <div style={{ marginBottom: "6px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.72rem",
                          marginBottom: "2px",
                        }}
                      >
                        <span style={{ color: "var(--text-secondary)" }}>
                          Gross Salary:
                        </span>
                        <span
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 700,
                            color: "var(--color-primary)",
                          }}
                        >
                          {salaryPeriod.value === SalaryPeriod.Yearly
                            ? `${formatCurrency(husbandGrossYearly.value)} / yr (${formatCurrency(husbandGross.value)} / mo)`
                            : `${formatCurrency(husbandGross.value)} / mo`}
                        </span>
                      </div>
                      {salaryPeriod.value === SalaryPeriod.Yearly ? (
                        <input
                          type="range"
                          min="0"
                          max="150000"
                          step="500"
                          value={husbandGrossYearly.value}
                          onInput={(e) => {
                            setHusbandGrossYearly(
                              Number((e.target as HTMLInputElement).value),
                            );
                          }}
                        />
                      ) : (
                        <input
                          type="range"
                          min="0"
                          max="12000"
                          step="50"
                          value={husbandGross.value}
                          onInput={(e) => {
                            setHusbandGross(
                              Number((e.target as HTMLInputElement).value),
                            );
                          }}
                        />
                      )}
                    </div>

                    {/* Husband Working Hours Slider */}
                    <div style={{ marginBottom: "6px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.72rem",
                          marginBottom: "2px",
                        }}
                      >
                        <span style={{ color: "var(--text-muted)" }}>
                          Working Time:
                        </span>
                        <span
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 700,
                            color: "var(--color-primary)",
                          }}
                        >
                          {formatWorkingTime(husbandHours.value)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="60"
                        step="1"
                        value={husbandHours.value}
                        onInput={(e) => {
                          setHusbandHours(
                            Number((e.target as HTMLInputElement).value),
                          );
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          gap: "3px",
                          marginTop: "3px",
                        }}
                      >
                        {[
                          { label: "40h (5d)", val: 40 },
                          { label: "32h (4d)", val: 32 },
                          { label: "24h (3d)", val: 24 },
                          { label: "0h (Leave)", val: 0 },
                        ].map((pill) => (
                          <button
                            key={`h-pill-${pill.val}`}
                            type="button"
                            onClick={() => setHusbandHours(pill.val)}
                            style={{
                              padding: "1px 5px",
                              fontSize: "0.62rem",
                              borderRadius: "3px",
                              border:
                                husbandHours.value === pill.val
                                  ? "1px solid var(--color-primary)"
                                  : "1px solid var(--border-subtle)",
                              background:
                                husbandHours.value === pill.val
                                  ? "var(--color-primary-bg)"
                                  : "var(--bg-surface)",
                              color:
                                husbandHours.value === pill.val
                                  ? "var(--color-primary)"
                                  : "var(--text-muted)",
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            {pill.label}
                          </button>
                        ))}
                      </div>
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
                            ? (derivedSpousalSet.value
                                .husbandClass3Net as number) * 12
                            : (derivedSpousalSet.value
                                .husbandClass3Net as number),
                        )}
                      </strong>
                      {salaryPeriod.value === SalaryPeriod.Yearly ? "/yr" : ""}
                    </span>
                    <span className="badge-warning">
                      Class V:{" "}
                      <strong>
                        {formatCurrency(
                          salaryPeriod.value === SalaryPeriod.Yearly
                            ? (derivedSpousalSet.value
                                .husbandClass5Net as number) * 12
                            : (derivedSpousalSet.value
                                .husbandClass5Net as number),
                        )}
                      </strong>
                      {salaryPeriod.value === SalaryPeriod.Yearly ? "/yr" : ""}
                    </span>
                    <span className="badge-muted">
                      Class IV:{" "}
                      {formatCurrency(
                        salaryPeriod.value === SalaryPeriod.Yearly
                          ? (derivedSpousalSet.value
                              .husbandClass4Net as number) * 12
                          : (derivedSpousalSet.value
                              .husbandClass4Net as number),
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
                        color: "var(--series-indigo)",
                        marginBottom: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <EmploymentCompensationIcon size={13} />
                      <span>Wife Pre-Pregnancy Full-Time Compensation</span>
                    </div>
                    {/* Gross Amount Slider */}
                    <div style={{ marginBottom: "6px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.72rem",
                          marginBottom: "2px",
                        }}
                      >
                        <span style={{ color: "var(--text-secondary)" }}>
                          Full-Time Gross:
                        </span>
                        <span
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 700,
                            color: "var(--series-indigo)",
                          }}
                        >
                          {salaryPeriod.value === SalaryPeriod.Yearly
                            ? `${formatCurrency(wifeGrossYearly.value)} / yr (${formatCurrency(wifeGross.value)} / mo)`
                            : `${formatCurrency(wifeGross.value)} / mo`}
                        </span>
                      </div>
                      {salaryPeriod.value === SalaryPeriod.Yearly ? (
                        <input
                          type="range"
                          min="0"
                          max="100000"
                          step="500"
                          value={wifeGrossYearly.value}
                          onInput={(e) => {
                            setWifeGrossYearly(
                              Number((e.target as HTMLInputElement).value),
                            );
                          }}
                        />
                      ) : (
                        <input
                          type="range"
                          min="0"
                          max="8000"
                          step="50"
                          value={wifeGross.value}
                          onInput={(e) => {
                            setWifeGross(
                              Number((e.target as HTMLInputElement).value),
                            );
                          }}
                        />
                      )}
                    </div>

                    {/* Wife Pre-Pregnancy Hours */}
                    <div style={{ marginBottom: "6px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.72rem",
                          marginBottom: "2px",
                        }}
                      >
                        <span style={{ color: "var(--text-muted)" }}>
                          Pre-Pregnancy Working Time:
                        </span>
                        <span
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 700,
                            color: "var(--series-indigo)",
                          }}
                        >
                          {formatWorkingTime(wifeInitialHours.value)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="60"
                        step="1"
                        value={wifeInitialHours.value}
                        onInput={(e) => {
                          setWifeInitialHours(
                            Number((e.target as HTMLInputElement).value),
                          );
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          gap: "3px",
                          marginTop: "3px",
                        }}
                      >
                        {[
                          { label: "40h (5d)", val: 40 },
                          { label: "32h (4d)", val: 32 },
                          { label: "24h (3d)", val: 24 },
                          { label: "0h (Leave)", val: 0 },
                        ].map((pill) => (
                          <button
                            key={`w-pill-${pill.val}`}
                            type="button"
                            onClick={() => setWifeInitialHours(pill.val)}
                            style={{
                              padding: "1px 5px",
                              fontSize: "0.62rem",
                              borderRadius: "3px",
                              border:
                                wifeInitialHours.value === pill.val
                                  ? "1px solid var(--series-indigo)"
                                  : "1px solid var(--border-subtle)",
                              background:
                                wifeInitialHours.value === pill.val
                                  ? "var(--color-primary-bg)"
                                  : "var(--bg-surface)",
                              color:
                                wifeInitialHours.value === pill.val
                                  ? "var(--series-indigo)"
                                  : "var(--text-muted)",
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            {pill.label}
                          </button>
                        ))}
                      </div>
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
                            ? (derivedSpousalSet.value
                                .wifeClass5FullTimeNet as number) * 12
                            : (derivedSpousalSet.value
                                .wifeClass5FullTimeNet as number),
                        )}
                      </strong>
                      {salaryPeriod.value === SalaryPeriod.Yearly ? "/yr" : ""}
                    </span>
                    <span className="badge-gain">
                      Class III:{" "}
                      <strong>
                        {formatCurrency(
                          salaryPeriod.value === SalaryPeriod.Yearly
                            ? (derivedSpousalSet.value
                                .wifeClass3FullTimeNet as number) * 12
                            : (derivedSpousalSet.value
                                .wifeClass3FullTimeNet as number),
                        )}
                      </strong>{" "}
                      (Booster!)
                    </span>
                  </div>
                </div>

                {/* ENTRY 4: DYNAMIC SCHEDULE & WORKING TIME ADJUSTMENT CARDS */}
                {customWorkingHoursChanges.value.map((whc, idx) => {
                  const sMonth = whc.effectiveSimulationMonth as number;
                  const isWife = whc.targetPerson === TargetPerson.Wife;
                  const isHusband = whc.targetPerson === TargetPerson.Husband;
                  const isBoth = whc.targetPerson === TargetPerson.Both;
                  const hours = whc.weeklyHours as number;

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
                        (derivedSpousalSet.value
                          .wifeClass5FullTimeNet as number) * wifeRatio,
                      )
                    : Math.round(
                        (derivedSpousalSet.value.husbandClass3Net as number) *
                          husbandRatio,
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
                                (derivedSpousalSet.value
                                  .wifeClass3FullTimeNet as number) - ptNet,
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
                          ? "1px solid rgba(6, 182, 212, 0.4)"
                          : isHusband
                            ? "1px solid rgba(59, 130, 246, 0.4)"
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
                                ? "var(--series-cyan)"
                                : isHusband
                                  ? "var(--color-primary)"
                                  : "var(--series-indigo)",
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
                                { length: simulationDurationMonths.value },
                                (_, i) => i + 1,
                              ).map((m) => (
                                <option key={`whc-m-${m}`} value={m}>
                                  {getCalDate(m)} ({getRelativeMonthLabel(m)}) ·{" "}
                                  {getMonthId(m)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Working Hours Slider & Comfort Badges */}
                        <div style={{ marginBottom: "6px" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.72rem",
                              marginBottom: "2px",
                            }}
                          >
                            <span style={{ color: "var(--text-secondary)" }}>
                              Working Time:
                            </span>
                            <span
                              style={{
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: 700,
                                color: isWife
                                  ? "var(--series-cyan)"
                                  : "var(--color-primary)",
                              }}
                            >
                              {formatWorkingTime(whc.weeklyHours)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="60"
                            step="1"
                            value={whc.weeklyHours}
                            onInput={(e) => {
                              const newHours = Number(
                                (e.target as HTMLInputElement).value,
                              );
                              updateWorkingHoursChangeAction(whc.changeId, {
                                weeklyHours: toWorkingHours(newHours),
                              });
                              if (isWife && idx === 0) {
                                setWifePostBirthHours(newHours);
                              }
                            }}
                          />
                          <div
                            style={{
                              display: "flex",
                              gap: "3px",
                              marginTop: "3px",
                              flexWrap: "wrap",
                            }}
                          >
                            {[
                              { label: "40h (5d)", val: 40 },
                              { label: "32h (4d PB)", val: 32 },
                              { label: "24h (3d PB)", val: 24 },
                              { label: "16h (2d)", val: 16 },
                              { label: "0h (Leave)", val: 0 },
                            ].map((pill) => (
                              <button
                                key={`whc-${whc.changeId}-pill-${pill.val}`}
                                type="button"
                                onClick={() => {
                                  updateWorkingHoursChangeAction(whc.changeId, {
                                    weeklyHours: toWorkingHours(pill.val),
                                  });
                                  if (isWife && idx === 0) {
                                    setWifePostBirthHours(pill.val);
                                  }
                                }}
                                style={{
                                  padding: "1px 5px",
                                  fontSize: "0.62rem",
                                  borderRadius: "3px",
                                  border:
                                    whc.weeklyHours === pill.val
                                      ? "1px solid var(--series-cyan)"
                                      : "1px solid var(--border-subtle)",
                                  background:
                                    whc.weeklyHours === pill.val
                                      ? "var(--color-primary-bg)"
                                      : "var(--bg-surface)",
                                  color:
                                    whc.weeklyHours === pill.val
                                      ? "var(--series-cyan)"
                                      : "var(--text-muted)",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                {pill.label}
                              </button>
                            ))}
                          </div>
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
                              &gt; 32h/week disqualifies from Elterngeld (§ 1
                              BEEG).
                            </span>
                          </div>
                        ) : hours >= 24 && hours <= 32 ? (
                          <button
                            type="button"
                            onClick={() =>
                              scrollToLegalRule(
                                LegalRuleKey.BEEG_PartnershipBonus,
                              )
                            }
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
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            title="Click to view § 4b BEEG Partnership Bonus rules and worked example"
                          >
                            <EligibilityConfirmedIcon size={11} />
                            <span>
                              Partnerschaftsbonus (§ 4b BEEG) OK (24–32h / 3–4d)
                            </span>
                            <ExternalLegalSourceIcon size={10} />
                          </button>
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
                          <button
                            type="button"
                            onClick={() =>
                              scrollToLegalRule(
                                LegalRuleKey.BEEG_PartnershipBonus,
                              )
                            }
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
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            title="Click to view § 4b BEEG corridor requirements"
                          >
                            <InformationalNoticeIcon size={11} />
                            <span>
                              ElterngeldPlus eligible, outside PB corridor
                              (24–32h)
                            </span>
                            <ExternalLegalSourceIcon size={10} />
                          </button>
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

                {/* ENTRY 5: Career Raises & Promotions Cards */}
                {customSalaryRaises.value.map((sr, idx) => {
                  const sMonth = sr.effectiveSimulationMonth as number;

                  return (
                    <div
                      key={sr.raiseId || `raise-${idx}`}
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
                            marginBottom: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 800,
                              color: "var(--color-warning)",
                            }}
                          >
                            Raise #{idx + 1}: {sr.targetPerson.toUpperCase()} (+
                            {((sr.percentageIncrease || 0) * 100).toFixed(0)}%)
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSalaryRaiseAction(sr.raiseId)}
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
                            <strong style={{ color: "var(--color-warning)" }}>
                              {getCalDate(sMonth)}
                            </strong>{" "}
                            ({getRelativeMonthLabel(sMonth)}) ·{" "}
                            {getMonthId(sMonth)}
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
                        ↳ {sr.reason}
                      </div>
                    </div>
                  );
                })}
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
                      color: "var(--color-loss)",
                    }}
                  >
                    4. Financial Events, Recurring Inflows &amp; Costs
                  </span>
                  <span className="badge-loss">
                    {customFinancialEvents.value.length} Events Active
                  </span>
                </div>

                {/* Add Cost and Inflow Buttons */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
                        color: "var(--series-emerald)",
                        marginBottom: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <FinancialInflowIcon size={13} />
                      <span>Standing Recurring Inflow Channels</span>
                    </div>

                    {/* 13th Month Salary Toggle */}
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
                          fontSize: "0.70rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        13th Month Salary:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          enable13thSalary.value = !enable13thSalary.value;
                        }}
                        style={{
                          padding: "2px 6px",
                          borderRadius: "3px",
                          border: enable13thSalary.value
                            ? "1px solid var(--color-warning-border)"
                            : "1px solid var(--border-subtle)",
                          background: enable13thSalary.value
                            ? "var(--color-warning-bg)"
                            : "var(--bg-surface)",
                          color: enable13thSalary.value
                            ? "var(--color-warning)"
                            : "var(--text-muted)",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {enable13thSalary.value ? (
                          <>
                            <EligibilityConfirmedIcon size={10} />
                            <span>Active (May &amp; Nov)</span>
                          </>
                        ) : (
                          <>
                            <RemoveItemIcon size={10} />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Annual Performance Bonus Slider */}
                    <div style={{ marginBottom: "6px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.70rem",
                          marginBottom: "2px",
                        }}
                      >
                        <span style={{ color: "var(--text-secondary)" }}>
                          Performance Bonus:
                        </span>
                        <span
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 700,
                            color: "var(--color-warning)",
                          }}
                        >
                          {formatCurrency(annualBonusGross.value)} gross/yr
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="30000"
                        step="500"
                        value={annualBonusGross.value}
                        onInput={(e) => {
                          setAnnualBonusGross(
                            Number((e.target as HTMLInputElement).value),
                          );
                        }}
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
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.70rem",
                          marginBottom: "2px",
                        }}
                      >
                        <span style={{ color: "var(--text-secondary)" }}>
                          Investment Returns:
                        </span>
                        <span
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 700,
                            color: "var(--color-gain)",
                          }}
                        >
                          {formatCurrency(investmentReturnMonthly.value)} / mo
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5000"
                        step="50"
                        value={investmentReturnMonthly.value}
                        onInput={(e) => {
                          setInvestmentReturnMonthly(
                            Number((e.target as HTMLInputElement).value),
                          );
                        }}
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
                    ↳ Precondition channels: dividend, rental, ETF cash flow (§
                    20 EStG).
                  </div>
                </div>

                {/* One-Off Events List */}
                {customFinancialEvents.value.map((fe, idx) => {
                  const sMonth = fe.effectiveSimulationMonth as number;
                  const isCost = (fe.amount as number) < 0;

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
                              {formatCurrency(fe.amount as number)}
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
                              {getCalDate(sMonth)}
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
                        {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(
                          (yr) => (
                            <option key={`start-y-${yr}`} value={yr}>
                              Year {yr}
                            </option>
                          ),
                        )}
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
                    {[12, 24, 36, 48, 60, 72].map((dur) => (
                      <button
                        key={`dur-btn-${dur}`}
                        type="button"
                        onClick={() => {
                          simulationDurationMonths.value = dur;
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
                              ? "#ffffff"
                              : "var(--text-secondary)",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {dur}M
                      </button>
                    ))}
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
                      <span>Preconditions Baseline ($M1$ / $t=0$)</span>
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
                        <strong>Children:</strong> 0 prior children · Kindergeld{" "}
                        {formatCurrency(kindergeldPerChild.value)}/mo
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
                    ↳ Precondition: baseline status at simulation start ($M1$).
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
                      <button
                        type="button"
                        onClick={() =>
                          scrollToLegalRule(LegalRuleKey.EStG_Kindergeld)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-secondary)",
                          padding: 0,
                          cursor: "pointer",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          textAlign: "left",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        title="Click to view § 66 EStG Kindergeld legal rule & example"
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
                          <ExternalLegalSourceIcon size={10} />
                        </span>
                        :
                      </button>
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
                    <span
                      style={{ color: "var(--color-primary)", fontWeight: 600 }}
                    >
                      Günstigerprüfung § 31 EStG
                    </span>
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
                            ((derivedSpousalSet.value.husbandBreakdownClass3
                              .monthlyGross as number) -
                              (derivedSpousalSet.value.husbandBreakdownClass3
                                .monthlyNetTakeHome as number)) *
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
                              (derivedSpousalSet.value.husbandBreakdownClass3
                                .totalSocialSecurity as number) *
                                (salaryPeriod.value === SalaryPeriod.Yearly
                                  ? 12
                                  : 1),
                            )}
                          </span>
                          <span>
                            • Tax:{" "}
                            {formatCurrency(
                              (derivedSpousalSet.value.husbandBreakdownClass3
                                .monthlyWageTax as number) *
                                (salaryPeriod.value === SalaryPeriod.Yearly
                                  ? 12
                                  : 1),
                            )}
                          </span>
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "var(--series-indigo)",
                            marginBottom: "2px",
                          }}
                        >
                          Wife FT (Class V):{" "}
                          {formatCurrency(
                            ((derivedSpousalSet.value.wifeBreakdownClass5FT
                              .monthlyGross as number) -
                              (derivedSpousalSet.value.wifeBreakdownClass5FT
                                .monthlyNetTakeHome as number)) *
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
                              (derivedSpousalSet.value.wifeBreakdownClass5FT
                                .totalSocialSecurity as number) *
                                (salaryPeriod.value === SalaryPeriod.Yearly
                                  ? 12
                                  : 1),
                            )}
                          </span>
                          <span>
                            • Tax:{" "}
                            {formatCurrency(
                              (derivedSpousalSet.value.wifeBreakdownClass5FT
                                .monthlyWageTax as number) *
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
