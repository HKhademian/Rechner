import { useState, useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { deductions, hasPartner, salariesPerYear, partnerSalariesPerYear } from '../store/calculatorStore';

export default function ResultsDisplay() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const displayMode = useSignal('monthly'); // local toggle for viewing results

  if (!mounted) return <div class="glass-panel fade-in">Loading results...</div>;

  const format = (num) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
  };

  const d = deductions.value;
  const isMonthly = displayMode.value === 'monthly';

  // Percentage of gross
  const pct = (val, gross) => gross > 0 ? ((val / gross) * 100).toFixed(1) + '%' : '0%';

  const renderPerson = (title, personData, personSalaries) => {
    if (!personData || personData.grossYearly <= 0) return null;
    
    // Divide by the number of salaries received (e.g. 12, 13) in monthly view
    const divider = isMonthly ? personSalaries : 1;
    const gross = personData.grossYearly / divider;

    return (
      <div style="background: rgba(0,0,0,0.15); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #f8fafc; border-bottom: 1px solid var(--card-border); padding-bottom: 8px; display: flex; justify-content: space-between;">
          <span>{title}</span>
          <span style="font-size: 0.8rem; color: #94a3b8; font-weight: normal; margin-top: 4px;">
            {isMonthly ? 'Average Monthly' : 'Yearly Total'}
          </span>
        </h3>
        
        <div class="deduction-item" style="color: var(--text-color); font-weight: 600; margin-bottom: 15px;">
          <span>Gross Income</span>
          <span class="amount">{format(gross)}</span>
        </div>

        <div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Social Security</div>
        <div class="deduction-item">
          <span>Health Insurance <small>({pct(personData.healthCare, personData.grossYearly)})</small></span>
          <span class="amount" style="color: var(--deduction)">- {format(personData.healthCare / divider)}</span>
        </div>
        <div class="deduction-item">
          <span>Pension <small>({pct(personData.pension, personData.grossYearly)})</small></span>
          <span class="amount" style="color: var(--deduction)">- {format(personData.pension / divider)}</span>
        </div>
        <div class="deduction-item">
          <span>Unemployment <small>({pct(personData.unemployment, personData.grossYearly)})</small></span>
          <span class="amount" style="color: var(--deduction)">- {format(personData.unemployment / divider)}</span>
        </div>
        <div class="deduction-item">
          <span>Long-term Care <small>({pct(personData.care, personData.grossYearly)})</small></span>
          <span class="amount" style="color: var(--deduction)">- {format(personData.care / divider)}</span>
        </div>

        <div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 8px; margin-top: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Taxes</div>
        <div class="deduction-item">
          <span>Wage Tax <small>({pct(personData.tax, personData.grossYearly)})</small></span>
          <span class="amount" style="color: var(--danger)">- {format(personData.tax / divider)}</span>
        </div>
        {personData.churchTax > 0 && (
          <div class="deduction-item">
            <span>Church Tax <small>({pct(personData.churchTax, personData.grossYearly)})</small></span>
            <span class="amount" style="color: var(--danger)">- {format(personData.churchTax / divider)}</span>
          </div>
        )}

        <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 10px; border-top: 1px dashed var(--card-border); font-weight: 700; color: #fff;">
          <span>Net Income</span>
          <span>{format(personData.netIncome / divider)}</span>
        </div>
      </div>
    );
  };

  return (
    <div class="glass-panel fade-in" style="animation-delay: 0.1s;">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0;">Results Breakdown</h2>
        
        <div style="display: flex; gap: 5px; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 8px;">
          <button 
            style={`padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; transition: 0.2s; font-size: 0.8rem; font-weight: bold; background: ${isMonthly ? 'var(--primary)' : 'transparent'}; color: ${isMonthly ? '#fff' : '#cbd5e1'}`}
            onClick={() => displayMode.value = 'monthly'}
          >
            Monthly
          </button>
          <button 
            style={`padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; transition: 0.2s; font-size: 0.8rem; font-weight: bold; background: ${!isMonthly ? 'var(--primary)' : 'transparent'}; color: ${!isMonthly ? '#fff' : '#cbd5e1'}`}
            onClick={() => displayMode.value = 'yearly'}
          >
            Yearly
          </button>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        {renderPerson('Person 1', d.person1, salariesPerYear.value)}
        {hasPartner.value && renderPerson('Partner', d.partner, partnerSalariesPerYear.value)}
      </div>

      <div class="total-net fade-in" style="background: rgba(16, 185, 129, 0.1); padding: 20px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2); border-top: none;">
        <span>
          {hasPartner.value ? 'Household Net' : 'Total Net Income'}
          <div style="font-size: 0.8rem; color: #94a3b8; font-weight: normal; margin-top: 4px;">
            {isMonthly ? 'Sum of average monthly nets' : 'Yearly Total'}
          </div>
        </span>
        <span style="align-self: center;">
          {/* If monthly, sum up the individual monthly nets */
            isMonthly 
              ? format((d.person1.netIncome / salariesPerYear.value) + (hasPartner.value && d.partner ? d.partner.netIncome / partnerSalariesPerYear.value : 0))
              : format(d.household.netIncome)
          }
        </span>
      </div>
      
      <div style="margin-top: 1rem; text-align: center; color: #64748b; font-size: 0.8rem;">
        Effective Tax & Social Security Rate: {pct(d.household.totalDeductions, d.household.grossYearly)}
      </div>
      <div style="margin-top: 0.5rem; text-align: center; color: #64748b; font-size: 0.75rem;">
        * Note: This is a simplified estimation for educational purposes.
      </div>
    </div>
  );
}
