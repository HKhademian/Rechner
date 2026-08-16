import type { JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import {
  grossIncome,
  taxBracket,
  hasChurchTax,
  state,
  children,
  workingMonths,
  salariesPerYear,
  partnerGrossIncome,
  partnerTaxBracket,
  partnerHasChurchTax,
  partnerState,
  partnerWorkingMonths,
  partnerSalariesPerYear,
  deductions,
  savedScenarios,
  activeScenarioId,
  scenarioDraft,
  saveScenario,
  deleteScenario,
  loadScenario,
  editScenario,
  saveDraft,
  updateScenarioMetaData,
  updateScenarioInput,
  cancelEdit,
  type HouseholdScenarioData,
  type CalculatorInputs,
  type PersonDeductions
} from '../store/calculatorStore.ts';
import { PlusIcon, DownloadIcon, XIcon, SaveIcon, EditIcon } from './Icons.tsx';

export default function ComparisonTable(): JSX.Element | null {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    // Initialize first scenario if none exist
    if (savedScenarios.peek().length === 0) {
      saveScenario('My First Scenario', 'Default starting point', deductions.peek());
    }
  }, []);

  const displayMode = useSignal<'yearly' | 'monthly'>('yearly');

  if (!mounted || savedScenarios.value.length === 0) return null;

  const format = (num: number): string => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
  };

  const isMonthly = displayMode.value === 'monthly';

  const getMetric = (snapshot: HouseholdScenarioData, personKey: 'person1' | 'partner', metricKey: keyof PersonDeductions, useDivider = true): number => {
    const person = snapshot[personKey];
    if (!person) return 0;
    const divider = (isMonthly && useDivider) ? person.monthsWorked : 1;
    return (person[metricKey] as number) / divider;
  };

  const getHouseholdMetric = (snapshot: HouseholdScenarioData, metricKey: 'grossYearly' | 'netIncome' | 'totalDeductions'): number => {
    if (!isMonthly) return snapshot.household[metricKey];
    const p1Monthly = getMetric(snapshot, 'person1', metricKey);
    const p2Monthly = snapshot.partner ? getMetric(snapshot, 'partner', metricKey) : 0;
    return p1Monthly + p2Monthly;
  };

  const renderPerPaycheckRow = (personKey: 'person1' | 'partner' | null, isHousehold = false): JSX.Element | null => {
    if (!isMonthly) return null;
    const cells: JSX.Element[] = [];

    const getPaycheckVal = (snapshot: HouseholdScenarioData): { val: number; hint: string } => {
      if (isHousehold) {
        const p1 = snapshot.person1;
        const p2 = snapshot.partner;
        const p1Val = p1 ? p1.netIncome / (p1.salariesReceived || 12) : 0;
        const p2Val = p2 ? p2.netIncome / (p2.salariesReceived || 12) : 0;
        return { val: p1Val + p2Val, hint: '' };
      } else if (personKey) {
        const p = snapshot[personKey];
        if (!p) return { val: 0, hint: '' };
        const salaries = p.salariesReceived || 12;
        return { val: p.netIncome / salaries, hint: `(x${salaries})` };
      }
      return { val: 0, hint: '' };
    };

    // Current Story
    const current = getPaycheckVal(deductions.value);
    cells.push(
      <td key="current" style={{ padding: '12px 16px', fontWeight: 'bold', borderBottom: '1px solid var(--card-border)', background: 'rgba(16, 185, 129, 0.1)', minWidth: '220px', color: 'var(--success)' }}>
        {format(current.val)} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal' }}>{current.hint}</span>
      </td>
    );

    savedScenarios.value.forEach(scenario => {
      const isActive = activeScenarioId.value === scenario.id;
      const dataToUse = isActive && scenarioDraft.value ? scenarioDraft.value.data : scenario.data;
      const saved = getPaycheckVal(dataToUse);
      cells.push(
        <td key={scenario.id} style={{ padding: '12px 16px', fontWeight: 'bold', borderBottom: '1px solid var(--card-border)', minWidth: '220px', color: isActive ? 'var(--primary)' : '#f8fafc', background: isActive ? 'rgba(56, 189, 248, 0.05)' : 'transparent' }}>
          {format(saved.val)} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal' }}>{saved.hint}</span>
        </td>
      );
    });

    return (
      <tr class="comparison-row">
        <td style={{ padding: '12px 16px', fontWeight: 600, borderBottom: '1px solid var(--card-border)', color: '#cbd5e1', position: 'sticky', left: 0, background: '#1e293b', zIndex: 10, borderRight: '2px solid var(--card-border)' }}>
          Net Per Paycheck
        </td>
        {cells}
      </tr>
    );
  };

  const renderAverageMonthlyNetRow = (personKey: 'person1' | 'partner' | null, isHousehold = false): JSX.Element => {
    const cells: JSX.Element[] = [];

    const getAvgVal = (snapshot: HouseholdScenarioData): number => {
      if (isHousehold) {
        return snapshot.household.netIncome / 12;
      } else if (personKey) {
        const p = snapshot[personKey];
        return p ? p.netIncome / 12 : 0;
      }
      return 0;
    };

    const currentVal = getAvgVal(deductions.value);
    cells.push(
      <td key="current" style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', background: 'rgba(16, 185, 129, 0.1)', minWidth: '220px', color: '#e2e8f0' }}>
        {format(currentVal)} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/ mo</span>
      </td>
    );

    savedScenarios.value.forEach(scenario => {
      const isActive = activeScenarioId.value === scenario.id;
      const dataToUse = isActive && scenarioDraft.value ? scenarioDraft.value.data : scenario.data;
      const savedVal = getAvgVal(dataToUse);

      cells.push(
        <td key={scenario.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', minWidth: '220px', color: '#cbd5e1', background: isActive ? 'rgba(56, 189, 248, 0.05)' : 'transparent' }}>
          {format(savedVal)} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/ mo</span>
        </td>
      );
    });

    return (
      <tr class="comparison-row">
        <td style={{ padding: '12px 16px', fontWeight: 500, borderBottom: '1px solid var(--card-border)', color: '#94a3b8', position: 'sticky', left: 0, background: '#1e293b', zIndex: 10, borderRight: '2px solid var(--card-border)' }}>
          Avg. Monthly Net <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '4px' }}>(Yearly / 12)</span>
        </td>
        {cells}
      </tr>
    );
  };

  const renderRow = (label: string, personKey: 'person1' | 'partner' | null, metricKey: keyof PersonDeductions | 'totalDeductions', isHousehold = false, isHeader = false): JSX.Element => {
    const cells: JSX.Element[] = [];

    // Current Story
    const currentVal = isHousehold
      ? getHouseholdMetric(deductions.value, metricKey as 'grossYearly' | 'netIncome' | 'totalDeductions')
      : personKey ? getMetric(deductions.value, personKey, metricKey as keyof PersonDeductions) : 0;

    cells.push(
      <td key="current" style={{ padding: '12px 16px', fontWeight: isHeader ? 'bold' : 'normal', borderBottom: '1px solid var(--card-border)', background: 'rgba(16, 185, 129, 0.1)', minWidth: '220px' }}>
        {format(currentVal)}
      </td>
    );

    savedScenarios.value.forEach(scenario => {
      const isActive = activeScenarioId.value === scenario.id;
      const dataToUse = isActive && scenarioDraft.value ? scenarioDraft.value.data : scenario.data;

      const savedVal = isHousehold
        ? getHouseholdMetric(dataToUse, metricKey as 'grossYearly' | 'netIncome' | 'totalDeductions')
        : personKey ? getMetric(dataToUse, personKey, metricKey as keyof PersonDeductions) : 0;

      cells.push(
        <td key={scenario.id} style={{ padding: '12px 16px', fontWeight: isHeader ? 'bold' : 'normal', borderBottom: '1px solid var(--card-border)', minWidth: '220px', background: isActive ? 'rgba(56, 189, 248, 0.05)' : 'transparent' }}>
          {format(savedVal)}
        </td>
      );
    });

    return (
      <tr class="comparison-row">
        <td style={{ padding: '12px 16px', fontWeight: 600, borderBottom: '1px solid var(--card-border)', color: '#e2e8f0', position: 'sticky', left: 0, background: '#1e293b', zIndex: 10, borderRight: '2px solid var(--card-border)' }}>
          {label}
        </td>
        {cells}
      </tr>
    );
  };

  const renderInputRow = (
    label: string,
    currentVal: string | number,
    fieldKey: keyof CalculatorInputs,
    type: 'select' | 'checkbox' | 'number',
    options: { value: string; label: string }[] | null,
    formatFn: (inputs: Partial<CalculatorInputs>) => string | number
  ): JSX.Element => {
    const cells: JSX.Element[] = [];
    cells.push(
      <td key="current" style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', background: 'rgba(16, 185, 129, 0.1)', color: '#e2e8f0', fontSize: '0.9rem' }}>
        {currentVal}
      </td>
    );

    savedScenarios.value.forEach(scenario => {
      const isActive = activeScenarioId.value === scenario.id;
      const inputsToUse = isActive && scenarioDraft.value ? scenarioDraft.value.inputs : (scenario.inputs || {});
      const rawVal = (inputsToUse as Record<string, unknown>)[fieldKey];
      const savedVal = formatFn(inputsToUse);

      let content: JSX.Element | string | number = savedVal;
      if (isActive) {
        const inputStyle = 'background: rgba(15, 23, 42, 0.8); border: 1px solid var(--primary); color: white; padding: 4px; borderRadius: 4px; width: 100%; outline: none;';
        if (type === 'select' && options) {
          content = (
            <select
              value={rawVal as string}
              onChange={(e) => updateScenarioInput(fieldKey, (e.target as HTMLSelectElement).value as never)}
              style={inputStyle}
            >
              {options.map(opt => <option key={opt.value} value={opt.value} style={{ color: 'black' }}>{opt.label}</option>)}
            </select>
          );
        } else if (type === 'checkbox') {
          content = (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input
                type="checkbox"
                checked={rawVal as boolean}
                onChange={(e) => updateScenarioInput(fieldKey, (e.target as HTMLInputElement).checked as never)}
                style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
              />
            </div>
          );
        } else if (type === 'number') {
          content = (
            <input
              type="number"
              value={rawVal as number}
              onChange={(e) => updateScenarioInput(fieldKey, (parseFloat((e.target as HTMLInputElement).value) || 0) as never)}
              style={inputStyle}
            />
          );
        }
      }

      cells.push(
        <td key={scenario.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', color: '#cbd5e1', fontSize: '0.9rem', background: isActive ? 'rgba(56, 189, 248, 0.05)' : 'transparent' }}>
          {content}
        </td>
      );
    });

    return (
      <tr class="comparison-row">
        <td style={{ padding: '12px 16px', fontWeight: 500, borderBottom: '1px solid var(--card-border)', color: '#94a3b8', position: 'sticky', left: 0, background: '#1e293b', zIndex: 10, borderRight: '2px solid var(--card-border)', fontSize: '0.9rem' }}>
          {label}
        </td>
        {cells}
      </tr>
    );
  };

  const handleAddScenario = (): void => {
    const count = savedScenarios.peek().length + 1;
    saveScenario(`Scenario ${count}`, 'New simulation', deductions.peek());
  };

  return (
    <div class="glass-panel fade-in" style={{ maxWidth: '95vw', margin: '0 auto 40px auto', padding: '25px', position: 'relative', borderTop: '4px solid var(--primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Scenario Manager & Household Models</h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>Compare your active live inputs against saved household planning scenarios.</p>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '5px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '6px', border: '1px solid #334155' }}>
            <button
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                transition: '0.2s',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                background: isMonthly ? 'var(--primary)' : 'transparent',
                color: isMonthly ? '#fff' : '#cbd5e1'
              }}
              onClick={() => { displayMode.value = 'monthly'; }}
            >
              Monthly
            </button>
            <button
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                transition: '0.2s',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                background: !isMonthly ? 'var(--primary)' : 'transparent',
                color: !isMonthly ? '#fff' : '#cbd5e1'
              }}
              onClick={() => { displayMode.value = 'yearly'; }}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
        <table style={{ tableLayout: 'fixed', width: 'max-content', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ padding: '16px', borderBottom: '2px solid var(--card-border)', width: '250px', position: 'sticky', left: 0, top: 0, background: '#1e293b', zIndex: 20, borderRight: '2px solid var(--card-border)' }}></th>

              <th style={{ padding: '16px', borderBottom: '2px solid var(--success)', background: 'rgba(16, 185, 129, 0.1)', position: 'sticky', top: 0, zIndex: 15, width: '300px', borderTop: '2px solid var(--success)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.1rem', color: 'var(--success)', padding: '2px 4px', fontWeight: 'bold' }}>Live Calculation</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#94a3b8', padding: '2px 4px' }}>Reacts live to sliders</div>
                    </div>

                    <button
                      onClick={handleAddScenario}
                      style={{ background: 'transparent', color: 'var(--success)', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8, transition: 'opacity 0.2s' }}
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
                  <th key={scenario.id} style={{ padding: '16px', borderBottom: `2px solid ${isActive ? 'var(--primary)' : 'var(--card-border)'}`, position: 'sticky', top: 0, background: isActive ? 'rgba(56, 189, 248, 0.1)' : '#1e293b', zIndex: 15, width: '300px', borderTop: isActive ? '2px solid var(--primary)' : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            value={isActive && scenarioDraft.value ? scenarioDraft.value.title : scenario.title}
                            onChange={(e) => {
                              if (isActive && scenarioDraft.value) {
                                updateScenarioMetaData((e.target as HTMLInputElement).value, scenarioDraft.value.description);
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: '1px solid transparent',
                              color: isActive ? 'var(--primary)' : 'white',
                              fontSize: '1.1rem',
                              fontWeight: 'bold',
                              width: '100%',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              outline: 'none',
                              transition: '0.2s',
                              pointerEvents: isActive ? 'auto' : 'none'
                            }}
                            title={isActive ? 'Edit title' : scenario.title}
                          />
                          <input
                            type="text"
                            value={isActive && scenarioDraft.value ? scenarioDraft.value.description : scenario.description}
                            placeholder={isActive ? 'Add description...' : ''}
                            onChange={(e) => {
                              if (isActive && scenarioDraft.value) {
                                updateScenarioMetaData(scenarioDraft.value.title, (e.target as HTMLInputElement).value);
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: '1px solid transparent',
                              color: '#94a3b8',
                              fontSize: '0.8rem',
                              fontWeight: 'normal',
                              width: '100%',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              outline: 'none',
                              transition: '0.2s',
                              pointerEvents: isActive ? 'auto' : 'none'
                            }}
                            title={isActive ? 'Edit description' : scenario.description}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '4px' }}>
                          {!isActive && (
                            <>
                              <button
                                onClick={() => loadScenario(scenario.id)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--success)', cursor: 'pointer', padding: '4px', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8, transition: 'opacity 0.2s' }}
                                title="Load into Live Calculator"
                              >
                                <DownloadIcon />
                              </button>
                              <button
                                onClick={() => editScenario(scenario.id)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8, transition: 'opacity 0.2s' }}
                                title="Edit Scenario"
                              >
                                <EditIcon />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteScenario(scenario.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7, transition: 'opacity 0.2s' }}
                            title="Delete Scenario"
                          >
                            <XIcon />
                          </button>
                        </div>
                      </div>

                      {isActive && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            onClick={saveDraft}
                            style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '6px 8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            title="Save changes to scenario"
                          >
                            <SaveIcon /> Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={{ background: 'transparent', color: '#cbd5e1', border: '1px solid var(--card-border)', padding: '6px 8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}
                            title="Cancel editing"
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
              <td colSpan={savedScenarios.value.length + 2} style={{ padding: '20px 16px 8px 16px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', fontWeight: 700, background: 'rgba(0,0,0,0.2)' }}>
                Household Summary
              </td>
            </tr>
            {renderRow(isMonthly ? 'Household Avg Gross' : 'Household Gross', null, 'grossYearly', true, true)}
            {renderRow(isMonthly ? 'Household Avg Net' : 'Household Net Pay', null, 'netIncome', true, true)}
            {renderAverageMonthlyNetRow(null, true)}
            {renderPerPaycheckRow(null, true)}
            {renderRow(isMonthly ? 'Household Avg Deductions' : 'Total Deductions', null, 'totalDeductions', true)}

            <tr>
              <td colSpan={savedScenarios.value.length + 2} style={{ padding: '25px 16px 8px 16px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', fontWeight: 700, background: 'rgba(0,0,0,0.2)' }}>
                Person 1 Summary
              </td>
            </tr>
            {renderRow(isMonthly ? 'Avg Gross' : 'Gross Income', 'person1', 'grossYearly', false, true)}
            {renderRow(isMonthly ? 'Avg Net' : 'Net Take-Home Pay', 'person1', 'netIncome', false, true)}
            {renderAverageMonthlyNetRow('person1', false)}
            {renderPerPaycheckRow('person1', false)}
            {renderRow(isMonthly ? 'Avg Wage Tax' : 'Wage Tax (Lohnsteuer)', 'person1', 'tax')}
            {renderRow(isMonthly ? 'Avg Health Care' : 'Health Insurance', 'person1', 'healthCare')}
            {renderRow(isMonthly ? 'Avg Pension' : 'Pension Insurance', 'person1', 'pension')}

            <tr>
              <td colSpan={savedScenarios.value.length + 2} style={{ padding: '25px 16px 8px 16px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', fontWeight: 600, background: 'rgba(0,0,0,0.1)' }}>
                Person 1 Parameters
              </td>
            </tr>
            {(() => {
              const taxBracketOptions = [
                { value: '1', label: 'Class I' }, { value: '2', label: 'Class II' },
                { value: '3', label: 'Class III' }, { value: '4', label: 'Class IV' },
                { value: '5', label: 'Class V' }, { value: '6', label: 'Class VI' }
              ];
              const stateOptions = [
                'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen',
                'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz',
                'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'
              ].map(s => ({ value: s, label: s }));

              return (
                <>
                  {renderInputRow('Gross Income', format(grossIncome.value), 'grossIncome', 'number', null, s => format(s.grossIncome || 0))}
                  {renderInputRow('Federal State', state.value, 'state', 'select', stateOptions, s => s.state || '-')}
                  {renderInputRow('Tax Class', `Class ${taxBracket.value}`, 'taxBracket', 'select', taxBracketOptions, s => s.taxBracket ? `Class ${s.taxBracket}` : '-')}
                  {renderInputRow('Church Tax', hasChurchTax.value ? 'Yes' : 'No', 'hasChurchTax', 'checkbox', null, s => s.hasChurchTax ? 'Yes' : 'No')}
                  {renderInputRow('Children', children.value, 'children', 'number', null, s => s.children ?? '-')}
                  {renderInputRow('Working Months', `${workingMonths.value} Months`, 'workingMonths', 'number', null, s => s.workingMonths ? `${s.workingMonths} Months` : '-')}
                  {renderInputRow('Salaries / Year', `${salariesPerYear.value} Salaries`, 'salariesPerYear', 'number', null, s => s.salariesPerYear ? `${s.salariesPerYear} Salaries` : '-')}
                </>
              );
            })()}

            {(deductions.value.partner || savedScenarios.value.some(s => s.data.partner)) && (
              <>
                <tr>
                  <td colSpan={savedScenarios.value.length + 2} style={{ padding: '25px 16px 8px 16px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', fontWeight: 700, background: 'rgba(0,0,0,0.2)' }}>
                    Partner Summary
                  </td>
                </tr>
                {renderRow(isMonthly ? 'Avg Gross' : 'Gross Income', 'partner', 'grossYearly', false, true)}
                {renderRow(isMonthly ? 'Avg Net' : 'Net Take-Home Pay', 'partner', 'netIncome', false, true)}
                {renderAverageMonthlyNetRow('partner', false)}
                {renderPerPaycheckRow('partner', false)}
                {renderRow(isMonthly ? 'Avg Wage Tax' : 'Wage Tax (Lohnsteuer)', 'partner', 'tax')}

                <tr>
                  <td colSpan={savedScenarios.value.length + 2} style={{ padding: '25px 16px 8px 16px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', fontWeight: 600, background: 'rgba(0,0,0,0.1)' }}>
                    Partner Parameters
                  </td>
                </tr>
                {(() => {
                  const taxBracketOptions = [
                    { value: '1', label: 'Class I' }, { value: '2', label: 'Class II' },
                    { value: '3', label: 'Class III' }, { value: '4', label: 'Class IV' },
                    { value: '5', label: 'Class V' }, { value: '6', label: 'Class VI' }
                  ];
                  const stateOptions = [
                    'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen',
                    'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz',
                    'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'
                  ].map(s => ({ value: s, label: s }));

                  return (
                    <>
                      {renderInputRow('Partner Gross', format(partnerGrossIncome.value), 'partnerGrossIncome', 'number', null, s => format(s.partnerGrossIncome || 0))}
                      {renderInputRow('Partner Federal State', partnerState.value, 'partnerState', 'select', stateOptions, s => s.partnerState || '-')}
                      {renderInputRow('Partner Tax Class', `Class ${partnerTaxBracket.value}`, 'partnerTaxBracket', 'select', taxBracketOptions, s => s.partnerTaxBracket ? `Class ${s.partnerTaxBracket}` : '-')}
                      {renderInputRow('Partner Church Tax', partnerHasChurchTax.value ? 'Yes' : 'No', 'partnerHasChurchTax', 'checkbox', null, s => s.partnerHasChurchTax ? 'Yes' : 'No')}
                      {renderInputRow('Partner Working Months', `${partnerWorkingMonths.value} Months`, 'partnerWorkingMonths', 'number', null, s => s.partnerWorkingMonths ? `${s.partnerWorkingMonths} Months` : '-')}
                      {renderInputRow('Partner Salaries', `${partnerSalariesPerYear.value} Salaries`, 'partnerSalariesPerYear', 'number', null, s => s.partnerSalariesPerYear ? `${s.partnerSalariesPerYear} Salaries` : '-')}
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
