import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  browserAppStorage,
} from "#engine/storage/appStorage";
import {
  parseCalculatorScenario,
} from "#engine/storage/calculatorScenario";
import {
  computePayrollTaxBase,
} from "#engine/tax/payrollTaxBase";
import {
  type Signal,
  signal,
  computed,
  effect,
  batch,
} from "@preact/signals";
import {
  selectedTaxYear,
  parseVerifiedTaxYear,
} from "#store/taxConfigStore";
import {
  type PayrollOptions,
  parsePersonalPayrollOptions,
} from "#engine/tax/payroll";
import {
  DEFAULT_TAX_YEAR,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  computeEmploymentPayroll,
} from "#engine/tax/employmentPayroll";
import {
  toSalaryPaymentCount,
} from "#engine/tax/employmentPeriod";
import {
  type FullCalendarYear,
  type TaxFactor,
  type TaxClass,
  SalaryPeriod,
  TaxClass as Classes,
  toGrossSalary,
  toMonthDuration,
  toChildrenCount,
  toPercentageRate,
  toTaxFactor,
} from "#engine/types";

const netPayStorage = browserAppStorage(AppId.NetPay);

// Persist only within the net-pay app namespace, with a copy-only migration of older saves.
function persistedSignal<T>(key: string, initialValue: T, parse?: (value: unknown) => T): Signal<T> {
  let initial = initialValue;
  if (typeof window !== "undefined") {
    const stored = netPayStorage.getItem(key);
    if (stored !== null) {
      try {
        initial = parse ? parse(JSON.parse(stored)) : JSON.parse(stored);
      }
      catch {
        // Fallback to initialValue if parsing fails
      }
    }
  }

  const s = signal<T>(initial);

  if (typeof window !== "undefined") {
    effect(() => {
      const serialized = JSON.stringify(s.value);
      if (serialized === undefined) {
        netPayStorage.removeItem(key);
      }
      else {
        netPayStorage.setItem(key, serialized);
      }
    });
  }

  return s;
}

/**
 * User Input Parameters for the General German Tax & Salary Calculator.
 */
export interface CalculatorInputs {
  /** Salary input frequency ("yearly" or "monthly"). */
  inputMode: "yearly" | "monthly";
  /** Primary earner gross income amount in EUR. */
  grossIncome: number;
  /** Primary earner tax class bracket (e.g. "I", "III", "IV", "V"). */
  taxBracket: string;
  /** True if primary earner is subject to statutory church tax (Kirchensteuer). */
  hasChurchTax: boolean;
  /** Federal state of employment (e.g. "bayern", "berlin"). */
  state: string;
  /** Count of qualifying dependent children. */
  children: number;
  /** Active working months in the calendar year (1..12). */
  workingMonths: number;
  /** Number of salary disbursements per year (e.g. 12, 13). */
  salariesPerYear: number;
  /** True if household includes a spouse / partner. */
  hasPartner: boolean;
  /** Partner's gross income amount in EUR. */
  partnerGrossIncome: number;
  /** Partner's tax class bracket. */
  partnerTaxBracket: string;
  /** True if partner is subject to church tax. */
  partnerHasChurchTax: boolean;
  /** Partner's federal state of employment. */
  partnerState: string;
  /** Partner's active working months in the year (1..12). */
  partnerWorkingMonths: number;
  /** Partner's salary disbursements per year. */
  partnerSalariesPerYear: number;
  /** Missing in older saves: migrate to the latest verified profile and default assumptions. */
  taxYear?: FullCalendarYear;
  personalPayroll?: PayrollOptions;
  partnerPersonalPayroll?: PayrollOptions;
  taxFactor?: TaxFactor;

}

/**
 * Itemized Annual Social Security and Tax Deductions for an Individual Earner.
 */
export interface PersonDeductions {
  /** Annualized gross income in EUR. */
  grossYearly: number;
  /** Annual statutory health insurance employee contribution in EUR. */
  healthCare: number;
  /** Annual statutory public pension insurance employee contribution in EUR. */
  pension: number;
  /** Annual statutory unemployment insurance employee contribution in EUR. */
  unemployment: number;
  /** Annual statutory nursing care insurance employee contribution in EUR. */
  care: number;
  /** Annual statutory wage tax withholding deduction in EUR. */
  tax: number;
  /** Annual church tax withholding deduction in EUR. */
  churchTax: number;
  solidarity: number;
  assumptions: readonly string[];
  /** Total annual social security employee deductions in EUR. */
  totalSocialSecurity: number;
  /** Total annual deductions (taxes + social insurance) in EUR. */
  totalDeductions: number;
  /** Annualized net take-home income in EUR. */
  netIncome: number;
  /** Active working months count. */
  monthsWorked: number;
  /** Number of salary payments received in the year. */
  salariesReceived: number;
}

/**
 * Combined Spousal Household Financial Assessment Data.
 */
export interface HouseholdScenarioData {
  /** Annual taxable-income audit from this calculator's normalized payment schedules. */
  readonly annualTaxableIncome: ReturnType<typeof computePayrollTaxBase>;
  /** Primary earner itemized deductions and net income. */
  person1: PersonDeductions;
  /** Partner itemized deductions and net income, or null if single household. */
  partner: PersonDeductions | null;
  /** Aggregated household financial summary. */
  household: {
    /** Combined household annual gross earnings in EUR. */
    grossYearly: number;
    /** Combined household annual net take-home income in EUR. */
    netIncome: number;
    /** Total combined household tax and social deductions in EUR. */
    totalDeductions: number;
  };
}

/**
 * Saved Household Financial Scenario Item in Local Storage.
 */
export interface SavedScenarioItem {
  /** Unique scenario bookmark identifier. */
  id: string;
  /** User-defined scenario title header. */
  title: string;
  /** User-defined scenario notes description. */
  description: string;
  /** ISO-8601 creation timestamp string. */
  timestamp: string;
  /** Input parameters associated with this scenario. */
  inputs: CalculatorInputs;
  /** Precomputed household deduction results. */
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

export const personalPayroll = persistedSignal<PayrollOptions>("payroll_personal", {}, parsePersonalPayrollOptions);
export const partnerPersonalPayroll = persistedSignal<PayrollOptions>("payroll_partnerPersonal", {}, parsePersonalPayrollOptions);
export const personalTaxFactor = persistedSignal<TaxFactor | undefined>("payroll_factor", undefined);

// Saved Scenarios
export const savedScenarios = persistedSignal<SavedScenarioItem[]>(
  "savedScenarios",
  [],
);
// Editing belongs to the current session, just like its unsaved draft.
export const activeScenarioId = signal<string | null>(null);
export const scenarioDraft = signal<SavedScenarioItem | null>(null);
export const pendingScenarioDeletion = signal<{
  readonly scenario: SavedScenarioItem;
  readonly index: number;
  readonly draft: SavedScenarioItem | null;
} | null>(null);
export const hasUnsavedScenarioChanges = computed(() => {
  const draft = scenarioDraft.value;
  const saved = savedScenarios.value.find((scenario) => scenario.id === activeScenarioId.value);
  if (!draft || !saved) {
    return false;
  }
  // Cached calculation data can change independently; compare the user's inputs and metadata.
  const editable = (scenario: SavedScenarioItem): string => JSON.stringify([scenario.title, scenario.description, scenario.inputs]);
  return editable(draft) !== editable(saved);
});

export function getCurrentInputs(): CalculatorInputs {
  return {
    taxYear: selectedTaxYear.value,
    personalPayroll: personalPayroll.value,
    partnerPersonalPayroll: partnerPersonalPayroll.value,
    taxFactor: personalTaxFactor.value,
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
  _currentDeductions?: HouseholdScenarioData,
): void {
  const newScenario: SavedScenarioItem = {
    id: Date.now().toString(),
    title: title || "Untitled Scenario",
    description: description || "",
    timestamp: new Date().toISOString(),
    inputs: getCurrentInputs(),
    data: calculateScenarioData(getCurrentInputs()),
  };
  savedScenarios.value = [...savedScenarios.value, newScenario];
  editScenario(newScenario.id);
}

/** Column order changes only the persisted list; IDs and active draft objects stay intact. */
function moveSavedScenario(id: string, offset: number): void {
  const current = savedScenarios.peek();
  const index = current.findIndex((scenario) => scenario.id === id);
  const destination = index + offset;
  if (index < 0 || destination < 0 || destination >= current.length) {
    return;
  }
  const reordered = [...current];
  [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
  savedScenarios.value = reordered;
}

export function moveScenarioLeft(id: string): void {
  moveSavedScenario(id, -1);
}

export function moveScenarioRight(id: string): void {
  moveSavedScenario(id, 1);
}

export function deleteScenario(id: string): void {
  const index = savedScenarios.peek().findIndex((scenario) => scenario.id === id);
  if (index < 0) {
    return;
  }
  pendingScenarioDeletion.value = {
    scenario: savedScenarios.peek()[index],
    index,
    draft: activeScenarioId.peek() === id ? scenarioDraft.peek() : null,
  };
  savedScenarios.value = savedScenarios.value.filter((s) => s.id !== id);
  if (activeScenarioId.value === id) {
    cancelEdit();
  }
}

/** Undo the most recent deletion without changing the live calculator inputs. */
export function undoScenarioDeletion(): void {
  const deleted = pendingScenarioDeletion.peek();
  if (!deleted || savedScenarios.peek().some((scenario) => scenario.id === deleted.scenario.id)) {
    return;
  }
  const scenarios = [...savedScenarios.peek()];
  scenarios.splice(deleted.index, 0, deleted.scenario);
  savedScenarios.value = scenarios;
  if (deleted.draft && !scenarioDraft.peek()) {
    scenarioDraft.value = deleted.draft;
    activeScenarioId.value = deleted.scenario.id;
  }
  pendingScenarioDeletion.value = null;
}

/** Applying a complete candidate in one batch prevents intermediate household calculations. */
function applyLiveInputs(inputs: CalculatorInputs): void {
  batch(() => {
    selectedTaxYear.value = parseVerifiedTaxYear(inputs.taxYear ?? DEFAULT_TAX_YEAR);
    personalPayroll.value = parsePersonalPayrollOptions(inputs.personalPayroll ?? {});
    partnerPersonalPayroll.value = parsePersonalPayrollOptions(inputs.partnerPersonalPayroll ?? {});
    personalTaxFactor.value = inputs.taxFactor === undefined ? undefined : toTaxFactor(inputs.taxFactor);
    inputMode.value =
      inputs.inputMode ?? DEFAULT_CALCULATOR_INPUTS.inputMode;
    grossIncome.value =
      inputs.grossIncome ?? DEFAULT_CALCULATOR_INPUTS.grossIncome;
    taxBracket.value =
      inputs.taxBracket ?? DEFAULT_CALCULATOR_INPUTS.taxBracket;
    hasChurchTax.value =
      inputs.hasChurchTax ?? DEFAULT_CALCULATOR_INPUTS.hasChurchTax;
    state.value = inputs.state ?? DEFAULT_CALCULATOR_INPUTS.state;
    children.value =
      inputs.children ?? DEFAULT_CALCULATOR_INPUTS.children;
    workingMonths.value =
      inputs.workingMonths ?? DEFAULT_CALCULATOR_INPUTS.workingMonths;
    salariesPerYear.value =
      inputs.salariesPerYear ??
      DEFAULT_CALCULATOR_INPUTS.salariesPerYear;
    hasPartner.value =
      inputs.hasPartner ?? DEFAULT_CALCULATOR_INPUTS.hasPartner;
    partnerGrossIncome.value =
      inputs.partnerGrossIncome ??
      DEFAULT_CALCULATOR_INPUTS.partnerGrossIncome;
    partnerTaxBracket.value =
      inputs.partnerTaxBracket ??
      DEFAULT_CALCULATOR_INPUTS.partnerTaxBracket;
    partnerHasChurchTax.value =
      inputs.partnerHasChurchTax ??
      DEFAULT_CALCULATOR_INPUTS.partnerHasChurchTax;
    partnerState.value =
      inputs.partnerState ?? DEFAULT_CALCULATOR_INPUTS.partnerState;
    partnerWorkingMonths.value =
      inputs.partnerWorkingMonths ??
      DEFAULT_CALCULATOR_INPUTS.partnerWorkingMonths;
    partnerSalariesPerYear.value =
      inputs.partnerSalariesPerYear ??
      DEFAULT_CALCULATOR_INPUTS.partnerSalariesPerYear;
  });
}

export function loadScenario(id: string): void {
  const scenario = savedScenarios.value.find((item) => item.id === id);
  if (scenario?.inputs) {
    applyLiveInputs(scenario.inputs);
  }
}

export function importCalculatorScenario(value: unknown): void {
  const inputs = parseCalculatorScenario(value);
  calculateScenarioData(inputs);
  applyLiveInputs(inputs);
}

const inputTaxClasses: Readonly<Record<string, TaxClass>> = {
  "1": Classes.I,
  "2": Classes.II,
  "3": Classes.III,
  "4": Classes.IV,
  "5": Classes.V,
  "6": Classes.VI,
};

export const CALCULATOR_PARTNER_SHORTCUT = Object.freeze({
  classes: Object.freeze([Classes.III, Classes.IV, Classes.V]),
  source: "https://www.gesetze-im-internet.de/estg/__38b.html",
});

/** A class selection opens partner inputs; explicit partner switches and saved data stay authoritative. */
function withCalculatorInputChange<K extends keyof CalculatorInputs>(
  inputs: CalculatorInputs,
  field: K,
  value: CalculatorInputs[K],
): CalculatorInputs {
  const candidate = { ...inputs,
    [field]: value };
  if (field === "taxBracket" && CALCULATOR_PARTNER_SHORTCUT.classes.some((taxClass) => taxClass === inputTaxClasses[candidate.taxBracket])) {
    return { ...candidate,
      hasPartner: true };
  }
  return candidate;
}

/** Validate before publishing the class and partner switch together. */
export function setLiveTaxBracket(value: string): void {
  const candidate = withCalculatorInputChange(getCurrentInputs(), "taxBracket", value);
  calculateScenarioData(candidate);
  batch(() => {
    taxBracket.value = candidate.taxBracket;
    hasPartner.value = candidate.hasPartner;
  });
}

/** UI primitives are parsed here; all financial calculations use the shared nominal engine. */
export function calculateScenarioData(inputs: CalculatorInputs): HouseholdScenarioData {
  const rules = createTaxRules(parseVerifiedTaxYear(inputs.taxYear ?? DEFAULT_TAX_YEAR));
  const annualPayrolls: ReturnType<typeof computeEmploymentPayroll>[] = [];
  const calculatePerson = (
    gross: number,
    bracket: string,
    paysChurchTax: boolean,
    bundesland: string,
    months: number,
    salaries: number,
    personal: PayrollOptions,
  ): PersonDeductions => {
    const taxClass = inputTaxClasses[bracket];
    if (!taxClass) {
      throw new TypeError("Select a valid tax class.");
    }
    const options = parsePersonalPayrollOptions(personal);
    const result = computeEmploymentPayroll(
      { gross: toGrossSalary(gross),
        period: inputs.inputMode === "monthly" ? SalaryPeriod.Monthly : SalaryPeriod.Yearly,
        monthsWorked: toMonthDuration(months),
        annualSalaryPayments: toSalaryPaymentCount(salaries) },
      taxClass,
      toChildrenCount(inputs.children),
      rules,
      { ...options,
        saxony: bundesland === "Sachsen",
        churchTaxRate: toPercentageRate(paysChurchTax
          ? (bundesland === "Bayern" || bundesland === "Baden-Württemberg"
            ? rules.parameters.churchRateBavariaBadenWuerttemberg.value : rules.parameters.churchRateOther.value) : 0) },
      taxClass === Classes.IV && inputs.taxFactor !== undefined ? toTaxFactor(inputs.taxFactor) : undefined,
    );
    annualPayrolls.push(result);
    return { grossYearly: result.annualGross,
      healthCare: result.healthCare,
      pension: result.pension,
      unemployment: result.unemployment,
      care: result.care,
      tax: result.tax,
      churchTax: result.churchTax,
      solidarity: result.solidarity,
      totalSocialSecurity: result.totalSocialSecurity,
      totalDeductions: result.totalDeductions,
      netIncome: result.netIncome,
      monthsWorked: months,
      salariesReceived: result.paymentEquivalents,
      assumptions: result.assumptions };
  };
  const person1 = calculatePerson(
    inputs.grossIncome,
    inputs.taxBracket,
    inputs.hasChurchTax,
    inputs.state,
    inputs.workingMonths,
    inputs.salariesPerYear,
    inputs.personalPayroll ?? {},
  );
  const partner = inputs.hasPartner ? calculatePerson(
    inputs.partnerGrossIncome,
    inputs.partnerTaxBracket,
    inputs.partnerHasChurchTax,
    inputs.partnerState,
    inputs.partnerWorkingMonths,
    inputs.partnerSalariesPerYear,
    inputs.partnerPersonalPayroll ?? {},
  ) : null;

  const householdGross =
    person1.grossYearly + (partner ? partner.grossYearly : 0);
  const householdNet = person1.netIncome + (partner ? partner.netIncome : 0);
  const householdTotalDeductions =
    person1.totalDeductions + (partner ? partner.totalDeductions : 0);

  return {
    annualTaxableIncome: computePayrollTaxBase(partner ? [annualPayrolls[0], annualPayrolls[1]] : [annualPayrolls[0]], rules),
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
      data: calculateScenarioData(scenario.inputs),
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
    const newInputs = withCalculatorInputChange(scenarioDraft.value.inputs, field, value);
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
