import type { JSX } from 'preact';
import {
  currentScenarioData,
  comparisonMetrics,
  activeScenario,
  scrollToLegalRule,
  LegalRuleKey
} from '#store/elterngeldStore';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export default function KpiScorecard(): JSX.Element {
  const current = currentScenarioData.value;
  const metrics = comparisonMetrics.value;
  const scenario = activeScenario.value;

  const isScenarioC = scenario === 'C';
  const isScenarioB = scenario === 'B';
  const isScenarioA = scenario === 'A';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: '20px',
      marginBottom: '28px'
    }}>
      {/* KPI Card 1: Total Earned Salaries */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: '4px solid #1e40af'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Net Working Salaries
            </div>
            <div style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: '#f8fafc',
              margin: '6px 0 4px 0',
              letterSpacing: '-0.02em',
              fontFamily: 'monospace'
            }}>
              {formatCurrency(current.summary.totalSalaries)}
            </div>
          </div>
          <div style={{
            background: 'rgba(30, 64, 175, 0.15)',
            border: '1px solid rgba(30, 64, 175, 0.3)',
            borderRadius: '6px',
            padding: '8px',
            color: '#60a5fa'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: '#0f172a', color: '#93c5fd', border: '1px solid #334155' }}>
            Base Net: {formatCurrency(current.summary.totalSalaries - (current.summary.total13thSalaries || 0))}
          </span>
          {current.summary.total13thSalaries > 0 && (
            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: '#0f172a', color: '#fbbf24', border: '1px solid #b45309' }}>
              13th Month (*Sonderzahlung*): +{formatCurrency(current.summary.total13thSalaries)}
            </span>
          )}
        </div>
      </div>

      {/* KPI Card 2: State Benefits Extracted */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: '4px solid #15803d'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              State Benefits & Allowances
            </div>
            <div style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: '#4ade80',
              margin: '6px 0 4px 0',
              letterSpacing: '-0.02em',
              fontFamily: 'monospace'
            }}>
              {formatCurrency(current.summary.totalBenefits)}
            </div>
          </div>
          <div style={{
            background: 'rgba(21, 128, 61, 0.15)',
            border: '1px solid rgba(21, 128, 61, 0.3)',
            borderRadius: '6px',
            padding: '8px',
            color: '#4ade80'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
        </div>

        {/* Breakdown chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
          <button
            type="button"
            onClick={() => scrollToLegalRule(LegalRuleKey.MuSchG_Maternity)}
            style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '4px',
              background: '#0f172a',
              color: '#93c5fd',
              border: '1px solid #334155',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Click to view statutory MuSchG rule and worked example"
          >
            <span>Maternity (*MuSchG*):</span>
            <strong style={{ color: '#ffffff' }}>{formatCurrency(current.summary.totalMutterschutz)}</strong>
            <span style={{ color: '#60a5fa', fontSize: '0.65rem' }}>↗</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToLegalRule(LegalRuleKey.BEEG_SyntheticNet)}
            style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '4px',
              background: '#0f172a',
              color: '#86efac',
              border: '1px solid #334155',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Click to view statutory Elterngeld § 4 BEEG rule and worked example"
          >
            <span>Parental Allowance (*§ 4 BEEG*):</span>
            <strong style={{ color: '#ffffff' }}>{formatCurrency(current.summary.totalWifeElterngeld + current.summary.totalHusbandElterngeld)}</strong>
            <span style={{ color: '#4ade80', fontSize: '0.65rem' }}>↗</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToLegalRule(LegalRuleKey.EStG_Kindergeld)}
            style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '4px',
              background: '#0f172a',
              color: '#fca5a5',
              border: '1px solid #334155',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Click to view statutory Kindergeld § 66 EStG rule and worked example"
          >
            <span>Child Benefit (*§ 66 EStG*):</span>
            <strong style={{ color: '#ffffff' }}>{formatCurrency(current.summary.totalKindergeld)}</strong>
            <span style={{ color: '#f87171', fontSize: '0.65rem' }}>↗</span>
          </button>
        </div>
      </div>

      {/* KPI Card 3: Finanzamt Tax Refund */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: '4px solid #0f766e'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tax Office (*Finanzamt*) Refunds
            </div>
            <div style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: '#5eead4',
              margin: '6px 0 4px 0',
              letterSpacing: '-0.02em',
              fontFamily: 'monospace'
            }}>
              {formatCurrency(current.summary.totalTaxRefunds)}
            </div>
          </div>
          <div style={{
            background: 'rgba(15, 118, 110, 0.15)',
            border: '1px solid rgba(15, 118, 110, 0.3)',
            borderRadius: '6px',
            padding: '8px',
            color: '#5eead4'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 21h5v-5"/>
            </svg>
          </div>
        </div>
        <div style={{ fontSize: '0.76rem', color: isScenarioC ? '#93c5fd' : '#64748b', marginTop: '6px' }}>
          {isScenarioC ? (
            <button
              type="button"
              onClick={() => scrollToLegalRule(LegalRuleKey.EStG_TaxSplitting)}
              style={{
                background: 'none',
                border: 'none',
                color: '#5eead4',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.76rem',
                textDecoration: 'underline'
              }}
              title="Click to view § 26b EStG Marital Splitting rules & worked example"
            >
              Joint tax assessment (*Ehegatten-Splitting* § 26b EStG ↗) refunds 100% of interim wage tax deficits
            </button>
          ) : (
            'No tax class optimization performed (€0 refund)'
          )}
        </div>
      </div>

      {/* KPI Card 4: Grand Total Household Inflow */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: '4px solid #2563eb',
        background: '#1e293b'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total 5-Year Cash Inflow (60M)
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#f8fafc',
              margin: '6px 0 4px 0',
              letterSpacing: '-0.02em',
              fontFamily: 'monospace'
            }}>
              {formatCurrency(current.summary.grandTotal)}
            </div>
          </div>
          <div style={{
            background: 'rgba(37, 99, 235, 0.15)',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            borderRadius: '6px',
            padding: '8px',
            color: '#60a5fa'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 3h12l4 6-10 13L2 9Z"/>
              <path d="M11 3 8 9l4 13 4-13-3-6"/>
              <path d="M2 9h20"/>
            </svg>
          </div>
        </div>

        {/* Delta / Optimization pill */}
        <div style={{ marginTop: '8px' }}>
          {isScenarioC && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0f172a',
              border: '1px solid #15803d',
              borderRadius: '4px',
              padding: '3px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#4ade80'
            }}>
              <span>+{formatCurrency(metrics.gainCvsB)} Net Financial Gain vs. Scenario B</span>
            </div>
          )}
          {isScenarioB && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0f172a',
              border: '1px solid #b45309',
              borderRadius: '4px',
              padding: '3px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#fbbf24'
            }}>
              <span>Deficit vs. Scenario C: -{formatCurrency(metrics.gainCvsB)}</span>
            </div>
          )}
          {isScenarioA && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0f172a',
              border: '1px solid #475569',
              borderRadius: '4px',
              padding: '3px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#cbd5e1'
            }}>
              <span>Baseline: €6,125 / month net</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
