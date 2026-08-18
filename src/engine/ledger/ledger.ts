/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Monthly Ledger Engine
 *
 * Implements monthly chronological ledger entry construction, multi-stream cash flow aggregation,
 * and immutable running cumulative total calculations with strict invariant enforcement.
 */

import {
  type SimulationMonth,
  type CalendarYear,
  type CalendarMonth,
  type MonthId,
  type MonthRef,
  type MonthSimRef,
  type FullCalendarYear,
  type CalendarLabel,
  type EuroAmount,
  type MonthlyLedgerEntry,
  type AccountingTransaction,
  type SpecialEventItem,
  toEuroAmount,
  toFullCalendarYear,
  toCalendarLabel,
  toMonthId,
  toMonthRef,
  toMonthSimRef,
  type ActionRowItem,
} from "#engine/types";

/**
 * Raw Input Specification for Monthly Ledger Calculation.
 * Supplies discrete income components, benefit disbursements, special events, and phase tags.
 */
export interface LedgerMonthInput {
  /** Absolute calendar month identifier (e.g. 'M09.2027'). */
  readonly monthId: MonthId;
  /** Statutory relative month reference notation (e.g. 'M9 (Birth 1)'). */
  readonly monthRef?: MonthRef;
  /** Simulation start relative reference (e.g. 'Sim21'). */
  readonly monthSimRef?: MonthSimRef;
  /** 1-based chronological simulation month index (1..120). */
  readonly month: SimulationMonth;
  /** 1-based simulation horizon year index (1..10). */
  readonly year: CalendarYear;
  /** Month index within the simulation year (1..12). */
  readonly monthInYear: CalendarMonth;
  /** 4-digit Gregorian calendar year (e.g. 2027). */
  readonly calendarYearNum: FullCalendarYear;
  /** 1-based Gregorian calendar month (1..12). */
  readonly calendarMonthNum: CalendarMonth;
  /** Formatted calendar label (e.g. '09.2027'). */
  readonly calendarLabel: CalendarLabel;
  /** Relative birth timing reference label (e.g. 'Birth 1 + 3M'). */
  readonly relativeBirthLabel: string;
  /** Display relative month reference. */
  readonly relativeMonthLabel?: MonthRef;
  /** Relative month signed integer offset from first pregnancy positive test. */
  readonly relativeMonthIndex?: number;
  /** Husband's earned monthly take-home net salary in EUR. */
  readonly husbandSalary: EuroAmount;
  /** Wife's earned monthly take-home net salary in EUR. */
  readonly wifeSalary: EuroAmount;
  /** Maternity protection wage replacement benefit under §§ 19, 20 MuSchG. */
  readonly mutterschutz: EuroAmount;
  /** Mother's parental allowance under §§ 4, 4a BEEG. */
  readonly wifeElterngeld: EuroAmount;
  /** Father's parental allowance under §§ 4, 4a BEEG. */
  readonly husbandElterngeld: EuroAmount;
  /** Monthly statutory child benefit under § 66 EStG (Kindergeld). */
  readonly kindergeld: EuroAmount;
  /** Annual income tax return refund under § 26b, § 46 EStG. */
  readonly taxRefund: EuroAmount;
  /** Mid-year 40% 13th salary bonus payment in EUR. */
  readonly bonus40Amount: EuroAmount;
  /** Year-end 60% 13th salary bonus payment in EUR. */
  readonly bonus60Amount: EuroAmount;
  /** Discrete special life, bonus, or tax refund sub-row items occurring in this month. */
  readonly specialEvents: readonly SpecialEventItem[];
  /** Action milestones scheduled to take effect immediately prior to this month. */
  readonly startingActions?: readonly ActionRowItem[];
  /** Active tax class configuration label (e.g. 'III / V'). */
  readonly taxClassLabel: string;
  /** Current family life cycle phase description (e.g. 'Parental Leave 1'). */
  readonly phaseLabel: string;
  /** Visual event tag label for timeline markers, or null if standard month. */
  readonly eventTag: string | null;
  /** Internal event type string, or null if standard month. */
  readonly eventType: string | null;
  /** True if proactive spousal tax class optimization is active. */
  readonly isSwapActive: boolean;
  /** True if mother is receiving statutory maternity protection. */
  readonly isMutterschutz: boolean;
  /** True if parents are receiving Partnerschaftsbonus under § 4b BEEG. */
  readonly isPartnerschaftsbonus: boolean;
  /** True if sibling bonus under § 2a BEEG is active. */
  readonly hasSiblingBonus: boolean;
  /** Detailed list of double-entry accounting ledger transactions for this month. */
  readonly transactions: readonly AccountingTransaction[];
}

/**
 * Builds a validated, mathematically consistent `MonthlyLedgerEntry` and computes
 * updated running cumulative totals across earned salaries, benefits, tax refunds, and grand totals.
 *
 * @param input - Raw monthly ledger input specification.
 * @param runningCumulatedSalaries - Cumulative salaries prior to this month.
 * @param runningCumulatedBenefits - Cumulative benefits prior to this month.
 * @param runningCumulatedTaxRefunds - Cumulative tax refunds prior to this month.
 * @param runningCumulatedTotal - Cumulative net household cash flow prior to this month.
 * @returns Result object containing the complete `MonthlyLedgerEntry` and updated cumulative totals.
 */
export function buildMonthlyLedgerEntry(
  input: LedgerMonthInput,
  runningCumulatedSalaries: number,
  runningCumulatedBenefits: number,
  runningCumulatedTaxRefunds: number,
  runningCumulatedTotal: number,
): {
  readonly entry: MonthlyLedgerEntry;
  readonly nextCumulatedSalaries: number;
  readonly nextCumulatedBenefits: number;
  readonly nextCumulatedTaxRefunds: number;
  readonly nextCumulatedTotal: number;
} {
  const hSalary = input.husbandSalary;
  const wSalary = input.wifeSalary;
  const bonus40 = input.bonus40Amount;
  const bonus60 = input.bonus60Amount;
  const specialBonusTotal = bonus40 + bonus60;

  const mutterschutz = input.mutterschutz;
  const wElterngeld = input.wifeElterngeld;
  const hElterngeld = input.husbandElterngeld;
  const kindergeld = input.kindergeld;
  const taxRefund = input.taxRefund;

  const regularMonthlyTotal =
    hSalary + wSalary + mutterschutz + wElterngeld + hElterngeld + kindergeld;

  // Dynamically sum all financial special events (13th salaries, tax returns, and custom costs/income)
  const specialEventsSum =
    input.specialEvents && input.specialEvents.length > 0
      ? input.specialEvents.reduce((sum, ev) => sum + ev.amount, 0)
      : specialBonusTotal + taxRefund;

  const specialEventsTotal = specialEventsSum;
  const monthlyTotal = regularMonthlyTotal + specialEventsTotal;

  const earnedSalaries = hSalary + wSalary + specialBonusTotal;
  const stateBenefits = mutterschutz + wElterngeld + hElterngeld + kindergeld;

  const nextCumulatedSalaries = runningCumulatedSalaries + earnedSalaries;
  const nextCumulatedBenefits = runningCumulatedBenefits + stateBenefits;
  const nextCumulatedTaxRefunds = runningCumulatedTaxRefunds + taxRefund;
  const nextCumulatedTotal = runningCumulatedTotal + monthlyTotal;

  const relLabel = toMonthRef(
    input.relativeMonthLabel || input.monthRef || input.relativeBirthLabel,
  );
  const relIndex =
    input.relativeMonthIndex !== undefined
      ? input.relativeMonthIndex
      : input.month;

  const entry: MonthlyLedgerEntry = {
    monthId: toMonthId(input.monthId),
    monthRef: relLabel,
    monthSimRef: toMonthSimRef(input.monthSimRef || input.month),
    month: input.month,
    year: input.year,
    monthInYear: input.monthInYear,
    calendarYearNum: toFullCalendarYear(input.calendarYearNum),
    calendarMonthNum: input.calendarMonthNum,
    calendarLabel: toCalendarLabel(input.calendarLabel),
    relativeBirthLabel: input.relativeBirthLabel,
    relativeMonthLabel: relLabel,
    relativeMonthIndex: relIndex,
    husbandSalary: input.husbandSalary,
    wifeSalary: input.wifeSalary,
    mutterschutz: input.mutterschutz,
    wifeElterngeld: input.wifeElterngeld,
    husbandElterngeld: input.husbandElterngeld,
    kindergeld: input.kindergeld,
    taxRefund: input.taxRefund,
    bonus40Amount: input.bonus40Amount,
    bonus60Amount: input.bonus60Amount,
    specialBonusTotal: toEuroAmount(specialBonusTotal),
    specialEventsTotal: toEuroAmount(specialEventsTotal),
    specialEvents: input.specialEvents,
    startingActions: input.startingActions,
    regularMonthlyTotal: toEuroAmount(regularMonthlyTotal),
    monthlyTotal: toEuroAmount(monthlyTotal),
    earnedSalaries: toEuroAmount(earnedSalaries),
    stateBenefits: toEuroAmount(stateBenefits),
    cumulatedSalaries: toEuroAmount(nextCumulatedSalaries),
    cumulatedBenefits: toEuroAmount(nextCumulatedBenefits),
    cumulatedTaxRefunds: toEuroAmount(nextCumulatedTaxRefunds),
    cumulatedTotal: toEuroAmount(nextCumulatedTotal),
    taxClassLabel: input.taxClassLabel,
    phaseLabel: input.phaseLabel,
    eventTag: input.eventTag,
    eventType: input.eventType,
    isSwapActive: input.isSwapActive,
    isMutterschutz: input.isMutterschutz,
    isPartnerschaftsbonus: input.isPartnerschaftsbonus,
    hasSiblingBonus: input.hasSiblingBonus,
    transactions: input.transactions,
  };

  return {
    entry,
    nextCumulatedSalaries,
    nextCumulatedBenefits,
    nextCumulatedTaxRefunds,
    nextCumulatedTotal,
  };
}
