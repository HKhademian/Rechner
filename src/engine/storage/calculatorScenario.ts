import {
  DEFAULT_TAX_YEAR,
} from "#engine/tax/taxRules";
import {
  type CalculatorInputs,
  type SavedScenarioItem,
} from "#store/calculatorStore";
import {
  parseVerifiedTaxYear,
} from "#store/taxConfigStore";
import {
  parsePersonalPayrollOptions,
} from "#engine/tax/payroll";
import {
  toGrossSalary,
  toChildrenCount,
  toMonthDuration,
  toTaxFactor,
} from "#engine/types";
import {
  toSalaryPaymentCount,
} from "#engine/tax/employmentPeriod";
import states from "../../data/germanStates.json" with { type: "json" };

const DOCUMENT_FORMAT = "german-net-pay-scenario";
const DOCUMENT_VERSION = 2;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Import a calculator scenario JSON object.");
  }
  return value as Record<string, unknown>;
}

/** Parse all inputs before touching live state; never accept cached results or tariff overrides. */
export function parseCalculatorScenario(value: unknown): CalculatorInputs {
  const document = record(value);
  if (document.format !== DOCUMENT_FORMAT || (document.version !== 1 && document.version !== DOCUMENT_VERSION)) {
    throw new TypeError("Unsupported file. Choose a JSON file exported from a saved Net Pay Calculator scenario.");
  }
  const inputs = record(document.inputs);
  const numeric = (key: string): number => {
    const value = inputs[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`${key} must be a finite number.`);
    }
    return value;
  };
  const flag = (key: string): boolean => {
    if (typeof inputs[key] !== "boolean") {
      throw new TypeError(`${key} must be true or false.`);
    }
    return inputs[key];
  };
  const state = (key: string): string => {
    const value = inputs[key];
    if (typeof value !== "string" || !states.includes(value)) {
      throw new TypeError(`${key} must be a supported German state.`);
    }
    return value;
  };
  const bracket = (key: string): string => {
    const value = inputs[key];
    if (typeof value !== "string" || !/^[1-6]$/.test(value)) {
      throw new TypeError(`${key} must be a tax class from 1 to 6.`);
    }
    return value;
  };
  const months = (key: string) => {
    const value = toMonthDuration(numeric(key));
    if (value > 12) {
      throw new TypeError(`${key} cannot exceed twelve calendar months.`);
    }
    return value;
  };
  const mode = inputs.inputMode;
  if (mode !== "monthly" && mode !== "yearly") {
    throw new TypeError("Choose monthly or yearly gross input.");
  }
  const partnerMode = inputs.partnerInputMode;
  if (partnerMode !== undefined && partnerMode !== "monthly" && partnerMode !== "yearly") {
    throw new TypeError("Partner gross input basis must be monthly or yearly.");
  }
  return {
    inputMode: mode,
    partnerInputMode: partnerMode,
    grossIncome: toGrossSalary(numeric("grossIncome")),
    taxBracket: bracket("taxBracket"),
    hasChurchTax: flag("hasChurchTax"),
    state: state("state"),
    children: toChildrenCount(numeric("children")),
    workingMonths: months("workingMonths"),
    salariesPerYear: toSalaryPaymentCount(numeric("salariesPerYear")),
    hasPartner: flag("hasPartner"),
    partnerGrossIncome: toGrossSalary(numeric("partnerGrossIncome")),
    partnerTaxBracket: bracket("partnerTaxBracket"),
    partnerHasChurchTax: flag("partnerHasChurchTax"),
    partnerState: state("partnerState"),
    partnerWorkingMonths: months("partnerWorkingMonths"),
    partnerSalariesPerYear: toSalaryPaymentCount(numeric("partnerSalariesPerYear")),
    taxYear: parseVerifiedTaxYear(inputs.taxYear),
    personalPayroll: parsePersonalPayrollOptions(inputs.personalPayroll ?? {}),
    partnerPersonalPayroll: parsePersonalPayrollOptions(inputs.partnerPersonalPayroll ?? {}),
    taxFactor: inputs.taxFactor === undefined ? undefined : toTaxFactor(numeric("taxFactor")),
  };
}

/** Portable inputs only: saved values, not an unsaved draft or stale cached financial results. */
export function serializeCalculatorScenario(scenario: SavedScenarioItem): string {
  return JSON.stringify({ format: DOCUMENT_FORMAT,
    version: DOCUMENT_VERSION,
    title: scenario.title,
    description: scenario.description,
    inputs: { ...scenario.inputs,
      taxYear: scenario.inputs.taxYear ?? DEFAULT_TAX_YEAR } }, null, 2);
}
