/**
 * German Elterngeld & Parental Leave 5-Year Simulator - State Persistence Engine
 *
 * Provides type-safe serialization, deserialization, schema validation,
 * and robust localStorage persistence for all user sandbox inputs,
 * timeline parameters, custom actions, and UI view preferences.
 */

import {
  SalaryInputMode,
  SalaryPeriod,
  ScenarioId,
  TaxClass,
  TargetPerson,
  FinancialEventCategory,
  toSalaryInputMode,
  toSalaryPeriod,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  toFinancialEventId,
  toEuroAmount,
  toGrossSalary,
  toNetSalary,
  toWorkingHours,
  toSimulationMonth,
  toCalendarMonth,
  toCalendarYear,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction,
  type FinancialEventAction
} from '#engine/types';

export const ELTERNGELD_STORAGE_KEY = 'elterngeld_simulator_state_v1';

export interface ElterngeldPersistedState {
  // Input Modes & Salaries
  readonly salaryInputMode: SalaryInputMode;
  readonly salaryPeriod: SalaryPeriod;
  readonly husbandGross: number;
  readonly wifeGross: number;
  readonly husbandHours: number;
  readonly wifeInitialHours: number;
  readonly wifePostBirthHours: number;
  readonly husbandClass3Net: number;
  readonly husbandClass5Net: number;
  readonly wifeClass5FullTimeNet: number;
  readonly wifeClass3FullTimeNet: number;

  // Additional Inflows
  readonly annualBonusGross: number;
  readonly annualBonusMonth: number;
  readonly investmentReturnMonthly: number;

  // Benefits & Calendar Timelines
  readonly kindergeldPerChild: number;
  readonly enable13thSalary: boolean;
  readonly bonus40Month: number;
  readonly bonus60Month: number;
  readonly taxReturnMonth: number;
  readonly showSpecialEventRows: boolean;
  readonly enableSalaryRaises: boolean;
  readonly annualSalaryRaisePercent: number;

  // Simulation Duration & Milestones
  readonly startCalendarYear: number;
  readonly startCalendarMonth: number;
  readonly simulationDurationMonths: number;
  readonly prePregnancyPlanningMonths: number;
  readonly child1BirthMonth: number;
  readonly birthSpacingMonths: number;
  readonly swapLeadMonths: number;
  readonly preMutterschutzMonths: number;
  readonly postMutterschutzMonths: number;

  // Dynamic Batch Action Collections
  readonly customPregnancies: readonly PregnancyAction[];
  readonly customTaxClassSwitches: readonly TaxClassSwitchAction[];
  readonly customSalaryRaises: readonly SalaryRaiseAction[];
  readonly customFinancialEvents: readonly FinancialEventAction[];

  // UI View Preferences
  readonly activeScenario: string;
  readonly chartMode: string;
  readonly timeRangeFilter: string;
}

export function getDefaultPersistedState(): ElterngeldPersistedState {
  return {
    salaryInputMode: SalaryInputMode.Gross,
    salaryPeriod: SalaryPeriod.Monthly,
    husbandGross: 4500,
    wifeGross: 3000,
    husbandHours: 32,
    wifeInitialHours: 40,
    wifePostBirthHours: 24,
    husbandClass3Net: 3184,
    husbandClass5Net: 2398,
    wifeClass5FullTimeNet: 1975,
    wifeClass3FullTimeNet: 2603,

    annualBonusGross: 0,
    annualBonusMonth: 12,
    investmentReturnMonthly: 0,

    kindergeldPerChild: 259,
    enable13thSalary: true,
    bonus40Month: 5,
    bonus60Month: 11,
    taxReturnMonth: 3,
    showSpecialEventRows: true,
    enableSalaryRaises: false,
    annualSalaryRaisePercent: 0,

    startCalendarYear: 2026,
    startCalendarMonth: 1,
    simulationDurationMonths: 60,
    prePregnancyPlanningMonths: 8,
    child1BirthMonth: 17,
    birthSpacingMonths: 27,
    swapLeadMonths: 7,
    preMutterschutzMonths: 1.5,
    postMutterschutzMonths: 2,

    customPregnancies: [
      {
        pregnancyId: toPregnancyId('PREG-CHILD-1'),
        childIndex: 1,
        positiveTestCalendarMonth: toCalendarMonth(9),
        positiveTestCalendarYear: 2026,
        positiveTestSimulationMonth: toSimulationMonth(9),
        calculatedDeliverySimulationMonth: toSimulationMonth(17),
        motherPostBirthPartTimeHours: toWorkingHours(24),
        motherPostBirthPartTimeClass5Net: toNetSalary(1328),
        motherPostBirthPartTimeClass3Net: toNetSalary(1648),
        fatherPartnerMonthsCount: 4
      },
      {
        pregnancyId: toPregnancyId('PREG-CHILD-2'),
        childIndex: 2,
        positiveTestCalendarMonth: toCalendarMonth(12),
        positiveTestCalendarYear: 2028,
        positiveTestSimulationMonth: toSimulationMonth(36),
        calculatedDeliverySimulationMonth: toSimulationMonth(44),
        motherPostBirthPartTimeHours: toWorkingHours(24),
        motherPostBirthPartTimeClass5Net: toNetSalary(1328),
        motherPostBirthPartTimeClass3Net: toNetSalary(1648),
        fatherPartnerMonthsCount: 4
      }
    ],

    customTaxClassSwitches: [
      {
        switchId: toSwitchId('SWAP-CHILD-1'),
        effectiveSimulationMonth: toSimulationMonth(9),
        effectiveCalendarMonth: toCalendarMonth(9),
        effectiveCalendarYear: 2026,
        targetHusbandTaxClass: TaxClass.V,
        targetWifeTaxClass: TaxClass.III,
        statutoryReason: 'Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)',
        revertSimulationMonth: toSimulationMonth(17)
      },
      {
        switchId: toSwitchId('SWAP-CHILD-2'),
        effectiveSimulationMonth: toSimulationMonth(36),
        effectiveCalendarMonth: toCalendarMonth(12),
        effectiveCalendarYear: 2028,
        targetHusbandTaxClass: TaxClass.V,
        targetWifeTaxClass: TaxClass.III,
        statutoryReason: 'Optimize Child 2 Part-Time Elterngeld baseline (§ 2b BEEG)',
        revertSimulationMonth: toSimulationMonth(44)
      }
    ],

    customSalaryRaises: [],

    customFinancialEvents: [
      {
        eventId: toFinancialEventId('FIN-CHILD1-EQUIPMENT'),
        effectiveSimulationMonth: toSimulationMonth(17),
        effectiveCalendarMonth: toCalendarMonth(5),
        effectiveCalendarYear: 2027,
        title: 'Child #1 Initial Equipment (*Erstausstattung*)',
        amount: toEuroAmount(-1500),
        category: FinancialEventCategory.BabyEquipment,
        description: 'Crib, stroller, car seat, changing table, and initial newborn essentials'
      },
      {
        eventId: toFinancialEventId('FIN-CHILD1-KITA-DEPOSIT'),
        effectiveSimulationMonth: toSimulationMonth(26),
        effectiveCalendarMonth: toCalendarMonth(2),
        effectiveCalendarYear: 2028,
        title: 'Kita Childcare Enrollment & Equipment (*Kita-Start*)',
        amount: toEuroAmount(-600),
        category: FinancialEventCategory.ChildcareFees,
        description: 'One-off daycare entrance fee, activity deposit, and outdoor gear'
      }
    ],

    activeScenario: ScenarioId.C,
    chartMode: 'stacked_bar',
    timeRangeFilter: 'all'
  };
}

/**
 * Validates and sanitizes a raw object loaded from JSON storage into a complete ElterngeldPersistedState.
 * If any fields are invalid or missing, it gracefully substitutes the statutory default.
 */
export function validateAndSanitizePersistedState(raw: unknown): ElterngeldPersistedState {
  const defaults = getDefaultPersistedState();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const obj = raw as Record<string, unknown>;

  // Validate salaryInputMode
  let salaryInputModeVal = defaults.salaryInputMode;
  if (typeof obj.salaryInputMode === 'string') {
    try {
      salaryInputModeVal = toSalaryInputMode(obj.salaryInputMode);
    } catch {
      salaryInputModeVal = defaults.salaryInputMode;
    }
  }

  // Validate salaryPeriod
  let salaryPeriodVal = defaults.salaryPeriod;
  if (typeof obj.salaryPeriod === 'string') {
    try {
      salaryPeriodVal = toSalaryPeriod(obj.salaryPeriod);
    } catch {
      salaryPeriodVal = defaults.salaryPeriod;
    }
  }

  const num = (v: unknown, def: number, min?: number, max?: number): number => {
    if (typeof v !== 'number' || isNaN(v)) return def;
    if (min !== undefined && v < min) return min;
    if (max !== undefined && v > max) return max;
    return v;
  };

  const bool = (v: unknown, def: boolean): boolean => {
    return typeof v === 'boolean' ? v : def;
  };

  const str = (v: unknown, def: string): string => {
    return typeof v === 'string' && v.trim() ? v : def;
  };

  // Validate Action Collections
  const pregnancies: PregnancyAction[] = Array.isArray(obj.customPregnancies)
    ? obj.customPregnancies.map((p, idx) => ({
        pregnancyId: toPregnancyId(typeof p.pregnancyId === 'string' ? p.pregnancyId : `PREG-CHILD-${idx + 1}`),
        childIndex: num(p.childIndex, idx + 1, 1, 10),
        positiveTestCalendarMonth: toCalendarMonth(num(p.positiveTestCalendarMonth, 9, 1, 12)),
        positiveTestCalendarYear: num(p.positiveTestCalendarYear, 2026, 2020, 2050),
        positiveTestSimulationMonth: toSimulationMonth(num(p.positiveTestSimulationMonth, 9, 1, 120)),
        calculatedDeliverySimulationMonth: toSimulationMonth(num(p.calculatedDeliverySimulationMonth, 17, 1, 120)),
        motherPostBirthPartTimeHours: toWorkingHours(num(p.motherPostBirthPartTimeHours, 24, 0, 60)),
        motherPostBirthPartTimeClass5Net: toNetSalary(num(p.motherPostBirthPartTimeClass5Net, 1328, 0, 100000)),
        motherPostBirthPartTimeClass3Net: toNetSalary(num(p.motherPostBirthPartTimeClass3Net, 1648, 0, 100000)),
        fatherPartnerMonthsCount: num(p.fatherPartnerMonthsCount, 4, 0, 14)
      }))
    : defaults.customPregnancies;

  const taxSwitches: TaxClassSwitchAction[] = Array.isArray(obj.customTaxClassSwitches)
    ? obj.customTaxClassSwitches.map((s, idx) => ({
        switchId: toSwitchId(typeof s.switchId === 'string' ? s.switchId : `SWAP-CHILD-${idx + 1}`),
        effectiveSimulationMonth: toSimulationMonth(num(s.effectiveSimulationMonth, 9, 1, 120)),
        effectiveCalendarMonth: toCalendarMonth(num(s.effectiveCalendarMonth, 9, 1, 12)),
        effectiveCalendarYear: num(s.effectiveCalendarYear, 2026, 2020, 2050),
        targetHusbandTaxClass: (s.targetHusbandTaxClass as TaxClass) || TaxClass.V,
        targetWifeTaxClass: (s.targetWifeTaxClass as TaxClass) || TaxClass.III,
        statutoryReason: str(s.statutoryReason, 'Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)'),
        revertSimulationMonth: s.revertSimulationMonth ? toSimulationMonth(num(s.revertSimulationMonth, 17, 1, 120)) : undefined
      }))
    : defaults.customTaxClassSwitches;

  const salaryRaises: SalaryRaiseAction[] = Array.isArray(obj.customSalaryRaises)
    ? obj.customSalaryRaises.map((r, idx) => ({
        raiseId: toRaiseId(typeof r.raiseId === 'string' ? r.raiseId : `RAISE-Y${idx + 2}`),
        effectiveSimulationMonth: toSimulationMonth(num(r.effectiveSimulationMonth, 13, 1, 120)),
        effectiveCalendarMonth: toCalendarMonth(num(r.effectiveCalendarMonth, 1, 1, 12)),
        effectiveCalendarYear: num(r.effectiveCalendarYear, 2027, 2020, 2050),
        targetPerson: (r.targetPerson as TargetPerson) || TargetPerson.Both,
        percentageIncrease: num(r.percentageIncrease, 0.02, 0, 1),
        reason: str(r.reason, 'Annual Merit / Tariff Raise')
      }))
    : defaults.customSalaryRaises;

  const financialEvents: FinancialEventAction[] = Array.isArray(obj.customFinancialEvents)
    ? obj.customFinancialEvents.map((e, idx) => ({
        eventId: toFinancialEventId(typeof e.eventId === 'string' ? e.eventId : `FIN-EVENT-${idx + 1}`),
        effectiveSimulationMonth: toSimulationMonth(num(e.effectiveSimulationMonth, 17, 1, 120)),
        effectiveCalendarMonth: toCalendarMonth(num(e.effectiveCalendarMonth, 5, 1, 12)),
        effectiveCalendarYear: num(e.effectiveCalendarYear, 2027, 2020, 2050),
        title: str(e.title, `Custom Event #${idx + 1}`),
        amount: toEuroAmount(num(e.amount, 0)),
        category: (e.category as FinancialEventCategory) || FinancialEventCategory.Custom,
        description: str(e.description, '')
      }))
    : defaults.customFinancialEvents;

  return {
    salaryInputMode: salaryInputModeVal,
    salaryPeriod: salaryPeriodVal,
    husbandGross: num(obj.husbandGross, defaults.husbandGross, 0, 1000000),
    wifeGross: num(obj.wifeGross, defaults.wifeGross, 0, 1000000),
    husbandHours: num(obj.husbandHours, defaults.husbandHours, 0, 60),
    wifeInitialHours: num(obj.wifeInitialHours, defaults.wifeInitialHours, 0, 60),
    wifePostBirthHours: num(obj.wifePostBirthHours, defaults.wifePostBirthHours, 0, 60),
    husbandClass3Net: num(obj.husbandClass3Net, defaults.husbandClass3Net, 0, 100000),
    husbandClass5Net: num(obj.husbandClass5Net, defaults.husbandClass5Net, 0, 100000),
    wifeClass5FullTimeNet: num(obj.wifeClass5FullTimeNet, defaults.wifeClass5FullTimeNet, 0, 100000),
    wifeClass3FullTimeNet: num(obj.wifeClass3FullTimeNet, defaults.wifeClass3FullTimeNet, 0, 100000),

    annualBonusGross: num(obj.annualBonusGross, defaults.annualBonusGross, 0, 1000000),
    annualBonusMonth: num(obj.annualBonusMonth, defaults.annualBonusMonth, 1, 12),
    investmentReturnMonthly: num(obj.investmentReturnMonthly, defaults.investmentReturnMonthly, 0, 1000000),

    kindergeldPerChild: num(obj.kindergeldPerChild, defaults.kindergeldPerChild, 0, 10000),
    enable13thSalary: bool(obj.enable13thSalary, defaults.enable13thSalary),
    bonus40Month: num(obj.bonus40Month, defaults.bonus40Month, 1, 12),
    bonus60Month: num(obj.bonus60Month, defaults.bonus60Month, 1, 12),
    taxReturnMonth: num(obj.taxReturnMonth, defaults.taxReturnMonth, 1, 12),
    showSpecialEventRows: bool(obj.showSpecialEventRows, defaults.showSpecialEventRows),
    enableSalaryRaises: bool(obj.enableSalaryRaises, defaults.enableSalaryRaises),
    annualSalaryRaisePercent: num(obj.annualSalaryRaisePercent, defaults.annualSalaryRaisePercent, 0, 100),

    startCalendarYear: num(obj.startCalendarYear, defaults.startCalendarYear, 2020, 2050),
    startCalendarMonth: num(obj.startCalendarMonth, defaults.startCalendarMonth, 1, 12),
    simulationDurationMonths: num(obj.simulationDurationMonths, defaults.simulationDurationMonths, 12, 120),
    prePregnancyPlanningMonths: num(obj.prePregnancyPlanningMonths, defaults.prePregnancyPlanningMonths, 0, 36),
    child1BirthMonth: num(obj.child1BirthMonth, defaults.child1BirthMonth, 1, 120),
    birthSpacingMonths: num(obj.birthSpacingMonths, defaults.birthSpacingMonths, 6, 60),
    swapLeadMonths: num(obj.swapLeadMonths, defaults.swapLeadMonths, 1, 18),
    preMutterschutzMonths: num(obj.preMutterschutzMonths, defaults.preMutterschutzMonths, 0, 6),
    postMutterschutzMonths: num(obj.postMutterschutzMonths, defaults.postMutterschutzMonths, 0, 6),

    customPregnancies: pregnancies,
    customTaxClassSwitches: taxSwitches,
    customSalaryRaises: salaryRaises,
    customFinancialEvents: financialEvents,

    activeScenario: str(obj.activeScenario, defaults.activeScenario),
    chartMode: str(obj.chartMode, defaults.chartMode),
    timeRangeFilter: str(obj.timeRangeFilter, defaults.timeRangeFilter)
  };
}

/**
 * Serializes the state to a JSON string.
 */
export function serializeState(state: ElterngeldPersistedState): string {
  return JSON.stringify(state);
}

/**
 * Deserializes and validates a JSON string into an ElterngeldPersistedState.
 */
export function deserializeState(jsonStr: string): ElterngeldPersistedState {
  try {
    const raw = JSON.parse(jsonStr);
    return validateAndSanitizePersistedState(raw);
  } catch {
    return getDefaultPersistedState();
  }
}

/**
 * Saves state directly into localStorage if in browser environment.
 */
export function saveToStorage(state: ElterngeldPersistedState, key: string = ELTERNGELD_STORAGE_KEY): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }
  try {
    const serialized = serializeState(state);
    localStorage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads state directly from localStorage if in browser environment, falling back to defaults.
 */
export function loadFromStorage(key: string = ELTERNGELD_STORAGE_KEY): ElterngeldPersistedState {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return getDefaultPersistedState();
  }
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return getDefaultPersistedState();
    }
    return deserializeState(item);
  } catch {
    return getDefaultPersistedState();
  }
}

/**
 * Clears simulator state from localStorage.
 */
export function clearStorage(key: string = ELTERNGELD_STORAGE_KEY): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
