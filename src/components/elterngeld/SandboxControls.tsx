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
  customFinancialEvents,
  addPregnancyAction,
  removePregnancyAction,
  addTaxClassSwitchAction,
  removeTaxClassSwitchAction,
  addSalaryRaiseAction,
  removeSalaryRaiseAction,
  addFinancialEventAction,
  removeFinancialEventAction,
  updateFinancialEventAction,
  resetToDefaults,
  scrollToLegalRule,
  LegalRuleKey,
} from "#store/elterngeldStore";
import {
  TaxClass,
  TargetPerson,
  FinancialEventCategory,
  SalaryInputMode,
  SalaryPeriod,
  toSimulationMonth,
  toCalendarMonth,
  toEuroAmount,
  toNetSalary,
  toWorkingHours,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  toFinancialEventId,
} from "#engine/types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
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

  // Helper to compute calendar date for simulation month offset
  const getCalDate = (simMonth: number): string => {
    const totalElapsed = startCalendarMonth.value - 1 + (simMonth - 1);
    const m = (totalElapsed % 12) + 1;
    const y = startCalendarYear.value + Math.floor(totalElapsed / 12);
    return `${String(m).padStart(2, "0")}.${y}`;
  };

  // Preset Handlers
  const applyPreset = (
    presetName: "default" | "high_earner" | "equal",
  ): void => {
    if (presetName === "default") {
      resetToDefaults();
      setSalaryInputMode(SalaryInputMode.Gross);
      setHusbandGross(4500);
      setWifeGross(3000);
    } else if (presetName === "high_earner") {
      setSalaryInputMode(SalaryInputMode.Gross);
      setHusbandGross(8200);
      setWifeGross(4500);
      setWifeInitialHours(40);
      setWifePostBirthHours(24);
      prePregnancyPlanningMonths.value = 8;
      child1BirthMonth.value = toSimulationMonth(17);
      birthSpacingMonths.value = 27;
      swapLeadMonths.value = 7;
    } else if (presetName === "equal") {
      setSalaryInputMode(SalaryInputMode.Gross);
      setHusbandGross(4800);
      setWifeGross(4800);
      setWifeInitialHours(40);
      setWifePostBirthHours(24);
      prePregnancyPlanningMonths.value = 8;
      child1BirthMonth.value = toSimulationMonth(17);
      birthSpacingMonths.value = 24;
      swapLeadMonths.value = 7;
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
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="4" x2="20" y1="21" y2="21" />
              <line x1="4" x2="20" y1="3" y2="3" />
              <line x1="4" x2="20" y1="12" y2="12" />
              <circle cx="9" cy="21" r="2" />
              <circle cx="15" cy="3" r="2" />
              <circle cx="11" cy="12" r="2" />
            </svg>
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
              Configured via discrete batches: 0. Preexisting Baseline → 1.
              Pregnancy Decisions → 2. Tax Switches → 3. Salary Raises
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
              <button
                type="button"
                onClick={() => applyPreset("default")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "4px",
                  border: "1px solid var(--color-primary-border)",
                  background: "var(--bg-surface)",
                  color: "var(--color-primary)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Standard Baseline (Default)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("high_earner")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                High Earner Model
              </button>
              <button
                type="button"
                onClick={() => applyPreset("equal")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Equal Earner Model
              </button>
            </div>

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
              Reset to Defaults
            </button>
          </div>

          {/* 4-Batch Grid Layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
              gap: "20px",
            }}
          >
            {/* ======================================================== */}
            {/* BATCH 0: PREEXISTING CONDITIONS & BASELINE INCOMES */}
            {/* ======================================================== */}
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "16px",
                borderRadius: "var(--border-radius)",
                border: "1px solid var(--border-subtle)",
                gridColumn: "span 1",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "0.88rem",
                    color: "var(--color-primary)",
                  }}
                >
                  0. Preexisting Conditions
                </span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    color: "var(--text-muted)",
                    background: "var(--bg-surface-secondary)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  Start: {getCalDate(1)}
                </span>
              </div>

              {/* Simulation Start Date & Duration */}
              <div style={{ marginBottom: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.78rem",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>
                    Sim Start & Horizon:
                  </span>
                  <span
                    style={{
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 700,
                      color: "var(--color-primary)",
                    }}
                  >
                    {getCalDate(1)} → {getCalDate(endSimMonth)} (
                    {simulationDurationMonths.value}M)
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: "6px",
                    marginBottom: "6px",
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
                      background: "var(--bg-surface-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "4px",
                      padding: "3px 6px",
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
                      startCalendarYear.value = Number(
                        (e.target as HTMLSelectElement).value,
                      );
                    }}
                    style={{
                      background: "var(--bg-surface-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "4px",
                      padding: "3px 6px",
                      fontSize: "0.74rem",
                    }}
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                      <option key={`start-y-${yr}`} value={yr}>
                        Year {yr}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {[12, 24, 36, 48, 60, 72].map((dur) => (
                    <button
                      key={`dur-btn-${dur}`}
                      type="button"
                      onClick={() => {
                        simulationDurationMonths.value = dur;
                      }}
                      style={{
                        padding: "2px 6px",
                        borderRadius: "3px",
                        border:
                          simulationDurationMonths.value === dur
                            ? "1px solid var(--color-primary)"
                            : "1px solid var(--border-subtle)",
                        background:
                          simulationDurationMonths.value === dur
                            ? "var(--color-primary)"
                            : "var(--bg-surface-secondary)",
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

              {/* Cadence Switcher (Monthly vs Yearly) */}
              <div
                style={{
                  background: "var(--bg-surface-secondary)",
                  padding: "5px 8px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  Salary Cadence:
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={() => setSalaryPeriod(SalaryPeriod.Monthly)}
                    style={{
                      padding: "2px 8px",
                      borderRadius: "3px",
                      border:
                        salaryPeriod.value === SalaryPeriod.Monthly
                          ? "1px solid var(--color-primary)"
                          : "1px solid transparent",
                      background:
                        salaryPeriod.value === SalaryPeriod.Monthly
                          ? "var(--color-primary-bg)"
                          : "transparent",
                      color:
                        salaryPeriod.value === SalaryPeriod.Monthly
                          ? "var(--color-primary)"
                          : "var(--text-muted)",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    📅 Monthly (€/mo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryPeriod(SalaryPeriod.Yearly)}
                    style={{
                      padding: "2px 8px",
                      borderRadius: "3px",
                      border:
                        salaryPeriod.value === SalaryPeriod.Yearly
                          ? "1px solid var(--color-primary)"
                          : "1px solid transparent",
                      background:
                        salaryPeriod.value === SalaryPeriod.Yearly
                          ? "var(--color-primary-bg)"
                          : "transparent",
                      color:
                        salaryPeriod.value === SalaryPeriod.Yearly
                          ? "var(--color-primary)"
                          : "var(--text-muted)",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    📆 Yearly (€/yr)
                  </button>
                </div>
              </div>

              {/* SECTION: PRIMARY HUSBAND GROSS COMPENSATION */}
              <div
                style={{
                  background: "var(--bg-surface-secondary)",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    color: "var(--color-primary)",
                    marginBottom: "8px",
                  }}
                >
                  👤 Husband Gross Compensation
                </div>
                {/* Gross Amount Slider */}
                <div style={{ marginBottom: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.74rem",
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
                      min="30000"
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
                      min="2500"
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
                <div style={{ marginBottom: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.72rem",
                      marginBottom: "2px",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>
                      Weekly Working Hours:
                    </span>
                    <span
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                        color: "var(--color-primary)",
                      }}
                    >
                      {husbandHours.value} hours / week
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    step="1"
                    value={husbandHours.value}
                    onInput={(e) => {
                      setHusbandHours(
                        Number((e.target as HTMLInputElement).value),
                      );
                    }}
                  />
                </div>

                {/* Husband Tax Class Badges */}
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    fontSize: "0.66rem",
                    flexWrap: "wrap",
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
                        ? (derivedSpousalSet.value.husbandClass4Net as number) *
                            12
                        : (derivedSpousalSet.value.husbandClass4Net as number),
                    )}
                  </span>
                </div>
              </div>

              {/* SECTION: WIFE FULL-TIME PRE-PREGNANCY COMPENSATION */}
              <div
                style={{
                  background: "var(--bg-surface-secondary)",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    color: "var(--series-indigo)",
                    marginBottom: "8px",
                  }}
                >
                  👩 Wife Pre-Pregnancy Full-Time Compensation
                </div>
                {/* Gross Amount Slider */}
                <div style={{ marginBottom: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.74rem",
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
                      min="18000"
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
                      min="1500"
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
                <div style={{ marginBottom: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.72rem",
                      marginBottom: "2px",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>
                      Full-Time Working Hours:
                    </span>
                    <span
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                        color: "var(--series-indigo)",
                      }}
                    >
                      {wifeInitialHours.value} hours / week
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="40"
                    step="1"
                    value={wifeInitialHours.value}
                    onInput={(e) => {
                      setWifeInitialHours(
                        Number((e.target as HTMLInputElement).value),
                      );
                    }}
                  />
                </div>

                {/* Wife FT Tax Class Badges */}
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    fontSize: "0.66rem",
                    flexWrap: "wrap",
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

              {/* SECTION: WIFE POST-BIRTH PART-TIME RETURN TO WORK */}
              <div
                style={{
                  background: "var(--bg-surface-secondary)",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    color: "var(--series-cyan)",
                    marginBottom: "8px",
                  }}
                >
                  👶 Wife Post-Birth Part-Time Return to Work
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.72rem",
                      marginBottom: "2px",
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      Post-Birth Part-Time Hours:
                    </span>
                    <span
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                        color: "var(--series-cyan)",
                      }}
                    >
                      {wifePostBirthHours.value} hours / week{" "}
                      {wifePostBirthHours.value >= 24 &&
                      wifePostBirthHours.value <= 32
                        ? "✓ PB Eligible"
                        : ""}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={wifePostBirthHours.value}
                    onInput={(e) => {
                      setWifePostBirthHours(
                        Number((e.target as HTMLInputElement).value),
                      );
                    }}
                  />

                  {/* Statutory Elterngeld & Partnership Bonus (§ 1 & § 4b BEEG) Indicators */}
                  {wifePostBirthHours.value > 32 ? (
                    <div
                      style={{
                        width: "100%",
                        textAlign: "left",
                        fontSize: "0.66rem",
                        color: "var(--color-loss)",
                        background: "var(--color-loss-bg)",
                        padding: "4px 6px",
                        borderRadius: "4px",
                        marginTop: "4px",
                        fontWeight: 600,
                        border: "1px solid var(--color-loss-border)",
                      }}
                    >
                      ⚠️ Exceeds Statutory Limit (§ 1 Abs. 1 Nr. 4 BEEG): Hours
                      &gt; 32h / week disqualify from all Elterngeld (0 €
                      benefit paid).
                    </div>
                  ) : wifePostBirthHours.value >= 24 &&
                    wifePostBirthHours.value <= 32 ? (
                    <button
                      type="button"
                      onClick={() =>
                        scrollToLegalRule(LegalRuleKey.BEEG_PartnershipBonus)
                      }
                      style={{
                        width: "100%",
                        textAlign: "left",
                        fontSize: "0.66rem",
                        color: "var(--color-gain)",
                        background: "var(--color-gain-bg)",
                        padding: "3px 6px",
                        borderRadius: "4px",
                        marginTop: "4px",
                        fontWeight: 600,
                        border: "1px solid var(--color-gain-border)",
                        cursor: "pointer",
                      }}
                      title="Click to view § 4b BEEG Partnership Bonus rules and worked example"
                    >
                      ✓ ElterngeldPlus &amp; Partnerschaftsbonus (§ 4b BEEG ↗)
                      corridor (24–32h / week)
                    </button>
                  ) : wifePostBirthHours.value === 0 ? (
                    <div
                      style={{
                        fontSize: "0.66rem",
                        color: "var(--color-primary)",
                        background: "var(--color-primary-bg)",
                        padding: "3px 6px",
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
                        scrollToLegalRule(LegalRuleKey.BEEG_PartnershipBonus)
                      }
                      style={{
                        width: "100%",
                        textAlign: "left",
                        fontSize: "0.66rem",
                        color: "var(--color-warning)",
                        background: "var(--color-warning-bg)",
                        padding: "3px 6px",
                        borderRadius: "4px",
                        marginTop: "4px",
                        border: "1px solid var(--color-warning-border)",
                        cursor: "pointer",
                      }}
                      title="Click to view § 4b BEEG corridor requirements"
                    >
                      ℹ Eligible for ElterngeldPlus (≤ 32h), but outside
                      Partnerschaftsbonus corridor (must be 24–32h for +4 bonus
                      months ↗)
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    fontSize: "0.66rem",
                    flexWrap: "wrap",
                    marginBottom: "6px",
                  }}
                >
                  <span className="badge-warning">
                    PT Gross:{" "}
                    {formatCurrency(
                      salaryPeriod.value === SalaryPeriod.Yearly
                        ? (derivedSpousalSet.value
                            .wifeGrossPartTime as number) * 12
                        : (derivedSpousalSet.value.wifeGrossPartTime as number),
                    )}
                  </span>
                  <span className="badge-muted">
                    PT Net (Class V):{" "}
                    <strong>
                      {formatCurrency(
                        salaryPeriod.value === SalaryPeriod.Yearly
                          ? (derivedSpousalSet.value
                              .wifeClass5PartTimeNet as number) * 12
                          : (derivedSpousalSet.value
                              .wifeClass5PartTimeNet as number),
                      )}
                    </strong>
                  </span>
                </div>

                {/* Statutory ElterngeldPlus Replacement Calculation */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "5px",
                    padding: "6px 8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "3px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.68rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        scrollToLegalRule(LegalRuleKey.BEEG_SyntheticNet)
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-secondary)",
                        padding: 0,
                        cursor: "pointer",
                        fontSize: "0.68rem",
                        textAlign: "left",
                        textDecoration: "underline",
                      }}
                      title="Click to view ElterngeldPlus § 4 BEEG replacement rules and €900 cap"
                    >
                      Statutory ElterngeldPlus (65% loss ↗):
                    </button>
                    <strong
                      style={{
                        color: "var(--color-gain)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      +
                      {formatCurrency(
                        Math.min(
                          900,
                          Math.max(
                            150,
                            Math.round(
                              Math.max(
                                0,
                                (derivedSpousalSet.value
                                  .wifeClass3FullTimeNet as number) -
                                  (derivedSpousalSet.value
                                    .wifeClass5PartTimeNet as number),
                              ) * 0.65,
                            ),
                          ),
                        ),
                      )}
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.70rem",
                      color: "var(--text-primary)",
                      borderTop: "1px solid var(--border-subtle)",
                      paddingTop: "3px",
                      fontWeight: 700,
                    }}
                  >
                    <span>Total Monthly Mother Inflow:</span>
                    <span
                      style={{
                        color: "var(--color-gain)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatCurrency(
                        (derivedSpousalSet.value
                          .wifeClass5PartTimeNet as number) +
                          Math.min(
                            900,
                            Math.max(
                              150,
                              Math.round(
                                Math.max(
                                  0,
                                  (derivedSpousalSet.value
                                    .wifeClass3FullTimeNet as number) -
                                    (derivedSpousalSet.value
                                      .wifeClass5PartTimeNet as number),
                                ) * 0.65,
                              ),
                            ),
                          ),
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION: ADDITIONAL INCOME & INFLOW CHANNELS */}
              <div
                style={{
                  background: "var(--bg-surface-secondary)",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    color: "var(--color-warning)",
                    marginBottom: "8px",
                  }}
                >
                  🎁 Additional Income & Inflow Channels
                </div>

                {/* 13th Month Salary Toggle */}
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
                      fontSize: "0.72rem",
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
                      fontSize: "0.66rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {enable13thSalary.value
                      ? "✓ Active (May & Nov)"
                      : "✕ Disabled"}
                  </button>
                </div>
                {enable13thSalary.value && (
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--text-muted)",
                      marginBottom: "8px",
                      padding: "3px 5px",
                      background: "var(--bg-surface)",
                      borderRadius: "3px",
                    }}
                  >
                    ↳ 40% Vacation Bonus in May + 60% Christmas Bonus in Nov (§
                    2c BEEG exempt).
                  </div>
                )}

                {/* Annual Performance Bonus Slider */}
                <div style={{ marginBottom: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.72rem",
                      marginBottom: "2px",
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      Annual Performance Bonus:
                    </span>
                    <span
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                        color: "var(--color-warning)",
                      }}
                    >
                      {formatCurrency(annualBonusGross.value)} gross / yr
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
                          fontSize: "0.65rem",
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
                          fontSize: "0.68rem",
                        }}
                      >
                        {MONTH_NAMES.map((mName, idx) => (
                          <option key={`bonus-m-${idx + 1}`} value={idx + 1}>
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
                      fontSize: "0.72rem",
                      marginBottom: "2px",
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      Investment & Capital Returns:
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
                  <div
                    style={{
                      fontSize: "0.64rem",
                      color: "var(--text-muted)",
                      marginTop: "1px",
                    }}
                  >
                    ↳ Net dividend, rental return, or ETF capital cash flow (§
                    20 EStG).
                  </div>
                </div>
              </div>

              {/* Deductions Breakdown Toggle */}
              <div style={{ marginBottom: "10px" }}>
                <button
                  type="button"
                  onClick={() =>
                    setShowDeductionsBreakdown(!showDeductionsBreakdown)
                  }
                  style={{
                    width: "100%",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-surface-secondary)",
                    color: "var(--text-secondary)",
                    fontSize: "0.68rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>📊 Statutory Tax & Social Deductions Breakdown</span>
                  <span>{showDeductionsBreakdown ? "▲ Hide" : "▼ Expand"}</span>
                </button>
                {showDeductionsBreakdown && (
                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "4px",
                      padding: "8px",
                      marginTop: "4px",
                      fontSize: "0.68rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--color-primary)",
                        marginBottom: "4px",
                      }}
                    >
                      Husband (Class III): Deductions{" "}
                      {formatCurrency(
                        ((derivedSpousalSet.value.husbandBreakdownClass3
                          .monthlyGross as number) -
                          (derivedSpousalSet.value.husbandBreakdownClass3
                            .monthlyNetTakeHome as number)) *
                          (salaryPeriod.value === SalaryPeriod.Yearly ? 12 : 1),
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
                        gap: "4px",
                        marginBottom: "6px",
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
                        marginBottom: "4px",
                      }}
                    >
                      Wife FT (Class V): Deductions{" "}
                      {formatCurrency(
                        ((derivedSpousalSet.value.wifeBreakdownClass5FT
                          .monthlyGross as number) -
                          (derivedSpousalSet.value.wifeBreakdownClass5FT
                            .monthlyNetTakeHome as number)) *
                          (salaryPeriod.value === SalaryPeriod.Yearly ? 12 : 1),
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
                        gap: "4px",
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
                )}
              </div>

              {/* Kindergeld */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.78rem",
                    marginBottom: "2px",
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
                      fontSize: "0.78rem",
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
                      }}
                    >
                      (§ 66 EStG ↗)
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
                <div
                  style={{
                    fontSize: "0.64rem",
                    color: "var(--text-muted)",
                    marginTop: "2px",
                  }}
                >
                  ↳ Reconciled against Kinderfreibetrag (9.540 €/child § 32 Abs.
                  6) in annual tax return (
                  <span
                    style={{ color: "var(--color-primary)", fontWeight: 600 }}
                  >
                    Günstigerprüfung § 31 EStG
                  </span>
                  ).
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* BATCH 1: PREGNANCY POSITIVE DECISIONS & MILESTONES */}
            {/* ======================================================== */}
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "16px",
                borderRadius: "var(--border-radius)",
                border: "1px solid var(--border-subtle)",
                gridColumn: "span 1",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "0.88rem",
                    color: "var(--color-loss)",
                  }}
                >
                  1. Pregnancy Positive Decisions
                </span>
                <span className="badge-loss">
                  {customPregnancies.value.length} Pregnancies Active
                </span>
              </div>

              {/* Dynamic Pregnancies List */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginBottom: "12px",
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
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-subtle)",
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
                            fontSize: "0.78rem",
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
                            }}
                          >
                            ✕ Remove
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
                              marginBottom: "6px",
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
                                  padding: "3px 4px",
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
                                  padding: "3px 4px",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                }}
                              >
                                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(
                                  (y) => (
                                    <option key={y} value={y}>
                                      {y}
                                    </option>
                                  ),
                                )}
                              </select>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.70rem",
                              color: "var(--text-secondary)",
                              marginBottom: "4px",
                            }}
                          >
                            <span>
                              Positive:{" "}
                              <strong style={{ color: "var(--color-loss)" }}>
                                {getCalDate(pSimMonth)}
                              </strong>{" "}
                              (M0)
                            </span>
                            <span>
                              Birth 1:{" "}
                              <strong style={{ color: "var(--color-primary)" }}>
                                {getCalDate(dSimMonth)}
                              </strong>{" "}
                              (M+{dSimMonth - pSimMonth})
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "0.65rem",
                              color: "var(--text-muted)",
                              background: "var(--bg-surface)",
                              padding: "3px 5px",
                              borderRadius: "3px",
                            }}
                          >
                            ↳ Sim Start:{" "}
                            <strong>01.{startCalendarYear.value}</strong> (
                            {prePregnancyPlanningMonths.value}M before preg)
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.70rem",
                              color: "var(--text-secondary)",
                              marginBottom: "4px",
                            }}
                          >
                            <span>
                              Positive:{" "}
                              <strong style={{ color: "var(--color-loss)" }}>
                                {getCalDate(pSimMonth)}
                              </strong>{" "}
                              (M{pSimMonth})
                            </span>
                            <span>
                              Birth #{preg.childIndex}:{" "}
                              <strong style={{ color: "var(--color-primary)" }}>
                                {getCalDate(dSimMonth)}
                              </strong>{" "}
                              (M{dSimMonth})
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
                            }}
                          >
                            {dSimMonth -
                              ((customPregnancies.value[idx - 1]
                                ?.calculatedDeliverySimulationMonth as number) ||
                                0) <
                            36
                              ? `✓ Sibling Bonus (+10%) eligible (${dSimMonth - ((customPregnancies.value[idx - 1]?.calculatedDeliverySimulationMonth as number) || 0)}M spacing)`
                              : `✗ Sibling bonus expired (${dSimMonth - ((customPregnancies.value[idx - 1]?.calculatedDeliverySimulationMonth as number) || 0)}M spacing)`}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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

                  addPregnancyAction({
                    pregnancyId: toPregnancyId(`PREG-CUSTOM-${count + 1}`),
                    childIndex: count + 1,
                    positiveTestCalendarMonth: toCalendarMonth(1),
                    positiveTestCalendarYear: 2026,
                    positiveTestSimulationMonth: toSimulationMonth(newSimMonth),
                    calculatedDeliverySimulationMonth: toSimulationMonth(
                      newSimMonth + 8,
                    ),
                    motherPostBirthPartTimeHours: toWorkingHours(24),
                    motherPostBirthPartTimeClass5Net: toNetSalary(
                      wifeClass5PartTimeNet.value,
                    ),
                    motherPostBirthPartTimeClass3Net: toNetSalary(
                      wifeClass3PartTimeNet.value,
                    ),
                    fatherPartnerMonthsCount: 4,
                  });
                }}
                style={{
                  width: "100%",
                  padding: "6px",
                  background: "var(--color-loss-bg)",
                  color: "var(--color-loss)",
                  border: "1px solid var(--color-loss-border)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  marginBottom: "10px",
                }}
              >
                ➕ Add Pregnancy (Child #{customPregnancies.value.length + 1})
              </button>
            </div>

            {/* ======================================================== */}
            {/* BATCH 2: TAX CLASS SWITCHES (§ 2b BEEG) */}
            {/* ======================================================== */}
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "16px",
                borderRadius: "var(--border-radius)",
                border: "1px solid var(--border-subtle)",
                gridColumn: "span 1",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "8px",
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
                    fontSize: "0.88rem",
                    color: "var(--color-gain)",
                    textAlign: "left",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title="Click to view § 2b BEEG & BFH VI R 2/13 tax optimization rules"
                >
                  <span>2. Tax Class Switches</span>
                  <span
                    style={{ fontSize: "0.72rem", textDecoration: "underline" }}
                  >
                    (§ 2b BEEG ↗)
                  </span>
                </button>
                <span className="badge-gain">
                  {customTaxClassSwitches.value.length} Switches Active
                </span>
              </div>

              {/* Dynamic Tax Class Switches List */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                {customTaxClassSwitches.value.map((sw, idx) => {
                  const sMonth = sw.effectiveSimulationMonth as number;
                  const rMonth = sw.revertSimulationMonth as number;

                  return (
                    <div
                      key={sw.switchId || `switch-${idx}`}
                      style={{
                        background: "var(--bg-surface-secondary)",
                        padding: "8px 10px",
                        borderRadius: "5px",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.74rem",
                            fontWeight: 800,
                            color: "var(--color-gain)",
                          }}
                        >
                          Switch #{idx + 1}: H: {sw.targetHusbandTaxClass} | W:{" "}
                          {sw.targetWifeTaxClass}
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
                              padding: "2px 5px",
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.70rem",
                          color: "var(--text-secondary)",
                          marginBottom: "2px",
                        }}
                      >
                        <span>
                          Effective:{" "}
                          <strong style={{ color: "var(--color-gain)" }}>
                            {getCalDate(sMonth)}
                          </strong>{" "}
                          (M{sMonth})
                        </span>
                        <span>
                          Revert:{" "}
                          <strong style={{ color: "var(--color-warning)" }}>
                            {getCalDate(rMonth)}
                          </strong>{" "}
                          (M{rMonth})
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.64rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        ↳ {sw.statutoryReason}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Tax Class Switch Button */}
              <button
                type="button"
                onClick={() => {
                  const count = customTaxClassSwitches.value.length;
                  const nextChild =
                    customPregnancies.value[count] ||
                    customPregnancies.value[customPregnancies.value.length - 1];
                  const delivery =
                    (nextChild?.calculatedDeliverySimulationMonth as number) ||
                    44;
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
                    effectiveCalendarYear: sYear,
                    targetHusbandTaxClass: TaxClass.V,
                    targetWifeTaxClass: TaxClass.III,
                    statutoryReason: `Optimize Child ${count + 1} Elterngeld assessment baseline (§ 2b BEEG)`,
                    revertSimulationMonth: toSimulationMonth(delivery),
                  });
                }}
                style={{
                  width: "100%",
                  padding: "6px",
                  background: "var(--color-gain-bg)",
                  color: "var(--color-gain)",
                  border: "1px solid var(--color-gain-border)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  marginBottom: "10px",
                }}
              >
                ➕ Add Tax Class Switch (Swap #
                {customTaxClassSwitches.value.length + 1})
              </button>

              {/* Wife Optimized Class III FT Net */}
              <div style={{ marginBottom: "8px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.74rem",
                    marginBottom: "2px",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>
                    Wife Net in Class III (Full-Time):
                  </span>
                  <span
                    style={{
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 700,
                      color: "var(--color-gain)",
                    }}
                  >
                    {formatCurrency(wifeClass3FullTimeNet.value)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1600"
                  max="5500"
                  step="25"
                  value={wifeClass3FullTimeNet.value}
                  onInput={(e) => {
                    wifeClass3FullTimeNet.value = toNetSalary(
                      Number((e.target as HTMLInputElement).value),
                    );
                  }}
                />
              </div>

              {/* Husband Class V Net during Swap */}
              <div style={{ marginBottom: "8px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.74rem",
                    marginBottom: "2px",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>
                    Husband Net in Class V (Swap):
                  </span>
                  <span
                    style={{
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 700,
                      color: "var(--color-warning)",
                    }}
                  >
                    {formatCurrency(husbandClass5Net.value)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="5500"
                  step="25"
                  value={husbandClass5Net.value}
                  onInput={(e) => {
                    husbandClass5Net.value = toNetSalary(
                      Number((e.target as HTMLInputElement).value),
                    );
                  }}
                />
              </div>
            </div>

            {/* ======================================================== */}
            {/* BATCH 3: SALARY RAISES & CAREER PROGRESSION */}
            {/* ======================================================== */}
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "16px",
                borderRadius: "var(--border-radius)",
                border: "1px solid var(--border-subtle)",
                gridColumn: "span 1",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "0.88rem",
                    color: "var(--color-warning)",
                  }}
                >
                  3. Salary Raises & Career
                </span>
                <span className="badge-warning">
                  {customSalaryRaises.value.length} Raises Active
                </span>
              </div>

              {/* Dynamic Salary Raises List */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                {customSalaryRaises.value.map((sr, idx) => {
                  const sMonth = sr.effectiveSimulationMonth as number;

                  return (
                    <div
                      key={sr.raiseId || `raise-${idx}`}
                      style={{
                        background: "var(--bg-surface-secondary)",
                        padding: "8px 10px",
                        borderRadius: "5px",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "3px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.74rem",
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
                            padding: "2px 5px",
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.70rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span>
                          Effective:{" "}
                          <strong style={{ color: "var(--color-warning)" }}>
                            {getCalDate(sMonth)}
                          </strong>{" "}
                          (M{sMonth})
                        </span>
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.65rem",
                          }}
                        >
                          {sr.reason}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

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
                    effectiveCalendarYear: sYear,
                    targetPerson: TargetPerson.Both,
                    percentageIncrease: 0.05,
                    reason: `Merit Promotion / Tariff Adjustment (+5%)`,
                  });
                }}
                style={{
                  width: "100%",
                  padding: "6px",
                  background: "var(--color-warning-bg)",
                  color: "var(--color-warning)",
                  border: "1px solid var(--color-warning-border)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  marginBottom: "10px",
                }}
              >
                ➕ Add Career Raise / Promotion
              </button>
            </div>

            {/* ======================================================== */}
            {/* BATCH 4: FINANCIAL EVENTS (ONE-OFF COSTS & INFLOWS) */}
            {/* ======================================================== */}
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "16px",
                borderRadius: "var(--border-radius)",
                border: "1px solid var(--border-subtle)",
                gridColumn: "span 1",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "0.88rem",
                    color: "var(--color-loss)",
                  }}
                >
                  4. Financial Events & Costs
                </span>
                <span className="badge-loss">
                  {customFinancialEvents.value.length} Events Active
                </span>
              </div>

              {/* Dynamic Financial Events List */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                {customFinancialEvents.value.map((fe, idx) => {
                  const sMonth = fe.effectiveSimulationMonth as number;
                  const isCost = (fe.amount as number) < 0;

                  return (
                    <div
                      key={fe.eventId || `fe-${idx}`}
                      style={{
                        background: "var(--bg-surface-secondary)",
                        padding: "8px 10px",
                        borderRadius: "5px",
                        border: isCost
                          ? "1px solid var(--color-loss-border)"
                          : "1px solid var(--color-gain-border)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "3px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <span
                            className={isCost ? "badge-loss" : "badge-gain"}
                          >
                            {isCost ? "💸 COST" : "💰 INFLOW"}
                          </span>
                          <span
                            style={{
                              fontSize: "0.74rem",
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
                              fontSize: "0.78rem",
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
                              padding: "2px 5px",
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.70rem",
                          color: "var(--text-secondary)",
                          marginBottom: "2px",
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
                          (M{sMonth})
                        </span>
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.65rem",
                          }}
                        >
                          {fe.category}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {fe.description}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Financial Cost Button */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px",
                }}
              >
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
                      effectiveSimulationMonth: toSimulationMonth(defaultMonth),
                      effectiveCalendarMonth: sMonth,
                      effectiveCalendarYear: sYear,
                      title: `Child Expense / Equipment #${count + 1}`,
                      amount: toEuroAmount(-1000),
                      category: FinancialEventCategory.BabyEquipment,
                      description: "Custom family nursery or childcare expense",
                    });
                  }}
                  style={{
                    padding: "6px",
                    background: "var(--color-loss-bg)",
                    color: "var(--color-loss)",
                    border: "1px solid var(--color-loss-border)",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ➕ Add Cost (-1.000 €)
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
                      effectiveSimulationMonth: toSimulationMonth(defaultMonth),
                      effectiveCalendarMonth: sMonth,
                      effectiveCalendarYear: sYear,
                      title: `Family Bonus / Grant #${count + 1}`,
                      amount: toEuroAmount(1500),
                      category: FinancialEventCategory.CareerBonus,
                      description: "Special employer bonus or one-off grant",
                    });
                  }}
                  style={{
                    padding: "6px",
                    background: "var(--color-gain-bg)",
                    color: "var(--color-gain)",
                    border: "1px solid var(--color-gain-border)",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ➕ Add Inflow (+1.500 €)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
