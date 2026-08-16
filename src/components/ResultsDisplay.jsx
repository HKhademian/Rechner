import { useState, useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { deductions, hasPartner, salariesPerYear, partnerSalariesPerYear } from '../store/calculatorStore';

export default function ResultsDisplay() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const displayMode = useSignal('monthly'); // local toggle for viewing results

  if (!mounted) return <div class="glass-panel fade-in">Ergebnisse werden geladen...</div>;

  const format = (num) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
  };

  const d = deductions.value;
  const isMonthly = displayMode.value === 'monthly';

  // Percentage of gross
  const pct = (val, gross) => gross > 0 ? ((val / gross) * 100).toFixed(1) + ' %' : '0 %';

  const renderPerson = (title, personData, personSalaries) => {
    if (!personData || personData.grossYearly <= 0) return null;
    
    // Divide by the number of salaries received (e.g. 12, 13) in monthly view
    const divider = isMonthly ? personSalaries : 1;
    const gross = personData.grossYearly / divider;

    return (
      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid #334155; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #f8fafc; border-bottom: 1px solid var(--card-border); padding-bottom: 8px; display: flex; justify-content: space-between;">
          <span>{title}</span>
          <span style="font-size: 0.8rem; color: #94a3b8; font-weight: normal; margin-top: 4px;">
            {isMonthly ? 'Monatsdurchschnitt' : 'Jahressumme'}
          </span>
        </h3>
        
        <div class="deduction-item" style="color: var(--text-color); font-weight: 600; margin-bottom: 15px;">
          <span>Bruttoeinkommen</span>
          <span class="amount">{format(gross)}</span>
        </div>

        <div style="color: #94a3b8; font-size: 0.78rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Sozialversicherungsabgaben</div>
        <div class="deduction-item">
          <span>Krankenversicherung <small>({pct(personData.healthCare, personData.grossYearly)})</small></span>
          <span class="amount" style="color: var(--deduction)">- {format(personData.healthCare / divider)}</span>
        </div>
        <div class="deduction-item">
          <span>Rentenversicherung <small>({pct(personData.pension, personData.grossYearly)})</small></span>
          <span class="amount" style="color: var(--deduction)">- {format(personData.pension / divider)}</span>
        </div>
        <div class="deduction-item">
          <span>Arbeitslosenversicherung <small>({pct(personData.unemployment, personData.grossYearly)})</small></span>
          <span class="amount" style="color: var(--deduction)">- {format(personData.unemployment / divider)}</span>
        </div>
        <div class="deduction-item">
          <span>Pflegeversicherung <small>({pct(personData.care, personData.grossYearly)})</small></span>
          <span class="amount" style="color: var(--deduction)">- {format(personData.care / divider)}</span>
        </div>

        <div style="color: #94a3b8; font-size: 0.78rem; margin-bottom: 8px; margin-top: 15px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Steuerabzüge</div>
        <div class="deduction-item">
          <span>Lohnsteuer <small>({pct(personData.tax, personData.grossYearly)})</small></span>
          <span class="amount" style="color: var(--danger)">- {format(personData.tax / divider)}</span>
        </div>
        {personData.churchTax > 0 && (
          <div class="deduction-item">
            <span>Kirchensteuer <small>({pct(personData.churchTax, personData.grossYearly)})</small></span>
            <span class="amount" style="color: var(--danger)">- {format(personData.churchTax / divider)}</span>
          </div>
        )}

        <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 10px; border-top: 1px dashed var(--card-border); font-weight: 700; color: #fff;">
          <span>Nettolohn</span>
          <span>{format(personData.netIncome / divider)}</span>
        </div>
      </div>
    );
  };

  return (
    <div class="glass-panel fade-in" style="animation-delay: 0.1s;">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0;">Berechnungsergebnis & Abzüge</h2>
        
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

      <div style="display: flex; flex-direction: column; gap: 10px;">
        {renderPerson('Person 1', d.person1, salariesPerYear.value)}
        {hasPartner.value && renderPerson('Partner', d.partner, partnerSalariesPerYear.value)}
      </div>

      <div class="total-net fade-in" style="background: rgba(16, 185, 129, 0.1); padding: 20px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.25); border-top: none;">
        <span>
          {hasPartner.value ? 'Haushalts-Nettoeinkommen' : 'Gesamtes Nettoeinkommen'}
          <div style="font-size: 0.8rem; color: #94a3b8; font-weight: normal; margin-top: 4px;">
            {isMonthly ? 'Summe der monatlichen Nettobeträge' : 'Jahressumme netto'}
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
      
      <div style="margin-top: 1rem; text-align: center; color: #94a3b8; font-size: 0.8rem;">
        Gesamtabgabenquote (Steuern & Sozialabgaben): <strong style="color: #f8fafc;">{pct(d.household.totalDeductions, d.household.grossYearly)}</strong>
      </div>
      <div style="margin-top: 0.5rem; text-align: center; color: #64748b; font-size: 0.75rem;">
        Berechnung gemäß § 32a EStG und Sozialversicherungs-Rechengrößenverordnung.
      </div>
    </div>
  );
}
