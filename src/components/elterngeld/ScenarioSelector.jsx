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
      badge: '🚀 Max State Benefits',
      badgeColor: '#10b981',
      description: 'Proactive Tax Swaps (H:V / W:III) 7M pre-birth + Synthetic Rule + Sibling Bonus + Full Tax Reconciliation Refund.',
      highlights: [
        'Wife EGPlus maxed at €900/mo',
        'Mutterschutz at €2,603/mo',
        'Sibling Bonus +10% until Child 1 is 3yo',
        `Finanzamt Refund: +${formatCurrency(metrics.taxRefundC)}`
      ]
    },
    {
      id: 'B',
      title: 'Scenario B',
      subtitle: 'Unoptimized (Static III/V)',
      badge: '⚠️ Standard Default',
      badgeColor: '#f59e0b',
      description: 'Couple never changes tax classes. Wife receives standard Mutterschutz & ElterngeldPlus based on Class V salary.',
      highlights: [
        'Wife EGPlus: €500.50/mo (Child 1)',
        'Child 2 EGPlus: €150/mo floor (14M trap)',
        'Mutterschutz at €1,975/mo',
        `Leaves ${formatCurrency(metrics.gainCvsB)} on the table`
      ]
    },
    {
      id: 'A',
      title: 'Scenario A',
      subtitle: 'Baseline (No Children)',
      badge: '👔 Status Quo',
      badgeColor: '#64748b',
      description: 'No children. Household earns standard salaries (Husband €2,895 + Wife €1,975 = €6,125/mo flat).',
      highlights: [
        'Flat €6,125/mo monthly cash flow',
        '0 parental leave / 0 benefits',
        'No part-time reduction',
        'Total 5-Yr: €367,500'
      ]
    },
    {
      id: 'compare',
      title: 'Compare All',
      subtitle: 'Side-by-Side Analysis',
      badge: '📊 Multi-Scenario Overlay',
      badgeColor: '#8b5cf6',
      description: 'Directly overlay and compare cash flows and accumulated wealth across all 3 timeline pathways.',
      highlights: [
        'Monthly cash flow overlay',
        'Direct cumulative delta curves',
        'Side-by-side benefit extraction',
        'Clear financial impact comparison'
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
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            boxShadow: '0 0 8px #3b82f6'
          }}></span>
          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Select Simulation Scenario
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          Click any card to switch timeline calculations instantly
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
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(49, 46, 129, 0.5) 100%)'
                  : 'rgba(30, 41, 59, 0.6)',
                border: isSelected
                  ? `2px solid ${sc.badgeColor}`
                  : '1px solid rgba(51, 65, 85, 0.7)',
                borderRadius: '14px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                position: 'relative',
                boxShadow: isSelected
                  ? `0 8px 24px -4px ${sc.badgeColor}40`
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                transform: isSelected ? 'translateY(-2px)' : 'none'
              }}
            >
              {/* Header: Title & Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div style={{
                    fontSize: '1.1rem',
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
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  backgroundColor: `${sc.badgeColor}25`,
                  color: sc.badgeColor,
                  border: `1px solid ${sc.badgeColor}50`
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
                borderTop: '1px solid rgba(51, 65, 85, 0.6)',
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
