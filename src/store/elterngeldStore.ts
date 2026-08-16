import { signal, computed } from '@preact/signals';
import {
  type ScenarioId as ScenarioIdType,
  ScenarioId,
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
  toFinancialEventId,
  toSalaryInputMode,
  toSalaryPeriod,
  type PreexistingConditions,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction,
  type FinancialEventAction,
  type GrossToNetBreakdown,
  type SpousalGrossToNetSet
} from '#engine/types';
import { runScenarioBatches, calculateSimulationStartDate } from '#engine/simulator/timelineGenerator';
import { deriveSpousalNetSalaries, computeGrossToNetBreakdown } from '#engine/tax/wageTax';

// Input Mode (Gross vs Net Mode) & Period (Monthly vs Yearly)
export const salaryInputMode = signal<SalaryInputMode>(SalaryInputMode.Gross);
export const salaryPeriod = signal<SalaryPeriod>(SalaryPeriod.Monthly);
export const husbandGross = signal<number>(4500);
export const wifeGross = signal<number>(3000);

export const husbandGrossYearly = computed(() => (husbandGross.value || 0) * 12);
export const wifeGrossYearly = computed(() => (wifeGross.value || 0) * 12);

// Default Financial Parameters (The Sandbox)
export const husbandClass3Net = signal(3184);
export const husbandClass5Net = signal(2398);
export const husbandHours = signal(32);

export const wifeInitialHours = signal(40);
export const wifePostBirthHours = signal(24);
export const wifeClass5FullTimeNet = signal(1975);
export const wifeClass3FullTimeNet = signal(2603);

export function syncGrossToNet() {
  if (salaryInputMode.value === SalaryInputMode.Gross) {
    const spousal = deriveSpousalNetSalaries(
      toGrossSalary(Math.max(0, husbandGross.value || 0)),
      toGrossSalary(Math.max(0, wifeGross.value || 0)),
      toWorkingHours(wifePostBirthHours.value || 24),
      toWorkingHours(wifeInitialHours.value || 40),
      0
    );
    husbandClass3Net.value = spousal.husbandClass3Net as number;
    husbandClass5Net.value = spousal.husbandClass5Net as number;
    wifeClass5FullTimeNet.value = spousal.wifeClass5FullTimeNet as number;
    wifeClass3FullTimeNet.value = spousal.wifeClass3FullTimeNet as number;
  }
}

export function setHusbandGross(gross: number) {
  husbandGross.value = gross;
  syncGrossToNet();
}

export function setWifeGross(gross: number) {
  wifeGross.value = gross;
  syncGrossToNet();
}

export function setHusbandGrossYearly(yearly: number) {
  setHusbandGross(Math.round(yearly / 12));
}

export function setWifeGrossYearly(yearly: number) {
  setWifeGross(Math.round(yearly / 12));
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
    toGrossSalary(Math.max(0, husbandGross.value || 0)),
    toGrossSalary(Math.max(0, wifeGross.value || 0)),
    toWorkingHours(wifePostBirthHours.value || 24),
    toWorkingHours(wifeInitialHours.value || 40),
    0
  );
});

export const wifeClass5PartTimeNet = computed(() => {
  if (salaryInputMode.value === SalaryInputMode.Gross) {
    return derivedSpousalSet.value.wifeClass5PartTimeNet as number;
  }
  const ft = wifeClass5FullTimeNet.value;
  const initH = wifeInitialHours.value || 40;
  const pbH = wifePostBirthHours.value;
  const ratio = Math.max(0, pbH / initH);
  return Math.round(ft * ratio);
});

export const wifeClass3PartTimeNet = computed(() => {
  if (salaryInputMode.value === SalaryInputMode.Gross) {
    return derivedSpousalSet.value.wifeClass3PartTimeNet as number;
  }
  const ft = wifeClass3FullTimeNet.value;
  const initH = wifeInitialHours.value || 40;
  const pbH = wifePostBirthHours.value;
  const ratio = Math.max(0, pbH / initH);
  return Math.round(ft * ratio);
});

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
      motherPostBirthPartTimeHours: toWorkingHours(wifePostBirthHours.value),
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
      motherPostBirthPartTimeHours: toWorkingHours(wifePostBirthHours.value),
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

export function createDefaultFinancialEvents(): FinancialEventAction[] {
  const b1 = child1BirthMonth.value;
  const startYear = startCalendarYear.value;
  const startMonth = startCalendarMonth.value;

  const m17 = b1;
  const totalElapsed17 = (startMonth - 1) + (m17 - 1);
  const calM17 = toCalendarMonth((totalElapsed17 % 12) + 1);
  const calY17 = startYear + Math.floor(totalElapsed17 / 12);

  const m26 = b1 + 9; // e.g. Kita entry
  const totalElapsed26 = (startMonth - 1) + (m26 - 1);
  const calM26 = toCalendarMonth((totalElapsed26 % 12) + 1);
  const calY26 = startYear + Math.floor(totalElapsed26 / 12);

  return [
    {
      eventId: toFinancialEventId('FIN-CHILD1-EQUIPMENT'),
      effectiveSimulationMonth: toSimulationMonth(m17),
      effectiveCalendarMonth: calM17,
      effectiveCalendarYear: calY17,
      title: 'Child #1 Initial Equipment (*Erstausstattung*)',
      amount: toEuroAmount(-1500),
      category: FinancialEventCategory.BabyEquipment,
      description: 'Crib, stroller, car seat, changing table, and initial newborn essentials'
    },
    {
      eventId: toFinancialEventId('FIN-CHILD1-KITA-DEPOSIT'),
      effectiveSimulationMonth: toSimulationMonth(m26),
      effectiveCalendarMonth: calM26,
      effectiveCalendarYear: calY26,
      title: 'Kita Childcare Enrollment & Equipment (*Kita-Start*)',
      amount: toEuroAmount(-600),
      category: FinancialEventCategory.ChildcareFees,
      description: 'One-off daycare entrance fee, activity deposit, and outdoor gear'
    }
  ];
}

// User-Defined Dynamic Action Collections
export const customPregnancies = signal<PregnancyAction[]>(createDefaultPregnancies());
export const customTaxClassSwitches = signal<TaxClassSwitchAction[]>(createDefaultTaxClassSwitches());
export const customSalaryRaises = signal<SalaryRaiseAction[]>(createDefaultSalaryRaises());
export const customFinancialEvents = signal<FinancialEventAction[]>(createDefaultFinancialEvents());

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

// Batch 4 Mutation Helpers
export function addFinancialEventAction(action: FinancialEventAction) {
  customFinancialEvents.value = [...customFinancialEvents.value, action];
}

export function updateFinancialEventAction(eventId: FinancialEventId | string, updates: Partial<FinancialEventAction>) {
  customFinancialEvents.value = customFinancialEvents.value.map(e =>
    e.eventId === eventId ? { ...e, ...updates } : e
  );
}

export function removeFinancialEventAction(eventId: FinancialEventId | string) {
  customFinancialEvents.value = customFinancialEvents.value.filter(e => e.eventId !== eventId);
}

export function resetToDefaults() {
  husbandClass3Net.value = 2895;
  husbandClass5Net.value = 2191;
  husbandHours.value = 32;

  wifeClass5FullTimeNet.value = 1975;
  wifeClass3FullTimeNet.value = 2603;
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
  customFinancialEvents.value = createDefaultFinancialEvents();
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
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: toNetSalary(husbandClass3Net.value),
    husbandInitialClass5Net: toNetSalary(husbandClass5Net.value),
    husbandWeeklyHours: toWorkingHours(husbandHours.value),
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: toNetSalary(wifeClass5FullTimeNet.value),
    wifeInitialClass3FullTimeNet: toNetSalary(wifeClass3FullTimeNet.value),
    wifeInitialPartTimeClass5Net: toNetSalary(wifeClass5PartTimeNet.value),
    wifeInitialPartTimeClass3Net: toNetSalary(wifeClass3PartTimeNet.value),
    wifeWeeklyHours: toWorkingHours(wifeInitialHours.value),
    existingChildrenCount: 0,
    kindergeldPerChild: toEuroAmount(kindergeldPerChild.value),
    enable13thSalary: enable13thSalary.value,
    bonus40Month: toCalendarMonth(bonus40Month.value),
    bonus60Month: toCalendarMonth(bonus60Month.value),
    taxReturnMonth: toCalendarMonth(taxReturnMonth.value)
  };

  const dynamicPregnancies = customPregnancies.value.map(p => ({
    ...p,
    motherPostBirthPartTimeHours: toWorkingHours(wifePostBirthHours.value),
    motherPostBirthPartTimeClass5Net: toNetSalary(wifeClass5PartTimeNet.value),
    motherPostBirthPartTimeClass3Net: toNetSalary(wifeClass3PartTimeNet.value)
  }));

  return runScenarioBatches({
    scenarioKey,
    preexisting,
    pregnancies: dynamicPregnancies,
    taxClassSwitches: customTaxClassSwitches.value,
    salaryRaises: customSalaryRaises.value,
    financialEvents: customFinancialEvents.value
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

// ============================================================================
// Legal Framework & Statutory Precedents Navigation
// ============================================================================

export const LegalRuleKey = {
  MuSchG_Maternity: 'muschg-maternity',
  BEEG_TaxSwap: 'beeg-tax-swap',
  BEEG_SyntheticNet: 'beeg-synthetic-net',
  EStG_TaxSplitting: 'estg-tax-splitting',
  BEEG_PartnershipBonus: 'beeg-partnership-bonus',
  BEEG_SiblingBonus: 'beeg-sibling-bonus',
  BEEG_Child2Dilution: 'beeg-child2-dilution',
  EStG_Kindergeld: 'estg-kindergeld'
} as const;

export type LegalRuleKeyType = typeof LegalRuleKey[keyof typeof LegalRuleKey];

export const activeLegalRuleKey = signal<LegalRuleKeyType>(LegalRuleKey.BEEG_TaxSwap);

export function scrollToLegalRule(ruleKey: LegalRuleKeyType): void {
  activeLegalRuleKey.value = ruleKey;
  if (typeof document !== 'undefined') {
    const container = document.getElementById('statutory-legal-framework');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
