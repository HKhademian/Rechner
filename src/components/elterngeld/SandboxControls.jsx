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
      birthSpacingMonths.value = 27;
      swapLeadMonths.value = 7;
    } else if (presetName === 'equal') {
      husbandClass3Net.value = 3400;
      husbandClass5Net.value = 2600;
      wifeClass5FullTimeNet.value = 2600;
      wifeClass3FullTimeNet.value = 3400;
      wifeClass5PartTimeNet.value = 1600;
      wifeClass3PartTimeNet.value = 2100;
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
            background: 'rgba(59, 130, 246, 0.2)',
            padding: '8px',
            borderRadius: '8px',
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
              The Sandbox: Household Financial Parameters & Timeline Controls
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Freely tweak salaries, tax bracket nets, pregnancy spacing, or tax swap timing to simulate cascading payouts.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: '#93c5fd', fontWeight: 600 }}>
            {isOpen ? 'Collapse Controls ▴' : 'Expand Controls ▾'}
          </span>
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: '20px', borderTop: '1px solid rgba(51, 65, 85, 0.6)', paddingTop: '18px' }}>
          {/* Quick Presets & Reset Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '20px',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(51, 65, 85, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('default')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #3b82f6',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#93c5fd',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Standard Case (Default)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('high_earner')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #a855f7',
                  background: 'rgba(168, 85, 247, 0.2)',
                  color: '#d8b4fe',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                High Earner Family
              </button>
              <button
                type="button"
                onClick={() => applyPreset('equal')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #10b981',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#6ee7b7',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Equal Earner Couple
              </button>
            </div>

            <button
              type="button"
              onClick={resetToDefaults}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: '1px solid #64748b',
                background: 'rgba(51, 65, 85, 0.4)',
                color: '#cbd5e1',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>↺</span> Reset All Defaults
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
              background: 'rgba(15, 23, 42, 0.4)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(99, 102, 241, 0.25)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '14px',
                borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
                paddingBottom: '8px'
              }}>
                <span style={{ fontSize: '1rem' }}>👨</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#818cf8' }}>
                  Husband Parameters (32h / week)
                </span>
              </div>

              {/* Husband Full-Time Net Class III */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Full-time Net (Tax Class III):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#818cf8' }}>
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
                  <span style={{ color: '#cbd5e1' }}>Unoptimized Net (Tax Class V during Swap):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}>
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
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  Monthly swap withholding deficit: -{formatCurrency(husbandClass3Net.value - husbandClass5Net.value)}/mo
                </div>
              </div>

              {/* Husband Weekly Hours */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Working Hours (Partnermonate / Bonus):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#818cf8' }}>
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
                <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '2px' }}>
                  ✓ Qualifies for 4 Partnermonate + 4 Partnerschaftsbonus months (24–32h range)
                </div>
              </div>
            </div>

            {/* Column 2: Wife Parameters */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.4)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(14, 165, 233, 0.25)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '14px',
                borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
                paddingBottom: '8px'
              }}>
                <span style={{ fontSize: '1rem' }}>👩</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#38bdf8' }}>
                  Wife Parameters (40h pre-birth → 24h post-birth)
                </span>
              </div>

              {/* Wife Full-Time Net Class V */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Full-time Net (Class V):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
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
                  <span style={{ color: '#cbd5e1' }}>Optimized Full-time Net (Class III):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
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
                  <span style={{ color: '#cbd5e1' }}>Part-time Net (Class V - 24h):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
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
                  <span style={{ color: '#cbd5e1' }}>Optimized Part-time Net (Class III - 24h):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
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
              background: 'rgba(15, 23, 42, 0.4)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(168, 85, 247, 0.25)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '14px',
                borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
                paddingBottom: '8px'
              }}>
                <span style={{ fontSize: '1rem' }}>⏱️</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#c084fc' }}>
                  Timeline Spacing & Benefit Rates
                </span>
              </div>

              {/* Kindergeld */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Kindergeld (per child / mo):</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f43f5e' }}>
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
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#c084fc' }}>
                    {birthSpacingMonths.value} months (18M gap)
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
                <div style={{ fontSize: '0.7rem', color: birthSpacingMonths.value < 36 ? '#10b981' : '#f59e0b', marginTop: '2px' }}>
                  {birthSpacingMonths.value < 36
                    ? `✓ Qualifies for +10% Geschwisterbonus (expires at Month ${9 + 36})`
                    : '⚠️ Spacing ≥36 months: Geschwisterbonus does not apply'}
                </div>
              </div>

              {/* Swap Lead Time (Months before Mutterschutz) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>Tax Class Swap Lead Time:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
                    {swapLeadMonths.value} months pre-Mutterschutz
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
                <div style={{ fontSize: '0.7rem', color: swapLeadMonths.value >= 7 ? '#10b981' : '#ef4444', marginTop: '2px' }}>
                  {swapLeadMonths.value >= 7
                    ? '✓ 7+ months guarantees Class III as predominant bracket in 12M window'
                    : '⚠️ <7 months may fail the predominant tax class test (BEEG)'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
