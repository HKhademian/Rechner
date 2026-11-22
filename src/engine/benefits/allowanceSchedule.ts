import {
  type assessCoupleBenefitIncome,
  IncomeEligibilityStatus,
} from "#engine/benefits/incomeEligibility";
import {
  type ScenarioActionBatches,
  type PregnancyId,
  type BenefitAssessmentAudit,
  type BenefitPaymentAudit,
  type EuroAmount,
  type NetSalary,
  type GrossSalary,
  type FullCalendarYear,
  AllowancePlanMode,
  ElterngeldVariant,
  SalaryInputMode,
  TargetPerson,
  toEuroAmount,
  toGrossSalary,
  toNetSalary,
  toMonthDuration,
  toMonthId,
  toCalendarMonth,
  toFullCalendarYear,
} from "#engine/types";
import {
  type TimelineConventions,
  DEFAULT_TIMELINE_CONVENTIONS,
} from "#engine/config/timelineConventions";
import {
  DEFAULT_BENEFIT_RULES,
} from "#engine/config/benefitRules";
import {
  evaluateAllowanceVariantWeightFormula,
  evaluateMonthlyVariantSelectionFormula,
  evaluateOverlapCreditedPaymentFormula,
} from "#engine/formulas/pure/parentalBenefitFormulas";
import {
  diffCalendarDays,
  evaluateElterngeldLifeMonthFormula,
  evaluateMutterschutzWindowFormula,
} from "#engine/formulas/pure/maternityAndLifeMonthFormulas";
import {
  type AllowanceBudgetSummary,
  resolveMotherAllowancePlanMode,
  resolveFatherAllowancePlanMode,
  resolveMotherAllowanceVariant,
  resolveFatherAllowanceVariant,
  resolveMotherOrdinaryMonthsCount,
  computeAllowanceBudgetSummary,
} from "#engine/benefits/allowanceVariant";
import {
  type AssessmentHistoryMonth,
  type AssessmentMonthOrdinal,
  AssessmentExclusion,
  buildAssessmentWindow,
  assessmentCalendarMonth,
  toAssessmentMonthOrdinal,
} from "#engine/benefits/assessmentHistory";
import {
  computeBenefitContributionBase,
  computeStandardizedBenefitNet,
  lockBenefitDeductionCharacteristics,
} from "#engine/benefits/standardizedNet";
import {
  computeElterngeldBenefits,
  isPartnerschaftsbonusEligible,
} from "#engine/benefits/elterngeldPlus";
import {
  computeSiblingBonusForAges,
  toSiblingAgeMonths,
} from "#engine/benefits/siblingBonus";
import {
  type IncomeScheduleMonth,
  initialAssessmentInputs,
} from "#engine/simulator/incomeSchedule";

import {
  getEmploymentThresholds,
} from "#engine/tax/employmentThresholds";

export {
  type AllowanceBudgetSummary,
  resolveMotherAllowancePlanMode,
  resolveFatherAllowancePlanMode,
  resolveMotherAllowanceVariant,
  resolveFatherAllowanceVariant,
  resolveMotherOrdinaryMonthsCount,
  computeAllowanceBudgetSummary,
};

type IncomeMonth = IncomeScheduleMonth & { readonly mutterschutz: EuroAmount;
  readonly assumptions: readonly string[] };

export interface ProjectedBenefitMonth {
  readonly wifeElterngeld: EuroAmount;
  readonly husbandElterngeld: EuroAmount;
  readonly hasSiblingBonus: boolean;
  readonly isPartnerschaftsbonus: boolean;
  readonly available: boolean;
  readonly payments: readonly BenefitPaymentAudit[];
  readonly reasons: readonly string[];
}

const monthId = (ordinal: AssessmentMonthOrdinal) =>
  toMonthId(toCalendarMonth(ordinal % 12 + 1), toFullCalendarYear(Math.floor(ordinal / 12)));

/** Compute each child's frozen assessment in birth order, then credit overlapping benefits once per parent. */
export function projectAllowanceSchedule(
  batches: ScenarioActionBatches,
  income: readonly IncomeMonth[],
  visibleEnd: AssessmentMonthOrdinal,
  conventions: TimelineConventions = batches.preexisting.timelineConventions ?? DEFAULT_TIMELINE_CONVENTIONS,
  incomeEligibility?: ReadonlyMap<PregnancyId, ReturnType<typeof assessCoupleBenefitIncome>>,
) {
  const p = batches.preexisting;
  const rules = p.benefitRules ?? DEFAULT_BENEFIT_RULES;
  const grossMode = p.salaryInputMode === SalaryInputMode.Gross;
  if (p.assumeManualNetIsAssessmentNet !== undefined && typeof p.assumeManualNetIsAssessmentNet !== "boolean") {
    throw new TypeError("The manual assessment assumption must be an explicit boolean.");
  }
  const start = assessmentCalendarMonth(p.startCalendarYear, p.startCalendarMonth);
  const births = batches.pregnancies.map((pregnancy) => ({ pregnancy,
    ordinal: toAssessmentMonthOrdinal(start + pregnancy.calculatedDeliverySimulationMonth - 1) }))
    .sort((a, b) => a.ordinal - b.ordinal);
  if (new Set(births.map((birth) => birth.ordinal)).size !== births.length) {
    throw new TypeError("Multiple births need their own supported entitlement model; separate pregnancies cannot share a birth month.");
  }
  const bonusLength = conventions.partnershipBonusMonths.value;
  if (bonusLength > 0 && (bonusLength < rules.partnershipMinimumMonths.value || bonusLength > rules.partnershipMaximumMonths.value)) {
    throw new TypeError("The partnership-bonus plan must fit its statutory consecutive-month limits.");
  }
  const byMonth = new Map(income.map((month) => [month.ordinal, month]));
  if (byMonth.size !== income.length) {
    throw new TypeError("Income forecasting contains duplicate calendar months.");
  }
  const at = (ordinal: AssessmentMonthOrdinal): IncomeMonth => {
    const month = byMonth.get(ordinal);
    if (!month) {
      throw new TypeError(`Income forecasting must cover the full claim period, including ${monthId(ordinal)}.`);
    }
    return month;
  };
  const result = new Map(income.map((month) => [month.ordinal, {
    wifeElterngeld: toEuroAmount(0),
    husbandElterngeld: toEuroAmount(0),
    hasSiblingBonus: false,
    isPartnerschaftsbonus: false,
    available: true,
    payments: [] as BenefitPaymentAudit[],
    reasons: [] as string[],
  }]));
  const exclusionsH = new Set<AssessmentMonthOrdinal>();
  const exclusionsW = new Set<AssessmentMonthOrdinal>();
  const uncertainExclusionsH = new Set<AssessmentMonthOrdinal>();
  const uncertainExclusionsW = new Set<AssessmentMonthOrdinal>();
  const uncertainAmountsH = new Set<AssessmentMonthOrdinal>();
  const uncertainAmountsW = new Set<AssessmentMonthOrdinal>();
  const assessments: BenefitAssessmentAudit[] = [];
  const allAssumptions = new Set<string>();

  const contributionBase = (gross: GrossSalary, year: FullCalendarYear, notes: Set<string>): GrossSalary => {
    if (gross === 0) {
      return gross;
    }
    const thresholds = getEmploymentThresholds(year);
    if (thresholds.projected && gross <= thresholds.transition.value) {
      notes.add(`Published ${thresholds.sourceYear} employment thresholds are projected to income year ${year}.`);
    }
    return computeBenefitContributionBase(gross, year, rules);
  };

  for (const birth of births) {
    if (birth.ordinal > visibleEnd) {
      continue;
    }
    const pregnancy = birth.pregnancy;
    const eligibility = incomeEligibility?.get(pregnancy.pregnancyId);
    if (incomeEligibility && !eligibility) {
      throw new TypeError("Every visible birth needs an income-eligibility assessment.");
    }
    const motherPlanMode = resolveMotherAllowancePlanMode(pregnancy);
    const fatherPlanMode = resolveFatherAllowancePlanMode(pregnancy);
    const motherVariant = resolveMotherAllowanceVariant(pregnancy);
    const fatherVariant = resolveFatherAllowanceVariant(pregnancy);
    const motherOrdinaryMonths = resolveMotherOrdinaryMonthsCount(pregnancy, conventions, rules);
    const maxIndividualBasisUnits = rules.familyBasisMonths.value;
    const maxBasisLifeMonths = rules.familyBasisMonths.value + rules.additionalPartnerBasisMonths.value;
    const maxPlusMonths = Math.floor(maxIndividualBasisUnits / rules.plusFraction.value);
    const maxMotherMonths = motherPlanMode === AllowancePlanMode.Basis
      ? maxIndividualBasisUnits
      : maxPlusMonths;
    const maxFatherMonths = fatherPlanMode === AllowancePlanMode.Basis
      ? maxIndividualBasisUnits
      : maxPlusMonths;
    if (motherPlanMode === AllowancePlanMode.Auto) {
      if (
        pregnancy.motherAllowanceMonthsCount !== undefined &&
        (!Number.isInteger(pregnancy.motherAllowanceMonthsCount) ||
          pregnancy.motherAllowanceMonthsCount < 0 ||
          pregnancy.motherAllowanceMonthsCount > maxMotherMonths)
      ) {
        throw new TypeError("Requested mother allowance months exceed the individual ordinary allowance capacity.");
      }
    }
    else if (!Number.isInteger(motherOrdinaryMonths) || motherOrdinaryMonths < 0 || motherOrdinaryMonths > maxMotherMonths) {
      throw new TypeError("Requested mother allowance months exceed the individual ordinary allowance capacity.");
    }
    if (!Number.isInteger(pregnancy.fatherPartnerMonthsCount) || pregnancy.fatherPartnerMonthsCount < 0 ||
      pregnancy.fatherPartnerMonthsCount > maxFatherMonths) {
      throw new TypeError("Requested father allowance months exceed the individual ordinary allowance capacity.");
    }
    const birthYear = toFullCalendarYear(Math.floor(birth.ordinal / 12));
    const prepare = (husband: boolean) => {
      const exclusions = husband ? exclusionsH : exclusionsW;
      const uncertainExclusions = husband ? uncertainExclusionsH : uncertainExclusionsW;
      const initial = initialAssessmentInputs(p, husband);
      const history: AssessmentHistoryMonth[] = income.filter((month) => month.ordinal < birth.ordinal).map((month) => {
        const payroll = husband ? month.husbandPayroll : month.wifePayroll;
        const nets = husband ? month.husbandNets : month.wifeNets;
        return { ordinal: month.ordinal,
          regularGross: payroll?.monthlyGross,
          hasEarnings: payroll ? payroll.monthlyGross > 0 : (husband ? month.husbandSalary : month.wifeSalary) > 0,
          manualNetByClass: p.assumeManualNetIsAssessmentNet ? nets : undefined,
          taxClass: husband ? month.husbandClass : month.wifeClass,
          factor: month.useFactor ? month.factor : undefined,
          children: month.children,
          personal: husband ? month.husbandPersonal : month.wifePersonal,
          excluded: !husband && month.isMutterschutz ? AssessmentExclusion.Maternity
            : exclusions.has(month.ordinal) ? AssessmentExclusion.OlderChildBenefit : undefined };
      });
      const window = buildAssessmentWindow(history, birth.ordinal, (ordinal) => ({ ...initial,
        ordinal,
        manualNetByClass: p.assumeManualNetIsAssessmentNet ? initial.manualNetByClass : undefined,
        hasEarnings: (initial.regularGross ?? initial.manualNetByClass[initial.taxClass] ?? 0) > 0 }), rules);
      const characteristics = lockBenefitDeductionCharacteristics(window.records);
      const notes = new Set<string>();
      if (window.assumed.length > 0) {
        notes.add(`${window.assumed.length} missing pre-birth months repeat the initial salary, class and deduction settings.`);
      }
      let net: NetSalary | undefined;
      let reason: string | undefined;
      let taxRules: BenefitAssessmentAudit["taxRules"];
      try {
        if (window.records.some((record) => uncertainExclusions.has(record.ordinal))) {
          reason = "Earlier benefit receipt is unavailable, so the eligible assessment window cannot be verified.";
        }
        else if (grossMode && window.averageRegularGross !== undefined) {
          const socialBase = toGrossSalary(window.records.reduce((sum, record) => sum + contributionBase(record.regularGross ?? toGrossSalary(0), toFullCalendarYear(Math.floor(record.ordinal / 12)), notes), 0) / rules.assessmentMonths.value);
          const calculation = computeStandardizedBenefitNet(
            window.averageRegularGross,
            socialBase,
            characteristics,
            birthYear,
            rules,
            toMonthDuration(window.records.filter((record) => (record.regularGross ?? 0) > 0).length),
          );
          net = calculation.net;
          reason = calculation.reason;
          if (calculation.taxRules) {
            const source = calculation.taxRules;
            taxRules = { calendarYear: source.calendarYear,
              sourceYear: source.sourceYear,
              projected: source.projected,
              papPublication: source.papPublication };
          }
          calculation.assumptions.forEach((note) => notes.add(note));
        }
        else if (p.assumeManualNetIsAssessmentNet) {
          const values = window.records.map((record) => record.manualNetByClass?.[characteristics.taxClass]);
          if (values.every((value) => value !== undefined)) {
            net = toNetSalary(values.reduce((sum, value) => sum + (value ?? 0), 0) / rules.assessmentMonths.value);
          }
          else {
            reason = "A manual assessment-net value is missing for the frozen tax class.";
          }
          notes.add("Explicit assumption: supplied payroll-net figures are used as estimates of BEEG assessment net; no standardized-net conversion was verified.");
        }
        else {
          reason = "Gross salary or an explicit manual assessment-net assumption is required; payroll take-home is not BEEG net.";
        }
      }
      catch (error) {
        reason = error instanceof Error ? error.message : "Assessment income rules are unavailable.";
      }
      return { window,
        characteristics,
        notes,
        net,
        reason,
        taxRules };
    };
    const h = prepare(true);
    const w = prepare(false);
    let maternityMonths: number;
    if (pregnancy.expectedDueDate !== undefined) {
      const matWin = evaluateMutterschutzWindowFormula({
        expectedDueDate: pregnancy.expectedDueDate,
        isMultipleOrPrematureBirth: pregnancy.isMultipleOrPrematureBirth,
      });
      let lmOverlapCount = 0;
      for (let lm = 1; lm <= 6; lm++) {
        const interval = evaluateElterngeldLifeMonthFormula(pregnancy.expectedDueDate, lm);
        if (diffCalendarDays(interval.startDate, matWin.postBirthEnd) >= 0) {
          lmOverlapCount += 1;
        }
        else {
          break;
        }
      }
      maternityMonths = Math.max(1, lmOverlapCount);
    }
    else {
      maternityMonths = income.filter((month) => month.ordinal >= birth.ordinal &&
        month.maternityPregnancyId === pregnancy.pregnancyId && month.mutterschutz > 0).length;
    }
    const first = birth.ordinal + (pregnancy.expectedDueDate !== undefined ? maternityMonths : conventions.maternityPostBirthMonths.value);
    const mother = new Map<AssessmentMonthOrdinal, ElterngeldVariant>();
    const father = new Map<AssessmentMonthOrdinal, ElterngeldVariant>();
    const moved = new Map<AssessmentMonthOrdinal, ElterngeldVariant>();
    const sumPlanBasisUnits = (
      plan: ReadonlyMap<AssessmentMonthOrdinal, ElterngeldVariant>,
    ): number => {
      let total = 0;
      for (const variant of plan.values()) {
        total += evaluateAllowanceVariantWeightFormula({
          variant,
          elterngeldPlusFraction: rules.plusFraction.value,
        });
      }
      return total;
    };
    const countReducedMonths = (limitOrdinal: AssessmentMonthOrdinal): number => income.filter((month) => {
      if (month.ordinal < birth.ordinal || month.ordinal > limitOrdinal) {
        return false;
      }
      const husbandReduced = h.window.averageRegularGross !== undefined && (month.husbandPayroll?.monthlyGross ?? 0) < h.window.averageRegularGross;
      const wifeReduced = w.window.averageRegularGross !== undefined && (month.wifePayroll?.monthlyGross ?? 0) < w.window.averageRegularGross;
      const manualReduced = !grossMode && ((h.net !== undefined && (month.husbandNets[h.characteristics.taxClass] ?? h.net) < h.net) ||
        (w.net !== undefined && (month.wifeNets[w.characteristics.taxClass] ?? w.net) < w.net));
      return husbandReduced || wifeReduced || manualReduced;
    }).length;
    const hasAutoMode =
      motherPlanMode === AllowancePlanMode.Auto ||
      fatherPlanMode === AllowancePlanMode.Auto;
    const ordinaryLength = Math.max(motherOrdinaryMonths, pregnancy.fatherPartnerMonthsCount);

    if (!hasAutoMode) {
      for (let value = first; value < first + ordinaryLength; value++) {
        const ordinal = toAssessmentMonthOrdinal(value);
        const month = at(ordinal);
        if (value < first + motherOrdinaryMonths) {
          const motherPick = evaluateMonthlyVariantSelectionFormula({
            planMode: motherPlanMode,
            weeklyWorkingHours: month.wifeHours,
            maximumWeeklyHoursLimit: rules.maximumWeeklyHours.value,
            elapsedMonthsSinceBirth: ordinal - birth.ordinal,
            maxBasisLifeMonths,
            remainingIndividualBasisUnits: maxIndividualBasisUnits,
            remainingFamilyBasisUnits: maxBasisLifeMonths,
            elterngeldPlusFraction: rules.plusFraction.value,
          });
          if (motherPick.selectedVariant !== null) {
            mother.set(ordinal, motherPick.selectedVariant);
          }
        }
        if (value < first + pregnancy.fatherPartnerMonthsCount) {
          const fatherPick = evaluateMonthlyVariantSelectionFormula({
            planMode: fatherPlanMode,
            weeklyWorkingHours: month.husbandHours,
            maximumWeeklyHoursLimit: rules.maximumWeeklyHours.value,
            elapsedMonthsSinceBirth: ordinal - birth.ordinal,
            maxBasisLifeMonths,
            remainingIndividualBasisUnits: maxIndividualBasisUnits,
            remainingFamilyBasisUnits: maxBasisLifeMonths,
            elterngeldPlusFraction: rules.plusFraction.value,
          });
          if (fatherPick.selectedVariant !== null) {
            father.set(ordinal, fatherPick.selectedVariant);
          }
        }
      }
    }
    else {
      const motherMaxMonths = motherPlanMode === AllowancePlanMode.Auto
        ? (pregnancy.motherAllowanceMonthsCount ?? maxPlusMonths)
        : motherOrdinaryMonths;
      const fatherMaxMonths = pregnancy.fatherPartnerMonthsCount;
      const maxScanOrdinal = toAssessmentMonthOrdinal(
        first + Math.max(motherMaxMonths, fatherMaxMonths) + bonusLength - 1,
      );
      const hasProjectedReduction =
        countReducedMonths(maxScanOrdinal) >= rules.minimumParentClaimMonths.value;

      if (motherPlanMode === AllowancePlanMode.Auto) {
        const projectedPartnerClaim =
          fatherMaxMonths + bonusLength >= rules.minimumParentClaimMonths.value;
        const initialFamilyCap =
          maxIndividualBasisUnits +
          (projectedPartnerClaim && hasProjectedReduction
            ? rules.additionalPartnerBasisMonths.value
            : 0);
        let fatherUnitsUsed = 0;
        for (let value = first; value < first + fatherMaxMonths; value++) {
          const ordinal = toAssessmentMonthOrdinal(value);
          if (fatherPlanMode === AllowancePlanMode.Auto && !byMonth.has(ordinal)) {
            break;
          }
          const month = at(ordinal);
          const fatherPick = evaluateMonthlyVariantSelectionFormula({
            planMode: fatherPlanMode,
            weeklyWorkingHours: month.husbandHours,
            maximumWeeklyHoursLimit: rules.maximumWeeklyHours.value,
            elapsedMonthsSinceBirth: ordinal - birth.ordinal,
            maxBasisLifeMonths,
            remainingIndividualBasisUnits:
              fatherPlanMode === AllowancePlanMode.Auto
                ? Math.max(0, maxIndividualBasisUnits - fatherUnitsUsed)
                : maxIndividualBasisUnits,
            remainingFamilyBasisUnits:
              fatherPlanMode === AllowancePlanMode.Auto
                ? Math.max(0, initialFamilyCap - maternityMonths - fatherUnitsUsed)
                : maxBasisLifeMonths,
            elterngeldPlusFraction: rules.plusFraction.value,
          });
          if (fatherPick.selectedVariant !== null) {
            father.set(ordinal, fatherPick.selectedVariant);
            fatherUnitsUsed += fatherPick.basisUnitsConsumed;
          }
        }
        const partnerClaimConfirmed =
          father.size + bonusLength >= rules.minimumParentClaimMonths.value;
        const motherFamilyCap =
          maxIndividualBasisUnits +
          (partnerClaimConfirmed && hasProjectedReduction
            ? rules.additionalPartnerBasisMonths.value
            : 0);
        let motherIndividualRemaining = Math.max(0, maxIndividualBasisUnits - maternityMonths);
        let motherFamilyRemaining = Math.max(
          0,
          motherFamilyCap - maternityMonths - fatherUnitsUsed,
        );
        for (let value = first; value < first + maxPlusMonths; value++) {
          if (mother.size >= motherMaxMonths) {
            break;
          }
          const ordinal = toAssessmentMonthOrdinal(value);
          if (!byMonth.has(ordinal)) {
            break;
          }
          const month = at(ordinal);
          const motherPick = evaluateMonthlyVariantSelectionFormula({
            planMode: AllowancePlanMode.Auto,
            weeklyWorkingHours: month.wifeHours,
            maximumWeeklyHoursLimit: rules.maximumWeeklyHours.value,
            elapsedMonthsSinceBirth: ordinal - birth.ordinal,
            maxBasisLifeMonths,
            remainingIndividualBasisUnits: motherIndividualRemaining,
            remainingFamilyBasisUnits: motherFamilyRemaining,
            elterngeldPlusFraction: rules.plusFraction.value,
          });
          if (motherPick.selectedVariant !== null) {
            mother.set(ordinal, motherPick.selectedVariant);
            motherIndividualRemaining = Math.max(
              0,
              motherIndividualRemaining - motherPick.basisUnitsConsumed,
            );
            motherFamilyRemaining = Math.max(
              0,
              motherFamilyRemaining - motherPick.basisUnitsConsumed,
            );
          }
          else if (
            Math.min(motherIndividualRemaining, motherFamilyRemaining) + 1e-9 <
            rules.plusFraction.value
          ) {
            break;
          }
        }
      }
      else {
        // Explicit mother mode + Auto father mode: allocate mother first, then fit father within remaining statutory budget.
        for (let value = first; value < first + motherOrdinaryMonths; value++) {
          const ordinal = toAssessmentMonthOrdinal(value);
          const month = at(ordinal);
          const motherPick = evaluateMonthlyVariantSelectionFormula({
            planMode: motherPlanMode,
            weeklyWorkingHours: month.wifeHours,
            maximumWeeklyHoursLimit: rules.maximumWeeklyHours.value,
            elapsedMonthsSinceBirth: ordinal - birth.ordinal,
            maxBasisLifeMonths,
            remainingIndividualBasisUnits: maxIndividualBasisUnits,
            remainingFamilyBasisUnits: maxBasisLifeMonths,
            elterngeldPlusFraction: rules.plusFraction.value,
          });
          if (motherPick.selectedVariant !== null) {
            mother.set(ordinal, motherPick.selectedVariant);
          }
        }
        const motherUnitsUsed = maternityMonths + sumPlanBasisUnits(mother);
        const projectedFamilyCap =
          maxIndividualBasisUnits +
          (mother.size + bonusLength + maternityMonths >= rules.minimumParentClaimMonths.value &&
          fatherMaxMonths + bonusLength >= rules.minimumParentClaimMonths.value &&
          hasProjectedReduction
            ? rules.additionalPartnerBasisMonths.value
            : 0);
        let fatherIndividualRemaining: number = maxIndividualBasisUnits;
        let fatherFamilyRemaining = Math.max(0, projectedFamilyCap - motherUnitsUsed);
        for (let value = first; value < first + fatherMaxMonths; value++) {
          const ordinal = toAssessmentMonthOrdinal(value);
          if (!byMonth.has(ordinal)) {
            break;
          }
          const month = at(ordinal);
          const fatherPick = evaluateMonthlyVariantSelectionFormula({
            planMode: AllowancePlanMode.Auto,
            weeklyWorkingHours: month.husbandHours,
            maximumWeeklyHoursLimit: rules.maximumWeeklyHours.value,
            elapsedMonthsSinceBirth: ordinal - birth.ordinal,
            maxBasisLifeMonths,
            remainingIndividualBasisUnits: fatherIndividualRemaining,
            remainingFamilyBasisUnits: fatherFamilyRemaining,
            elterngeldPlusFraction: rules.plusFraction.value,
          });
          if (fatherPick.selectedVariant !== null) {
            father.set(ordinal, fatherPick.selectedVariant);
            fatherIndividualRemaining = Math.max(
              0,
              fatherIndividualRemaining - fatherPick.basisUnitsConsumed,
            );
            fatherFamilyRemaining = Math.max(
              0,
              fatherFamilyRemaining - fatherPick.basisUnitsConsumed,
            );
          }
          else if (
            Math.min(fatherIndividualRemaining, fatherFamilyRemaining) + 1e-9 <
            rules.plusFraction.value
          ) {
            break;
          }
        }
      }
    }

    // Reallocate only still-unfilled requested father months; never invent extra payments.
    for (const [ordinal, motherVariantForMonth] of mother) {
      const month = at(ordinal);
      if (month.isMutterschutz && month.maternityPregnancyId !== pregnancy.pregnancyId &&
        !father.has(ordinal) && father.size < pregnancy.fatherPartnerMonthsCount) {
        const fatherPick = evaluateMonthlyVariantSelectionFormula({
          planMode: fatherPlanMode,
          weeklyWorkingHours: month.husbandHours,
          maximumWeeklyHoursLimit: rules.maximumWeeklyHours.value,
          elapsedMonthsSinceBirth: ordinal - birth.ordinal,
          maxBasisLifeMonths,
          remainingIndividualBasisUnits: maxIndividualBasisUnits,
          remainingFamilyBasisUnits: maxBasisLifeMonths,
          elterngeldPlusFraction: rules.plusFraction.value,
        });
        if (fatherPick.selectedVariant !== null) {
          mother.delete(ordinal);
          father.set(ordinal, fatherPick.selectedVariant);
          moved.set(ordinal, motherVariantForMonth);
        }
      }
    }
    const lastOrdinaryOrdinal = Math.max(
      first - 1,
      ...mother.keys(),
      ...father.keys(),
    );
    const bonusStart = hasAutoMode ? lastOrdinaryOrdinal + 1 : first + ordinaryLength;
    const end = bonusStart + bonusLength - 1;
    const bonus = new Set<AssessmentMonthOrdinal>();
    let run: AssessmentMonthOrdinal[] = [];
    const runs: AssessmentMonthOrdinal[][] = [];
    for (let value = bonusStart; value <= end; value++) {
      const ordinal = toAssessmentMonthOrdinal(value);
      if (hasAutoMode && !byMonth.has(ordinal)) {
        break;
      }
      const month = at(ordinal);
      if (isPartnerschaftsbonusEligible(month.wifeHours, month.husbandHours, rules)) {
        run.push(ordinal);
      }
      else if (run.length > 0) {
        runs.push(run); run = [];
      }
    }
    if (run.length > 0) {
      runs.push(run);
    }
    (runs.find((months) => months.length >= rules.partnershipMinimumMonths.value) ?? []).forEach((ordinal) => bonus.add(ordinal));
    if (father.size + bonus.size < rules.minimumParentClaimMonths.value) {
      father.clear();
      moved.forEach((variantForMonth, ordinal) => mother.set(ordinal, variantForMonth));
    }
    if (mother.size + bonus.size + maternityMonths < rules.minimumParentClaimMonths.value) {
      mother.clear();
    }
    const motherUnits = maternityMonths + sumPlanBasisUnits(mother);
    const fatherUnits = sumPlanBasisUnits(father);
    const reducedCount = countReducedMonths(toAssessmentMonthOrdinal(end));
    const bothClaim = father.size + bonus.size >= rules.minimumParentClaimMonths.value &&
      mother.size + bonus.size + maternityMonths >= rules.minimumParentClaimMonths.value;
    const familyBudget = rules.familyBasisMonths.value + (bothClaim && reducedCount >= rules.minimumParentClaimMonths.value ? rules.additionalPartnerBasisMonths.value : 0);
    if (motherUnits > rules.familyBasisMonths.value + 1e-9 || fatherUnits > rules.familyBasisMonths.value + 1e-9 || motherUnits + fatherUnits > familyBudget + 1e-9) {
      throw new TypeError("Planned ordinary allowance months exceed the verified individual or family budget.");
    }

    const payParent = (
      husband: boolean,
      prepared: typeof h,
      ordinary: ReadonlyMap<AssessmentMonthOrdinal, ElterngeldVariant>,
      parentVariant: ElterngeldVariant,
      planMode: AllowancePlanMode,
    ) => {
      const planned = [...new Set([...ordinary.keys(), ...bonus])].sort((a, b) => a - b);
      const notes = prepared.notes;
      const classNet = (month: IncomeMonth) => (husband ? month.husbandNets : month.wifeNets)[prepared.characteristics.taxClass];
      const gross = (month: IncomeMonth) =>
        month.daySplit !== undefined
          ? (husband ? month.husbandFullMonthGross : month.wifeFullMonthGross)
          : (husband ? month.husbandPayroll : month.wifePayroll)?.monthlyGross;
      let after: NetSalary | undefined;
      let reason = prepared.reason;
      try {
        const earning = planned.map(at).filter((month) => grossMode ? (gross(month) ?? 0) > 0 : (classNet(month) ?? 0) > 0);
        if (grossMode) {
          const averageGross = toGrossSalary(earning.reduce((sum, month) => sum + (gross(month) ?? 0), 0) / Math.max(1, earning.length));
          const socialBase = toGrossSalary(earning.reduce((sum, month) => sum + contributionBase(gross(month) ?? toGrossSalary(0), month.calendarYearNum, notes), 0) / Math.max(1, earning.length));
          const calculation = computeStandardizedBenefitNet(averageGross, socialBase, prepared.characteristics, birthYear, rules);
          after = calculation.net; reason ??= calculation.reason;
          calculation.assumptions.forEach((note) => notes.add(note));
        }
        else if (p.assumeManualNetIsAssessmentNet && planned.every((ordinal) => classNet(at(ordinal)) !== undefined)) {
          after = toNetSalary(earning.reduce((sum, month) => sum + (classNet(month) ?? 0), 0) / Math.max(1, earning.length));
        }
        else {
          reason ??= "Manual post-birth assessment-net data is unavailable for the frozen tax class.";
        }
      }
      catch (error) {
        reason ??= error instanceof Error ? error.message : "Post-birth income rules are unavailable.";
      }
      const denied = eligibility?.status === IncomeEligibilityStatus.Ineligible;
      const incomeUnknown = eligibility?.status === IncomeEligibilityStatus.Unavailable;
      if (eligibility) {
        const note = `Household taxable income for ${eligibility.relevantIncomeYear}: ${eligibility.taxableIncome ?? "unavailable"}; maximum ${eligibility.maximum}. ${eligibility.source}`;
        notes.add(note);
        if (denied || incomeUnknown) {
          reason = denied ? `Elterngeld excluded: household taxable income exceeds the prior-year limit. ${note}`
            : `Prior-year household taxable-income evidence is required for Elterngeld eligibility. ${note}`;
        }
      }
      const available = denied || (!incomeUnknown && prepared.net !== undefined && after !== undefined);
      const priorBenefitMonths = prepared.window.records.filter((record) => {
        const prior = result.get(record.ordinal);
        return prior !== undefined && (husband ? prior.husbandElterngeld : prior.wifeElterngeld) > 0;
      }).length;
      const uncertainAmounts = husband ? uncertainAmountsH : uncertainAmountsW;
      const uncertainExclusions = husband ? uncertainExclusionsH : uncertainExclusionsW;
      const uncertainCreditHistory = prepared.window.records.some((record) => uncertainAmounts.has(record.ordinal));
      for (const ordinal of planned) {
        if (denied) {
          continue;
        }
        const month = at(ordinal);
        const row = result.get(ordinal)!;
        const unavailable = (problem: string): void => {
          row.available = false; row.reasons.push(problem); uncertainAmounts.add(ordinal);
          if (ordinal - birth.ordinal < rules.olderBenefitExclusionLifeMonths.value) {
            uncertainExclusions.add(ordinal);
          }
        };
        if (!available) {
          unavailable(reason ?? "Benefit assessment is unavailable."); continue;
        }
        if (uncertainAmounts.has(ordinal)) {
          unavailable("An overlapping benefit amount is unavailable, so its offset cannot be calculated."); continue;
        }
        const earning = grossMode ? (gross(month) ?? 0) > 0 : (classNet(month) ?? 0) > 0;
        const entitlement = computeElterngeldBenefits(
          prepared.net!,
          earning ? after! : toNetSalary(0),
          husband ? month.husbandHours : month.wifeHours,
          rules,
        );
        const isBonusMonth = bonus.has(ordinal);
        const monthVariant = isBonusMonth
          ? ElterngeldVariant.Plus
          : (ordinary.get(ordinal) ?? parentVariant);
        const baseAllowance = monthVariant === ElterngeldVariant.Basis
          ? entitlement.basiselterngeld
          : entitlement.elterngeldPlus;
        const ages = births.filter((other) => other.pregnancy.pregnancyId !== pregnancy.pregnancyId && other.ordinal <= ordinal)
          .map((other) => toSiblingAgeMonths(ordinal - other.ordinal));
        const sibling = computeSiblingBonusForAges(baseAllowance, ages, rules, monthVariant);
        if (!sibling.isEligible && p.existingChildrenCount > 0) {
          unavailable("Preexisting child ages are required to determine their sibling-bonus eligibility."); continue;
        }
        const prior = husband ? row.husbandElterngeld : row.wifeElterngeld;
        const otherMaternity = !husband && month.isMutterschutz && month.maternityPregnancyId !== pregnancy.pregnancyId ? month.mutterschutz : 0;
        if (uncertainCreditHistory && prior + otherMaternity > 0) {
          unavailable("Prior benefit receipt in the assessment window is unavailable, so the overlap credit cannot be verified."); continue;
        }
        const overlapResult = evaluateOverlapCreditedPaymentFormula({
          grossEntitlement: sibling.totalElterngeldPlusWithBonus,
          overlappingBenefitAmount: toEuroAmount(prior + otherMaternity),
          priorBenefitMonthsInWindow: priorBenefitMonths,
          assessmentWindowMonths: rules.assessmentMonths.value,
          basisMinimumAmount: rules.basisMinimum.value,
          elterngeldPlusFraction: rules.plusFraction.value,
          variant: monthVariant,
        });
        const payment = overlapResult.payableAmount;
        row.payments.push(Object.freeze({ pregnancyId: pregnancy.pregnancyId,
          parent: husband ? TargetPerson.Husband : TargetPerson.Wife,
          variant: monthVariant,
          reallocated: husband && moved.has(ordinal),
          partnershipBonus: isBonusMonth,
          grossEntitlement: sibling.totalElterngeldPlusWithBonus,
          offset: overlapResult.appliedOffset,
          payment }));
        if (husband) {
          row.husbandElterngeld = toEuroAmount(prior + payment);
        }
        else {
          row.wifeElterngeld = toEuroAmount(prior + payment);
        }
        row.hasSiblingBonus ||= sibling.isEligible;
        row.isPartnerschaftsbonus ||= isBonusMonth;
        if (payment > 0 && ordinal - birth.ordinal < rules.olderBenefitExclusionLifeMonths.value) {
          (husband ? exclusionsH : exclusionsW).add(ordinal);
        }
      }
      notes.forEach((note) => allAssumptions.add(note));
      const ordinaryVariants = [...ordinary.values()];
      const resolvedAuditVariant = ordinaryVariants.length === 0
        ? parentVariant
        : ordinaryVariants.some((variant) => variant === ElterngeldVariant.Basis)
          ? ElterngeldVariant.Basis
          : ElterngeldVariant.Plus;
      assessments.push(Object.freeze({ incomeEligibility: eligibility,
        pregnancyId: pregnancy.pregnancyId,
        parent: husband ? TargetPerson.Husband : TargetPerson.Wife,
        variant: resolvedAuditVariant,
        planMode,
        birthMonthId: monthId(birth.ordinal),
        incomeMode: grossMode ? SalaryInputMode.Gross : SalaryInputMode.Net,
        taxClass: prepared.characteristics.taxClass,
        preBirthNet: prepared.net,
        postBirthAverageNet: after,
        averageRegularGross: prepared.window.averageRegularGross,
        selectedMonths: Object.freeze(prepared.window.records.map((record) => monthId(record.ordinal))),
        excludedMonths: Object.freeze(prepared.window.excluded.map((record) => monthId(record.ordinal))),
        assumedMonths: Object.freeze(prepared.window.assumed.map(monthId)),
        ordinaryClaimMonths: Object.freeze([...ordinary.keys()].sort((a, b) => a - b).map(monthId)),
        partnershipClaimMonths: Object.freeze([...bonus].map(monthId)),
        available,
        required: planned.some((ordinal) => ordinal <= visibleEnd),
        taxRules: prepared.taxRules,
        reason,
        assumptions: Object.freeze([...notes]) }));
    };
    payParent(true, h, father, fatherVariant, fatherPlanMode);
    payParent(false, w, mother, motherVariant, motherPlanMode);
  }
  const months: ReadonlyMap<AssessmentMonthOrdinal, ProjectedBenefitMonth> = new Map([...result].map(([ordinal, row]) =>
    [ordinal, Object.freeze({ ...row,
      payments: Object.freeze([...row.payments]),
      reasons: Object.freeze([...row.reasons]) })]));
  return Object.freeze({ months,
    assessments: Object.freeze(assessments),
    assumptions: Object.freeze([...allAssumptions]),
    unavailableReasons: Object.freeze([...new Set([...result].filter(([ordinal]) => ordinal <= visibleEnd).flatMap(([, row]) => row.reasons))]),
    complete: [...result].every(([ordinal, row]) => ordinal > visibleEnd || row.available) });
}
