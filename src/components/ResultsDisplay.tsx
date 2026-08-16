import type { JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import {
  deductions,
  hasPartner,
  salariesPerYear,
  partnerSalariesPerYear,
  type PersonDeductions
} from '../store/calculatorStore.ts';

export default function ResultsDisplay(): JSX.Element {
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => setMounted(true), []);

  const displayMode = useSignal<'monthly' | 'yearly'>('monthly');

  if (!mounted) return <div class="glass-panel fade-in">Loading results...</div>;

  const format = (num: number): string => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
  };

  const d = deductions.value;
  const isMonthly = displayMode.value === 'monthly';

  // Percentage of gross
  const pct = (val: number, gross: number): string => gross > 0 ? ((val / gross) * 100).toFixed(1) + ' %' : '0 %';

  const renderPerson = (title: string, personData: PersonDeductions | null, personSalaries: number): JSX.Element | null => {
    if (!personData || personData.grossYearly <= 0) return null;

    // Divide by the number of salaries received (e.g. 12, 13) in monthly view
    const divider = isMonthly ? personSalaries : 1;
    const gross = personData.grossYearly / divider;

    return (
      <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid #334155', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, color: '#f8fafc', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{title}</span>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal', marginTop: '4px' }}>
            {isMonthly ? 'Monthly Average' : 'Yearly Total'}
          </span>
        </h3>

        <div class="deduction-item" style={{ color: 'var(--text-color)', fontWeight: 600, marginBottom: '15px' }}>
          <span>Gross Income</span>
          <span class="amount">{format(gross)}</span>
        </div>

        <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Social Security Contributions (*Sozialabgaben*)</div>
        <div class="deduction-item">
          <span>Health Insurance (*Krankenversicherung - GKV*) <small>({pct(personData.healthCare, personData.grossYearly)})</small></span>
          <span class="amount" style={{ color: 'var(--deduction)' }}>- {format(personData.healthCare / divider)}</span>
        </div>
        <div class="deduction-item">
          <span>Pension Insurance (*Rentenversicherung - GRV*) <small>({pct(personData.pension, personData.grossYearly)})</small></span>
          <span class="amount" style={{ color: 'var(--deduction)' }}>- {format(personData.pension / divider)}</span>
        </div>
        <div class="deduction-item">
          <span>Unemployment (*Arbeitslosenversicherung - ALV*) <small>({pct(personData.unemployment, personData.grossYearly)})</small></span>
          <span class="amount" style={{ color: 'var(--deduction)' }}>- {format(personData.unemployment / divider)}</span>
        </div>
        <div class="deduction-item">
          <span>Long-Term Care (*Pflegeversicherung - PV*) <small>({pct(personData.care, personData.grossYearly)})</small></span>
          <span class="amount" style={{ color: 'var(--deduction)' }}>- {format(personData.care / divider)}</span>
        </div>

        <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '8px', marginTop: '15px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Taxes & Surcharges (*Steuern*)</div>
        <div class="deduction-item">
          <span>Wage Tax (*Lohnsteuer - EStG*) <small>({pct(personData.tax, personData.grossYearly)})</small></span>
          <span class="amount" style={{ color: 'var(--danger)' }}>- {format(personData.tax / divider)}</span>
        </div>
        {personData.churchTax > 0 && (
          <div class="deduction-item">
            <span>Church Tax (*Kirchensteuer*) <small>({pct(personData.churchTax, personData.grossYearly)})</small></span>
            <span class="amount" style={{ color: 'var(--danger)' }}>- {format(personData.churchTax / divider)}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '10px', borderTop: '1px dashed var(--card-border)', fontWeight: 700, color: '#fff' }}>
          <span>Net Take-Home Pay</span>
          <span>{format(personData.netIncome / divider)}</span>
        </div>
      </div>
    );
  };

  return (
    <div class="glass-panel fade-in" style={{ animationDelay: '0.1s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Calculation Breakdown</h2>

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {renderPerson('Person 1', d.person1, salariesPerYear.value)}
        {hasPartner.value && renderPerson('Spouse / Partner (*Ehegatte*)', d.partner, partnerSalariesPerYear.value)}
      </div>

      <div class="total-net fade-in" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '20px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)', borderTop: 'none' }}>
        <span>
          {hasPartner.value ? 'Household Net Pay' : 'Total Net Income'}
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal', marginTop: '4px' }}>
            {isMonthly ? 'Sum of monthly net salaries' : 'Yearly net total'}
          </div>
        </span>
        <span style={{ alignSelf: 'center' }}>
          {isMonthly
            ? format((d.person1.netIncome / salariesPerYear.value) + (hasPartner.value && d.partner ? d.partner.netIncome / partnerSalariesPerYear.value : 0))
            : format(d.household.netIncome)}
        </span>
      </div>

      <div style={{ marginTop: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
        Effective Tax & Social Security Rate: <strong style={{ color: '#f8fafc' }}>{pct(d.household.totalDeductions, d.household.grossYearly)}</strong>
      </div>
      <div style={{ marginTop: '0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>
        Computed in compliance with German § 32a EStG and Social Insurance Assessment Ceilings (*Beitragsbemessungsgrenzen - BBG*).
      </div>
    </div>
  );
}
