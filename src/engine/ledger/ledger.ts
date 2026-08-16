import {
  type SimulationMonth,
  type CalendarYear,
  type CalendarMonth,
  type EuroAmount,
  type MonthlyLedgerEntry,
  type AccountingTransaction,
  type SpecialEventItem,
  toEuroAmount,
  toSimulationMonth,
  toCalendarYear,
  toCalendarMonth,
  type ActionRowItem,
} from '#engine/types';

export interface LedgerMonthInput {
  readonly month: SimulationMonth;
  readonly year: CalendarYear;
  readonly monthInYear: CalendarMonth;
  readonly calendarYearNum: number;
  readonly calendarMonthNum: CalendarMonth;
  readonly calendarLabel: string;
  readonly relativeBirthLabel: string;
  readonly husbandSalary: EuroAmount;
  readonly wifeSalary: EuroAmount;
  readonly mutterschutz: EuroAmount;
  readonly wifeElterngeld: EuroAmount;
  readonly husbandElterngeld: EuroAmount;
  readonly kindergeld: EuroAmount;
  readonly taxRefund: EuroAmount;
  readonly bonus40Amount: EuroAmount;
  readonly bonus60Amount: EuroAmount;
  readonly specialEvents: readonly SpecialEventItem[];
  readonly startingActions?: readonly ActionRowItem[];
  readonly taxClassLabel: string;
  readonly phaseLabel: string;
  readonly eventTag: string | null;
  readonly eventType: string | null;
  readonly isSwapActive: boolean;
  readonly isMutterschutz: boolean;
  readonly isPartnerschaftsbonus: boolean;
  readonly hasSiblingBonus: boolean;
  readonly transactions: readonly AccountingTransaction[];
}

/**
 * Builds a validated, mathematically consistent monthly ledger entry
 */
export function buildMonthlyLedgerEntry(
  input: LedgerMonthInput,
  runningCumulatedSalaries: number,
  runningCumulatedBenefits: number,
  runningCumulatedTaxRefunds: number,
  runningCumulatedTotal: number
): {
  readonly entry: MonthlyLedgerEntry;
  readonly nextCumulatedSalaries: number;
  readonly nextCumulatedBenefits: number;
  readonly nextCumulatedTaxRefunds: number;
  readonly nextCumulatedTotal: number;
} {
  const hSalary = input.husbandSalary as number;
  const wSalary = input.wifeSalary as number;
  const bonus40 = input.bonus40Amount as number;
  const bonus60 = input.bonus60Amount as number;
  const specialBonusTotal = bonus40 + bonus60;

  const mutterschutz = input.mutterschutz as number;
  const wElterngeld = input.wifeElterngeld as number;
  const hElterngeld = input.husbandElterngeld as number;
  const kindergeld = input.kindergeld as number;
  const taxRefund = input.taxRefund as number;

  const regularMonthlyTotal = hSalary + wSalary + mutterschutz + wElterngeld + hElterngeld + kindergeld;
  const specialEventsTotal = specialBonusTotal + taxRefund;
  const monthlyTotal = regularMonthlyTotal + specialEventsTotal;

  const earnedSalaries = hSalary + wSalary + specialBonusTotal;
  const stateBenefits = mutterschutz + wElterngeld + hElterngeld + kindergeld;

  const nextCumulatedSalaries = runningCumulatedSalaries + earnedSalaries;
  const nextCumulatedBenefits = runningCumulatedBenefits + stateBenefits;
  const nextCumulatedTaxRefunds = runningCumulatedTaxRefunds + taxRefund;
  const nextCumulatedTotal = runningCumulatedTotal + monthlyTotal;

  const entry: MonthlyLedgerEntry = {
    month: input.month,
    year: input.year,
    monthInYear: input.monthInYear,
    calendarYearNum: input.calendarYearNum,
    calendarMonthNum: input.calendarMonthNum,
    calendarLabel: input.calendarLabel,
    relativeBirthLabel: input.relativeBirthLabel,
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
    transactions: input.transactions
  };

  return {
    entry,
    nextCumulatedSalaries,
    nextCumulatedBenefits,
    nextCumulatedTaxRefunds,
    nextCumulatedTotal
  };
}
