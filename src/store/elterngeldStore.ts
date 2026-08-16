import { signal, computed } from '@preact/signals';
import { generateTimelineSimulation } from '../engine/simulator/timelineGenerator.ts';
import {
  toNetSalary,
  toEuroAmount,
  toSimulationMonth,
  toCalendarMonth,
  ScenarioId,
  type ScenarioId as ScenarioIdType
} from '../engine/types.ts';

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

// Timeline & Spacing Controls
export const prePregnancyPlanningMonths = signal(3); // Start 3 months before pregnancy
export const child1BirthMonth = signal(12); // Month 12 (3M pre-preg + 9M pregnancy)
export const birthSpacingMonths = signal(27); // Gap of 27 months -> Child 2 born at Month 39
export const swapLeadMonths = signal(7); // 7 months prior to Mutterschutz phase
export const preMutterschutzMonths = signal(1.5); // 6 weeks
export const postMutterschutzMonths = signal(2); // 8 weeks

// UI & View State
export const activeScenario = signal<string>(ScenarioId.C); // 'A', 'B', 'C', or 'compare'
export const chartMode = signal<string>('stacked_bar'); // 'stacked_bar', 'lines', 'area', 'compare'
export const timeRangeFilter = signal<string>('all'); // 'all', 'child1', 'child2', 'post'
export const hoveredMonth = signal<number | null>(null);

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

  prePregnancyPlanningMonths.value = 3;
  child1BirthMonth.value = 12;
  birthSpacingMonths.value = 27;
  swapLeadMonths.value = 7;
  preMutterschutzMonths.value = 1.5;
  postMutterschutzMonths.value = 2;
}

// 60-Month Cash Flow Engine for a given scenario ('A', 'B', or 'C')
export function computeTimelineData(scenarioKey: ScenarioIdType) {
  return generateTimelineSimulation({
    scenarioKey,
    husbandClass3Net: toNetSalary(husbandClass3Net.value),
    husbandClass5Net: toNetSalary(husbandClass5Net.value),
    wifeClass5FullTimeNet: toNetSalary(wifeClass5FullTimeNet.value),
    wifeClass3FullTimeNet: toNetSalary(wifeClass3FullTimeNet.value),
    wifeClass5PartTimeNet: toNetSalary(wifeClass5PartTimeNet.value),
    wifeClass3PartTimeNet: toNetSalary(wifeClass3PartTimeNet.value),
    kindergeldPerChild: toEuroAmount(kindergeldPerChild.value),
    prePregnancyPlanningMonths: prePregnancyPlanningMonths.value,
    child1BirthMonth: toSimulationMonth(child1BirthMonth.value),
    birthSpacingMonths: birthSpacingMonths.value,
    swapLeadMonths: swapLeadMonths.value,
    enable13thSalary: enable13thSalary.value,
    bonus40Month: toCalendarMonth(bonus40Month.value),
    bonus60Month: toCalendarMonth(bonus60Month.value),
    taxReturnMonth: toCalendarMonth(taxReturnMonth.value)
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
