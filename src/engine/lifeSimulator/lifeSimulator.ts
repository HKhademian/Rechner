import {
  type CalendarMonth,
  type EuroAmount,
  type FullCalendarYear,
  type GrossSalary,
  type PercentageRate,
  type SimulationMonth,
  type TaxClass,
  type WorkingHours,
  toCalendarMonth,
  toChildIndex,
  toEuroAmount,
  toFullCalendarYear,
  toGrossSalary,
  toMonthId,
  toSimulationMonth,
  toStatutoryCitation,
} from "#engine/types";
import {
  type TaxRules,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  computeGrossToNetBreakdown,
} from "#engine/tax/wageTax";
import {
  type ChildYearPresence,
} from "#engine/tax/jointAssessment";
import {
  simMonthToCalendarDate,
} from "#engine/simulator/calendarNavigation";
import {
  evaluateDeductibleExpensesFormula,
} from "#engine/formulas/pure/deductibleExpensesFormula";
import {
  collectAndSettleAnnualLifeTax,
} from "#engine/lifeSimulator/annualTaxCollector";
import {
  type AnnualLifeTaxRecord,
  type CompanyCarEvent,
  type LifeActionMilestone,
  type LifeAdultBaseline,
  type LifeDeadlineItem,
  type LifeMonthlyLedgerEntry,
  type LifePlanInput,
  type LifeScenarioKey,
  type LifeSimulationResult,
  type LifeSimulationSummary,
  type LifeTaxTransaction,
  CompanyCarPowertrain,
  HealthInsuranceKind,
  JobEndCause,
  LifeDeadlineSeverity,
  LifeEventDomain,
  LifeEventKind,
  LifePersonKey,
  ParentalLeavePlanMode,
  ResidencyMilestoneKind,
  ResidencyPermitBaseline,
  TaxBucket,
} from "#engine/lifeSimulator/types";

const BASIS_ELTERNGELD_MIN_EUR = 300;
const BASIS_ELTERNGELD_MAX_EUR = 1800;
const PLUS_ELTERNGELD_MIN_EUR = 150;
const PLUS_ELTERNGELD_MAX_EUR = 900;
const ELTERNGELD_REPLACEMENT_RATE = 0.65;
/** Approximate monthly BBG West cap for ALG I calculation (§ 149 SGB III). */
const ALG1_MONTHLY_GROSS_CAP_EUR = 8050;
/** Statutory § 47 SGB V Krankengeld maximum daily/monthly cap approximation (~€128.63/day ≈ €3,859/mo). */
const KRANKENGELD_MONTHLY_MAX_EUR = 3859;

function roundToCents(value: number): EuroAmount {
  return toEuroAmount(Math.round(value * 100 + Number.EPSILON * Math.abs(value) * 100) / 100);
}

interface MutableAdultState {
  readonly personKey: LifePersonKey;
  readonly name: string;
  monthlyGross: GrossSalary;
  weeklyHours: WorkingHours;
  taxClass: TaxClass;
  readonly churchTaxRate: PercentageRate;
  readonly payrollOptions: LifeAdultBaseline["payrollOptions"];
  readonly annualSalariesCount: number;
  readonly healthInsuranceKind: HealthInsuranceKind;
  readonly healthSupplementRate?: PercentageRate;
  readonly privateHealthMonthlyEur: EuroAmount;
  readonly alg1Insured: boolean;
  companyCar?: CompanyCarEvent;
  annualCommuterWerbungskosten: number;
  unemploymentRemainingMonths: number;
  sperrzeitRemainingMonths: number;
  alg1MonthlyBenefit: number;
  krankengeldRemainingMonths: number;
  krankengeldMonthlyBenefit: number;
  reemploymentGross?: GrossSalary;
  parentalLeaveRemainingMonths: number;
  parentalLeaveMode: ParentalLeavePlanMode;
  parentalLeaveBenefit: number;
  mutterschutzRemainingMonths: number;
  mutterschutzNet: number;
}

interface MutableMortgageOrLoan {
  readonly id: string;
  readonly label: string;
  remainingPrincipal: number;
  readonly annualInterestRate: number;
  readonly monthlyAnnuity: number;
  readonly monthlyMaintenance: number;
}

interface MutablePropertyAsset {
  readonly id: string;
  currentValue: number;
  readonly annualAppreciationRate: number;
}

interface MutableVehicleAsset {
  readonly id: string;
  currentValue: number;
  readonly annualDepreciationRate: number;
  readonly monthlyPayment: number;
  remainingPaymentMonths: number;
}

interface MutableSolarAsset {
  readonly id: string;
  readonly label: string;
  currentValue: number;
  readonly monthlyBenefit: number;
  remainingMonths: number;
}

interface MutableRecurringWindow {
  readonly id: string;
  readonly domain: LifeEventDomain;
  readonly label: string;
  readonly monthlyAmount: number;
  readonly bucket: TaxBucket;
  readonly isOutflow: boolean;
  remainingMonths: number;
}

function computeCompanyCarMonthlyBenefit(car: CompanyCarEvent): number {
  const baseRate = car.powertrain === CompanyCarPowertrain.Electric
    ? 0.0025
    : car.powertrain === CompanyCarPowertrain.PlugInHybrid
      ? 0.005
      : 0.01;
  const commuteRate = car.powertrain === CompanyCarPowertrain.Electric
    ? 0.000075
    : car.powertrain === CompanyCarPowertrain.PlugInHybrid
      ? 0.00015
      : 0.0003;
  return roundToCents(car.listPriceGross * (baseRate + commuteRate * Math.max(0, car.oneWayCommuteKm)));
}

function computeCommuterAnnualWerbungskosten(
  oneWayDistanceKm: number,
  workDaysPerYear: number,
  homeOfficeDaysPerYear: number,
): number {
  const km = Math.max(0, oneWayDistanceKm);
  const days = Math.max(0, Math.min(365, workDaysPerYear));
  const first20 = Math.min(20, km) * 0.3;
  const beyond20 = Math.max(0, km - 20) * 0.38;
  const commuteAllowance = (first20 + beyond20) * days;
  const homeOfficeAllowance = Math.min(1260, Math.max(0, homeOfficeDaysPerYear) * 6);
  return roundToCents(commuteAllowance + homeOfficeAllowance);
}

function computeElterngeldMonthly(priorNet: number, mode: ParentalLeavePlanMode): number {
  const basis = Math.max(
    BASIS_ELTERNGELD_MIN_EUR,
    Math.min(BASIS_ELTERNGELD_MAX_EUR, priorNet * ELTERNGELD_REPLACEMENT_RATE),
  );
  if (mode === ParentalLeavePlanMode.Plus) {
    return roundToCents(Math.max(PLUS_ELTERNGELD_MIN_EUR, Math.min(PLUS_ELTERNGELD_MAX_EUR, basis * 0.5)));
  }
  return roundToCents(basis);
}

function computeAlg1Monthly(monthlyGross: GrossSalary, taxClass: TaxClass, hasChildren: boolean, rules: TaxRules): number {
  const cappedGross = toGrossSalary(Math.min(monthlyGross, ALG1_MONTHLY_GROSS_CAP_EUR));
  const net = computeGrossToNetBreakdown(cappedGross, taxClass, hasChildren ? 1 : 0, undefined, undefined, rules).monthlyNetTakeHome;
  const rate = hasChildren ? 0.67 : 0.6;
  return roundToCents(net * rate);
}

function computeKrankengeldMonthly(monthlyGross: GrossSalary, taxClass: TaxClass, childrenCount: number, rules: TaxRules): number {
  const breakdown = computeGrossToNetBreakdown(monthlyGross, taxClass, childrenCount, undefined, undefined, rules);
  const raw = Math.min(monthlyGross * 0.7, breakdown.monthlyNetTakeHome * 0.9, KRANKENGELD_MONTHLY_MAX_EUR);
  // Employee retains reduced pension/unemployment/care share (~12% on Krankengeld).
  return roundToCents(raw * 0.88);
}

function createAdultState(baseline: LifeAdultBaseline): MutableAdultState {
  return {
    personKey: baseline.personKey,
    name: baseline.name,
    monthlyGross: baseline.monthlyGross,
    weeklyHours: baseline.weeklyHours,
    taxClass: baseline.taxClass,
    churchTaxRate: baseline.churchTaxRate,
    payrollOptions: baseline.payrollOptions,
    annualSalariesCount: Math.max(12, Math.min(14, Math.trunc(baseline.annualSalariesCount ?? 12))),
    healthInsuranceKind: baseline.healthInsuranceKind ?? HealthInsuranceKind.PublicGkv,
    healthSupplementRate: baseline.healthSupplementRate,
    privateHealthMonthlyEur: baseline.privateHealthMonthlyEur ?? toEuroAmount(0),
    alg1Insured: baseline.alg1Insured ?? true,
    annualCommuterWerbungskosten: 0,
    unemploymentRemainingMonths: 0,
    sperrzeitRemainingMonths: 0,
    alg1MonthlyBenefit: 0,
    krankengeldRemainingMonths: 0,
    krankengeldMonthlyBenefit: 0,
    parentalLeaveRemainingMonths: 0,
    parentalLeaveMode: ParentalLeavePlanMode.Basis,
    parentalLeaveBenefit: 0,
    mutterschutzRemainingMonths: 0,
    mutterschutzNet: 0,
  };
}

/**
 * Pure multi-year German Life Simulator with unified Tax Collector & Balance-Sheet Ledger.
 * Replays months 1..horizonMonths, evaluates all 6 event domains, reconciles exact annual
 * German income tax settlements into year + 1, and enforces cash & net-worth invariants.
 */
export function simulateLifePlan(
  plan: LifePlanInput,
  scenarioKey: LifeScenarioKey,
): LifeSimulationResult {
  const { baseline, events } = plan;
  const horizonMonths = Math.max(1, Math.min(360, Math.trunc(baseline.horizonMonths)));
  const startYear = baseline.startCalendarYear;
  const startMonth = baseline.startCalendarMonth;

  const primary = createAdultState(baseline.primary);
  const partner = baseline.partner ? createAdultState(baseline.partner) : undefined;

  const getAdult = (key: LifePersonKey): MutableAdultState | undefined =>
    key === LifePersonKey.Primary ? primary : partner;

  const children: ChildYearPresence[] = [];
  for (let i = 0; i < Math.max(0, baseline.priorChildrenCount); i++) {
    children.push({
      childIndex: toChildIndex(i + 1),
      birthCalendarYear: toFullCalendarYear(Math.max(2000, startYear - 2)),
      birthCalendarMonth: toCalendarMonth(1),
    });
  }

  let currentMonthlyRent = Number(baseline.monthlyRent);
  let currentMonthlyLiving = Number(baseline.monthlyLivingExpenses);
  let currentInvestmentsValue = Number(baseline.openingInvestmentsValue ?? 0);
  const annualInvestmentReturnRate = Number(baseline.annualInvestmentReturnRate ?? 0);

  const properties: MutablePropertyAsset[] = [];
  const loans: MutableMortgageOrLoan[] = [];
  const amortizesOpeningDebt =
    baseline.openingDebtBalance > 0 && (baseline.openingDebtMonthlyPayment ?? 0) > 0;
  if (amortizesOpeningDebt) {
    loans.push({
      id: "OPENING-DEBT",
      label: "Existing Debt",
      remainingPrincipal: baseline.openingDebtBalance,
      annualInterestRate: Number(baseline.openingDebtInterestRate ?? 0.045),
      monthlyAnnuity: Number(baseline.openingDebtMonthlyPayment ?? 0),
      monthlyMaintenance: 0,
    });
  }
  const staticOpeningDebt = amortizesOpeningDebt ? 0 : baseline.openingDebtBalance;

  const vehicles: MutableVehicleAsset[] = [];
  const solars: MutableSolarAsset[] = [];
  const recurringWindows: MutableRecurringWindow[] = [];

  const deadlines: LifeDeadlineItem[] = [];

  // Auto-generate Residency & Citizenship deadlines from baseline permit clock.
  if (
    baseline.residencyPermit &&
    baseline.residencyPermit !== ResidencyPermitBaseline.CitizenOrEu
  ) {
    const priorMonthsInGermany = Math.max(0, Math.round((baseline.yearsInGermany ?? 0) * 12));
    if (baseline.residencyPermit !== ResidencyPermitBaseline.PermanentResidency) {
      const prRequiredMonths = baseline.residencyPermit === ResidencyPermitBaseline.EuBlueCard ? 27 : 36;
      const prRemainingMonths = prRequiredMonths - priorMonthsInGermany;
      if (prRemainingMonths >= 1 && prRemainingMonths <= horizonMonths) {
        const prMonth = toSimulationMonth(prRemainingMonths);
        const prCal = simMonthToCalendarDate(prMonth, startYear, startMonth);
        deadlines.push(Object.freeze({
          id: "DL-BASELINE-PR-18C",
          month: prMonth,
          calendarYear: prCal.calendarYear,
          calendarMonth: prCal.calendarMonth,
          domain: LifeEventDomain.Residency,
          severity: LifeDeadlineSeverity.Info,
          title: "Permanent Residency Eligibility (§ 18c AufenthG)",
          description: `Reached ${prRequiredMonths} months in Germany (${baseline.residencyPermit}).`,
          statutoryCitation: toStatutoryCitation("§ 18c AufenthG"),
        }));
      }
    }

    const citizenRemainingMonths = 60 - priorMonthsInGermany;
    if (citizenRemainingMonths >= 1 && citizenRemainingMonths <= horizonMonths) {
      const citMonth = toSimulationMonth(citizenRemainingMonths);
      const citCal = simMonthToCalendarDate(citMonth, startYear, startMonth);
      deadlines.push(Object.freeze({
        id: "DL-BASELINE-CITIZEN-10STAG",
        month: citMonth,
        calendarYear: citCal.calendarYear,
        calendarMonth: citCal.calendarMonth,
        domain: LifeEventDomain.Residency,
        severity: LifeDeadlineSeverity.Info,
        title: "German Citizenship Eligibility (§ 10 StAG)",
        description: "Reached 5-year standard residence period for naturalization.",
        statutoryCitation: toStatutoryCitation("§ 10 StAG"),
      }));
    }

    if (
      baseline.permitExpiryMonth !== undefined &&
      baseline.permitExpiryMonth >= 1 &&
      baseline.permitExpiryMonth <= horizonMonths
    ) {
      const expMonth = toSimulationMonth(baseline.permitExpiryMonth);
      const expCal = simMonthToCalendarDate(expMonth, startYear, startMonth);
      deadlines.push(Object.freeze({
        id: "DL-BASELINE-PERMIT-EXPIRY",
        month: expMonth,
        calendarYear: expCal.calendarYear,
        calendarMonth: expCal.calendarMonth,
        domain: LifeEventDomain.Residency,
        severity: LifeDeadlineSeverity.Critical,
        title: "Residence Permit Expiry / Renewal",
        description: "Submit permit renewal or PR transition application 3–4 months prior to expiry.",
        statutoryCitation: toStatutoryCitation("§ 81 Abs. 4 AufenthG"),
      }));
    }
  }
  const taxRulesCache = new Map<number, TaxRules>();
  const getTaxRules = (year: FullCalendarYear): TaxRules => {
    const existing = taxRulesCache.get(year);
    if (existing) {
      return existing;
    }
    const created = createTaxRules(year);
    taxRulesCache.set(year, created);
    return created;
  };

  // Pre-index events by effectiveMonth for O(1) lookup.
  const eventsByMonth = new Map<number, typeof events[number][]>();
  for (const ev of events) {
    const list = eventsByMonth.get(ev.effectiveMonth) ?? [];
    list.push(ev);
    eventsByMonth.set(ev.effectiveMonth, list);
  }

  // Track recurring yearly bonuses, deductibles, and capital income.
  const recurringYearlyEvents = events.filter(
    (ev) =>
      (ev.kind === LifeEventKind.BonusSchedule && ev.recurringYearly) ||
      (ev.kind === LifeEventKind.DeductibleExpenses && ev.recurringYearly) ||
      (ev.kind === LifeEventKind.CapitalIncome && ev.recurringYearly),
  );

  interface RawMonthRecord {
    readonly month: SimulationMonth;
    readonly calendarYear: FullCalendarYear;
    readonly calendarMonth: CalendarMonth;
    readonly monthId: ReturnType<typeof toMonthId>;
    readonly activeTaxClassLabel: string;
    readonly primaryNetSalary: EuroAmount;
    readonly partnerNetSalary: EuroAmount;
    readonly statutoryBenefits: EuroAmount;
    readonly housingAndAssetsNet: EuroAmount;
    readonly livingAndChildcareOutflow: EuroAmount;
    readonly otherEventsNet: EuroAmount;
    readonly totalAssetsValue: EuroAmount;
    readonly totalDebtBalance: EuroAmount;
    readonly essentialMonthlyOutflow: number;
    readonly actionMilestones: readonly LifeActionMilestone[];
    readonly transactions: LifeTaxTransaction[];
    readonly kindergeldThisMonth: number;
  }

  const rawMonths: RawMonthRecord[] = [];
  const monthsPerYear = new Map<number, number>();
  const kindergeldPerYear = new Map<number, number>();
  const transactionsByYear = new Map<number, LifeTaxTransaction[]>();

  for (let m = 1; m <= horizonMonths; m++) {
    const simMonth = toSimulationMonth(m);
    const cal = simMonthToCalendarDate(simMonth, startYear, startMonth);
    const calYear = cal.calendarYear;
    const calMonth = cal.calendarMonth;
    const monthId = toMonthId(calMonth, calYear);
    const rules = getTaxRules(calYear);

    monthsPerYear.set(calYear, (monthsPerYear.get(calYear) ?? 0) + 1);

    // Annual rent indexation & living-cost CPI inflation on each anniversary after year 1.
    if (m > 1 && (m - 1) % 12 === 0) {
      if (baseline.annualRentIndexationRate > 0 && currentMonthlyRent > 0) {
        currentMonthlyRent = roundToCents(currentMonthlyRent * (1 + baseline.annualRentIndexationRate));
      }
      if (baseline.annualInflationRate > 0 && currentMonthlyLiving > 0) {
        currentMonthlyLiving = roundToCents(currentMonthlyLiving * (1 + baseline.annualInflationRate));
      }
    }

    const transactions: LifeTaxTransaction[] = [];
    const actionMilestones: LifeActionMilestone[] = [];
    let txSeq = 1;
    const pushTx = (
      domain: LifeEventDomain,
      bucket: TaxBucket,
      signedCashAmount: number,
      taxBasisAmount: number,
      label: string,
      citation?: string,
    ): void => {
      const tx: LifeTaxTransaction = Object.freeze({
        transactionId: `LP-${monthId}-${txSeq++}`,
        month: simMonth,
        calendarYear: calYear,
        calendarMonth: calMonth,
        domain,
        bucket,
        signedCashAmount: roundToCents(signedCashAmount),
        taxBasisAmount: roundToCents(Math.max(0, taxBasisAmount)),
        label,
        statutoryCitation: citation ? toStatutoryCitation(citation) : undefined,
      });
      transactions.push(tx);
      const yearList = transactionsByYear.get(calYear) ?? [];
      yearList.push(tx);
      transactionsByYear.set(calYear, yearList);
    };

    let primaryBonusGross = 0;
    let partnerBonusGross = 0;
    let housingAndAssetsNet = 0;
    let otherEventsNet = 0;

    // 1. Apply discrete events triggered in this month.
    const monthEvents = eventsByMonth.get(m) ?? [];
    for (const ev of monthEvents) {
      actionMilestones.push(Object.freeze({
        eventId: ev.id,
        domain: ev.domain,
        kind: ev.kind,
        title: ev.title,
      }));

      switch (ev.kind) {
        case LifeEventKind.SalaryRaise: {
          const target = getAdult(ev.personKey);
          if (target) {
            target.monthlyGross = toGrossSalary(roundToCents(target.monthlyGross * (1 + ev.percentageIncrease)));
          }
          break;
        }
        case LifeEventKind.BonusSchedule: {
          if (ev.personKey === LifePersonKey.Primary) {
            primaryBonusGross += ev.grossBonusAmount;
          }
          else if (partner) {
            partnerBonusGross += ev.grossBonusAmount;
          }
          break;
        }
        case LifeEventKind.WorkingHoursChange: {
          const target = getAdult(ev.personKey);
          if (target) {
            if (ev.scaleSalaryProportionally && target.weeklyHours > 0) {
              const ratio = ev.newWeeklyHours / target.weeklyHours;
              target.monthlyGross = toGrossSalary(roundToCents(target.monthlyGross * ratio));
            }
            target.weeklyHours = ev.newWeeklyHours;
          }
          break;
        }
        case LifeEventKind.CompanyCar: {
          const target = getAdult(ev.personKey);
          if (target) {
            target.companyCar = ev;
          }
          break;
        }
        case LifeEventKind.CommuterProfile: {
          const target = getAdult(ev.personKey);
          if (target) {
            target.annualCommuterWerbungskosten = computeCommuterAnnualWerbungskosten(
              ev.oneWayDistanceKm,
              ev.workDaysPerYear,
              ev.homeOfficeDaysPerYear,
            );
          }
          break;
        }
        case LifeEventKind.JobChange: {
          const target = getAdult(ev.personKey);
          if (target) {
            target.monthlyGross = ev.newMonthlyGross;
            target.weeklyHours = ev.newWeeklyHours;
            target.unemploymentRemainingMonths = 0;
            target.sperrzeitRemainingMonths = 0;
            if (ev.signOnBonusGross && ev.signOnBonusGross > 0) {
              if (ev.personKey === LifePersonKey.Primary) {
                primaryBonusGross += ev.signOnBonusGross;
              }
              else {
                partnerBonusGross += ev.signOnBonusGross;
              }
            }
          }
          break;
        }
        case LifeEventKind.JobEnd: {
          const target = getAdult(ev.personKey);
          if (target) {
            const hasKids = children.length > 0;
            if (ev.severanceGross && ev.severanceGross > 0) {
              if (ev.personKey === LifePersonKey.Primary) {
                primaryBonusGross += ev.severanceGross;
              }
              else {
                partnerBonusGross += ev.severanceGross;
              }
            }
            target.reemploymentGross = ev.reemploymentMonthlyGross ?? target.monthlyGross;
            if (ev.cause === JobEndCause.Sabbatical) {
              target.unemploymentRemainingMonths = Math.max(0, ev.unemploymentMonths);
              target.sperrzeitRemainingMonths = Math.max(0, ev.unemploymentMonths);
              target.alg1MonthlyBenefit = 0;
            }
            else if (ev.cause === JobEndCause.ContractEnd && ev.title.toLowerCase().includes("illness")) {
              // Long-term illness Krankengeld path
              target.krankengeldRemainingMonths = Math.max(0, ev.unemploymentMonths);
              target.krankengeldMonthlyBenefit = computeKrankengeldMonthly(
                target.monthlyGross,
                target.taxClass,
                children.length,
                rules,
              );
            }
            else {
              target.unemploymentRemainingMonths = Math.max(0, ev.unemploymentMonths);
              const defaultSperrzeit = ev.cause === JobEndCause.VoluntaryResignation ? 3 : 0;
              target.sperrzeitRemainingMonths = ev.sperrzeitMonths ?? defaultSperrzeit;
              target.alg1MonthlyBenefit = target.alg1Insured
                ? computeAlg1Monthly(
                  target.monthlyGross,
                  target.taxClass,
                  hasKids,
                  rules,
                )
                : 0;
              deadlines.push(Object.freeze({
                id: `DL-${ev.id}-ALG1`,
                month: toSimulationMonth(Math.max(1, m - 3)),
                calendarYear: calYear,
                calendarMonth: calMonth,
                domain: LifeEventDomain.Career,
                severity: LifeDeadlineSeverity.Warning,
                title: `Register job-seeking (${target.name})`,
                description: "Register at Agentur für Arbeit at least 3 months before job end to avoid Sperrzeit.",
                statutoryCitation: toStatutoryCitation("§ 38 Abs. 1 SGB III"),
              }));
            }
          }
          break;
        }
        case LifeEventKind.SideJob: {
          recurringWindows.push({
            id: ev.id,
            domain: LifeEventDomain.Career,
            label: ev.title,
            monthlyAmount: ev.monthlyNetInflow,
            bucket: ev.isTaxExemptMinijob ? TaxBucket.TaxExemptInflow : TaxBucket.TaxableWage,
            isOutflow: false,
            remainingMonths: Math.max(1, ev.durationMonths),
          });
          break;
        }
        case LifeEventKind.ChildBirth: {
          children.push({
            childIndex: toChildIndex(children.length + 1),
            birthCalendarYear: calYear,
            birthCalendarMonth: calMonth,
          });
          const leaveParent = getAdult(ev.parentOnLeave);
          if (leaveParent) {
            const priorNet = computeGrossToNetBreakdown(
              leaveParent.monthlyGross,
              leaveParent.taxClass,
              children.length,
              undefined,
              undefined,
              rules,
            ).monthlyNetTakeHome;
            if (ev.includeMutterschutz) {
              leaveParent.mutterschutzRemainingMonths = 2;
              leaveParent.mutterschutzNet = priorNet;
            }
            leaveParent.parentalLeaveRemainingMonths = Math.max(0, ev.leaveMonths);
            leaveParent.parentalLeaveMode = ev.leaveMode;
            leaveParent.parentalLeaveBenefit = computeElterngeldMonthly(priorNet, ev.leaveMode);
          }
          if (ev.partnerLeaveMonths > 0) {
            const otherKey = ev.parentOnLeave === LifePersonKey.Primary
              ? LifePersonKey.Partner
              : LifePersonKey.Primary;
            const otherParent = getAdult(otherKey);
            if (otherParent) {
              const otherNet = computeGrossToNetBreakdown(
                otherParent.monthlyGross,
                otherParent.taxClass,
                children.length,
                undefined,
                undefined,
                rules,
              ).monthlyNetTakeHome;
              otherParent.parentalLeaveRemainingMonths = Math.max(0, ev.partnerLeaveMonths);
              otherParent.parentalLeaveMode = ev.leaveMode;
              otherParent.parentalLeaveBenefit = computeElterngeldMonthly(otherNet, ev.leaveMode);
            }
          }
          deadlines.push(Object.freeze({
            id: `DL-${ev.id}-ELTERNZEIT`,
            month: toSimulationMonth(Math.max(1, m - 2)),
            calendarYear: calYear,
            calendarMonth: calMonth,
            domain: LifeEventDomain.Family,
            severity: LifeDeadlineSeverity.Warning,
            title: `Submit Elternzeit notice (${ev.title})`,
            description: "Written Elternzeit notice must reach employer at least 7 weeks before start.",
            statutoryCitation: toStatutoryCitation("§ 16 Abs. 1 BEEG"),
          }));
          break;
        }
        case LifeEventKind.ChildcareFee: {
          recurringWindows.push({
            id: ev.id,
            domain: LifeEventDomain.Family,
            label: ev.title,
            monthlyAmount: ev.monthlyFee,
            bucket: ev.taxDeductible ? TaxBucket.ChildcareDeductible10_1_5 : TaxBucket.NonTax,
            isOutflow: true,
            remainingMonths: Math.max(1, ev.durationMonths),
          });
          break;
        }
        case LifeEventKind.RegionalBenefit: {
          recurringWindows.push({
            id: ev.id,
            domain: LifeEventDomain.Family,
            label: ev.title,
            monthlyAmount: ev.monthlyAmount,
            bucket: TaxBucket.TaxExemptInflow,
            isOutflow: false,
            remainingMonths: Math.max(1, ev.durationMonths),
          });
          break;
        }
        case LifeEventKind.TaxClassSwitch: {
          primary.taxClass = ev.primaryTaxClass;
          if (partner && ev.partnerTaxClass) {
            partner.taxClass = ev.partnerTaxClass;
          }
          break;
        }
        case LifeEventKind.DeductibleExpenses: {
          const credits = evaluateDeductibleExpensesFormula({
            werbungskostenAnnual: ev.werbungskostenAnnual,
            sonderausgabenAnnual: ev.sonderausgabenAnnual,
            householdServicesLaborAnnual: ev.householdServicesLaborAnnual,
            craftsmenLaborAnnual: ev.craftsmenLaborAnnual,
            marginalTaxRate: baseline.primary.churchTaxRate,
          });
          if (ev.werbungskostenAnnual > 0) {
            pushTx(LifeEventDomain.Tax, TaxBucket.Werbungskosten9, 0, ev.werbungskostenAnnual, `${ev.title} (§ 9 Werbungskosten)`, "§ 9 EStG");
          }
          if (ev.sonderausgabenAnnual > 0) {
            pushTx(LifeEventDomain.Tax, TaxBucket.Sonderausgaben10, 0, ev.sonderausgabenAnnual, `${ev.title} (§ 10 Sonderausgaben)`, "§ 10 EStG");
          }
          if (credits.totalDirectTaxCredits > 0) {
            pushTx(LifeEventDomain.Tax, TaxBucket.TaxCredit35a, 0, credits.totalDirectTaxCredits, `${ev.title} (§ 35a Direct Credit)`, "§ 35a EStG");
          }
          break;
        }
        case LifeEventKind.CapitalIncome: {
          otherEventsNet += ev.annualGrossReturn;
          pushTx(LifeEventDomain.Tax, TaxBucket.CapitalGains, ev.annualGrossReturn, ev.annualGrossReturn, ev.title, "§ 20, § 32d EStG");
          break;
        }
        case LifeEventKind.RentChange: {
          currentMonthlyRent = Number(ev.newMonthlyRent);
          break;
        }
        case LifeEventKind.HomePurchase: {
          const closingCosts = roundToCents(ev.purchasePrice * ev.closingCostsRate);
          const upfrontOutflow = roundToCents(ev.downPayment + closingCosts);
          const loanPrincipal = Math.max(0, ev.purchasePrice - ev.downPayment);
          const annualAnnuity = loanPrincipal * (ev.annualInterestRate + ev.initialRepaymentRate);
          const monthlyAnnuity = roundToCents(annualAnnuity / 12);
          housingAndAssetsNet -= upfrontOutflow;
          pushTx(LifeEventDomain.HousingAsset, TaxBucket.NonTax, -upfrontOutflow, 0, `${ev.title} (Down Payment & Closing Costs)`, "GrEStG");
          properties.push({
            id: ev.id,
            currentValue: ev.purchasePrice,
            annualAppreciationRate: ev.annualAppreciationRate,
          });
          if (loanPrincipal > 0) {
            loans.push({
              id: ev.id,
              label: `${ev.title} Mortgage`,
              remainingPrincipal: loanPrincipal,
              annualInterestRate: ev.annualInterestRate,
              monthlyAnnuity,
              monthlyMaintenance: ev.monthlyMaintenanceReserve,
            });
          }
          if (ev.replacesRent) {
            currentMonthlyRent = 0;
          }
          break;
        }
        case LifeEventKind.VehiclePurchaseOrLease: {
          if (ev.upfrontPayment > 0) {
            housingAndAssetsNet -= ev.upfrontPayment;
            pushTx(LifeEventDomain.HousingAsset, TaxBucket.NonTax, -ev.upfrontPayment, 0, `${ev.title} (Upfront)`);
          }
          vehicles.push({
            id: ev.id,
            currentValue: ev.assetValue,
            annualDepreciationRate: ev.annualDepreciationRate,
            monthlyPayment: ev.monthlyPayment,
            remainingPaymentMonths: Math.max(0, ev.durationMonths),
          });
          break;
        }
        case LifeEventKind.SolarPvInstallation: {
          if (ev.upfrontCapex > 0) {
            housingAndAssetsNet -= ev.upfrontCapex;
            pushTx(LifeEventDomain.HousingAsset, TaxBucket.NonTax, -ev.upfrontCapex, 0, `${ev.title} (Capex)`);
          }
          solars.push({
            id: ev.id,
            label: ev.title,
            currentValue: ev.upfrontCapex,
            monthlyBenefit: ev.monthlyElectricitySavings + ev.monthlyFeedInRevenue,
            remainingMonths: Math.max(1, ev.durationMonths),
          });
          break;
        }
        case LifeEventKind.LoanOrDebt: {
          if (ev.addToLiquidCash && ev.principalAmount > 0) {
            housingAndAssetsNet += ev.principalAmount;
            pushTx(LifeEventDomain.HousingAsset, TaxBucket.NonTax, ev.principalAmount, 0, `${ev.title} (Loan Disbursement)`);
          }
          loans.push({
            id: ev.id,
            label: ev.title,
            remainingPrincipal: ev.principalAmount,
            annualInterestRate: ev.annualInterestRate,
            monthlyAnnuity: ev.monthlyPayment,
            monthlyMaintenance: 0,
          });
          break;
        }
        case LifeEventKind.LivingBudgetChange: {
          currentMonthlyLiving = Number(ev.newMonthlyLivingExpenses);
          break;
        }
        case LifeEventKind.TravelTrip: {
          const spread = Math.max(1, ev.durationMonths ?? 1);
          if (spread === 1) {
            otherEventsNet -= ev.totalCost;
            pushTx(LifeEventDomain.ExpenseTravel, TaxBucket.NonTax, -ev.totalCost, 0, ev.title);
          }
          else {
            recurringWindows.push({
              id: ev.id,
              domain: LifeEventDomain.ExpenseTravel,
              label: ev.title,
              monthlyAmount: roundToCents(ev.totalCost / spread),
              bucket: TaxBucket.NonTax,
              isOutflow: true,
              remainingMonths: spread,
            });
          }
          break;
        }
        case LifeEventKind.OneOffCashflow: {
          otherEventsNet += ev.signedAmount;
          pushTx(
            LifeEventDomain.ExpenseTravel,
            ev.taxBucket,
            ev.signedAmount,
            Math.abs(ev.signedAmount),
            ev.title,
          );
          break;
        }
        case LifeEventKind.ResidencyMilestone: {
          const citation = ev.milestoneKind === ResidencyMilestoneKind.PermanentResidency18c
            ? "§ 18c AufenthG"
            : ev.milestoneKind === ResidencyMilestoneKind.Citizenship10StAG
              ? "§ 10 StAG"
              : ev.milestoneKind === ResidencyMilestoneKind.BlueCardIssued
                ? "§ 18g AufenthG"
                : "BMG / AufenthG";
          deadlines.push(Object.freeze({
            id: `DL-${ev.id}`,
            month: simMonth,
            calendarYear: calYear,
            calendarMonth: calMonth,
            domain: LifeEventDomain.Residency,
            severity: ev.milestoneKind === ResidencyMilestoneKind.PermitRenewal
              ? LifeDeadlineSeverity.Critical
              : LifeDeadlineSeverity.Info,
            title: ev.title,
            description: ev.notes ?? `Residency milestone scheduled (${citation}).`,
            statutoryCitation: toStatutoryCitation(citation),
          }));
          break;
        }
      }
    }

    // 2. Apply recurring yearly events on anniversary months (after initial trigger month).
    for (const ev of recurringYearlyEvents) {
      if (m > ev.effectiveMonth && (m - ev.effectiveMonth) % 12 === 0) {
        if (ev.kind === LifeEventKind.BonusSchedule) {
          if (ev.personKey === LifePersonKey.Primary) {
            primaryBonusGross += ev.grossBonusAmount;
          }
          else if (partner) {
            partnerBonusGross += ev.grossBonusAmount;
          }
        }
        else if (ev.kind === LifeEventKind.DeductibleExpenses) {
          const credits = evaluateDeductibleExpensesFormula({
            werbungskostenAnnual: ev.werbungskostenAnnual,
            sonderausgabenAnnual: ev.sonderausgabenAnnual,
            householdServicesLaborAnnual: ev.householdServicesLaborAnnual,
            craftsmenLaborAnnual: ev.craftsmenLaborAnnual,
            marginalTaxRate: baseline.primary.churchTaxRate,
          });
          if (ev.werbungskostenAnnual > 0) {
            pushTx(LifeEventDomain.Tax, TaxBucket.Werbungskosten9, 0, ev.werbungskostenAnnual, `${ev.title} (§ 9 Werbungskosten)`, "§ 9 EStG");
          }
          if (ev.sonderausgabenAnnual > 0) {
            pushTx(LifeEventDomain.Tax, TaxBucket.Sonderausgaben10, 0, ev.sonderausgabenAnnual, `${ev.title} (§ 10 Sonderausgaben)`, "§ 10 EStG");
          }
          if (credits.totalDirectTaxCredits > 0) {
            pushTx(LifeEventDomain.Tax, TaxBucket.TaxCredit35a, 0, credits.totalDirectTaxCredits, `${ev.title} (§ 35a Direct Credit)`, "§ 35a EStG");
          }
        }
        else if (ev.kind === LifeEventKind.CapitalIncome) {
          otherEventsNet += ev.annualGrossReturn;
          pushTx(LifeEventDomain.Tax, TaxBucket.CapitalGains, ev.annualGrossReturn, ev.annualGrossReturn, ev.title, "§ 20, § 32d EStG");
        }
      }
    }

    // 3. Evaluate monthly payroll & statutory wage-replacement benefits for each adult.
    let partnerNetSalary = 0;
    let statutoryBenefits = 0;

    const evaluateAdultMonth = (adult: MutableAdultState, bonusGross: number): number => {
      // Clear expired company car if endMonth passed.
      if (adult.companyCar?.endMonth && m > adult.companyCar.endMonth) {
        adult.companyCar = undefined;
      }

      // Mutterschutz takes precedence.
      if (adult.mutterschutzRemainingMonths > 0) {
        adult.mutterschutzRemainingMonths -= 1;
        statutoryBenefits += adult.mutterschutzNet;
        pushTx(
          LifeEventDomain.Family,
          TaxBucket.ProgressionBenefit32b,
          adult.mutterschutzNet,
          adult.mutterschutzNet,
          `${adult.name} Mutterschutz`,
          "§§ 19, 20 MuSchG; § 32b EStG",
        );
        return 0;
      }

      // Parental leave (Elterngeld).
      if (adult.parentalLeaveRemainingMonths > 0) {
        adult.parentalLeaveRemainingMonths -= 1;
        statutoryBenefits += adult.parentalLeaveBenefit;
        pushTx(
          LifeEventDomain.Family,
          TaxBucket.ProgressionBenefit32b,
          adult.parentalLeaveBenefit,
          adult.parentalLeaveBenefit,
          `${adult.name} Elterngeld (${adult.parentalLeaveMode})`,
          "§§ 2, 4 BEEG; § 32b EStG",
        );
        return 0;
      }

      // Long-term illness (Krankengeld).
      if (adult.krankengeldRemainingMonths > 0) {
        adult.krankengeldRemainingMonths -= 1;
        statutoryBenefits += adult.krankengeldMonthlyBenefit;
        pushTx(
          LifeEventDomain.Career,
          TaxBucket.ProgressionBenefit32b,
          adult.krankengeldMonthlyBenefit,
          adult.krankengeldMonthlyBenefit,
          `${adult.name} Krankengeld`,
          "§ 47 SGB V; § 32b EStG",
        );
        if (adult.krankengeldRemainingMonths === 0 && adult.reemploymentGross !== undefined) {
          adult.monthlyGross = adult.reemploymentGross;
          adult.reemploymentGross = undefined;
        }
        return 0;
      }

      // Unemployment / Sperrzeit / ALG I.
      if (adult.unemploymentRemainingMonths > 0) {
        adult.unemploymentRemainingMonths -= 1;
        if (adult.sperrzeitRemainingMonths > 0) {
          adult.sperrzeitRemainingMonths -= 1;
          pushTx(
            LifeEventDomain.Career,
            TaxBucket.NonTax,
            0,
            0,
            `${adult.name} Unpaid / Sperrzeit`,
            "§ 159 SGB III",
          );
        }
        else if (adult.alg1MonthlyBenefit > 0) {
          statutoryBenefits += adult.alg1MonthlyBenefit;
          pushTx(
            LifeEventDomain.Career,
            TaxBucket.ProgressionBenefit32b,
            adult.alg1MonthlyBenefit,
            adult.alg1MonthlyBenefit,
            `${adult.name} ALG I`,
            "§ 149 SGB III; § 32b EStG",
          );
        }
        if (adult.unemploymentRemainingMonths === 0 && adult.reemploymentGross !== undefined) {
          adult.monthlyGross = adult.reemploymentGross;
          adult.reemploymentGross = undefined;
        }
        // Severance or trailing bonus paid during first month of job end still goes through payroll tax.
        if (bonusGross <= 0) {
          return 0;
        }
      }

      const baseGross = adult.unemploymentRemainingMonths > 0 ? toGrossSalary(0) : adult.monthlyGross;
      const benefitInKind = adult.companyCar ? computeCompanyCarMonthlyBenefit(adult.companyCar) : 0;
      const payrollGross = toGrossSalary(roundToCents(baseGross + benefitInKind));

      // Automatic 13th (Nov) and 14th (Jun + Nov) salary cadence for active working months.
      let cadenceBonus = 0;
      if (baseGross > 0) {
        if (adult.annualSalariesCount >= 13 && calMonth === 11) {
          cadenceBonus += baseGross;
        }
        if (adult.annualSalariesCount >= 14 && calMonth === 6) {
          cadenceBonus += baseGross;
        }
      }
      const effectiveBonusGross = roundToCents(bonusGross + cadenceBonus);

      if (payrollGross <= 0 && effectiveBonusGross <= 0) {
        return 0;
      }

      const breakdown = computeGrossToNetBreakdown(
        payrollGross,
        adult.taxClass,
        children.length,
        effectiveBonusGross > 0 ? toEuroAmount(effectiveBonusGross) : undefined,
        undefined,
        rules,
        {
          ...adult.payrollOptions,
          healthSupplementTotalRate: adult.healthInsuranceKind === HealthInsuranceKind.PublicGkv
            ? adult.healthSupplementRate
            : undefined,
          churchTaxRate: adult.churchTaxRate > 0 ? adult.churchTaxRate : undefined,
        },
      );

      // Benefit-in-kind is non-cash; PKV replaces employee GKV/PV share with privateHealthMonthlyEur.
      const pkvDelta = adult.healthInsuranceKind === HealthInsuranceKind.PrivatePkv
        ? (breakdown.healthInsurance + breakdown.careInsurance) - adult.privateHealthMonthlyEur
        : 0;
      const cashNet = Math.max(0, roundToCents(breakdown.monthlyNetTakeHome - benefitInKind + pkvDelta));

      pushTx(
        LifeEventDomain.Career,
        TaxBucket.TaxableWage,
        cashNet,
        baseGross + effectiveBonusGross,
        `${adult.name} Net Salary${effectiveBonusGross > 0 ? " + Bonus" : ""}`,
        "§ 38b EStG",
      );
      if (benefitInKind > 0) {
        pushTx(
          LifeEventDomain.Career,
          TaxBucket.BenefitInKind,
          0,
          benefitInKind,
          `${adult.name} Company Car Benefit`,
          "§ 6 Abs. 1 Nr. 4 EStG",
        );
      }
      if (breakdown.monthlyWageTax > 0) {
        pushTx(LifeEventDomain.Tax, TaxBucket.WithheldWageTax, 0, breakdown.monthlyWageTax, `${adult.name} Wage Tax Withheld`, "§ 38a EStG");
      }
      if (breakdown.bonusWageTax > 0) {
        pushTx(LifeEventDomain.Tax, TaxBucket.WithheldWageTax, 0, breakdown.bonusWageTax, `${adult.name} Bonus Wage Tax Withheld`, "§ 39b Abs. 3 EStG");
      }
      const totalSoliWithheld = roundToCents(breakdown.monthlySolidaritySurcharge + breakdown.bonusSolidaritySurcharge);
      if (totalSoliWithheld > 0) {
        pushTx(LifeEventDomain.Tax, TaxBucket.WithheldSoli, 0, totalSoliWithheld, `${adult.name} Soli Withheld`, "SolzG");
      }
      const totalChurchWithheld = roundToCents(breakdown.monthlyChurchTax + breakdown.bonusChurchTax);
      if (totalChurchWithheld > 0) {
        pushTx(LifeEventDomain.Tax, TaxBucket.WithheldChurchTax, 0, totalChurchWithheld, `${adult.name} Church Tax Withheld`, "KiStG");
      }
      const totalSocial = breakdown.totalSocialSecurity + breakdown.bonusSocialSecurity;
      if (totalSocial > 0) {
        pushTx(LifeEventDomain.Tax, TaxBucket.SocialSecurity, 0, totalSocial, `${adult.name} Social Security`, "§ 10 Abs. 1 Nr. 2, 3 EStG");
      }
      if (adult.annualCommuterWerbungskosten > 0) {
        pushTx(
          LifeEventDomain.Career,
          TaxBucket.Werbungskosten9,
          0,
          roundToCents(adult.annualCommuterWerbungskosten / 12),
          `${adult.name} Commuter & Home-Office Deduction`,
          "§ 9 Abs. 1 Nr. 4 EStG",
        );
      }

      return cashNet;
    };

    const primaryNetSalary = evaluateAdultMonth(primary, primaryBonusGross);
    if (partner) {
      partnerNetSalary = evaluateAdultMonth(partner, partnerBonusGross);
    }

    // 4. Kindergeld (§ 66 EStG) for all active children.
    const kindergeldMonthlyRate = rules.parameters.childBenefitMonthly.value;
    const kindergeldThisMonth = roundToCents(children.length * kindergeldMonthlyRate);
    if (kindergeldThisMonth > 0) {
      statutoryBenefits += kindergeldThisMonth;
      kindergeldPerYear.set(calYear, (kindergeldPerYear.get(calYear) ?? 0) + kindergeldThisMonth);
      pushTx(
        LifeEventDomain.Family,
        TaxBucket.TaxExemptInflow,
        kindergeldThisMonth,
        kindergeldThisMonth,
        `Kindergeld (${children.length} ${children.length === 1 ? "child" : "children"})`,
        "§ 66 EStG",
      );
    }

    // 5. Housing, mortgages, assets, solar, vehicles.
    let essentialMonthlyOutflow = currentMonthlyLiving;
    if (currentMonthlyRent > 0) {
      housingAndAssetsNet -= currentMonthlyRent;
      essentialMonthlyOutflow += currentMonthlyRent;
      pushTx(LifeEventDomain.HousingAsset, TaxBucket.NonTax, -currentMonthlyRent, 0, "Monthly Rent");
    }

    for (const loan of loans) {
      if (loan.remainingPrincipal > 0) {
        const interest = roundToCents((loan.remainingPrincipal * loan.annualInterestRate) / 12);
        const principal = Math.min(loan.remainingPrincipal, Math.max(0, roundToCents(loan.monthlyAnnuity - interest)));
        const payment = roundToCents(interest + principal);
        loan.remainingPrincipal = roundToCents(Math.max(0, loan.remainingPrincipal - principal));
        housingAndAssetsNet -= payment;
        essentialMonthlyOutflow += payment;
        pushTx(LifeEventDomain.HousingAsset, TaxBucket.NonTax, -payment, 0, `${loan.label} Payment`);
      }
      if (loan.monthlyMaintenance > 0) {
        housingAndAssetsNet -= loan.monthlyMaintenance;
        essentialMonthlyOutflow += loan.monthlyMaintenance;
        pushTx(LifeEventDomain.HousingAsset, TaxBucket.NonTax, -loan.monthlyMaintenance, 0, `${loan.label} Maintenance Reserve`);
      }
    }

    for (const prop of properties) {
      if (prop.annualAppreciationRate !== 0) {
        prop.currentValue = roundToCents(prop.currentValue * (1 + prop.annualAppreciationRate / 12));
      }
    }

    for (const veh of vehicles) {
      if (veh.annualDepreciationRate > 0 && veh.currentValue > 0) {
        veh.currentValue = roundToCents(Math.max(0, veh.currentValue * (1 - veh.annualDepreciationRate / 12)));
      }
      if (veh.remainingPaymentMonths > 0 && veh.monthlyPayment > 0) {
        veh.remainingPaymentMonths -= 1;
        housingAndAssetsNet -= veh.monthlyPayment;
        essentialMonthlyOutflow += veh.monthlyPayment;
        pushTx(LifeEventDomain.HousingAsset, TaxBucket.NonTax, -veh.monthlyPayment, 0, "Vehicle Financing / Lease");
      }
    }

    for (const solar of solars) {
      if (solar.remainingMonths > 0) {
        solar.remainingMonths -= 1;
        housingAndAssetsNet += solar.monthlyBenefit;
        pushTx(
          LifeEventDomain.HousingAsset,
          TaxBucket.TaxExemptInflow,
          solar.monthlyBenefit,
          solar.monthlyBenefit,
          `${solar.label} Savings & Feed-in`,
          "§ 3 Nr. 72 EStG",
        );
      }
    }

    // 6. Living expenses & active recurring windows (childcare, regional benefits, side jobs, spread travel).
    let livingAndChildcareOutflow = currentMonthlyLiving;
    if (currentMonthlyLiving > 0) {
      pushTx(LifeEventDomain.ExpenseTravel, TaxBucket.NonTax, -currentMonthlyLiving, 0, "Monthly Living Expenses");
    }

    for (const win of recurringWindows) {
      if (win.remainingMonths <= 0) {
        continue;
      }
      win.remainingMonths -= 1;
      if (win.isOutflow) {
        if (win.domain === LifeEventDomain.Family) {
          livingAndChildcareOutflow += win.monthlyAmount;
          essentialMonthlyOutflow += win.monthlyAmount;
        }
        else {
          otherEventsNet -= win.monthlyAmount;
        }
        pushTx(
          win.domain,
          win.bucket,
          -win.monthlyAmount,
          win.bucket === TaxBucket.NonTax ? 0 : win.monthlyAmount,
          win.label,
          win.bucket === TaxBucket.ChildcareDeductible10_1_5 ? "§ 10 Abs. 1 Nr. 5 EStG" : undefined,
        );
      }
      else {
        if (win.domain === LifeEventDomain.Family) {
          statutoryBenefits += win.monthlyAmount;
        }
        else {
          otherEventsNet += win.monthlyAmount;
        }
        pushTx(win.domain, win.bucket, win.monthlyAmount, win.monthlyAmount, win.label);
      }
    }

    // 7. Snapshot end-of-month non-cash assets (incl. compounding investments) and debts.
    if (currentInvestmentsValue > 0 && annualInvestmentReturnRate !== 0) {
      currentInvestmentsValue = roundToCents(
        currentInvestmentsValue * (1 + annualInvestmentReturnRate / 12),
      );
    }
    const totalAssetsValue = roundToCents(
      baseline.openingAssetsValue +
      currentInvestmentsValue +
      properties.reduce((sum, p) => sum + p.currentValue, 0) +
      vehicles.reduce((sum, v) => sum + v.currentValue, 0) +
      solars.reduce((sum, s) => sum + s.currentValue, 0),
    );
    const totalDebtBalance = roundToCents(
      staticOpeningDebt +
      loans.reduce((sum, l) => sum + l.remainingPrincipal, 0),
    );

    const activeTaxClassLabel = partner
      ? `${primary.taxClass} / ${partner.taxClass}`
      : primary.taxClass;

    rawMonths.push({
      month: simMonth,
      calendarYear: calYear,
      calendarMonth: calMonth,
      monthId,
      activeTaxClassLabel,
      primaryNetSalary: roundToCents(primaryNetSalary),
      partnerNetSalary: roundToCents(partnerNetSalary),
      statutoryBenefits: roundToCents(statutoryBenefits),
      housingAndAssetsNet: roundToCents(housingAndAssetsNet),
      livingAndChildcareOutflow: roundToCents(livingAndChildcareOutflow),
      otherEventsNet: roundToCents(otherEventsNet),
      totalAssetsValue,
      totalDebtBalance,
      essentialMonthlyOutflow: Math.max(1, essentialMonthlyOutflow),
      actionMilestones: Object.freeze(actionMilestones),
      transactions,
      kindergeldThisMonth,
    });
  }

  // Pass 2: Collect annual tax records for every calendar year & post signed settlements into year + 1.
  const annualTaxRecords: AnnualLifeTaxRecord[] = [];
  const settlementByPostingMonth = new Map<
    number,
    {
      readonly record: AnnualLifeTaxRecord;
      readonly amount: EuroAmount;
    }
  >();
  const employedAdultsCount = partner ? 2 : 1;
  const effectiveChurchRate = primary.churchTaxRate;

  const sortedYears = [...monthsPerYear.keys()].sort((a, b) => a - b);
  for (const yearNum of sortedYears) {
    const calYear = toFullCalendarYear(yearNum);
    const count = monthsPerYear.get(yearNum) ?? 0;
    const isCompleteYear = count === 12;
    const yearTxs = transactionsByYear.get(yearNum) ?? [];
    const yearKindergeld = roundToCents(kindergeldPerYear.get(yearNum) ?? 0);
    const activeChildrenForYear = children.filter((c) => c.birthCalendarYear <= calYear);

    const record = collectAndSettleAnnualLifeTax({
      calendarYear: calYear,
      isCompleteYear,
      isJointAssessment: Boolean(partner && baseline.isMarriedJointAssessment),
      employedAdultsCount,
      churchTaxRate: baseline.primary.churchTaxRate,
      children: activeChildrenForYear,
      kindergeldReceived: yearKindergeld,
      transactions: yearTxs,
      taxRules: getTaxRules(calYear),
    });

    // Find posting month in year + 1 (taxReturnMonth).
    let postedInMonth: SimulationMonth | undefined;
    if (isCompleteYear && record.settlementEur !== 0) {
      const targetRow = rawMonths.find(
        (r) => r.calendarYear === calYear + 1 && r.calendarMonth === baseline.taxReturnMonth,
      );
      if (targetRow) {
        postedInMonth = targetRow.month;
        settlementByPostingMonth.set(targetRow.month, {
          record,
          amount: record.settlementEur,
        });
      }
    }

    annualTaxRecords.push(Object.freeze({
      ...record,
      postedInMonth,
    }));

    // Add statutory tax-filing deadline (§ 149 AO: July 31 of following year) if complete year.
    if (isCompleteYear) {
      const filingRow = rawMonths.find(
        (r) => r.calendarYear === calYear + 1 && r.calendarMonth === toCalendarMonth(7),
      );
      if (filingRow) {
        deadlines.push(Object.freeze({
          id: `DL-TAX-FILING-${calYear}`,
          month: filingRow.month,
          calendarYear: filingRow.calendarYear,
          calendarMonth: filingRow.calendarMonth,
          domain: LifeEventDomain.Tax,
          severity: record.settlementEur < 0 ? LifeDeadlineSeverity.Warning : LifeDeadlineSeverity.Info,
          title: `Income tax return deadline (${calYear})`,
          description: record.settlementEur < 0
            ? `Expected tax repayment of €${Math.abs(record.settlementEur).toFixed(0)} — reserve liquidity.`
            : `Expected tax refund of €${record.settlementEur.toFixed(0)}.`,
          statutoryCitation: toStatutoryCitation("§ 149 Abs. 2 AO"),
        }));
      }
    }
  }

  // Pass 3: Rebuild final immutable monthly ledger entries with running Cash, Runway, and Net Worth.
  const finalMonths: LifeMonthlyLedgerEntry[] = [];
  let runningCash = Number(baseline.openingLiquidCash);
  let cumulativeNetCashflow = 0;
  let minLiquidCash = runningCash;
  let minLiquidCashMonth = toSimulationMonth(1);
  let minRunwayMonths = Number.POSITIVE_INFINITY;
  let shortfallMonth: SimulationMonth | undefined;
  let totalTaxWithheld = 0;
  let totalAnnualTaxSettlements = 0;

  for (const raw of rawMonths) {
    const settlementInfo = settlementByPostingMonth.get(raw.month);
    const taxRefundOrRepayment = settlementInfo ? settlementInfo.amount : toEuroAmount(0);
    const finalTxs = [...raw.transactions];

    if (settlementInfo && taxRefundOrRepayment !== 0) {
      finalTxs.push(Object.freeze({
        transactionId: `LP-${raw.monthId}-TAX-SETTLEMENT`,
        month: raw.month,
        calendarYear: raw.calendarYear,
        calendarMonth: raw.calendarMonth,
        domain: LifeEventDomain.Tax,
        bucket: TaxBucket.NonTax,
        signedCashAmount: taxRefundOrRepayment,
        taxBasisAmount: toEuroAmount(Math.abs(taxRefundOrRepayment)),
        label: `Annual Tax Settlement ${settlementInfo.record.calendarYear} (${taxRefundOrRepayment > 0 ? "Refund" : "Repayment"})`,
        statutoryCitation: toStatutoryCitation("§ 36 EStG"),
      }));
    }

    for (const tx of raw.transactions) {
      if (
        tx.bucket === TaxBucket.WithheldWageTax ||
        tx.bucket === TaxBucket.WithheldSoli ||
        tx.bucket === TaxBucket.WithheldChurchTax
      ) {
        totalTaxWithheld += tx.taxBasisAmount;
      }
    }
    totalAnnualTaxSettlements += taxRefundOrRepayment;

    const monthlyNetCashflow = roundToCents(
      raw.primaryNetSalary +
      raw.partnerNetSalary +
      raw.statutoryBenefits +
      taxRefundOrRepayment +
      raw.housingAndAssetsNet -
      raw.livingAndChildcareOutflow +
      raw.otherEventsNet,
    );

    runningCash = roundToCents(runningCash + monthlyNetCashflow);
    cumulativeNetCashflow = roundToCents(cumulativeNetCashflow + monthlyNetCashflow);

    const emergencyRunwayMonths = Math.round((runningCash / raw.essentialMonthlyOutflow) * 10) / 10;
    const netWorth = roundToCents(runningCash + raw.totalAssetsValue - raw.totalDebtBalance);

    if (runningCash < minLiquidCash) {
      minLiquidCash = runningCash;
      minLiquidCashMonth = raw.month;
    }
    if (emergencyRunwayMonths < minRunwayMonths) {
      minRunwayMonths = emergencyRunwayMonths;
    }
    if (shortfallMonth === undefined && runningCash < 0) {
      shortfallMonth = raw.month;
    }

    finalMonths.push(Object.freeze({
      month: raw.month,
      calendarYear: raw.calendarYear,
      calendarMonth: raw.calendarMonth,
      monthId: raw.monthId,
      activeTaxClassLabel: raw.activeTaxClassLabel,
      primaryNetSalary: raw.primaryNetSalary,
      partnerNetSalary: raw.partnerNetSalary,
      statutoryBenefits: raw.statutoryBenefits,
      taxRefundOrRepayment,
      housingAndAssetsNet: raw.housingAndAssetsNet,
      livingAndChildcareOutflow: raw.livingAndChildcareOutflow,
      otherEventsNet: raw.otherEventsNet,
      monthlyNetCashflow,
      liquidCashBalance: toEuroAmount(runningCash),
      emergencyRunwayMonths,
      totalAssetsValue: raw.totalAssetsValue,
      totalDebtBalance: raw.totalDebtBalance,
      netWorth,
      actionMilestones: raw.actionMilestones,
      transactions: Object.freeze(finalTxs),
    }));
  }

  const lastMonth = finalMonths[finalMonths.length - 1];
  const summary: LifeSimulationSummary = Object.freeze({
    cumulativeNetCashflow: roundToCents(cumulativeNetCashflow),
    endingLiquidCash: lastMonth ? lastMonth.liquidCashBalance : baseline.openingLiquidCash,
    minLiquidCash: roundToCents(minLiquidCash),
    minLiquidCashMonth,
    minRunwayMonths: Number.isFinite(minRunwayMonths) ? minRunwayMonths : 0,
    endingAssetsValue: lastMonth ? lastMonth.totalAssetsValue : baseline.openingAssetsValue,
    endingDebtBalance: lastMonth ? lastMonth.totalDebtBalance : baseline.openingDebtBalance,
    endingNetWorth: lastMonth
      ? lastMonth.netWorth
      : roundToCents(baseline.openingLiquidCash + baseline.openingAssetsValue - baseline.openingDebtBalance),
    totalTaxWithheld: roundToCents(totalTaxWithheld),
    totalAnnualTaxSettlements: roundToCents(totalAnnualTaxSettlements),
    totalNetTaxPaid: roundToCents(Math.max(0, totalTaxWithheld - totalAnnualTaxSettlements)),
    shortfallMonth,
  });

  // Unused local variable guard for church rate if needed in future extensions.
  void effectiveChurchRate;

  return Object.freeze({
    scenarioKey,
    months: Object.freeze(finalMonths),
    annualTaxRecords: Object.freeze(annualTaxRecords),
    deadlines: Object.freeze(deadlines.sort((a, b) => a.month - b.month)),
    summary,
  });
}
