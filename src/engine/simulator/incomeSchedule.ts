import {
  type ScenarioActionBatches,
  type PreexistingConditions,
  type WorkingHours,
  type GrossSalary,
  type PercentageRate,
  type NetSalary,
  type TaxClass,
  type GrossToNetBreakdown,
  type PregnancyId,
  TaxClass as Classes,
  TargetPerson,
  SalaryInputMode,
  SimulationStrategy,
  toWorkingHours,
  toGrossSalary,
  toNetSalary,
  toChildrenCount,
  toEuroAmount,
  toFullCalendarYear,
  toCalendarMonth,
  toTaxFactor,
} from "#engine/types";
import {
  type PayrollOptions,
} from "#engine/tax/payroll";
import {
  createTaxRules,
  toAgeYears,
} from "#engine/tax/taxRules";
import {
  computeGrossToNetBreakdown,
} from "#engine/tax/wageTax";
import {
  DEFAULT_BENEFIT_RULES,
} from "#engine/config/benefitRules";
import {
  type TimelineConventions,
  DEFAULT_TIMELINE_CONVENTIONS,
} from "#engine/config/timelineConventions";
import {
  type AssessmentMonthOrdinal,
  assessmentCalendarMonth,
  toAssessmentMonthOrdinal,
} from "#engine/benefits/assessmentHistory";

type NetClassMap = Partial<Record<TaxClass, NetSalary>>;

/** Pure income evaluation can extend beyond the visible ledger to finish a planned benefit averaging period. */
export function evaluateIncomeMonth(
  batches: ScenarioActionBatches,
  ordinal: AssessmentMonthOrdinal,
  conventions: TimelineConventions = batches.preexisting.timelineConventions ?? DEFAULT_TIMELINE_CONVENTIONS,
) {
  const { preexisting: p, pregnancies, salaryRaises, taxClassSwitches, workingHoursChanges = [] } = batches;
  const start = assessmentCalendarMonth(p.startCalendarYear, p.startCalendarMonth);
  const index = ordinal - start + 1;
  const year = toFullCalendarYear(Math.floor(ordinal / 12));
  const calendarMonth = toCalendarMonth(ordinal % 12 + 1);
  const grossMode = p.salaryInputMode === SalaryInputMode.Gross;
  const benefits = p.benefitRules ?? DEFAULT_BENEFIT_RULES;
  let husbandHours = p.husbandWeeklyHours;
  let wifeHours = p.wifeWeeklyHours;
  let explicitWifeHours = false;
  for (const action of [...workingHoursChanges].sort((a, b) => a.effectiveSimulationMonth - b.effectiveSimulationMonth)) {
    if (action.effectiveSimulationMonth <= index) {
      if (action.targetPerson === TargetPerson.Husband || action.targetPerson === TargetPerson.Both) {
        husbandHours = action.weeklyHours;
      }
      if (action.targetPerson === TargetPerson.Wife || action.targetPerson === TargetPerson.Both) {
        wifeHours = action.weeklyHours;
        explicitWifeHours = true;
      }
    }
  }
  let husbandClass = p.husbandInitialTaxClass;
  let wifeClass = p.wifeInitialTaxClass;
  let useFactor = p.initialUseTaxFactor ?? false;
  let factor = p.initialTaxFactor ?? toTaxFactor(1);
  let isSwapActive = false;
  const switches = taxClassSwitches.flatMap((action) => [
    { at: action.effectiveSimulationMonth,
      revert: false,
      action },
    ...(action.revertSimulationMonth === undefined ? [] : [{ at: action.revertSimulationMonth,
      revert: true,
      action }]),
  ]).sort((a, b) => a.at - b.at || Number(b.revert) - Number(a.revert));
  for (const event of switches) {
    if (event.at <= index) {
      const action = event.action;
      husbandClass = event.revert ? action.revertHusbandTaxClass ?? p.husbandInitialTaxClass : action.targetHusbandTaxClass;
      wifeClass = event.revert ? action.revertWifeTaxClass ?? p.wifeInitialTaxClass : action.targetWifeTaxClass;
      useFactor = event.revert ? action.revertUseTaxFactor ?? p.initialUseTaxFactor ?? false : action.targetUseTaxFactor ?? false;
      factor = event.revert ? p.initialTaxFactor ?? toTaxFactor(1) : action.targetTaxFactor ?? p.initialTaxFactor ?? toTaxFactor(1);
      isSwapActive = !event.revert;
    }
  }
  const orderedPregnancies = [...pregnancies].sort((a, b) => a.calculatedDeliverySimulationMonth - b.calculatedDeliverySimulationMonth);
  const maternity = orderedPregnancies.filter((pregnancy) => index >= pregnancy.calculatedDeliverySimulationMonth - conventions.maternityPreBirthMonths.value &&
    index < pregnancy.calculatedDeliverySimulationMonth + conventions.maternityPostBirthMonths.value).at(-1);
  const delivered = orderedPregnancies.filter((pregnancy) => index >= pregnancy.calculatedDeliverySimulationMonth).at(-1);
  const paidWifeHours = maternity ? toWorkingHours(0) : explicitWifeHours ? wifeHours
    : delivered?.motherPostBirthPartTimeHours ?? wifeHours;
  const children = toChildrenCount(p.existingChildrenCount + pregnancies.filter((pregnancy) => index >= pregnancy.calculatedDeliverySimulationMonth).length);
  const newborns = children - p.existingChildrenCount;
  const personal = (options: PayrollOptions = {}): PayrollOptions => ({ ...options,
    isParent: children > 0 ? true : options.isParent,
    ageAtYearStart: options.ageAtYearStart === undefined ? undefined : toAgeYears(options.ageAtYearStart + year - p.startCalendarYear),
    childrenUnder25: options.childrenUnder25 === undefined ? undefined : toChildrenCount(options.childrenUnder25 + newborns) });
  const husbandPersonal = personal(p.husbandPayrollOptions);
  const wifePersonal = personal(p.wifePayrollOptions);
  let husbandGross = p.husbandGross;
  let wifeGross = p.wifeGross;
  if (grossMode && (husbandGross === undefined || wifeGross === undefined)) {
    throw new TypeError("Gross-input simulations require both regular monthly gross salaries.");
  }
  const husbandNets: NetClassMap = { [Classes.III]: p.husbandInitialNet,
    [Classes.V]: p.husbandInitialClass5Net,
    [Classes.IV]: p.husbandInitialClass4Net };
  const wifeFullNets: NetClassMap = { [Classes.III]: p.wifeInitialClass3FullTimeNet,
    [Classes.V]: p.wifeInitialFullTimeNet,
    [Classes.IV]: p.wifeInitialClass4FullTimeNet };
  const wifePartNets: NetClassMap = { [Classes.III]: delivered?.motherPostBirthPartTimeClass3Net ?? p.wifeInitialPartTimeClass3Net,
    [Classes.V]: delivered?.motherPostBirthPartTimeClass5Net ?? p.wifeInitialPartTimeClass5Net,
    [Classes.IV]: p.wifeInitialPartTimeClass4Net };
  const scale = (nets: NetClassMap, increase: PercentageRate): void => {
    for (const taxClass of Object.values(Classes)) {
      const net = nets[taxClass];
      if (net !== undefined) {
        nets[taxClass] = toNetSalary(net * (1 + increase));
      }
    }
  };
  for (const raise of [...salaryRaises].sort((a, b) => a.effectiveSimulationMonth - b.effectiveSimulationMonth)) {
    if (raise.effectiveSimulationMonth > index) {
      continue;
    }
    if (grossMode && raise.percentageIncrease === undefined) {
      throw new TypeError("Gross-mode raises require a percentage, rather than a manual net replacement.");
    }
    if (raise.targetPerson === TargetPerson.Husband || raise.targetPerson === TargetPerson.Both) {
      if (raise.percentageIncrease !== undefined) {
        scale(husbandNets, raise.percentageIncrease);
        husbandGross = husbandGross === undefined ? undefined : toGrossSalary(husbandGross * (1 + raise.percentageIncrease));
      }
      else {
        husbandNets[Classes.III] = raise.newHusbandClass3Net ?? husbandNets[Classes.III];
        husbandNets[Classes.V] = raise.newHusbandClass5Net ?? husbandNets[Classes.V];
      }
    }
    if (raise.targetPerson === TargetPerson.Wife || raise.targetPerson === TargetPerson.Both) {
      if (raise.percentageIncrease !== undefined) {
        scale(wifeFullNets, raise.percentageIncrease);
        scale(wifePartNets, raise.percentageIncrease);
        wifeGross = wifeGross === undefined ? undefined : toGrossSalary(wifeGross * (1 + raise.percentageIncrease));
      }
      else {
        wifeFullNets[Classes.III] = raise.newWifeClass3FTNet ?? wifeFullNets[Classes.III];
        wifeFullNets[Classes.V] = raise.newWifeClass5FTNet ?? wifeFullNets[Classes.V];
        wifePartNets[Classes.III] = raise.newWifeClass3PTNet ?? wifePartNets[Classes.III];
        wifePartNets[Classes.V] = raise.newWifeClass5PTNet ?? wifePartNets[Classes.V];
      }
    }
  }
  const forHours = (gross: GrossSalary, hours: WorkingHours, baseline: WorkingHours): GrossSalary => {
    if (baseline === 0 && gross > 0) {
      throw new TypeError("A positive baseline salary requires positive contractual hours.");
    }
    return toGrossSalary(baseline === 0 ? 0 : gross * hours / baseline);
  };
  const rules = grossMode ? createTaxRules(year) : undefined;
  const hGross = husbandGross === undefined ? undefined : forHours(husbandGross, husbandHours, p.husbandWeeklyHours);
  const wGross = wifeGross === undefined ? undefined : forHours(wifeGross, paidWifeHours, p.wifeWeeklyHours);
  let husbandPayroll: GrossToNetBreakdown | undefined;
  let wifePayroll: GrossToNetBreakdown | undefined;
  const wifeNets: NetClassMap = {};
  if (grossMode) {
    const employmentAverage = (gross: GrossSalary, husband: boolean): GrossSalary => {
      const slots = husband ? p.husbandBonusDistribution : p.wifeBonusDistribution;
      const count = husband ? p.husbandSalariesCount ?? (p.enable13thSalary ? 13 : 12) : p.wifeSalariesCount ?? 12;
      const extras = slots?.length ? slots.reduce((sum, slot) => sum + slot.payoutFraction, 0) : count - 12;
      return toGrossSalary(gross * (1 + extras / 12) + (husband ? p.annualBonusGross ?? 0 : 0) / 12);
    };
    const hPay = (taxClass: TaxClass) => computeGrossToNetBreakdown(
      hGross ?? toGrossSalary(0),
      taxClass,
      children,
      undefined,
      taxClass === Classes.IV && useFactor ? factor : undefined,
      rules,
      { ...husbandPersonal,
        expectedMonthlyEmploymentGross: employmentAverage(hGross ?? toGrossSalary(0), true) },
    );
    const wPay = (gross: GrossSalary, taxClass: TaxClass) => computeGrossToNetBreakdown(
      gross,
      taxClass,
      children,
      undefined,
      taxClass === Classes.IV && useFactor ? factor : undefined,
      rules,
      { ...wifePersonal,
        expectedMonthlyEmploymentGross: employmentAverage(gross, false) },
    );
    for (const taxClass of [Classes.III, Classes.V, Classes.IV]) {
      const husband = hPay(taxClass);
      const wife = wPay(wGross ?? toGrossSalary(0), taxClass);
      husbandNets[taxClass] = husband.regularNetTakeHome;
      wifeNets[taxClass] = wife.regularNetTakeHome;
      wifeFullNets[taxClass] = wPay(wifeGross ?? toGrossSalary(0), taxClass).regularNetTakeHome;
      if (taxClass === husbandClass) {
        husbandPayroll = husband;
      }
      if (taxClass === wifeClass) {
        wifePayroll = wife;
      }
    }
    husbandPayroll ??= hPay(husbandClass);
    wifePayroll ??= wPay(wGross ?? toGrossSalary(0), wifeClass);
    husbandNets[husbandClass] = husbandPayroll.regularNetTakeHome;
    wifeNets[wifeClass] = wifePayroll.regularNetTakeHome;
  }
  else {
    const defaultPartHours = delivered?.motherPostBirthPartTimeHours ?? p.wifePostBirthWeeklyHours;
    for (const taxClass of Object.values(Classes)) {
      const full = wifeFullNets[taxClass];
      const part = wifePartNets[taxClass];
      wifeNets[taxClass] = paidWifeHours === 0 ? toNetSalary(0) : paidWifeHours === p.wifeWeeklyHours ? full
        : part !== undefined && defaultPartHours !== undefined && defaultPartHours > 0 ? toNetSalary(part * paidWifeHours / defaultPartHours)
          : full !== undefined && p.wifeWeeklyHours > 0 ? toNetSalary(full * paidWifeHours / p.wifeWeeklyHours) : undefined;
    }
    if (husbandClass === Classes.IV && husbandGross !== undefined && (useFactor || husbandNets[Classes.IV] === undefined)) {
      husbandNets[Classes.IV] = computeGrossToNetBreakdown(
        hGross ?? toGrossSalary(0),
        Classes.IV,
        children,
        undefined,
        useFactor ? factor : undefined,
        rules,
        husbandPersonal,
      ).regularNetTakeHome;
    }
    if (wifeClass === Classes.IV && wGross !== undefined && (useFactor || wifeNets[Classes.IV] === undefined)) {
      wifeNets[Classes.IV] = computeGrossToNetBreakdown(
        wGross,
        Classes.IV,
        children,
        undefined,
        useFactor ? factor : undefined,
        rules,
        wifePersonal,
      ).regularNetTakeHome;
    }
  }
  const husbandSalary = husbandNets[husbandClass];
  const wifeSalary = wifeNets[wifeClass];
  if (husbandSalary === undefined || wifeSalary === undefined) {
    throw new TypeError("Manual-net mode needs an explicit net salary for the selected tax class.");
  }
  let phaseLabel = batches.scenarioKey === SimulationStrategy.StatusQuo ? "Standard Career (No Children)"
    : pregnancies.length === 0 ? "Regular Baseline" : delivered ? "Family Part-Time (Post-Leave)" : "Pre-Birth Full-Time";
  if (maternity) {
    phaseLabel = `${index < maternity.calculatedDeliverySimulationMonth ? "Pre-Birth" : "Post-Birth"} Mutterschutz (Child ${maternity.childIndex})`;
  }
  else if (delivered) {
    const end = delivered.calculatedDeliverySimulationMonth + conventions.maternityPostBirthMonths.value + conventions.motherOrdinaryPlusMonths.value;
    if (index < end) {
      phaseLabel = paidWifeHours > benefits.maximumWeeklyHours.value
        ? `Child ${delivered.childIndex} Post-Leave (Hours >${benefits.maximumWeeklyHours.value}h: No EG § 1 BEEG)`
        : `Child ${delivered.childIndex} EGPlus (Mother)`;
    }
    else if (index < end + conventions.partnershipBonusMonths.value) {
      phaseLabel = `Child ${delivered.childIndex} Partnership Bonus Planning Window`;
    }
  }
  else if (isSwapActive) {
    phaseLabel = "Swap Active (Pre-Mutterschutz)";
  }
  return Object.freeze({ ordinal,
    calendarYearNum: year,
    calendarMonthNum: calendarMonth,
    husbandHours,
    wifeHours: paidWifeHours,
    husbandClass,
    wifeClass,
    useFactor,
    factor,
    husbandPersonal,
    wifePersonal,
    children,
    husbandPayroll,
    wifePayroll,
    husbandSalary: toEuroAmount(husbandSalary),
    wifeSalary: toEuroAmount(wifeSalary),
    husbandNets: Object.freeze(husbandNets),
    wifeNets: Object.freeze(wifeNets),
    wifeFullNets: Object.freeze(wifeFullNets),
    wifePartNets: Object.freeze(wifePartNets),
    maternityPregnancyId: maternity?.pregnancyId,
    isMutterschutz: maternity !== undefined,
    isSwapActive,
    phaseLabel });
}

export type IncomeScheduleMonth = ReturnType<typeof evaluateIncomeMonth>;

/** Missing prehistory repeats the explicitly selected initial baseline, rather than inventing prior events. */
export function initialAssessmentInputs(p: PreexistingConditions, husband: boolean) {
  const manualNetByClass: NetClassMap = husband
    ? { [Classes.III]: p.husbandInitialNet,
      [Classes.V]: p.husbandInitialClass5Net,
      [Classes.IV]: p.husbandInitialClass4Net }
    : { [Classes.III]: p.wifeInitialClass3FullTimeNet,
      [Classes.V]: p.wifeInitialFullTimeNet,
      [Classes.IV]: p.wifeInitialClass4FullTimeNet };
  return { regularGross: p.salaryInputMode === SalaryInputMode.Gross ? husband ? p.husbandGross : p.wifeGross : undefined,
    taxClass: husband ? p.husbandInitialTaxClass : p.wifeInitialTaxClass,
    factor: p.initialUseTaxFactor ? p.initialTaxFactor : undefined,
    children: p.existingChildrenCount,
    personal: (husband ? p.husbandPayrollOptions : p.wifePayrollOptions) ?? {},
    manualNetByClass };
}

export function buildIncomeSchedule(
  batches: ScenarioActionBatches,
  end: AssessmentMonthOrdinal,
  conventions: TimelineConventions = batches.preexisting.timelineConventions ?? DEFAULT_TIMELINE_CONVENTIONS,
) {
  const p = batches.preexisting;
  const start = assessmentCalendarMonth(p.startCalendarYear, p.startCalendarMonth);
  const referenceCount = (p.benefitRules ?? DEFAULT_BENEFIT_RULES).maternityAverageMonths.value;
  const maternityRates = new Map<PregnancyId, ReturnType<typeof toEuroAmount>>();
  const months: Array<IncomeScheduleMonth & { readonly mutterschutz: ReturnType<typeof toEuroAmount>;
    readonly assumptions: readonly string[] }> = [];
  for (let ordinal = start; ordinal <= end; ordinal++) {
    const income = evaluateIncomeMonth(batches, toAssessmentMonthOrdinal(ordinal), conventions);
    const assumptions: string[] = [];
    let mutterschutz = toEuroAmount(0);
    if (income.maternityPregnancyId) {
      let rate = maternityRates.get(income.maternityPregnancyId);
      if (rate === undefined) {
        const prior = months.slice(-referenceCount);
        const initial = initialAssessmentInputs(p, false);
        const baseline = p.salaryInputMode === SalaryInputMode.Gross && p.wifeGross !== undefined
          ? computeGrossToNetBreakdown(
            p.wifeGross,
            initial.taxClass,
            p.existingChildrenCount,
            undefined,
            p.initialUseTaxFactor && initial.taxClass === Classes.IV ? p.initialTaxFactor : undefined,
            createTaxRules(p.startCalendarYear),
            p.wifePayrollOptions,
          ).regularNetTakeHome
          : initial.manualNetByClass[initial.taxClass];
        if (prior.length < referenceCount && baseline === undefined) {
          assumptions.push("Maternity reference pay is unavailable for the missing initial tax class.");
        }
        const missing = referenceCount - prior.length;
        if (missing > 0) {
          assumptions.push(`${missing} missing maternity-reference months repeat the initial salary/class assumption.`);
        }
        rate = toEuroAmount((prior.reduce((sum, month) => sum + month.wifeSalary, 0) + missing * (baseline ?? 0)) / referenceCount);
        maternityRates.set(income.maternityPregnancyId, rate);
      }
      mutterschutz = rate;
    }
    months.push(Object.freeze({ ...income,
      mutterschutz,
      assumptions: Object.freeze(assumptions) }));
  }
  return Object.freeze(months);
}
