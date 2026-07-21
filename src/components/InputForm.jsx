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

  if (!mounted) return <div class="glass-panel fade-in">Loading settings...</div>;

  const isMonthly = inputMode.value === 'monthly';

  return (
    <div class="glass-panel fade-in">
      <h2>Household Settings</h2>
      
      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button 
          style={`flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--card-border); cursor: pointer; transition: 0.2s; background: ${isMonthly ? 'var(--primary)' : 'transparent'}; color: ${isMonthly ? '#fff' : '#cbd5e1'}`}
          onClick={() => inputMode.value = 'monthly'}
        >
          Monthly Input
        </button>
        <button 
          style={`flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--card-border); cursor: pointer; transition: 0.2s; background: ${!isMonthly ? 'var(--primary)' : 'transparent'}; color: ${!isMonthly ? '#fff' : '#cbd5e1'}`}
          onClick={() => inputMode.value = 'yearly'}
        >
          Yearly Input
        </button>
      </div>

      <div class="input-group">
        <label for="children">Number of Children</label>
        <select 
          id="children"
          value={children.value} 
          onChange={(e) => children.value = Number(e.target.value)}
        >
          {[0, 1, 2, 3, 4, 5].map(num => <option key={num} value={num}>{num}</option>)}
        </select>
      </div>

      <hr style="border: 0; border-top: 1px solid var(--card-border); margin: 30px 0;" />

      <h3>Your Details</h3>
      <div class="input-group">
        <label for="gross">Gross Income ({isMonthly ? 'Monthly' : 'Yearly'}): €{grossIncome.value.toLocaleString()}</label>
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
        <label for="salariesPerYear">Salaries Received / Year (Divides Results)</label>
        <select 
          id="salariesPerYear"
          value={salariesPerYear.value} 
          onChange={(e) => salariesPerYear.value = Number(e.target.value)}
        >
          {[12, 12.5, 13, 13.5, 14].map(num => <option key={num} value={num}>{num} Salaries</option>)}
        </select>
      </div>

      <div class="input-group">
        <label for="workingMonths">Working Months (Divides results)</label>
        <select 
          id="workingMonths"
          value={workingMonths.value} 
          onChange={(e) => workingMonths.value = Number(e.target.value)}
        >
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(num => <option key={num} value={num}>{num} {num === 1 ? 'Month' : 'Months'}</option>)}
        </select>
      </div>

      <div class="input-group">
        <label for="bracket">Tax Bracket (Steuerklasse)</label>
        <select 
          id="bracket"
          value={taxBracket.value} 
          onChange={(e) => taxBracket.value = e.target.value}
        >
          <option value="1">Class 1 (Single)</option>
          <option value="2">Class 2 (Single Parent)</option>
          <option value="3">Class 3 (Married, higher earner)</option>
          <option value="4">Class 4 (Married, equal)</option>
          <option value="5">Class 5 (Married, lower earner)</option>
          <option value="6">Class 6 (Second job)</option>
        </select>
      </div>

      <div class="input-group">
        <label for="state">Your State (Bundesland)</label>
        <select 
          id="state"
          value={state.value} 
          onChange={(e) => state.value = e.target.value}
        >
          {germanStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div class="input-group" style="display: flex; justify-content: space-between; align-items: center;">
        <label for="church" style="margin-bottom: 0;">Pay Church Tax?</label>
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
        <h3 style="margin: 0;">Add Partner</h3>
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
            <label for="partnerGross">Partner's Gross ({isMonthly ? 'Monthly' : 'Yearly'}): €{partnerGrossIncome.value.toLocaleString()}</label>
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
            <label for="partnerSalariesPerYear">Partner's Salaries / Year</label>
            <select 
              id="partnerSalariesPerYear"
              value={partnerSalariesPerYear.value} 
              onChange={(e) => partnerSalariesPerYear.value = Number(e.target.value)}
            >
              {[12, 12.5, 13, 13.5, 14].map(num => <option key={num} value={num}>{num} Salaries</option>)}
            </select>
          </div>

          <div class="input-group">
            <label for="partnerWorkingMonths">Partner's Working Months</label>
            <select 
              id="partnerWorkingMonths"
              value={partnerWorkingMonths.value} 
              onChange={(e) => partnerWorkingMonths.value = Number(e.target.value)}
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(num => <option key={num} value={num}>{num} {num === 1 ? 'Month' : 'Months'}</option>)}
            </select>
          </div>
          
          <div class="input-group">
            <label for="partnerBracket">Partner's Tax Bracket</label>
            <select 
              id="partnerBracket"
              value={partnerTaxBracket.value} 
              onChange={(e) => partnerTaxBracket.value = e.target.value}
            >
              <option value="3">Class 3 (Married, higher earner)</option>
              <option value="4">Class 4 (Married, equal)</option>
              <option value="5">Class 5 (Married, lower earner)</option>
            </select>
          </div>

          <div class="input-group">
            <label for="partnerState">Partner's State (Remote/Work)</label>
            <select 
              id="partnerState"
              value={partnerState.value} 
              onChange={(e) => partnerState.value = e.target.value}
            >
              {germanStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div class="input-group" style="display: flex; justify-content: space-between; align-items: center;">
            <label for="partnerChurch" style="margin-bottom: 0;">Partner pays Church Tax?</label>
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
            <SettingsIcon size={16} /> Advanced Tax Configuration (2026)
          </div>
          <span style="font-size: 0.8rem; color: #94a3b8;">Click to expand</span>
        </summary>
        <TaxSettings />
      </details>

    </div>
  );
}
