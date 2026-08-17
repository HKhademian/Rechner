import type { JSX } from 'preact';
import { activeScenario, comparisonMetrics } from '#store/elterngeldStore';
import { ActiveScenarioView } from '#engine/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

interface ScenarioCardItem {
  scenarioViewId: ActiveScenarioView;
  title: string;
  subtitle: string;
  badge: string;
  badgeClass: string;
  description: string;
  highlights: string[];
}

export default function ScenarioSelector(): JSX.Element {
  const current = activeScenario.value;
  const metrics = comparisonMetrics.value;

  const scenarios: ScenarioCardItem[] = [
    {
      scenarioViewId: ActiveScenarioView.C,
      title: 'Scenario C',
      subtitle: 'Fully Optimized (Recommended)',
      badge: 'Maximum State Benefit',
      badgeClass: 'badge-gain',
      description: 'Proactive tax class swap (*Steuerklassenwechsel* III/V § 39e EStG) + Synthetic Net (*Fiktives Netto* § 2e BEEG) + Sibling Bonus (*Geschwisterbonus*) + Joint Tax Refund (*Ehegatten-Splitting*).',
      highlights: [
        'Mother: ElterngeldPlus capped at maximum €900 / month (§ 4 BEEG)',
        'Maternity Protection (*Mutterschutz* MuSchG) net pay at €2,603 / month',
        'Sibling Bonus (*Geschwisterbonus* § 2a BEEG) +10% until Child 1 turns 3',
        `Tax Office Refund (*Finanzamt-Erstattung* § 26b EStG): +${formatCurrency(metrics.taxRefundC)}`
      ]
    },
    {
      scenarioViewId: ActiveScenarioView.B,
      title: 'Scenario B',
      subtitle: 'Unoptimized (Static III/V)',
      badge: 'Standard Baseline',
      badgeClass: 'badge-warning',
      description: 'No tax class changes. Mother receives maternity and ElterngeldPlus calculated under Tax Class V (*Steuerklasse V*).',
      highlights: [
        'Mother ElterngeldPlus: €500.50 / month (Child 1)',
        'Child 2: Diluted to base €150 / month (*14-Monate-Falle* § 2b BEEG)',
        'Maternity Protection (*Mutterschutz*) net pay at €1,975 / month',
        `Forfeits ${formatCurrency(metrics.gainCvsB)} in statutory benefits`
      ]
    },
    {
      scenarioViewId: ActiveScenarioView.A,
      title: 'Scenario A',
      subtitle: 'No Children (Status Quo)',
      badge: 'Constant Employment',
      badgeClass: 'badge-neutral',
      description: 'No children. Continuous standard wage flow (Husband €2,895 + Wife €1,975 = €6,125 / month net).',
      highlights: [
        'Constant €6,125 / month household net income stream',
        'No parental leave / zero wage replacement benefits',
        'No part-time working hours reduction',
        '5-Year Total Net Inflow: €367,500'
      ]
    },
    {
      scenarioViewId: ActiveScenarioView.Compare,
      title: 'Multi-Scenario',
      subtitle: 'Side-by-Side Comparison',
      badge: 'Overlay View',
      badgeClass: 'badge-brand',
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
            backgroundColor: 'var(--color-primary)'
          }}></span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Select Simulation Scenario
          </span>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Click on any scenario to update the financial model in real time
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px'
      }}>
        {scenarios.map((sc) => {
          const isSelected = current === sc.scenarioViewId;
          return (
            <button
              key={sc.scenarioViewId}
              onClick={() => { activeScenario.value = sc.scenarioViewId; }}
              type="button"
              style={{
                textAlign: 'left',
                background: isSelected
                  ? 'var(--color-primary-bg)'
                  : 'var(--bg-surface)',
                border: isSelected
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--border-subtle)',
                borderRadius: 'var(--border-radius)',
                padding: '16px',
                cursor: 'pointer',
                transition: 'var(--transition)',
                position: 'relative',
                boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)'
              }}
            >
              {/* Header: Title & Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: isSelected ? 'var(--color-primary)' : 'var(--text-primary)'
                  }}>
                    {sc.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {sc.subtitle}
                  </div>
                </div>
                <span className={sc.badgeClass}>
                  {sc.badge}
                </span>
              </div>

              {/* Description */}
              <p style={{
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
                margin: '0 0 12px 0'
              }}>
                {sc.description}
              </p>

              {/* Highlights bullet list */}
              <div style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {sc.highlights.map((h, i) => (
                  <div key={i} style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ color: 'var(--color-primary)', fontSize: '0.8rem' }}>•</span>
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
