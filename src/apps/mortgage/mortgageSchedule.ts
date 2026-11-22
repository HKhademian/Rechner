import {
  type EuroAmount,
  type PercentageRate,
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";
import {
  type KfwLoanTerms,
  LoanRepaymentMethod,
  toGraceYears,
} from "#/apps/mortgage/financingProjection.ts";
import {
  type MortgagePaymentOptions,
  type MortgageYears,
  mortgagePaymentForTerm,
  toMortgageYears,
} from "#/apps/mortgage/mortgageCalculation.ts";

/** Standard KfW 300 repayment presets matching common program structures (Rule 11). */
export const Kfw300PresetId = {
  Standard35Grace5: "standard-35-grace-5",
  Standard25Grace3: "standard-25-grace-3",
  Standard20Grace2: "standard-20-grace-2",
  Standard10Grace1: "standard-10-grace-1",
  Balloon10: "balloon-10",
} as const;
export type Kfw300PresetId = (typeof Kfw300PresetId)[keyof typeof Kfw300PresetId];

export interface Kfw300Preset {
  readonly id: Kfw300PresetId;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly termYears: number;
  readonly graceYears: number;
  readonly method: LoanRepaymentMethod;
  /** Illustrative nominal annual interest rate in percent (e.g. 1.5 for 1.50%). */
  readonly illustrativeRatePercent: number;
}

/**
 * Editable illustrative KfW 300 presets so the simulator produces immediate,
 * realistic projections before the user replaces the rate with their bank offer.
 */
export const KFW_300_PRESETS: readonly Kfw300Preset[] = Object.freeze([
  Object.freeze({
    id: Kfw300PresetId.Standard35Grace5,
    label: "35 yr · 5 yr interest-only (Annuity)",
    shortLabel: "35y / 5y grace",
    description: "Longest KfW 300 repayment horizon with maximum 5 interest-only startup years.",
    termYears: 35,
    graceYears: 5,
    method: LoanRepaymentMethod.Annuity,
    illustrativeRatePercent: 1.5,
  }),
  Object.freeze({
    id: Kfw300PresetId.Standard25Grace3,
    label: "25 yr · 3 yr interest-only (Annuity)",
    shortLabel: "25y / 3y grace",
    description: "Balanced 25-year amortization with 3 interest-only startup years.",
    termYears: 25,
    graceYears: 3,
    method: LoanRepaymentMethod.Annuity,
    illustrativeRatePercent: 1.4,
  }),
  Object.freeze({
    id: Kfw300PresetId.Standard20Grace2,
    label: "20 yr · 2 yr interest-only (Annuity)",
    shortLabel: "20y / 2y grace",
    description: "Faster 20-year payoff with 2 interest-only startup years.",
    termYears: 20,
    graceYears: 2,
    method: LoanRepaymentMethod.Annuity,
    illustrativeRatePercent: 1.3,
  }),
  Object.freeze({
    id: Kfw300PresetId.Standard10Grace1,
    label: "10 yr · 1 yr interest-only (Annuity)",
    shortLabel: "10y / 1y grace",
    description: "Short 10-year full amortization matching the 10-year fixed-rate period.",
    termYears: 10,
    graceYears: 1,
    method: LoanRepaymentMethod.Annuity,
    illustrativeRatePercent: 1.1,
  }),
  Object.freeze({
    id: Kfw300PresetId.Balloon10,
    label: "10 yr · Lump sum at end (Endfällig)",
    shortLabel: "10y Balloon",
    description: "Interest-only monthly payments for 10 years, full principal due at maturity.",
    termYears: 10,
    graceYears: 0,
    method: LoanRepaymentMethod.Balloon,
    illustrativeRatePercent: 1.1,
  }),
]);

export const DEFAULT_KFW_300_PRESET: Kfw300Preset = KFW_300_PRESETS[0];

/** Current repayment phase of the KfW loan in a given month or year (Rule 11). */
export const KfwLoanPhase = {
  None: "none",
  InterestOnly: "interest-only",
  Repaying: "repaying",
  BalloonDue: "balloon-due",
  PaidOff: "paid-off",
} as const;
export type KfwLoanPhase = (typeof KfwLoanPhase)[keyof typeof KfwLoanPhase];

export interface BankScheduleInput {
  readonly principal: EuroAmount;
  readonly annualInterest: PercentageRate;
  readonly initialRepayment: PercentageRate;
  readonly options?: MortgagePaymentOptions;
}

export interface MortgageScheduleMonth {
  readonly month: number;
  readonly year: number;
  readonly monthInYear: number;
  readonly bankPayment: EuroAmount;
  readonly bankPrincipal: EuroAmount;
  readonly bankInterest: EuroAmount;
  readonly bankBalance: EuroAmount;
  readonly kfwPayment: EuroAmount;
  readonly kfwPrincipal: EuroAmount;
  readonly kfwInterest: EuroAmount;
  readonly kfwBalance: EuroAmount;
  readonly kfwPhase: KfwLoanPhase;
  readonly totalPayment: EuroAmount;
  readonly totalPrincipal: EuroAmount;
  readonly totalInterest: EuroAmount;
  readonly totalBalance: EuroAmount;
  readonly cumulativePrincipal: EuroAmount;
  readonly cumulativeInterest: EuroAmount;
  readonly cumulativePayments: EuroAmount;
}

export interface MortgageScheduleYear {
  readonly year: number;
  /** Typical monthly bank payment during this year (first active month, or 0 if paid off). */
  readonly bankMonthlyPayment: EuroAmount;
  /** Typical monthly KfW payment during this year (regular interest/annuity payment excluding balloon spike). */
  readonly kfwMonthlyPayment: EuroAmount;
  /** Typical combined monthly payment during this year (bank + KfW regular monthly). */
  readonly totalMonthlyPayment: EuroAmount;
  readonly bankAnnualPayment: EuroAmount;
  readonly bankAnnualPrincipal: EuroAmount;
  readonly bankAnnualInterest: EuroAmount;
  readonly bankEndBalance: EuroAmount;
  readonly kfwAnnualPayment: EuroAmount;
  readonly kfwAnnualPrincipal: EuroAmount;
  readonly kfwAnnualInterest: EuroAmount;
  readonly kfwEndBalance: EuroAmount;
  readonly kfwPhase: KfwLoanPhase;
  readonly totalAnnualPayment: EuroAmount;
  readonly totalAnnualPrincipal: EuroAmount;
  readonly totalAnnualInterest: EuroAmount;
  readonly totalEndBalance: EuroAmount;
  readonly cumulativePrincipal: EuroAmount;
  readonly cumulativeInterest: EuroAmount;
  readonly cumulativePayments: EuroAmount;
  readonly milestones: readonly string[];
  readonly months: readonly MortgageScheduleMonth[];
}

export interface CombinedMortgageSchedule {
  readonly years: readonly MortgageScheduleYear[];
  readonly months: readonly MortgageScheduleMonth[];
}

export interface TermSensitivityPoint {
  readonly termYears: number;
  readonly monthlyPayment: EuroAmount;
  readonly totalInterest: EuroAmount;
  readonly totalPaid: EuroAmount;
  readonly interestPercentOfPrincipal: number;
}

const toCents = (amount: number): number => Math.round((amount + Number.EPSILON) * 100);

/**
 * Builds a cent-exact combined monthly and annual repayment schedule for both
 * the commercial bank loan and optional KfW loan over the chosen horizon.
 */
export function buildCombinedMortgageSchedule(
  bankInput: Readonly<BankScheduleInput>,
  kfwTerms: Readonly<KfwLoanTerms> | null,
  horizon: MortgageYears,
): CombinedMortgageSchedule {
  const bankInitialCents = toCents(bankInput.principal);
  const bankExtraCents = toCents(bankInput.options?.extraMonthlyPayment ?? toEuroAmount(0));
  const bankBasePaymentCents = bankInitialCents === 0
    ? 0
    : toCents(
      bankInput.options?.baseMonthlyPayment
        ?? (bankInput.principal * (bankInput.annualInterest + bankInput.initialRepayment)) / 12,
    );
  const bankScheduledPaymentCents = bankInitialCents === 0 ? 0 : bankBasePaymentCents + bankExtraCents;

  const hasKfw = kfwTerms !== null && kfwTerms.principal > 0;
  const kfwInitialCents = hasKfw ? Math.round(kfwTerms.principal * 100) : 0;
  const kfwMonthlyRate = hasKfw ? kfwTerms.annualInterest / 12 : 0;
  const kfwTermMonths = hasKfw ? kfwTerms.term * 12 : 0;
  const kfwGraceMonths = hasKfw
    ? (kfwTerms.method === LoanRepaymentMethod.Balloon ? kfwTermMonths : kfwTerms.grace * 12)
    : 0;
  const kfwRepaymentMonths = hasKfw ? Math.max(1, (kfwTerms.term - kfwTerms.grace) * 12) : 1;
  const kfwInterestOnlyCents = hasKfw ? Math.round(kfwInitialCents * kfwMonthlyRate) : 0;
  const kfwRegularPaymentCents = !hasKfw
    ? 0
    : kfwTerms.method === LoanRepaymentMethod.Balloon
      ? kfwInterestOnlyCents
      : Math.round(
        kfwMonthlyRate === 0
          ? kfwInitialCents / kfwRepaymentMonths
          : (kfwInitialCents * kfwMonthlyRate) / (1 - Math.pow(1 + kfwMonthlyRate, -kfwRepaymentMonths)),
      );

  let bankBalanceCents = bankInitialCents;
  let kfwBalanceCents = kfwInitialCents;
  let cumulativePrincipalCents = 0;
  let cumulativeInterestCents = 0;
  let cumulativePaymentsCents = 0;

  const allMonths: MortgageScheduleMonth[] = [];
  const allYears: MortgageScheduleYear[] = [];

  for (let year = 1; year <= horizon; year += 1) {
    const yearMonths: MortgageScheduleMonth[] = [];
    let bankYearPay = 0;
    let bankYearPrincipal = 0;
    let bankYearInterest = 0;
    let kfwYearPay = 0;
    let kfwYearPrincipal = 0;
    let kfwYearInterest = 0;
    let bankPaidOffThisYear = false;
    let kfwPaidOffThisYear = false;
    let kfwBalloonDueThisYear = false;
    let kfwGraceEndedThisYear = false;
    let yearKfwPhase: KfwLoanPhase = hasKfw ? KfwLoanPhase.PaidOff : KfwLoanPhase.None;

    const bankBalanceAtYearStart = bankBalanceCents;
    const kfwBalanceAtYearStart = kfwBalanceCents;

    for (let monthInYear = 1; monthInYear <= 12; monthInYear += 1) {
      const month = (year - 1) * 12 + monthInYear;

      let bankInterest = 0;
      let bankPaid = 0;
      let bankPrincipal = 0;
      if (bankBalanceCents > 0) {
        bankInterest = Math.round((bankBalanceCents * bankInput.annualInterest) / 12);
        bankPaid = Math.min(bankScheduledPaymentCents, bankBalanceCents + bankInterest);
        bankPrincipal = bankPaid - bankInterest;
        bankBalanceCents = bankBalanceCents + bankInterest - bankPaid;
        if (bankBalanceCents === 0) {
          bankPaidOffThisYear = true;
        }
      }

      let kfwInterest = 0;
      let kfwPaid = 0;
      let kfwPrincipal = 0;
      let monthKfwPhase: KfwLoanPhase = hasKfw ? KfwLoanPhase.PaidOff : KfwLoanPhase.None;

      if (hasKfw && kfwBalanceCents > 0) {
        kfwInterest = Math.round(kfwBalanceCents * kfwMonthlyRate);
        const isGraceMonth = month <= kfwGraceMonths;
        kfwPaid = Math.min(kfwBalanceCents + kfwInterest, isGraceMonth ? kfwInterest : kfwRegularPaymentCents);
        monthKfwPhase = isGraceMonth ? KfwLoanPhase.InterestOnly : KfwLoanPhase.Repaying;

        if (month === kfwTermMonths) {
          kfwPaid = kfwBalanceCents + kfwInterest;
          if (kfwTerms.method === LoanRepaymentMethod.Balloon) {
            monthKfwPhase = KfwLoanPhase.BalloonDue;
            kfwBalloonDueThisYear = true;
          }
        }
        kfwPrincipal = kfwPaid - kfwInterest;
        kfwBalanceCents = kfwBalanceCents + kfwInterest - kfwPaid;

        if (kfwBalanceCents === 0 && !kfwBalloonDueThisYear) {
          kfwPaidOffThisYear = true;
        }
        if (
          kfwTerms.method === LoanRepaymentMethod.Annuity
          && kfwGraceMonths > 0
          && month === kfwGraceMonths
          && kfwBalanceCents > 0
        ) {
          kfwGraceEndedThisYear = true;
        }
      }

      if (monthInYear === 1 || monthKfwPhase === KfwLoanPhase.BalloonDue) {
        yearKfwPhase = monthKfwPhase;
      }

      bankYearPay += bankPaid;
      bankYearPrincipal += bankPrincipal;
      bankYearInterest += bankInterest;
      kfwYearPay += kfwPaid;
      kfwYearPrincipal += kfwPrincipal;
      kfwYearInterest += kfwInterest;

      const totalPaid = bankPaid + kfwPaid;
      const totalPrincipal = bankPrincipal + kfwPrincipal;
      const totalInterest = bankInterest + kfwInterest;
      cumulativePrincipalCents += totalPrincipal;
      cumulativeInterestCents += totalInterest;
      cumulativePaymentsCents += totalPaid;

      const monthRecord: MortgageScheduleMonth = Object.freeze({
        month,
        year,
        monthInYear,
        bankPayment: toEuroAmount(bankPaid / 100),
        bankPrincipal: toEuroAmount(bankPrincipal / 100),
        bankInterest: toEuroAmount(bankInterest / 100),
        bankBalance: toEuroAmount(bankBalanceCents / 100),
        kfwPayment: toEuroAmount(kfwPaid / 100),
        kfwPrincipal: toEuroAmount(kfwPrincipal / 100),
        kfwInterest: toEuroAmount(kfwInterest / 100),
        kfwBalance: toEuroAmount(kfwBalanceCents / 100),
        kfwPhase: monthKfwPhase,
        totalPayment: toEuroAmount(totalPaid / 100),
        totalPrincipal: toEuroAmount(totalPrincipal / 100),
        totalInterest: toEuroAmount(totalInterest / 100),
        totalBalance: toEuroAmount((bankBalanceCents + kfwBalanceCents) / 100),
        cumulativePrincipal: toEuroAmount(cumulativePrincipalCents / 100),
        cumulativeInterest: toEuroAmount(cumulativeInterestCents / 100),
        cumulativePayments: toEuroAmount(cumulativePaymentsCents / 100),
      });

      yearMonths.push(monthRecord);
      allMonths.push(monthRecord);
    }

    const milestones: string[] = [];
    if (kfwGraceEndedThisYear && hasKfw) {
      milestones.push("KfW interest-only period ends — full repayment starts next year");
    }
    if (kfwBalloonDueThisYear && hasKfw) {
      milestones.push("KfW balloon lump sum due at maturity");
    }
    if (kfwPaidOffThisYear && kfwBalanceAtYearStart > 0) {
      milestones.push("KfW loan fully repaid");
    }
    if (bankPaidOffThisYear && bankBalanceAtYearStart > 0) {
      milestones.push("Bank loan fully repaid");
    }

    const typicalBankMonthly = yearMonths[0]?.bankPayment ?? toEuroAmount(0);
    const typicalKfwMonthly = yearMonths[0]?.kfwPayment ?? toEuroAmount(0);
    const typicalTotalMonthly = toEuroAmount(
      Math.round((typicalBankMonthly + typicalKfwMonthly) * 100) / 100,
    );

    allYears.push(Object.freeze({
      year,
      bankMonthlyPayment: typicalBankMonthly,
      kfwMonthlyPayment: typicalKfwMonthly,
      totalMonthlyPayment: typicalTotalMonthly,
      bankAnnualPayment: toEuroAmount(bankYearPay / 100),
      bankAnnualPrincipal: toEuroAmount(bankYearPrincipal / 100),
      bankAnnualInterest: toEuroAmount(bankYearInterest / 100),
      bankEndBalance: toEuroAmount(bankBalanceCents / 100),
      kfwAnnualPayment: toEuroAmount(kfwYearPay / 100),
      kfwAnnualPrincipal: toEuroAmount(kfwYearPrincipal / 100),
      kfwAnnualInterest: toEuroAmount(kfwYearInterest / 100),
      kfwEndBalance: toEuroAmount(kfwBalanceCents / 100),
      kfwPhase: yearKfwPhase,
      totalAnnualPayment: toEuroAmount((bankYearPay + kfwYearPay) / 100),
      totalAnnualPrincipal: toEuroAmount((bankYearPrincipal + kfwYearPrincipal) / 100),
      totalAnnualInterest: toEuroAmount((bankYearInterest + kfwYearInterest) / 100),
      totalEndBalance: toEuroAmount((bankBalanceCents + kfwBalanceCents) / 100),
      cumulativePrincipal: toEuroAmount(cumulativePrincipalCents / 100),
      cumulativeInterest: toEuroAmount(cumulativeInterestCents / 100),
      cumulativePayments: toEuroAmount(cumulativePaymentsCents / 100),
      milestones: Object.freeze(milestones),
      months: Object.freeze(yearMonths),
    }));
  }

  return Object.freeze({
    years: Object.freeze(allYears),
    months: Object.freeze(allMonths),
  });
}

/**
 * Computes monthly payment and total interest across payoff terms (inspired by
 * the standalone mortgage-calculator term sensitivity overview).
 */
export function buildTermSensitivityPoints(
  principal: EuroAmount,
  annualInterest: PercentageRate,
  minYears = 5,
  maxYears = 35,
  stepYears = 5,
): readonly TermSensitivityPoint[] {
  if (principal <= 0) {
    return Object.freeze([]);
  }
  const points: TermSensitivityPoint[] = [];
  for (let term = minYears; term <= maxYears; term += stepYears) {
    const payment = mortgagePaymentForTerm(principal, annualInterest, toMortgageYears(term));
    const totalPaid = toEuroAmount(Math.round(payment * term * 12 * 100) / 100);
    const totalInterest = toEuroAmount(Math.max(0, Math.round((totalPaid - principal) * 100) / 100));
    const interestPercentOfPrincipal = Math.round((totalInterest / principal) * 1000) / 10;
    points.push(Object.freeze({
      termYears: term,
      monthlyPayment: payment,
      totalInterest,
      totalPaid,
      interestPercentOfPrincipal,
    }));
  }
  return Object.freeze(points);
}

/**
 * Estimates the starting and post-grace monthly payment for a KfW 300 loan
 * using the default illustrative preset (for quick preview on the Housing page).
 */
export function estimateIllustrativeKfw300Monthly(
  kfwPrincipal: EuroAmount,
  preset: Readonly<Kfw300Preset> = DEFAULT_KFW_300_PRESET,
): { readonly initialMonthly: EuroAmount;
  readonly laterMonthly: EuroAmount } {
  if (kfwPrincipal <= 0) {
    return {
      initialMonthly: toEuroAmount(0),
      laterMonthly: toEuroAmount(0),
    };
  }
  const terms: KfwLoanTerms = {
    principal: kfwPrincipal,
    annualInterest: toPercentageRate(preset.illustrativeRatePercent / 100),
    term: toMortgageYears(preset.termYears),
    grace: toGraceYears(preset.method === LoanRepaymentMethod.Balloon ? 0 : preset.graceYears),
    method: preset.method,
  };
  const schedule = buildCombinedMortgageSchedule(
    {
      principal: toEuroAmount(0),
      annualInterest: toPercentageRate(0),
      initialRepayment: toPercentageRate(0),
    },
    terms,
    toMortgageYears(Math.min(preset.termYears, preset.graceYears + 1)),
  );
  const firstYear = schedule.years[0];
  const postGraceYear = schedule.years[Math.min(schedule.years.length - 1, preset.graceYears)];
  return {
    initialMonthly: firstYear?.kfwMonthlyPayment ?? toEuroAmount(0),
    laterMonthly: postGraceYear?.kfwMonthlyPayment ?? toEuroAmount(0),
  };
}
