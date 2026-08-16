import { signal, computed } from '@preact/signals';
import {
  type ScenarioId as ScenarioIdType,
  ScenarioId,
  TaxClass,
  TargetPerson,
  type PregnancyId,
  type SwitchId,
  type RaiseId,
  toNetSalary,
  toEuroAmount,
  toSimulationMonth,
  toCalendarMonth,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  type PreexistingConditions,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction
} from '#engine/types';
import { runScenarioBatches, calculateSimulationStartDate } from '#engine/simulator/timelineGenerator';

// Default Financial Parameters (The Sandbox)
export const husbandClass3Net = signal(2895);
export const husbandClass5Net = signal(2191);
export const husbandHours = signal(32);

export const wifeClass5FullTimeNet = signal(1975);
export const wifeClass3FullTimeNet = signal(2603);
export const wifeClass5PartTimeNet = signal(1328);
export const wifeClass3PartTimeNet = signal(1648);
export const wifeInitialHours = signal(40);
export const wifePostBirthHours = signal(24);

export const kindergeldPerChild = signal(259);

// Special Annual Events (13th Month Salary & Tax Return Timing)
export const enable13thSalary = signal(true);
export const bonus40Month = signal(5); // Month 4 or 5 of each year (40% Vacation Bonus / Urlaubsgeld)
export const bonus60Month = signal(11); // Month 10 or 11 of each year (60% Christmas Bonus / Weihnachtsgeld)
export const taxReturnMonth = signal(3); // Month 2 or 3 of each year (Annual Tax Return / Finanzamt-Erstattung)
export const showSpecialEventRows = signal(true); // Table display toggle

// Batch 3: Salary Raises & Career Progression Controls
export const enableSalaryRaises = signal(false);
export const annualSalaryRaisePercent = signal(0); // 0%, 2%, 3%, 5% annual raise

// Timeline & Calendar Simulation Controls
export const startCalendarYear = signal(2026); // Default 2026
export const startCalendarMonth = signal(1); // Default 1 (January)
export const simulationDurationMonths = signal(60); // Default 60 months (5 years)
export const prePregnancyPlanningMonths = signal(8); // Default 8 months planning -> Pregnancy starts in September 2026 (09.2026)
export const child1BirthMonth = signal(17); // Month 17 (05.2027 / 9 months pregnancy)
export const birthSpacingMonths = signal(27); // Gap of 27 months -> Child 2 born at Month 44
export const swapLeadMonths = signal(7); // 7 months prior to Mutterschutz phase
export const preMutterschutzMonths = signal(1.5); // 6 weeks
export const postMutterschutzMonths = signal(2); // 8 weeks

// UI & View State
export const activeScenario = signal<string>(ScenarioId.C); // 'A', 'B', 'C', or 'compare'
export const chartMode = signal<string>('stacked_bar'); // 'stacked_bar', 'lines', 'area', 'compare'
export const timeRangeFilter = signal<string>('all'); // 'all', 'child1', 'child2', 'post'
export const hoveredMonth = signal<number | null>(null);

/**
 * Sets the pregnancy 1 positive calendar date (year and month), automatically
 * calibrating the simulation start date (-3 months snapped to January of resulting year)
 * per statutory rules.
 */
export function setPregnancy1PositiveDate(year: number, month: number) {
  const result = calculateSimulationStartDate(year, month);
  startCalendarYear.value = result.startCalendarYear;
  startCalendarMonth.value = result.startCalendarMonth;
  prePregnancyPlanningMonths.value = result.prePregnancyPlanningMonths;
  child1BirthMonth.value = result.pregnancySimulationMonth + 8; // 9 months of pregnancy (delivery at Month + 8)
}

export function createDefaultPregnancies(): PregnancyAction[] {
  const startYear = startCalendarYear.value;
  const startMonth = startCalendarMonth.value;
  const b1 = child1BirthMonth.value;
  const spacing = birthSpacingMonths.value;
  const b2 = b1 + spacing;

  return [
    {
      pregnancyId: toPregnancyId('PREG-CHILD-1'),
      childIndex: 1,
      positiveTestCalendarMonth: toCalendarMonth(((startMonth - 1 + prePregnancyPlanningMonths.value) % 12) + 1),
      positiveTestCalendarYear: startYear + Math.floor((startMonth - 1 + prePregnancyPlanningMonths.value) / 12),
      positiveTestSimulationMonth: toSimulationMonth(prePregnancyPlanningMonths.value + 1),
      calculatedDeliverySimulationMonth: toSimulationMonth(b1),
      motherPostBirthPartTimeHours: toEuroAmount(wifePostBirthHours.value) as unknown as import('#engine/types').WorkingHours,
      motherPostBirthPartTimeClass5Net: toNetSalary(wifeClass5PartTimeNet.value),
      motherPostBirthPartTimeClass3Net: toNetSalary(wifeClass3PartTimeNet.value),
      fatherPartnerMonthsCount: 4
    },
    {
      pregnancyId: toPregnancyId('PREG-CHILD-2'),
      childIndex: 2,
      positiveTestCalendarMonth: toCalendarMonth(((startMonth - 1 + (b2 - 9)) % 12) + 1),
      positiveTestCalendarYear: startYear + Math.floor((startMonth - 1 + (b2 - 9)) / 12),
      positiveTestSimulationMonth: toSimulationMonth(b2 - 8),
      calculatedDeliverySimulationMonth: toSimulationMonth(b2),
      motherPostBirthPartTimeHours: toEuroAmount(wifePostBirthHours.value) as unknown as import('#engine/types').WorkingHours,
      motherPostBirthPartTimeClass5Net: toNetSalary(wifeClass5PartTimeNet.value),
      motherPostBirthPartTimeClass3Net: toNetSalary(wifeClass3PartTimeNet.value),
      fatherPartnerMonthsCount: 4
    }
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
      switchId: toSwitchId('SWAP-CHILD-1'),
      effectiveSimulationMonth: toSimulationMonth(swap1Start),
      effectiveCalendarMonth: toCalendarMonth(((startMonth - 1 + swap1Start - 1) % 12) + 1),
      effectiveCalendarYear: startYear + Math.floor((startMonth - 1 + swap1Start - 1) / 12),
      targetHusbandTaxClass: TaxClass.V,
      targetWifeTaxClass: TaxClass.III,
      statutoryReason: 'Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)',
      revertSimulationMonth: toSimulationMonth(b1)
    },
    {
      switchId: toSwitchId('SWAP-CHILD-2'),
      effectiveSimulationMonth: toSimulationMonth(swap2Start),
      effectiveCalendarMonth: toCalendarMonth(((startMonth - 1 + swap2Start - 1) % 12) + 1),
      effectiveCalendarYear: startYear + Math.floor((startMonth - 1 + swap2Start - 1) / 12),
      targetHusbandTaxClass: TaxClass.V,
      targetWifeTaxClass: TaxClass.III,
      statutoryReason: 'Optimize Child 2 Part-Time Elterngeld baseline (§ 2b BEEG)',
      revertSimulationMonth: toSimulationMonth(b2)
    }
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
          reason: `Annual Tariff / Merit Increase (+${annualSalaryRaisePercent.value}%)`
        });
      }
    }
  }
  return salaryRaises;
}

// User-Defined Dynamic Action Collections
export const customPregnancies = signal<PregnancyAction[]>(createDefaultPregnancies());
export const customTaxClassSwitches = signal<TaxClassSwitchAction[]>(createDefaultTaxClassSwitches());
export const customSalaryRaises = signal<SalaryRaiseAction[]>(createDefaultSalaryRaises());

// Batch 1 Mutation Helpers
export function addPregnancyAction(action: PregnancyAction) {
  customPregnancies.value = [...customPregnancies.value, action];
}

export function updatePregnancyAction(pregnancyId: PregnancyId | string, updates: Partial<PregnancyAction>) {
  customPregnancies.value = customPregnancies.value.map(p =>
    p.pregnancyId === pregnancyId ? { ...p, ...updates } : p
  );
}

export function removePregnancyAction(pregnancyId: PregnancyId | string) {
  customPregnancies.value = customPregnancies.value.filter(p => p.pregnancyId !== pregnancyId);
}

// Batch 2 Mutation Helpers
export function addTaxClassSwitchAction(action: TaxClassSwitchAction) {
  customTaxClassSwitches.value = [...customTaxClassSwitches.value, action];
}

export function updateTaxClassSwitchAction(switchId: SwitchId | string, updates: Partial<TaxClassSwitchAction>) {
  customTaxClassSwitches.value = customTaxClassSwitches.value.map(s =>
    s.switchId === switchId ? { ...s, ...updates } : s
  );
}

export function removeTaxClassSwitchAction(switchId: SwitchId | string) {
  customTaxClassSwitches.value = customTaxClassSwitches.value.filter(s => s.switchId !== switchId);
}

// Batch 3 Mutation Helpers
export function addSalaryRaiseAction(action: SalaryRaiseAction) {
  customSalaryRaises.value = [...customSalaryRaises.value, action];
}

export function updateSalaryRaiseAction(raiseId: RaiseId | string, updates: Partial<SalaryRaiseAction>) {
  customSalaryRaises.value = customSalaryRaises.value.map(r =>
    r.raiseId === raiseId ? { ...r, ...updates } : r
  );
}

export function removeSalaryRaiseAction(raiseId: RaiseId | string) {
  customSalaryRaises.value = customSalaryRaises.value.filter(r => r.raiseId !== raiseId);
}

export function resetToDefaults() {
  husbandClass3Net.value = 2895;
  husbandClass5Net.value = 2191;
  husbandHours.value = 32;

  wifeClass5FullTimeNet.value = 1975;
  wifeClass3FullTimeNet.value = 2603;
  wifeClass5PartTimeNet.value = 1328;
  wifeClass3PartTimeNet.value = 1648;
  wifeInitialHours.value = 40;
  wifePostBirthHours.value = 24;

  kindergeldPerChild.value = 259;
  enable13thSalary.value = true;
  bonus40Month.value = 5;
  bonus60Month.value = 11;
  taxReturnMonth.value = 3;
  showSpecialEventRows.value = true;

  enableSalaryRaises.value = false;
  annualSalaryRaisePercent.value = 0;

  startCalendarYear.value = 2026;
  startCalendarMonth.value = 1;
  simulationDurationMonths.value = 60;
  prePregnancyPlanningMonths.value = 8;
  child1BirthMonth.value = 17;
  birthSpacingMonths.value = 27;
  swapLeadMonths.value = 7;
  preMutterschutzMonths.value = 1.5;
  postMutterschutzMonths.value = 2;

  customPregnancies.value = createDefaultPregnancies();
  customTaxClassSwitches.value = createDefaultTaxClassSwitches();
  customSalaryRaises.value = createDefaultSalaryRaises();
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
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: toNetSalary(husbandClass3Net.value),
    husbandInitialClass5Net: toNetSalary(husbandClass5Net.value),
    husbandWeeklyHours: toEuroAmount(husbandHours.value) as unknown as import('#engine/types').WorkingHours,
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: toNetSalary(wifeClass5FullTimeNet.value),
    wifeInitialClass3FullTimeNet: toNetSalary(wifeClass3FullTimeNet.value),
    wifeInitialPartTimeClass5Net: toNetSalary(wifeClass5PartTimeNet.value),
    wifeInitialPartTimeClass3Net: toNetSalary(wifeClass3PartTimeNet.value),
    wifeWeeklyHours: toEuroAmount(wifeInitialHours.value) as unknown as import('#engine/types').WorkingHours,
    existingChildrenCount: 0,
    kindergeldPerChild: toEuroAmount(kindergeldPerChild.value),
    enable13thSalary: enable13thSalary.value,
    bonus40Month: toCalendarMonth(bonus40Month.value),
    bonus60Month: toCalendarMonth(bonus60Month.value),
    taxReturnMonth: toCalendarMonth(taxReturnMonth.value)
  };

  return runScenarioBatches({
    scenarioKey,
    preexisting,
    pregnancies: customPregnancies.value,
    taxClassSwitches: customTaxClassSwitches.value,
    salaryRaises: customSalaryRaises.value
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
    wifeEgGainCvsB: (c.totalWifeElterngeld as number) - (b.totalWifeElterngeld as number),
    mutterschutzGainCvsB: (c.totalMutterschutz as number) - (b.totalMutterschutz as number)
  };
});
