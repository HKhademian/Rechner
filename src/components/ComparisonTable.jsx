import { useState, useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { 
  grossIncome, taxBracket, hasChurchTax, state, children, workingMonths, salariesPerYear,
  hasPartner, partnerGrossIncome, partnerTaxBracket, partnerHasChurchTax, partnerState, partnerWorkingMonths, partnerSalariesPerYear,
  deductions, savedScenarios, activeScenarioId, scenarioDraft, saveScenario, deleteScenario, loadScenario, editScenario, saveDraft, updateScenarioMetaData, updateScenarioInput, cancelEdit 
} from '../store/calculatorStore';
import { PlusIcon, DownloadIcon, XIcon, SaveIcon, EditIcon } from './Icons';

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
      const isActive = activeScenarioId.value === scenario.id;
      const dataToUse = isActive && scenarioDraft.value ? scenarioDraft.value.data : scenario.data;
      const saved = getPaycheckVal(dataToUse);
      cells.push(
        <td key={scenario.id} style={`padding: 12px 16px; font-weight: bold; border-bottom: 1px solid var(--card-border); min-width: 220px; color: ${isActive ? 'var(--primary)' : '#f8fafc'}; background: ${isActive ? 'rgba(56, 189, 248, 0.05)' : 'transparent'};`}>
          {format(saved.val)} <span style="font-size: 0.8rem; color: #94a3b8; font-weight: normal;">{saved.hint}</span>
        </td>
      );
    });

    return (
      <tr class="comparison-row">
        <td style="padding: 12px 16px; font-weight: 600; border-bottom: 1px solid var(--card-border); color: #cbd5e1; position: sticky; left: 0; background: #1e293b; z-index: 10; border-right: 2px solid var(--card-border);">
          Auszahlung pro Gehalt
        </td>
        {cells}
      </tr>
    );
  };

  const renderAverageMonthlyNetRow = (personKey, isHousehold = false) => {
    const cells = [];
    
    const getAvgVal = (snapshot) => {
      if (isHousehold) {
        return snapshot.household.netIncome / 12;
      } else {
        const p = snapshot[personKey];
        return p ? p.netIncome / 12 : 0;
      }
    };

    const currentVal = getAvgVal(deductions.value);
    cells.push(
      <td key="current" style="padding: 12px 16px; border-bottom: 1px solid var(--card-border); background: rgba(16, 185, 129, 0.1); min-width: 220px; color: #e2e8f0;">
        {format(currentVal)} <span style="font-size: 0.8rem; color: #94a3b8;">/ Monat</span>
      </td>
    );

    savedScenarios.value.forEach(scenario => {
      const isActive = activeScenarioId.value === scenario.id;
      const dataToUse = isActive && scenarioDraft.value ? scenarioDraft.value.data : scenario.data;
      const savedVal = getAvgVal(dataToUse);
      
      cells.push(
        <td key={scenario.id} style={`padding: 12px 16px; border-bottom: 1px solid var(--card-border); min-width: 220px; color: #cbd5e1; background: ${isActive ? 'rgba(56, 189, 248, 0.05)' : 'transparent'};`}>
          {format(savedVal)} <span style="font-size: 0.8rem; color: #94a3b8;">/ Monat</span>
        </td>
      );
    });

    return (
      <tr class="comparison-row">
        <td style="padding: 12px 16px; font-weight: 500; border-bottom: 1px solid var(--card-border); color: #94a3b8; position: sticky; left: 0; background: #1e293b; z-index: 10; border-right: 2px solid var(--card-border);">
          Durchschn. Monatsnetto <span style="font-size: 0.75rem; color: #64748b; margin-left: 4px;">(Jahr / 12)</span>
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
      const isActive = activeScenarioId.value === scenario.id;
      const dataToUse = isActive && scenarioDraft.value ? scenarioDraft.value.data : scenario.data;

      const savedVal = isHousehold 
        ? getHouseholdMetric(dataToUse, metricKey) 
        : getMetric(dataToUse, personKey, metricKey);
        
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

  const renderInputRow = (label, currentVal, fieldKey, type, options, formatFn) => {
    const cells = [];
    cells.push(
      <td key="current" style="padding: 12px 16px; border-bottom: 1px solid var(--card-border); background: rgba(16, 185, 129, 0.1); color: #e2e8f0; font-size: 0.9rem;">
        {currentVal}
      </td>
    );

    savedScenarios.value.forEach(scenario => {
      const isActive = activeScenarioId.value === scenario.id;
      const inputsToUse = isActive && scenarioDraft.value ? scenarioDraft.value.inputs : (scenario.inputs || {});
      const rawVal = inputsToUse[fieldKey];
      const savedVal = formatFn(inputsToUse);
      
      let content = savedVal;
      if (isActive) {
        const inputStyle = "background: rgba(15, 23, 42, 0.8); border: 1px solid var(--primary); color: white; padding: 4px; border-radius: 4px; width: 100%; outline: none;";
        if (type === 'select') {
          content = (
            <select 
              value={rawVal} 
              onChange={(e) => updateScenarioInput(fieldKey, e.target.value)}
              style={inputStyle}
            >
              {options.map(opt => <option key={opt.value} value={opt.value} style="color: black;">{opt.label}</option>)}
            </select>
          );
        } else if (type === 'checkbox') {
          content = (
            <div style="display: flex; align-items: center; justify-content: center;">
              <input 
                type="checkbox" 
                checked={rawVal}
                onChange={(e) => updateScenarioInput(fieldKey, e.target.checked)}
                style="transform: scale(1.2); cursor: pointer;"
              />
            </div>
          );
        } else if (type === 'number') {
          content = (
            <input 
              type="number" 
              value={rawVal}
              onChange={(e) => updateScenarioInput(fieldKey, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          );
        }
      }

      cells.push(
        <td key={scenario.id} style={`padding: 12px 16px; border-bottom: 1px solid var(--card-border); color: #cbd5e1; font-size: 0.9rem; background: ${isActive ? 'rgba(56, 189, 248, 0.05)' : 'transparent'};`}>
          {content}
        </td>
      );
    });

    return (
      <tr class="comparison-row">
        <td style="padding: 12px 16px; font-weight: 500; border-bottom: 1px solid var(--card-border); color: #94a3b8; position: sticky; left: 0; background: #1e293b; z-index: 10; border-right: 2px solid var(--card-border); font-size: 0.9rem;">
          {label}
        </td>
        {cells}
      </tr>
    );
  };

  const handleAddScenario = () => {
    const count = savedScenarios.peek().length + 1;
    saveScenario(`Szenario ${count}`, 'Neue Simulation', deductions.peek());
  };

  return (
    <div class="glass-panel fade-in" style="max-width: 95vw; margin: 0 auto 40px auto; padding: 25px; position: relative; border-top: 4px solid var(--primary);">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h2 style="margin: 0;">Szenarien-Vergleich & Haushaltsmodelle</h2>
          <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #94a3b8;">Gegenüberstellung des aktuellen Live-Stands mit gespeicherten Haushalts-Szenarien.</p>
        </div>
        
        <div style="display: flex; gap: 15px; align-items: center;">
          <div style="display: flex; gap: 5px; background: rgba(15, 23, 42, 0.8); padding: 4px; border-radius: 6px; border: 1px solid #334155;">
            <button 
              style={`padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; transition: 0.2s; font-size: 0.8rem; font-weight: bold; background: ${isMonthly ? 'var(--primary)' : 'transparent'}; color: ${isMonthly ? '#fff' : '#cbd5e1'}`}
              onClick={() => displayMode.value = 'monthly'}
            >
              Monatlich
            </button>
            <button 
              style={`padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; transition: 0.2s; font-size: 0.8rem; font-weight: bold; background: ${!isMonthly ? 'var(--primary)' : 'transparent'}; color: ${!isMonthly ? '#fff' : '#cbd5e1'}`}
              onClick={() => displayMode.value = 'yearly'}
            >
              Jährlich
            </button>
          </div>
        </div>
      </div>

      <div style="overflow-x: auto; padding-bottom: 10px;">
        <table style="table-layout: fixed; width: max-content; border-collapse: separate; border-spacing: 0; text-align: left;">
        <thead>
          <tr>
            <th style="padding: 16px; border-bottom: 2px solid var(--card-border); width: 250px; position: sticky; left: 0; top: 0; background: #1e293b; z-index: 20; border-right: 2px solid var(--card-border);"></th>
            
            <th style="padding: 16px; border-bottom: 2px solid var(--success); background: rgba(16, 185, 129, 0.1); position: sticky; top: 0; z-index: 15; width: 300px; border-top: 2px solid var(--success);">
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
                  <div style="flex: 1;">
                    <div style="font-size: 1.1rem; color: var(--success); padding: 2px 4px; font-weight: bold;">Aktiver Live-Stand</div>
                    <div style="font-size: 0.8rem; font-weight: normal; color: #94a3b8; padding: 2px 4px;">Reagiert auf Eingaberegler</div>
                  </div>
                  
                  <button 
                    onClick={handleAddScenario}
                    style="background: transparent; color: var(--success); border: none; cursor: pointer; padding: 4px; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; opacity: 0.8; transition: opacity 0.2s;"
                    onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                    title="Als neues Szenario speichern"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
            </th>

            {savedScenarios.value.map(scenario => {
              const isActive = activeScenarioId.value === scenario.id;
              
              return (
                <th key={scenario.id} style={`padding: 16px; border-bottom: 2px solid ${isActive ? 'var(--primary)' : 'var(--card-border)'}; position: sticky; top: 0; background: ${isActive ? 'rgba(56, 189, 248, 0.1)' : '#1e293b'}; z-index: 15; width: 300px; border-top: ${isActive ? '2px solid var(--primary)' : 'none'};`}>
                  <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
                      <div style="flex: 1;">
                        <input 
                          type="text" 
                          value={isActive && scenarioDraft.value ? scenarioDraft.value.title : scenario.title} 
                          onChange={(e) => isActive && updateScenarioMetaData(e.target.value, scenarioDraft.value.description)}
                          style={`background: transparent; border: 1px solid transparent; color: ${isActive ? 'var(--primary)' : 'white'}; font-size: 1.1rem; font-weight: bold; width: 100%; padding: 2px 4px; border-radius: 4px; outline: none; transition: 0.2s; pointer-events: ${isActive ? 'auto' : 'none'};`}
                          onFocus={(e) => { if (isActive) e.target.style.background = 'rgba(255,255,255,0.1)'; }}
                          onBlur={(e) => { if (isActive) e.target.style.background = 'transparent'; }}
                          title={isActive ? "Titel bearbeiten" : scenario.title}
                        />
                        <input 
                          type="text" 
                          value={isActive && scenarioDraft.value ? scenarioDraft.value.description : scenario.description} 
                          placeholder={isActive ? "Beschreibung hinzufügen..." : ""}
                          onChange={(e) => isActive && updateScenarioMetaData(scenarioDraft.value.title, e.target.value)}
                          style={`background: transparent; border: 1px solid transparent; color: #94a3b8; font-size: 0.8rem; font-weight: normal; width: 100%; padding: 2px 4px; border-radius: 4px; outline: none; transition: 0.2s; pointer-events: ${isActive ? 'auto' : 'none'};`}
                          onFocus={(e) => { if (isActive) e.target.style.background = 'rgba(255,255,255,0.1)'; }}
                          onBlur={(e) => { if (isActive) e.target.style.background = 'transparent'; }}
                          title={isActive ? "Beschreibung bearbeiten" : scenario.description}
                        />
                      </div>
                      
                      <div style="display: flex; gap: 4px;">
                        {!isActive && (
                          <>
                            <button 
                              onClick={() => loadScenario(scenario.id)}
                              style="background: transparent; border: none; color: var(--success); cursor: pointer; padding: 4px; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; opacity: 0.8; transition: opacity 0.2s;"
                              onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                              onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                              title="In Live-Berechnung laden"
                            >
                              <DownloadIcon />
                            </button>
                            <button 
                              onClick={() => editScenario(scenario.id)}
                              style="background: transparent; border: none; color: var(--primary); cursor: pointer; padding: 4px; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; opacity: 0.8; transition: opacity 0.2s;"
                              onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                              onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                              title="Szenario bearbeiten"
                            >
                              <EditIcon />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => deleteScenario(scenario.id)}
                          style="background: transparent; border: none; color: var(--danger); cursor: pointer; padding: 4px; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; opacity: 0.7; transition: opacity 0.2s;"
                          onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
                          title="Szenario löschen"
                        >
                          <XIcon />
                        </button>
                      </div>
                    </div>
                    
                    {isActive && (
                      <div style="display: flex; gap: 5px;">
                        <button 
                          onClick={saveDraft}
                          style="background: var(--primary); color: white; border: none; padding: 6px 8px; border-radius: 4px; font-weight: bold; cursor: pointer; flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px;"
                          title="Änderungen speichern"
                        >
                          <SaveIcon /> Speichern
                        </button>
                        <button 
                          onClick={cancelEdit}
                          style="background: transparent; color: #cbd5e1; border: 1px solid var(--card-border); padding: 6px 8px; border-radius: 4px; font-weight: bold; cursor: pointer; flex: 1;"
                          title="Abbrechen ohne Speichern"
                        >
                          Abbrechen
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
            <td colSpan={savedScenarios.value.length + 2} style="padding: 20px 16px 8px 16px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; background: rgba(0,0,0,0.2);">
              Haushalt Gesamtergebnis
            </td>
          </tr>
          {renderRow(isMonthly ? 'Haushalt Durchschn. Brutto' : 'Haushalt Brutto', null, 'grossYearly', true, true)}
          {renderRow(isMonthly ? 'Haushalt Durchschn. Netto' : 'Haushalt Netto', null, 'netIncome', true, true)}
          {renderAverageMonthlyNetRow(null, true)}
          {renderPerPaycheckRow(null, true)}
          {renderRow(isMonthly ? 'Haushalt Durchschn. Abzüge' : 'Gesamtabzüge', null, 'totalDeductions', true)}
          
          <tr>
            <td colSpan={savedScenarios.value.length + 2} style="padding: 25px 16px 8px 16px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; background: rgba(0,0,0,0.2);">
              Ergebnis Person 1
            </td>
          </tr>
          {renderRow(isMonthly ? 'Durchschn. Brutto' : 'Bruttoeinkommen', 'person1', 'grossYearly', false, true)}
          {renderRow(isMonthly ? 'Durchschn. Netto' : 'Nettolohn', 'person1', 'netIncome', false, true)}
          {renderAverageMonthlyNetRow('person1', false)}
          {renderPerPaycheckRow('person1', false)}
          {renderRow(isMonthly ? 'Durchschn. Lohnsteuer' : 'Lohnsteuer', 'person1', 'tax')}
          {renderRow(isMonthly ? 'Durchschn. Krankenvers.' : 'Krankenversicherung', 'person1', 'healthCare')}
          {renderRow(isMonthly ? 'Durchschn. Rentenvers.' : 'Rentenversicherung', 'person1', 'pension')}
          
          <tr>
            <td colSpan={savedScenarios.value.length + 2} style="padding: 25px 16px 8px 16px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600; background: rgba(0,0,0,0.1);">
              Parameter Person 1
            </td>
          </tr>
          {(() => {
            const taxBracketOptions = [
              { value: '1', label: 'Klasse I' }, { value: '2', label: 'Klasse II' },
              { value: '3', label: 'Klasse III' }, { value: '4', label: 'Klasse IV' },
              { value: '5', label: 'Klasse V' }, { value: '6', label: 'Klasse VI' }
            ];
            const stateOptions = [
              'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 
              'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 
              'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'
            ].map(s => ({ value: s, label: s }));

            return (
              <>
                {renderInputRow('Bruttoeinkommen', format(grossIncome.value), 'grossIncome', 'number', null, s => format(s.grossIncome || 0))}
                {renderInputRow('Bundesland', state.value, 'state', 'select', stateOptions, s => s.state || '-')}
                {renderInputRow('Steuerklasse', `Klasse ${taxBracket.value}`, 'taxBracket', 'select', taxBracketOptions, s => s.taxBracket ? `Klasse ${s.taxBracket}` : '-')}
                {renderInputRow('Kirchensteuer', hasChurchTax.value ? 'Ja' : 'Nein', 'hasChurchTax', 'checkbox', null, s => s.hasChurchTax ? 'Ja' : 'Nein')}
                {renderInputRow('Kinder', children.value, 'children', 'number', null, s => s.children ?? '-')}
                {renderInputRow('Erwerbsmonate', `${workingMonths.value} Monate`, 'workingMonths', 'number', null, s => s.workingMonths ? `${s.workingMonths} Monate` : '-')}
                {renderInputRow('Gehälter / Jahr', `${salariesPerYear.value} Gehälter`, 'salariesPerYear', 'number', null, s => s.salariesPerYear ? `${s.salariesPerYear} Gehälter` : '-')}
              </>
            );
          })()}
          
          {(deductions.value.partner || savedScenarios.value.some(s => s.data.partner)) && (
            <>
              <tr>
                <td colSpan={savedScenarios.value.length + 2} style="padding: 25px 16px 8px 16px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; background: rgba(0,0,0,0.2);">
                  Ergebnis Partner
                </td>
              </tr>
              {renderRow(isMonthly ? 'Durchschn. Brutto' : 'Bruttoeinkommen', 'partner', 'grossYearly', false, true)}
              {renderRow(isMonthly ? 'Durchschn. Netto' : 'Nettolohn', 'partner', 'netIncome', false, true)}
              {renderAverageMonthlyNetRow('partner', false)}
              {renderPerPaycheckRow('partner', false)}
              {renderRow(isMonthly ? 'Durchschn. Lohnsteuer' : 'Lohnsteuer', 'partner', 'tax')}

              <tr>
                <td colSpan={savedScenarios.value.length + 2} style="padding: 25px 16px 8px 16px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600; background: rgba(0,0,0,0.1);">
                  Parameter Partner
                </td>
              </tr>
              {(() => {
                const taxBracketOptions = [
                  { value: '1', label: 'Klasse I' }, { value: '2', label: 'Klasse II' },
                  { value: '3', label: 'Klasse III' }, { value: '4', label: 'Klasse IV' },
                  { value: '5', label: 'Klasse V' }, { value: '6', label: 'Klasse VI' }
                ];
                const stateOptions = [
                  'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 
                  'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 
                  'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'
                ].map(s => ({ value: s, label: s }));
    
                return (
                  <>
                    {renderInputRow('Bruttoeinkommen Partner', format(partnerGrossIncome.value), 'partnerGrossIncome', 'number', null, s => format(s.partnerGrossIncome || 0))}
                    {renderInputRow('Bundesland Partner', partnerState.value, 'partnerState', 'select', stateOptions, s => s.partnerState || '-')}
                    {renderInputRow('Steuerklasse Partner', `Klasse ${partnerTaxBracket.value}`, 'partnerTaxBracket', 'select', taxBracketOptions, s => s.partnerTaxBracket ? `Klasse ${s.partnerTaxBracket}` : '-')}
                    {renderInputRow('Kirchensteuer Partner', partnerHasChurchTax.value ? 'Ja' : 'Nein', 'partnerHasChurchTax', 'checkbox', null, s => s.partnerHasChurchTax ? 'Ja' : 'Nein')}
                    {renderInputRow('Erwerbsmonate Partner', `${partnerWorkingMonths.value} Monate`, 'partnerWorkingMonths', 'number', null, s => s.partnerWorkingMonths ? `${s.partnerWorkingMonths} Monate` : '-')}
                    {renderInputRow('Gehälter Partner', `${partnerSalariesPerYear.value} Gehälter`, 'partnerSalariesPerYear', 'number', null, s => s.partnerSalariesPerYear ? `${s.partnerSalariesPerYear} Gehälter` : '-')}
                  </>
                );
              })()}
            </>
          )}

        </tbody>
      </table>
      </div>
    </div>
  );
}
