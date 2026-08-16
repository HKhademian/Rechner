import { signal, effect, type Signal } from '@preact/signals';

function persistedSignal<T>(key: string, initialValue: T): Signal<T> {
  let initial = initialValue;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try {
        initial = JSON.parse(stored);
      } catch {
        // Fall back to default
      }
    }
  }

  const s = signal<T>(initial);

  if (typeof window !== 'undefined') {
    effect(() => {
      localStorage.setItem(key, JSON.stringify(s.value));
    });
  }

  return s;
}

// 2026 Default Values
export interface TaxConfig {
  readonly healthCap: number;
  readonly pensionCap: number;
  readonly basicAllowance: number;
  readonly childTaxReduction: number;
  readonly workExpenseAllowance: number;
  readonly healthInsuranceRateBase: number;
  readonly healthInsuranceZusatzbeitrag: number;
  readonly pensionInsuranceRate: number;
  readonly unemploymentInsuranceRate: number;
  readonly careInsuranceRateBase: number;
  readonly careInsuranceChildlessPenalty: number;
  readonly churchRateBayernBW: number;
  readonly churchRateOther: number;
}

const DEFAULT_CONFIG: TaxConfig = {
  healthCap: 69750,
  pensionCap: 101400,
  basicAllowance: 12348,
  childTaxReduction: 2000,
  workExpenseAllowance: 1230,
  healthInsuranceRateBase: 0.073,
  healthInsuranceZusatzbeitrag: 0.0085, // Average additional contribution / 2
  pensionInsuranceRate: 0.093,
  unemploymentInsuranceRate: 0.013,
  careInsuranceRateBase: 0.017,
  careInsuranceChildlessPenalty: 0.006,
  churchRateBayernBW: 0.08,
  churchRateOther: 0.09
};

export const configHealthCap = persistedSignal<number>('cfg_healthCap', DEFAULT_CONFIG.healthCap);
export const configPensionCap = persistedSignal<number>('cfg_pensionCap', DEFAULT_CONFIG.pensionCap);
export const configBasicAllowance = persistedSignal<number>('cfg_basicAllowance', DEFAULT_CONFIG.basicAllowance);
export const configChildTaxReduction = persistedSignal<number>('cfg_childTaxReduction', DEFAULT_CONFIG.childTaxReduction);
export const configWorkExpenseAllowance = persistedSignal<number>('cfg_workExpenseAllowance', DEFAULT_CONFIG.workExpenseAllowance);

export const configHealthRateBase = persistedSignal<number>('cfg_healthRateBase', DEFAULT_CONFIG.healthInsuranceRateBase);
export const configHealthRateZusatz = persistedSignal<number>('cfg_healthRateZusatz', DEFAULT_CONFIG.healthInsuranceZusatzbeitrag);
export const configPensionRate = persistedSignal<number>('cfg_pensionRate', DEFAULT_CONFIG.pensionInsuranceRate);
export const configUnemploymentRate = persistedSignal<number>('cfg_unemploymentRate', DEFAULT_CONFIG.unemploymentInsuranceRate);
export const configCareRateBase = persistedSignal<number>('cfg_careRateBase', DEFAULT_CONFIG.careInsuranceRateBase);
export const configCareChildlessPenalty = persistedSignal<number>('cfg_careChildlessPenalty', DEFAULT_CONFIG.careInsuranceChildlessPenalty);

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
  configCareChildlessPenalty.value = DEFAULT_CONFIG.careInsuranceChildlessPenalty;
}
