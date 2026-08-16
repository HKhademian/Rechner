import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import {
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
  resetToDefaults
} from '#store/elterngeldStore';

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
    } else if (presetName === 'high_earner') {
      husbandClass3Net.value = 5200;
      husbandClass5Net.value = 3900;
      wifeClass5FullTimeNet.value = 2600;
      wifeClass3FullTimeNet.value = 3000;
      wifeClass5PartTimeNet.value = 1650;
      wifeClass3PartTimeNet.value = 2200;
      prePregnancyPlanningMonths.value = 3;
      birthSpacingMonths.value = 27;
      swapLeadMonths.value = 7;
    } else if (presetName === 'equal') {
      husbandClass3Net.value = 3400;
      husbandClass5Net.value = 2600;
      wifeClass5FullTimeNet.value = 2600;
      wifeClass3FullTimeNet.value = 3400;
      wifeClass5PartTimeNet.value = 1600;
      wifeClass3PartTimeNet.value = 2100;
      prePregnancyPlanningMonths.value = 3;
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
                  <span style={{ color: '#cbd5e1' }}>Sim Start & Duration:</span>
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

              {/* Husband Baseline Class III */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
                  <span style={{ color: '#cbd5e1' }}>Husband Class III Net (32h):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#93c5fd' }}>
                    {formatCurrency(husbandClass3Net.value)}
                  </span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="7000"
                  step="25"
                  value={husbandClass3Net.value}
                  onInput={(e) => { husbandClass3Net.value = Number((e.target as HTMLInputElement).value); }}
                />
              </div>

              {/* Wife Baseline Class V */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
                  <span style={{ color: '#cbd5e1' }}>Wife Class V FT Net (40h):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#5eead4' }}>
                    {formatCurrency(wifeClass5FullTimeNet.value)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1200"
                  max="4500"
                  step="25"
                  value={wifeClass5FullTimeNet.value}
                  onInput={(e) => { wifeClass5FullTimeNet.value = Number((e.target as HTMLInputElement).value); }}
                />
              </div>

              {/* Kindergeld */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
                  <span style={{ color: '#cbd5e1' }}>Kindergeld (§ 66 EStG):</span>
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
                  2 Pregnancies Active
                </span>
              </div>

              {/* Child 1 Pregnancy Milestone */}
              <div style={{ marginBottom: '12px', background: '#1e293b', padding: '8px 10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f9a8d4', marginBottom: '4px' }}>
                  Child 1 Pregnancy & Delivery:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#cbd5e1' }}>
                  <span>Positive Test: <strong>{getCalDate(preg1SimMonth)}</strong> (M{preg1SimMonth})</span>
                  <span>Birth 1: <strong>{getCalDate(b1SimMonth)}</strong> (M{b1SimMonth})</span>
                </div>
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
                    <span>Pre-Pregnancy Buffer:</span>
                    <span>{prePregnancyPlanningMonths.value} Months</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="1"
                    value={prePregnancyPlanningMonths.value}
                    onInput={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      prePregnancyPlanningMonths.value = val;
                      child1BirthMonth.value = val + 9;
                    }}
                  />
                </div>
              </div>

              {/* Child 2 Pregnancy Milestone & Spacing */}
              <div style={{ marginBottom: '12px', background: '#1e293b', padding: '8px 10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f9a8d4', marginBottom: '4px' }}>
                  Child 2 Pregnancy & Spacing:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#cbd5e1' }}>
                  <span>Birth 2 Date: <strong>{getCalDate(b2SimMonth)}</strong> (M{b2SimMonth})</span>
                  <span>Spacing: <strong>{birthSpacingMonths.value}M</strong></span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="42"
                  step="1"
                  value={birthSpacingMonths.value}
                  onInput={(e) => { birthSpacingMonths.value = Number((e.target as HTMLInputElement).value); }}
                />
                <div style={{ fontSize: '0.68rem', color: birthSpacingMonths.value < 36 ? '#4ade80' : '#fbbf24', marginTop: '2px' }}>
                  {birthSpacingMonths.value < 36 ? '✓ Sibling Bonus (+10%) eligible' : '✗ Sibling bonus expired (≥36M)'}
                </div>
              </div>

              {/* Wife Post-Birth Part-Time Net */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '2px' }}>
                  <span style={{ color: '#cbd5e1' }}>Post-Birth Part-Time (24h Net):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#5eead4' }}>
                    {formatCurrency(wifeClass5PartTimeNet.value)}
                  </span>
                </div>
                <input
                  type="range"
                  min="800"
                  max="3000"
                  step="20"
                  value={wifeClass5PartTimeNet.value}
                  onInput={(e) => { wifeClass5PartTimeNet.value = Number((e.target as HTMLInputElement).value); }}
                />
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
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#4ade80' }}>
                  2. Tax Class Switches
                </span>
                <span style={{ fontSize: '0.68rem', color: '#86efac', background: '#14532d', padding: '2px 6px', borderRadius: '4px' }}>
                  § 2b BEEG
                </span>
              </div>

              {/* Swap Lead Time */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
                  <span style={{ color: '#cbd5e1' }}>Proactive Switch Lead Time:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4ade80' }}>
                    {swapLeadMonths.value} Months pre-maternity
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={swapLeadMonths.value}
                  onInput={(e) => { swapLeadMonths.value = Number((e.target as HTMLInputElement).value); }}
                />
                <div style={{ fontSize: '0.68rem', color: swapLeadMonths.value >= 7 ? '#4ade80' : '#ef4444', marginTop: '2px' }}>
                  {swapLeadMonths.value >= 7
                    ? '✓ 7+ months guarantee Class III dominance (*Überwiegende Steuerklasse*)'
                    : '⚠ <7 months risks default to Class V under § 2b BEEG'}
                </div>
              </div>

              {/* Wife Optimized Class III FT Net */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
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
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '2px' }}>
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

              <div style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#1e293b', padding: '6px 8px', borderRadius: '4px' }}>
                Interim withholding deficit: -{formatCurrency(husbandClass3Net.value - husbandClass5Net.value)}/mo (reconciled in March tax return).
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
                <button
                  type="button"
                  onClick={() => { enableSalaryRaises.value = !enableSalaryRaises.value; }}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: enableSalaryRaises.value ? '1px solid #f59e0b' : '1px solid #334155',
                    background: enableSalaryRaises.value ? '#78350f' : '#1e293b',
                    color: enableSalaryRaises.value ? '#fde68a' : '#94a3b8',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {enableSalaryRaises.value ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Annual Raise Percentage Selector */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Annual Wage Growth Rate:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fde68a' }}>
                    +{annualSalaryRaisePercent.value}% / year
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[0, 2, 3, 5].map((pct) => (
                    <button
                      key={`pct-btn-${pct}`}
                      type="button"
                      onClick={() => {
                        enableSalaryRaises.value = pct > 0;
                        annualSalaryRaisePercent.value = pct;
                      }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '3px',
                        border: annualSalaryRaisePercent.value === pct ? '1px solid #f59e0b' : '1px solid #334155',
                        background: annualSalaryRaisePercent.value === pct ? '#78350f' : '#0f172a',
                        color: annualSalaryRaisePercent.value === pct ? '#fde68a' : '#94a3b8',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {pct === 0 ? 'Static (0%)' : `+${pct}% / yr`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 13th Salary Toggle & Controls */}
              <div style={{ borderTop: '1px solid #334155', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.76rem', color: '#cbd5e1', fontWeight: 600 }}>13th Month Salary Bonuses:</span>
                  <button
                    type="button"
                    onClick={() => { enable13thSalary.value = !enable13thSalary.value; }}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      border: enable13thSalary.value ? '1px solid #b45309' : '1px solid #334155',
                      background: enable13thSalary.value ? '#b45309' : '#1e293b',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {enable13thSalary.value ? 'Active' : 'Off'}
                  </button>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  ↳ 40% Vacation (May) + 60% Christmas (Nov) bonuses automatically factored into timeline.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
