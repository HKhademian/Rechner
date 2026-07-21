import { useState, useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { deductions, savedScenarios, activeScenarioId, saveScenario, deleteScenario, loadScenario, updateScenarioMetaData, overwriteScenarioWithCurrent, cancelEdit } from '../store/calculatorStore';
import { PlusIcon, DownloadIcon, XIcon, SaveIcon } from './Icons';

export default function ComparisonTable() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    // Initialize first scenario if none exist
    if (savedScenarios.peek().length === 0) {
      saveScenario('My First Scenario', 'Default starting point', deductions.peek());
    }
  }, []);

  const displayMode = useSignal('yearly'); 

  if (!mounted || savedScenarios.value.length === 0) return null;

  const format = (num) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
  };

  const isMonthly = displayMode.value === 'monthly';

  const getMetric = (snapshot, personKey, metricKey, useDivider = true) => {
    const person = snapshot[personKey];
    if (!person) return 0;
    const divider = (isMonthly && useDivider) ? person.monthsWorked : 1;
    return person[metricKey] / divider;
  };

  const getHouseholdMetric = (snapshot, metricKey) => {
    if (!isMonthly) return snapshot.household[metricKey];
    const p1Monthly = getMetric(snapshot, 'person1', metricKey);
    const p2Monthly = snapshot.partner ? getMetric(snapshot, 'partner', metricKey) : 0;
    return p1Monthly + p2Monthly;
  };

  const renderPerPaycheckRow = (personKey, isHousehold = false) => {
    if (!isMonthly) return null; 
    const cells = [];

    const getPaycheckVal = (snapshot) => {
      if (isHousehold) {
        const p1 = snapshot.person1;
        const p2 = snapshot.partner;
        const p1Val = p1 ? p1.netIncome / (p1.salariesReceived || 12) : 0;
        const p2Val = p2 ? p2.netIncome / (p2.salariesReceived || 12) : 0;
        return { val: p1Val + p2Val, hint: '' };
      } else {
        const p = snapshot[personKey];
        if (!p) return { val: 0, hint: '' };
        const salaries = p.salariesReceived || 12;
        return { val: p.netIncome / salaries, hint: `(x${salaries})` };
      }
    };

    // Current Story
    const current = getPaycheckVal(deductions.value);
    cells.push(
      <td key="current" style="padding: 12px 16px; font-weight: bold; border-bottom: 1px solid var(--card-border); background: rgba(16, 185, 129, 0.1); min-width: 220px; color: var(--success);">
        {format(current.val)} <span style="font-size: 0.8rem; color: #94a3b8; font-weight: normal;">{current.hint}</span>
      </td>
    );

    savedScenarios.value.forEach(scenario => {
      const saved = getPaycheckVal(scenario.data);
      const isActive = activeScenarioId.value === scenario.id;
      cells.push(
        <td key={scenario.id} style={`padding: 12px 16px; font-weight: bold; border-bottom: 1px solid var(--card-border); min-width: 220px; color: ${isActive ? 'var(--primary)' : '#f8fafc'}; background: ${isActive ? 'rgba(56, 189, 248, 0.05)' : 'transparent'};`}>
          {format(saved.val)} <span style="font-size: 0.8rem; color: #94a3b8; font-weight: normal;">{saved.hint}</span>
        </td>
      );
    });

    return (
      <tr class="comparison-row">
        <td style="padding: 12px 16px; font-weight: 600; border-bottom: 1px solid var(--card-border); color: #cbd5e1; position: sticky; left: 0; background: #2a3b52; z-index: 10; border-right: 2px solid var(--card-border);">
          Net Per Paycheck
        </td>
        {cells}
      </tr>
    );
  };

  const renderRow = (label, personKey, metricKey, isHousehold = false, isHeader = false) => {
    const cells = [];
    
    // Current Story
    const currentVal = isHousehold 
      ? getHouseholdMetric(deductions.value, metricKey) 
      : getMetric(deductions.value, personKey, metricKey);
      
    cells.push(
      <td key="current" style={`padding: 12px 16px; font-weight: ${isHeader ? 'bold' : 'normal'}; border-bottom: 1px solid var(--card-border); background: rgba(16, 185, 129, 0.1); min-width: 220px;`}>
        {format(currentVal)}
      </td>
    );

    savedScenarios.value.forEach(scenario => {
      const savedVal = isHousehold 
        ? getHouseholdMetric(scenario.data, metricKey) 
        : getMetric(scenario.data, personKey, metricKey);
      
      const isActive = activeScenarioId.value === scenario.id;
        
      cells.push(
        <td key={scenario.id} style={`padding: 12px 16px; font-weight: ${isHeader ? 'bold' : 'normal'}; border-bottom: 1px solid var(--card-border); min-width: 220px; background: ${isActive ? 'rgba(56, 189, 248, 0.05)' : 'transparent'};`}>
          {format(savedVal)}
        </td>
      );
    });

    return (
      <tr class="comparison-row">
        <td style="padding: 12px 16px; font-weight: 600; border-bottom: 1px solid var(--card-border); color: #e2e8f0; position: sticky; left: 0; background: #1e293b; z-index: 10; border-right: 2px solid var(--card-border);">
          {label}
        </td>
        {cells}
      </tr>
    );
  };

  const handleAddScenario = () => {
    const count = savedScenarios.peek().length + 1;
    saveScenario(`Scenario ${count}`, 'New simulation', deductions.peek());
  };

  return (
    <div class="glass-panel fade-in" style="max-width: 95vw; margin: 0 auto 40px auto; padding: 25px; overflow-x: auto; position: relative; border-top: 4px solid var(--primary);">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h2 style="margin: 0;">Scenario Manager</h2>
          <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #94a3b8;">Compare your Live Scratchpad against your explicitly saved scenarios.</p>
        </div>
        
        <div style="display: flex; gap: 15px; align-items: center;">
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
      </div>

      <table style="width: 100%; min-width: 800px; border-collapse: separate; border-spacing: 0; text-align: left;">
        <thead>
          <tr>
            <th style="padding: 16px; border-bottom: 2px solid var(--card-border); width: 220px; position: sticky; left: 0; top: 0; background: #1e293b; z-index: 20; border-right: 2px solid var(--card-border);"></th>
            
            <th style="padding: 16px; border-bottom: 2px solid var(--success); background: rgba(16, 185, 129, 0.1); position: sticky; top: 0; z-index: 15; min-width: 220px; border-top: 2px solid var(--success);">
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
                  <div style="flex: 1;">
                    <div style="font-size: 1.1rem; color: var(--success); padding: 2px 4px; font-weight: bold;">Live Scratchpad</div>
                    <div style="font-size: 0.8rem; font-weight: normal; color: #94a3b8; padding: 2px 4px;">Currently reacting to sliders</div>
                  </div>
                  
                  <button 
                    onClick={handleAddScenario}
                    style="background: transparent; color: var(--success); border: none; cursor: pointer; padding: 4px; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; opacity: 0.8; transition: opacity 0.2s;"
                    onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                    title="Save as New Scenario"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
            </th>

            {savedScenarios.value.map(scenario => {
              const isActive = activeScenarioId.value === scenario.id;
              
              return (
                <th key={scenario.id} style={`padding: 16px; border-bottom: 2px solid ${isActive ? 'var(--primary)' : 'var(--card-border)'}; position: sticky; top: 0; background: ${isActive ? 'rgba(56, 189, 248, 0.1)' : '#1e293b'}; z-index: 15; min-width: 220px; border-top: ${isActive ? '2px solid var(--primary)' : 'none'};`}>
                  <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
                      <div style="flex: 1;">
                        <input 
                          type="text" 
                          value={scenario.title} 
                          onChange={(e) => updateScenarioMetaData(scenario.id, e.target.value, scenario.description)}
                          style={`background: transparent; border: 1px solid transparent; color: ${isActive ? 'var(--primary)' : 'white'}; font-size: 1.1rem; font-weight: bold; width: 100%; padding: 2px 4px; border-radius: 4px; outline: none; transition: 0.2s;`}
                          onFocus={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                          onBlur={(e) => e.target.style.background = 'transparent'}
                          title="Click to edit title"
                        />
                        <input 
                          type="text" 
                          value={scenario.description} 
                          placeholder="Add description..."
                          onChange={(e) => updateScenarioMetaData(scenario.id, scenario.title, e.target.value)}
                          style="background: transparent; border: 1px solid transparent; color: #94a3b8; font-size: 0.8rem; font-weight: normal; width: 100%; padding: 2px 4px; border-radius: 4px; outline: none; transition: 0.2s;"
                          onFocus={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                          onBlur={(e) => e.target.style.background = 'transparent'}
                          title="Click to edit description"
                        />
                      </div>
                      
                      <div style="display: flex; gap: 4px;">
                        {!isActive && (
                          <button 
                            onClick={() => loadScenario(scenario.id)}
                            style="background: transparent; border: none; color: var(--primary); cursor: pointer; padding: 4px; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; opacity: 0.8; transition: opacity 0.2s;"
                            onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                            title="Load to Scratchpad"
                          >
                            <DownloadIcon />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteScenario(scenario.id)}
                          style="background: transparent; border: none; color: var(--danger); cursor: pointer; padding: 4px; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; opacity: 0.7; transition: opacity 0.2s;"
                          onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
                          title="Delete Scenario"
                        >
                          <XIcon />
                        </button>
                      </div>
                    </div>
                    
                    {isActive && (
                      <div style="display: flex; gap: 5px;">
                        <button 
                          onClick={() => overwriteScenarioWithCurrent(scenario.id)}
                          style="background: var(--primary); color: white; border: none; padding: 6px 8px; border-radius: 4px; font-weight: bold; cursor: pointer; flex: 1; box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3); display: flex; align-items: center; justify-content: center; gap: 4px;"
                          title="Overwrite this scenario with the current Live Scratchpad inputs"
                        >
                          <SaveIcon /> Save
                        </button>
                        <button 
                          onClick={cancelEdit}
                          style="background: transparent; color: #cbd5e1; border: 1px solid var(--card-border); padding: 6px 8px; border-radius: 4px; font-weight: bold; cursor: pointer; flex: 1;"
                          title="Cancel editing without saving"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={savedScenarios.value.length + 2} style="padding: 20px 16px 8px 16px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; background: rgba(0,0,0,0.2);">
              Household Totals
            </td>
          </tr>
          {renderRow(isMonthly ? 'Household Avg Gross' : 'Household Gross', null, 'grossYearly', true, true)}
          {renderRow(isMonthly ? 'Household Avg Net' : 'Household Net', null, 'netIncome', true, true)}
          {renderPerPaycheckRow(null, true)}
          {renderRow(isMonthly ? 'Household Avg Deductions' : 'Total Deductions', null, 'totalDeductions', true)}
          
          <tr>
            <td colSpan={savedScenarios.value.length + 2} style="padding: 25px 16px 8px 16px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; background: rgba(0,0,0,0.2);">
              Person 1 Details
            </td>
          </tr>
          {renderRow(isMonthly ? 'Avg Gross' : 'Gross Income', 'person1', 'grossYearly', false, true)}
          {renderRow(isMonthly ? 'Avg Net' : 'Net Income', 'person1', 'netIncome', false, true)}
          {renderPerPaycheckRow('person1', false)}
          {renderRow(isMonthly ? 'Avg Wage Tax' : 'Wage Tax', 'person1', 'tax')}
          {renderRow(isMonthly ? 'Avg Health Care' : 'Health Care', 'person1', 'healthCare')}
          {renderRow(isMonthly ? 'Avg Pension' : 'Pension', 'person1', 'pension')}
          
          {(deductions.value.partner || savedScenarios.value.some(s => s.data.partner)) && (
            <>
              <tr>
                <td colSpan={savedScenarios.value.length + 2} style="padding: 25px 16px 8px 16px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; background: rgba(0,0,0,0.2);">
                  Partner Details
                </td>
              </tr>
              {renderRow(isMonthly ? 'Avg Gross' : 'Gross Income', 'partner', 'grossYearly', false, true)}
              {renderRow(isMonthly ? 'Avg Net' : 'Net Income', 'partner', 'netIncome', false, true)}
              {renderPerPaycheckRow('partner', false)}
              {renderRow(isMonthly ? 'Avg Wage Tax' : 'Wage Tax', 'partner', 'tax')}
            </>
          )}

        </tbody>
      </table>
    </div>
  );
}
