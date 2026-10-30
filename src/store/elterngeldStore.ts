import {
  type PayrollOptions,
  parsePersonalPayrollOptions,
} from "#engine/tax/payroll";
import {
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  signal,
  computed,
  effect,
} from "@preact/signals";
import {
  type ScenarioId as ScenarioIdType,
  type ActiveScenarioView,
  type TimelineChartMode,
  type TimelineTimeRangeFilter,
  type SalaryBonusSlot,
  type SalaryPeriod,
  type PregnancyId,
  type SwitchId,
  type RaiseId,
  type FinancialEventId,
  type PreexistingConditions,
  type HouseholdTaxableIncomeInput,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction,
  type WorkingHoursChangeAction,
  type FinancialEventAction,
  type SpousalGrossToNetSet,
  type GrossSalary,
  type NetSalary,
  type WorkingHours,
  type EuroAmount,
  type FullCalendarYear,
  type CalendarMonth,
  type SimulationMonth,
  type MonthDuration,
  type HoursChangeId,
  ScenarioId,
  SimulationStrategy,
  TaxClass,
  SalaryInputMode,
  AnnualSalariesCount,
  BonusDistributionPreset,
  toAnnualSalariesCount,
  toPercentageRate,
  toNetSalary,
  toGrossSalary,
  toEuroAmount,
  toWorkingHours,
  toSimulationMonth,
  toCalendarMonth,
  toFullCalendarYear,
  toChildrenCount,
} from "#engine/types";
import {
  runScenarioBatches,
  calculateSimulationStartDate,
} from "#engine/simulator/timelineGenerator";
import {
  deriveSpousalNetSalaries,
} from "#engine/tax/wageTax";
import {
  type ElterngeldPersistedState,
  getDefaultPersistedState,
  getEmptyPersistedState,
  loadFromStorage,
  saveToStorage,
  clearStorage,
} from "#engine/storage/persistence";

import {
  exportStateToJson,
  exportStateToTextReport,
  exportScenarioToCsv,
  exportStateToZip,
  triggerFileDownload,
  triggerPrintableReport,
} from "#engine/storage/exportImport";

// Initial state loaded from localStorage (or statutory defaults)
const initialPersisted = loadFromStorage();

/**
 * Generates standard calendar bonus installment slots based on annual salaries count and preset ratio.
 */
export function createBonusDistributionSlots(
  salariesCount: AnnualSalariesCount,
  preset: BonusDistributionPreset,
  customSlots?: readonly SalaryBonusSlot[],
): readonly SalaryBonusSlot[] {
  if (salariesCount === AnnualSalariesCount.Twelve) {
    return [];
  }
  if (
    preset === BonusDistributionPreset.Custom &&
    customSlots &&
    customSlots.length > 0
  ) {
    return customSlots;
  }
  if (salariesCount === AnnualSalariesCount.Thirteen) {
    switch (preset) {
      case BonusDistributionPreset.Ratio40_60:
        return [
          {
            calendarMonth: toCalendarMonth(5),
            payoutFraction: toPercentageRate(0.4),
            label: "13th Salary: 40% Vacation Bonus",
          },
          {
            calendarMonth: toCalendarMonth(11),
            payoutFraction: toPercentageRate(0.6),
            label: "13th Salary: 60% Christmas Bonus",
          },
        ];
      case BonusDistributionPreset.Ratio50_50:
        return [
          {
            calendarMonth: toCalendarMonth(6),
            payoutFraction: toPercentageRate(0.5),
            label: "13th Salary: 50% Vacation Bonus",
          },
          {
            calendarMonth: toCalendarMonth(11),
            payoutFraction: toPercentageRate(0.5),
            label: "13th Salary: 50% Christmas Bonus",
          },
        ];
      case BonusDistributionPreset.Single100Nov:
        return [
          {
            calendarMonth: toCalendarMonth(11),
            payoutFraction: toPercentageRate(1.0),
            label: "13th Salary: 100% Christmas Bonus",
          },
        ];
      case BonusDistributionPreset.Single100Dec:
        return [
          {
            calendarMonth: toCalendarMonth(12),
            payoutFraction: toPercentageRate(1.0),
            label: "13th Salary: 100% Year-End Bonus",
          },
        ];
      default:
        return [
          {
            calendarMonth: toCalendarMonth(5),
            payoutFraction: toPercentageRate(0.4),
            label: "13th Salary: 40% Vacation Bonus",
          },
          {
            calendarMonth: toCalendarMonth(11),
            payoutFraction: toPercentageRate(0.6),
            label: "13th Salary: 60% Christmas Bonus",
          },
        ];
    }
  }
  if (salariesCount === AnnualSalariesCount.Fourteen) {
    switch (preset) {
      case BonusDistributionPreset.Quarterly:
        return [
          {
            calendarMonth: toCalendarMonth(3),
            payoutFraction: toPercentageRate(0.5),
            label: "Quarterly Bonus Q1 (50%)",
          },
          {
            calendarMonth: toCalendarMonth(6),
            payoutFraction: toPercentageRate(0.5),
            label: "Quarterly Bonus Q2 (50%)",
          },
          {
            calendarMonth: toCalendarMonth(9),
            payoutFraction: toPercentageRate(0.5),
            label: "Quarterly Bonus Q3 (50%)",
          },
          {
            calendarMonth: toCalendarMonth(12),
            payoutFraction: toPercentageRate(0.5),
            label: "Quarterly Bonus Q4 (50%)",
          },
        ];
      case BonusDistributionPreset.Double100_100:
      default:
        return [
          {
            calendarMonth: toCalendarMonth(6),
            payoutFraction: toPercentageRate(1.0),
            label: "13th Salary: 100% Vacation Bonus",
          },
          {
            calendarMonth: toCalendarMonth(11),
            payoutFraction: toPercentageRate(1.0),
            label: "14th Salary: 100% Christmas Bonus",
          },
        ];
    }
  }
  if (salariesCount === AnnualSalariesCount.Fifteen) {
    switch (preset) {
      case BonusDistributionPreset.Quarterly:
        return [
          {
            calendarMonth: toCalendarMonth(3),
            payoutFraction: toPercentageRate(0.75),
            label: "Quarterly Bonus Q1 (75%)",
          },
          {
            calendarMonth: toCalendarMonth(6),
            payoutFraction: toPercentageRate(0.75),
            label: "Quarterly Bonus Q2 (75%)",
          },
          {
            calendarMonth: toCalendarMonth(9),
            payoutFraction: toPercentageRate(0.75),
            label: "Quarterly Bonus Q3 (75%)",
          },
          {
            calendarMonth: toCalendarMonth(12),
            payoutFraction: toPercentageRate(0.75),
            label: "Quarterly Bonus Q4 (75%)",
          },
        ];
      case BonusDistributionPreset.Triple100_100_100:
      default:
        return [
          {
            calendarMonth: toCalendarMonth(3),
            payoutFraction: toPercentageRate(1.0),
            label: "13th Salary: 100% Spring Bonus",
          },
          {
            calendarMonth: toCalendarMonth(6),
            payoutFraction: toPercentageRate(1.0),
            label: "14th Salary: 100% Summer Bonus",
          },
          {
            calendarMonth: toCalendarMonth(11),
            payoutFraction: toPercentageRate(1.0),
            label: "15th Salary: 100% Christmas Bonus",
          },
        ];
    }
  }
  return [];
}

/**
 * Infers the active BonusDistributionPreset from existing bonus slots.
 */
export function inferBonusPreset(
  salariesCount: AnnualSalariesCount,
  slots?: readonly SalaryBonusSlot[],
): BonusDistributionPreset {
  if (
    salariesCount === AnnualSalariesCount.Twelve ||
    !slots ||
    slots.length === 0
  ) {
    return BonusDistributionPreset.Ratio40_60;
  }
  if (salariesCount === AnnualSalariesCount.Thirteen) {
    if (slots.length === 2) {
      if (
        slots[0]?.payoutFraction === 0.4 &&
        slots[1]?.payoutFraction === 0.6
      ) {
        return BonusDistributionPreset.Ratio40_60;
      }
      if (
        slots[0]?.payoutFraction === 0.5 &&
        slots[1]?.payoutFraction === 0.5
      ) {
        return BonusDistributionPreset.Ratio50_50;
      }
    }
    else if (slots.length === 1) {
      if (slots[0]?.calendarMonth === 11) {
        return BonusDistributionPreset.Single100Nov;
      }
      if (slots[0]?.calendarMonth === 12) {
        return BonusDistributionPreset.Single100Dec;
      }
    }
    return BonusDistributionPreset.Custom;
  }
  if (salariesCount === AnnualSalariesCount.Fourteen) {
    if (
      slots.length === 2 &&
      slots[0]?.payoutFraction === 1.0 &&
      slots[1]?.payoutFraction === 1.0
    ) {
      return BonusDistributionPreset.Double100_100;
    }
    if (slots.length === 4) {
      return BonusDistributionPreset.Quarterly;
    }
    return BonusDistributionPreset.Custom;
  }
  if (salariesCount === AnnualSalariesCount.Fifteen) {
    if (
      slots.length === 3 &&
      slots[0]?.payoutFraction === 1.0 &&
      slots[1]?.payoutFraction === 1.0 &&
      slots[2]?.payoutFraction === 1.0
    ) {
      return BonusDistributionPreset.Triple100_100_100;
    }
    if (slots.length === 4) {
      return BonusDistributionPreset.Quarterly;
    }
    return BonusDistributionPreset.Custom;
  }
  return BonusDistributionPreset.Custom;
}

export const householdTaxableIncome = signal<readonly HouseholdTaxableIncomeInput[]>(initialPersisted.householdTaxableIncome ?? []);

export const assumeManualNetIsAssessmentNet = signal(initialPersisted.assumeManualNetIsAssessmentNet === true);

// Input Mode (Gross vs Net Mode) & Period (Monthly vs Yearly)
export const salaryInputMode = signal<SalaryInputMode>(
  initialPersisted.salaryInputMode,
);
export const salaryPeriod = signal<SalaryPeriod>(initialPersisted.salaryPeriod);
export const husbandPayrollOptions = signal<PayrollOptions>(initialPersisted.husbandPayrollOptions ?? {});
export const wifePayrollOptions = signal<PayrollOptions>(initialPersisted.wifePayrollOptions ?? {});
export const husbandGross = signal<GrossSalary>(initialPersisted.husbandGross);
export const wifeGross = signal<GrossSalary>(initialPersisted.wifeGross);

// Person-specific salary counts and bonus installment distributions
export const husbandSalariesCount = signal<AnnualSalariesCount>(
  initialPersisted.husbandSalariesCount ??
    (initialPersisted.enable13thSalary
      ? AnnualSalariesCount.Thirteen
      : AnnualSalariesCount.Twelve),
);
export const husbandBonusPreset = signal<BonusDistributionPreset>(
  inferBonusPreset(
    husbandSalariesCount.value,
    initialPersisted.husbandBonusDistribution,
  ),
);
export const husbandBonusDistribution = signal<readonly SalaryBonusSlot[]>(
  initialPersisted.husbandBonusDistribution &&
    initialPersisted.husbandBonusDistribution.length > 0
    ? initialPersisted.husbandBonusDistribution
    : createBonusDistributionSlots(
      husbandSalariesCount.value,
      husbandBonusPreset.value,
    ),
);

export const wifeSalariesCount = signal<AnnualSalariesCount>(
  initialPersisted.wifeSalariesCount ?? AnnualSalariesCount.Twelve,
);
export const wifeBonusPreset = signal<BonusDistributionPreset>(
  inferBonusPreset(
    wifeSalariesCount.value,
    initialPersisted.wifeBonusDistribution,
  ),
);
export const wifeBonusDistribution = signal<readonly SalaryBonusSlot[]>(
  initialPersisted.wifeBonusDistribution &&
    initialPersisted.wifeBonusDistribution.length > 0
    ? initialPersisted.wifeBonusDistribution
    : createBonusDistributionSlots(
      wifeSalariesCount.value,
      wifeBonusPreset.value,
    ),
);

export const husbandGrossYearly = computed(
  () => (husbandGross.value || 0) * (husbandSalariesCount.value || 12),
);
export const wifeGrossYearly = computed(
  () => (wifeGross.value || 0) * (wifeSalariesCount.value || 12),
);

// Default Financial Parameters (The Sandbox)
export const husbandClass3Net = signal<NetSalary>(
  initialPersisted.husbandClass3Net,
);
export const husbandClass5Net = signal<NetSalary>(
  initialPersisted.husbandClass5Net,
);
export const husbandHours = signal<WorkingHours>(initialPersisted.husbandHours);

export const wifeInitialHours = signal<WorkingHours>(
  initialPersisted.wifeInitialHours,
);
export const wifePostBirthHours = signal<WorkingHours>(
  initialPersisted.wifePostBirthHours,
);
export const wifeClass5FullTimeNet = signal<NetSalary>(
  initialPersisted.wifeClass5FullTimeNet,
);
export const wifeClass3FullTimeNet = signal<NetSalary>(
  initialPersisted.wifeClass3FullTimeNet,
);

// Additional Income Channels
export const annualBonusGross = signal<GrossSalary>(
  initialPersisted.annualBonusGross,
);
export const annualBonusMonth = signal<CalendarMonth>(
  initialPersisted.annualBonusMonth,
);
export const investmentReturnMonthly = signal<EuroAmount>(
  initialPersisted.investmentReturnMonthly,
);

// Precondition Initial Tax Classes
export const husbandInitialTaxClass = signal<TaxClass>(
  initialPersisted.husbandInitialTaxClass ?? TaxClass.III,
);
export const wifeInitialTaxClass = signal<TaxClass>(
  initialPersisted.wifeInitialTaxClass ?? TaxClass.V,
);
export const useInitialTaxFactor = signal<boolean>(
  initialPersisted.useInitialTaxFactor ?? false,
);

export function setInitialTaxClasses(
  hClass: TaxClass,
  wClass: TaxClass,
  useFactor: boolean = false,
) {
  husbandInitialTaxClass.value = hClass;
  wifeInitialTaxClass.value = wClass;
  useInitialTaxFactor.value = useFactor;
  syncGrossToNet();
}

export function syncGrossToNet() {
  if (salaryInputMode.value === SalaryInputMode.Gross) {
    const defaults = getDefaultPersistedState();
    const spousal = deriveSpousalNetSalaries(
      toGrossSalary(Math.max(0, husbandGross.value ?? 0)),
      toGrossSalary(Math.max(0, wifeGross.value ?? 0)),
      toWorkingHours(wifePostBirthHours.value ?? defaults.wifePostBirthHours),
      toWorkingHours(wifeInitialHours.value ?? defaults.wifeInitialHours),
      0,
      createTaxRules(startCalendarYear.value),
      husbandPayrollOptions.value,
      wifePayrollOptions.value,
    );
    husbandClass3Net.value = spousal.husbandClass3Net;
    husbandClass5Net.value = spousal.husbandClass5Net;
    wifeClass5FullTimeNet.value = spousal.wifeClass5FullTimeNet;
    wifeClass3FullTimeNet.value = spousal.wifeClass3FullTimeNet;
  }
}

export function setHusbandGross(gross: number | GrossSalary) {
  husbandGross.value = toGrossSalary(Math.max(0, Number(gross) || 0));
  syncGrossToNet();
}

export function setWifeGross(gross: number | GrossSalary) {
  wifeGross.value = toGrossSalary(Math.max(0, Number(gross) || 0));
  syncGrossToNet();
}

export function setHusbandSalariesCount(
  count: number | AnnualSalariesCount,
  preset?: BonusDistributionPreset,
) {
  const c = toAnnualSalariesCount(count);
  husbandSalariesCount.value = c;
  const p =
    preset ??
    (c === AnnualSalariesCount.Thirteen
      ? BonusDistributionPreset.Ratio40_60
      : c === AnnualSalariesCount.Fourteen
        ? BonusDistributionPreset.Double100_100
        : c === AnnualSalariesCount.Fifteen
          ? BonusDistributionPreset.Triple100_100_100
          : BonusDistributionPreset.Ratio40_60);
  husbandBonusPreset.value = p;
  husbandBonusDistribution.value = createBonusDistributionSlots(c, p);
  enable13thSalary.value = c > 12;
}

export function setHusbandBonusPreset(preset: BonusDistributionPreset) {
  husbandBonusPreset.value = preset;
  husbandBonusDistribution.value = createBonusDistributionSlots(
    husbandSalariesCount.value,
    preset,
  );
}

export function setHusbandBonusDistribution(slots: readonly SalaryBonusSlot[]) {
  husbandBonusDistribution.value = slots;
  husbandBonusPreset.value = inferBonusPreset(
    husbandSalariesCount.value,
    slots,
  );
}

export function setWifeSalariesCount(
  count: number | AnnualSalariesCount,
  preset?: BonusDistributionPreset,
) {
  const c = toAnnualSalariesCount(count);
  wifeSalariesCount.value = c;
  const p =
    preset ??
    (c === AnnualSalariesCount.Thirteen
      ? BonusDistributionPreset.Ratio40_60
      : c === AnnualSalariesCount.Fourteen
        ? BonusDistributionPreset.Double100_100
        : c === AnnualSalariesCount.Fifteen
          ? BonusDistributionPreset.Triple100_100_100
          : BonusDistributionPreset.Ratio40_60);
  wifeBonusPreset.value = p;
  wifeBonusDistribution.value = createBonusDistributionSlots(c, p);
}

export function setWifeBonusPreset(preset: BonusDistributionPreset) {
  wifeBonusPreset.value = preset;
  wifeBonusDistribution.value = createBonusDistributionSlots(
    wifeSalariesCount.value,
    preset,
  );
}

export function setWifeBonusDistribution(slots: readonly SalaryBonusSlot[]) {
  wifeBonusDistribution.value = slots;
  wifeBonusPreset.value = inferBonusPreset(wifeSalariesCount.value, slots);
}

export function setHusbandGrossYearly(yearly: number) {
  const count = husbandSalariesCount.value || 12;
  setHusbandGross(Math.round((yearly || 0) / count));
}

export function setWifeGrossYearly(yearly: number) {
  const count = wifeSalariesCount.value || 12;
  setWifeGross(Math.round((yearly || 0) / count));
}

export function setHusbandHours(hours: number | WorkingHours) {
  husbandHours.value = toWorkingHours(
    Math.max(0, Math.min(60, Number(hours) || 0)),
  );
  syncGrossToNet();
}

export function setWifeInitialHours(hours: number | WorkingHours) {
  wifeInitialHours.value = toWorkingHours(
    Math.max(0, Math.min(60, Number(hours) || 0)),
  );
  syncGrossToNet();
}

export function setWifePostBirthHours(hours: number | WorkingHours) {
  wifePostBirthHours.value = toWorkingHours(
    Math.max(0, Math.min(60, Number(hours) || 0)),
  );
  syncGrossToNet();
}

export function setAnnualBonusGross(amount: number | GrossSalary) {
  annualBonusGross.value = toGrossSalary(Math.max(0, amount || 0));
}

export function setAnnualBonusMonth(m: number | CalendarMonth) {
  annualBonusMonth.value = toCalendarMonth(Math.max(1, Math.min(12, m || 1)));
}

export function setInvestmentReturnMonthly(amount: number | EuroAmount) {
  investmentReturnMonthly.value = toEuroAmount(amount || 0);
}

export function setSalaryPeriod(period: SalaryPeriod) {
  salaryPeriod.value = period;
}

export function setSalaryInputMode(mode: SalaryInputMode) {
  salaryInputMode.value = mode;
  if (mode === SalaryInputMode.Gross) {
    syncGrossToNet();
  }
}

export const derivedSpousalSet = computed<SpousalGrossToNetSet>(() => {
  const defaults = getDefaultPersistedState();
  return deriveSpousalNetSalaries(
    toGrossSalary(Math.max(0, husbandGross.value ?? 0)),
    toGrossSalary(Math.max(0, wifeGross.value ?? 0)),
    toWorkingHours(wifePostBirthHours.value ?? defaults.wifePostBirthHours),
    toWorkingHours(wifeInitialHours.value ?? defaults.wifeInitialHours),
    0,
    createTaxRules(startCalendarYear.value),
    husbandPayrollOptions.value,
    wifePayrollOptions.value,
  );
});

export const wifeClass5PartTimeNet = computed(() => {
  if (salaryInputMode.value === SalaryInputMode.Gross) {
    return derivedSpousalSet.value.wifeClass5PartTimeNet;
  }
  const defaults = getDefaultPersistedState();
  const ft = wifeClass5FullTimeNet.value;
  const initH = wifeInitialHours.value ?? defaults.wifeInitialHours;
  const pbH = wifePostBirthHours.value ?? defaults.wifePostBirthHours;
  const ratio = initH > 0 ? Math.max(0, pbH / initH) : 0;
  return Math.round(ft * ratio);
});

export const wifeClass3PartTimeNet = computed(() => {
  if (salaryInputMode.value === SalaryInputMode.Gross) {
    return derivedSpousalSet.value.wifeClass3PartTimeNet;
  }
  const defaults = getDefaultPersistedState();
  const ft = wifeClass3FullTimeNet.value;
  const initH = wifeInitialHours.value ?? defaults.wifeInitialHours;
  const pbH = wifePostBirthHours.value ?? defaults.wifePostBirthHours;
  const ratio = initH > 0 ? Math.max(0, pbH / initH) : 0;
  return Math.round(ft * ratio);
});

export const kindergeldPerChild = signal<EuroAmount>(
  initialPersisted.kindergeldPerChild,
);

// Special Annual Events (13th Month Salary & Tax Return Timing)
export const enable13thSalary = signal(initialPersisted.enable13thSalary);
export const bonus40Month = signal<CalendarMonth>(
  initialPersisted.bonus40Month,
); // Month 4 or 5 of each year (40% Vacation Bonus / Urlaubsgeld)
export const bonus60Month = signal<CalendarMonth>(
  initialPersisted.bonus60Month,
); // Month 10 or 11 of each year (60% Christmas Bonus / Weihnachtsgeld)
export const taxReturnMonth = signal<CalendarMonth>(
  initialPersisted.taxReturnMonth,
); // Month 2 or 3 of each year (Annual Tax Return / Finanzamt-Erstattung)
export const showSpecialEventRows = signal(
  initialPersisted.showSpecialEventRows,
); // Table display toggle

// Batch 3: Salary Raises & Career Progression Controls
export const enableSalaryRaises = signal(initialPersisted.enableSalaryRaises);
export const annualSalaryRaisePercent = signal(
  initialPersisted.annualSalaryRaisePercent,
); // 0%, 2%, 3%, 5% annual raise

// Timeline & Calendar Simulation Controls
export const startCalendarYear = signal(initialPersisted.startCalendarYear); // Default 2026
export const startCalendarMonth = signal<CalendarMonth>(
  initialPersisted.startCalendarMonth,
); // Default 1 (January)
export const simulationDurationMonths = signal<MonthDuration>(
  initialPersisted.simulationDurationMonths,
); // Default 60 months (5 years)
export const prePregnancyPlanningMonths = signal<MonthDuration>(
  initialPersisted.prePregnancyPlanningMonths,
); // Default 8 months planning -> Pregnancy starts in September 2026 (09.2026)
export const child1BirthMonth = signal<SimulationMonth>(
  initialPersisted.child1BirthMonth,
); // Month 17 (05.2027 / 9 months pregnancy)
export const birthSpacingMonths = signal<MonthDuration>(
  initialPersisted.birthSpacingMonths,
); // Gap of 27 months -> Child 2 born at Month 44
export const swapLeadMonths = signal<MonthDuration>(
  initialPersisted.swapLeadMonths,
); // 7 months prior to Mutterschutz phase
export const preMutterschutzMonths = signal<MonthDuration>(
  initialPersisted.preMutterschutzMonths,
); // 6 weeks
export const postMutterschutzMonths = signal<MonthDuration>(
  initialPersisted.postMutterschutzMonths,
); // 8 weeks

// UI & Strategy View State
export const activeScenario = signal<ActiveScenarioView>(
  initialPersisted.activeScenario,
);
export const activeStrategy = activeScenario;
export const chartMode = signal<TimelineChartMode>(initialPersisted.chartMode);
export const timeRangeFilter = signal<TimelineTimeRangeFilter>(
  initialPersisted.timeRangeFilter,
);
export const hoveredMonth = signal<number | null>(null);

/**
 * Sets the pregnancy 1 positive calendar date (year and month), automatically
 * calibrating the simulation start date (-3 months snapped to January of resulting year)
 * per statutory rules.
 */
export function setPregnancy1PositiveDate(
  year: number | FullCalendarYear,
  month: number | CalendarMonth,
) {
  const result = calculateSimulationStartDate(
    toFullCalendarYear(year),
    toCalendarMonth(month),
  );
  startCalendarYear.value = result.startCalendarYear;
  startCalendarMonth.value = result.startCalendarMonth;
  prePregnancyPlanningMonths.value = result.prePregnancyPlanningMonths;
  child1BirthMonth.value = toSimulationMonth(
    result.pregnancySimulationMonth + 8,
  ); // 9 months of pregnancy (delivery at Month + 8)
}

export function createDefaultPregnancies(): PregnancyAction[] {
  return [...getDefaultPersistedState().customPregnancies];
}

export function createDefaultTaxClassSwitches(): TaxClassSwitchAction[] {
  return [...getDefaultPersistedState().customTaxClassSwitches];
}

export function createDefaultSalaryRaises(): SalaryRaiseAction[] {
  return [...getDefaultPersistedState().customSalaryRaises];
}

export function createDefaultWorkingHoursChanges(): WorkingHoursChangeAction[] {
  return [...(getDefaultPersistedState().customWorkingHoursChanges || [])];
}

export function createDefaultFinancialEvents(): FinancialEventAction[] {
  return [...getDefaultPersistedState().customFinancialEvents];
}

// User-Defined Dynamic Action Collections (Initialized with persisted state or defaults)
export const customPregnancies = signal<PregnancyAction[]>([
  ...(Array.isArray(initialPersisted.customPregnancies)
    ? (initialPersisted.customPregnancies as PregnancyAction[])
    : getDefaultPersistedState().customPregnancies),
]);

export const customTaxClassSwitches = signal<TaxClassSwitchAction[]>([
  ...(Array.isArray(initialPersisted.customTaxClassSwitches)
    ? (initialPersisted.customTaxClassSwitches as TaxClassSwitchAction[])
    : getDefaultPersistedState().customTaxClassSwitches),
]);

export const customSalaryRaises = signal<SalaryRaiseAction[]>([
  ...(Array.isArray(initialPersisted.customSalaryRaises)
    ? (initialPersisted.customSalaryRaises as SalaryRaiseAction[])
    : getDefaultPersistedState().customSalaryRaises),
]);

export const customWorkingHoursChanges = signal<WorkingHoursChangeAction[]>([
  ...(Array.isArray(initialPersisted.customWorkingHoursChanges)
    ? (initialPersisted.customWorkingHoursChanges as WorkingHoursChangeAction[])
    : getDefaultPersistedState().customWorkingHoursChanges || []),
]);

export const customFinancialEvents = signal<FinancialEventAction[]>([
  ...(Array.isArray(initialPersisted.customFinancialEvents)
    ? (initialPersisted.customFinancialEvents as FinancialEventAction[])
    : getDefaultPersistedState().customFinancialEvents),
]);

// Batch 1 Mutation Helpers
export function addPregnancyAction(action: PregnancyAction) {
  customPregnancies.value = [...customPregnancies.value, action];
}

export function updatePregnancyAction(
  pregnancyId: PregnancyId | string,
  updates: Partial<PregnancyAction>,
) {
  customPregnancies.value = customPregnancies.value.map((p) =>
    p.pregnancyId === pregnancyId ? { ...p,
      ...updates } : p);
}

export function removePregnancyAction(pregnancyId: PregnancyId | string) {
  customPregnancies.value = customPregnancies.value.filter(
    (p) => p.pregnancyId !== pregnancyId,
  );
}

export function removeAllPregnancyActions(): void {
  customPregnancies.value = [];
}

// Batch 2 Mutation Helpers
export function addTaxClassSwitchAction(action: TaxClassSwitchAction) {
  customTaxClassSwitches.value = [...customTaxClassSwitches.value, action];
}

export function updateTaxClassSwitchAction(
  switchId: SwitchId | string,
  updates: Partial<TaxClassSwitchAction>,
) {
  customTaxClassSwitches.value = customTaxClassSwitches.value.map((s) =>
    s.switchId === switchId ? { ...s,
      ...updates } : s);
}

export function removeTaxClassSwitchAction(switchId: SwitchId | string) {
  customTaxClassSwitches.value = customTaxClassSwitches.value.filter(
    (s) => s.switchId !== switchId,
  );
}

export function removeAllTaxClassSwitchActions(): void {
  customTaxClassSwitches.value = [];
}

// Batch 3 Mutation Helpers (Salary Raises)
export function addSalaryRaiseAction(action: SalaryRaiseAction) {
  customSalaryRaises.value = [...customSalaryRaises.value, action];
}

export function updateSalaryRaiseAction(
  raiseId: RaiseId | string,
  updates: Partial<SalaryRaiseAction>,
) {
  customSalaryRaises.value = customSalaryRaises.value.map((r) =>
    r.raiseId === raiseId ? { ...r,
      ...updates } : r);
}

export function removeSalaryRaiseAction(raiseId: RaiseId | string) {
  customSalaryRaises.value = customSalaryRaises.value.filter(
    (r) => r.raiseId !== raiseId,
  );
}

export function removeAllSalaryRaiseActions(): void {
  customSalaryRaises.value = [];
}

// Batch 3 Mutation Helpers (Working Hours Changes)
export function addWorkingHoursChangeAction(action: WorkingHoursChangeAction) {
  customWorkingHoursChanges.value = [
    ...customWorkingHoursChanges.value,
    action,
  ];
}

export function updateWorkingHoursChangeAction(
  changeId: HoursChangeId | string,
  updates: Partial<WorkingHoursChangeAction>,
) {
  customWorkingHoursChanges.value = customWorkingHoursChanges.value.map((h) =>
    h.changeId === changeId ? { ...h,
      ...updates } : h);
}

export function removeWorkingHoursChangeAction(
  changeId: HoursChangeId | string,
) {
  customWorkingHoursChanges.value = customWorkingHoursChanges.value.filter(
    (h) => h.changeId !== changeId,
  );
}

export function removeAllWorkingHoursChangeActions(): void {
  customWorkingHoursChanges.value = [];
}

// Batch 4 Mutation Helpers
export function addFinancialEventAction(action: FinancialEventAction) {
  customFinancialEvents.value = [...customFinancialEvents.value, action];
}

export function updateFinancialEventAction(
  eventId: FinancialEventId | string,
  updates: Partial<FinancialEventAction>,
) {
  customFinancialEvents.value = customFinancialEvents.value.map((e) =>
    e.eventId === eventId ? { ...e,
      ...updates } : e);
}

export function removeFinancialEventAction(eventId: FinancialEventId | string) {
  customFinancialEvents.value = customFinancialEvents.value.filter(
    (e) => e.eventId !== eventId,
  );
}

export function removeAllFinancialEventActions(): void {
  customFinancialEvents.value = [];
}

/**
 * Removes all custom user actions across all batches (Pregnancies, Switches, Raises, Hours, Events).
 */
export function removeAllCustomActions(): void {
  customPregnancies.value = [];
  customTaxClassSwitches.value = [];
  customSalaryRaises.value = [];
  customWorkingHoursChanges.value = [];
  customFinancialEvents.value = [];
}

/**
 * Persists the entire reactive state of the simulator into localStorage.
 */
/**
 * Constructs the strongly-typed snapshot of the active simulation state.
 */
export function getCurrentPersistedState(): ElterngeldPersistedState {
  return {
    husbandPayrollOptions: husbandPayrollOptions.value,
    wifePayrollOptions: wifePayrollOptions.value,
    assumeManualNetIsAssessmentNet: assumeManualNetIsAssessmentNet.value,
    householdTaxableIncome: householdTaxableIncome.value,
    salaryInputMode: salaryInputMode.value,
    salaryPeriod: salaryPeriod.value,
    husbandGross: husbandGross.value,
    wifeGross: wifeGross.value,
    husbandHours: husbandHours.value,
    husbandSalariesCount: husbandSalariesCount.value,
    husbandBonusDistribution: husbandBonusDistribution.value,
    wifeInitialHours: wifeInitialHours.value,
    wifePostBirthHours: wifePostBirthHours.value,
    wifeSalariesCount: wifeSalariesCount.value,
    wifeBonusDistribution: wifeBonusDistribution.value,
    husbandClass3Net: husbandClass3Net.value,
    husbandClass5Net: husbandClass5Net.value,
    wifeClass5FullTimeNet: wifeClass5FullTimeNet.value,
    wifeClass3FullTimeNet: wifeClass3FullTimeNet.value,
    husbandInitialTaxClass: husbandInitialTaxClass.value,
    wifeInitialTaxClass: wifeInitialTaxClass.value,
    useInitialTaxFactor: useInitialTaxFactor.value,

    annualBonusGross: annualBonusGross.value,
    annualBonusMonth: annualBonusMonth.value,
    investmentReturnMonthly: investmentReturnMonthly.value,

    kindergeldPerChild: kindergeldPerChild.value,
    enable13thSalary: enable13thSalary.value,
    bonus40Month: bonus40Month.value,
    bonus60Month: bonus60Month.value,
    taxReturnMonth: taxReturnMonth.value,
    showSpecialEventRows: showSpecialEventRows.value,
    enableSalaryRaises: enableSalaryRaises.value,
    annualSalaryRaisePercent: annualSalaryRaisePercent.value,

    startCalendarYear: startCalendarYear.value,
    startCalendarMonth: startCalendarMonth.value,
    simulationDurationMonths: simulationDurationMonths.value,
    prePregnancyPlanningMonths: prePregnancyPlanningMonths.value,
    child1BirthMonth: child1BirthMonth.value,
    birthSpacingMonths: birthSpacingMonths.value,
    swapLeadMonths: swapLeadMonths.value,
    preMutterschutzMonths: preMutterschutzMonths.value,
    postMutterschutzMonths: postMutterschutzMonths.value,

    customPregnancies: customPregnancies.value,
    customTaxClassSwitches: customTaxClassSwitches.value,
    customSalaryRaises: customSalaryRaises.value,
    customWorkingHoursChanges: customWorkingHoursChanges.value,
    customFinancialEvents: customFinancialEvents.value,

    activeScenario: activeScenario.value,
    chartMode: chartMode.value,
    timeRangeFilter: timeRangeFilter.value,
  };
}

/**
 * Persists the entire reactive state of the simulator into localStorage.
 */
export function persistCurrentState(): void {
  saveToStorage(getCurrentPersistedState());
}

/**
 * Safely applies an imported state to all reactive store signals and syncs to persistence.
 */
export function importSimulationState(
  newState: ElterngeldPersistedState,
  options: { preserveActiveScenario?: boolean } = {
    preserveActiveScenario: true,
  },
): void {
  const currentView = activeScenario.value;
  husbandPayrollOptions.value = parsePersonalPayrollOptions(newState.husbandPayrollOptions ?? {});
  wifePayrollOptions.value = parsePersonalPayrollOptions(newState.wifePayrollOptions ?? {});
  assumeManualNetIsAssessmentNet.value = newState.assumeManualNetIsAssessmentNet === true;
  householdTaxableIncome.value = newState.householdTaxableIncome ?? [];
  salaryInputMode.value = newState.salaryInputMode;
  salaryPeriod.value = newState.salaryPeriod;
  husbandGross.value = newState.husbandGross;
  wifeGross.value = newState.wifeGross;
  husbandHours.value = newState.husbandHours;
  husbandSalariesCount.value =
    newState.husbandSalariesCount ??
    (newState.enable13thSalary
      ? AnnualSalariesCount.Thirteen
      : AnnualSalariesCount.Twelve);
  husbandBonusPreset.value = inferBonusPreset(
    husbandSalariesCount.value,
    newState.husbandBonusDistribution,
  );
  husbandBonusDistribution.value =
    newState.husbandBonusDistribution &&
    newState.husbandBonusDistribution.length > 0
      ? newState.husbandBonusDistribution
      : createBonusDistributionSlots(
        husbandSalariesCount.value,
        husbandBonusPreset.value,
      );

  wifeInitialHours.value = newState.wifeInitialHours;
  wifePostBirthHours.value = newState.wifePostBirthHours;
  wifeSalariesCount.value =
    newState.wifeSalariesCount ?? AnnualSalariesCount.Twelve;
  wifeBonusPreset.value = inferBonusPreset(
    wifeSalariesCount.value,
    newState.wifeBonusDistribution,
  );
  wifeBonusDistribution.value =
    newState.wifeBonusDistribution && newState.wifeBonusDistribution.length > 0
      ? newState.wifeBonusDistribution
      : createBonusDistributionSlots(
        wifeSalariesCount.value,
        wifeBonusPreset.value,
      );
  husbandClass3Net.value = newState.husbandClass3Net;
  husbandClass5Net.value = newState.husbandClass5Net;
  wifeClass5FullTimeNet.value = newState.wifeClass5FullTimeNet;
  wifeClass3FullTimeNet.value = newState.wifeClass3FullTimeNet;
  husbandInitialTaxClass.value =
    newState.husbandInitialTaxClass ?? TaxClass.III;
  wifeInitialTaxClass.value = newState.wifeInitialTaxClass ?? TaxClass.V;
  useInitialTaxFactor.value = newState.useInitialTaxFactor ?? false;

  annualBonusGross.value = newState.annualBonusGross;
  annualBonusMonth.value = newState.annualBonusMonth;
  investmentReturnMonthly.value = newState.investmentReturnMonthly;

  kindergeldPerChild.value = newState.kindergeldPerChild;
  enable13thSalary.value = newState.enable13thSalary;
  bonus40Month.value = newState.bonus40Month;
  bonus60Month.value = newState.bonus60Month;
  taxReturnMonth.value = newState.taxReturnMonth;
  showSpecialEventRows.value = newState.showSpecialEventRows;

  enableSalaryRaises.value = newState.enableSalaryRaises;
  annualSalaryRaisePercent.value = newState.annualSalaryRaisePercent;

  startCalendarYear.value = newState.startCalendarYear;
  startCalendarMonth.value = newState.startCalendarMonth;
  simulationDurationMonths.value = newState.simulationDurationMonths;
  prePregnancyPlanningMonths.value = newState.prePregnancyPlanningMonths;
  child1BirthMonth.value = newState.child1BirthMonth;
  birthSpacingMonths.value = newState.birthSpacingMonths;
  swapLeadMonths.value = newState.swapLeadMonths;
  preMutterschutzMonths.value = newState.preMutterschutzMonths;
  postMutterschutzMonths.value = newState.postMutterschutzMonths;

  customPregnancies.value = [...newState.customPregnancies];
  customTaxClassSwitches.value = [...newState.customTaxClassSwitches];
  customSalaryRaises.value = [...newState.customSalaryRaises];
  customWorkingHoursChanges.value = [
    ...(newState.customWorkingHoursChanges || []),
  ];
  customFinancialEvents.value = [...(newState.customFinancialEvents || [])];

  if (!options.preserveActiveScenario && newState.activeScenario) {
    activeScenario.value = newState.activeScenario;
  }
  else if (!activeScenario.value) {
    activeScenario.value = newState.activeScenario;
  }
  else {
    activeScenario.value = currentView;
  }

  chartMode.value = newState.chartMode;
  timeRangeFilter.value = newState.timeRangeFilter;

  syncGrossToNet();
  persistCurrentState();
}

// Auto-persist signal changes to localStorage in browser environment
if (typeof window !== "undefined") {
  effect(() => {
    persistCurrentState();
  });
}

// ============================================================================
// User Data Export & Import Modal & Triggers
// ============================================================================

export const isExportImportModalOpen = signal<boolean>(false);
export const exportImportActiveTab = signal<"export" | "import">("export");

export function openExportImportModal(
  tab: "export" | "import" = "export",
): void {
  exportImportActiveTab.value = tab;
  isExportImportModalOpen.value = true;
}

export function closeExportImportModal(): void {
  isExportImportModalOpen.value = false;
}

export function exportSimulationJson(): void {
  const state = getCurrentPersistedState();
  const jsonStr = exportStateToJson(state);
  const dateTag = new Date().toISOString().slice(0, 10);
  triggerFileDownload(
    `elterngeld-simulation-${dateTag}.json`,
    jsonStr,
    "application/json",
  );
}

export function exportSimulationText(): void {
  const state = getCurrentPersistedState();
  const timelines = {
    [ScenarioId.A]: scenarioAData.value,
    [ScenarioId.B]: scenarioBData.value,
    [ScenarioId.C]: scenarioCData.value,
  };
  const textReport = exportStateToTextReport(state, timelines);
  const dateTag = new Date().toISOString().slice(0, 10);
  triggerFileDownload(
    `elterngeld-financial-report-${dateTag}.txt`,
    textReport,
    "text/plain;charset=utf-8",
  );
}

export function exportSimulationZip(): void {
  const state = getCurrentPersistedState();
  const timelines = {
    [ScenarioId.A]: scenarioAData.value,
    [ScenarioId.B]: scenarioBData.value,
    [ScenarioId.C]: scenarioCData.value,
  };
  const jsonStr = exportStateToJson(state);
  const textReport = exportStateToTextReport(state, timelines);
  const csvA = exportScenarioToCsv(timelines[ScenarioId.A]);
  const csvB = exportScenarioToCsv(timelines[ScenarioId.B]);
  const csvC = exportScenarioToCsv(timelines[ScenarioId.C]);

  const files: Record<string, string> = {
    "simulation_config.json": jsonStr,
    "financial_audit_report.txt": textReport,
    "scenario_A_baseline_ledger.csv": csvA,
    "scenario_B_tax_swap_ledger.csv": csvB,
    "scenario_C_maximum_strategy_ledger.csv": csvC,
  };

  const zipBytes = exportStateToZip(files);
  const dateTag = new Date().toISOString().slice(0, 10);
  triggerFileDownload(
    `elterngeld-simulation-bundle-${dateTag}.zip`,
    zipBytes,
    "application/zip",
  );
}

export function exportSimulationCsv(
  scenarioKey: ScenarioId = ScenarioId.C,
): void {
  const timelines = {
    [ScenarioId.A]: scenarioAData.value,
    [ScenarioId.B]: scenarioBData.value,
    [ScenarioId.C]: scenarioCData.value,
  };
  const csvContent = exportScenarioToCsv(timelines[scenarioKey]);
  const dateTag = new Date().toISOString().slice(0, 10);
  triggerFileDownload(
    `elterngeld-scenario-${scenarioKey}-ledger-${dateTag}.csv`,
    csvContent,
    "text/csv;charset=utf-8",
  );
}

export function printSimulationReport(): void {
  const state = getCurrentPersistedState();
  const timelines = {
    [ScenarioId.A]: scenarioAData.value,
    [ScenarioId.B]: scenarioBData.value,
    [ScenarioId.C]: scenarioCData.value,
  };
  triggerPrintableReport(state, timelines);
}

export function resetToDefaults() {
  clearStorage();
  const defaults = getDefaultPersistedState();

  husbandPayrollOptions.value = defaults.husbandPayrollOptions ?? {};
  wifePayrollOptions.value = defaults.wifePayrollOptions ?? {};
  assumeManualNetIsAssessmentNet.value = defaults.assumeManualNetIsAssessmentNet === true;
  householdTaxableIncome.value = defaults.householdTaxableIncome ?? [];
  salaryInputMode.value = defaults.salaryInputMode;
  salaryPeriod.value = defaults.salaryPeriod;
  husbandGross.value = defaults.husbandGross;
  wifeGross.value = defaults.wifeGross;
  husbandHours.value = defaults.husbandHours;
  husbandSalariesCount.value =
    defaults.husbandSalariesCount ??
    (defaults.enable13thSalary
      ? AnnualSalariesCount.Thirteen
      : AnnualSalariesCount.Twelve);
  husbandBonusPreset.value = inferBonusPreset(
    husbandSalariesCount.value,
    defaults.husbandBonusDistribution,
  );
  husbandBonusDistribution.value =
    defaults.husbandBonusDistribution &&
    defaults.husbandBonusDistribution.length > 0
      ? defaults.husbandBonusDistribution
      : createBonusDistributionSlots(
        husbandSalariesCount.value,
        husbandBonusPreset.value,
      );

  wifeInitialHours.value = defaults.wifeInitialHours;
  wifePostBirthHours.value = defaults.wifePostBirthHours;
  wifeSalariesCount.value =
    defaults.wifeSalariesCount ?? AnnualSalariesCount.Twelve;
  wifeBonusPreset.value = inferBonusPreset(
    wifeSalariesCount.value,
    defaults.wifeBonusDistribution,
  );
  wifeBonusDistribution.value =
    defaults.wifeBonusDistribution && defaults.wifeBonusDistribution.length > 0
      ? defaults.wifeBonusDistribution
      : createBonusDistributionSlots(
        wifeSalariesCount.value,
        wifeBonusPreset.value,
      );
  husbandClass3Net.value = defaults.husbandClass3Net;
  husbandClass5Net.value = defaults.husbandClass5Net;
  wifeClass5FullTimeNet.value = defaults.wifeClass5FullTimeNet;
  wifeClass3FullTimeNet.value = defaults.wifeClass3FullTimeNet;
  husbandInitialTaxClass.value =
    defaults.husbandInitialTaxClass ?? TaxClass.III;
  wifeInitialTaxClass.value = defaults.wifeInitialTaxClass ?? TaxClass.V;
  useInitialTaxFactor.value = defaults.useInitialTaxFactor ?? false;

  annualBonusGross.value = defaults.annualBonusGross;
  annualBonusMonth.value = defaults.annualBonusMonth;
  investmentReturnMonthly.value = defaults.investmentReturnMonthly;

  kindergeldPerChild.value = defaults.kindergeldPerChild;
  enable13thSalary.value = defaults.enable13thSalary;
  bonus40Month.value = defaults.bonus40Month;
  bonus60Month.value = defaults.bonus60Month;
  taxReturnMonth.value = defaults.taxReturnMonth;
  showSpecialEventRows.value = defaults.showSpecialEventRows;

  enableSalaryRaises.value = defaults.enableSalaryRaises;
  annualSalaryRaisePercent.value = defaults.annualSalaryRaisePercent;

  startCalendarYear.value = defaults.startCalendarYear;
  startCalendarMonth.value = defaults.startCalendarMonth;
  simulationDurationMonths.value = defaults.simulationDurationMonths;
  prePregnancyPlanningMonths.value = defaults.prePregnancyPlanningMonths;
  child1BirthMonth.value = defaults.child1BirthMonth;
  birthSpacingMonths.value = defaults.birthSpacingMonths;
  swapLeadMonths.value = defaults.swapLeadMonths;
  preMutterschutzMonths.value = defaults.preMutterschutzMonths;
  postMutterschutzMonths.value = defaults.postMutterschutzMonths;

  customPregnancies.value = [...defaults.customPregnancies];
  customTaxClassSwitches.value = [...defaults.customTaxClassSwitches];
  customSalaryRaises.value = [...defaults.customSalaryRaises];
  customWorkingHoursChanges.value = [
    ...(defaults.customWorkingHoursChanges ||
      createDefaultWorkingHoursChanges()),
  ];
  customFinancialEvents.value = [...defaults.customFinancialEvents];

  activeScenario.value = defaults.activeScenario;
  chartMode.value = defaults.chartMode;
  timeRangeFilter.value = defaults.timeRangeFilter;

  syncGrossToNet();
  persistCurrentState();
}

/**
 * Resets the simulator state to a clean empty scenario with zero action milestones.
 */
export function resetToEmptyScenario(): void {
  const emptyState = getEmptyPersistedState();
  importSimulationState(emptyState);
}

// 60-Month Cash Flow Engine for a given scenario ('A', 'B', or 'C')

export function computeTimelineData(scenarioKey: ScenarioIdType) {
  const startYear = startCalendarYear.value;
  const startMonth = startCalendarMonth.value;
  const duration = simulationDurationMonths.value;

  // Batch 0: Preexisting Baseline Conditions
  const preexisting: PreexistingConditions = {
    startCalendarYear: startYear,
    startCalendarMonth: toCalendarMonth(startMonth),
    simulationDurationMonths: duration,
    husbandPayrollOptions: husbandPayrollOptions.value,
    wifePayrollOptions: wifePayrollOptions.value,
    assumeManualNetIsAssessmentNet: assumeManualNetIsAssessmentNet.value,
    householdTaxableIncome: householdTaxableIncome.value,
    salaryInputMode: salaryInputMode.value,
    salaryPeriod: salaryPeriod.value,
    husbandGross: toGrossSalary(husbandGross.value),
    wifeGross: toGrossSalary(wifeGross.value),
    husbandInitialTaxClass: husbandInitialTaxClass.value || TaxClass.III,
    husbandInitialNet: toNetSalary(husbandClass3Net.value),
    husbandInitialClass5Net: toNetSalary(husbandClass5Net.value),
    husbandInitialClass4Net: toNetSalary(
      derivedSpousalSet.value.husbandClass4Net,
    ),
    husbandWeeklyHours: toWorkingHours(husbandHours.value),
    husbandSalariesCount: husbandSalariesCount.value,
    husbandBonusDistribution: husbandBonusDistribution.value,
    wifeInitialTaxClass: wifeInitialTaxClass.value || TaxClass.V,
    wifeInitialFullTimeNet: toNetSalary(wifeClass5FullTimeNet.value),
    wifeInitialClass3FullTimeNet: toNetSalary(wifeClass3FullTimeNet.value),
    wifeInitialClass4FullTimeNet: toNetSalary(
      derivedSpousalSet.value.wifeClass4FullTimeNet,
    ),
    wifeInitialPartTimeClass5Net: toNetSalary(wifeClass5PartTimeNet.value),
    wifeInitialPartTimeClass3Net: toNetSalary(wifeClass3PartTimeNet.value),
    wifeInitialPartTimeClass4Net: toNetSalary(
      derivedSpousalSet.value.wifeClass4PartTimeNet,
    ),
    wifeWeeklyHours: toWorkingHours(wifeInitialHours.value),
    wifePostBirthWeeklyHours: toWorkingHours(wifePostBirthHours.value),
    wifeSalariesCount: wifeSalariesCount.value,
    wifeBonusDistribution: wifeBonusDistribution.value,
    initialUseTaxFactor: useInitialTaxFactor.value,
    initialTaxFactor: derivedSpousalSet.value.taxFactor,
    annualBonusGross: toEuroAmount(annualBonusGross.value),
    annualBonusMonth: toCalendarMonth(annualBonusMonth.value),
    investmentReturnMonthly: toEuroAmount(investmentReturnMonthly.value),
    existingChildrenCount: toChildrenCount(0),
    kindergeldPerChild: toEuroAmount(kindergeldPerChild.value),
    enable13thSalary: enable13thSalary.value,
    bonus40Month: toCalendarMonth(bonus40Month.value),
    bonus60Month: toCalendarMonth(bonus60Month.value),
    taxReturnMonth: toCalendarMonth(taxReturnMonth.value),
  };

  const dynamicPregnancies = customPregnancies.value.map((p) => ({
    ...p,
    motherPostBirthPartTimeHours: toWorkingHours(wifePostBirthHours.value),
    motherPostBirthPartTimeClass5Net: toNetSalary(wifeClass5PartTimeNet.value),
    motherPostBirthPartTimeClass3Net: toNetSalary(wifeClass3PartTimeNet.value),
  }));

  return runScenarioBatches({
    scenarioKey,
    preexisting,
    pregnancies: dynamicPregnancies,
    taxClassSwitches: customTaxClassSwitches.value,
    salaryRaises: customSalaryRaises.value,
    workingHoursChanges: customWorkingHoursChanges.value,
    financialEvents: customFinancialEvents.value,
  });
}

// Computed results for all 3 strategies (StatusQuo, UnoptimizedBaseline, StatutoryOptimized)
export const statusQuoData = computed(() =>
  computeTimelineData(SimulationStrategy.StatusQuo));
export const unoptimizedBaselineData = computed(() =>
  computeTimelineData(SimulationStrategy.UnoptimizedBaseline));
export const statutoryOptimizedData = computed(() =>
  computeTimelineData(SimulationStrategy.StatutoryOptimized));

// Backward compatibility aliases
export const scenarioAData = statusQuoData;
export const scenarioBData = unoptimizedBaselineData;
export const scenarioCData = statutoryOptimizedData;

// Current active strategy data
export const currentScenarioData = computed(() => {
  const key = activeScenario.value;
  if (key === SimulationStrategy.StatusQuo) {
    return statusQuoData.value;
  }
  if (key === SimulationStrategy.UnoptimizedBaseline) {
    return unoptimizedBaselineData.value;
  }
  return statutoryOptimizedData.value;
});
export const currentStrategyData = currentScenarioData;

// Comparison metrics (C vs B and C vs A)
export const comparisonMetrics = computed(() => {
  const a = scenarioAData.value.summary;
  const b = scenarioBData.value.summary;
  const c = scenarioCData.value.summary;

  return {
    gainCvsB: c.grandTotal - b.grandTotal,
    benefitsGainCvsB: c.totalBenefits - b.totalBenefits,
    taxRefundC: c.totalTaxRefunds,
    gainCvsA: c.grandTotal - a.grandTotal,
    wifeEgGainCvsB: c.totalWifeElterngeld - b.totalWifeElterngeld,
    mutterschutzGainCvsB: c.totalMutterschutz - b.totalMutterschutz,
  };
});

// ============================================================================
// Legal Framework & Statutory Precedents Navigation
// ============================================================================

/**
 * Statutory Legal Framework Rule Identifiers for Deep-Linking and Precedent Explanations.
 */
export const LegalRuleKey = {
  /** Maternity protection wage replacement (§§ 19, 20 MuSchG). */
  MuSchG_Maternity: "muschg-maternity",
  /** Proactive spousal tax class optimization (§ 2b Abs. 1 Satz 3 BEEG, BFH VI R 2/13). */
  BEEG_TaxSwap: "beeg-tax-swap",
  /** Clean synthetic net income baseline (§ 2c BEEG). */
  BEEG_SyntheticNet: "beeg-synthetic-net",
  /** Spousal splitting tariff joint assessment (§ 26b, § 32a Abs. 5 EStG). */
  EStG_TaxSplitting: "estg-tax-splitting",
  /** Partnerschaftsbonus part-time window (§ 4b BEEG). */
  BEEG_PartnershipBonus: "beeg-partnership-bonus",
  /** Geschwisterbonus older sibling addition (§ 2a BEEG). */
  BEEG_SiblingBonus: "beeg-sibling-bonus",
  /** Child 2 sequential birth baseline dilution mitigation (§ 2b BEEG). */
  BEEG_Child2Dilution: "beeg-child2-dilution",
  /** Monthly child benefit (§ 66 EStG Kindergeld). */
  EStG_Kindergeld: "estg-kindergeld",
} as const;

/** Type alias for statutory legal rule keys. */
export type LegalRuleKeyType = (typeof LegalRuleKey)[keyof typeof LegalRuleKey];

/** Active highlighted legal framework card identifier. */
export const activeLegalRuleKey = signal<LegalRuleKeyType>(
  LegalRuleKey.BEEG_TaxSwap,
);

/**
 * Smoothly scrolls the viewport to the statutory legal framework card corresponding to `ruleKey`.
 *
 * @param ruleKey - Statutory legal rule identifier.
 */
export function scrollToLegalRule(ruleKey: LegalRuleKeyType): void {
  activeLegalRuleKey.value = ruleKey;
  if (typeof document !== "undefined") {
    const container = document.getElementById("statutory-legal-framework");
    if (container) {
      container.scrollIntoView({ behavior: "smooth",
        block: "start" });
    }
  }
}
