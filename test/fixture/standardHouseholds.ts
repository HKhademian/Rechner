import {
  TaxClass,
  toNetSalary,
  toEuroAmount,
  toSimulationMonth,
  toCalendarMonth,
  toWorkingHours,
  toFullCalendarYear,
  type PreexistingConditions,
} from "#engine/types";

/**
 * Standard test household parameter fixture used across multi-year scenarios,
 * stress-testing combinatorial grids, and benchmarks.
 */
export const standardHouseholdParams = {
  husbandClass3Net: toNetSalary(2895),
  husbandClass5Net: toNetSalary(2191),
  wifeClass5FullTimeNet: toNetSalary(1975),
  wifeClass3FullTimeNet: toNetSalary(2603),
  wifeClass5PartTimeNet: toNetSalary(1328),
  wifeClass3PartTimeNet: toNetSalary(1648),
  kindergeldPerChild: toEuroAmount(259),
  prePregnancyPlanningMonths: 3,
  child1BirthMonth: toSimulationMonth(12),
  birthSpacingMonths: 27,
  swapLeadMonths: 7,
  enable13thSalary: true,
  bonus40Month: toCalendarMonth(5),
  bonus60Month: toCalendarMonth(11),
  taxReturnMonth: toCalendarMonth(3),
};

/**
 * Baseline preexisting conditions fixture for discrete multi-batch lifecycle testing.
 */
export const standardPreexistingConditions: PreexistingConditions = {
  startCalendarYear: toFullCalendarYear(2026),
  startCalendarMonth: toCalendarMonth(1),
  simulationDurationMonths: 60,
  husbandInitialTaxClass: TaxClass.III,
  husbandInitialNet: toNetSalary(2895),
  husbandInitialClass5Net: toNetSalary(2191),
  husbandWeeklyHours: toWorkingHours(32),
  wifeInitialTaxClass: TaxClass.V,
  wifeInitialFullTimeNet: toNetSalary(1975),
  wifeInitialClass3FullTimeNet: toNetSalary(2603),
  wifeInitialPartTimeClass5Net: toNetSalary(1328),
  wifeInitialPartTimeClass3Net: toNetSalary(1648),
  wifeWeeklyHours: toWorkingHours(40),
  existingChildrenCount: 0,
  kindergeldPerChild: toEuroAmount(259),
  enable13thSalary: true,
  bonus40Month: toCalendarMonth(5),
  bonus60Month: toCalendarMonth(11),
  taxReturnMonth: toCalendarMonth(3),
};
