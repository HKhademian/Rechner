import {
  type SimulationMonth,
  type CalendarYear,
  type CalendarMonth,
  type NetSalary,
  type EuroAmount,
  TaxClass,
  SimulationStrategy,
  type StrategyId,
  type AnnualSalariesCount,
  TransactionType,
  TransactionDirection,
  SpecialEventType,
  SpecialEventCategory,
  ActionCategory,
  ActionType,
  TargetPerson,
  type SimulationResult,
  type MonthlyLedgerEntry,
  type AccountingTransaction,
  type SpecialEventItem,
  type ActionRowItem,
  type PreexistingConditions,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction,
  type ScenarioActionBatches,
  type MonthId,
  type MonthRef,
  type MonthSimRef,
  type GrossSalary,
  type WorkingHours,
  type FullCalendarYear,
  type CalendarLabel,
  type MonthDuration,
  type SalaryBonusSlot,
  toSimulationMonth,
  toCalendarYear,
  toFullCalendarYear,
  toCalendarMonth,
  toCalendarLabel,
  toMonthDuration,
  toChildrenCount,
  toChildIndex,
  toPercentageRate,
  toMonthId,
  toMonthRef,
  toMonthSimRef,
  toEuroAmount,
  toGrossSalary,
  toNetSalary,
  toWorkingHours,
  toEventId,
  toActionId,
  toPregnancyId,
  toSwitchId,
  toStatutoryCitation,
  toTaxFactor,
  toSpecialEventCategory,
} from "#engine/types";
import {
  createTransaction, 
} from "#engine/ledger/transaction";
import {
  buildMonthlyLedgerEntry, 
} from "#engine/ledger/ledger";
import {
  computeGrossToNetBreakdown,
  computeMonthlyNetSalary,
} from "#engine/tax/wageTax";
import {
  getDefaultPersistedState, 
} from "#engine/storage/persistence";
import {
  computeMonthlySwapWithholdingVariance,
  computeAnnualTaxReconciliation,
  computeKinderfreibetragGuenstigerpruefung,
  type ChildYearPresence,
  type AnnualTaxReconciliationResult,
} from "#engine/tax/jointAssessment";
import {
  computeElterngeldBenefits,
  isElterngeldHoursEligible,
  isPartnerschaftsbonusEligible,
} from "#engine/benefits/elterngeldPlus";
import {
  computeSiblingBonus, 
} from "#engine/benefits/siblingBonus";
import {
  synthesizeStrategyBatches, 
} from "#engine/simulator/strategySynthesizer";

/**
 * Input Parameter Specification for Legacy Timeline Simulation.
 */
export interface TimelineSimulationParams {
  /** Target strategy key (StatusQuo, UnoptimizedBaseline, StatutoryOptimized). */
  readonly scenarioKey: StrategyId;
  /** 4-digit Gregorian simulation start year (e.g. 2025). */
  readonly startCalendarYear?: FullCalendarYear;
  /** 1-based Gregorian simulation start month (1..12). */
  readonly startCalendarMonth?: CalendarMonth;
  /** Total simulation duration in months (e.g. 60 or 120). */
  readonly simulationDurationMonths?: MonthDuration;
  /** Husband's regular monthly gross salary in EUR. */
  readonly husbandGross?: GrossSalary;
  /** Wife's pre-birth monthly gross salary in EUR. */
  readonly wifeGross?: GrossSalary;
  /** Wife's post-birth part-time weekly working hours (e.g. 24h..32h). */
  readonly wifePostBirthHours?: WorkingHours;
  /** Husband's net salary in Tax Class III in EUR. */
  readonly husbandClass3Net: NetSalary;
  /** Husband's net salary in Tax Class V in EUR. */
  readonly husbandClass5Net: NetSalary;
  /** Wife's full-time net salary in Tax Class V in EUR. */
  readonly wifeClass5FullTimeNet: NetSalary;
  /** Wife's full-time net salary in Tax Class III in EUR. */
  readonly wifeClass3FullTimeNet: NetSalary;
  /** Wife's part-time net salary in Tax Class V in EUR. */
  readonly wifeClass5PartTimeNet: NetSalary;
  /** Wife's part-time net salary in Tax Class III in EUR. */
  readonly wifeClass3PartTimeNet: NetSalary;
  /** Statutory monthly Kindergeld rate per child in EUR. */
  readonly kindergeldPerChild: EuroAmount;
  /** Pre-pregnancy planning buffer duration in months. */
  readonly prePregnancyPlanningMonths: MonthDuration;
  /** Simulation month of Child 1 delivery. */
  readonly child1BirthMonth: SimulationMonth;
  /** Spacing between Child 1 and Child 2 deliveries in months. */
  readonly birthSpacingMonths: MonthDuration;
  /** Lead time for proactive tax class swap prior to conception in months. */
  readonly swapLeadMonths: MonthDuration;
  /** Toggle enabling 13th salary bonus payments. */
  readonly enable13thSalary: boolean;
  /** Calendar month of vacation bonus disbursement (1..12). */
  readonly bonus40Month: CalendarMonth;
  /** Calendar month of Christmas bonus disbursement (1..12). */
  readonly bonus60Month: CalendarMonth;
  /** Husband total annual salaries count (12, 13, 14, 15). */
  readonly husbandSalariesCount?: AnnualSalariesCount;
  /** Husband bonus distribution schedule. */
  readonly husbandBonusDistribution?: readonly SalaryBonusSlot[];
  /** Wife total annual salaries count (12, 13, 14, 15). */
  readonly wifeSalariesCount?: AnnualSalariesCount;
  /** Wife bonus distribution schedule. */
  readonly wifeBonusDistribution?: readonly SalaryBonusSlot[];
  /** Calendar month of annual tax return reconciliation refund (1..12). */
  readonly taxReturnMonth: CalendarMonth;
}

/**
 * Calculates the statutory simulation start calendar date anchored to the first positive pregnancy test:
 * 1. Subtract at least 3 months prior to pregnancy positive test date.
 * 2. Snap to the first month (January) of that resulting calendar year.
 *
 * @param pregPositiveYear - 4-digit calendar year of positive pregnancy test.
 * @param pregPositiveMonth - 1-based calendar month of positive test (1..12).
 * @returns Start year/month, pre-pregnancy planning buffer, and positive test simulation month.
 */
export function calculateSimulationStartDate(
  pregPositiveYear: FullCalendarYear,
  pregPositiveMonth: CalendarMonth,
): {
  startCalendarYear: FullCalendarYear;
  startCalendarMonth: CalendarMonth;
  prePregnancyPlanningMonths: MonthDuration;
  pregnancySimulationMonth: SimulationMonth;
} {
  const pYear = pregPositiveYear;
  const pMonth = pregPositiveMonth;
  // 1. Subtract 3 months
  const totalMonths = pYear * 12 + (pMonth - 1) - 3;
  const resultYear = Math.floor(totalMonths / 12);

  // 2. First month of the resulting year (January)
  const startCalendarYear = toFullCalendarYear(resultYear);
  const startCalendarMonth = toCalendarMonth(1);

  // 3. Pre-pregnancy buffer months in the simulation (simulation months before pregnancy positive)
  const pregnancySimulationMonth = toSimulationMonth(
    (pYear - startCalendarYear) * 12 +
      (pMonth - startCalendarMonth) +
      1,
  );
  const prePregnancyPlanningMonths = toMonthDuration(
    pregnancySimulationMonth - 1,
  );

  return {
    startCalendarYear,
    startCalendarMonth,
    prePregnancyPlanningMonths,
    pregnancySimulationMonth,
  };
}

/**
 * Executes a deterministic multi-year simulation scenario from discrete action batches:
 * - Batch 0: Preexisting baseline conditions (tax classes, baseline salaries, existing children).
 * - Batch 1: Pregnancy positive timeline decisions (positive test date, delivery date, leave hours).
 * - Batch 2: Proactive tax class switch actions (optimization intent, reversion timing).
 * - Batch 3: Salary raises, career compensation adjustments, and contractual working hours changes.
 * - Batch 4: Discrete financial events (one-off expenses, grants, capital inflows).
 *
 * @param batches - Strongly-typed `ScenarioActionBatches` payload.
 * @returns Complete `SimulationResult` containing monthly ledger entries and aggregated KPI summary.
 */
export function runScenarioBatches(
  inputBatches: ScenarioActionBatches,
): SimulationResult {
  const batches = synthesizeStrategyBatches(inputBatches);
  const {
    scenarioKey,
    preexisting,
    pregnancies,
    taxClassSwitches,
    salaryRaises,
    workingHoursChanges = [],
    financialEvents = [],
  } = batches;

  const startYear = preexisting.startCalendarYear;
  const startMonth = preexisting.startCalendarMonth;
  const duration = preexisting.simulationDurationMonths;
  const kgRate = preexisting.kindergeldPerChild;

  // PASS 1: Month-by-month state reduction across action batches
  interface RawMonth {
    readonly monthId: MonthId;
    readonly month: SimulationMonth;
    readonly year: CalendarYear;
    readonly monthInYear: CalendarMonth;
    readonly calendarYearNum: FullCalendarYear;
    readonly calendarMonthNum: CalendarMonth;
    readonly calendarLabel: CalendarLabel;
    readonly relativeBirthLabel: MonthRef;
    readonly relativeMonthLabel: MonthRef;
    readonly monthRef: MonthRef;
    readonly monthSimRef: MonthSimRef;
    readonly relativeMonthIndex: number;
    readonly husbandSalary: EuroAmount;
    readonly wifeSalary: EuroAmount;
    readonly mutterschutz: EuroAmount;
    readonly wifeElterngeld: EuroAmount;
    readonly husbandElterngeld: EuroAmount;
    readonly kindergeld: EuroAmount;
    readonly taxClassLabel: string;
    readonly phaseLabel: string;
    readonly isSwapActive: boolean;
    readonly isMutterschutz: boolean;
    readonly isPartnerschaftsbonus: boolean;
    readonly hasSiblingBonus: boolean;
    readonly monthlyWithholdingDeficit: EuroAmount;
    readonly husbandBaselineNet: EuroAmount;
    readonly wifeBaselineNet: EuroAmount;
    readonly transactions: AccountingTransaction[];

  }

  const rawMonths: RawMonth[] = [];

  // Identify Child 1 and Child 2 deliveries for relative notation
  const child1Delivery =
    pregnancies.length > 0
      ? pregnancies[0].calculatedDeliverySimulationMonth
      : 12;
  const child2Delivery =
    pregnancies.length > 1
      ? pregnancies[1].calculatedDeliverySimulationMonth
      : 999;

  for (let m = 1; m <= duration; m++) {
    const sMonth = toSimulationMonth(m);
    const monthSimRef = toMonthSimRef(m);
    const totalElapsedMonths = startMonth - 1 + (m - 1);
    const calendarMonthNum = toCalendarMonth((totalElapsedMonths % 12) + 1);
    const calendarYearNum = toFullCalendarYear(
      startYear + Math.floor(totalElapsedMonths / 12),
    );
    const calendarLabel = toCalendarLabel(calendarMonthNum, calendarYearNum);
    const monthId = toMonthId(calendarMonthNum, calendarYearNum);
    const year = toCalendarYear(Math.min(10, Math.ceil(m / 12)));
    const monthInYear = toCalendarMonth(((m - 1) % 12) + 1);

    // Mx counter starting from first pregnancy positive test (M1 = Positive Test)
    let relativeMonthIndex: number;
    let relativeBirthLabel: MonthRef;
    let relativeMonthLabel: MonthRef;

    if (pregnancies.length === 0) {
      relativeMonthIndex = m;
      relativeMonthLabel = toMonthRef(m);
      relativeBirthLabel = relativeMonthLabel;
    }
    else {
      const preg1PositiveMonth =
        pregnancies[0]?.positiveTestSimulationMonth ??
        Math.max(1, child1Delivery - 8);

      if (m < preg1PositiveMonth) {
        relativeMonthIndex = m - preg1PositiveMonth; // Negative offset: M-1, M-2, ..., M-8
        relativeMonthLabel = toMonthRef(relativeMonthIndex);
        relativeBirthLabel = relativeMonthLabel;
      }
      else {
        relativeMonthIndex = m - preg1PositiveMonth + 1; // M1, M2, M3, ...
        if (m === preg1PositiveMonth) {
          relativeMonthLabel = toMonthRef(1, "Pregnancy Positive");
        }
        else if (m === child1Delivery) {
          relativeMonthLabel = toMonthRef(relativeMonthIndex, "Birth 1");
        }
        else if (pregnancies.length > 1 && m === child2Delivery) {
          relativeMonthLabel = toMonthRef(relativeMonthIndex, "Birth 2");
        }
        else {
          relativeMonthLabel = toMonthRef(relativeMonthIndex);
        }
        relativeBirthLabel = relativeMonthLabel;
      }
    }


    // --- Batch 3: Evaluate Dynamic Working Hours & Schedules ---
    let activeHusbandHours = preexisting.husbandWeeklyHours ?? 40;
    let activeWifeHours = preexisting.wifeWeeklyHours ?? 40;

    let hasExplicitWifeHoursChange = false;
    workingHoursChanges.forEach((whc) => {
      if (whc.effectiveSimulationMonth <= m) {
        if (
          whc.targetPerson === TargetPerson.Husband ||
          whc.targetPerson === TargetPerson.Both
        ) {
          activeHusbandHours = whc.weeklyHours;
        }
        if (
          whc.targetPerson === TargetPerson.Wife ||
          whc.targetPerson === TargetPerson.Both
        ) {
          activeWifeHours = whc.weeklyHours;
          hasExplicitWifeHoursChange = true;
        }
      }
    });

    // --- Batch 3: Evaluate Active Salaries from Baseline + Raises ---
    let curH3Net = preexisting.husbandInitialNet;
    let curH5Net = preexisting.husbandInitialClass5Net;
    let curW5FT = preexisting.wifeInitialFullTimeNet;
    let curW3FT = preexisting.wifeInitialClass3FullTimeNet;
    let curW5PT = preexisting.wifeInitialPartTimeClass5Net;
    let curW3PT = preexisting.wifeInitialPartTimeClass3Net;

    salaryRaises.forEach((sr) => {
      if (sr.effectiveSimulationMonth <= m) {
        if (sr.percentageIncrease) {
          const factor = 1 + sr.percentageIncrease;
          curH3Net = toNetSalary(Math.round(curH3Net * factor));
          curH5Net = toNetSalary(Math.round(curH5Net * factor));
          curW5FT = toNetSalary(Math.round(curW5FT * factor));
          curW3FT = toNetSalary(Math.round(curW3FT * factor));
          curW5PT = toNetSalary(Math.round(curW5PT * factor));
          curW3PT = toNetSalary(Math.round(curW3PT * factor));
        }
        else {
          if (sr.newHusbandClass3Net) {
            curH3Net = sr.newHusbandClass3Net;
          }
          if (sr.newHusbandClass5Net) {
            curH5Net = sr.newHusbandClass5Net;
          }
          if (sr.newWifeClass5FTNet) {
            curW5FT = sr.newWifeClass5FTNet;
          }
          if (sr.newWifeClass3FTNet) {
            curW3FT = sr.newWifeClass3FTNet;
          }
          if (sr.newWifeClass5PTNet) {
            curW5PT = sr.newWifeClass5PTNet;
          }
          if (sr.newWifeClass3PTNet) {
            curW3PT = sr.newWifeClass3PTNet;
          }
        }
      }
    });

    // --- Batch 2: Evaluate Active Tax Classes & Switches ---
    const initialHTaxClass = preexisting.husbandInitialTaxClass ?? TaxClass.III;
    const initialWTaxClass = preexisting.wifeInitialTaxClass ?? TaxClass.V;
    const initialUseFactor = preexisting.initialUseTaxFactor ?? false;
    const initialTaxFactor = preexisting.initialTaxFactor ?? toTaxFactor(1.0);

    let activeHTaxClass = initialHTaxClass;
    let activeWTaxClass = initialWTaxClass;
    let activeUseFactor = initialUseFactor;
    let activeTaxFactor = initialTaxFactor;
    let isSwapActive = false;

    if (scenarioKey === SimulationStrategy.StatutoryOptimized) {
      taxClassSwitches.forEach((sw) => {
        const eff = sw.effectiveSimulationMonth;
        const rev = sw.revertSimulationMonth ?? Infinity;
        if (m >= eff && m < rev) {
          isSwapActive = true;
          activeHTaxClass = sw.targetHusbandTaxClass;
          activeWTaxClass = sw.targetWifeTaxClass;
          activeUseFactor = sw.targetUseTaxFactor ?? false;
          if (sw.targetTaxFactor) {
            activeTaxFactor = sw.targetTaxFactor;
          }
        }
        else if (m >= rev) {
          if (sw.revertHusbandTaxClass) {
            activeHTaxClass = sw.revertHusbandTaxClass;
          }
          else {
            activeHTaxClass = initialHTaxClass;
          }

          if (sw.revertWifeTaxClass) {
            activeWTaxClass = sw.revertWifeTaxClass;
          }
          else {
            activeWTaxClass = initialWTaxClass;
          }

          if (sw.revertUseTaxFactor !== undefined) {
            activeUseFactor = sw.revertUseTaxFactor;
          }
          else {
            activeUseFactor = initialUseFactor;
          }
        }
      });
    }

    const formatTaxLabel = (hCl: TaxClass, wCl: TaxClass, useFac: boolean) => {
      const hStr = useFac && hCl === TaxClass.IV ? "IV (F)" : hCl;
      const wStr = useFac && wCl === TaxClass.IV ? "IV (F)" : wCl;
      return `H: ${hStr} | W: ${wStr}`;
    };

    let taxClassLabel = formatTaxLabel(
      activeHTaxClass,
      activeWTaxClass,
      activeUseFactor,
    );

    // Compute husband salary based on active tax class
    let husbandSalaryNum: number;
    if (activeHTaxClass === TaxClass.V) {
      husbandSalaryNum = curH5Net;
    }
    else if (activeHTaxClass === TaxClass.IV) {
      husbandSalaryNum =
        activeUseFactor && preexisting.husbandGross
          ? computeMonthlyNetSalary(
            preexisting.husbandGross,
            TaxClass.IV,
            0,
            undefined,
            activeTaxFactor,
          )
          : preexisting.husbandInitialClass4Net ||
            Math.round(curH3Net * 0.88);
    }
    else {
      husbandSalaryNum = curH3Net;
    }
    let husbandSalary = toEuroAmount(husbandSalaryNum);

    // Compute wife full-time salary based on active tax class
    let wifeFTNetNum: number;
    if (activeWTaxClass === TaxClass.III) {
      wifeFTNetNum = curW3FT;
    }
    else if (activeWTaxClass === TaxClass.IV) {
      wifeFTNetNum =
        activeUseFactor && preexisting.wifeGross
          ? computeMonthlyNetSalary(
            preexisting.wifeGross,
            TaxClass.IV,
            0,
            undefined,
            activeTaxFactor,
          )
          : preexisting.wifeInitialClass4FullTimeNet ||
            Math.round(curW5FT * 1.15);
    }
    else {
      wifeFTNetNum = curW5FT;
    }

    let wifeSalary = toEuroAmount(0);
    let mutterschutz = toEuroAmount(0);
    let wifeElterngeld = toEuroAmount(0);
    let husbandElterngeld = toEuroAmount(0);
    let kindergeld = toEuroAmount(0);
    let phaseLabel = "Standard Career";
    let isMutterschutz = false;
    let isPartnerschaftsbonus = false;
    let hasSiblingBonus = false;
    const transactions: AccountingTransaction[] = [];

    // --- Batch 1: Evaluate Active Pregnancies & Parental Leaves ---
    if (scenarioKey === SimulationStrategy.StatusQuo) {
      husbandSalary = toEuroAmount(husbandSalaryNum);
      wifeSalary = toEuroAmount(wifeFTNetNum);
      phaseLabel = "Standard Career (No Children)";
      taxClassLabel = formatTaxLabel(
        initialHTaxClass,
        initialWTaxClass,
        initialUseFactor,
      );
    }
    else {
      // Calculate living children count for Kindergeld
      let livingChildren: number = preexisting.existingChildrenCount;
      pregnancies.forEach((preg) => {
        const del = preg.calculatedDeliverySimulationMonth;
        if (m >= del) {
          livingChildren += 1;
        }
      });
      kindergeld = toEuroAmount(livingChildren * kgRate);

      // Check lifecycle per pregnancy
      let inSpecialPhase = false;

      pregnancies.forEach((preg, pIdx) => {
        const b = preg.calculatedDeliverySimulationMonth;
        const preM = b - 1;
        const mutterschutzMonths = [preM, b, b + 1];
        const egStart = b + 2;
        const egEnd = egStart + 11;
        const egBonusStart = egEnd + 1;
        const egBonusEnd = egBonusStart + 3;

        // Mutterschutz Phase
        if (mutterschutzMonths.includes(m)) {
          inSpecialPhase = true;
          isMutterschutz = true;
          wifeSalary = toEuroAmount(0);
          wifeElterngeld = toEuroAmount(0);

          if (scenarioKey === SimulationStrategy.StatutoryOptimized) {
            const mRate = pIdx === 0 ? curW3FT : curW3PT;
            mutterschutz = toEuroAmount(mRate);
            phaseLabel =
              m === preM
                ? `Pre-Birth Mutterschutz (Child ${preg.childIndex})`
                : `Post-Birth Mutterschutz (Child ${preg.childIndex})`;
          }
          else {
            const mRate = pIdx === 0 ? curW5FT : curW5PT;
            mutterschutz = toEuroAmount(mRate);
            phaseLabel =
              m === preM
                ? `Pre-Birth Mutterschutz (Child ${preg.childIndex})`
                : `Post-Birth Mutterschutz (Child ${preg.childIndex})`;
          }

          // § 3 Abs. 1 & § 7 Abs. 2 BEEG: Check if previous pregnancy has active EG+ months to reallocate to Father
          if (pIdx > 0) {
            const prevPreg = pregnancies[pIdx - 1];
            const prevB = prevPreg.calculatedDeliverySimulationMonth;
            const prevEgStart = prevB + 2;
            const prevEgEnd = prevEgStart + 11;
            const prevEgBonusEnd = prevEgEnd + 4;

            if (m >= prevEgStart && m <= prevEgBonusEnd) {
              const fatherHours = activeHusbandHours;
              if (isElterngeldHoursEligible(fatherHours)) {
                const prevPtHours = prevPreg.motherPostBirthPartTimeHours ?? 24;
                const prevPtW5 = prevPreg.motherPostBirthPartTimeClass5Net || curW5PT;
                const dynamicW5PT =
                  prevPtHours > 0 && prevPtW5 > 0
                    ? Math.round(prevPtW5 * (prevPtHours / (preexisting.wifeWeeklyHours || 40)))
                    : curW5PT;
                const egEntitlement = computeElterngeldBenefits(
                  toNetSalary(
                    scenarioKey === SimulationStrategy.StatutoryOptimized
                      ? curW3FT
                      : curW5FT,
                  ),
                  toNetSalary(dynamicW5PT),
                  prevPtHours,
                );
                husbandElterngeld = egEntitlement.elterngeldPlus;
              }
            }
          }
        }
        // ElterngeldPlus Phase (Standard EG+ months and Partnerschaftsbonus months)
        else if (m >= egStart && m <= egBonusEnd) {
          inSpecialPhase = true;

          const motherHours = hasExplicitWifeHoursChange
            ? activeWifeHours
            : (preg.motherPostBirthPartTimeHours ?? 24);
          const fatherHours = activeHusbandHours;

          const defaultPtHours =
            preg.motherPostBirthPartTimeHours ?? 24;
          const basePtW5 =
            preg.motherPostBirthPartTimeClass5Net || curW5PT;
          const basePtW3 =
            preg.motherPostBirthPartTimeClass3Net || curW3PT;

          let dynamicW5PT: number;
          let dynamicW3PT: number;

          if (motherHours === defaultPtHours && basePtW5 > 0) {
            dynamicW5PT = basePtW5;
            dynamicW3PT = basePtW3;
          }
          else if (motherHours === 0) {
            dynamicW5PT = 0;
            dynamicW3PT = 0;
          }
          else if (motherHours === 40) {
            dynamicW5PT = curW5FT;
            dynamicW3PT = curW3FT;
          }
          else if (basePtW5 > 0 && defaultPtHours > 0) {
            dynamicW5PT = Math.round(basePtW5 * (motherHours / defaultPtHours));
            dynamicW3PT = Math.round(basePtW3 * (motherHours / defaultPtHours));
          }
          else {
            const baselineWifeH =
              preexisting.wifeWeeklyHours || 40;
            const wifeRatio =
              baselineWifeH > 0 ? motherHours / baselineWifeH : 0;
            dynamicW5PT = Math.round(curW5FT * wifeRatio);
            dynamicW3PT = Math.round(curW3FT * wifeRatio);
          }
          wifeSalary = toEuroAmount(dynamicW5PT);

          const isMotherEgEligible = isElterngeldHoursEligible(motherHours);
          const isBonusWindow = m >= egBonusStart && m <= egBonusEnd;
          const qualifiesPartnerschaftsbonus =
            isBonusWindow &&
            isPartnerschaftsbonusEligible(motherHours, fatherHours);

          if (isBonusWindow) {
            if (qualifiesPartnerschaftsbonus) {
              isPartnerschaftsbonus = true;
              husbandElterngeld = toEuroAmount(150);
              phaseLabel = `Partnerschaftsbonus ${preg.childIndex} (Both 24-32h)`;

              // Mother's benefit calculation
              if (pIdx === 0) {
                const egEntitlement = computeElterngeldBenefits(
                  toNetSalary(
                    scenarioKey === SimulationStrategy.StatutoryOptimized
                      ? curW3FT
                      : curW5FT,
                  ),
                  toNetSalary(dynamicW5PT),
                  motherHours,
                );
                wifeElterngeld = egEntitlement.elterngeldPlus;
              }
              else {
                const blendedNet = toNetSalary(
                  Math.round(
                    (10 *
                      (scenarioKey === SimulationStrategy.StatutoryOptimized
                        ? dynamicW3PT
                        : dynamicW5PT) +
                      2 *
                        (scenarioKey === SimulationStrategy.StatutoryOptimized
                          ? curW3FT
                          : curW5FT)) /
                      12,
                  ),
                );
                const egEntitlement = computeElterngeldBenefits(
                  blendedNet,
                  toNetSalary(dynamicW5PT),
                  motherHours,
                );
                const prevBirth =
                  pregnancies[0].calculatedDeliverySimulationMonth;
                const sibling = computeSiblingBonus(
                  egEntitlement.elterngeldPlus,
                  prevBirth,
                  sMonth,
                );
                hasSiblingBonus = sibling.isEligible;
                wifeElterngeld = sibling.totalElterngeldPlusWithBonus;
              }
            }
            else {
              // Ineligible for Partnerschaftsbonus (§ 4b BEEG) - hours outside 24-32h corridor
              isPartnerschaftsbonus = false;
              husbandElterngeld = toEuroAmount(0);
              wifeElterngeld = toEuroAmount(0);
              phaseLabel =
                motherHours > 32
                  ? `Child ${preg.childIndex} Post-Leave (Hours >32h: No EG § 1 BEEG)`
                  : motherHours < 24
                    ? `Child ${preg.childIndex} Post-Leave (Hours <24h: No PB § 4b BEEG)`
                    : `Child ${preg.childIndex} Post-Leave (Father Outside 24-32h)`;
            }
          }
          else {
            // Standard ElterngeldPlus window (egStart to egEnd)
            if (isMotherEgEligible) {
              if (pIdx === 0) {
                // Child 1
                const egEntitlement = computeElterngeldBenefits(
                  toNetSalary(
                    scenarioKey === SimulationStrategy.StatutoryOptimized
                      ? curW3FT
                      : curW5FT,
                  ),
                  toNetSalary(dynamicW5PT),
                  motherHours,
                );
                wifeElterngeld = egEntitlement.elterngeldPlus;
                phaseLabel = `Child ${preg.childIndex} EGPlus (Mother)`;
              }
              else {
                // Child 2+ with blended pre-birth assessment baseline (10M PT + 2M FT)
                const blendedNet = toNetSalary(
                  Math.round(
                    (10 *
                      (scenarioKey === SimulationStrategy.StatutoryOptimized
                        ? dynamicW3PT
                        : dynamicW5PT) +
                      2 *
                        (scenarioKey === SimulationStrategy.StatutoryOptimized
                          ? curW3FT
                          : curW5FT)) /
                      12,
                  ),
                );
                const egEntitlement = computeElterngeldBenefits(
                  blendedNet,
                  toNetSalary(dynamicW5PT),
                  motherHours,
                );

                // Sibling bonus eligibility vs Child 1
                const prevBirth =
                  pregnancies[0].calculatedDeliverySimulationMonth;
                const sibling = computeSiblingBonus(
                  egEntitlement.elterngeldPlus,
                  prevBirth,
                  sMonth,
                );
                hasSiblingBonus = sibling.isEligible;
                wifeElterngeld = sibling.totalElterngeldPlusWithBonus;
                phaseLabel = `Child ${preg.childIndex} EGPlus (Sibling Bonus)`;
              }
            }
            else {
              wifeElterngeld = toEuroAmount(0);
              phaseLabel = `Child ${preg.childIndex} Post-Leave (Hours >32h: No EG § 1 BEEG)`;
            }

            // Partner Months (Father)
            if (m >= egStart && m <= egStart + 3) {
              husbandElterngeld = toEuroAmount(150);
            }
          }
        }
      });

      // If not in active maternity or parental allowance
      if (!inSpecialPhase) {
        if (pregnancies.length > 0 && m > child1Delivery) {
          wifeSalary = toEuroAmount(isSwapActive ? curW3PT : curW5PT);
          phaseLabel = isSwapActive
            ? "Swap Active (Part-Time)"
            : "Family Part-Time (Post-Leave)";
        }
        else {
          wifeSalary = toEuroAmount(isSwapActive ? curW3FT : curW5FT);
          phaseLabel = isSwapActive
            ? (pregnancies.length > 0
              ? "Swap Active (Pre-Mutterschutz)"
              : "Swap Active")
            : pregnancies.length === 0
              ? "Regular Baseline"
              : m < (pregnancies[0]?.positiveTestSimulationMonth ?? 4)
                ? "Pre-Pregnancy Planning"
                : "Pre-Birth Full-Time";
        }
      }
    }

    // Exact Wage Withholding Deficit during active swap

    let monthlyWithholdingDeficit = toEuroAmount(0);
    if (
      scenarioKey === SimulationStrategy.StatutoryOptimized &&
      isSwapActive
    ) {
      const isPT =
        (pregnancies.length > 0 && m > child1Delivery) ||
        phaseLabel.includes("Part-Time");
      monthlyWithholdingDeficit = computeMonthlySwapWithholdingVariance(
        toNetSalary(curH3Net),
        toNetSalary(curH5Net),
        toNetSalary(isPT ? curW3PT : curW3FT),
        toNetSalary(isPT ? curW5PT : curW5FT),
      );
    }

    rawMonths.push({
      monthId,
      monthRef: relativeMonthLabel,
      monthSimRef,
      month: sMonth,
      year,
      monthInYear,
      calendarYearNum,
      calendarMonthNum,
      calendarLabel,
      relativeBirthLabel,
      relativeMonthLabel,
      relativeMonthIndex,
      husbandSalary,
      wifeSalary,
      mutterschutz,
      wifeElterngeld,
      husbandElterngeld,
      kindergeld,
      taxClassLabel,
      phaseLabel,
      isSwapActive,
      isMutterschutz,
      isPartnerschaftsbonus,
      hasSiblingBonus,
      monthlyWithholdingDeficit,
      husbandBaselineNet: toEuroAmount(curH3Net),
      wifeBaselineNet: toEuroAmount(curW5FT),
      transactions,
    });
  }


  // PASS 2: Aggregate Annual Tax Return Reconciliations by Calendar Year (§ 26b EStG)
  const deficitsByCalYear: Record<number, EuroAmount[]> = {};
  rawMonths.forEach((rm) => {
    const cy = rm.calendarYearNum;
    if (!deficitsByCalYear[cy]) {
      deficitsByCalYear[cy] = [];
    }
    deficitsByCalYear[cy].push(rm.monthlyWithholdingDeficit);
  });

  const taxRefundReconByMonth: Record<number, AnnualTaxReconciliationResult> =
    {};
  const taxRefundByMonth: Record<number, EuroAmount> = {};
  const tMonth = preexisting.taxReturnMonth ?? 3;
  const baseStandardRefund = toEuroAmount(850);
  const defaultState = getDefaultPersistedState();
  const monthlyKg =
    preexisting.kindergeldPerChild ?? defaultState.kindergeldPerChild;

  rawMonths.forEach((rm) => {
    if (rm.calendarMonthNum === tMonth) {
      const reconciledCalYear = rm.calendarYearNum - 1;
      const deficits = deficitsByCalYear[reconciledCalYear] || [];

      // Calculate annual taxable income in reconciledCalYear
      const husbandGrossMonthly =
        preexisting.husbandGross ?? defaultState.husbandGross;
      const husbandBreakdown = computeGrossToNetBreakdown(
        toGrossSalary(husbandGrossMonthly),
        TaxClass.III,
        preexisting.existingChildrenCount,
      );
      const husbandAnnualZvE = husbandBreakdown.taxableIncomeZvE * 12;

      // Calculate wife annual earned gross based on pre-birth FT / post-birth PT status in that calendar year
      const wifeFTGross =
        preexisting.wifeGross ?? defaultState.wifeGross;
      const wifeHoursPT =
        preexisting.wifePostBirthWeeklyHours ??
        defaultState.wifePostBirthHours;
      const wifeHoursFT =
        preexisting.wifeWeeklyHours ?? defaultState.wifeInitialHours;
      const wifePTGross = Math.round(
        wifeFTGross * (wifeHoursPT / Math.max(1, wifeHoursFT)),
      );

      let wifeEarnedGrossInYear = 0;
      rawMonths
        .filter((r) => r.calendarYearNum === reconciledCalYear)
        .forEach((r) => {
          if (r.month > child1Delivery) {
            wifeEarnedGrossInYear += wifePTGross;
          }
          else {
            wifeEarnedGrossInYear += wifeFTGross;
          }
        });
      const wifeMonthlyAvgGross = Math.round(wifeEarnedGrossInYear / 12);
      const wifeBreakdown = computeGrossToNetBreakdown(
        toGrossSalary(wifeMonthlyAvgGross),
        TaxClass.V,
        preexisting.existingChildrenCount,
      );
      const wifeAnnualZvE = wifeBreakdown.taxableIncomeZvE * 12;
      const jointAnnualZvE = husbandAnnualZvE + wifeAnnualZvE;

      // Identify children present in the reconciled calendar year
      const childrenInYear: ChildYearPresence[] = [];
      // Any preexisting children
      for (let c = 0; c < preexisting.existingChildrenCount; c++) {
        childrenInYear.push({
          childIndex: toChildIndex(c + 1),
          birthCalendarYear: toFullCalendarYear(reconciledCalYear - 1),
          birthCalendarMonth: toCalendarMonth(1),
        });
      }
      // Pregnancies delivered on or before reconciledCalYear
      pregnancies.forEach((preg) => {
        const delSimMonth = preg.calculatedDeliverySimulationMonth;
        const delRm = rawMonths.find(
          (r) => r.month === delSimMonth,
        );
        if (delRm && delRm.calendarYearNum <= reconciledCalYear) {
          childrenInYear.push({
            childIndex: preg.childIndex,
            birthCalendarYear: delRm.calendarYearNum,
            birthCalendarMonth: delRm.calendarMonthNum,
          });
        }
      });

      // Compute Günstigerprüfung (§ 31, § 32 Abs. 6 EStG)
      const guenstiger = computeKinderfreibetragGuenstigerpruefung(
        jointAnnualZvE,
        childrenInYear,
        reconciledCalYear,
        monthlyKg,
      );

      const recon = computeAnnualTaxReconciliation(
        toCalendarYear(Math.min(10, Math.max(1, rm.year))),
        rm.month,
        deficits,
        baseStandardRefund,
        guenstiger,
      );

      taxRefundReconByMonth[rm.month] = recon;
      taxRefundByMonth[rm.month] = recon.totalRefundAmount;
    }
  });

  // PASS 3: Assemble Final Ledger and Transactions
  const months: MonthlyLedgerEntry[] = [];
  let runSalaries = 0;
  let runBenefits = 0;
  let runTaxRefunds = 0;
  let runTotal = 0;

  // Resolve Husband Bonus Slots
  let husbandBonusSlots: readonly SalaryBonusSlot[] = [];
  if (
    preexisting.husbandBonusDistribution &&
    preexisting.husbandBonusDistribution.length > 0
  ) {
    husbandBonusSlots = preexisting.husbandBonusDistribution;
  }
  else if (
    preexisting.husbandSalariesCount &&
    preexisting.husbandSalariesCount > 12
  ) {
    const count = preexisting.husbandSalariesCount;
    if (count === 13) {
      husbandBonusSlots = [
        {
          calendarMonth: preexisting.bonus40Month ?? toCalendarMonth(5),
          payoutFraction: toPercentageRate(0.4),
          label: "13th Salary: 40% Vacation Bonus",
        },
        {
          calendarMonth: preexisting.bonus60Month ?? toCalendarMonth(11),
          payoutFraction: toPercentageRate(0.6),
          label: "13th Salary: 60% Christmas Bonus",
        },
      ];
    }
    else if (count === 14) {
      husbandBonusSlots = [
        {
          calendarMonth: toCalendarMonth(6),
          payoutFraction: toPercentageRate(1.0),
          label: "13th Salary: 100% Vacation Bonus",
        },
        {
          calendarMonth: toCalendarMonth(11),
          payoutFraction: toPercentageRate(1.0),
          label: "14th Salary: 100% Christmas Bonus",
        },
      ];
    }
    else if (count === 15) {
      husbandBonusSlots = [
        {
          calendarMonth: toCalendarMonth(3),
          payoutFraction: toPercentageRate(1.0),
          label: "13th Salary: 100% Spring Bonus",
        },
        {
          calendarMonth: toCalendarMonth(6),
          payoutFraction: toPercentageRate(1.0),
          label: "14th Salary: 100% Summer Bonus",
        },
        {
          calendarMonth: toCalendarMonth(11),
          payoutFraction: toPercentageRate(1.0),
          label: "15th Salary: 100% Christmas Bonus",
        },
      ];
    }
  }
  else if (preexisting.enable13thSalary) {
    husbandBonusSlots = [
      {
        calendarMonth: preexisting.bonus40Month ?? toCalendarMonth(5),
        payoutFraction: toPercentageRate(0.4),
        label: "13th Salary: 40% Vacation Bonus",
      },
      {
        calendarMonth: preexisting.bonus60Month ?? toCalendarMonth(11),
        payoutFraction: toPercentageRate(0.6),
        label: "13th Salary: 60% Christmas Bonus",
      },
    ];
  }

  // Resolve Wife Bonus Slots
  let wifeBonusSlots: readonly SalaryBonusSlot[] = [];
  if (
    preexisting.wifeBonusDistribution &&
    preexisting.wifeBonusDistribution.length > 0
  ) {
    wifeBonusSlots = preexisting.wifeBonusDistribution;
  }
  else if (
    preexisting.wifeSalariesCount &&
    preexisting.wifeSalariesCount > 12
  ) {
    const count = preexisting.wifeSalariesCount;
    if (count === 13) {
      wifeBonusSlots = [
        {
          calendarMonth: toCalendarMonth(5),
          payoutFraction: toPercentageRate(0.4),
          label: "13th Salary: 40% Vacation Bonus",
        },
        {
          calendarMonth: toCalendarMonth(11),
          payoutFraction: toPercentageRate(0.6),
          label: "13th Salary: 60% Christmas Bonus",
        },
      ];
    }
    else if (count === 14) {
      wifeBonusSlots = [
        {
          calendarMonth: toCalendarMonth(6),
          payoutFraction: toPercentageRate(1.0),
          label: "13th Salary: 100% Vacation Bonus",
        },
        {
          calendarMonth: toCalendarMonth(11),
          payoutFraction: toPercentageRate(1.0),
          label: "14th Salary: 100% Christmas Bonus",
        },
      ];
    }
    else if (count === 15) {
      wifeBonusSlots = [
        {
          calendarMonth: toCalendarMonth(3),
          payoutFraction: toPercentageRate(1.0),
          label: "13th Salary: 100% Spring Bonus",
        },
        {
          calendarMonth: toCalendarMonth(6),
          payoutFraction: toPercentageRate(1.0),
          label: "14th Salary: 100% Summer Bonus",
        },
        {
          calendarMonth: toCalendarMonth(11),
          payoutFraction: toPercentageRate(1.0),
          label: "15th Salary: 100% Christmas Bonus",
        },
      ];
    }
  }

  for (let i = 0; i < rawMonths.length; i++) {
    const rm = rawMonths[i];
    const m = rm.month;
    const calMonth = rm.calendarMonthNum;
    const year = rm.year;

    // Extra Salary Bonus Events triggered on configured calendar months
    let bonus40Amount = toEuroAmount(0);
    let bonus60Amount = toEuroAmount(0);
    let husbandBonusAmount = toEuroAmount(0);
    let wifeBonusAmount = toEuroAmount(0);

    const husbandBonusBase = rm.husbandBaselineNet;
    const wifeBonusBase = rm.wifeBaselineNet;

    // Evaluate Husband Bonus for this calendar month
    const matchingHSlots = husbandBonusSlots.filter(
      (s) => s.calendarMonth === calMonth,
    );
    for (let sIdx = 0; sIdx < matchingHSlots.length; sIdx++) {
      const slot = matchingHSlots[sIdx];
      const amt = toEuroAmount(Math.round(slot.payoutFraction * husbandBonusBase));
      if (amt > 0) {
        husbandBonusAmount = toEuroAmount(husbandBonusAmount + amt);
        if (
          slot.payoutFraction === 0.4 &&
          calMonth === (preexisting.bonus40Month ?? 5)
        ) {
          bonus40Amount = amt;
        }
        else if (
          slot.payoutFraction === 0.6 &&
          calMonth === (preexisting.bonus60Month ?? 11)
        ) {
          bonus60Amount = amt;
        }
      }
    }

    // Evaluate Wife Bonus for this calendar month
    const matchingWSlots = wifeBonusSlots.filter(
      (s) => s.calendarMonth === calMonth,
    );
    for (let sIdx = 0; sIdx < matchingWSlots.length; sIdx++) {
      const slot = matchingWSlots[sIdx];
      const amt = toEuroAmount(Math.round(slot.payoutFraction * wifeBonusBase));
      if (amt > 0) {
        wifeBonusAmount = toEuroAmount(wifeBonusAmount + amt);
      }
    }

    const taxRefund = taxRefundByMonth[m] || toEuroAmount(0);

    // Build Accounting Transactions for Audit Trail
    const txs: AccountingTransaction[] = [];
    if (rm.husbandSalary > 0) {
      txs.push(
        createTransaction({
          transactionId: `TX-${rm.monthId}-HUSBAND-SALARY`,
          monthId: rm.monthId,
          month: rm.month,
          year,
          type: TransactionType.SalaryBase,
          direction: TransactionDirection.Inflow,
          amount: rm.husbandSalary,
          statutoryCitation:
            "§ 19 EStG (Einkünfte aus nichtselbständiger Arbeit)",
          taxClassLabel: rm.taxClassLabel,
          description: `Husband Monthly Working Salary (${rm.taxClassLabel}) - ${rm.calendarLabel}`,
          auditTrail: `Net Salary earned in ${rm.taxClassLabel}`,
        }),
      );
    }

    if (rm.wifeSalary > 0) {
      txs.push(
        createTransaction({
          transactionId: `TX-${rm.monthId}-WIFE-SALARY`,
          monthId: rm.monthId,
          month: rm.month,
          year,
          type: TransactionType.SalaryBase,
          direction: TransactionDirection.Inflow,
          amount: rm.wifeSalary,
          statutoryCitation:
            "§ 19 EStG (Einkünfte aus nichtselbständiger Arbeit)",
          taxClassLabel: rm.taxClassLabel,
          description: `Wife Monthly Working Salary (${rm.taxClassLabel}) - ${rm.calendarLabel}`,
          auditTrail: `Net Salary earned in ${rm.taxClassLabel}`,
        }),
      );
    }

    // Husband Bonus Transactions
    for (let sIdx = 0; sIdx < matchingHSlots.length; sIdx++) {
      const slot = matchingHSlots[sIdx];
      const amt = toEuroAmount(Math.round(slot.payoutFraction * husbandBonusBase));
      if (amt > 0) {
        const title =
          slot.label ||
          `13th Month Salary: ${Math.round(slot.payoutFraction * 100)}% Bonus`;
        const isVacation =
          slot.payoutFraction === 0.4 ||
          title.toLowerCase().includes("vacation") ||
          title.toLowerCase().includes("urlaub");
        const isChristmas =
          slot.payoutFraction === 0.6 ||
          title.toLowerCase().includes("christmas") ||
          title.toLowerCase().includes("weihnacht");
        const txType = isVacation
          ? TransactionType.SalaryBonus13thVacation
          : isChristmas
            ? TransactionType.SalaryBonus13thChristmas
            : TransactionType.SalaryBonusSpecial;

        txs.push(
          createTransaction({
            transactionId: `TX-${rm.monthId}-HUSBAND-BONUS-${sIdx + 1}`,
            monthId: rm.monthId,
            month: rm.month,
            year,
            type: txType,
            direction: TransactionDirection.Inflow,
            amount: amt,
            statutoryCitation:
              "§ 19 EStG & BEEG § 2c Abs. 1 (Exempt Sonderzahlung)",
            taxClassLabel: rm.taxClassLabel,
            description: `Husband ${title} (${rm.calendarLabel})`,
            auditTrail: `${Math.round(slot.payoutFraction * 100)}% of Husband Base Net (${husbandBonusBase} €)`,
          }),
        );
      }
    }

    // Wife Bonus Transactions
    for (let sIdx = 0; sIdx < matchingWSlots.length; sIdx++) {
      const slot = matchingWSlots[sIdx];
      const amt = toEuroAmount(Math.round(slot.payoutFraction * wifeBonusBase));
      if (amt > 0) {
        const title =
          slot.label ||
          `13th Month Salary: ${Math.round(slot.payoutFraction * 100)}% Bonus`;
        txs.push(
          createTransaction({
            transactionId: `TX-${rm.monthId}-WIFE-BONUS-${sIdx + 1}`,
            monthId: rm.monthId,
            month: rm.month,
            year,
            type: TransactionType.SalaryBonusSpecial,
            direction: TransactionDirection.Inflow,
            amount: amt,
            statutoryCitation:
              "§ 19 EStG & BEEG § 2c Abs. 1 (Exempt Sonderzahlung)",
            taxClassLabel: rm.taxClassLabel,
            description: `Wife ${title} (${rm.calendarLabel})`,
            auditTrail: `${Math.round(slot.payoutFraction * 100)}% of Wife Base Net (${wifeBonusBase} €)`,
          }),
        );
      }
    }


    if (rm.mutterschutz > 0) {
      txs.push(
        createTransaction({
          transactionId: `TX-${rm.monthId}-MUTTERSCHUTZ`,
          monthId: rm.monthId,
          month: rm.month,
          year,
          type: TransactionType.BenefitMutterschutz,
          direction: TransactionDirection.Inflow,
          amount: rm.mutterschutz,
          statutoryCitation: "MuSchG § 19 & § 20 (100% Net Wage Replacement)",
          taxClassLabel: rm.taxClassLabel,
          description: `Maternity Protection Benefit (*Mutterschutz*) - ${rm.calendarLabel}`,
          auditTrail: "GKV Mutterschaftsgeld + Employer Supplement",
        }),
      );
    }

    if (rm.wifeElterngeld > 0) {
      txs.push(
        createTransaction({
          transactionId: `TX-${rm.monthId}-WIFE-ELTERNGELD`,
          monthId: rm.monthId,
          month: rm.month,
          year,
          type: TransactionType.BenefitElterngeldPlusMother,
          direction: TransactionDirection.Inflow,
          amount: rm.wifeElterngeld,
          statutoryCitation: "BEEG § 4a (ElterngeldPlus)",
          taxClassLabel: rm.taxClassLabel,
          description: `ElterngeldPlus (Mother) - ${rm.calendarLabel}`,
          auditTrail:
            "Statutory Parental Allowance with synthetic net evaluation",
        }),
      );
    }

    if (rm.husbandElterngeld > 0) {
      txs.push(
        createTransaction({
          transactionId: `TX-${rm.monthId}-HUSBAND-ELTERNGELD`,
          monthId: rm.monthId,
          month: rm.month,
          year,
          type: rm.isPartnerschaftsbonus
            ? TransactionType.BenefitPartnerschaftsbonus
            : TransactionType.BenefitElterngeldPlusFather,
          direction: TransactionDirection.Inflow,
          amount: rm.husbandElterngeld,
          statutoryCitation: "BEEG § 4b (Partnermonate / Partnerschaftsbonus)",
          taxClassLabel: rm.taxClassLabel,
          description: `Partner Months / Partnerschaftsbonus (Father) - ${rm.calendarLabel}`,
          auditTrail:
            "Monthly partner allowance while working concurrent part-time",
        }),
      );
    }

    if (rm.kindergeld > 0) {
      txs.push(
        createTransaction({
          transactionId: `TX-${rm.monthId}-KINDERGELD`,
          monthId: rm.monthId,
          month: rm.month,
          year,
          type: TransactionType.BenefitKindergeld,
          direction: TransactionDirection.Inflow,
          amount: rm.kindergeld,
          statutoryCitation: "EStG § 66 (Kindergeld)",
          taxClassLabel: rm.taxClassLabel,
          description: `Statutory Child Benefit (*Kindergeld*) - ${rm.calendarLabel}`,
          auditTrail: "Monthly allowance per living child",
        }),
      );
    }

    if (taxRefund > 0) {
      const recon = taxRefundReconByMonth[m];
      const extraGuenstiger = recon?.guenstigerpruefung?.extraTaxRefund ?? 0;
      const swapDeficit = recon?.accumulatedSwapDeficit ?? 0;
      const isDeficitRefund = swapDeficit > 0;

      const descParts: string[] = [];
      if (isDeficitRefund) {
        descParts.push(
          `Full refund of Tax Class V wage withholding deficit (+${swapDeficit.toLocaleString("de-DE")} €)`,
        );
      }
      descParts.push(
        `statutory deductions return (+${(recon?.baseDeductionsRefund || 850).toLocaleString("de-DE")} €)`,
      );
      if (extraGuenstiger > 0) {
        descParts.push(
          `§ 31 EStG Kinderfreibetrag Günstigerprüfung bonus (+${extraGuenstiger.toLocaleString("de-DE")} € over Kindergeld)`,
        );
      }

      txs.push(
        createTransaction({
          transactionId: `TX-${rm.monthId}-TAX-REFUND`,
          monthId: rm.monthId,
          month: rm.month,
          year,
          type: TransactionType.TaxReconciliationRefund,
          direction: TransactionDirection.Inflow,
          amount: taxRefund,
          statutoryCitation:
            extraGuenstiger > 0
              ? "EStG § 26b, § 31 (*Günstigerprüfung*), § 46"
              : "EStG § 26b (*Ehegatten-Splitting*) & § 46 Abs. 2 Nr. 3a",
          taxClassLabel: "Joint Assessment (*Splitting*)",
          description: `Annual Tax Assessment Refund (${rm.calendarLabel})`,
          auditTrail: descParts.join(" + "),
        }),
      );
    }

    // Special Life Event Tagging
    let eventTag: string | null = null;
    let eventType: string | null = null;

    if (m === 1) {
      eventTag = `Simulation Start (${rm.calendarLabel})`;
      eventType = "planning";
    }

    pregnancies.forEach((preg) => {
      const pTest = preg.positiveTestSimulationMonth;
      const del = preg.calculatedDeliverySimulationMonth;
      if (m === pTest) {
        eventTag = `Pregnancy ${preg.childIndex} Positive (${rm.calendarLabel})`;
        eventType = "preg";
      }
      else if (m === del) {
        eventTag = `Child ${preg.childIndex} Birth (${rm.calendarLabel})`;
        eventType = "birth";
      }
    });

    taxClassSwitches.forEach((sw, sIdx) => {
      const eff = sw.effectiveSimulationMonth;
      if (
        m === eff &&
        scenarioKey === SimulationStrategy.StatutoryOptimized
      ) {
        eventTag = `Tax Swap ${sIdx + 1} (${rm.calendarLabel})`;
        eventType = "swap";
      }
    });

    // Build Special Events for UI display (table sub-rows)
    const specialEvents: SpecialEventItem[] = [];

    // Husband Extra Salary Bonus Special Events
    for (let sIdx = 0; sIdx < matchingHSlots.length; sIdx++) {
      const slot = matchingHSlots[sIdx];
      const amt = toEuroAmount(Math.round(slot.payoutFraction * husbandBonusBase));
      if (amt > 0) {
        const title =
          slot.label ||
          `13th Month Salary: ${Math.round(slot.payoutFraction * 100)}% Bonus`;
        const isVacation =
          slot.payoutFraction === 0.4 ||
          title.toLowerCase().includes("vacation") ||
          title.toLowerCase().includes("urlaub");
        const isChristmas =
          slot.payoutFraction === 0.6 ||
          title.toLowerCase().includes("christmas") ||
          title.toLowerCase().includes("weihnacht");
        const evType = isVacation
          ? SpecialEventType.Bonus40
          : isChristmas
            ? SpecialEventType.Bonus60
            : SpecialEventType.CustomIncome;

        specialEvents.push({
          eventId: toEventId(`EVENT-${rm.monthId}-HUSBAND-BONUS-${sIdx + 1}`),
          monthId: rm.monthId,
          month: rm.month,
          year,
          calendarYearNum: rm.calendarYearNum,
          calendarMonthNum: rm.calendarMonthNum,
          calendarLabel: rm.calendarLabel,
          relativeBirthLabel: rm.relativeBirthLabel,
          relativeMonthLabel: rm.relativeMonthLabel,
          type: evType,
          title: `Husband ${title} (${rm.calendarLabel})`,
          category: SpecialEventCategory.ThirteenthSalary,
          statutory: toStatutoryCitation("§ 9a / § 19 EStG (BEEG § 2c exempt)"),
          taxClassLabel: rm.taxClassLabel,
          amount: amt,
          description: `${Math.round(slot.payoutFraction * 100)}% bonus payment (exempt from Elterngeld assessment under BEEG § 2c Abs. 1)`,
        });
      }
    }

    // Wife Extra Salary Bonus Special Events
    for (let sIdx = 0; sIdx < matchingWSlots.length; sIdx++) {
      const slot = matchingWSlots[sIdx];
      const amt = toEuroAmount(Math.round(slot.payoutFraction * wifeBonusBase));
      if (amt > 0) {
        const title =
          slot.label ||
          `13th Month Salary: ${Math.round(slot.payoutFraction * 100)}% Bonus`;
        specialEvents.push({
          eventId: toEventId(`EVENT-${rm.monthId}-WIFE-BONUS-${sIdx + 1}`),
          monthId: rm.monthId,
          month: rm.month,
          year,
          calendarYearNum: rm.calendarYearNum,
          calendarMonthNum: rm.calendarMonthNum,
          calendarLabel: rm.calendarLabel,
          relativeBirthLabel: rm.relativeBirthLabel,
          relativeMonthLabel: rm.relativeMonthLabel,
          type: SpecialEventType.CustomIncome,
          title: `Wife ${title} (${rm.calendarLabel})`,
          category: SpecialEventCategory.ThirteenthSalary,
          statutory: toStatutoryCitation("§ 9a / § 19 EStG (BEEG § 2c exempt)"),
          taxClassLabel: rm.taxClassLabel,
          amount: amt,
          description: `${Math.round(slot.payoutFraction * 100)}% bonus payment (exempt from Elterngeld assessment under BEEG § 2c Abs. 1)`,
        });
      }
    }

    if (taxRefund > 0) {
      const recon = taxRefundReconByMonth[m];
      const extraGuenstiger = recon?.guenstigerpruefung?.extraTaxRefund ?? 0;
      const swapDeficit = recon?.accumulatedSwapDeficit ?? 0;
      const isDeficitRefund = swapDeficit > 0;
      const reconciledCalYear = rm.calendarYearNum - 1;

      const descParts: string[] = [];
      if (isDeficitRefund) {
        descParts.push(
          `Full refund of Tax Class V wage withholding deficit (+${swapDeficit.toLocaleString("de-DE")} €)`,
        );
      }
      descParts.push(
        `statutory deductions return (+${(recon?.baseDeductionsRefund || 850).toLocaleString("de-DE")} €)`,
      );
      if (extraGuenstiger > 0) {
        descParts.push(
          `§ 31 EStG Kinderfreibetrag Günstigerprüfung bonus (+${extraGuenstiger.toLocaleString("de-DE")} € over Kindergeld)`,
        );
      }

      specialEvents.push({
        eventId: toEventId(`EVENT-${rm.monthId}-TAX-REFUND`),
        monthId: rm.monthId,
        month: rm.month,
        year,
        calendarYearNum: rm.calendarYearNum,
        calendarMonthNum: rm.calendarMonthNum,
        calendarLabel: rm.calendarLabel,
        relativeBirthLabel: rm.relativeBirthLabel,
        relativeMonthLabel: rm.relativeMonthLabel,
        type: SpecialEventType.TaxReturn,
        title:
          extraGuenstiger > 0
            ? `Annual Tax Return (Tax Year ${reconciledCalYear}: Incl. +${extraGuenstiger.toLocaleString("de-DE")} € Child Allowance Bonus)`
            : `Annual Tax Return (Tax Year ${reconciledCalYear} Return in ${rm.calendarLabel})`,
        category: SpecialEventCategory.TaxOffice,
        statutory: toStatutoryCitation(
          extraGuenstiger > 0
            ? "§ 26b & § 31 EStG (*Günstigerprüfung*)"
            : "§ 26b EStG (*Ehegatten-Splitting*)",
        ),
        taxClassLabel: "Joint Assessment (*Splitting*)",
        amount: taxRefund,
        description: `${descParts.join(" plus ")} for Tax Year ${reconciledCalYear}`,
      });
    }

    // Preexisting: Annual Recurring Performance Bonus (Gross taxed under § 39b EStG)
    const annualBonusMonth = preexisting.annualBonusMonth || 12;
    if (
      preexisting.annualBonusGross &&
      preexisting.annualBonusGross > 0 &&
      calMonth === annualBonusMonth
    ) {
      const grossBonus = preexisting.annualBonusGross;
      const hGrossMonthly = preexisting.husbandGross ?? 6000;
      const hTaxClass = rm.isSwapActive ? TaxClass.V : TaxClass.III;
      const breakdown = computeGrossToNetBreakdown(
        toGrossSalary(hGrossMonthly),
        hTaxClass,
        preexisting.existingChildrenCount,
        toEuroAmount(grossBonus),
      );
      const netBonus = breakdown.bonusTaxDeduction
        ? Math.max(
          0,
          Math.round(
            grossBonus -
                breakdown.bonusTaxDeduction -
                grossBonus *
                  (breakdown.totalSocialSecurity /
                    breakdown.monthlyGross),
          ),
        )
        : Math.round(grossBonus * 0.58);
      const netBonusEuro = toEuroAmount(netBonus);

      specialEvents.push({
        eventId: toEventId(`EVENT-${rm.monthId}-ANNUAL-BONUS`),
        monthId: rm.monthId,
        month: rm.month,
        year,
        calendarYearNum: rm.calendarYearNum,
        calendarMonthNum: rm.calendarMonthNum,
        calendarLabel: rm.calendarLabel,
        relativeBirthLabel: rm.relativeBirthLabel,
        relativeMonthLabel: rm.relativeMonthLabel,
        type: SpecialEventType.CustomIncome,
        title: `Annual Performance Bonus (${grossBonus.toLocaleString("de-DE")} € Gross → +${netBonusEuro.toLocaleString("de-DE")} € Net)`,
        category: SpecialEventCategory.CareerBonus,
        statutory: toStatutoryCitation("§ 39b Abs. 3 EStG (Sonstige Bezüge)"),
        taxClassLabel: rm.taxClassLabel,
        amount: netBonusEuro,
        description: `Annual recurring performance bonus (${grossBonus.toLocaleString("de-DE")} € gross, taxed under § 39b EStG differential method)`,
      });

      txs.push(
        createTransaction({
          transactionId: `TX-${rm.monthId}-ANNUAL-BONUS`,
          monthId: rm.monthId,
          month: rm.month,
          year,
          type: TransactionType.SpecialIncome,
          direction: TransactionDirection.Inflow,
          amount: netBonusEuro,
          statutoryCitation: "§ 39b Abs. 3 EStG",
          taxClassLabel: rm.taxClassLabel,
          description: `Annual Performance Bonus (${rm.calendarLabel})`,
          auditTrail: `${grossBonus} € gross taxed via § 39b differential calculation`,
        }),
      );
    }

    // Preexisting: Monthly Investment Returns & Capital Income (§ 20 EStG)
    if (
      preexisting.investmentReturnMonthly &&
      preexisting.investmentReturnMonthly > 0
    ) {
      const invNet = preexisting.investmentReturnMonthly;
      specialEvents.push({
        eventId: toEventId(`EVENT-${rm.monthId}-INVESTMENT-RETURN`),
        monthId: rm.monthId,
        month: rm.month,
        year,
        calendarYearNum: rm.calendarYearNum,
        calendarMonthNum: rm.calendarMonthNum,
        calendarLabel: rm.calendarLabel,
        relativeBirthLabel: rm.relativeBirthLabel,
        relativeMonthLabel: rm.relativeMonthLabel,
        type: SpecialEventType.CustomIncome,
        title: `Investment & Capital Return (+${invNet.toLocaleString("de-DE")} €)`,
        category: SpecialEventCategory.InvestmentReturn,
        statutory: toStatutoryCitation("§ 20 EStG (Kapitalerträge)"),
        taxClassLabel: "Capital Yield",
        amount: invNet,
        description:
          "Monthly capital return, dividend distribution, or net investment cash flow",
      });

      txs.push(
        createTransaction({
          transactionId: `TX-${rm.monthId}-INVESTMENT-RETURN`,
          monthId: rm.monthId,
          month: rm.month,
          year,
          type: TransactionType.SpecialIncome,
          direction: TransactionDirection.Inflow,
          amount: invNet,
          statutoryCitation: "§ 20 EStG",
          taxClassLabel: "Capital Yield",
          description: `Investment Return (${rm.calendarLabel})`,
          auditTrail: `${invNet} € monthly capital returns`,
        }),
      );
    }

    // Batch 4: Custom Financial Events (One-Off Costs, Expenses, Grants & Extra Income)
    financialEvents.forEach((fe) => {
      const effM = fe.effectiveSimulationMonth;
      if (effM === m) {
        if (
          !fe.appliesToScenarios ||
          fe.appliesToScenarios.includes(scenarioKey)
        ) {
          const amt = fe.amount;
          const isCost = amt < 0;

          specialEvents.push({
            eventId: toEventId(fe.eventId),
            monthId: rm.monthId,
            month: rm.month,
            year,
            calendarYearNum: rm.calendarYearNum,
            calendarMonthNum: rm.calendarMonthNum,
            calendarLabel: rm.calendarLabel,
            relativeBirthLabel: rm.relativeBirthLabel,
            relativeMonthLabel: rm.relativeMonthLabel,
            type: isCost
              ? SpecialEventType.CustomCost
              : SpecialEventType.CustomIncome,
            title: fe.title,
            category: toSpecialEventCategory(fe.category),
            statutory: toStatutoryCitation(
              isCost ? "Out-of-Pocket Expense" : "Special Financial Inflow",
            ),
            taxClassLabel: rm.taxClassLabel,
            amount: fe.amount,
            description:
              fe.description ||
              (isCost
                ? "One-off family expense / out-of-pocket cost"
                : "One-off family income / benefit / bonus"),
          });

          txs.push(
            createTransaction({
              transactionId: `TX-${rm.monthId}-${fe.eventId}`,
              monthId: rm.monthId,
              month: rm.month,
              year,
              type: isCost
                ? TransactionType.ExpenseOutflow
                : TransactionType.SpecialIncome,
              direction: isCost
                ? TransactionDirection.Outflow
                : TransactionDirection.Inflow,
              amount: toEuroAmount(Math.abs(amt)),
              statutoryCitation: isCost
                ? "One-off Household Cost"
                : "Special Inflow",
              taxClassLabel: rm.taxClassLabel,
              description: `${fe.title} (${rm.calendarLabel})`,
              auditTrail: fe.description || `Financial Event ${fe.eventId}`,
            }),
          );
        }
      }
    });

    // Build Starting Actions for Month m (Action Milestone Rows placed before Month m)
    const startingActions: ActionRowItem[] = [];

    // Batch 1: Pregnancies starting at Month m (Positive test or Delivery)
    pregnancies.forEach((preg) => {
      const pTest = preg.positiveTestSimulationMonth;
      const del = preg.calculatedDeliverySimulationMonth;
      if (m === pTest) {
        startingActions.push({
          actionId: toActionId(`${preg.pregnancyId}-${rm.monthId}-POSITIVE`),
          monthId: rm.monthId,
          month: rm.month,
          calendarLabel: rm.calendarLabel,
          relativeBirthLabel: rm.relativeBirthLabel,
          relativeMonthLabel: rm.relativeMonthLabel,
          title: `ACTION: Positive Pregnancy Test (Child #${preg.childIndex})`,
          description: `Positive pregnancy test confirmed for Child #${preg.childIndex}. Pre-pregnancy baseline lock initiated (§ 2b BEEG).`,
          category: ActionCategory.Pregnancy,
          type: ActionType.PregnancyPositive,
          taxClassLabel: rm.taxClassLabel,
        });
      }
      if (m === del) {
        startingActions.push({
          actionId: toActionId(`${preg.pregnancyId}-${rm.monthId}-DELIVERY`),
          monthId: rm.monthId,
          month: rm.month,
          calendarLabel: rm.calendarLabel,
          relativeBirthLabel: rm.relativeBirthLabel,
          relativeMonthLabel: rm.relativeMonthLabel,
          title: `ACTION: Child #${preg.childIndex} Delivery & Birth`,
          description: `Child #${preg.childIndex} born. Statutory Mutterschutz & ElterngeldPlus benefit eligibility begins.`,
          category: ActionCategory.Pregnancy,
          type: ActionType.ChildDelivery,
          taxClassLabel: rm.taxClassLabel,
        });
      }
    });

    // Batch 1: Elterngeld Reallocation (*Partnerübertragung* § 4, § 7 BEEG) starting at Month m
    pregnancies.forEach((pregJ, jIdx) => {
      if (jIdx > 0) {
        const preM = pregJ.calculatedDeliverySimulationMonth - 1;
        const pregI = pregnancies[jIdx - 1];
        const bI = pregI.calculatedDeliverySimulationMonth;
        const egStartI = bI + 2;
        const egEndI = egStartI + 11;
        const egBonusEndI = egEndI + 4;
        if (m === preM && preM >= egStartI && preM <= egBonusEndI) {
          startingActions.push({
            actionId: toActionId(
              `REALLOC-CHILD${pregI.childIndex}-TO-CHILD${pregJ.childIndex}-${rm.monthId}`,
            ),
            monthId: rm.monthId,
            month: rm.month,
            calendarLabel: rm.calendarLabel,
            relativeBirthLabel: rm.relativeBirthLabel,
            relativeMonthLabel: rm.relativeMonthLabel,
            title: "ACTION: Elterngeld Reallocation (*Partnerübertragung* § 4, § 7 BEEG)",
            description: `Mother enters Mutterschutz for Child #${pregJ.childIndex}. Remaining Child #${pregI.childIndex} ElterngeldPlus is automatically transferred to Father under § 7 Abs. 2 BEEG to avoid benefit forfeiture.`,
            category: ActionCategory.ElterngeldReallocation,
            type: ActionType.ElterngeldReallocation,
            taxClassLabel: rm.taxClassLabel,
          });
        }
      }
    });

    // Batch 2: Tax Class Switches starting at Month m (Effective or Revert)
    taxClassSwitches.forEach((sw) => {
      const eff = sw.effectiveSimulationMonth;
      const rev = sw.revertSimulationMonth;
      const effH =
        sw.targetHusbandTaxClass + (sw.targetUseTaxFactor ? " (F)" : "");
      const effW =
        sw.targetWifeTaxClass + (sw.targetUseTaxFactor ? " (F)" : "");

      const revHTax =
        sw.revertHusbandTaxClass ??
        preexisting.husbandInitialTaxClass ??
        TaxClass.III;
      const revWTax =
        sw.revertWifeTaxClass ?? preexisting.wifeInitialTaxClass ?? TaxClass.V;
      const revUseFac =
        sw.revertUseTaxFactor !== undefined
          ? sw.revertUseTaxFactor
          : (preexisting.initialUseTaxFactor ?? false);
      const revH = revHTax + (revUseFac ? " (F)" : "");
      const revW = revWTax + (revUseFac ? " (F)" : "");

      if (
        m === eff &&
        scenarioKey === SimulationStrategy.StatutoryOptimized
      ) {
        startingActions.push({
          actionId: toActionId(`${sw.switchId}-${rm.monthId}-EFFECTIVE`),
          monthId: rm.monthId,
          month: rm.month,
          calendarLabel: rm.calendarLabel,
          relativeBirthLabel: rm.relativeBirthLabel,
          relativeMonthLabel: rm.relativeMonthLabel,
          title: `ACTION: Tax Class Switch Active (H: ${effH} | W: ${effW})`,
          description:
            sw.statutoryReason ||
            "Proactive tax class switch to optimize Elterngeld assessment baseline (§ 2b BEEG).",
          category: ActionCategory.TaxSwitch,
          type: ActionType.TaxClassSwitchEffective,
          taxClassLabel: `H: ${effH} | W: ${effW}`,
        });
      }
      if (
        m === rev &&
        scenarioKey === SimulationStrategy.StatutoryOptimized
      ) {
        startingActions.push({
          actionId: toActionId(`${sw.switchId}-${rm.monthId}-REVERT`),
          monthId: rm.monthId,
          month: rm.month,
          calendarLabel: rm.calendarLabel,
          relativeBirthLabel: rm.relativeBirthLabel,
          relativeMonthLabel: rm.relativeMonthLabel,
          title: `ACTION: Tax Class Reversion (H: ${revH} | W: ${revW})`,
          description: `Reverting tax classes post-delivery back to baseline (${revH}/${revW}) to maximize family take-home pay.`,
          category: ActionCategory.TaxSwitch,
          type: ActionType.TaxClassSwitchRevert,
          taxClassLabel: `H: ${revH} | W: ${revW}`,
        });
      }
    });

    // Batch 3: Salary Raises starting at Month m
    salaryRaises.forEach((sr) => {
      const eff = sr.effectiveSimulationMonth;
      if (m === eff) {
        startingActions.push({
          actionId: toActionId(`${sr.raiseId}-${rm.monthId}-EFFECTIVE`),
          monthId: rm.monthId,
          month: rm.month,
          calendarLabel: rm.calendarLabel,
          relativeBirthLabel: rm.relativeBirthLabel,
          relativeMonthLabel: rm.relativeMonthLabel,
          title: `ACTION: Salary Raise Effective (${sr.targetPerson.toUpperCase()} +${((sr.percentageIncrease || 0) * 100).toFixed(0)}%)`,
          description:
            sr.reason ||
            "Annual wage progression / tariff merit step adjustment.",
          category: ActionCategory.SalaryRaise,
          type: ActionType.SalaryRaiseEffective,
          taxClassLabel: rm.taxClassLabel,
        });
      }
    });

    // Batch 3: Working Hours Changes starting at Month m
    workingHoursChanges.forEach((whc) => {
      const eff = whc.effectiveSimulationMonth;
      if (m === eff) {
        startingActions.push({
          actionId: toActionId(`${whc.changeId}-${rm.monthId}-EFFECTIVE`),
          monthId: rm.monthId,
          month: rm.month,
          calendarLabel: rm.calendarLabel,
          relativeBirthLabel: rm.relativeBirthLabel,
          relativeMonthLabel: rm.relativeMonthLabel,
          title: `ACTION: Working Hours Adjustment (${whc.targetPerson.toUpperCase()}: ${whc.weeklyHours} h/wk)`,
          description:
            whc.reason ||
            `Working hours adjusted to ${whc.weeklyHours} hours/week for ${whc.targetPerson}.`,
          category: ActionCategory.WorkingHours,
          type: ActionType.WorkingHoursChangeEffective,
          taxClassLabel: rm.taxClassLabel,
        });
      }
    });

    const {
      entry,
      nextCumulatedSalaries,
      nextCumulatedBenefits,
      nextCumulatedTaxRefunds,
      nextCumulatedTotal,
    } = buildMonthlyLedgerEntry(
      {
        monthId: rm.monthId,
        month: rm.month,
        year,
        monthInYear: rm.monthInYear,
        calendarYearNum: rm.calendarYearNum,
        calendarMonthNum: rm.calendarMonthNum,
        calendarLabel: rm.calendarLabel,
        relativeBirthLabel: rm.relativeBirthLabel,
        relativeMonthLabel: rm.relativeMonthLabel,
        relativeMonthIndex: rm.relativeMonthIndex,
        husbandSalary: rm.husbandSalary,
        wifeSalary: rm.wifeSalary,
        mutterschutz: rm.mutterschutz,
        wifeElterngeld: rm.wifeElterngeld,
        husbandElterngeld: rm.husbandElterngeld,
        kindergeld: rm.kindergeld,
        taxRefund,
        bonus40Amount,
        bonus60Amount,
        husbandBonusAmount,
        wifeBonusAmount,
        specialBonusTotal: toEuroAmount(
          husbandBonusAmount + wifeBonusAmount > 0
            ? husbandBonusAmount + wifeBonusAmount
            : bonus40Amount + bonus60Amount,
        ),
        specialEvents,
        startingActions,
        taxClassLabel: rm.taxClassLabel,
        phaseLabel: rm.phaseLabel,
        eventTag,
        eventType,
        isSwapActive: rm.isSwapActive,
        isMutterschutz: rm.isMutterschutz,
        isPartnerschaftsbonus: rm.isPartnerschaftsbonus,
        hasSiblingBonus: rm.hasSiblingBonus,
        transactions: txs,
      },
      runSalaries,
      runBenefits,
      runTaxRefunds,
      runTotal,
    );

    runSalaries = nextCumulatedSalaries;
    runBenefits = nextCumulatedBenefits;
    runTaxRefunds = nextCumulatedTaxRefunds;
    runTotal = nextCumulatedTotal;

    months.push(entry);
  }

  // Summary Metrics
  const totalSalaries = months.reduce(
    (sum, m) => sum + m.earnedSalaries,
    0,
  );
  const totalBenefits = months.reduce(
    (sum, m) => sum + m.stateBenefits,
    0,
  );
  const totalTaxRefunds = months.reduce(
    (sum, m) => sum + m.taxRefund,
    0,
  );
  const grandTotal = months.reduce(
    (sum, m) => sum + m.monthlyTotal,
    0,
  );

  const totalMutterschutz = months.reduce(
    (sum, m) => sum + m.mutterschutz,
    0,
  );
  const totalWifeElterngeld = months.reduce(
    (sum, m) => sum + m.wifeElterngeld,
    0,
  );
  const totalHusbandElterngeld = months.reduce(
    (sum, m) => sum + m.husbandElterngeld,
    0,
  );
  const totalKindergeld = months.reduce(
    (sum, m) => sum + m.kindergeld,
    0,
  );
  const total13thSalaries = months.reduce(
    (sum, m) => sum + m.specialBonusTotal,
    0,
  );

  return {
    scenarioKey,
    months,
    summary: {
      totalSalaries: toEuroAmount(totalSalaries),
      totalBenefits: toEuroAmount(totalBenefits),
      totalTaxRefunds: toEuroAmount(totalTaxRefunds),
      grandTotal: toEuroAmount(grandTotal),
      totalMutterschutz: toEuroAmount(totalMutterschutz),
      totalWifeElterngeld: toEuroAmount(totalWifeElterngeld),
      totalHusbandElterngeld: toEuroAmount(totalHusbandElterngeld),
      totalKindergeld: toEuroAmount(totalKindergeld),
      total13thSalaries: toEuroAmount(total13thSalaries),
    },
  };
}

/**
 * Pure Deterministic Dynamic Timeline Simulator adapter for TimelineSimulationParams
 */
export function generateTimelineSimulation(
  params: TimelineSimulationParams,
): SimulationResult {
  const startYear = params.startCalendarYear
    ? toFullCalendarYear(params.startCalendarYear)
    : toFullCalendarYear(2026);
  const startMonth = params.startCalendarMonth ?? 1;
  const duration = toMonthDuration(params.simulationDurationMonths ?? 60);

  const b1 = params.child1BirthMonth;
  const spacing = params.birthSpacingMonths;
  const b2 = b1 + spacing;
  const lead = params.swapLeadMonths;

  // Batch 0: Preexisting Conditions
  const preexisting: PreexistingConditions = {
    startCalendarYear: startYear,
    startCalendarMonth: toCalendarMonth(startMonth),
    simulationDurationMonths: duration,
    husbandGross: params.husbandGross,
    wifeGross: params.wifeGross,
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: params.husbandClass3Net,
    husbandInitialClass5Net: params.husbandClass5Net,
    husbandWeeklyHours: toWorkingHours(32),
    husbandSalariesCount: params.husbandSalariesCount,
    husbandBonusDistribution: params.husbandBonusDistribution,
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: params.wifeClass5FullTimeNet,
    wifeInitialClass3FullTimeNet: params.wifeClass3FullTimeNet,
    wifeInitialPartTimeClass5Net: params.wifeClass5PartTimeNet,
    wifeInitialPartTimeClass3Net: params.wifeClass3PartTimeNet,
    wifeWeeklyHours: toWorkingHours(40),
    wifePostBirthWeeklyHours: params.wifePostBirthHours
      ? toWorkingHours(params.wifePostBirthHours)
      : undefined,
    wifeSalariesCount: params.wifeSalariesCount,
    wifeBonusDistribution: params.wifeBonusDistribution,
    existingChildrenCount: toChildrenCount(0),
    kindergeldPerChild: params.kindergeldPerChild,
    enable13thSalary: params.enable13thSalary,
    bonus40Month: params.bonus40Month,
    bonus60Month: params.bonus60Month,
    taxReturnMonth: params.taxReturnMonth,
  };

  // Batch 1: Pregnancy Actions
  const pregnancies: PregnancyAction[] = [
    {
      pregnancyId: toPregnancyId("PREG-CHILD-1"),
      childIndex: toChildIndex(1),
      positiveTestCalendarMonth: toCalendarMonth(
        ((startMonth - 1 + params.prePregnancyPlanningMonths) % 12) + 1,
      ),
      positiveTestCalendarYear: toFullCalendarYear(
        startYear +
          Math.floor((startMonth - 1 + params.prePregnancyPlanningMonths) / 12),
      ),
      positiveTestSimulationMonth: toSimulationMonth(
        params.prePregnancyPlanningMonths + 1,
      ),
      calculatedDeliverySimulationMonth: toSimulationMonth(b1),
      motherPostBirthPartTimeHours: toWorkingHours(24),
      motherPostBirthPartTimeClass5Net: params.wifeClass5PartTimeNet,
      motherPostBirthPartTimeClass3Net: params.wifeClass3PartTimeNet,
      fatherPartnerMonthsCount: toMonthDuration(4),
    },
    {
      pregnancyId: toPregnancyId("PREG-CHILD-2"),
      childIndex: toChildIndex(2),
      positiveTestCalendarMonth: toCalendarMonth(
        ((startMonth - 1 + (b2 - 9)) % 12) + 1,
      ),
      positiveTestCalendarYear: toFullCalendarYear(
        startYear + Math.floor((startMonth - 1 + (b2 - 9)) / 12),
      ),
      positiveTestSimulationMonth: toSimulationMonth(b2 - 8),
      calculatedDeliverySimulationMonth: toSimulationMonth(b2),
      motherPostBirthPartTimeHours: toWorkingHours(24),
      motherPostBirthPartTimeClass5Net: params.wifeClass5PartTimeNet,
      motherPostBirthPartTimeClass3Net: params.wifeClass3PartTimeNet,
      fatherPartnerMonthsCount: toMonthDuration(4),
    },
  ];

  // Batch 2: Tax Class Switches
  const preM1 = b1 - 1;
  const swap1Start = Math.max(1, preM1 - lead);
  const preM2 = b2 - 1;
  const swap2Start = Math.max(b1 + 2, preM2 - lead);

  const taxClassSwitches: TaxClassSwitchAction[] = [
    {
      switchId: toSwitchId("SWAP-CHILD-1"),
      effectiveSimulationMonth: toSimulationMonth(swap1Start),
      effectiveCalendarMonth: toCalendarMonth(
        ((startMonth - 1 + swap1Start - 1) % 12) + 1,
      ),
      effectiveCalendarYear: toFullCalendarYear(
        startYear + Math.floor((startMonth - 1 + swap1Start - 1) / 12),
      ),
      targetHusbandTaxClass: TaxClass.V,
      targetWifeTaxClass: TaxClass.III,
      statutoryReason:
        "Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)",
      revertSimulationMonth: toSimulationMonth(b1),
    },
    {
      switchId: toSwitchId("SWAP-CHILD-2"),
      effectiveSimulationMonth: toSimulationMonth(swap2Start),
      effectiveCalendarMonth: toCalendarMonth(
        ((startMonth - 1 + swap2Start - 1) % 12) + 1,
      ),
      effectiveCalendarYear: toFullCalendarYear(
        startYear + Math.floor((startMonth - 1 + swap2Start - 1) / 12),
      ),
      targetHusbandTaxClass: TaxClass.V,
      targetWifeTaxClass: TaxClass.III,
      statutoryReason:
        "Optimize Child 2 Part-Time Elterngeld baseline (§ 2b BEEG)",
      revertSimulationMonth: toSimulationMonth(b2),
    },
  ];

  // Batch 3: Salary Raises (Empty by default in legacy params)
  const salaryRaises: SalaryRaiseAction[] = [];

  return runScenarioBatches({
    scenarioKey: params.scenarioKey,
    preexisting,
    pregnancies,
    taxClassSwitches,
    salaryRaises,
  });
}
