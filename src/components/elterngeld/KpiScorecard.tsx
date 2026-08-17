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
        borderLeft: '4px solid var(--series-salary-husband)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Net Working Salaries
            </div>
            <div style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '6px 0 4px 0',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {formatCurrency(current.summary.totalSalaries)}
            </div>
          </div>
          <div style={{
            background: 'var(--color-primary-bg)',
            border: '1px solid var(--color-primary-border)',
            borderRadius: 'var(--border-radius-sm)',
            padding: '8px',
            color: 'var(--color-primary)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: 'var(--border-radius-sm)',
            background: 'var(--bg-surface-secondary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)'
          }}>
            Base Net: {formatCurrency(current.summary.totalSalaries - (current.summary.total13thSalaries || 0))}
          </span>
          {current.summary.total13thSalaries > 0 && (
            <span style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: 'var(--border-radius-sm)',
              background: 'var(--color-warning-bg)',
              color: 'var(--color-warning)',
              border: '1px solid var(--color-warning-border)',
              fontWeight: 600
            }}>
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
        borderLeft: '4px solid var(--color-gain)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              State Benefits & Allowances
            </div>
            <div style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: 'var(--color-gain)',
              margin: '6px 0 4px 0',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {formatCurrency(current.summary.totalBenefits)}
            </div>
          </div>
          <div style={{
            background: 'var(--color-gain-bg)',
            border: '1px solid var(--color-gain-border)',
            borderRadius: 'var(--border-radius-sm)',
            padding: '8px',
            color: 'var(--color-gain)'
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
              borderRadius: 'var(--border-radius-sm)',
              background: 'var(--bg-surface-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'var(--transition)'
            }}
            title="Click to view statutory MuSchG rule and worked example"
          >
            <span>Maternity (*MuSchG*):</span>
            <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(current.summary.totalMutterschutz)}</strong>
            <span style={{ color: 'var(--color-primary)', fontSize: '0.65rem' }}>↗</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToLegalRule(LegalRuleKey.BEEG_SyntheticNet)}
            style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: 'var(--border-radius-sm)',
              background: 'var(--bg-surface-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'var(--transition)'
            }}
            title="Click to view statutory Elterngeld § 4 BEEG rule and worked example"
          >
            <span>Elterngeld (*§ 4 BEEG*):</span>
            <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(current.summary.totalWifeElterngeld + current.summary.totalHusbandElterngeld)}</strong>
            <span style={{ color: 'var(--color-gain)', fontSize: '0.65rem' }}>↗</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToLegalRule(LegalRuleKey.EStG_Kindergeld)}
            style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: 'var(--border-radius-sm)',
              background: 'var(--bg-surface-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'var(--transition)'
            }}
            title="Click to view statutory Kindergeld § 66 EStG rule and worked example"
          >
            <span>Kindergeld (*§ 66 EStG*):</span>
            <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(current.summary.totalKindergeld)}</strong>
            <span style={{ color: 'var(--color-warning)', fontSize: '0.65rem' }}>↗</span>
          </button>
        </div>
      </div>

      {/* KPI Card 3: Finanzamt Tax Refund */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: '4px solid var(--series-tax-refund)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tax Office (*Finanzamt*) Refunds
            </div>
            <div style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: 'var(--color-gain)',
              margin: '6px 0 4px 0',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {formatCurrency(current.summary.totalTaxRefunds)}
            </div>
          </div>
          <div style={{
            background: 'var(--color-gain-bg)',
            border: '1px solid var(--color-gain-border)',
            borderRadius: 'var(--border-radius-sm)',
            padding: '8px',
            color: 'var(--series-tax-refund)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 21h5v-5"/>
            </svg>
          </div>
        </div>
        <div style={{ fontSize: '0.76rem', color: isScenarioC ? 'var(--color-primary)' : 'var(--text-muted)', marginTop: '6px' }}>
          {isScenarioC ? (
            <button
              type="button"
              onClick={() => scrollToLegalRule(LegalRuleKey.EStG_TaxSplitting)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.76rem',
                fontWeight: 600,
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
        borderLeft: '4px solid var(--color-primary)',
        background: 'var(--bg-surface)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total 5-Year Cash Inflow (60M)
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '6px 0 4px 0',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {formatCurrency(current.summary.grandTotal)}
            </div>
          </div>
          <div style={{
            background: 'var(--color-primary-bg)',
            border: '1px solid var(--color-primary-border)',
            borderRadius: 'var(--border-radius-sm)',
            padding: '8px',
            color: 'var(--color-primary)'
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
            <div className="badge-gain">
              <span>+{formatCurrency(metrics.gainCvsB)} Net Financial Gain vs. Scenario B</span>
            </div>
          )}
          {isScenarioB && (
            <div className="badge-warning">
              <span>Deficit vs. Scenario C: -{formatCurrency(metrics.gainCvsB)}</span>
            </div>
          )}
          {isScenarioA && (
            <div className="badge-neutral">
              <span>Baseline: €6,125 / month net</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
