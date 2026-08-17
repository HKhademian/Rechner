import { signal, computed, effect } from "@preact/signals";
import {
  type ScenarioId as ScenarioIdType,
  ScenarioId,
  ActiveScenarioView,
  TimelineChartMode,
  TimelineTimeRangeFilter,
  TaxClass,
  TargetPerson,
  SalaryInputMode,
  SalaryPeriod,
  type PregnancyId,
  type SwitchId,
  type RaiseId,
  type FinancialEventId,
  FinancialEventCategory,
  toNetSalary,
  toGrossSalary,
  toEuroAmount,
  toWorkingHours,
  toSimulationMonth,
  toCalendarMonth,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  toHoursChangeId,
  toFinancialEventId,
  toSalaryInputMode,
  toSalaryPeriod,
  toActiveScenarioView,
  toTimelineChartMode,
  toTimelineTimeRangeFilter,
  type PreexistingConditions,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction,
  type WorkingHoursChangeAction,
  type FinancialEventAction,
  type GrossToNetBreakdown,
  type SpousalGrossToNetSet,
  type GrossSalary,
  type NetSalary,
  type WorkingHours,
  type EuroAmount,
  type CalendarMonth,
  type SimulationMonth,
  type HoursChangeId,
} from "#engine/types";
import {
  runScenarioBatches,
  calculateSimulationStartDate,
} from "#engine/simulator/timelineGenerator";
import {
  deriveSpousalNetSalaries,
  computeGrossToNetBreakdown,
} from "#engine/tax/wageTax";
import {
  getDefaultPersistedState,
  loadFromStorage,
  saveToStorage,
  clearStorage,
  type ElterngeldPersistedState,
} from "#engine/storage/persistence";
import {
  exportStateToJson,
  exportStateToTextReport,
  exportScenarioToCsv,
  exportStateToZip,
  triggerFileDownload,
  triggerPrintableReport,
  importStateFromJson,
} from "#engine/storage/exportImport";

// Initial state loaded from localStorage (or statutory defaults)
const initialPersisted = loadFromStorage();

// Input Mode (Gross vs Net Mode) & Period (Monthly vs Yearly)
export const salaryInputMode = signal<SalaryInputMode>(
  initialPersisted.salaryInputMode,
);
export const salaryPeriod = signal<SalaryPeriod>(initialPersisted.salaryPeriod);
export const husbandGross = signal<GrossSalary>(initialPersisted.husbandGross);
export const wifeGross = signal<GrossSalary>(initialPersisted.wifeGross);

export const husbandGrossYearly = computed(
  () => (husbandGross.value || 0) * 12,
);
export const wifeGrossYearly = computed(() => (wifeGross.value || 0) * 12);

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
    const spousal = deriveSpousalNetSalaries(
      toGrossSalary(Math.max(0, husbandGross.value ?? 0)),
      toGrossSalary(Math.max(0, wifeGross.value ?? 0)),
      toWorkingHours(wifePostBirthHours.value ?? 24),
      toWorkingHours(wifeInitialHours.value ?? 40),
      0,
    );
    husbandClass3Net.value = spousal.husbandClass3Net;
    husbandClass5Net.value = spousal.husbandClass5Net;
    wifeClass5FullTimeNet.value = spousal.wifeClass5FullTimeNet;
    wifeClass3FullTimeNet.value = spousal.wifeClass3FullTimeNet;
  }
}

export function setHusbandGross(gross: number | GrossSalary) {
  const g = typeof gross === "number" ? gross : (gross as number);
  husbandGross.value = toGrossSalary(Math.max(0, isNaN(g) ? 0 : g));
  syncGrossToNet();
}

export function setWifeGross(gross: number | GrossSalary) {
  const g = typeof gross === "number" ? gross : (gross as number);
  wifeGross.value = toGrossSalary(Math.max(0, isNaN(g) ? 0 : g));
  syncGrossToNet();
}

export function setHusbandGrossYearly(yearly: number) {
  setHusbandGross(Math.round((yearly || 0) / 12));
}

export function setWifeGrossYearly(yearly: number) {
  setWifeGross(Math.round((yearly || 0) / 12));
}

export function setHusbandHours(hours: number | WorkingHours) {
  const h = typeof hours === "number" ? hours : (hours as number);
  husbandHours.value = toWorkingHours(
    Math.max(0, Math.min(60, isNaN(h) ? 0 : h)),
  );
  syncGrossToNet();
}

export function setWifeInitialHours(hours: number | WorkingHours) {
  const h = typeof hours === "number" ? hours : (hours as number);
  wifeInitialHours.value = toWorkingHours(
    Math.max(0, Math.min(60, isNaN(h) ? 0 : h)),
  );
  syncGrossToNet();
}

export function setWifePostBirthHours(hours: number | WorkingHours) {
  const h = typeof hours === "number" ? hours : (hours as number);
  wifePostBirthHours.value = toWorkingHours(
    Math.max(0, Math.min(60, isNaN(h) ? 0 : h)),
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
  return deriveSpousalNetSalaries(
    toGrossSalary(Math.max(0, husbandGross.value ?? 0)),
    toGrossSalary(Math.max(0, wifeGross.value ?? 0)),
    toWorkingHours(wifePostBirthHours.value ?? 24),
    toWorkingHours(wifeInitialHours.value ?? 40),
    0,
  );
});

export const wifeClass5PartTimeNet = computed(() => {
  if (salaryInputMode.value === SalaryInputMode.Gross) {
    return derivedSpousalSet.value.wifeClass5PartTimeNet as number;
  }
  const ft = wifeClass5FullTimeNet.value;
  const initH = wifeInitialHours.value ?? 40;
  const pbH = wifePostBirthHours.value ?? 24;
  const ratio = initH > 0 ? Math.max(0, pbH / initH) : 0;
  return Math.round(ft * ratio);
});

export const wifeClass3PartTimeNet = computed(() => {
  if (salaryInputMode.value === SalaryInputMode.Gross) {
    return derivedSpousalSet.value.wifeClass3PartTimeNet as number;
  }
  const ft = wifeClass3FullTimeNet.value;
  const initH = wifeInitialHours.value ?? 40;
  const pbH = wifePostBirthHours.value ?? 24;
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
export const simulationDurationMonths = signal(
  initialPersisted.simulationDurationMonths,
); // Default 60 months (5 years)
export const prePregnancyPlanningMonths = signal(
  initialPersisted.prePregnancyPlanningMonths,
); // Default 8 months planning -> Pregnancy starts in September 2026 (09.2026)
export const child1BirthMonth = signal<SimulationMonth>(
  initialPersisted.child1BirthMonth,
); // Month 17 (05.2027 / 9 months pregnancy)
export const birthSpacingMonths = signal(initialPersisted.birthSpacingMonths); // Gap of 27 months -> Child 2 born at Month 44
export const swapLeadMonths = signal(initialPersisted.swapLeadMonths); // 7 months prior to Mutterschutz phase
export const preMutterschutzMonths = signal(
  initialPersisted.preMutterschutzMonths,
); // 6 weeks
export const postMutterschutzMonths = signal(
  initialPersisted.postMutterschutzMonths,
); // 8 weeks

// UI & View State
export const activeScenario = signal<ActiveScenarioView>(
  initialPersisted.activeScenario,
);
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
export function setPregnancy1PositiveDate(year: number, month: number) {
  const result = calculateSimulationStartDate(year, month);
  startCalendarYear.value = result.startCalendarYear;
  startCalendarMonth.value = toCalendarMonth(result.startCalendarMonth);
  prePregnancyPlanningMonths.value = result.prePregnancyPlanningMonths;
  child1BirthMonth.value = toSimulationMonth(
    result.pregnancySimulationMonth + 8,
  ); // 9 months of pregnancy (delivery at Month + 8)
}

export function createDefaultPregnancies(): PregnancyAction[] {
  const startYear = startCalendarYear.value;
  const startMonth = startCalendarMonth.value;
  const b1 = child1BirthMonth.value;
  const spacing = birthSpacingMonths.value;
  const b2 = b1 + spacing;

  return [
    {
      pregnancyId: toPregnancyId("PREG-CHILD-1"),
      childIndex: 1,
      positiveTestCalendarMonth: toCalendarMonth(
        ((startMonth - 1 + prePregnancyPlanningMonths.value) % 12) + 1,
      ),
      positiveTestCalendarYear:
        startYear +
        Math.floor((startMonth - 1 + prePregnancyPlanningMonths.value) / 12),
      positiveTestSimulationMonth: toSimulationMonth(
        prePregnancyPlanningMonths.value + 1,
      ),
      calculatedDeliverySimulationMonth: toSimulationMonth(b1),
      motherPostBirthPartTimeHours: toWorkingHours(wifePostBirthHours.value),
      motherPostBirthPartTimeClass5Net: toNetSalary(
        wifeClass5PartTimeNet.value,
      ),
      motherPostBirthPartTimeClass3Net: toNetSalary(
        wifeClass3PartTimeNet.value,
      ),
      fatherPartnerMonthsCount: 4,
    },
    {
      pregnancyId: toPregnancyId("PREG-CHILD-2"),
      childIndex: 2,
      positiveTestCalendarMonth: toCalendarMonth(
        ((startMonth - 1 + (b2 - 9)) % 12) + 1,
      ),
      positiveTestCalendarYear:
        startYear + Math.floor((startMonth - 1 + (b2 - 9)) / 12),
      positiveTestSimulationMonth: toSimulationMonth(b2 - 8),
      calculatedDeliverySimulationMonth: toSimulationMonth(b2),
      motherPostBirthPartTimeHours: toWorkingHours(wifePostBirthHours.value),
      motherPostBirthPartTimeClass5Net: toNetSalary(
        wifeClass5PartTimeNet.value,
      ),
      motherPostBirthPartTimeClass3Net: toNetSalary(
        wifeClass3PartTimeNet.value,
      ),
      fatherPartnerMonthsCount: 4,
    },
  ];
}

export function createDefaultTaxClassSwitches(): TaxClassSwitchAction[] {
  const startYear = startCalendarYear.value;
  const startMonth = startCalendarMonth.value;
  const b1 = child1BirthMonth.value;
  const spacing = birthSpacingMonths.value;
  const b2 = b1 + spacing;
  const lead = swapLeadMonths.value;

  const preM1 = b1 - 1;
  const swap1Start = Math.max(1, preM1 - lead);
  const preM2 = b2 - 1;
  const swap2Start = Math.max(b1 + 2, preM2 - lead);

  return [
    {
      switchId: toSwitchId("SWAP-CHILD-1"),
      effectiveSimulationMonth: toSimulationMonth(swap1Start),
      effectiveCalendarMonth: toCalendarMonth(
        ((startMonth - 1 + swap1Start - 1) % 12) + 1,
      ),
      effectiveCalendarYear:
        startYear + Math.floor((startMonth - 1 + swap1Start - 1) / 12),
      targetHusbandTaxClass: TaxClass.V,
      targetWifeTaxClass: TaxClass.III,
      statutoryReason:
        "Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)",
      revertSimulationMonth: toSimulationMonth(b1),
    },
    {
      switchId: toSwitchId("SWAP-CHILD-2"),
      effectiveSimulationMonth: toSimulationMonth(swap2Start),
      effectiveCalendarMonth: toCalendarMonth(
        ((startMonth - 1 + swap2Start - 1) % 12) + 1,
      ),
      effectiveCalendarYear:
        startYear + Math.floor((startMonth - 1 + swap2Start - 1) / 12),
      targetHusbandTaxClass: TaxClass.V,
      targetWifeTaxClass: TaxClass.III,
      statutoryReason:
        "Optimize Child 2 Part-Time Elterngeld baseline (§ 2b BEEG)",
      revertSimulationMonth: toSimulationMonth(b2),
    },
  ];
}

export function createDefaultSalaryRaises(): SalaryRaiseAction[] {
  const duration = simulationDurationMonths.value;
  const startYear = startCalendarYear.value;
  const salaryRaises: SalaryRaiseAction[] = [];
  if (enableSalaryRaises.value && annualSalaryRaisePercent.value > 0) {
    const rate = annualSalaryRaisePercent.value / 100;
    for (let yr = 2; yr <= 5; yr++) {
      const raiseSimMonth = (yr - 1) * 12 + 1;
      if (raiseSimMonth <= duration) {
        salaryRaises.push({
          raiseId: toRaiseId(`RAISE-Y${yr}`),
          effectiveSimulationMonth: toSimulationMonth(raiseSimMonth),
          effectiveCalendarMonth: toCalendarMonth(1),
          effectiveCalendarYear: startYear + (yr - 1),
          targetPerson: TargetPerson.Both,
          percentageIncrease: rate,
          reason: `Annual Tariff / Merit Increase (+${annualSalaryRaisePercent.value}%)`,
        });
      }
    }
  }
  return salaryRaises;
}
export function createDefaultWorkingHoursChanges(): WorkingHoursChangeAction[] {
  const b1 = child1BirthMonth.value;
  const startYear = startCalendarYear.value;
  const startMonth = startCalendarMonth.value;

  const m19 = b1 + 2; // Wife post-birth part-time return
  const totalElapsed19 = startMonth - 1 + (m19 - 1);
  const calM19 = toCalendarMonth((totalElapsed19 % 12) + 1);
  const calY19 = startYear + Math.floor(totalElapsed19 / 12);

  const m31 = b1 + 14; // Husband parental hours (Partnerschaftsbonus window)
  const totalElapsed31 = startMonth - 1 + (m31 - 1);
  const calM31 = toCalendarMonth((totalElapsed31 % 12) + 1);
  const calY31 = startYear + Math.floor(totalElapsed31 / 12);

  return [
    {
      changeId: toHoursChangeId("HOURS-WIFE-RETURN"),
      effectiveSimulationMonth: toSimulationMonth(m19),
      effectiveCalendarMonth: calM19,
      effectiveCalendarYear: calY19,
      targetPerson: TargetPerson.Wife,
      weeklyHours: toWorkingHours(wifePostBirthHours.value ?? 24),
      reason:
        "Post-birth Part-time return (Partnerschaftsbonus § 4b BEEG eligible)",
    },
    {
      changeId: toHoursChangeId("HOURS-HUSBAND-BONUS"),
      effectiveSimulationMonth: toSimulationMonth(m31),
      effectiveCalendarMonth: calM31,
      effectiveCalendarYear: calY31,
      targetPerson: TargetPerson.Husband,
      weeklyHours: toWorkingHours(32),
      reason: "Parental leave reduction (24-32h Partnerschaftsbonus § 4b BEEG)",
    },
  ];
}

export function createDefaultFinancialEvents(): FinancialEventAction[] {
  const b1 = child1BirthMonth.value;
  const startYear = startCalendarYear.value;
  const startMonth = startCalendarMonth.value;

  const m17 = b1;
  const totalElapsed17 = startMonth - 1 + (m17 - 1);
  const calM17 = toCalendarMonth((totalElapsed17 % 12) + 1);
  const calY17 = startYear + Math.floor(totalElapsed17 / 12);

  const m26 = b1 + 9; // e.g. Kita entry
  const totalElapsed26 = startMonth - 1 + (m26 - 1);
  const calM26 = toCalendarMonth((totalElapsed26 % 12) + 1);
  const calY26 = startYear + Math.floor(totalElapsed26 / 12);

  return [
    {
      eventId: toFinancialEventId("FIN-CHILD1-EQUIPMENT"),
      effectiveSimulationMonth: toSimulationMonth(m17),
      effectiveCalendarMonth: calM17,
      effectiveCalendarYear: calY17,
      title: "Child #1 Initial Equipment (*Erstausstattung*)",
      amount: toEuroAmount(-1500),
      category: FinancialEventCategory.BabyEquipment,
      description:
        "Crib, stroller, car seat, changing table, and initial newborn essentials",
    },
    {
      eventId: toFinancialEventId("FIN-CHILD1-KITA-DEPOSIT"),
      effectiveSimulationMonth: toSimulationMonth(26),
      effectiveCalendarMonth: calM26,
      effectiveCalendarYear: calY26,
      title: "Kita Childcare Enrollment & Equipment (*Kita-Start*)",
      amount: toEuroAmount(-600),
      category: FinancialEventCategory.ChildcareFees,
      description:
        "One-off daycare entrance fee, activity deposit, and outdoor gear",
    },
  ];
}

// User-Defined Dynamic Action Collections (Initialized with persisted state or defaults)
export const customPregnancies = signal<PregnancyAction[]>(
  initialPersisted.customPregnancies &&
    initialPersisted.customPregnancies.length > 0
    ? (initialPersisted.customPregnancies as PregnancyAction[])
    : createDefaultPregnancies(),
);

export const customTaxClassSwitches = signal<TaxClassSwitchAction[]>(
  initialPersisted.customTaxClassSwitches &&
    initialPersisted.customTaxClassSwitches.length > 0
    ? (initialPersisted.customTaxClassSwitches as TaxClassSwitchAction[])
    : createDefaultTaxClassSwitches(),
);

export const customSalaryRaises = signal<SalaryRaiseAction[]>(
  initialPersisted.customSalaryRaises &&
    initialPersisted.customSalaryRaises.length > 0
    ? (initialPersisted.customSalaryRaises as SalaryRaiseAction[])
    : createDefaultSalaryRaises(),
);

export const customWorkingHoursChanges = signal<WorkingHoursChangeAction[]>(
  initialPersisted.customWorkingHoursChanges &&
    initialPersisted.customWorkingHoursChanges.length > 0
    ? (initialPersisted.customWorkingHoursChanges as WorkingHoursChangeAction[])
    : createDefaultWorkingHoursChanges(),
);

export const customFinancialEvents = signal<FinancialEventAction[]>(
  initialPersisted.customFinancialEvents &&
    initialPersisted.customFinancialEvents.length > 0
    ? (initialPersisted.customFinancialEvents as FinancialEventAction[])
    : createDefaultFinancialEvents(),
);

// Batch 1 Mutation Helpers
export function addPregnancyAction(action: PregnancyAction) {
  customPregnancies.value = [...customPregnancies.value, action];
}

export function updatePregnancyAction(
  pregnancyId: PregnancyId | string,
  updates: Partial<PregnancyAction>,
) {
  customPregnancies.value = customPregnancies.value.map((p) =>
    p.pregnancyId === pregnancyId ? { ...p, ...updates } : p,
  );
}

export function removePregnancyAction(pregnancyId: PregnancyId | string) {
  customPregnancies.value = customPregnancies.value.filter(
    (p) => p.pregnancyId !== pregnancyId,
  );
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
    s.switchId === switchId ? { ...s, ...updates } : s,
  );
}

export function removeTaxClassSwitchAction(switchId: SwitchId | string) {
  customTaxClassSwitches.value = customTaxClassSwitches.value.filter(
    (s) => s.switchId !== switchId,
  );
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
    r.raiseId === raiseId ? { ...r, ...updates } : r,
  );
}

export function removeSalaryRaiseAction(raiseId: RaiseId | string) {
  customSalaryRaises.value = customSalaryRaises.value.filter(
    (r) => r.raiseId !== raiseId,
  );
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
    h.changeId === changeId ? { ...h, ...updates } : h,
  );
}

export function removeWorkingHoursChangeAction(
  changeId: HoursChangeId | string,
) {
  customWorkingHoursChanges.value = customWorkingHoursChanges.value.filter(
    (h) => h.changeId !== changeId,
  );
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
    e.eventId === eventId ? { ...e, ...updates } : e,
  );
}

export function removeFinancialEventAction(eventId: FinancialEventId | string) {
  customFinancialEvents.value = customFinancialEvents.value.filter(
    (e) => e.eventId !== eventId,
  );
}

/**
 * Persists the entire reactive state of the simulator into localStorage.
 */
/**
 * Constructs the strongly-typed snapshot of the active simulation state.
 */
export function getCurrentPersistedState(): ElterngeldPersistedState {
  return {
    salaryInputMode: salaryInputMode.value,
    salaryPeriod: salaryPeriod.value,
    husbandGross: husbandGross.value,
    wifeGross: wifeGross.value,
    husbandHours: husbandHours.value,
    wifeInitialHours: wifeInitialHours.value,
    wifePostBirthHours: wifePostBirthHours.value,
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
): void {
  salaryInputMode.value = newState.salaryInputMode;
  salaryPeriod.value = newState.salaryPeriod;
  husbandGross.value = newState.husbandGross;
  wifeGross.value = newState.wifeGross;
  husbandHours.value = newState.husbandHours;
  wifeInitialHours.value = newState.wifeInitialHours;
  wifePostBirthHours.value = newState.wifePostBirthHours;
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

  activeScenario.value = newState.activeScenario;
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

  salaryInputMode.value = defaults.salaryInputMode;
  salaryPeriod.value = defaults.salaryPeriod;
  husbandGross.value = defaults.husbandGross;
  wifeGross.value = defaults.wifeGross;
  husbandHours.value = defaults.husbandHours;
  wifeInitialHours.value = defaults.wifeInitialHours;
  wifePostBirthHours.value = defaults.wifePostBirthHours;
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
    initialUseTaxFactor: useInitialTaxFactor.value,
    initialTaxFactor: derivedSpousalSet.value.taxFactor,
    annualBonusGross: toEuroAmount(annualBonusGross.value),
    annualBonusMonth: toCalendarMonth(annualBonusMonth.value),
    investmentReturnMonthly: toEuroAmount(investmentReturnMonthly.value),
    existingChildrenCount: 0,
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

// Computed results for all 3 scenarios
export const scenarioAData = computed(() => computeTimelineData(ScenarioId.A));
export const scenarioBData = computed(() => computeTimelineData(ScenarioId.B));
export const scenarioCData = computed(() => computeTimelineData(ScenarioId.C));

// Current active scenario data
export const currentScenarioData = computed(() => {
  const key = activeScenario.value;
  if (key === ScenarioId.A) return scenarioAData.value;
  if (key === ScenarioId.B) return scenarioBData.value;
  return scenarioCData.value;
});

// Comparison metrics (C vs B and C vs A)
export const comparisonMetrics = computed(() => {
  const a = scenarioAData.value.summary;
  const b = scenarioBData.value.summary;
  const c = scenarioCData.value.summary;

  return {
    gainCvsB: (c.grandTotal as number) - (b.grandTotal as number),
    benefitsGainCvsB: (c.totalBenefits as number) - (b.totalBenefits as number),
    taxRefundC: c.totalTaxRefunds,
    gainCvsA: (c.grandTotal as number) - (a.grandTotal as number),
    wifeEgGainCvsB:
      (c.totalWifeElterngeld as number) - (b.totalWifeElterngeld as number),
    mutterschutzGainCvsB:
      (c.totalMutterschutz as number) - (b.totalMutterschutz as number),
  };
});

// ============================================================================
// Legal Framework & Statutory Precedents Navigation
// ============================================================================

export const LegalRuleKey = {
  MuSchG_Maternity: "muschg-maternity",
  BEEG_TaxSwap: "beeg-tax-swap",
  BEEG_SyntheticNet: "beeg-synthetic-net",
  EStG_TaxSplitting: "estg-tax-splitting",
  BEEG_PartnershipBonus: "beeg-partnership-bonus",
  BEEG_SiblingBonus: "beeg-sibling-bonus",
  BEEG_Child2Dilution: "beeg-child2-dilution",
  EStG_Kindergeld: "estg-kindergeld",
} as const;

export type LegalRuleKeyType = (typeof LegalRuleKey)[keyof typeof LegalRuleKey];

export const activeLegalRuleKey = signal<LegalRuleKeyType>(
  LegalRuleKey.BEEG_TaxSwap,
);

export function scrollToLegalRule(ruleKey: LegalRuleKeyType): void {
  activeLegalRuleKey.value = ruleKey;
  if (typeof document !== "undefined") {
    const container = document.getElementById("statutory-legal-framework");
    if (container) {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}
