import { signal, computed, effect, type Signal } from "@preact/signals";
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
} from "#store/taxConfigStore";

// Helper to persist signals in localStorage
function persistedSignal<T>(key: string, initialValue: T): Signal<T> {
  let initial = initialValue;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try {
        initial = JSON.parse(stored);
      } catch {
        // Fallback to initialValue if parsing fails
      }
    }
  }

  const s = signal<T>(initial);

  if (typeof window !== "undefined") {
    effect(() => {
      localStorage.setItem(key, JSON.stringify(s.value));
    });
  }

  return s;
}

export interface CalculatorInputs {
  inputMode: "yearly" | "monthly";
  grossIncome: number;
  taxBracket: string;
  hasChurchTax: boolean;
  state: string;
  children: number;
  workingMonths: number;
  salariesPerYear: number;
  hasPartner: boolean;
  partnerGrossIncome: number;
  partnerTaxBracket: string;
  partnerHasChurchTax: boolean;
  partnerState: string;
  partnerWorkingMonths: number;
  partnerSalariesPerYear: number;
}

export interface PersonDeductions {
  grossYearly: number;
  healthCare: number;
  pension: number;
  unemployment: number;
  care: number;
  tax: number;
  churchTax: number;
  totalSocialSecurity: number;
  totalDeductions: number;
  netIncome: number;
  monthsWorked: number;
  salariesReceived: number;
}

export interface HouseholdScenarioData {
  person1: PersonDeductions;
  partner: PersonDeductions | null;
  household: {
    grossYearly: number;
    netIncome: number;
    totalDeductions: number;
  };
}

export interface SavedScenarioItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  inputs: CalculatorInputs;
  data: HouseholdScenarioData;
}

import defaultCalculatorData from "../data/defaultCalculatorState.json" with { type: "json" };

const DEFAULT_CALCULATOR_INPUTS: CalculatorInputs = {
  ...defaultCalculatorData,
  inputMode: defaultCalculatorData.inputMode as "yearly" | "monthly",
} satisfies CalculatorInputs;

// Display Settings
export const inputMode = persistedSignal<"yearly" | "monthly">(
  "inputMode",
  DEFAULT_CALCULATOR_INPUTS.inputMode,
);

// Person 1 Settings
export const grossIncome = persistedSignal<number>(
  "grossIncome",
  DEFAULT_CALCULATOR_INPUTS.grossIncome,
);
export const taxBracket = persistedSignal<string>(
  "taxBracket",
  DEFAULT_CALCULATOR_INPUTS.taxBracket,
);
export const hasChurchTax = persistedSignal<boolean>(
  "hasChurchTax",
  DEFAULT_CALCULATOR_INPUTS.hasChurchTax,
);
export const state = persistedSignal<string>(
  "state",
  DEFAULT_CALCULATOR_INPUTS.state,
);
export const children = persistedSignal<number>(
  "children",
  DEFAULT_CALCULATOR_INPUTS.children,
);
export const workingMonths = persistedSignal<number>(
  "workingMonths",
  DEFAULT_CALCULATOR_INPUTS.workingMonths,
);
export const salariesPerYear = persistedSignal<number>(
  "salariesPerYear",
  DEFAULT_CALCULATOR_INPUTS.salariesPerYear,
);

// Partner Settings
export const hasPartner = persistedSignal<boolean>(
  "hasPartner",
  DEFAULT_CALCULATOR_INPUTS.hasPartner,
);
export const partnerGrossIncome = persistedSignal<number>(
  "partnerGrossIncome",
  DEFAULT_CALCULATOR_INPUTS.partnerGrossIncome,
);
export const partnerTaxBracket = persistedSignal<string>(
  "partnerTaxBracket",
  DEFAULT_CALCULATOR_INPUTS.partnerTaxBracket,
);
export const partnerHasChurchTax = persistedSignal<boolean>(
  "partnerHasChurchTax",
  DEFAULT_CALCULATOR_INPUTS.partnerHasChurchTax,
);
export const partnerState = persistedSignal<string>(
  "partnerState",
  DEFAULT_CALCULATOR_INPUTS.partnerState,
);
export const partnerWorkingMonths = persistedSignal<number>(
  "partnerWorkingMonths",
  DEFAULT_CALCULATOR_INPUTS.partnerWorkingMonths,
);
export const partnerSalariesPerYear = persistedSignal<number>(
  "partnerSalariesPerYear",
  DEFAULT_CALCULATOR_INPUTS.partnerSalariesPerYear,
);

// Saved Scenarios
export const savedScenarios = persistedSignal<SavedScenarioItem[]>(
  "savedScenarios",
  [],
);
export const activeScenarioId = persistedSignal<string | null>(
  "activeScenarioId",
  null,
);
export const scenarioDraft = signal<SavedScenarioItem | null>(null);

export function getCurrentInputs(): CalculatorInputs {
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
    partnerSalariesPerYear: partnerSalariesPerYear.value,
  };
}

export function saveScenario(
  title?: string,
  description?: string,
  currentDeductions?: HouseholdScenarioData,
): void {
  const newScenario: SavedScenarioItem = {
    id: Date.now().toString(),
    title: title || "Untitled Scenario",
    description: description || "",
    timestamp: new Date().toISOString(),
    inputs: getCurrentInputs(),
    data: currentDeductions || calculateScenarioData(getCurrentInputs()),
  };
  savedScenarios.value = [...savedScenarios.value, newScenario];
  editScenario(newScenario.id);
}

export function deleteScenario(id: string): void {
  savedScenarios.value = savedScenarios.value.filter((s) => s.id !== id);
  if (activeScenarioId.value === id) {
    cancelEdit();
  }
}

export function loadScenario(id: string): void {
  const scenario = savedScenarios.value.find((s) => s.id === id);
  if (scenario && scenario.inputs) {
    inputMode.value =
      scenario.inputs.inputMode ?? DEFAULT_CALCULATOR_INPUTS.inputMode;
    grossIncome.value =
      scenario.inputs.grossIncome ?? DEFAULT_CALCULATOR_INPUTS.grossIncome;
    taxBracket.value =
      scenario.inputs.taxBracket ?? DEFAULT_CALCULATOR_INPUTS.taxBracket;
    hasChurchTax.value =
      scenario.inputs.hasChurchTax ?? DEFAULT_CALCULATOR_INPUTS.hasChurchTax;
    state.value = scenario.inputs.state ?? DEFAULT_CALCULATOR_INPUTS.state;
    children.value =
      scenario.inputs.children ?? DEFAULT_CALCULATOR_INPUTS.children;
    workingMonths.value =
      scenario.inputs.workingMonths ?? DEFAULT_CALCULATOR_INPUTS.workingMonths;
    salariesPerYear.value =
      scenario.inputs.salariesPerYear ??
      DEFAULT_CALCULATOR_INPUTS.salariesPerYear;
    hasPartner.value =
      scenario.inputs.hasPartner ?? DEFAULT_CALCULATOR_INPUTS.hasPartner;
    partnerGrossIncome.value =
      scenario.inputs.partnerGrossIncome ??
      DEFAULT_CALCULATOR_INPUTS.partnerGrossIncome;
    partnerTaxBracket.value =
      scenario.inputs.partnerTaxBracket ??
      DEFAULT_CALCULATOR_INPUTS.partnerTaxBracket;
    partnerHasChurchTax.value =
      scenario.inputs.partnerHasChurchTax ??
      DEFAULT_CALCULATOR_INPUTS.partnerHasChurchTax;
    partnerState.value =
      scenario.inputs.partnerState ?? DEFAULT_CALCULATOR_INPUTS.partnerState;
    partnerWorkingMonths.value =
      scenario.inputs.partnerWorkingMonths ??
      DEFAULT_CALCULATOR_INPUTS.partnerWorkingMonths;
    partnerSalariesPerYear.value =
      scenario.inputs.partnerSalariesPerYear ??
      DEFAULT_CALCULATOR_INPUTS.partnerSalariesPerYear;
  }
}

// Exact Tax Formula (Grundtarif) - Shifts according to configBasicAllowance
function getBaseTax(zve: number, basicAllowance: number): number {
  if (zve <= basicAllowance) return 0;

  const band2Cap = basicAllowance + 5401;
  if (zve <= band2Cap) {
    const y = (zve - basicAllowance) / 10000;
    return Math.floor((922.98 * y + 1400) * y);
  }

  const band3Cap = band2Cap + 49755;
  if (zve <= band3Cap) {
    const z = (zve - band2Cap) / 10000;
    return Math.floor((216.16 * z + 2397) * z + 865.13);
  }

  const band4Cap = 277825;
  if (zve <= band4Cap) {
    return Math.floor(0.42 * zve - 10453.22);
  }

  // Band 5
  return Math.floor(0.45 * zve - 18787.97);
}

function calculateForPerson(
  grossYearly: number,
  bracket: string,
  paysChurchTax: boolean,
  numChildren: number,
  bundesland: string,
  monthsWorked: number,
  salariesReceived = 12,
): PersonDeductions {
  if (grossYearly <= 0) {
    return {
      grossYearly,
      healthCare: 0,
      pension: 0,
      unemployment: 0,
      care: 0,
      tax: 0,
      churchTax: 0,
      totalSocialSecurity: 0,
      totalDeductions: 0,
      netIncome: 0,
      monthsWorked,
      salariesReceived,
    };
  }

  // 1. Social Security (with dynamic Config Caps)
  const healthCap = configHealthCap.value;
  const pensionCap = configPensionCap.value;

  const assessableHealth = Math.min(grossYearly, healthCap);
  const assessablePension = Math.min(grossYearly, pensionCap);

  const healthInsuranceRate =
    configHealthRateBase.value + configHealthRateZusatz.value;
  const pensionInsuranceRate = configPensionRate.value;
  const unemploymentInsuranceRate = configUnemploymentRate.value;

  let careInsuranceRate = configCareRateBase.value;
  if (numChildren === 0) {
    careInsuranceRate += configCareChildlessPenalty.value;
  } else if (numChildren > 1) {
    const extraChildren = Math.min(numChildren - 1, 4);
    careInsuranceRate -= extraChildren * 0.0025;
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

  if (bracket === "3") {
    tax = getBaseTax(taxableIncome / 2, basicAllowance) * 2;
  } else if (bracket === "5") {
    tax = getBaseTax(taxableIncome, basicAllowance) * 1.6;
  } else if (bracket === "6") {
    tax = getBaseTax(taxableIncome + basicAllowance, basicAllowance);
  } else {
    tax = getBaseTax(taxableIncome, basicAllowance);
    if (bracket === "2") {
      let class2ZvE = taxableIncome - 4260;
      if (class2ZvE < 0) class2ZvE = 0;
      tax = getBaseTax(class2ZvE, basicAllowance);
    }
  }

  const childTaxReductionAmount = configChildTaxReduction.value;
  const childTaxReduction = numChildren * childTaxReductionAmount;
  tax -= childTaxReduction;
  if (tax < 0) tax = 0;

  let soli = 0;
  const soliThreshold = bracket === "3" ? 36260 : 18130;
  if (tax > soliThreshold) {
    soli = tax * 0.055;
  }

  const churchRate =
    bundesland === "Bayern" || bundesland === "Baden-Württemberg" ? 0.08 : 0.09;
  const churchTax = paysChurchTax ? tax * churchRate : 0;

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
    salariesReceived,
  };
}

export function calculateScenarioData(
  inputs: CalculatorInputs,
): HouseholdScenarioData {
  const p1YearlyGross =
    inputs.inputMode === "monthly"
      ? inputs.grossIncome * inputs.salariesPerYear
      : inputs.grossIncome;
  const p2YearlyGross =
    inputs.inputMode === "monthly"
      ? inputs.partnerGrossIncome * inputs.partnerSalariesPerYear
      : inputs.partnerGrossIncome;

  const person1 = calculateForPerson(
    p1YearlyGross,
    inputs.taxBracket,
    inputs.hasChurchTax,
    inputs.children,
    inputs.state,
    inputs.workingMonths,
    inputs.salariesPerYear,
  );

  let partner: PersonDeductions | null = null;
  if (inputs.hasPartner) {
    partner = calculateForPerson(
      p2YearlyGross,
      inputs.partnerTaxBracket,
      inputs.partnerHasChurchTax,
      inputs.children,
      inputs.partnerState,
      inputs.partnerWorkingMonths,
      inputs.partnerSalariesPerYear,
    );
  }

  const householdGross =
    person1.grossYearly + (partner ? partner.grossYearly : 0);
  const householdNet = person1.netIncome + (partner ? partner.netIncome : 0);
  const householdTotalDeductions =
    person1.totalDeductions + (partner ? partner.totalDeductions : 0);

  return {
    person1,
    partner,
    household: {
      grossYearly: householdGross,
      netIncome: householdNet,
      totalDeductions: householdTotalDeductions,
    },
  };
}

export const deductions = computed<HouseholdScenarioData>(() => {
  return calculateScenarioData(getCurrentInputs());
});

export function editScenario(id: string): void {
  const scenario = savedScenarios.peek().find((s) => s.id === id);
  if (scenario) {
    scenarioDraft.value = {
      ...scenario,
      inputs: { ...scenario.inputs },
    };
    activeScenarioId.value = id;
  }
}

export function updateScenarioMetaData(
  newTitle: string,
  newDescription: string,
): void {
  if (scenarioDraft.value) {
    scenarioDraft.value = {
      ...scenarioDraft.value,
      title: newTitle,
      description: newDescription,
    };
  }
}

export function updateScenarioInput<K extends keyof CalculatorInputs>(
  field: K,
  value: CalculatorInputs[K],
): void {
  if (scenarioDraft.value) {
    const newInputs: CalculatorInputs = {
      ...scenarioDraft.value.inputs,
      [field]: value,
    };
    scenarioDraft.value = {
      ...scenarioDraft.value,
      inputs: newInputs,
      data: calculateScenarioData(newInputs),
    };
  }
}

export function overwriteScenarioWithCurrent(id: string): void {
  const scenarios = savedScenarios.peek();
  const index = scenarios.findIndex((s) => s.id === id);
  if (index > -1) {
    const newScenarios = [...scenarios];
    newScenarios[index] = {
      ...newScenarios[index],
      inputs: getCurrentInputs(),
      data: deductions.peek(),
    };
    savedScenarios.value = newScenarios;
  }
  if (activeScenarioId.peek() === id) {
    cancelEdit();
  }
}

export function saveDraft(): void {
  if (scenarioDraft.value && activeScenarioId.value) {
    const scenarios = savedScenarios.peek();
    const index = scenarios.findIndex((s) => s.id === activeScenarioId.value);
    if (index > -1) {
      const newScenarios = [...scenarios];
      newScenarios[index] = scenarioDraft.value;
      savedScenarios.value = newScenarios;
    }
    cancelEdit();
  }
}

export function cancelEdit(): void {
  activeScenarioId.value = null;
  scenarioDraft.value = null;
}
