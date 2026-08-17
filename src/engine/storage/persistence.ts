/**
 * German Elterngeld & Parental Leave 5-Year Simulator - State Persistence Engine
 *
 * Provides type-safe serialization, deserialization, schema validation,
 * and robust localStorage persistence for all user sandbox inputs,
 * timeline parameters, custom actions, and UI view preferences.
 * Enforces nominal branded types, const object enums, and runtime validation
 * per repository rules and domain modeling guidelines.
 */

import {
  SalaryInputMode,
  SalaryPeriod,
  ActiveScenarioView,
  TimelineChartMode,
  TimelineTimeRangeFilter,
  TaxClass,
  TargetPerson,
  FinancialEventCategory,
  toSalaryInputMode,
  toSalaryPeriod,
  toActiveScenarioView,
  toTimelineChartMode,
  toTimelineTimeRangeFilter,
  toTaxClass,
  toTargetPerson,
  toFinancialEventCategory,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  toHoursChangeId,
  toFinancialEventId,
  toEuroAmount,
  toGrossSalary,
  toNetSalary,
  toWorkingHours,
  toSimulationMonth,
  toCalendarMonth,
  type GrossSalary,
  type NetSalary,
  type WorkingHours,
  type EuroAmount,
  type SimulationMonth,
  type CalendarMonth,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction,
  type WorkingHoursChangeAction,
  type FinancialEventAction,
} from "#engine/types";

export const ELTERNGELD_STORAGE_KEY = "elterngeld_simulator_state_v1";

/**
 * Strongly-typed persisted state interface with nominal branded types and const enums.
 */
export interface ElterngeldPersistedState {
  // Input Modes & Salaries
  readonly salaryInputMode: SalaryInputMode;
  readonly salaryPeriod: SalaryPeriod;
  readonly husbandGross: GrossSalary;
  readonly wifeGross: GrossSalary;
  readonly husbandHours: WorkingHours;
  readonly wifeInitialHours: WorkingHours;
  readonly wifePostBirthHours: WorkingHours;
  readonly husbandClass3Net: NetSalary;
  readonly husbandClass5Net: NetSalary;
  readonly wifeClass5FullTimeNet: NetSalary;
  readonly wifeClass3FullTimeNet: NetSalary;
  readonly husbandInitialTaxClass?: TaxClass;
  readonly wifeInitialTaxClass?: TaxClass;
  readonly useInitialTaxFactor?: boolean;

  // Additional Inflows
  readonly annualBonusGross: GrossSalary;
  readonly annualBonusMonth: CalendarMonth;
  readonly investmentReturnMonthly: EuroAmount;

  // Benefits & Calendar Timelines
  readonly kindergeldPerChild: EuroAmount;
  readonly enable13thSalary: boolean;
  readonly bonus40Month: CalendarMonth;
  readonly bonus60Month: CalendarMonth;
  readonly taxReturnMonth: CalendarMonth;
  readonly showSpecialEventRows: boolean;
  readonly enableSalaryRaises: boolean;
  readonly annualSalaryRaisePercent: number;

  // Simulation Duration & Milestones
  readonly startCalendarYear: number;
  readonly startCalendarMonth: CalendarMonth;
  readonly simulationDurationMonths: number;
  readonly prePregnancyPlanningMonths: number;
  readonly child1BirthMonth: SimulationMonth;
  readonly birthSpacingMonths: number;
  readonly swapLeadMonths: number;
  readonly preMutterschutzMonths: number;
  readonly postMutterschutzMonths: number;

  // Dynamic Batch Action Collections
  readonly customPregnancies: readonly PregnancyAction[];
  readonly customTaxClassSwitches: readonly TaxClassSwitchAction[];
  readonly customSalaryRaises: readonly SalaryRaiseAction[];
  readonly customWorkingHoursChanges?: readonly WorkingHoursChangeAction[];
  readonly customFinancialEvents: readonly FinancialEventAction[];

  // UI View Preferences
  readonly activeScenario: ActiveScenarioView;
  readonly chartMode: TimelineChartMode;
  readonly timeRangeFilter: TimelineTimeRangeFilter;
}

/**
 * Returns the statutory default persisted state with branded domain types and const enum members.
 */
export function getDefaultPersistedState(): ElterngeldPersistedState {
  return {
    salaryInputMode: SalaryInputMode.Gross,
    salaryPeriod: SalaryPeriod.Monthly,
    husbandGross: toGrossSalary(4500),
    wifeGross: toGrossSalary(3000),
    husbandHours: toWorkingHours(32),
    wifeInitialHours: toWorkingHours(40),
    wifePostBirthHours: toWorkingHours(24),
    husbandClass3Net: toNetSalary(3184),
    husbandClass5Net: toNetSalary(2398),
    wifeClass5FullTimeNet: toNetSalary(1975),
    wifeClass3FullTimeNet: toNetSalary(2603),
    husbandInitialTaxClass: TaxClass.III,
    wifeInitialTaxClass: TaxClass.V,
    useInitialTaxFactor: false,

    annualBonusGross: toGrossSalary(0),
    annualBonusMonth: toCalendarMonth(12),
    investmentReturnMonthly: toEuroAmount(0),

    kindergeldPerChild: toEuroAmount(259),
    enable13thSalary: true,
    bonus40Month: toCalendarMonth(5),
    bonus60Month: toCalendarMonth(11),
    taxReturnMonth: toCalendarMonth(3),
    showSpecialEventRows: true,
    enableSalaryRaises: false,
    annualSalaryRaisePercent: 0,

    startCalendarYear: 2026,
    startCalendarMonth: toCalendarMonth(1),
    simulationDurationMonths: 60,
    prePregnancyPlanningMonths: 8,
    child1BirthMonth: toSimulationMonth(17),
    birthSpacingMonths: 27,
    swapLeadMonths: 7,
    preMutterschutzMonths: 1.5,
    postMutterschutzMonths: 2,

    customPregnancies: [
      {
        pregnancyId: toPregnancyId("PREG-CHILD-1"),
        childIndex: 1,
        positiveTestCalendarMonth: toCalendarMonth(9),
        positiveTestCalendarYear: 2026,
        positiveTestSimulationMonth: toSimulationMonth(9),
        calculatedDeliverySimulationMonth: toSimulationMonth(17),
        motherPostBirthPartTimeHours: toWorkingHours(24),
        motherPostBirthPartTimeClass5Net: toNetSalary(1328),
        motherPostBirthPartTimeClass3Net: toNetSalary(1648),
        fatherPartnerMonthsCount: 4,
      },
      {
        pregnancyId: toPregnancyId("PREG-CHILD-2"),
        childIndex: 2,
        positiveTestCalendarMonth: toCalendarMonth(12),
        positiveTestCalendarYear: 2028,
        positiveTestSimulationMonth: toSimulationMonth(36),
        calculatedDeliverySimulationMonth: toSimulationMonth(44),
        motherPostBirthPartTimeHours: toWorkingHours(24),
        motherPostBirthPartTimeClass5Net: toNetSalary(1328),
        motherPostBirthPartTimeClass3Net: toNetSalary(1648),
        fatherPartnerMonthsCount: 4,
      },
    ],

    customTaxClassSwitches: [
      {
        switchId: toSwitchId("SWAP-CHILD-1"),
        effectiveSimulationMonth: toSimulationMonth(9),
        effectiveCalendarMonth: toCalendarMonth(9),
        effectiveCalendarYear: 2026,
        targetHusbandTaxClass: TaxClass.V,
        targetWifeTaxClass: TaxClass.III,
        statutoryReason:
          "Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)",
        revertSimulationMonth: toSimulationMonth(17),
      },
      {
        switchId: toSwitchId("SWAP-CHILD-2"),
        effectiveSimulationMonth: toSimulationMonth(36),
        effectiveCalendarMonth: toCalendarMonth(12),
        effectiveCalendarYear: 2028,
        targetHusbandTaxClass: TaxClass.V,
        targetWifeTaxClass: TaxClass.III,
        statutoryReason:
          "Optimize Child 2 Part-Time Elterngeld baseline (§ 2b BEEG)",
        revertSimulationMonth: toSimulationMonth(44),
      },
    ],

    customSalaryRaises: [],

    customWorkingHoursChanges: [
      {
        changeId: toHoursChangeId("HOURS-WIFE-RETURN"),
        effectiveSimulationMonth: toSimulationMonth(19),
        effectiveCalendarMonth: toCalendarMonth(7),
        effectiveCalendarYear: 2027,
        targetPerson: TargetPerson.Wife,
        weeklyHours: toWorkingHours(24),
        reason:
          "Post-birth Part-time return (Partnerschaftsbonus § 4b BEEG eligible)",
      },
      {
        changeId: toHoursChangeId("HOURS-HUSBAND-BONUS"),
        effectiveSimulationMonth: toSimulationMonth(31),
        effectiveCalendarMonth: toCalendarMonth(7),
        effectiveCalendarYear: 2028,
        targetPerson: TargetPerson.Husband,
        weeklyHours: toWorkingHours(32),
        reason:
          "Parental leave reduction (24-32h Partnerschaftsbonus § 4b BEEG)",
      },
    ],

    customFinancialEvents: [
      {
        eventId: toFinancialEventId("FIN-CHILD1-EQUIPMENT"),
        effectiveSimulationMonth: toSimulationMonth(17),
        effectiveCalendarMonth: toCalendarMonth(5),
        effectiveCalendarYear: 2027,
        title: "Child #1 Initial Equipment (*Erstausstattung*)",
        amount: toEuroAmount(-1500),
        category: FinancialEventCategory.BabyEquipment,
        description:
          "Crib, stroller, car seat, changing table, and initial newborn essentials",
      },
      {
        eventId: toFinancialEventId("FIN-CHILD1-KITA-DEPOSIT"),
        effectiveSimulationMonth: toSimulationMonth(26),
        effectiveCalendarMonth: toCalendarMonth(2),
        effectiveCalendarYear: 2028,
        title: "Kita Childcare Enrollment & Equipment (*Kita-Start*)",
        amount: toEuroAmount(-600),
        category: FinancialEventCategory.ChildcareFees,
        description:
          "One-off daycare entrance fee, activity deposit, and outdoor gear",
      },
    ],

    activeScenario: ActiveScenarioView.C,
    chartMode: TimelineChartMode.StackedBar,
    timeRangeFilter: TimelineTimeRangeFilter.All,
  };
}

/**
 * Validates and sanitizes a raw object loaded from JSON storage into a complete ElterngeldPersistedState.
 * If any fields are invalid, missing, or corrupted, it gracefully substitutes the statutory default.
 */
export function validateAndSanitizePersistedState(
  raw: unknown,
): ElterngeldPersistedState {
  const defaults = getDefaultPersistedState();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const obj = raw as Record<string, unknown>;

  // Validate salaryInputMode const enum
  let salaryInputModeVal: SalaryInputMode = defaults.salaryInputMode;
  if (typeof obj.salaryInputMode === "string") {
    try {
      salaryInputModeVal = toSalaryInputMode(obj.salaryInputMode);
    } catch {
      salaryInputModeVal = defaults.salaryInputMode;
    }
  }

  // Validate salaryPeriod const enum
  let salaryPeriodVal: SalaryPeriod = defaults.salaryPeriod;
  if (typeof obj.salaryPeriod === "string") {
    try {
      salaryPeriodVal = toSalaryPeriod(obj.salaryPeriod);
    } catch {
      salaryPeriodVal = defaults.salaryPeriod;
    }
  }

  // Validate activeScenario const enum
  let activeScenarioVal: ActiveScenarioView = defaults.activeScenario;
  if (typeof obj.activeScenario === "string") {
    try {
      activeScenarioVal = toActiveScenarioView(obj.activeScenario);
    } catch {
      activeScenarioVal = defaults.activeScenario;
    }
  }

  // Validate chartMode const enum
  let chartModeVal: TimelineChartMode = defaults.chartMode;
  if (typeof obj.chartMode === "string") {
    try {
      chartModeVal = toTimelineChartMode(obj.chartMode);
    } catch {
      chartModeVal = defaults.chartMode;
    }
  }

  // Validate timeRangeFilter const enum
  let timeRangeFilterVal: TimelineTimeRangeFilter = defaults.timeRangeFilter;
  if (typeof obj.timeRangeFilter === "string") {
    try {
      timeRangeFilterVal = toTimelineTimeRangeFilter(obj.timeRangeFilter);
    } catch {
      timeRangeFilterVal = defaults.timeRangeFilter;
    }
  }

  const num = (v: unknown, def: number, min?: number, max?: number): number => {
    if (typeof v !== "number" || isNaN(v)) return def;
    if (min !== undefined && v < min) return min;
    if (max !== undefined && v > max) return max;
    return v;
  };

  const bool = (v: unknown, def: boolean): boolean => {
    return typeof v === "boolean" ? v : def;
  };

  const str = (v: unknown, def: string): string => {
    return typeof v === "string" && v.trim() ? v : def;
  };

  // Validate Batch 1: Pregnancies Action Collection
  const pregnancies: readonly PregnancyAction[] = Array.isArray(
    obj.customPregnancies,
  )
    ? obj.customPregnancies.map((p, idx) => {
        const pObj = (p && typeof p === "object" ? p : {}) as Record<
          string,
          unknown
        >;
        return {
          pregnancyId: toPregnancyId(
            typeof pObj.pregnancyId === "string"
              ? pObj.pregnancyId
              : `PREG-CHILD-${idx + 1}`,
          ),
          childIndex: num(pObj.childIndex, idx + 1, 1, 10),
          positiveTestCalendarMonth: toCalendarMonth(
            num(pObj.positiveTestCalendarMonth, 9, 1, 12),
          ),
          positiveTestCalendarYear: num(
            pObj.positiveTestCalendarYear,
            2026,
            2020,
            2050,
          ),
          positiveTestSimulationMonth: toSimulationMonth(
            num(pObj.positiveTestSimulationMonth, 9, 1, 120),
          ),
          calculatedDeliverySimulationMonth: toSimulationMonth(
            num(pObj.calculatedDeliverySimulationMonth, 17, 1, 120),
          ),
          motherPostBirthPartTimeHours: toWorkingHours(
            num(pObj.motherPostBirthPartTimeHours, 24, 0, 60),
          ),
          motherPostBirthPartTimeClass5Net: toNetSalary(
            num(pObj.motherPostBirthPartTimeClass5Net, 1328, 0, 100000),
          ),
          motherPostBirthPartTimeClass3Net: toNetSalary(
            num(pObj.motherPostBirthPartTimeClass3Net, 1648, 0, 100000),
          ),
          fatherPartnerMonthsCount: num(
            pObj.fatherPartnerMonthsCount,
            4,
            0,
            14,
          ),
        };
      })
    : defaults.customPregnancies;

  // Validate Batch 2: Tax Class Switches Action Collection
  const taxSwitches: readonly TaxClassSwitchAction[] = Array.isArray(
    obj.customTaxClassSwitches,
  )
    ? obj.customTaxClassSwitches.map((s, idx) => {
        const sObj = (s && typeof s === "object" ? s : {}) as Record<
          string,
          unknown
        >;
        let targetH: TaxClass = TaxClass.V;
        if (typeof sObj.targetHusbandTaxClass === "string") {
          try {
            targetH = toTaxClass(sObj.targetHusbandTaxClass);
          } catch {
            targetH = TaxClass.V;
          }
        }
        let targetW: TaxClass = TaxClass.III;
        if (typeof sObj.targetWifeTaxClass === "string") {
          try {
            targetW = toTaxClass(sObj.targetWifeTaxClass);
          } catch {
            targetW = TaxClass.III;
          }
        }
        let revH: TaxClass | undefined = undefined;
        if (typeof sObj.revertHusbandTaxClass === "string") {
          try {
            revH = toTaxClass(sObj.revertHusbandTaxClass);
          } catch {
            revH = undefined;
          }
        }
        let revW: TaxClass | undefined = undefined;
        if (typeof sObj.revertWifeTaxClass === "string") {
          try {
            revW = toTaxClass(sObj.revertWifeTaxClass);
          } catch {
            revW = undefined;
          }
        }
        return {
          switchId: toSwitchId(
            typeof sObj.switchId === "string"
              ? sObj.switchId
              : `SWAP-CHILD-${idx + 1}`,
          ),
          effectiveSimulationMonth: toSimulationMonth(
            num(sObj.effectiveSimulationMonth, 9, 1, 120),
          ),
          effectiveCalendarMonth: toCalendarMonth(
            num(sObj.effectiveCalendarMonth, 9, 1, 12),
          ),
          effectiveCalendarYear: num(
            sObj.effectiveCalendarYear,
            2026,
            2020,
            2050,
          ),
          targetHusbandTaxClass: targetH,
          targetWifeTaxClass: targetW,
          targetUseTaxFactor:
            typeof sObj.targetUseTaxFactor === "boolean"
              ? sObj.targetUseTaxFactor
              : undefined,
          targetTaxFactor:
            typeof sObj.targetTaxFactor === "number" &&
            sObj.targetTaxFactor > 0 &&
            sObj.targetTaxFactor <= 1
              ? Math.round(sObj.targetTaxFactor * 1000) / 1000
              : undefined,
          revertHusbandTaxClass: revH,
          revertWifeTaxClass: revW,
          revertUseTaxFactor:
            typeof sObj.revertUseTaxFactor === "boolean"
              ? sObj.revertUseTaxFactor
              : undefined,
          statutoryReason: str(
            sObj.statutoryReason,
            "Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)",
          ),
          revertSimulationMonth:
            sObj.revertSimulationMonth !== undefined
              ? toSimulationMonth(num(sObj.revertSimulationMonth, 17, 1, 120))
              : undefined,
        };
      })
    : defaults.customTaxClassSwitches;

  // Validate Batch 3: Salary Raises Action Collection
  const salaryRaises: readonly SalaryRaiseAction[] = Array.isArray(
    obj.customSalaryRaises,
  )
    ? obj.customSalaryRaises.map((r, idx) => {
        const rObj = (r && typeof r === "object" ? r : {}) as Record<
          string,
          unknown
        >;
        let tp: TargetPerson = TargetPerson.Both;
        if (typeof rObj.targetPerson === "string") {
          try {
            tp = toTargetPerson(rObj.targetPerson);
          } catch {
            tp = TargetPerson.Both;
          }
        }
        return {
          raiseId: toRaiseId(
            typeof rObj.raiseId === "string"
              ? rObj.raiseId
              : `RAISE-Y${idx + 2}`,
          ),
          effectiveSimulationMonth: toSimulationMonth(
            num(rObj.effectiveSimulationMonth, 13, 1, 120),
          ),
          effectiveCalendarMonth: toCalendarMonth(
            num(rObj.effectiveCalendarMonth, 1, 1, 12),
          ),
          effectiveCalendarYear: num(
            rObj.effectiveCalendarYear,
            2027,
            2020,
            2050,
          ),
          targetPerson: tp,
          percentageIncrease: num(rObj.percentageIncrease, 0.02, 0, 1),
          reason: str(rObj.reason, "Annual Merit / Tariff Raise"),
        };
      })
    : defaults.customSalaryRaises;

  // Validate Batch 3: Working Hours Changes Action Collection
  const workingHoursChanges: readonly WorkingHoursChangeAction[] =
    Array.isArray(obj.customWorkingHoursChanges)
      ? obj.customWorkingHoursChanges.map((h, idx) => {
          const hObj = (h && typeof h === "object" ? h : {}) as Record<
            string,
            unknown
          >;
          let tp: TargetPerson = TargetPerson.Wife;
          if (typeof hObj.targetPerson === "string") {
            try {
              tp = toTargetPerson(hObj.targetPerson);
            } catch {
              tp = TargetPerson.Wife;
            }
          }
          return {
            changeId: toHoursChangeId(
              typeof hObj.changeId === "string" && hObj.changeId.length > 0
                ? hObj.changeId
                : `HOURS-CHANGE-${idx + 1}`,
            ),
            effectiveSimulationMonth: toSimulationMonth(
              num(hObj.effectiveSimulationMonth, 19, 1, 120),
            ),
            effectiveCalendarMonth: toCalendarMonth(
              num(hObj.effectiveCalendarMonth, 7, 1, 12),
            ),
            effectiveCalendarYear: num(
              hObj.effectiveCalendarYear,
              2027,
              2020,
              2050,
            ),
            targetPerson: tp,
            weeklyHours: toWorkingHours(num(hObj.weeklyHours, 24, 0, 60)),
            reason: str(hObj.reason, "Schedule adjustment"),
          };
        })
      : defaults.customWorkingHoursChanges || [];

  // Validate Batch 4: Financial Events Action Collection
  const financialEvents: readonly FinancialEventAction[] = Array.isArray(
    obj.customFinancialEvents,
  )
    ? obj.customFinancialEvents.map((e, idx) => {
        const eObj = (e && typeof e === "object" ? e : {}) as Record<
          string,
          unknown
        >;
        let cat: FinancialEventCategory = FinancialEventCategory.CustomSpecial;
        if (typeof eObj.category === "string") {
          try {
            cat = toFinancialEventCategory(eObj.category);
          } catch {
            cat = FinancialEventCategory.CustomSpecial;
          }
        }
        return {
          eventId: toFinancialEventId(
            typeof eObj.eventId === "string"
              ? eObj.eventId
              : `FIN-EVENT-${idx + 1}`,
          ),
          effectiveSimulationMonth: toSimulationMonth(
            num(eObj.effectiveSimulationMonth, 17, 1, 120),
          ),
          effectiveCalendarMonth: toCalendarMonth(
            num(eObj.effectiveCalendarMonth, 5, 1, 12),
          ),
          effectiveCalendarYear: num(
            eObj.effectiveCalendarYear,
            2027,
            2020,
            2050,
          ),
          title: str(eObj.title, `Custom Event #${idx + 1}`),
          amount: toEuroAmount(num(eObj.amount, 0)),
          category: cat,
          description: str(eObj.description, ""),
        };
      })
    : defaults.customFinancialEvents;

  return {
    salaryInputMode: salaryInputModeVal,
    salaryPeriod: salaryPeriodVal,
    husbandGross: toGrossSalary(
      num(obj.husbandGross, defaults.husbandGross, 0, 1000000),
    ),
    wifeGross: toGrossSalary(
      num(obj.wifeGross, defaults.wifeGross, 0, 1000000),
    ),
    husbandHours: toWorkingHours(
      num(obj.husbandHours, defaults.husbandHours, 0, 60),
    ),
    wifeInitialHours: toWorkingHours(
      num(obj.wifeInitialHours, defaults.wifeInitialHours, 0, 60),
    ),
    wifePostBirthHours: toWorkingHours(
      num(obj.wifePostBirthHours, defaults.wifePostBirthHours, 0, 60),
    ),
    husbandClass3Net: toNetSalary(
      num(obj.husbandClass3Net, defaults.husbandClass3Net, 0, 100000),
    ),
    husbandClass5Net: toNetSalary(
      num(obj.husbandClass5Net, defaults.husbandClass5Net, 0, 100000),
    ),
    wifeClass5FullTimeNet: toNetSalary(
      num(obj.wifeClass5FullTimeNet, defaults.wifeClass5FullTimeNet, 0, 100000),
    ),
    wifeClass3FullTimeNet: toNetSalary(
      num(obj.wifeClass3FullTimeNet, defaults.wifeClass3FullTimeNet, 0, 100000),
    ),
    husbandInitialTaxClass:
      typeof obj.husbandInitialTaxClass === "string"
        ? (() => {
            try {
              return toTaxClass(obj.husbandInitialTaxClass);
            } catch {
              return defaults.husbandInitialTaxClass;
            }
          })()
        : defaults.husbandInitialTaxClass,
    wifeInitialTaxClass:
      typeof obj.wifeInitialTaxClass === "string"
        ? (() => {
            try {
              return toTaxClass(obj.wifeInitialTaxClass);
            } catch {
              return defaults.wifeInitialTaxClass;
            }
          })()
        : defaults.wifeInitialTaxClass,
    useInitialTaxFactor: bool(
      obj.useInitialTaxFactor,
      defaults.useInitialTaxFactor ?? false,
    ),

    annualBonusGross: toGrossSalary(
      num(obj.annualBonusGross, defaults.annualBonusGross, 0, 1000000),
    ),
    annualBonusMonth: toCalendarMonth(
      num(obj.annualBonusMonth, defaults.annualBonusMonth, 1, 12),
    ),
    investmentReturnMonthly: toEuroAmount(
      num(
        obj.investmentReturnMonthly,
        defaults.investmentReturnMonthly,
        0,
        1000000,
      ),
    ),

    kindergeldPerChild: toEuroAmount(
      num(obj.kindergeldPerChild, defaults.kindergeldPerChild, 0, 10000),
    ),
    enable13thSalary: bool(obj.enable13thSalary, defaults.enable13thSalary),
    bonus40Month: toCalendarMonth(
      num(obj.bonus40Month, defaults.bonus40Month, 1, 12),
    ),
    bonus60Month: toCalendarMonth(
      num(obj.bonus60Month, defaults.bonus60Month, 1, 12),
    ),
    taxReturnMonth: toCalendarMonth(
      num(obj.taxReturnMonth, defaults.taxReturnMonth, 1, 12),
    ),
    showSpecialEventRows: bool(
      obj.showSpecialEventRows,
      defaults.showSpecialEventRows,
    ),
    enableSalaryRaises: bool(
      obj.enableSalaryRaises,
      defaults.enableSalaryRaises,
    ),
    annualSalaryRaisePercent: num(
      obj.annualSalaryRaisePercent,
      defaults.annualSalaryRaisePercent,
      0,
      100,
    ),

    startCalendarYear: num(
      obj.startCalendarYear,
      defaults.startCalendarYear,
      2020,
      2050,
    ),
    startCalendarMonth: toCalendarMonth(
      num(obj.startCalendarMonth, defaults.startCalendarMonth, 1, 12),
    ),
    simulationDurationMonths: num(
      obj.simulationDurationMonths,
      defaults.simulationDurationMonths,
      12,
      120,
    ),
    prePregnancyPlanningMonths: num(
      obj.prePregnancyPlanningMonths,
      defaults.prePregnancyPlanningMonths,
      0,
      36,
    ),
    child1BirthMonth: toSimulationMonth(
      num(obj.child1BirthMonth, defaults.child1BirthMonth, 1, 120),
    ),
    birthSpacingMonths: num(
      obj.birthSpacingMonths,
      defaults.birthSpacingMonths,
      6,
      60,
    ),
    swapLeadMonths: num(obj.swapLeadMonths, defaults.swapLeadMonths, 1, 18),
    preMutterschutzMonths: num(
      obj.preMutterschutzMonths,
      defaults.preMutterschutzMonths,
      0,
      6,
    ),
    postMutterschutzMonths: num(
      obj.postMutterschutzMonths,
      defaults.postMutterschutzMonths,
      0,
      6,
    ),

    customPregnancies: pregnancies,
    customTaxClassSwitches: taxSwitches,
    customSalaryRaises: salaryRaises,
    customWorkingHoursChanges: workingHoursChanges,
    customFinancialEvents: financialEvents,

    activeScenario: activeScenarioVal,
    chartMode: chartModeVal,
    timeRangeFilter: timeRangeFilterVal,
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
export function saveToStorage(
  state: ElterngeldPersistedState,
  key: string = ELTERNGELD_STORAGE_KEY,
): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
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
export function loadFromStorage(
  key: string = ELTERNGELD_STORAGE_KEY,
): ElterngeldPersistedState {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
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
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return false;
  }
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
