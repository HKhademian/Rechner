import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
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
  LegalRuleKey
} from '#store/elterngeldStore';
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
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  toFinancialEventId
} from '#engine/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

const MONTH_NAMES = [
  '01 - January (Januar)',
  '02 - February (Februar)',
  '03 - March (März)',
  '04 - April (April)',
  '05 - May (Mai)',
  '06 - June (Juni)',
  '07 - July (Juli)',
  '08 - August (August)',
  '09 - September (September)',
  '10 - October (Oktober)',
  '11 - November (November)',
  '12 - December (Dezember)'
];

export default function SandboxControls(): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [showDeductionsBreakdown, setShowDeductionsBreakdown] = useState<boolean>(false);

  // Helper to compute calendar date for simulation month offset
  const getCalDate = (simMonth: number): string => {
    const totalElapsed = (startCalendarMonth.value - 1) + (simMonth - 1);
    const m = (totalElapsed % 12) + 1;
    const y = startCalendarYear.value + Math.floor(totalElapsed / 12);
    return `${String(m).padStart(2, '0')}.${y}`;
  };

  // Preset Handlers
  const applyPreset = (presetName: 'default' | 'high_earner' | 'equal'): void => {
    if (presetName === 'default') {
      resetToDefaults();
      setSalaryInputMode(SalaryInputMode.Gross);
      setHusbandGross(4500);
      setWifeGross(3000);
    } else if (presetName === 'high_earner') {
      setSalaryInputMode(SalaryInputMode.Gross);
      setHusbandGross(8200);
      setWifeGross(4500);
      wifeInitialHours.value = 40;
      wifePostBirthHours.value = 24;
      prePregnancyPlanningMonths.value = 8;
      child1BirthMonth.value = 17;
      birthSpacingMonths.value = 27;
      swapLeadMonths.value = 7;
    } else if (presetName === 'equal') {
      setSalaryInputMode(SalaryInputMode.Gross);
      setHusbandGross(4800);
      setWifeGross(4800);
      wifeInitialHours.value = 40;
      wifePostBirthHours.value = 24;
      prePregnancyPlanningMonths.value = 8;
      child1BirthMonth.value = 17;
      birthSpacingMonths.value = 24;
      swapLeadMonths.value = 7;
    }
  };

  const preg1SimMonth = prePregnancyPlanningMonths.value + 1;
  const b1SimMonth = child1BirthMonth.value;
  const b2SimMonth = b1SimMonth + birthSpacingMonths.value;
  const endSimMonth = simulationDurationMonths.value;

  return (
    <div className="glass-panel" style={{ padding: '22px', marginBottom: '28px' }}>
      {/* Header with Collapsible Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer'
      }} onClick={() => setIsOpen(!isOpen)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(30, 64, 175, 0.2)',
            padding: '8px',
            borderRadius: '6px',
            color: '#60a5fa'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" x2="20" y1="21" y2="21"/>
              <line x1="4" x2="20" y1="3" y2="3"/>
              <line x1="4" x2="20" y1="12" y2="12"/>
              <circle cx="9" cy="21" r="2"/>
              <circle cx="15" cy="3" r="2"/>
              <circle cx="11" cy="12" r="2"/>
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Discrete Batch Action Sandbox & Simulation Runner
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Configured via discrete batches: 0. Preexisting Baseline → 1. Pregnancy Decisions → 2. Tax Switches → 3. Salary Raises
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: '#93c5fd', fontWeight: 600 }}>
            {isOpen ? 'Collapse ▴' : 'Expand ▾'}
          </span>
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '18px' }}>
          {/* Quick Presets & Reset Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '20px',
            background: '#0f172a',
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>Scenario Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('default')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid #1e40af',
                  background: '#1e293b',
                  color: '#93c5fd',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Standard Baseline (Default)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('high_earner')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid #0f766e',
                  background: '#1e293b',
                  color: '#5eead4',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                High Earner Model
              </button>
              <button
                type="button"
                onClick={() => applyPreset('equal')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid #15803d',
                  background: '#1e293b',
                  color: '#86efac',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Equal Earner Model
              </button>
            </div>

            <button
              type="button"
              onClick={resetToDefaults}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: '1px solid #64748b',
                background: '#1e293b',
                color: '#cbd5e1',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Reset to Defaults
            </button>
          </div>

          {/* 4-Batch Grid Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '20px'
          }}>
            {/* ======================================================== */}
            {/* BATCH 0: PREEXISTING CONDITIONS & BASELINE INCOMES */}
            {/* ======================================================== */}
            <div style={{
              background: '#0f172a',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid #334155',
              gridColumn: 'span 1'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                borderBottom: '1px solid #334155',
                paddingBottom: '8px'
              }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#60a5fa' }}>
                  0. Preexisting Conditions
                </span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>
                  Start: {getCalDate(1)}
                </span>
              </div>

              {/* Simulation Start Date & Duration */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Sim Start & Horizon:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                    {getCalDate(1)} → {getCalDate(endSimMonth)} ({simulationDurationMonths.value}M)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px', marginBottom: '6px' }}>
                  <select
                    value={startCalendarMonth.value}
                    onChange={(e) => { startCalendarMonth.value = Number((e.target as HTMLSelectElement).value); }}
                    style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', padding: '3px 6px', fontSize: '0.74rem' }}
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={`start-m-${idx + 1}`} value={idx + 1}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={startCalendarYear.value}
                    onChange={(e) => { startCalendarYear.value = Number((e.target as HTMLSelectElement).value); }}
                    style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', padding: '3px 6px', fontSize: '0.74rem' }}
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                      <option key={`start-y-${yr}`} value={yr}>Year {yr}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[12, 24, 36, 48, 60, 72].map((dur) => (
                    <button
                      key={`dur-btn-${dur}`}
                      type="button"
                      onClick={() => { simulationDurationMonths.value = dur; }}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        border: simulationDurationMonths.value === dur ? '1px solid #38bdf8' : '1px solid #334155',
                        background: simulationDurationMonths.value === dur ? '#0284c7' : '#0f172a',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {dur}M
                    </button>
                  ))}
                </div>
              </div>

              {/* Cadence Switcher (Monthly vs Yearly) */}
              <div style={{
                background: '#1e293b',
                padding: '5px 8px',
                borderRadius: '4px',
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                  Salary Cadence:
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setSalaryPeriod(SalaryPeriod.Monthly)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '3px',
                      border: salaryPeriod.value === SalaryPeriod.Monthly ? '1px solid #38bdf8' : '1px solid transparent',
                      background: salaryPeriod.value === SalaryPeriod.Monthly ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                      color: salaryPeriod.value === SalaryPeriod.Monthly ? '#7dd3fc' : '#94a3b8',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    📅 Monthly (€/mo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryPeriod(SalaryPeriod.Yearly)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '3px',
                      border: salaryPeriod.value === SalaryPeriod.Yearly ? '1px solid #a855f7' : '1px solid transparent',
                      background: salaryPeriod.value === SalaryPeriod.Yearly ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                      color: salaryPeriod.value === SalaryPeriod.Yearly ? '#d8b4fe' : '#94a3b8',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    📆 Yearly (€/yr)
                  </button>
                </div>
              </div>

              {/* SECTION: PRIMARY HUSBAND GROSS COMPENSATION */}
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', border: '1px solid #334155', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#38bdf8', marginBottom: '8px' }}>
                  👤 Husband Gross Compensation
                </div>
                {/* Gross Amount Slider */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '2px' }}>
                    <span style={{ color: '#cbd5e1' }}>Gross Salary:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
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
                      onInput={(e) => { setHusbandGrossYearly(Number((e.target as HTMLInputElement).value)); }}
                    />
                  ) : (
                    <input
                      type="range"
                      min="2500"
                      max="12000"
                      step="50"
                      value={husbandGross.value}
                      onInput={(e) => { setHusbandGross(Number((e.target as HTMLInputElement).value)); }}
                    />
                  )}
                </div>

                {/* Husband Working Hours Slider */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '2px' }}>
                    <span style={{ color: '#94a3b8' }}>Weekly Working Hours:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#93c5fd' }}>
                      {husbandHours.value} hours / week
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    step="1"
                    value={husbandHours.value}
                    onInput={(e) => { setHusbandHours(Number((e.target as HTMLInputElement).value)); }}
                  />
                </div>

                {/* Husband Tax Class Badges */}
                <div style={{ display: 'flex', gap: '4px', fontSize: '0.66rem', flexWrap: 'wrap' }}>
                  <span style={{ background: '#0f172a', padding: '2px 5px', borderRadius: '3px', color: '#93c5fd' }}>
                    Class III: <strong>{formatCurrency(salaryPeriod.value === SalaryPeriod.Yearly ? (derivedSpousalSet.value.husbandClass3Net as number) * 12 : (derivedSpousalSet.value.husbandClass3Net as number))}</strong>{salaryPeriod.value === SalaryPeriod.Yearly ? '/yr' : ''}
                  </span>
                  <span style={{ background: '#0f172a', padding: '2px 5px', borderRadius: '3px', color: '#fde047' }}>
                    Class V: <strong>{formatCurrency(salaryPeriod.value === SalaryPeriod.Yearly ? (derivedSpousalSet.value.husbandClass5Net as number) * 12 : (derivedSpousalSet.value.husbandClass5Net as number))}</strong>{salaryPeriod.value === SalaryPeriod.Yearly ? '/yr' : ''}
                  </span>
                  <span style={{ background: '#0f172a', padding: '2px 5px', borderRadius: '3px', color: '#94a3b8' }}>
                    Class IV: {formatCurrency(salaryPeriod.value === SalaryPeriod.Yearly ? (derivedSpousalSet.value.husbandClass4Net as number) * 12 : (derivedSpousalSet.value.husbandClass4Net as number))}
                  </span>
                </div>
              </div>

              {/* SECTION: WIFE FULL-TIME PRE-PREGNANCY COMPENSATION */}
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', border: '1px solid #334155', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#2dd4bf', marginBottom: '8px' }}>
                  👩 Wife Pre-Pregnancy Full-Time Compensation
                </div>
                {/* Gross Amount Slider */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '2px' }}>
                    <span style={{ color: '#cbd5e1' }}>Full-Time Gross:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2dd4bf' }}>
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
                      onInput={(e) => { setWifeGrossYearly(Number((e.target as HTMLInputElement).value)); }}
                    />
                  ) : (
                    <input
                      type="range"
                      min="1500"
                      max="8000"
                      step="50"
                      value={wifeGross.value}
                      onInput={(e) => { setWifeGross(Number((e.target as HTMLInputElement).value)); }}
                    />
                  )}
                </div>

                {/* Wife Pre-Pregnancy Hours */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '2px' }}>
                    <span style={{ color: '#94a3b8' }}>Full-Time Working Hours:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#5eead4' }}>
                      {wifeInitialHours.value} hours / week
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="40"
                    step="1"
                    value={wifeInitialHours.value}
                    onInput={(e) => { setWifeInitialHours(Number((e.target as HTMLInputElement).value)); }}
                  />
                </div>

                {/* Wife FT Tax Class Badges */}
                <div style={{ display: 'flex', gap: '4px', fontSize: '0.66rem', flexWrap: 'wrap' }}>
                  <span style={{ background: '#0f172a', padding: '2px 5px', borderRadius: '3px', color: '#fde047' }}>
                    Class V: <strong>{formatCurrency(salaryPeriod.value === SalaryPeriod.Yearly ? (derivedSpousalSet.value.wifeClass5FullTimeNet as number) * 12 : (derivedSpousalSet.value.wifeClass5FullTimeNet as number))}</strong>{salaryPeriod.value === SalaryPeriod.Yearly ? '/yr' : ''}
                  </span>
                  <span style={{ background: '#0f172a', padding: '2px 5px', borderRadius: '3px', color: '#86efac' }}>
                    Class III: <strong>{formatCurrency(salaryPeriod.value === SalaryPeriod.Yearly ? (derivedSpousalSet.value.wifeClass3FullTimeNet as number) * 12 : (derivedSpousalSet.value.wifeClass3FullTimeNet as number))}</strong> (Booster!)
                  </span>
                </div>
              </div>

              {/* SECTION: WIFE POST-BIRTH PART-TIME RETURN TO WORK */}
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', border: '1px solid #334155', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#c084fc', marginBottom: '8px' }}>
                  👶 Wife Post-Birth Part-Time Return to Work
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '2px' }}>
                    <span style={{ color: '#cbd5e1' }}>Post-Birth Part-Time Hours:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#d8b4fe' }}>
                      {wifePostBirthHours.value} hours / week {wifePostBirthHours.value >= 24 && wifePostBirthHours.value <= 32 ? '✓ PB Eligible' : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="32"
                    step="1"
                    value={wifePostBirthHours.value}
                    onInput={(e) => { setWifePostBirthHours(Number((e.target as HTMLInputElement).value)); }}
                  />
                  <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '2px' }}>
                    ↳ Statutory BEEG corridor: 24–32h for Partnerschaftsbonus (§ 4b BEEG).
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', fontSize: '0.66rem', flexWrap: 'wrap' }}>
                  <span style={{ background: '#0f172a', padding: '2px 5px', borderRadius: '3px', color: '#fde047' }}>
                    PT Gross: {formatCurrency(salaryPeriod.value === SalaryPeriod.Yearly ? (derivedSpousalSet.value.wifeGrossPartTime as number) * 12 : (derivedSpousalSet.value.wifeGrossPartTime as number))}
                  </span>
                  <span style={{ background: '#0f172a', padding: '2px 5px', borderRadius: '3px', color: '#c4b5fd' }}>
                    PT Net (Class V): <strong>{formatCurrency(salaryPeriod.value === SalaryPeriod.Yearly ? (derivedSpousalSet.value.wifeClass5PartTimeNet as number) * 12 : (derivedSpousalSet.value.wifeClass5PartTimeNet as number))}</strong>
                  </span>
                </div>
              </div>

              {/* SECTION: HOW THE USER RECEIVES IT (BONUSES, 13TH MONTH & INVESTMENT INCOME) */}
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', border: '1px solid #334155', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#fbbf24', marginBottom: '8px' }}>
                  🎁 Additional Income & Inflow Channels
                </div>

                {/* 13th Month Salary Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>13th Month Salary:</span>
                  <button
                    type="button"
                    onClick={() => { enable13thSalary.value = !enable13thSalary.value; }}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      border: enable13thSalary.value ? '1px solid #f59e0b' : '1px solid #334155',
                      background: enable13thSalary.value ? '#d97706' : '#0f172a',
                      color: '#ffffff',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {enable13thSalary.value ? '✓ Active (May & Nov)' : '✕ Disabled'}
                  </button>
                </div>
                {enable13thSalary.value && (
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '8px', padding: '3px 5px', background: '#0f172a', borderRadius: '3px' }}>
                    ↳ 40% Vacation Bonus in May + 60% Christmas Bonus in Nov (§ 2c BEEG exempt).
                  </div>
                )}

                {/* Annual Performance Bonus Slider */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '2px' }}>
                    <span style={{ color: '#cbd5e1' }}>Annual Performance Bonus:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24' }}>
                      {formatCurrency(annualBonusGross.value)} gross / yr
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30000"
                    step="500"
                    value={annualBonusGross.value}
                    onInput={(e) => { setAnnualBonusGross(Number((e.target as HTMLInputElement).value)); }}
                  />
                  {annualBonusGross.value > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Payout Month:</span>
                      <select
                        value={annualBonusMonth.value}
                        onChange={(e) => { setAnnualBonusMonth(Number((e.target as HTMLSelectElement).value)); }}
                        style={{ background: '#0f172a', color: '#fde047', border: '1px solid #334155', borderRadius: '3px', padding: '1px 4px', fontSize: '0.68rem' }}
                      >
                        {MONTH_NAMES.map((mName, idx) => (
                          <option key={`bonus-m-${idx + 1}`} value={idx + 1}>{mName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Monthly Investment Returns & Capital Income */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '2px' }}>
                    <span style={{ color: '#cbd5e1' }}>Investment & Capital Returns:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>
                      {formatCurrency(investmentReturnMonthly.value)} / mo
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="50"
                    value={investmentReturnMonthly.value}
                    onInput={(e) => { setInvestmentReturnMonthly(Number((e.target as HTMLInputElement).value)); }}
                  />
                  <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '1px' }}>
                    ↳ Net dividend, rental return, or ETF capital cash flow (§ 20 EStG).
                  </div>
                </div>
              </div>

              {/* Deductions Breakdown Toggle */}
              <div style={{ marginBottom: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowDeductionsBreakdown(!showDeductionsBreakdown)}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #334155',
                    background: '#0f172a',
                    color: '#94a3b8',
                    fontSize: '0.68rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>📊 Statutory Tax & Social Deductions Breakdown</span>
                  <span>{showDeductionsBreakdown ? '▲ Hide' : '▼ Expand'}</span>
                </button>
                {showDeductionsBreakdown && (
                  <div style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '8px',
                    marginTop: '4px',
                    fontSize: '0.68rem',
                    color: '#cbd5e1'
                  }}>
                    <div style={{ fontWeight: 700, color: '#60a5fa', marginBottom: '4px' }}>
                      Husband (Class III): Deductions {formatCurrency(((derivedSpousalSet.value.husbandBreakdownClass3.monthlyGross as number) - (derivedSpousalSet.value.husbandBreakdownClass3.monthlyNetTakeHome as number)) * (salaryPeriod.value === SalaryPeriod.Yearly ? 12 : 1))} ({derivedSpousalSet.value.husbandBreakdownClass3.effectiveTotalDeductionRatePercent}%)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '6px' }}>
                      <span>• Social: {formatCurrency((derivedSpousalSet.value.husbandBreakdownClass3.totalSocialSecurity as number) * (salaryPeriod.value === SalaryPeriod.Yearly ? 12 : 1))}</span>
                      <span>• Tax: {formatCurrency((derivedSpousalSet.value.husbandBreakdownClass3.monthlyWageTax as number) * (salaryPeriod.value === SalaryPeriod.Yearly ? 12 : 1))}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: '#2dd4bf', marginBottom: '4px' }}>
                      Wife FT (Class V): Deductions {formatCurrency(((derivedSpousalSet.value.wifeBreakdownClass5FT.monthlyGross as number) - (derivedSpousalSet.value.wifeBreakdownClass5FT.monthlyNetTakeHome as number)) * (salaryPeriod.value === SalaryPeriod.Yearly ? 12 : 1))} ({derivedSpousalSet.value.wifeBreakdownClass5FT.effectiveTotalDeductionRatePercent}%)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                      <span>• Social: {formatCurrency((derivedSpousalSet.value.wifeBreakdownClass5FT.totalSocialSecurity as number) * (salaryPeriod.value === SalaryPeriod.Yearly ? 12 : 1))}</span>
                      <span>• Tax: {formatCurrency((derivedSpousalSet.value.wifeBreakdownClass5FT.monthlyWageTax as number) * (salaryPeriod.value === SalaryPeriod.Yearly ? 12 : 1))}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Kindergeld */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
                  <button
                    type="button"
                    onClick={() => scrollToLegalRule(LegalRuleKey.EStG_Kindergeld)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#cbd5e1',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Click to view § 66 EStG Kindergeld legal rule & example"
                  >
                    <span>Kindergeld</span>
                    <span style={{ color: '#60a5fa', textDecoration: 'underline', fontSize: '0.72rem' }}>(§ 66 EStG ↗)</span>:
                  </button>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fca5a5' }}>
                    {formatCurrency(kindergeldPerChild.value)} / mo
                  </span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="350"
                  step="5"
                  value={kindergeldPerChild.value}
                  onInput={(e) => { kindergeldPerChild.value = Number((e.target as HTMLInputElement).value); }}
                />
              </div>
            </div>

            {/* ======================================================== */}
            {/* BATCH 1: PREGNANCY POSITIVE DECISIONS & MILESTONES */}
            {/* ======================================================== */}
            <div style={{
              background: '#0f172a',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid #334155',
              gridColumn: 'span 1'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                borderBottom: '1px solid #334155',
                paddingBottom: '8px'
              }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#f472b6' }}>
                  1. Pregnancy Positive Decisions
                </span>
                <span style={{ fontSize: '0.68rem', color: '#fbcfe8', background: '#831843', padding: '2px 6px', borderRadius: '4px' }}>
                  {customPregnancies.value.length} Pregnancies Active
                </span>
              </div>

              {/* Dynamic Pregnancies List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                {customPregnancies.value.map((preg, idx) => {
                  const pSimMonth = preg.positiveTestSimulationMonth as number;
                  const dSimMonth = preg.calculatedDeliverySimulationMonth as number;
                  const isFirst = idx === 0;

                  return (
                    <div
                      key={preg.pregnancyId || `preg-${idx}`}
                      style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f472b6' }}>
                          Child #{preg.childIndex} Pregnancy
                        </span>
                        {customPregnancies.value.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePregnancyAction(preg.pregnancyId)}
                            style={{
                              background: '#7f1d1d',
                              color: '#fca5a5',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '2px 6px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            ✕ Remove
                          </button>
                        )}
                      </div>

                      {isFirst ? (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                            <div>
                              <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                                Positive Month:
                              </label>
                              <select
                                value={((startCalendarMonth.value - 1 + pSimMonth - 1) % 12) + 1}
                                onChange={(e) => {
                                  const m = Number((e.target as HTMLSelectElement).value);
                                  const curY = startCalendarYear.value + Math.floor(((startCalendarMonth.value - 1) + (pSimMonth - 1)) / 12);
                                  setPregnancy1PositiveDate(curY, m);
                                }}
                                style={{ width: '100%', background: '#0f172a', color: '#f9a8d4', border: '1px solid #475569', borderRadius: '4px', padding: '3px 4px', fontSize: '0.72rem', fontWeight: 700 }}
                              >
                                {MONTH_NAMES.map((name, mIdx) => (
                                  <option key={mIdx + 1} value={mIdx + 1}>{name.slice(0, 14)}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                                Positive Year:
                              </label>
                              <select
                                value={startCalendarYear.value + Math.floor(((startCalendarMonth.value - 1) + (pSimMonth - 1)) / 12)}
                                onChange={(e) => {
                                  const y = Number((e.target as HTMLSelectElement).value);
                                  const curM = ((startCalendarMonth.value - 1 + pSimMonth - 1) % 12) + 1;
                                  setPregnancy1PositiveDate(y, curM);
                                }}
                                style={{ width: '100%', background: '#0f172a', color: '#f9a8d4', border: '1px solid #475569', borderRadius: '4px', padding: '3px 4px', fontSize: '0.72rem', fontWeight: 700 }}
                              >
                                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#cbd5e1', marginBottom: '4px' }}>
                            <span>Positive: <strong style={{ color: '#f472b6' }}>{getCalDate(pSimMonth)}</strong> (M0)</span>
                            <span>Birth 1: <strong style={{ color: '#5eead4' }}>{getCalDate(dSimMonth)}</strong> (M+{dSimMonth - pSimMonth})</span>
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', background: '#0f172a', padding: '3px 5px', borderRadius: '3px' }}>
                            ↳ Sim Start: <strong>01.{startCalendarYear.value}</strong> ({prePregnancyPlanningMonths.value}M before preg)
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#cbd5e1', marginBottom: '4px' }}>
                            <span>Positive: <strong style={{ color: '#f472b6' }}>{getCalDate(pSimMonth)}</strong> (M{pSimMonth})</span>
                            <span>Birth #{preg.childIndex}: <strong style={{ color: '#5eead4' }}>{getCalDate(dSimMonth)}</strong> (M{dSimMonth})</span>
                          </div>
                          <div style={{ fontSize: '0.66rem', color: (dSimMonth - (customPregnancies.value[idx - 1]?.calculatedDeliverySimulationMonth as number || 0)) < 36 ? '#4ade80' : '#fbbf24' }}>
                            {(dSimMonth - (customPregnancies.value[idx - 1]?.calculatedDeliverySimulationMonth as number || 0)) < 36
                              ? `✓ Sibling Bonus (+10%) eligible (${dSimMonth - (customPregnancies.value[idx - 1]?.calculatedDeliverySimulationMonth as number || 0)}M spacing)`
                              : `✗ Sibling bonus expired (${dSimMonth - (customPregnancies.value[idx - 1]?.calculatedDeliverySimulationMonth as number || 0)}M spacing)`}
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
                  const lastDeliv = lastPreg.calculatedDeliverySimulationMonth as number;
                  const newSimMonth = Math.min(simulationDurationMonths.value - 10, lastDeliv + 19);

                  addPregnancyAction({
                    pregnancyId: toPregnancyId(`PREG-CUSTOM-${count + 1}`),
                    childIndex: count + 1,
                    positiveTestSimulationMonth: toSimulationMonth(newSimMonth),
                    calculatedDeliverySimulationMonth: toSimulationMonth(newSimMonth + 8),
                    motherPostBirthPartTimeHours: toEuroAmount(24) as unknown as import('#engine/types').WorkingHours,
                    motherPostBirthPartTimeClass5Net: toNetSalary(wifeClass5PartTimeNet.value),
                    motherPostBirthPartTimeClass3Net: toNetSalary(wifeClass3PartTimeNet.value),
                    fatherPartnerMonthsTaken: 4
                  });
                }}
                style={{
                  width: '100%',
                  padding: '6px',
                  background: '#831843',
                  color: '#fbcfe8',
                  border: '1px solid #be185d',
                  borderRadius: '5px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                ➕ Add Pregnancy (Child #{customPregnancies.value.length + 1})
              </button>

              {/* Mother Post-Birth Part-Time Working Hours & Auto-Calculated Net */}
              <div style={{ marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '2px' }}>
                  <span style={{ color: '#cbd5e1' }}>Mother Post-Birth Hours:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#5eead4' }}>
                    {wifePostBirthHours.value}h / week
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={wifePostBirthHours.value}
                  onInput={(e) => { wifePostBirthHours.value = Number((e.target as HTMLInputElement).value); }}
                />

                {/* Statutory Elterngeld & Partnership Bonus (§ 1 & § 4b BEEG) Indicators */}
                {wifePostBirthHours.value > 32 ? (
                  <div
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      fontSize: '0.66rem',
                      color: '#fecdd3',
                      background: '#881337',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      marginTop: '4px',
                      fontWeight: 600,
                      border: '1px solid #be123c'
                    }}
                  >
                    ⚠️ Exceeds Statutory Limit (§ 1 Abs. 1 Nr. 4 BEEG): Hours &gt; 32h / week disqualify from all Elterngeld (0 € benefit paid).
                  </div>
                ) : wifePostBirthHours.value >= 24 && wifePostBirthHours.value <= 32 ? (
                  <button
                    type="button"
                    onClick={() => scrollToLegalRule(LegalRuleKey.BEEG_PartnershipBonus)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      fontSize: '0.66rem',
                      color: '#86efac',
                      background: '#14532d',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      marginTop: '4px',
                      fontWeight: 600,
                      border: '1px solid #15803d',
                      cursor: 'pointer'
                    }}
                    title="Click to view § 4b BEEG Partnership Bonus rules and worked example"
                  >
                    ✓ ElterngeldPlus &amp; Partnerschaftsbonus (§ 4b BEEG ↗) corridor (24–32h / week)
                  </button>
                ) : wifePostBirthHours.value === 0 ? (
                  <div style={{
                    fontSize: '0.66rem',
                    color: '#93c5fd',
                    background: '#1e3a8a',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}>
                    ℹ Full Parental Leave (0h / 100% leave)
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => scrollToLegalRule(LegalRuleKey.BEEG_PartnershipBonus)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      fontSize: '0.66rem',
                      color: '#fde68a',
                      background: '#78350f',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      marginTop: '4px',
                      border: '1px solid #b45309',
                      cursor: 'pointer'
                    }}
                    title="Click to view § 4b BEEG corridor requirements"
                  >
                    ℹ Eligible for ElterngeldPlus (≤ 32h), but outside Partnerschaftsbonus corridor (must be 24–32h for +4 bonus months ↗)
                  </button>
                )}

                {/* Real-time Statutorily Calculated Breakdown */}
                <div style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '5px',
                  padding: '8px 10px',
                  marginTop: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#cbd5e1' }}>
                    <span>Calculated Part-Time Net (Class V):</span>
                    <strong style={{ color: '#5eead4', fontFamily: 'monospace' }}>
                      {formatCurrency(wifeClass5PartTimeNet.value)}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#cbd5e1' }}>
                    <button
                      type="button"
                      onClick={() => scrollToLegalRule(LegalRuleKey.BEEG_SyntheticNet)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#cbd5e1',
                        padding: 0,
                        cursor: 'pointer',
                        fontSize: '0.70rem',
                        textAlign: 'left',
                        textDecoration: 'underline'
                      }}
                      title="Click to view ElterngeldPlus § 4 BEEG replacement rules and €900 cap"
                    >
                      Statutory ElterngeldPlus (65% loss ↗):
                    </button>
                    <strong style={{ color: '#f472b6', fontFamily: 'monospace' }}>
                      +{formatCurrency(Math.min(900, Math.max(150, Math.round(Math.max(0, wifeClass3FullTimeNet.value - wifeClass5PartTimeNet.value) * 0.65))))}
                    </strong>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: '#f8fafc',
                    borderTop: '1px solid #334155',
                    paddingTop: '4px',
                    marginTop: '2px',
                    fontWeight: 700
                  }}>
                    <span>Total Monthly Mother Inflow:</span>
                    <span style={{ color: '#4ade80', fontFamily: 'monospace' }}>
                      {formatCurrency(wifeClass5PartTimeNet.value + Math.min(900, Math.max(150, Math.round(Math.max(0, wifeClass3FullTimeNet.value - wifeClass5PartTimeNet.value) * 0.65))))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* BATCH 2: TAX CLASS SWITCHES (§ 2b BEEG) */}
            {/* ======================================================== */}
            <div style={{
              background: '#0f172a',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid #334155',
              gridColumn: 'span 1'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                borderBottom: '1px solid #334155',
                paddingBottom: '8px'
              }}>
                <button
                  type="button"
                  onClick={() => scrollToLegalRule(LegalRuleKey.BEEG_TaxSwap)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    color: '#4ade80',
                    textAlign: 'left',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Click to view § 2b BEEG & BFH VI R 2/13 tax optimization rules"
                >
                  <span>2. Tax Class Switches</span>
                  <span style={{ fontSize: '0.72rem', textDecoration: 'underline' }}>(§ 2b BEEG ↗)</span>
                </button>
                <span style={{ fontSize: '0.68rem', color: '#86efac', background: '#14532d', padding: '2px 6px', borderRadius: '4px' }}>
                  {customTaxClassSwitches.value.length} Switches Active
                </span>
              </div>

              {/* Dynamic Tax Class Switches List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {customTaxClassSwitches.value.map((sw, idx) => {
                  const sMonth = sw.effectiveSimulationMonth as number;
                  const rMonth = sw.revertSimulationMonth as number;

                  return (
                    <div
                      key={sw.switchId || `switch-${idx}`}
                      style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '5px', border: '1px solid #334155' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#4ade80' }}>
                          Switch #{idx + 1}: H: {sw.targetHusbandTaxClass} | W: {sw.targetWifeTaxClass}
                        </span>
                        {customTaxClassSwitches.value.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTaxClassSwitchAction(sw.switchId)}
                            style={{
                              background: '#7f1d1d',
                              color: '#fca5a5',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '2px 5px',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#cbd5e1', marginBottom: '2px' }}>
                        <span>Effective: <strong style={{ color: '#86efac' }}>{getCalDate(sMonth)}</strong> (M{sMonth})</span>
                        <span>Revert: <strong style={{ color: '#fbbf24' }}>{getCalDate(rMonth)}</strong> (M{rMonth})</span>
                      </div>
                      <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
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
                  const nextChild = customPregnancies.value[count] || customPregnancies.value[customPregnancies.value.length - 1];
                  const delivery = (nextChild?.calculatedDeliverySimulationMonth as number) || 44;
                  const start = Math.max(1, delivery - 8);
                  const totalElapsed = (startCalendarMonth.value - 1) + (start - 1);
                  const sMonth = toCalendarMonth((totalElapsed % 12) + 1);
                  const sYear = startCalendarYear.value + Math.floor(totalElapsed / 12);

                  addTaxClassSwitchAction({
                    switchId: toSwitchId(`SWAP-CHILD-${count + 1}`),
                    effectiveSimulationMonth: toSimulationMonth(start),
                    effectiveCalendarMonth: sMonth,
                    effectiveCalendarYear: sYear,
                    targetHusbandTaxClass: TaxClass.V,
                    targetWifeTaxClass: TaxClass.III,
                    statutoryReason: `Optimize Child ${count + 1} Elterngeld assessment baseline (§ 2b BEEG)`,
                    revertSimulationMonth: toSimulationMonth(delivery)
                  });
                }}
                style={{
                  width: '100%',
                  padding: '6px',
                  background: '#14532d',
                  color: '#86efac',
                  border: '1px solid #16a34a',
                  borderRadius: '4px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                ➕ Add Tax Class Switch (Swap #{customTaxClassSwitches.value.length + 1})
              </button>

              {/* Wife Optimized Class III FT Net */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '2px' }}>
                  <span style={{ color: '#cbd5e1' }}>Wife Net in Class III (Full-Time):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4ade80' }}>
                    {formatCurrency(wifeClass3FullTimeNet.value)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1600"
                  max="5500"
                  step="25"
                  value={wifeClass3FullTimeNet.value}
                  onInput={(e) => { wifeClass3FullTimeNet.value = Number((e.target as HTMLInputElement).value); }}
                />
              </div>

              {/* Husband Class V Net during Swap */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '2px' }}>
                  <span style={{ color: '#cbd5e1' }}>Husband Net in Class V (Swap):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24' }}>
                    {formatCurrency(husbandClass5Net.value)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="5500"
                  step="25"
                  value={husbandClass5Net.value}
                  onInput={(e) => { husbandClass5Net.value = Number((e.target as HTMLInputElement).value); }}
                />
              </div>
            </div>

            {/* ======================================================== */}
            {/* BATCH 3: SALARY RAISES & CAREER PROGRESSION */}
            {/* ======================================================== */}
            <div style={{
              background: '#0f172a',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid #334155',
              gridColumn: 'span 1'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                borderBottom: '1px solid #334155',
                paddingBottom: '8px'
              }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#fbbf24' }}>
                  3. Salary Raises & Career
                </span>
                <span style={{ fontSize: '0.68rem', color: '#fde68a', background: '#78350f', padding: '2px 6px', borderRadius: '4px' }}>
                  {customSalaryRaises.value.length} Raises Active
                </span>
              </div>

              {/* Dynamic Salary Raises List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {customSalaryRaises.value.map((sr, idx) => {
                  const sMonth = sr.effectiveSimulationMonth as number;

                  return (
                    <div
                      key={sr.raiseId || `raise-${idx}`}
                      style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '5px', border: '1px solid #334155' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#fbbf24' }}>
                          Raise #{idx + 1}: {sr.targetPerson.toUpperCase()} (+{((sr.percentageIncrease || 0) * 100).toFixed(0)}%)
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSalaryRaiseAction(sr.raiseId)}
                          style={{
                            background: '#7f1d1d',
                            color: '#fca5a5',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '2px 5px',
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#cbd5e1' }}>
                        <span>Effective: <strong style={{ color: '#fde68a' }}>{getCalDate(sMonth)}</strong> (M{sMonth})</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>{sr.reason}</span>
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
                  const totalElapsed = (startCalendarMonth.value - 1) + (newSimMonth - 1);
                  const sMonth = toCalendarMonth((totalElapsed % 12) + 1);
                  const sYear = startCalendarYear.value + Math.floor(totalElapsed / 12);

                  addSalaryRaiseAction({
                    raiseId: toRaiseId(`RAISE-CUSTOM-${count + 1}`),
                    effectiveSimulationMonth: toSimulationMonth(Math.min(simulationDurationMonths.value, newSimMonth)),
                    effectiveCalendarMonth: sMonth,
                    effectiveCalendarYear: sYear,
                    targetPerson: TargetPerson.Both,
                    percentageIncrease: 0.05,
                    reason: `Merit Promotion / Tariff Adjustment (+5%)`
                  });
                }}
                style={{
                  width: '100%',
                  padding: '6px',
                  background: '#78350f',
                  color: '#fde68a',
                  border: '1px solid #d97706',
                  borderRadius: '4px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                ➕ Add Career Raise / Promotion
              </button>
            </div>

            {/* ======================================================== */}
            {/* BATCH 4: FINANCIAL EVENTS (ONE-OFF COSTS & INFLOWS) */}
            {/* ======================================================== */}
            <div style={{
              background: '#0f172a',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid #334155',
              gridColumn: 'span 1'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                borderBottom: '1px solid #334155',
                paddingBottom: '8px'
              }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#f43f5e' }}>
                  4. Financial Events & Costs
                </span>
                <span style={{ fontSize: '0.68rem', color: '#fecdd3', background: '#881337', padding: '2px 6px', borderRadius: '4px' }}>
                  {customFinancialEvents.value.length} Events Active
                </span>
              </div>

              {/* Dynamic Financial Events List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {customFinancialEvents.value.map((fe, idx) => {
                  const sMonth = fe.effectiveSimulationMonth as number;
                  const isCost = (fe.amount as number) < 0;

                  return (
                    <div
                      key={fe.eventId || `fe-${idx}`}
                      style={{
                        background: '#1e293b',
                        padding: '8px 10px',
                        borderRadius: '5px',
                        border: isCost ? '1px solid #e11d48' : '1px solid #059669'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: isCost ? '#be123c' : '#047857',
                            color: '#ffffff'
                          }}>
                            {isCost ? '💸 COST' : '💰 INFLOW'}
                          </span>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: isCost ? '#fda4af' : '#6ee7b7' }}>
                            {fe.title}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.78rem', color: isCost ? '#f87171' : '#4ade80' }}>
                            {formatCurrency(fe.amount as number)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFinancialEventAction(fe.eventId)}
                            style={{
                              background: '#7f1d1d',
                              color: '#fca5a5',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '2px 5px',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#cbd5e1', marginBottom: '2px' }}>
                        <span>Effective: <strong style={{ color: isCost ? '#fca5a5' : '#86efac' }}>{getCalDate(sMonth)}</strong> (M{sMonth})</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>{fe.category}</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                        {fe.description}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Financial Cost Button */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const count = customFinancialEvents.value.length;
                    const defaultMonth = Math.min(simulationDurationMonths.value, child1BirthMonth.value + (count * 6));
                    const totalElapsed = (startCalendarMonth.value - 1) + (defaultMonth - 1);
                    const sMonth = toCalendarMonth((totalElapsed % 12) + 1);
                    const sYear = startCalendarYear.value + Math.floor(totalElapsed / 12);

                    addFinancialEventAction({
                      eventId: toFinancialEventId(`FIN-CUSTOM-COST-${count + 1}`),
                      effectiveSimulationMonth: toSimulationMonth(defaultMonth),
                      effectiveCalendarMonth: sMonth,
                      effectiveCalendarYear: sYear,
                      title: `Child Expense / Equipment #${count + 1}`,
                      amount: toEuroAmount(-1000),
                      category: FinancialEventCategory.BabyEquipment,
                      description: 'Custom family nursery or childcare expense'
                    });
                  }}
                  style={{
                    padding: '6px',
                    background: '#881337',
                    color: '#fecdd3',
                    border: '1px solid #be123c',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  ➕ Add Cost (-1.000 €)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const count = customFinancialEvents.value.length;
                    const defaultMonth = Math.min(simulationDurationMonths.value, 12 + (count * 6));
                    const totalElapsed = (startCalendarMonth.value - 1) + (defaultMonth - 1);
                    const sMonth = toCalendarMonth((totalElapsed % 12) + 1);
                    const sYear = startCalendarYear.value + Math.floor(totalElapsed / 12);

                    addFinancialEventAction({
                      eventId: toFinancialEventId(`FIN-CUSTOM-INCOME-${count + 1}`),
                      effectiveSimulationMonth: toSimulationMonth(defaultMonth),
                      effectiveCalendarMonth: sMonth,
                      effectiveCalendarYear: sYear,
                      title: `Family Bonus / Grant #${count + 1}`,
                      amount: toEuroAmount(1500),
                      category: FinancialEventCategory.CareerBonus,
                      description: 'Special employer bonus or one-off grant'
                    });
                  }}
                  style={{
                    padding: '6px',
                    background: '#064e3b',
                    color: '#a7f3d0',
                    border: '1px solid #059669',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer'
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
