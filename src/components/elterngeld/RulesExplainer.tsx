import type { JSX } from 'preact';
import { useState } from 'preact/hooks';

interface RuleItem {
  title: string;
  lawRef: string;
  tag: string;
  summary: string;
  content: JSX.Element;
}

export default function RulesExplainer(): JSX.Element {
  const [activeTab, setActiveTab] = useState<number>(0);

  const rules: RuleItem[] = [
    {
      title: '1. Maternity Protection & Wage Replacement',
      lawRef: 'MuSchG § 3, § 19 & BEEG § 3 Para. 1',
      tag: '§ 1',
      summary: '100% net wage replacement; legally consumes parental allowance months 1 & 2.',
      content: (
        <div>
          <p>
            Under the German <strong>Maternity Protection Act (*Mutterschutzgesetz - MuSchG*)</strong>, employed mothers are entitled to statutory protection periods of <strong>6 weeks pre-birth</strong> and <strong>8 weeks post-birth</strong>.
          </p>
          <ul>
            <li><strong>100% Net Replacement:</strong> Statutory health insurance pays maternity benefit (*Mutterschaftsgeld* up to €13/day) and the employer pays the statutory supplement under § 20 MuSchG up to full previous net pay.</li>
            <li><strong>Offset against Elterngeld (§ 3 BEEG):</strong> Post-birth maternity protection months legally count as used Basic Elterngeld months for the mother. Standard ElterngeldPlus payouts start from life month 3.</li>
            <li><strong>Optimization Effect:</strong> Switching to <strong>Tax Class III</strong> in a timely manner increases the monthly maternity net pay to <strong>€2,603 / month</strong> (vs. €1,975 / month in Tax Class V).</li>
          </ul>
        </div>
      )
    },
    {
      title: '2. Proactive Tax Class Swap (III/V)',
      lawRef: 'BEEG § 2b & Federal Fiscal Court (BFH VI R 2/13)',
      tag: '§ 2',
      summary: 'Swapping to Tax Class III at least 7 months before maternity protection secures the maximum allowance rate.',
      content: (
        <div>
          <p>
            The assessment period for parental allowance comprises the <strong>12 calendar months prior to the month maternity protection begins</strong> (§ 2b BEEG).
          </p>
          <ul>
            <li><strong>Predominant Tax Class (*Überwiegende Steuerklasse*):</strong> Whichever tax class was held for the majority of the 12 assessment months (at least 7 months) is applied across the entire baseline calculation.</li>
            <li><strong>BFH Precedent (VI R 2/13):</strong> The Federal Fiscal Court has explicitly confirmed that swapping tax classes to maximize parental allowance is lawful and does not constitute tax abuse.</li>
            <li><strong>Execution Timeline:</strong> Swapping to Tax Class III (Wife) / V (Husband) occurs in Month 4 at the start of pregnancy, exactly 7 months before maternity protection begins in Month 11.</li>
          </ul>
        </div>
      )
    },
    {
      title: '3. Synthetic Net Principle (Fiktives Netto)',
      lawRef: 'BEEG § 2e (Standardized Deductions)',
      tag: '§ 3',
      summary: 'Swapping back to Tax Class V post-birth does not reduce approved Elterngeld amounts.',
      content: (
        <div>
          <p>
            Immediately after birth, the couple swaps back to the combination <strong>Husband III / Wife V</strong> to minimize wage tax withholding on the primary earner's active income.
          </p>
          <ul>
            <li><strong>Fixed Assessment Baseline:</strong> The Elterngeld office fixes the parental allowance rate purely based on net income established during the pre-birth assessment window (synthetic net).</li>
            <li><strong>Maximum Allowance Cap:</strong> When working part-time post-birth, the mother still receives the statutory maximum cap of <strong>€900.00 / month</strong> ElterngeldPlus.</li>
          </ul>
        </div>
      )
    },
    {
      title: '4. Tax Office Reconciliation (Ehegatten-Splitting)',
      lawRef: 'EStG § 26, § 26b (Joint Income Assessment)',
      tag: '§ 4',
      summary: 'Excess wage tax withheld during the swap period is 100% refunded via the annual tax return.',
      content: (
        <div>
          <p>
            Tax classes govern only monthly payroll withholding as an advance payment toward annual liability.
          </p>
          <ul>
            <li><strong>Income Splitting Tariff (*Splittingtarif*):</strong> On the annual income tax return (§ 26b EStG), the household's total yearly income is assessed jointly under German marital income splitting.</li>
            <li><strong>Full Reconciliation:</strong> All interim salary reductions from the husband's temporary Tax Class V placement are refunded to the couple in full (+€5,670 total refund volume).</li>
          </ul>
        </div>
      )
    },
    {
      title: '5. Partner Months & Partnership Bonus',
      lawRef: 'BEEG § 4, § 4b (Partnership Bonus)',
      tag: '§ 5',
      summary: '4 partner months base (€150/mo) + 4 bonus months for concurrent part-time work (24–32h/wk).',
      content: (
        <div>
          <p>
            BEEG allows combining ElterngeldPlus with gainful part-time employment:
          </p>
          <ul>
            <li><strong>Father's Partner Months:</strong> The father receives 4 months of the minimum base rate of <strong>€150 / month</strong> ElterngeldPlus alongside his standard 32-hour week.</li>
            <li><strong>Partnership Bonus (*Partnerschaftsbonus*):</strong> When both parents work concurrently between <strong>24 and 32 hours per week</strong> for 4 consecutive months, each parent receives <strong>4 additional bonus months</strong> of ElterngeldPlus.</li>
          </ul>
        </div>
      )
    },
    {
      title: '6. Sibling Bonus (Geschwisterbonus)',
      lawRef: 'BEEG § 2a (Sibling Surcharge)',
      tag: '§ 6',
      summary: '+10% surcharge on Child 2 Elterngeld until Child 1 turns 3 years old.',
      content: (
        <div>
          <p>
            When an older child under 3 years old (under 36 life months) lives in the household, parental allowance for the newborn increases:
          </p>
          <ul>
            <li><strong>Surcharge Amount:</strong> +10% of the calculated allowance (minimum +€75 / month for ElterngeldPlus, +€150 for Basic Elterngeld).</li>
            <li><strong>Duration:</strong> Child 1 turns 36 months in Month 48. Until this month, the sibling bonus for Child 2 is paid out in full.</li>
          </ul>
        </div>
      )
    },
    {
      title: '7. Child 2 Assessment Period (14-Month Trap)',
      lawRef: 'BEEG § 2b Para. 1 (Dilution Rules)',
      tag: '§ 7',
      summary: 'Avoiding the base rate trap through a timed secondary tax class swap.',
      content: (
        <div>
          <p>
            For the second child, part-time months worked between births enter the 12-month parental allowance assessment window.
          </p>
          <ul>
            <li><strong>The Pitfall in Scenario B:</strong> Without active planning, Elterngeld for Child 2 drops to the minimum base rate of <strong>€150 / month</strong>.</li>
            <li><strong>The Solution in Scenario C:</strong> A timely second swap to Tax Class III (part-time) increases Elterngeld for Child 2 to <strong>€485.58 / month</strong>.</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          background: 'rgba(30, 64, 175, 0.15)',
          padding: '8px',
          borderRadius: '6px',
          color: '#60a5fa',
          border: '1px solid #334155'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
            <path d="M6 6h10"/>
            <path d="M6 10h10"/>
          </svg>
        </div>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            Statutory Framework & Legal Precedents (*BEEG / MuSchG / EStG*)
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
            Select any legal section below to review the statutory provisions governing the calculation engine.
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 320px) 1fr',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {rules.map((rule, idx) => {
            const isSelected = activeTab === idx;
            return (
              <button
                key={rule.title}
                onClick={() => setActiveTab(idx)}
                type="button"
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: isSelected ? '#1e40af' : '#334155',
                  background: isSelected ? '#1e293b' : '#0f172a',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  borderLeft: isSelected ? '3px solid #1e40af' : '1px solid #334155'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.84rem',
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? '#ffffff' : '#cbd5e1'
                  }}>
                    {rule.title}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    fontFamily: 'monospace'
                  }}>
                    {rule.tag}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                  {rule.lawRef}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{
          background: '#0f172a',
          padding: '20px',
          borderRadius: '6px',
          border: '1px solid #334155'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1px solid #334155',
            paddingBottom: '12px',
            marginBottom: '14px'
          }}>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {rules[activeTab].title}
              </h4>
              <div style={{
                fontSize: '0.76rem',
                color: '#60a5fa',
                fontWeight: 600,
                marginTop: '3px'
              }}>
                Statutory Reference: {rules[activeTab].lawRef}
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '0.84rem',
            lineHeight: 1.6,
            color: '#cbd5e1'
          }}>
            {rules[activeTab].content}
          </div>
        </div>
      </div>
    </div>
  );
}
