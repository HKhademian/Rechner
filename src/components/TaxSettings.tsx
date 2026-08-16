import type { JSX } from 'preact';
import type { Signal } from '@preact/signals';
import {
  configHealthCap,
  configPensionCap,
  configBasicAllowance,
  configChildTaxReduction,
  configWorkExpenseAllowance,
  configHealthRateBase,
  configHealthRateZusatz,
  configPensionRate,
  configUnemploymentRate,
  configCareRateBase,
  configCareChildlessPenalty,
  resetConfig
} from '#store/taxConfigStore';

export default function TaxSettings(): JSX.Element {
  const parsePercent = (val: number): string => (val * 100).toFixed(2);
  const updatePercent = (sig: Signal<number>, val: string): void => {
    sig.value = Number(val) / 100;
  };

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', marginTop: '15px', fontSize: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>Statutory Constants & Assessment Ceilings (2024–2026)</h3>
        <button
          onClick={resetConfig}
          style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', transition: '0.2s' }}
        >
          Reset to Defaults
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div class="input-group">
          <label for="healthCap">Health Insurance Ceiling (*BBG Krankenversicherung* €/yr)</label>
          <input
            id="healthCap"
            type="number"
            value={configHealthCap.value}
            onInput={(e) => { configHealthCap.value = Number((e.target as HTMLInputElement).value); }}
          />
        </div>

        <div class="input-group">
          <label for="pensionCap">Pension Ceiling (*BBG Rentenversicherung* €/yr)</label>
          <input
            id="pensionCap"
            type="number"
            value={configPensionCap.value}
            onInput={(e) => { configPensionCap.value = Number((e.target as HTMLInputElement).value); }}
          />
        </div>

        <div class="input-group">
          <label for="basicAllowance">Basic Tax-Free Allowance (*Grundfreibetrag* § 32a EStG €)</label>
          <input
            id="basicAllowance"
            type="number"
            value={configBasicAllowance.value}
            onInput={(e) => { configBasicAllowance.value = Number((e.target as HTMLInputElement).value); }}
          />
        </div>

        <div class="input-group">
          <label for="childTaxReduction">Child Tax Allowance (*Kinderfreibetrag* § 32 EStG €)</label>
          <input
            id="childTaxReduction"
            type="number"
            value={configChildTaxReduction.value}
            onInput={(e) => { configChildTaxReduction.value = Number((e.target as HTMLInputElement).value); }}
          />
        </div>

        <div class="input-group">
          <label for="workExpense">Employee Lump-Sum (*Arbeitnehmer-Pauschbetrag* § 9a EStG €)</label>
          <input
            id="workExpense"
            type="number"
            value={configWorkExpenseAllowance.value}
            onInput={(e) => { configWorkExpenseAllowance.value = Number((e.target as HTMLInputElement).value); }}
          />
        </div>
      </div>

      <hr style={{ border: 0, borderTop: '1px solid var(--card-border)', margin: '20px 0' }} />
      <h4 style={{ marginTop: 0, color: '#cbd5e1' }}>Social Security Contribution Rates (*Sozialversicherungsbeiträge*)</h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div class="input-group">
          <label for="healthRate">Health Base Rate (*Allgemeiner Beitragssatz GKV* %)</label>
          <input
            id="healthRate"
            type="number"
            step="0.01"
            value={parsePercent(configHealthRateBase.value)}
            onInput={(e) => updatePercent(configHealthRateBase, (e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="input-group">
          <label for="healthZusatz">Health Surcharge (*Zusatzbeitrag GKV* %)</label>
          <input
            id="healthZusatz"
            type="number"
            step="0.01"
            value={parsePercent(configHealthRateZusatz.value)}
            onInput={(e) => updatePercent(configHealthRateZusatz, (e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="input-group">
          <label for="pensionRate">Pension Rate (*Rentenversicherung GRV* %)</label>
          <input
            id="pensionRate"
            type="number"
            step="0.01"
            value={parsePercent(configPensionRate.value)}
            onInput={(e) => updatePercent(configPensionRate, (e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="input-group">
          <label for="unemploymentRate">Unemployment Rate (*Arbeitslosenversicherung ALV* %)</label>
          <input
            id="unemploymentRate"
            type="number"
            step="0.01"
            value={parsePercent(configUnemploymentRate.value)}
            onInput={(e) => updatePercent(configUnemploymentRate, (e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="input-group">
          <label for="careRate">Long-Term Care Base (*Pflegeversicherung PV* %)</label>
          <input
            id="careRate"
            type="number"
            step="0.01"
            value={parsePercent(configCareRateBase.value)}
            onInput={(e) => updatePercent(configCareRateBase, (e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="input-group">
          <label for="carePenalty">Care Childless Surcharge (*Kinderlosenzuschlag PV* %)</label>
          <input
            id="carePenalty"
            type="number"
            step="0.01"
            value={parsePercent(configCareChildlessPenalty.value)}
            onInput={(e) => updatePercent(configCareChildlessPenalty, (e.target as HTMLInputElement).value)}
          />
        </div>
      </div>
    </div>
  );
}
