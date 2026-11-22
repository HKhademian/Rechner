import {
  type FullCalendarYear,
  type IsoCalendarDate,
  type MonthId,
  formatGermanDate,
  toFullCalendarYear,
  toIsoCalendarDate,
} from "#engine/types";
import {
  addCalendarDays,
  buildIsoDate,
  daysInCalendarMonth,
  diffCalendarDays,
  evaluateMutterschutzWindowFormula,
  listCalendarMonthsOverlappingInterval,
  listFullCalendarMonthsInsideInterval,
  parseIsoDateParts,
} from "#engine/formulas/pure/maternityAndLifeMonthFormulas";

/**
 * Tier 1 Pure Mathematical Vacation Accrual, § 17 BEEG Reduction & Carryover
 * Optimization Formulas (Context-Unaware).
 *
 * Statutory basis:
 * - § 24 Satz 1 MuSchG: Mutterschutz counts 100% as full employment time for vacation accrual.
 * - § 17 Abs. 1 Satz 1 BEEG: Employer may reduce annual vacation by 1/12 ONLY for each
 *   FULL calendar month of zero-hours (non-working) Elternzeit. Partial boundary months
 *   and part-time work during Elternzeit (§ 17 Abs. 1 Satz 2 BEEG) CANNOT be cut.
 * - § 17 Abs. 2 BEEG & § 24 Satz 2 MuSchG: Unused pre-leave vacation carries over until
 *   31.12 of the calendar year FOLLOWING the end of Elternzeit (extended if chained into Child 2).
 * - § 17 Abs. 4 BEEG: If vacation already taken before leave exceeds post-cut annual entitlement,
 *   excess days may be deducted from the FOLLOWING year's vacation (zero cash clawback).
 */

export interface ParentalLeaveVacationInputs {
  /** Contractual annual vacation entitlement in working days (e.g. 28 or 30). */
  readonly annualVacationDays: number;
  /** Exact expected due date / birth date (`YYYY-MM-DD`). */
  readonly expectedDueDate: IsoCalendarDate;
  /** True for multiples/twins or premature birth (84 post-birth Mutterschutz days instead of 56). */
  readonly isMultipleOrPrematureBirth?: boolean;
  /** Optional explicit start date of 0h Elternzeit (defaults to day after Mutterschutz ends). */
  readonly fullElternzeitStartDate?: IsoCalendarDate;
  /** Last inclusive day of 0h full Elternzeit (day BEFORE returning to work or part-time Elternzeit). */
  readonly fullElternzeitEndDate?: IsoCalendarDate;
  /** Working vacation days consumed before Mutterschutz in the birth calendar year. */
  readonly vacationDaysTakenPreLeave?: number;
  /** Optional end date of a directly chained second Elternzeit (extends § 17 Abs. 2 carryover expiry). */
  readonly chainedNextElternzeitEndDate?: IsoCalendarDate;
}

export interface AnnualVacationEntitlementBreakdown {
  readonly calendarYear: FullCalendarYear;
  readonly contractualAnnualDays: number;
  readonly fullElternzeitMonthsCut: number;
  readonly cutMonthIds: readonly MonthId[];
  readonly protectedBoundaryMonthIds: readonly MonthId[];
  /** Exact § 17 Abs. 1 BEEG 1/12 reduction (`contractualAnnualDays * fullMonths / 12`, rounded to 2 decimals). */
  readonly statutoryReductionDays: number;
  /** Post-cut entitlement (`contractualAnnualDays - statutoryReductionDays`). */
  readonly entitledDaysAfterCut: number;
}

export interface VacationMonthEndOptimizationHint {
  /** True when ending full Elternzeit on the last day of a calendar month causes an extra 1/12 cut. */
  readonly hasMonthEndTrap: boolean;
  /** True when the user's leave end date already falls strictly before month-end, saving 1/12. */
  readonly isMonthEndOptimized: boolean;
  /** Exact vacation days saved (or savable) by ending full Elternzeit before month-end (`annualVacationDays / 12`). */
  readonly vacationDaysDelta: number;
  /** Recommended return-to-work date avoiding the final calendar month cut (or current safe date). */
  readonly recommendedReturnDate: IsoCalendarDate;
  readonly explanation: string;
}

export interface ParentalLeaveVacationResult {
  readonly annualVacationDays: number;
  readonly mutterschutzStart: IsoCalendarDate;
  readonly mutterschutzEnd: IsoCalendarDate;
  readonly fullElternzeitStartDate: IsoCalendarDate;
  readonly fullElternzeitEndDate: IsoCalendarDate;
  readonly returnToWorkDate: IsoCalendarDate;
  readonly hasZeroHoursElternzeit: boolean;
  readonly totalFullCalendarMonthsCut: number;
  readonly totalStatutoryReductionDays: number;
  readonly yearlyBreakdowns: readonly AnnualVacationEntitlementBreakdown[];
  readonly birthYearEntitledDaysAfterCut: number;
  readonly vacationDaysTakenPreLeave: number;
  /** Remaining unused birth-year vacation days carried over under § 17 Abs. 2 BEEG / § 24 Satz 2 MuSchG. */
  readonly remainingUnusedCarryoverDays: number;
  /** Excess days consumed before leave that employer may deduct from next year's vacation (§ 17 Abs. 4 BEEG; zero cash repayment). */
  readonly birthYearOverusedDays: number;
  /** Legal expiry date (`YYYY-12-31`) for unused carried-over vacation days. */
  readonly carryoverExpiryDate: IsoCalendarDate;
  readonly monthEndOptimization: VacationMonthEndOptimizationHint;
}

function roundTwoDecimals(value: number): number {
  return Math.round(value * 100 + Number.EPSILON * value * 100) / 100;
}

/**
 * Evaluates statutory vacation accrual, § 17 Abs. 1 BEEG full-calendar-month cuts,
 * § 17 Abs. 2 carryover expiry, § 17 Abs. 4 over-usage, and month-end return optimization.
 */
export function evaluateParentalLeaveVacationFormula(
  inputs: Readonly<ParentalLeaveVacationInputs>,
): ParentalLeaveVacationResult {
  if (!Number.isFinite(inputs.annualVacationDays) || inputs.annualVacationDays < 0 || inputs.annualVacationDays > 60) {
    throw new TypeError("annualVacationDays must be between 0 and 60.");
  }
  const takenPreLeave = inputs.vacationDaysTakenPreLeave ?? 0;
  if (!Number.isFinite(takenPreLeave) || takenPreLeave < 0 || takenPreLeave > 60) {
    throw new TypeError("vacationDaysTakenPreLeave must be between 0 and 60.");
  }

  const mutterschutz = evaluateMutterschutzWindowFormula({
    expectedDueDate: toIsoCalendarDate(inputs.expectedDueDate),
    isMultipleOrPrematureBirth: inputs.isMultipleOrPrematureBirth,
  });

  const fullElternzeitStartDate = inputs.fullElternzeitStartDate
    ? toIsoCalendarDate(inputs.fullElternzeitStartDate)
    : mutterschutz.firstElternzeitDay;

  const fullElternzeitEndDate = inputs.fullElternzeitEndDate
    ? toIsoCalendarDate(inputs.fullElternzeitEndDate)
    : addCalendarDays(fullElternzeitStartDate, -1);

  const hasZeroHoursElternzeit =
    diffCalendarDays(fullElternzeitStartDate, fullElternzeitEndDate) >= 0;
  const returnToWorkDate = hasZeroHoursElternzeit
    ? addCalendarDays(fullElternzeitEndDate, 1)
    : mutterschutz.firstElternzeitDay;

  const birthYear = parseIsoDateParts(mutterschutz.expectedDueDate).year;
  const fullCutMonths = hasZeroHoursElternzeit
    ? listFullCalendarMonthsInsideInterval(fullElternzeitStartDate, fullElternzeitEndDate)
    : [];
  const allOverlappingMonths = hasZeroHoursElternzeit
    ? listCalendarMonthsOverlappingInterval(fullElternzeitStartDate, fullElternzeitEndDate)
    : [];

  const fullCutMonthIdSet = new Set<string>(fullCutMonths.map((m) => m.monthId));
  const yearsSet = new Set<FullCalendarYear>([birthYear]);
  for (const m of allOverlappingMonths) {
    yearsSet.add(m.year);
  }
  const sortedYears = [...yearsSet].sort((a, b) => a - b);

  let totalStatutoryReductionDays = 0;
  const yearlyBreakdowns: AnnualVacationEntitlementBreakdown[] = sortedYears.map((year) => {
    const cutMonths = fullCutMonths.filter((m) => m.year === year);
    const boundaryMonths = allOverlappingMonths
      .filter((m) => m.year === year && !fullCutMonthIdSet.has(m.monthId))
      .map((m) => m.monthId);
    const reduction = roundTwoDecimals((inputs.annualVacationDays * cutMonths.length) / 12);
    const entitled = roundTwoDecimals(Math.max(0, inputs.annualVacationDays - reduction));
    totalStatutoryReductionDays = roundTwoDecimals(totalStatutoryReductionDays + reduction);
    return Object.freeze({
      calendarYear: year,
      contractualAnnualDays: inputs.annualVacationDays,
      fullElternzeitMonthsCut: cutMonths.length,
      cutMonthIds: Object.freeze(cutMonths.map((m) => m.monthId)),
      protectedBoundaryMonthIds: Object.freeze(boundaryMonths),
      statutoryReductionDays: reduction,
      entitledDaysAfterCut: entitled,
    });
  });

  const birthYearBreakdown = yearlyBreakdowns.find((b) => b.calendarYear === birthYear)!;
  const birthYearEntitledDaysAfterCut = birthYearBreakdown.entitledDaysAfterCut;
  const remainingUnusedCarryoverDays = roundTwoDecimals(
    Math.max(0, birthYearEntitledDaysAfterCut - takenPreLeave),
  );
  const birthYearOverusedDays = roundTwoDecimals(
    Math.max(0, takenPreLeave - birthYearEntitledDaysAfterCut),
  );

  // § 17 Abs. 2 BEEG: expiry is 31.12 of the calendar year FOLLOWING the end of Elternzeit
  const effectiveEndForCarryover = inputs.chainedNextElternzeitEndDate
    ? toIsoCalendarDate(inputs.chainedNextElternzeitEndDate)
    : hasZeroHoursElternzeit
      ? fullElternzeitEndDate
      : mutterschutz.postBirthEnd;
  const carryoverEndYear = parseIsoDateParts(effectiveEndForCarryover).year;
  const carryoverExpiryDate = buildIsoDate(toFullCalendarYear(carryoverEndYear + 1), 12, 31);

  // Month-end return optimization analysis (§ 17 Abs. 1 BEEG)
  const oneMonthSliceDays = roundTwoDecimals(inputs.annualVacationDays / 12);
  let monthEndOptimization: VacationMonthEndOptimizationHint;

  if (!hasZeroHoursElternzeit) {
    monthEndOptimization = Object.freeze({
      hasMonthEndTrap: false,
      isMonthEndOptimized: true,
      vacationDaysDelta: 0,
      recommendedReturnDate: returnToWorkDate,
      explanation:
        "No full-calendar-month 0h Elternzeit scheduled — 100% of annual vacation accrues under § 24 MuSchG and § 17 Abs. 1 Satz 2 BEEG.",
    });
  }
  else {
    const endParts = parseIsoDateParts(fullElternzeitEndDate);
    const lastDayOfEndMonth = daysInCalendarMonth(endParts.year, endParts.month);
    const endMonthIsFullCut = fullCutMonthIdSet.has(
      allOverlappingMonths[allOverlappingMonths.length - 1]?.monthId ?? "",
    );

    if (endParts.day === lastDayOfEndMonth && endMonthIsFullCut) {
      const earlierReturnDate = fullElternzeitEndDate; // returning on the last day of the month breaks the full-month cut
      monthEndOptimization = Object.freeze({
        hasMonthEndTrap: true,
        isMonthEndOptimized: false,
        vacationDaysDelta: oneMonthSliceDays,
        recommendedReturnDate: earlierReturnDate,
        explanation:
          `Full 0h Elternzeit ends on month-end (${formatGermanDate(fullElternzeitEndDate)}), triggering an extra 1/12 vacation cut (-${oneMonthSliceDays} days). Ending full leave ≥1 day earlier (returning ${formatGermanDate(earlierReturnDate)} or at your Life-Month boundary) saves +${oneMonthSliceDays} paid vacation days under § 17 Abs. 1 BEEG.`,
      });
    }
    else {
      monthEndOptimization = Object.freeze({
        hasMonthEndTrap: false,
        isMonthEndOptimized: true,
        vacationDaysDelta: oneMonthSliceDays,
        recommendedReturnDate: returnToWorkDate,
        explanation:
          `Returning on ${formatGermanDate(returnToWorkDate)} breaks the final calendar month of 0h Elternzeit — automatically saving +${oneMonthSliceDays} paid vacation days under § 17 Abs. 1 BEEG.`,
      });
    }
  }

  return Object.freeze({
    annualVacationDays: inputs.annualVacationDays,
    mutterschutzStart: mutterschutz.preBirthStart,
    mutterschutzEnd: mutterschutz.postBirthEnd,
    fullElternzeitStartDate,
    fullElternzeitEndDate,
    returnToWorkDate,
    hasZeroHoursElternzeit,
    totalFullCalendarMonthsCut: fullCutMonths.length,
    totalStatutoryReductionDays,
    yearlyBreakdowns: Object.freeze(yearlyBreakdowns),
    birthYearEntitledDaysAfterCut,
    vacationDaysTakenPreLeave: takenPreLeave,
    remainingUnusedCarryoverDays,
    birthYearOverusedDays,
    carryoverExpiryDate,
    monthEndOptimization,
  });
}
