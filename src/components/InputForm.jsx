import { 
  grossIncome, taxBracket, hasChurchTax,
  hasPartner, partnerGrossIncome, partnerTaxBracket, partnerHasChurchTax, partnerState, partnerWorkingMonths, partnerSalariesPerYear,
  state, children, workingMonths, salariesPerYear,
  inputMode
} from '../store/calculatorStore';
import { useState, useEffect } from 'preact/hooks';
import TaxSettings from './TaxSettings';
import { SettingsIcon } from './Icons';

const germanStates = [
  'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
  'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
  'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
  'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'
];

export default function InputForm() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div class="glass-panel fade-in">Einstellungen werden geladen...</div>;

  const isMonthly = inputMode.value === 'monthly';

  return (
    <div class="glass-panel fade-in">
      <h2>Haushalts- & Gehaltsdaten</h2>
      
      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button 
          style={`flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--card-border); cursor: pointer; transition: 0.2s; background: ${isMonthly ? 'var(--primary)' : 'transparent'}; color: ${isMonthly ? '#fff' : '#cbd5e1'}`}
          onClick={() => inputMode.value = 'monthly'}
        >
          Monatliche Eingabe
        </button>
        <button 
          style={`flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--card-border); cursor: pointer; transition: 0.2s; background: ${!isMonthly ? 'var(--primary)' : 'transparent'}; color: ${!isMonthly ? '#fff' : '#cbd5e1'}`}
          onClick={() => inputMode.value = 'yearly'}
        >
          Jährliche Eingabe
        </button>
      </div>

      <div class="input-group">
        <label for="children">Anzahl der Kinder</label>
        <select 
          id="children"
          value={children.value} 
          onChange={(e) => children.value = Number(e.target.value)}
        >
          {[0, 1, 2, 3, 4, 5].map(num => <option key={num} value={num}>{num}</option>)}
        </select>
      </div>

      <hr style="border: 0; border-top: 1px solid var(--card-border); margin: 30px 0;" />

      <h3>Angaben Person 1</h3>
      <div class="input-group">
        <label for="gross">Bruttoeinkommen ({isMonthly ? 'Monatlich' : 'Jährlich'}): €{grossIncome.value.toLocaleString('de-DE')}</label>
        <input 
          id="gross"
          type="range" 
          min={isMonthly ? "1000" : "12000"} 
          max={isMonthly ? "15000" : "200000"} 
          step={isMonthly ? "100" : "1000"} 
          value={grossIncome.value} 
          onInput={(e) => grossIncome.value = Number(e.target.value)} 
        />
        <input 
          type="number" 
          value={grossIncome.value} 
          onInput={(e) => grossIncome.value = Number(e.target.value)} 
          style="margin-top: 10px;"
        />
      </div>

      <div class="input-group">
        <label for="salariesPerYear">Gehälter pro Jahr (z. B. inkl. 13. Monatsgehalt)</label>
        <select 
          id="salariesPerYear"
          value={salariesPerYear.value} 
          onChange={(e) => salariesPerYear.value = Number(e.target.value)}
        >
          {[12, 12.5, 13, 13.5, 14].map(num => <option key={num} value={num}>{num} Gehälter</option>)}
        </select>
      </div>

      <div class="input-group">
        <label for="workingMonths">Erwerbsmonate pro Jahr</label>
        <select 
          id="workingMonths"
          value={workingMonths.value} 
          onChange={(e) => workingMonths.value = Number(e.target.value)}
        >
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(num => <option key={num} value={num}>{num} {num === 1 ? 'Monat' : 'Monate'}</option>)}
        </select>
      </div>

      <div class="input-group">
        <label for="bracket">Steuerklasse</label>
        <select 
          id="bracket"
          value={taxBracket.value} 
          onChange={(e) => taxBracket.value = e.target.value}
        >
          <option value="1">Klasse I (Alleinstehend)</option>
          <option value="2">Klasse II (Alleinerziehend)</option>
          <option value="3">Klasse III (Verheiratet, höherer Verdienst)</option>
          <option value="4">Klasse IV (Verheiratet, gleicher Verdienst)</option>
          <option value="5">Klasse V (Verheiratet, geringerer Verdienst)</option>
          <option value="6">Klasse VI (Zweitjob / Nebenbeschäftigung)</option>
        </select>
      </div>

      <div class="input-group">
        <label for="state">Bundesland</label>
        <select 
          id="state"
          value={state.value} 
          onChange={(e) => state.value = e.target.value}
        >
          {germanStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div class="input-group" style="display: flex; justify-content: space-between; align-items: center;">
        <label for="church" style="margin-bottom: 0;">Kirchensteuerpflichtig?</label>
        <label class="switch">
          <input 
            id="church"
            type="checkbox" 
            checked={hasChurchTax.value} 
            onChange={(e) => hasChurchTax.value = e.target.checked} 
          />
          <span class="slider"></span>
        </label>
      </div>

      <hr style="border: 0; border-top: 1px solid var(--card-border); margin: 30px 0;" />

      <div class="input-group" style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0;">Partner / Ehegatte hinzufügen</h3>
        <label class="switch">
          <input 
            type="checkbox" 
            checked={hasPartner.value} 
            onChange={(e) => hasPartner.value = e.target.checked} 
          />
          <span class="slider"></span>
        </label>
      </div>

      {hasPartner.value && (
        <div class="fade-in" style="margin-top: 20px; padding: 15px; border-radius: 8px; background: rgba(0,0,0,0.2);">
          <div class="input-group">
            <label for="partnerGross">Bruttoeinkommen Partner ({isMonthly ? 'Monatlich' : 'Jährlich'}): €{partnerGrossIncome.value.toLocaleString('de-DE')}</label>
            <input 
              id="partnerGross"
              type="range" 
              min={isMonthly ? "0" : "0"} 
              max={isMonthly ? "15000" : "200000"} 
              step={isMonthly ? "100" : "1000"} 
              value={partnerGrossIncome.value} 
              onInput={(e) => partnerGrossIncome.value = Number(e.target.value)} 
            />
            <input 
              type="number" 
              value={partnerGrossIncome.value} 
              onInput={(e) => partnerGrossIncome.value = Number(e.target.value)} 
              style="margin-top: 10px;"
            />
          </div>

          <div class="input-group">
            <label for="partnerSalariesPerYear">Gehälter Partner / Jahr</label>
            <select 
              id="partnerSalariesPerYear"
              value={partnerSalariesPerYear.value} 
              onChange={(e) => partnerSalariesPerYear.value = Number(e.target.value)}
            >
              {[12, 12.5, 13, 13.5, 14].map(num => <option key={num} value={num}>{num} Gehälter</option>)}
            </select>
          </div>

          <div class="input-group">
            <label for="partnerWorkingMonths">Erwerbsmonate Partner</label>
            <select 
              id="partnerWorkingMonths"
              value={partnerWorkingMonths.value} 
              onChange={(e) => partnerWorkingMonths.value = Number(e.target.value)}
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(num => <option key={num} value={num}>{num} {num === 1 ? 'Monat' : 'Monate'}</option>)}
            </select>
          </div>
          
          <div class="input-group">
            <label for="partnerBracket">Steuerklasse Partner</label>
            <select 
              id="partnerBracket"
              value={partnerTaxBracket.value} 
              onChange={(e) => partnerTaxBracket.value = e.target.value}
            >
              <option value="3">Klasse III (Höherer Verdienst)</option>
              <option value="4">Klasse IV (Gleicher Verdienst)</option>
              <option value="5">Klasse V (Geringerer Verdienst)</option>
            </select>
          </div>

          <div class="input-group">
            <label for="partnerState">Bundesland Partner</label>
            <select 
              id="partnerState"
              value={partnerState.value} 
              onChange={(e) => partnerState.value = e.target.value}
            >
              {germanStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div class="input-group" style="display: flex; justify-content: space-between; align-items: center;">
            <label for="partnerChurch" style="margin-bottom: 0;">Partner kirchensteuerpflichtig?</label>
            <label class="switch">
              <input 
                id="partnerChurch"
                type="checkbox" 
                checked={partnerHasChurchTax.value} 
                onChange={(e) => partnerHasChurchTax.value = e.target.checked} 
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      )}

      <hr style="border: 0; border-top: 1px solid var(--card-border); margin: 30px 0;" />
      
      <details style="cursor: pointer; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px;">
        <summary style="font-weight: 600; color: #f8fafc; outline: none; display: flex; justify-content: space-between; align-items: center; padding: 5px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <SettingsIcon size={16} /> Erweiterte Tarifeinstellungen & Grenzwerte (2024–2026)
          </div>
          <span style="font-size: 0.8rem; color: #94a3b8;">Ausklappen</span>
        </summary>
        <TaxSettings />
      </details>

    </div>
  );
}
