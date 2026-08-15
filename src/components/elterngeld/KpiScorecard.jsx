import {
  currentScenarioData,
  comparisonMetrics,
  activeScenario
} from '../../store/elterngeldStore';

function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export default function KpiScorecard() {
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
        borderLeft: '4px solid #6366f1'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Earned Salaries
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
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '10px',
            padding: '8px',
            color: '#818cf8'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
          Husband (32h) & Wife (40h pre-birth / 24h part-time)
        </div>
      </div>

      {/* KPI Card 2: State Benefits Extracted */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: '4px solid #10b981'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              State Benefits Extracted
            </div>
            <div style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: '#10b981',
              margin: '6px 0 4px 0',
              letterSpacing: '-0.02em',
              fontFamily: 'monospace'
            }}>
              {formatCurrency(current.summary.totalBenefits)}
            </div>
          </div>
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '8px',
            color: '#34d399'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
        </div>
        
        {/* Breakdown chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            Mutterschutz: {formatCurrency(current.summary.totalMutterschutz)}
          </span>
          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            Elterngeld: {formatCurrency(current.summary.totalWifeElterngeld + current.summary.totalHusbandElterngeld)}
          </span>
          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(244, 63, 94, 0.2)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
            Kindergeld: {formatCurrency(current.summary.totalKindergeld)}
          </span>
        </div>
      </div>

      {/* KPI Card 3: Finanzamt Tax Refund */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: '4px solid #06b6d4'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Finanzamt Tax Refund
            </div>
            <div style={{
              fontSize: '1.9rem',
              fontWeight: 800,
              color: '#06b6d4',
              margin: '6px 0 4px 0',
              letterSpacing: '-0.02em',
              fontFamily: 'monospace'
            }}>
              {formatCurrency(current.summary.totalTaxRefunds)}
            </div>
          </div>
          <div style={{
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '10px',
            padding: '8px',
            color: '#22d3ee'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 21h5v-5"/>
            </svg>
          </div>
        </div>
        <div style={{ fontSize: '0.78rem', color: isScenarioC ? '#a5f3fc' : '#64748b', marginTop: '6px' }}>
          {isScenarioC
            ? '✓ Annual reconciliation refunds monthly III/V swap withholding deficit'
            : 'No tax class swaps performed (0 reconciliation)'}
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
              Gesamter Mittelzufluss (60M)
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
            borderRadius: '10px',
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
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '6px',
              padding: '3px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#34d399'
            }}>
              <span>+{formatCurrency(metrics.gainCvsB)} Mehrertrag ggü. Szenario B</span>
            </div>
          )}
          {isScenarioB && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '6px',
              padding: '3px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#fbbf24'
            }}>
              <span>Differenz zu Szenario C: -{formatCurrency(metrics.gainCvsB)}</span>
            </div>
          )}
          {isScenarioA && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(148, 163, 184, 0.15)',
              border: '1px solid rgba(148, 163, 184, 0.35)',
              borderRadius: '6px',
              padding: '3px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#cbd5e1'
            }}>
              <span>Basisverlauf: €6.125 / Monat Netto</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
