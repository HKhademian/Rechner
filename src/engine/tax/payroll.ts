import {
  type LohnsteuerInputs,
  type LohnsteuerOutputs,
  calculate,
} from "lohnsteuerrechner";
import {
  type Brand,
  type GrossSalary,
  type EuroAmount,
  type ChildrenCount,
  type PercentageRate,
  type TaxFactor,
  type TaxClass,
  type MonthDuration,
  TaxClass as TaxClasses,
  toEuroAmount,
  toChildrenCount,
  toPercentageRate,
} from "#engine/types";
import {
  type TaxRules,
  type AgeYears,
  DEFAULT_TAX_RULES,
  toAgeYears,
} from "#engine/tax/taxRules";

export type ChildAllowanceFactor = Brand<number, "ChildAllowanceFactor">;

export function toChildAllowanceFactor(value: number): ChildAllowanceFactor {
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(value * 10)) {
    throw new TypeError("The child allowance factor must be non-negative with at most one decimal place.");
  }
  return value as ChildAllowanceFactor;
}

export interface PayrollOptions {
  /** Insurer-specific total Zusatzbeitrag, before the employee/employer split. */
  readonly healthSupplementTotalRate?: PercentageRate;
  readonly ageAtYearStart?: AgeYears;
  readonly childrenUnder25?: ChildrenCount;
  readonly isParent?: boolean;
  readonly saxony?: boolean;
  readonly churchTaxRate?: PercentageRate;
  readonly childAllowanceFactor?: ChildAllowanceFactor;
  readonly contributionMonthsYearToDate?: MonthDuration;
  readonly priorBonusGrossYearToDate?: EuroAmount;
  readonly regularGrossYearToDate?: GrossSalary;
  readonly expectedRegularAnnualGross?: GrossSalary;
  readonly regularHealthAssessmentYearToDate?: GrossSalary;
  readonly regularPensionAssessmentYearToDate?: GrossSalary;
  readonly bonusHealthAssessmentYearToDate?: GrossSalary;
  readonly bonusPensionAssessmentYearToDate?: GrossSalary;
}

/** Validate persisted or form-supplied personal settings, never accepting internal YTD state. */
export function parsePersonalPayrollOptions(value: unknown): PayrollOptions {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Personal payroll details must be an object.");
  }
  const result: Record<string, unknown> = {};
  const numeric = {
    ageAtYearStart: toAgeYears,
    childrenUnder25: toChildrenCount,
    childAllowanceFactor: toChildAllowanceFactor,
    healthSupplementTotalRate: (rate: number) => {
      if (rate < 0 || rate > 1) {
        throw new TypeError("The insurer rate must be between zero and one.");
      }
      return toPercentageRate(rate);
    },
    churchTaxRate: (rate: number) => {
      if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
        throw new TypeError("Church tax rate must be a fraction between zero and one.");
      }
      return toPercentageRate(rate);
    },
  };
  for (const [key, raw] of Object.entries(value)) {
    if (raw === undefined) {
      continue;
    }
    if (key === "isParent" || key === "saxony") {
      if (typeof raw !== "boolean") {
        throw new TypeError("Parental status must be a boolean.");
      }
      result[key] = raw;
    }
    else {
      const entry = Object.entries(numeric).find(([name]) => name === key);
      if (!entry || typeof raw !== "number" || !Number.isFinite(raw)) {
        throw new TypeError(`Invalid personal payroll setting: ${key}.`);
      }
      result[key] = entry[1](raw);
    }
  }
  // Every field has been validated above; this boundary owns the reconstruction of nominal values.
  return result;
}

const classCodes: Record<TaxClass, number> = {
  [TaxClasses.I]: 1,
  [TaxClasses.II]: 2,
  [TaxClasses.III]: 3,
  [TaxClasses.IV]: 4,
  [TaxClasses.V]: 5,
  [TaxClasses.VI]: 6,
};

/** Map validated domain inputs to PAP codes; these numeric codes are protocol units, not tax rates. */
export function payrollInputs(
  gross: GrossSalary,
  taxClass: TaxClass,
  children: ChildrenCount,
  rules: TaxRules = DEFAULT_TAX_RULES,
  options: PayrollOptions = {},
  factor?: TaxFactor,
): LohnsteuerInputs {
  const p = rules.parameters;
  const parent = options.isParent ?? children > 0;
  const qualifyingChildren = options.childrenUnder25 ?? children;
  if (qualifyingChildren > children || (!parent && children > 0)) {
    throw new TypeError("Parental status and qualifying child counts are inconsistent.");
  }
  const age = options.ageAtYearStart;
  const childlessSurcharge = !parent && (age === undefined || age >= p.careChildlessMinimumAge.value);
  const childFactor = options.childAllowanceFactor ?? (taxClass === TaxClasses.III || taxClass === TaxClasses.IV ? children : children / 2);
  const ageRelief = age !== undefined && age >= p.ageReliefMinimumAge.value;
  return {
    LZZ: 2,
    RE4: Math.round(gross * 100),
    STKL: classCodes[taxClass],
    KRV: 0,
    ALV: 0,
    PKV: 0,
    KVZ: (options.healthSupplementTotalRate ?? p.healthSupplementTotalRate.value) * 100,
    PVZ: childlessSurcharge ? 1 : 0,
    PVA: Math.min(p.careMaximumDiscountChildren.value, Math.max(0, qualifyingChildren - 1)),
    PVS: options.saxony ? 1 : 0,
    ZKF: taxClass === TaxClasses.V || taxClass === TaxClasses.VI ? 0 : childFactor,
    R: (options.churchTaxRate ?? 0) > 0 ? 1 : 0,
    af: factor === undefined ? 0 : 1,
    f: factor ?? 1,
    ALTER1: ageRelief ? 1 : 0,
    AJAHR: ageRelief ? rules.calendarYear - age + p.ageReliefMinimumAge.value : 0,
  };
}

/** Pure offline PAP evaluation. Exact-year constants are owned by the pinned, source-traceable PAP. */
export function calculatePayrollWithholding(
  inputs: LohnsteuerInputs,
  rules: TaxRules = DEFAULT_TAX_RULES,
): LohnsteuerOutputs {
  // PAP owns the published year's tariff and insurance deduction algorithm.
  // Do not silently promise arbitrary tariff overrides that its API cannot apply.
  const supported = new Set(["healthSupplementTotalRate", "churchRateBavariaBadenWuerttemberg", "churchRateOther"]);
  const unsupported = Object.entries(rules.parameters).filter(([key, parameter]) => parameter.overridden && !supported.has(key));
  if (unsupported.length > 0) {
    throw new TypeError(`Published PAP withholding cannot apply these custom annual parameters: ${unsupported.map(([key]) => key).join(", ")}.`);
  }
  return calculate(rules.sourceYear, inputs);
}

/**
 * Recover the PAP's annual wage-tax base, not an annual assessment's actual deductible income.
 * WVFRB reports ZVE above the allowance, clamped at zero (PAP MBERECH).
 * A temporary taxable addition avoids that clamp; it does not change gross or insurance inputs.
 */
export function annualWithholdingTaxBase(
  inputs: LohnsteuerInputs,
  rules: TaxRules = DEFAULT_TAX_RULES,
  annualGross?: GrossSalary,
): EuroAmount {
  const addition = rules.parameters.basicAllowance.value * 2;
  const annualInputs = {
    ...inputs,
    LZZ: 1,
    RE4: annualGross === undefined ? (inputs.RE4 ?? 0) * 12 : Math.round(annualGross * 100),
    LZZHINZU: Math.round(addition * 100),
    SONSTB: 0,
    JRE4: 0,
  };
  const result = calculatePayrollWithholding(annualInputs, rules);
  return toEuroAmount(Math.max(0, result.WVFRB / 100 + rules.parameters.basicAllowance.value - addition));
}
