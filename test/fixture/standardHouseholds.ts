import {
  type PreexistingConditions,
  TaxClass,
  toNetSalary,
  toEuroAmount,
  toSimulationMonth,
  toCalendarMonth,
  toWorkingHours,
  toFullCalendarYear,
  toMonthDuration,
  toChildrenCount,
} from "#engine/types";

/** Explicit evidence for lifecycle-only tests; never a production default. */
export const lifecycleHouseholdTaxableIncome = Array.from({ length: 17 }, (_, index) => ({ calendarYear: toFullCalendarYear(2024 + index),
  taxableIncome: toEuroAmount(0) }));

/**
 * Standard test household parameter fixture used across multi-year scenarios,
 * stress-testing combinatorial grids, and benchmarks.
 */
export const standardHouseholdParams = {
  // Lifecycle-only fixture: cash nets explicitly stand in for unverified BEEG nets.
  assumeManualNetIsAssessmentNet: true,
  householdTaxableIncome: lifecycleHouseholdTaxableIncome,
  husbandClass3Net: toNetSalary(3184),
  husbandClass5Net: toNetSalary(2398),
  wifeClass5FullTimeNet: toNetSalary(1751),
  wifeClass3FullTimeNet: toNetSalary(2295),
  wifeClass5PartTimeNet: toNetSalary(1182),
  wifeClass3PartTimeNet: toNetSalary(1413),
  kindergeldPerChild: toEuroAmount(259),
  prePregnancyPlanningMonths: toMonthDuration(3),
  child1BirthMonth: toSimulationMonth(12),
  birthSpacingMonths: toMonthDuration(27),
  swapLeadMonths: toMonthDuration(7),
  enable13thSalary: true,
  bonus40Month: toCalendarMonth(5),
  bonus60Month: toCalendarMonth(11),
  taxReturnMonth: toCalendarMonth(3),
};

/**
 * Baseline preexisting conditions fixture for discrete multi-batch lifecycle testing.
 */
export const standardPreexistingConditions: PreexistingConditions = {
  // Lifecycle-only fixture: cash nets explicitly stand in for unverified BEEG nets.
  assumeManualNetIsAssessmentNet: true,
  householdTaxableIncome: lifecycleHouseholdTaxableIncome,
  startCalendarYear: toFullCalendarYear(2026),
  startCalendarMonth: toCalendarMonth(1),
  simulationDurationMonths: toMonthDuration(60),
  husbandInitialTaxClass: TaxClass.III,
  husbandInitialNet: toNetSalary(3184),
  husbandInitialClass5Net: toNetSalary(2398),
  husbandWeeklyHours: toWorkingHours(32),
  wifeInitialTaxClass: TaxClass.V,
  wifeInitialFullTimeNet: toNetSalary(1751),
  wifeInitialClass3FullTimeNet: toNetSalary(2295),
  wifeInitialPartTimeClass5Net: toNetSalary(1182),
  wifeInitialPartTimeClass3Net: toNetSalary(1413),
  wifeWeeklyHours: toWorkingHours(40),
  existingChildrenCount: toChildrenCount(0),
  kindergeldPerChild: toEuroAmount(259),
  enable13thSalary: true,
  bonus40Month: toCalendarMonth(5),
  bonus60Month: toCalendarMonth(11),
  taxReturnMonth: toCalendarMonth(3),
};
