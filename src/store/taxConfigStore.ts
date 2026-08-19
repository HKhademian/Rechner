import {
  type Signal,
  signal,
  effect,
} from "@preact/signals";

function persistedSignal<T>(key: string, initialValue: T): Signal<T> {
  let initial = initialValue;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try {
        initial = JSON.parse(stored);
      }
      catch {
        // Fall back to default
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

import defaultTaxConfigData from "../data/defaultTaxConfig.json" with { type: "json" };

/**
 * Statutory German Tax Parameters and Social Security Contribution Ceilings (2026 Defaults).
 */
export interface TaxConfig {
  /** Annual statutory health insurance assessment ceiling (BBG GKV €62.100). */
  readonly healthCap: number;
  /** Annual statutory public pension insurance assessment ceiling (BBG GRV €90.600). */
  readonly pensionCap: number;
  /** Annual basic tax-free income allowance (§ 32a Abs. 1 Nr. 1 EStG Grundfreibetrag €11.784). */
  readonly basicAllowance: number;
  /** Statutory annual child tax allowance reduction in EUR (§ 32 Abs. 6 EStG). */
  readonly childTaxReduction: number;
  /** Statutory annual employee income-related work expense allowance (§ 9a Nr. 1a EStG €1.230). */
  readonly workExpenseAllowance: number;
  /** Statutory health insurance employee baseline contribution rate (7.3%). */
  readonly healthInsuranceRateBase: number;
  /** Statutory health insurance employee average supplemental contribution rate (Zusatzbeitrag 0.85%). */
  readonly healthInsuranceZusatzbeitrag: number;
  /** Statutory public pension insurance employee contribution rate (9.30%). */
  readonly pensionInsuranceRate: number;
  /** Statutory unemployment insurance employee contribution rate (1.30%). */
  readonly unemploymentInsuranceRate: number;
  /** Statutory long-term nursing care insurance employee base rate (2.20%). */
  readonly careInsuranceRateBase: number;
  /** Statutory childless surcharge on nursing care insurance (§ 55 Abs. 3 SGB XI +0.60%). */
  readonly careInsuranceChildlessPenalty: number;
  /** Statutory church tax percentage rate in Bavaria and Baden-Württemberg (8.0%). */
  readonly churchRateBayernBW: number;
  /** Statutory church tax percentage rate in all other federal states (9.0%). */
  readonly churchRateOther: number;
}

const DEFAULT_CONFIG: TaxConfig = defaultTaxConfigData satisfies TaxConfig;

export const configHealthCap = persistedSignal<number>(
  "cfg_healthCap",
  DEFAULT_CONFIG.healthCap,
);
export const configPensionCap = persistedSignal<number>(
  "cfg_pensionCap",
  DEFAULT_CONFIG.pensionCap,
);
export const configBasicAllowance = persistedSignal<number>(
  "cfg_basicAllowance",
  DEFAULT_CONFIG.basicAllowance,
);
export const configChildTaxReduction = persistedSignal<number>(
  "cfg_childTaxReduction",
  DEFAULT_CONFIG.childTaxReduction,
);
export const configWorkExpenseAllowance = persistedSignal<number>(
  "cfg_workExpenseAllowance",
  DEFAULT_CONFIG.workExpenseAllowance,
);

export const configHealthRateBase = persistedSignal<number>(
  "cfg_healthRateBase",
  DEFAULT_CONFIG.healthInsuranceRateBase,
);
export const configHealthRateZusatz = persistedSignal<number>(
  "cfg_healthRateZusatz",
  DEFAULT_CONFIG.healthInsuranceZusatzbeitrag,
);
export const configPensionRate = persistedSignal<number>(
  "cfg_pensionRate",
  DEFAULT_CONFIG.pensionInsuranceRate,
);
export const configUnemploymentRate = persistedSignal<number>(
  "cfg_unemploymentRate",
  DEFAULT_CONFIG.unemploymentInsuranceRate,
);
export const configCareRateBase = persistedSignal<number>(
  "cfg_careRateBase",
  DEFAULT_CONFIG.careInsuranceRateBase,
);
export const configCareChildlessPenalty = persistedSignal<number>(
  "cfg_careChildlessPenalty",
  DEFAULT_CONFIG.careInsuranceChildlessPenalty,
);

/**
 * Resets all tax configuration signals to 2026 statutory baseline values.
 */
export function resetConfig(): void {
  configHealthCap.value = DEFAULT_CONFIG.healthCap;
  configPensionCap.value = DEFAULT_CONFIG.pensionCap;
  configBasicAllowance.value = DEFAULT_CONFIG.basicAllowance;
  configChildTaxReduction.value = DEFAULT_CONFIG.childTaxReduction;
  configWorkExpenseAllowance.value = DEFAULT_CONFIG.workExpenseAllowance;

  configHealthRateBase.value = DEFAULT_CONFIG.healthInsuranceRateBase;
  configHealthRateZusatz.value = DEFAULT_CONFIG.healthInsuranceZusatzbeitrag;
  configPensionRate.value = DEFAULT_CONFIG.pensionInsuranceRate;
  configUnemploymentRate.value = DEFAULT_CONFIG.unemploymentInsuranceRate;
  configCareRateBase.value = DEFAULT_CONFIG.careInsuranceRateBase;
  configCareChildlessPenalty.value =
    DEFAULT_CONFIG.careInsuranceChildlessPenalty;
}
