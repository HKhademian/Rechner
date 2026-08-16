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
  prePregnancyPlanningMonths,
  child1BirthMonth,
  birthSpacingMonths,
  swapLeadMonths,
  resetToDefaults
} from '../../store/elterngeldStore';

function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export default function SandboxControls() {
  const [isOpen, setIsOpen] = useState(true);

  // Preset Handlers
  const applyPreset = (presetName) => {
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
              Parameter Sandbox & Timeline Calibration
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Fine-tune net salaries across tax classes, pre-pregnancy lead times, and birth spacing.
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
              <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>Presets:</span>
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

          {/* Grid Layout of Controls */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '24px'
          }}>
            {/* Column 1: Husband Parameters */}
            <div style={{
              background: '#0f172a',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid #334155'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '14px',
                borderBottom: '1px solid #334155',
                paddingBottom: '8px'
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#93c5fd' }}>
                  Husband Parameters (32h / week)
                </span>
              </div>

              {/* Husband Full-Time Net Class III */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Standard Net (*Steuerklasse III*):</span>
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
                  onInput={(e) => { husbandClass3Net.value = Number(e.target.value); }}
                />
              </div>

              {/* Husband Class V Net */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Net during swap (*Steuerklasse V*):</span>
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
                  onInput={(e) => { husbandClass5Net.value = Number(e.target.value); }}
                />
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                  Monthly cash withholding during swap: -{formatCurrency(husbandClass3Net.value - husbandClass5Net.value)}/mo (refunded via *Ehegatten-Splitting*)
                </div>
              </div>

              {/* Husband Weekly Hours */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Working Hours (Part-Time):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#93c5fd' }}>
                    {husbandHours.value} hrs / week
                  </span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="40"
                  step="1"
                  value={husbandHours.value}
                  onInput={(e) => { husbandHours.value = Number(e.target.value); }}
                />
                <div style={{ fontSize: '0.7rem', color: '#4ade80', marginTop: '2px' }}>
                  Eligible for 4 Partner Months (*Partnermonate*) + 4 Partnership Bonus Months (*Partnerschaftsbonus* § 4b BEEG)
                </div>
              </div>
            </div>

            {/* Column 2: Wife Parameters */}
            <div style={{
              background: '#0f172a',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid #334155'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '14px',
                borderBottom: '1px solid #334155',
                paddingBottom: '8px'
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#5eead4' }}>
                  Wife Parameters (40h pre-birth → 24h post-birth)
                </span>
              </div>

              {/* Wife Full-Time Net Class V */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Full-Time Net (*Steuerklasse V*):</span>
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
                  onInput={(e) => { wifeClass5FullTimeNet.value = Number(e.target.value); }}
                />
              </div>

              {/* Wife Full-Time Net Class III */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Optimized Full-Time Net (*Steuerklasse III*):</span>
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
                  onInput={(e) => { wifeClass3FullTimeNet.value = Number(e.target.value); }}
                />
              </div>

              {/* Wife Part-Time Net Class V */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Part-Time Net (*Steuerklasse V* - 24h):</span>
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
                  onInput={(e) => { wifeClass5PartTimeNet.value = Number(e.target.value); }}
                />
              </div>

              {/* Wife Part-Time Net Class III */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Optimized Part-Time Net (*Steuerklasse III* - 24h):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4ade80' }}>
                    {formatCurrency(wifeClass3PartTimeNet.value)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="4000"
                  step="20"
                  value={wifeClass3PartTimeNet.value}
                  onInput={(e) => { wifeClass3PartTimeNet.value = Number(e.target.value); }}
                />
              </div>
            </div>

            {/* Column 3: State Benefits & Timing Parameters */}
            <div style={{
              background: '#0f172a',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid #334155'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '14px',
                borderBottom: '1px solid #334155',
                paddingBottom: '8px'
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#93c5fd' }}>
                  Timeline, Lead Time & Benefits
                </span>
              </div>

              {/* Pre-Pregnancy Start Buffer */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Pre-Pregnancy Planning Buffer:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa' }}>
                    {prePregnancyPlanningMonths.value} Months
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={prePregnancyPlanningMonths.value}
                  onInput={(e) => {
                    const val = Number(e.target.value);
                    prePregnancyPlanningMonths.value = val;
                    child1BirthMonth.value = val + 9;
                  }}
                />
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                  Simulation starts M1 • Pregnancy starts M{prePregnancyPlanningMonths.value + 1} • Birth 1 occurs M{prePregnancyPlanningMonths.value + 9}
                </div>
              </div>

              {/* Kindergeld */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Child Benefit (*Kindergeld* § 66 EStG / child / mo):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fca5a5' }}>
                    {formatCurrency(kindergeldPerChild.value)}
                  </span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="350"
                  step="5"
                  value={kindergeldPerChild.value}
                  onInput={(e) => { kindergeldPerChild.value = Number(e.target.value); }}
                />
              </div>

              {/* Birth Spacing (Months between Birth 1 and Birth 2) */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Birth Spacing (Child 1 → Child 2):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#93c5fd' }}>
                    {birthSpacingMonths.value} Months
                  </span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="42"
                  step="1"
                  value={birthSpacingMonths.value}
                  onInput={(e) => { birthSpacingMonths.value = Number(e.target.value); }}
                />
                <div style={{ fontSize: '0.7rem', color: birthSpacingMonths.value < 36 ? '#4ade80' : '#fbbf24', marginTop: '2px' }}>
                  {birthSpacingMonths.value < 36
                    ? `Eligible for Sibling Bonus (*Geschwisterbonus* § 2a BEEG +10% until Month ${child1BirthMonth.value + 36})`
                    : 'Spacing ≥36 Months: Sibling bonus expires'}
                </div>
              </div>

              {/* Swap Lead Time (Months before Mutterschutz) */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Tax Class Swap Lead Time:</span>
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
                  onInput={(e) => { swapLeadMonths.value = Number(e.target.value); }}
                />
                <div style={{ fontSize: '0.7rem', color: swapLeadMonths.value >= 7 ? '#4ade80' : '#ef4444', marginTop: '2px' }}>
                  {swapLeadMonths.value >= 7
                    ? '7+ months guarantee Tax Class III dominance during the 12-month Elterngeld assessment period (*Überwiegende Steuerklasse* § 2b BEEG)'
                    : '<7 months risks default to Tax Class V under BEEG § 2b'}
                </div>
              </div>

              {/* 13th Month Salary Controls (Sonderzahlung / Jahressonderzahlung) */}
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #334155'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24' }}>
                    13th Month Salary (*13. Monatsgehalt*):
                  </span>
                  <button
                    type="button"
                    onClick={() => { enable13thSalary.value = !enable13thSalary.value; }}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: enable13thSalary.value ? '1px solid #b45309' : '1px solid #334155',
                      background: enable13thSalary.value ? '#b45309' : '#1e293b',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {enable13thSalary.value ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {enable13thSalary.value && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* 40% Vacation Bonus Month (M4 vs M5) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                      <span style={{ color: '#cbd5e1' }}>Part 1: 40% Vacation Bonus (*Urlaubsgeld*):</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[4, 5].map((mNum) => (
                          <button
                            key={`bonus40-opt-${mNum}`}
                            type="button"
                            onClick={() => { bonus40Month.value = mNum; }}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              border: bonus40Month.value === mNum ? '1px solid #f59e0b' : '1px solid #334155',
                              background: bonus40Month.value === mNum ? '#78350f' : '#0f172a',
                              color: bonus40Month.value === mNum ? '#fde68a' : '#94a3b8',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Month {mNum}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 60% Christmas Bonus Month (M10 vs M11) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                      <span style={{ color: '#cbd5e1' }}>Part 2: 60% Christmas Bonus (*Weihnachtsgeld*):</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[10, 11].map((mNum) => (
                          <button
                            key={`bonus60-opt-${mNum}`}
                            type="button"
                            onClick={() => { bonus60Month.value = mNum; }}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              border: bonus60Month.value === mNum ? '1px solid #f59e0b' : '1px solid #334155',
                              background: bonus60Month.value === mNum ? '#78350f' : '#0f172a',
                              color: bonus60Month.value === mNum ? '#fde68a' : '#94a3b8',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Month {mNum}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tax Return Month (M2 vs M3) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', marginTop: '10px' }}>
                  <span style={{ color: '#5eead4', fontWeight: 600 }}>Annual Tax Return (*Finanzamt*):</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[2, 3].map((mNum) => (
                      <button
                        key={`tax-opt-${mNum}`}
                        type="button"
                        onClick={() => { taxReturnMonth.value = mNum; }}
                        style={{
                          padding: '2px 6px',
                          borderRadius: '3px',
                          border: taxReturnMonth.value === mNum ? '1px solid #0f766e' : '1px solid #334155',
                          background: taxReturnMonth.value === mNum ? '#134e4a' : '#0f172a',
                          color: taxReturnMonth.value === mNum ? '#99f6e4' : '#94a3b8',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Month {mNum}
                      </button>
                    ))}
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
