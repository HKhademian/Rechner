import { useState, useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { deductions, savedScenarios, deleteScenario, inputMode } from '../store/calculatorStore';

export default function ComparisonTable() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const displayMode = useSignal('yearly'); // Local toggle for table view (yearly/monthly)

  if (!mounted || savedScenarios.value.length === 0) return null;

  const format = (num) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
  };

  const isMonthly = displayMode.value === 'monthly';

  // Helper to extract a single metric for a specific column (current or saved)
  const getMetric = (snapshot, personKey, metricKey, useDivider = true) => {
    const person = snapshot[personKey];
    if (!person) return 0;
    
    // In our simplified model, the 'monthsWorked' acts as the divider if we view monthly
    // But since this table might show complex scenarios with different working months,
    // we use the person's specific monthsWorked to find their monthly average, or 1 for yearly.
    const divider = (isMonthly && useDivider) ? person.monthsWorked : 1;
    
    // Total deductions for the household doesn't have a monthsWorked directly in household object,
    // so we handle household level differently if needed.
    return person[metricKey] / divider;
  };

  const getHouseholdMetric = (snapshot, metricKey) => {
    if (!isMonthly) return snapshot.household[metricKey];
    
    // For household monthly, sum up the individual monthly averages
    const p1Monthly = getMetric(snapshot, 'person1', metricKey);
    const p2Monthly = snapshot.partner ? getMetric(snapshot, 'partner', metricKey) : 0;
    return p1Monthly + p2Monthly;
  };

  const renderRow = (label, personKey, metricKey, isHousehold = false, isHeader = false) => {
    const cells = [];
    
    // Current Story (Live)
    const currentVal = isHousehold 
      ? getHouseholdMetric(deductions.value, metricKey) 
      : getMetric(deductions.value, personKey, metricKey);
      
    cells.push(
      <td key="current" style={`padding: 12px; font-weight: ${isHeader ? 'bold' : 'normal'}; border-bottom: 1px solid var(--card-border); background: rgba(16, 185, 129, 0.05);`}>
        {format(currentVal)}
      </td>
    );

    // Saved Scenarios
    savedScenarios.value.forEach(scenario => {
      const savedVal = isHousehold 
        ? getHouseholdMetric(scenario.data, metricKey) 
        : getMetric(scenario.data, personKey, metricKey);
        
      cells.push(
        <td key={scenario.id} style={`padding: 12px; font-weight: ${isHeader ? 'bold' : 'normal'}; border-bottom: 1px solid var(--card-border);`}>
          {format(savedVal)}
        </td>
      );
    });

    return (
      <tr>
        <td style="padding: 12px; font-weight: 500; border-bottom: 1px solid var(--card-border); color: #cbd5e1; position: sticky; left: 0; background: #1e293b;">
          {label}
        </td>
        {cells}
      </tr>
    );
  };

  return (
    <div class="glass-panel fade-in" style="margin-top: 40px; padding: 25px; overflow-x: auto;">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h2 style="margin: 0;">Multi-Scenario Comparison</h2>
          <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #94a3b8;">Compare your current inputs against saved scenarios side-by-side.</p>
        </div>
        
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

      <table style="width: 100%; min-width: 600px; border-collapse: collapse; text-align: left;">
        <thead>
          <tr>
            <th style="padding: 12px; border-bottom: 2px solid var(--card-border); width: 200px; position: sticky; left: 0; background: #1e293b;"></th>
            <th style="padding: 12px; border-bottom: 2px solid var(--primary); color: var(--primary); background: rgba(16, 185, 129, 0.05);">
              <div style="font-size: 1.1rem;">Current Story</div>
              <div style="font-size: 0.8rem; font-weight: normal; color: #94a3b8;">(Live inputs)</div>
            </th>
            
            {savedScenarios.value.map(scenario => (
              <th key={scenario.id} style="padding: 12px; border-bottom: 2px solid var(--card-border);">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div>
                    <div style="font-size: 1.1rem;">{scenario.title}</div>
                    {scenario.description && <div style="font-size: 0.8rem; font-weight: normal; color: #94a3b8;">{scenario.description}</div>}
                  </div>
                  <button 
                    onClick={() => deleteScenario(scenario.id)}
                    style="background: transparent; border: none; color: var(--danger); cursor: pointer; padding: 4px; border-radius: 4px;"
                    title="Delete Scenario"
                  >
                    ✖
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={savedScenarios.value.length + 2} style="padding: 15px 12px 5px 12px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: bold; background: rgba(0,0,0,0.1);">
              Household Totals
            </td>
          </tr>
          {renderRow('Household Gross', null, 'grossYearly', true, true)}
          {renderRow('Household Net', null, 'netIncome', true, true)}
          {renderRow('Total Deductions', null, 'totalDeductions', true)}
          
          <tr>
            <td colSpan={savedScenarios.value.length + 2} style="padding: 15px 12px 5px 12px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: bold; background: rgba(0,0,0,0.1);">
              Person 1 Details
            </td>
          </tr>
          {renderRow('Gross Income', 'person1', 'grossYearly', false, true)}
          {renderRow('Net Income', 'person1', 'netIncome', false, true)}
          {renderRow('Wage Tax', 'person1', 'tax')}
          {renderRow('Health Care', 'person1', 'healthCare')}
          {renderRow('Pension', 'person1', 'pension')}
          
          {/* We only render Partner Details if at least one scenario has a partner */}
          {(deductions.value.partner || savedScenarios.value.some(s => s.data.partner)) && (
            <>
              <tr>
                <td colSpan={savedScenarios.value.length + 2} style="padding: 15px 12px 5px 12px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: bold; background: rgba(0,0,0,0.1);">
                  Partner Details
                </td>
              </tr>
              {renderRow('Gross Income', 'partner', 'grossYearly', false, true)}
              {renderRow('Net Income', 'partner', 'netIncome', false, true)}
              {renderRow('Wage Tax', 'partner', 'tax')}
            </>
          )}

        </tbody>
      </table>
    </div>
  );
}
