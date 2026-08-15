import { useState } from 'preact/hooks';

export default function RulesExplainer() {
  const [activeTab, setActiveTab] = useState(0);

  const rules = [
    {
      title: '1. Pre & Post-Birth Mutterschutz (Maternity Protection)',
      lawRef: 'MuSchG § 3, 19 & BEEG § 3 Abs. 1',
      icon: '🛡️',
      color: '#a855f7',
      summary: '100% Net Wage Replacement; Overrides Months 1 & 2 of Elterngeld.',
      content: (
        <div>
          <p>
            Under the German <strong>Mutterschutzgesetz (MuSchG)</strong>, employed mothers are placed on mandatory maternity protection <strong>6 weeks (1.5 months) before birth</strong> and <strong>8 weeks (2 months) after birth</strong>.
          </p>
          <ul>
            <li><strong>100% Net Replacement:</strong> The statutory health fund (Krankenkasse) pays Mutterschaftsgeld (€13/day) and the employer pays the Arbeitgeberzuschuss, guaranteeing 100% of the active net salary.</li>
            <li><strong>Elterngeld Offset (BEEG § 3):</strong> Post-birth Mutterschutz months legally consume Months 1 and 2 of the 14-month Basiselterngeld entitlement. Therefore, ElterngeldPlus commences in Month 3 (or Month 11 on the calendar timeline).</li>
            <li><strong>Optimization Rationale:</strong> In Scenario C, because the mother swapped into <strong>Tax Class III</strong> 7 months prior, her Mutterschutz benefit is paid at <strong>€2,603/month</strong> instead of €1,975/month!</li>
          </ul>
        </div>
      )
    },
    {
      title: '2. Proactive Tax Class Swaps (Steuerklassenwechsel III/V)',
      lawRef: 'BEEG § 2b & BFH Urteil VI R 2/13',
      icon: '🔄',
      color: '#10b981',
      summary: 'Swapping to Class III 7 months before Mutterschutz maximizes Elterngeld legally.',
      content: (
        <div>
          <p>
            The Elterngeld calculation basis (<em>Bemessungszeitraum</em>) consists of the <strong>12 calendar months before the month Mutterschutz begins</strong>.
          </p>
          <ul>
            <li><strong>Predominant Tax Class Rule:</strong> The tax class active for the <em>majority</em> (at least 7 out of 12 months) of this assessment window is used to determine taxable net income for Elterngeld.</li>
            <li><strong>Federal Fiscal Court Ruling:</strong> The German Supreme Tax Court (BFH VI R 2/13) ruled that switching tax classes solely to optimize Elterngeld is <strong>100% legal</strong> and does not constitute tax evasion (*kein Rechtsmissbrauch*).</li>
            <li><strong>Execution Window:</strong> Couple initiates Swap 1 in Month 1 (7 full months before Month 8 Mutterschutz), locking in Class III for the mother.</li>
          </ul>
        </div>
      )
    },
    {
      title: '3. The "Synthetic" Tax Rule (Fiktive Steuerklasse)',
      lawRef: 'BEEG § 2e (Fiktives Netto)',
      icon: '✨',
      color: '#06b6d4',
      summary: 'Reverting to Class V post-birth does not reduce the locked Class III Elterngeld payout.',
      content: (
        <div>
          <p>
            Under German Elterngeld law, the Elterngeldstelle calculates a <strong>fictitious net income (Fiktives Netto)</strong> based solely on the pre-birth assessment period.
          </p>
          <ul>
            <li><strong>Asymmetry Advantage:</strong> Once the mother gives birth, the couple immediately changes tax classes back to <strong>Husband III / Wife V</strong> so the Husband regains his full €2,895 net.</li>
            <li><strong>Elterngeld Preservation:</strong> The mother's ElterngeldPlus continues to be calculated using the higher pre-birth Class III benchmark (€2,603), yielding the maximum capped <strong>€900.00/month</strong>!</li>
          </ul>
        </div>
      )
    },
    {
      title: '4. Finanzamt Annual Tax Reconciliation (No Lost Wealth)',
      lawRef: 'EStG § 26b (Ehegatten-Splitting)',
      icon: '💰',
      color: '#3b82f6',
      summary: 'Monthly tax withholding deficits during swap are 100% refunded in joint annual tax filing.',
      content: (
        <div>
          <p>
            Tax classes III and V only regulate monthly wage tax withholding (<em>Lohnsteuerabzug</em>).
          </p>
          <ul>
            <li><strong>Splitting Tariff:</strong> In Germany, married couples filing jointly (*Zusammenveranlagung*) pay tax on their combined income under the exact same *Splittingtabelle*, irrespective of whether they were in III/V, IV/IV, or V/III during the year.</li>
            <li><strong>100% Refund:</strong> During the 7 swap months, the temporary monthly deficit (-€275/mo in Swap 1, -€535/mo in Swap 2) is mathematically refunded in full by the Finanzamt upon submission of the annual tax return (*Einkommensteuererklärung*).</li>
            <li><strong>Total Optimization Gain:</strong> The family collects over <strong>€5,670+</strong> in tax refunds plus higher state benefits.</li>
          </ul>
        </div>
      )
    },
    {
      title: '5. Husband\'s Partnermonate & Partnerschaftsbonus',
      lawRef: 'BEEG § 4b (Partnerschaftsbonus)',
      icon: '🤝',
      color: '#f59e0b',
      summary: '4 Partnermonate minimums + 4 bonus months for concurrent 24–32h part-time work.',
      content: (
        <div>
          <p>
            Both parents can leverage flexible ElterngeldPlus without taking full leaves of absence:
          </p>
          <ul>
            <li><strong>Husband Partnermonate:</strong> The Husband receives a flat minimum of <strong>€150/month</strong> ElterngeldPlus for 4 concurrent months (Months 11–14 & 38–41) while retaining his standard 32-hour salary.</li>
            <li><strong>Partnerschaftsbonus (Months 23–26 & 50–53):</strong> When both parents work simultaneously between <strong>24 and 32 hours/week</strong>, each parent receives <strong>4 additional bonus months</strong> of ElterngeldPlus (Wife €900/mo + Husband €150/mo).</li>
          </ul>
        </div>
      )
    },
    {
      title: '6. Geschwisterbonus (Sibling Bonus)',
      lawRef: 'BEEG § 2a (Geschwisterbonus)',
      icon: '👶',
      color: '#ec4899',
      summary: '+10% bonus on Child 2 Elterngeld until Child 1 reaches age 3 (Month 45).',
      content: (
        <div>
          <p>
            If a second child is born while an older sibling is under 3 years of age (under 36 months):
          </p>
          <ul>
            <li><strong>10% Benefit Surcharge:</strong> Child 2\'s Elterngeld payout is boosted by <strong>+10%</strong> (at least +€75/month for ElterngeldPlus or +€150/month for Basiselterngeld).</li>
            <li><strong>Expiry Trigger:</strong> In our timeline, Child 1 is born at Month 9 and turns 3 at <strong>Month 45</strong>. Child 2 (born Month 36) enjoys this boost from Months 36 to 45, after which it expires.</li>
          </ul>
        </div>
      )
    },
    {
      title: '7. The 14-Month Assessment Trap (14-Monate-Falle)',
      lawRef: 'BEEG § 2b Abs. 1 (Bemessungszeitraum Kind 2)',
      icon: '⚠️',
      color: '#ef4444',
      summary: 'How part-time working between children dilutes the assessment baseline for Child 2.',
      content: (
        <div>
          <p>
            For Child 2, the 12-month pre-birth assessment window cannot be reset if parental leave months for Child 1 have already passed.
          </p>
          <ul>
            <li><strong>The Trap:</strong> The mother\'s 12-month window captures 10 months of part-time salary (at 24h) and only 2 months of earlier full-time salary.</li>
            <li><strong>Scenario B Effect:</strong> Without optimization, Child 2\'s ElterngeldPlus drops to the legal minimum floor of <strong>€150/month</strong> (+ €75 sibling bonus = €225/mo).</li>
            <li><strong>Scenario C Solution:</strong> Executing Swap 2 (Class III Part-Time at €1.648) increases the blended pre-birth net to €1,951.67, raising Child 2\'s payout to <strong>€485.58/month</strong>!</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          background: 'rgba(168, 85, 247, 0.2)',
          padding: '8px',
          borderRadius: '8px',
          color: '#c084fc'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
            <path d="M6 6h10"/>
            <path d="M6 10h10"/>
          </svg>
        </div>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            German Law Rules Engine & Optimization Playbook
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
            Click on any legal rule below to inspect the statutory basis (BEEG, MuSchG, EStG) modeled in this simulation.
          </p>
        </div>
      </div>

      {/* Accordion / Tab Buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '8px',
        marginBottom: '16px'
      }}>
        {rules.map((rule, idx) => {
          const isSelected = activeTab === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveTab(idx)}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '8px',
                border: isSelected ? `1px solid ${rule.color}` : '1px solid rgba(51, 65, 85, 0.6)',
                background: isSelected ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{rule.icon}</span>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 700 : 600,
                  color: isSelected ? '#ffffff' : '#cbd5e1'
                }}>
                  {rule.title.split('(')[0]}
                </span>
              </div>
              <div style={{ fontSize: '0.68rem', color: isSelected ? rule.color : '#64748b', marginTop: '2px' }}>
                {rule.lawRef}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Rule Details Panel */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: `1px solid ${rules[activeTab].color}40`,
        borderRadius: '12px',
        padding: '20px',
        borderLeft: `4px solid ${rules[activeTab].color}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>{rules[activeTab].icon}</span>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              {rules[activeTab].title}
            </h4>
          </div>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '999px',
            backgroundColor: `${rules[activeTab].color}20`,
            color: rules[activeTab].color,
            border: `1px solid ${rules[activeTab].color}50`
          }}>
            {rules[activeTab].lawRef}
          </span>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          {rules[activeTab].content}
        </div>
      </div>
    </div>
  );
}
