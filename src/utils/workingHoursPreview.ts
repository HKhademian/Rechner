/**
 * Working Hours Schedule Card Preview Extractor
 *
 * Extracts exact engine-simulated monthly payroll, maternity protection, and statutory
 * parental allowance figures for a `WorkingHoursChangeAction` from the active scenario's
 * ledger without performing any duplicate or approximate UI calculations.
 */

import {
  type CalendarLabel,
  type EuroAmount,
  type MonthRef,
  type MonthlyLedgerEntry,
  type SimulationMonth,
  type WorkingHoursChangeAction,
  ElterngeldVariant,
  SalaryPeriod,
  TargetPerson,
  toEuroAmount,
} from "#engine/types";

export interface OutOfHorizonWorkingHoursPreview {
  readonly inHorizon: false;
  readonly targetPerson: TargetPerson;
  readonly effectiveSimulationMonth: SimulationMonth;
}

export interface SimulatedWorkingHoursPreview {
  readonly inHorizon: true;
  readonly targetPerson: TargetPerson;
  readonly effectiveSimulationMonth: SimulationMonth;
  readonly calendarLabel: CalendarLabel;
  readonly relativeMonthLabel: MonthRef;
  readonly phaseLabel: string;
  readonly periodSuffix: string;
  readonly grossAmount?: EuroAmount;
  readonly netAmount: EuroAmount;
  readonly mutterschutzAmount: EuroAmount;
  readonly elterngeldAmount: EuroAmount;
  readonly elterngeldLabel: string;
  readonly elterngeldUnavailable: boolean;
  readonly totalInflow: EuroAmount;
}

export type WorkingHoursSchedulePreview =
  | OutOfHorizonWorkingHoursPreview
  | SimulatedWorkingHoursPreview;

/**
 * Resolves the exact simulated cash-flow breakdown for the month in which a working-hours
 * schedule adjustment takes effect.
 */
export function buildWorkingHoursSchedulePreview(
  change: WorkingHoursChangeAction,
  months: readonly MonthlyLedgerEntry[],
  period: SalaryPeriod,
): WorkingHoursSchedulePreview {
  const entry = months.find(
    (month) => month.month === change.effectiveSimulationMonth,
  );
  if (!entry) {
    return Object.freeze({
      inHorizon: false,
      targetPerson: change.targetPerson,
      effectiveSimulationMonth: change.effectiveSimulationMonth,
    });
  }

  const isWife = change.targetPerson === TargetPerson.Wife;
  const isHusband = change.targetPerson === TargetPerson.Husband;
  const periodMultiplier = period === SalaryPeriod.Yearly ? 12 : 1;
  const periodSuffix = period === SalaryPeriod.Yearly ? "/yr" : "/mo";

  const rawGross = entry.payroll
    ? isWife
      ? entry.payroll.wife.monthlyGross
      : isHusband
        ? entry.payroll.husband.monthlyGross
        : toEuroAmount(
          entry.payroll.husband.monthlyGross + entry.payroll.wife.monthlyGross,
        )
    : undefined;

  const rawNet = isWife
    ? entry.wifeSalary
    : isHusband
      ? entry.husbandSalary
      : toEuroAmount(entry.husbandSalary + entry.wifeSalary);

  const rawMutterschutz = isHusband ? toEuroAmount(0) : entry.mutterschutz;

  const rawElterngeld = isWife
    ? entry.wifeElterngeld
    : isHusband
      ? entry.husbandElterngeld
      : toEuroAmount(entry.husbandElterngeld + entry.wifeElterngeld);

  const personPayments = (entry.benefitPayments ?? []).filter(
    (payment) => !isWife && !isHusband ? true : payment.parent === change.targetPerson,
  );
  const hasBasis = personPayments.some(
    (payment) => payment.variant === ElterngeldVariant.Basis,
  );
  const hasPlus = personPayments.some(
    (payment) => payment.variant === ElterngeldVariant.Plus,
  );
  const allPartnershipBonus =
    personPayments.length > 0 &&
    personPayments.every((payment) => payment.partnershipBonus);

  const elterngeldLabel = allPartnershipBonus
    ? "Partnerschaftsbonus (Plus)"
    : hasBasis && hasPlus
      ? "Basiselterngeld + Plus"
      : hasBasis
        ? "Basiselterngeld"
        : hasPlus
          ? "ElterngeldPlus"
          : "Elterngeld";

  const elterngeldUnavailable =
    entry.benefitAssessmentAvailable === false && personPayments.length === 0;

  return Object.freeze({
    inHorizon: true,
    targetPerson: change.targetPerson,
    effectiveSimulationMonth: change.effectiveSimulationMonth,
    calendarLabel: entry.calendarLabel,
    relativeMonthLabel: entry.relativeMonthLabel,
    phaseLabel: entry.phaseLabel,
    periodSuffix,
    grossAmount: rawGross === undefined
      ? undefined
      : toEuroAmount(rawGross * periodMultiplier),
    netAmount: toEuroAmount(rawNet * periodMultiplier),
    mutterschutzAmount: toEuroAmount(rawMutterschutz * periodMultiplier),
    elterngeldAmount: toEuroAmount(rawElterngeld * periodMultiplier),
    elterngeldLabel,
    elterngeldUnavailable,
    totalInflow: toEuroAmount(
      (rawNet + rawMutterschutz + rawElterngeld) * periodMultiplier,
    ),
  });
}
