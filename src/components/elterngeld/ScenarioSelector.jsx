import { activeScenario, comparisonMetrics } from '../../store/elterngeldStore';

function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export default function ScenarioSelector() {
  const current = activeScenario.value;
  const metrics = comparisonMetrics.value;

  const scenarios = [
    {
      id: 'C',
      title: 'Scenario C',
      subtitle: 'Fully Optimized (Recommended)',
      badge: 'Maximum State Benefit',
      badgeColor: '#15803d',
      description: 'Proactive tax class swap (*Steuerklassenwechsel* III/V § 39e EStG) + Synthetic Net (*Fiktives Netto* § 2e BEEG) + Sibling Bonus (*Geschwisterbonus*) + Joint Tax Refund (*Ehegatten-Splitting*).',
      highlights: [
        'Mother: ElterngeldPlus capped at maximum €900 / month (§ 4 BEEG)',
        'Maternity Protection (*Mutterschutz* MuSchG) net pay at €2,603 / month',
        'Sibling Bonus (*Geschwisterbonus* § 2a BEEG) +10% until Child 1 turns 3',
        `Tax Office Refund (*Finanzamt-Erstattung* § 26b EStG): +${formatCurrency(metrics.taxRefundC)}`
      ]
    },
    {
      id: 'B',
      title: 'Scenario B',
      subtitle: 'Unoptimized (Static III/V)',
      badge: 'Standard Baseline',
      badgeColor: '#b45309',
      description: 'No tax class changes. Mother receives maternity and ElterngeldPlus calculated under Tax Class V (*Steuerklasse V*).',
      highlights: [
        'Mother ElterngeldPlus: €500.50 / month (Child 1)',
        'Child 2: Diluted to base €150 / month (*14-Monate-Falle* § 2b BEEG)',
        'Maternity Protection (*Mutterschutz*) net pay at €1,975 / month',
        `Forfeits ${formatCurrency(metrics.gainCvsB)} in statutory benefits`
      ]
    },
    {
      id: 'A',
      title: 'Scenario A',
      subtitle: 'No Children (Status Quo)',
      badge: 'Constant Employment',
      badgeColor: '#475569',
      description: 'No children. Continuous standard wage flow (Husband €2,895 + Wife €1,975 = €6,125 / month net).',
      highlights: [
        'Constant €6,125 / month household net income stream',
        'No parental leave / zero wage replacement benefits',
        'No part-time working hours reduction',
        '5-Year Total Net Inflow: €367,500'
      ]
    },
    {
      id: 'compare',
      title: 'Multi-Scenario',
      subtitle: 'Side-by-Side Comparison',
      badge: 'Overlay View',
      badgeColor: '#1e40af',
      description: 'Direct comparison of monthly liquidity curves and 5-year cumulative household asset accumulation.',
      highlights: [
        'Monthly cash flow curves compared side-by-side',
        'Cumulative financial differential tracking',
        'Direct subsidy & tax reconciliation comparison',
        'Transparent decision framework'
      ]
    }
  ];

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#2563eb'
          }}></span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Select Simulation Scenario
          </span>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
          Click on any scenario to update the financial model in real time
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px'
      }}>
        {scenarios.map((sc) => {
          const isSelected = current === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => { activeScenario.value = sc.id; }}
              type="button"
              style={{
                textAlign: 'left',
                background: isSelected
                  ? '#1e293b'
                  : '#0f172a',
                border: isSelected
                  ? `2px solid ${sc.badgeColor}`
                  : '1px solid #334155',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              {/* Header: Title & Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: isSelected ? '#ffffff' : '#f1f5f9'
                  }}>
                    {sc.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: isSelected ? '#93c5fd' : '#94a3b8', fontWeight: 500 }}>
                    {sc.subtitle}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#1e293b',
                  color: sc.badgeColor,
                  border: `1px solid ${sc.badgeColor}`
                }}>
                  {sc.badge}
                </span>
              </div>

              {/* Description */}
              <p style={{
                fontSize: '0.78rem',
                color: '#cbd5e1',
                lineHeight: 1.4,
                margin: '0 0 12px 0'
              }}>
                {sc.description}
              </p>

              {/* Highlights bullet list */}
              <div style={{
                borderTop: '1px solid #334155',
                paddingTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {sc.highlights.map((h, i) => (
                  <div key={i} style={{
                    fontSize: '0.72rem',
                    color: isSelected ? '#e2e8f0' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ color: sc.badgeColor, fontSize: '0.8rem' }}>•</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
