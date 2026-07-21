import { signal, computed, effect } from '@preact/signals';
import {
  configHealthCap, configPensionCap, configBasicAllowance, configChildTaxReduction, configWorkExpenseAllowance,
  configHealthRateBase, configHealthRateZusatz, configPensionRate, configUnemploymentRate, configCareRateBase, configCareChildlessPenalty
} from './taxConfigStore';

// Helper to persist signals in localStorage
function persistedSignal(key, initialValue) {
  let initial = initialValue;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try {
        initial = JSON.parse(stored);
      } catch (e) {
        // Fallback to initialValue if parsing fails
      }
    }
  }
  
  const s = signal(initial);
  
  if (typeof window !== 'undefined') {
    effect(() => {
      localStorage.setItem(key, JSON.stringify(s.value));
    });
  }
  
  return s;
}

// Display Settings
export const inputMode = persistedSignal('inputMode', 'yearly'); // 'yearly' or 'monthly'

// Person 1 Settings
export const grossIncome = persistedSignal('grossIncome', 50000);
export const taxBracket = persistedSignal('taxBracket', '1');
export const hasChurchTax = persistedSignal('hasChurchTax', false);
export const state = persistedSignal('state', 'Berlin');
export const children = persistedSignal('children', 0);
export const workingMonths = persistedSignal('workingMonths', 12); 
export const salariesPerYear = persistedSignal('salariesPerYear', 12); 

// Partner Settings
export const hasPartner = persistedSignal('hasPartner', false);
export const partnerGrossIncome = persistedSignal('partnerGrossIncome', 40000);
export const partnerTaxBracket = persistedSignal('partnerTaxBracket', '4');
export const partnerHasChurchTax = persistedSignal('partnerHasChurchTax', false);
export const partnerState = persistedSignal('partnerState', 'Berlin');
export const partnerWorkingMonths = persistedSignal('partnerWorkingMonths', 12);
export const partnerSalariesPerYear = persistedSignal('partnerSalariesPerYear', 12);

// Saved Scenarios
export const savedScenarios = persistedSignal('savedScenarios', []);
export const activeScenarioId = persistedSignal('activeScenarioId', null);

function getCurrentInputs() {
  return {
    inputMode: inputMode.value,
    grossIncome: grossIncome.value,
    taxBracket: taxBracket.value,
    hasChurchTax: hasChurchTax.value,
    state: state.value,
    children: children.value,
    workingMonths: workingMonths.value,
    salariesPerYear: salariesPerYear.value,
    hasPartner: hasPartner.value,
    partnerGrossIncome: partnerGrossIncome.value,
    partnerTaxBracket: partnerTaxBracket.value,
    partnerHasChurchTax: partnerHasChurchTax.value,
    partnerState: partnerState.value,
    partnerWorkingMonths: partnerWorkingMonths.value,
    partnerSalariesPerYear: partnerSalariesPerYear.value
  };
}

export function saveScenario(title, description, currentDeductions) {
  const newScenario = {
    id: Date.now().toString(),
    title: title || 'Untitled Scenario',
    description: description || '',
    timestamp: new Date().toISOString(),
    inputs: getCurrentInputs(),
    data: currentDeductions // snapshot of the computed deductions
  };
  savedScenarios.value = [...savedScenarios.value, newScenario];
  activeScenarioId.value = newScenario.id;
}

export function deleteScenario(id) {
  savedScenarios.value = savedScenarios.value.filter(s => s.id !== id);
  if (activeScenarioId.value === id) {
    activeScenarioId.value = null;
  }
}

export function loadScenario(id) {
  const scenario = savedScenarios.value.find(s => s.id === id);
  if (scenario && scenario.inputs) {
    inputMode.value = scenario.inputs.inputMode ?? 'yearly';
    grossIncome.value = scenario.inputs.grossIncome ?? 50000;
    taxBracket.value = scenario.inputs.taxBracket ?? '1';
    hasChurchTax.value = scenario.inputs.hasChurchTax ?? false;
    state.value = scenario.inputs.state ?? 'Berlin';
    children.value = scenario.inputs.children ?? 0;
    workingMonths.value = scenario.inputs.workingMonths ?? 12;
    salariesPerYear.value = scenario.inputs.salariesPerYear ?? 12;
    hasPartner.value = scenario.inputs.hasPartner ?? false;
    partnerGrossIncome.value = scenario.inputs.partnerGrossIncome ?? 40000;
    partnerTaxBracket.value = scenario.inputs.partnerTaxBracket ?? '4';
    partnerHasChurchTax.value = scenario.inputs.partnerHasChurchTax ?? false;
    partnerState.value = scenario.inputs.partnerState ?? 'Berlin';
    partnerWorkingMonths.value = scenario.inputs.partnerWorkingMonths ?? 12;
    partnerSalariesPerYear.value = scenario.inputs.partnerSalariesPerYear ?? 12;
    
    activeScenarioId.value = id;
  }
}

// Exact Tax Formula (Grundtarif) - Shifts according to configBasicAllowance
function getBaseTax(zve, basicAllowance) {
  if (zve <= basicAllowance) return 0;
  
  // We use the progressive formula but anchored by the dynamic basic allowance
  // The actual German bands shift relative to the basic allowance. 
  // We'll keep the band widths roughly the same as 2024 for simplicity, but anchor to configBasicAllowance.
  // Band 2: basicAllowance to (basicAllowance + 5401)
  const band2Cap = basicAllowance + 5401; // roughly 17005 - 11604 = 5401
  if (zve <= band2Cap) {
    const y = (zve - basicAllowance) / 10000;
    return Math.floor((922.98 * y + 1400) * y);
  }
  
  // Band 3: band2Cap to (band2Cap + 49755)
  const band3Cap = band2Cap + 49755; // roughly 66760 - 17005 = 49755
  if (zve <= band3Cap) {
    const z = (zve - band2Cap) / 10000;
    return Math.floor((216.16 * z + 2397) * z + 865.13);
  }
  
  // Band 4: band3Cap to 277825
  const band4Cap = 277825; 
  if (zve <= band4Cap) {
    return Math.floor(0.42 * zve - 10453.22);
  }
  
  // Band 5
  return Math.floor(0.45 * zve - 18787.97);
}

function calculateForPerson(grossYearly, bracket, paysChurchTax, numChildren, bundesland, monthsWorked, salariesReceived = 12) {
  if (grossYearly <= 0) {
    return { grossYearly, healthCare: 0, pension: 0, unemployment: 0, care: 0, tax: 0, churchTax: 0, totalSocialSecurity: 0, totalDeductions: 0, netIncome: 0, monthsWorked };
  }

  // 1. Social Security (with dynamic Config Caps)
  const healthCap = configHealthCap.value;
  const pensionCap = configPensionCap.value;

  const assessableHealth = Math.min(grossYearly, healthCap);
  const assessablePension = Math.min(grossYearly, pensionCap);

  const healthInsuranceRate = configHealthRateBase.value + configHealthRateZusatz.value; 
  const pensionInsuranceRate = configPensionRate.value;
  const unemploymentInsuranceRate = configUnemploymentRate.value;
  
  let careInsuranceRate = configCareRateBase.value;
  if (numChildren === 0) {
    careInsuranceRate += configCareChildlessPenalty.value;
  } else if (numChildren > 1) {
    const extraChildren = Math.min(numChildren - 1, 4);
    careInsuranceRate -= (extraChildren * 0.0025);
  }

  const healthCare = assessableHealth * healthInsuranceRate;
  const pension = assessablePension * pensionInsuranceRate;
  const unemployment = assessablePension * unemploymentInsuranceRate;
  const care = assessableHealth * careInsuranceRate;
  
  const totalSocialSecurity = healthCare + pension + unemployment + care;

  // 2. Taxable Income (Zu versteuerndes Einkommen - ZvE)
  const deductibleSocialSecurity = totalSocialSecurity * 0.8;
  const workExpense = configWorkExpenseAllowance.value;
  let taxableIncome = grossYearly - deductibleSocialSecurity - workExpense;
  if (taxableIncome < 0) taxableIncome = 0;

  // 3. Tax Calculation
  let tax = 0;
  const basicAllowance = configBasicAllowance.value;
  
  if (bracket === '3') {
    tax = getBaseTax(taxableIncome / 2, basicAllowance) * 2;
  } else if (bracket === '5') {
    tax = getBaseTax(taxableIncome, basicAllowance) * 1.6;
  } else if (bracket === '6') {
    tax = getBaseTax(taxableIncome + basicAllowance, basicAllowance); // Shift up to bypass basic allowance
  } else {
    tax = getBaseTax(taxableIncome, basicAllowance);
    if (bracket === '2') {
      let class2ZvE = taxableIncome - 4260; // Fixed Single Parent allowance
      if (class2ZvE < 0) class2ZvE = 0;
      tax = getBaseTax(class2ZvE, basicAllowance);
    }
  }

  const childTaxReductionAmount = configChildTaxReduction.value;
  const childTaxReduction = numChildren * childTaxReductionAmount;
  tax -= childTaxReduction;
  if (tax < 0) tax = 0;

  let soli = 0;
  const soliThreshold = (bracket === '3') ? 36260 : 18130;
  if (tax > soliThreshold) {
    soli = tax * 0.055;
  }

  const churchRate = (bundesland === 'Bayern' || bundesland === 'Baden-Württemberg') ? 0.08 : 0.09;
  const churchTax = paysChurchTax ? (tax * churchRate) : 0;
  
  const totalDeductions = totalSocialSecurity + tax + soli + churchTax;

  return {
    grossYearly,
    healthCare,
    pension,
    unemployment,
    care,
    tax,
    churchTax,
    totalSocialSecurity,
    totalDeductions,
    netIncome: grossYearly - totalDeductions,
    monthsWorked,
    salariesReceived
  };
}

export const deductions = computed(() => {
  const p1YearlyGross = inputMode.value === 'monthly' ? (grossIncome.value * salariesPerYear.value) : grossIncome.value;
  const p2YearlyGross = inputMode.value === 'monthly' ? (partnerGrossIncome.value * partnerSalariesPerYear.value) : partnerGrossIncome.value;

  const person1 = calculateForPerson(p1YearlyGross, taxBracket.value, hasChurchTax.value, children.value, state.value, workingMonths.value, salariesPerYear.value);
  
  let partner = null;
  if (hasPartner.value) {
    partner = calculateForPerson(p2YearlyGross, partnerTaxBracket.value, partnerHasChurchTax.value, children.value, partnerState.value, partnerWorkingMonths.value, partnerSalariesPerYear.value);
  }

  const householdGross = person1.grossYearly + (partner ? partner.grossYearly : 0);
  const householdNet = person1.netIncome + (partner ? partner.netIncome : 0);
  const householdTotalDeductions = person1.totalDeductions + (partner ? partner.totalDeductions : 0);

  return {
    person1,
    partner,
    household: {
      grossYearly: householdGross,
      netIncome: householdNet,
      totalDeductions: householdTotalDeductions
    }
  };
});

// Removed auto-save effect to allow manual explicit saves instead of sticky editing
export function updateScenarioMetaData(id, newTitle, newDescription) {
  const scenarios = savedScenarios.peek();
  const index = scenarios.findIndex(s => s.id === id);
  if (index > -1) {
    const newScenarios = [...scenarios];
    newScenarios[index] = {
      ...newScenarios[index],
      title: newTitle,
      description: newDescription
    };
    savedScenarios.value = newScenarios;
  }
}

export function overwriteScenarioWithCurrent(id) {
  const scenarios = savedScenarios.peek();
  const index = scenarios.findIndex(s => s.id === id);
  if (index > -1) {
    const newScenarios = [...scenarios];
    newScenarios[index] = {
      ...newScenarios[index],
      inputs: getCurrentInputs(),
      data: deductions.peek()
    };
    savedScenarios.value = newScenarios;
  }
}
