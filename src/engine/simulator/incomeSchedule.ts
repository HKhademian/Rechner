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
  type MonthlyDaySplit,
  type IsoCalendarDate,
  ElterngeldVariant,
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
  buildIsoDate,
  daysInCalendarMonth,
  diffCalendarDays,
  evaluateMutterschutzMonthlyPayFormula,
  evaluateMutterschutzWindowFormula,
  overlapDaysInCalendarMonth,
} from "#engine/formulas/pure/maternityAndLifeMonthFormulas";
import {
  resolveMotherAllowanceVariant,
  resolveMotherOrdinaryMonthsCount,
} from "#engine/benefits/allowanceVariant";
import {
  validateSalaryReplacement,
} from "#engine/simulator/salaryChange";
import {
  type PayrollOptions,
} from "#engine/tax/payroll";
import {
  evaluateCompoundedWageGrowthFormula,
} from "#engine/formulas/pure/inflationFormulas";
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

const DayPhase = {
  Work: "work",
  Mutterschutz: "mutterschutz",
  Elternzeit: "elternzeit",
} as const;
type DayPhase = (typeof DayPhase)[keyof typeof DayPhase];

function buildDaySplitSummaryLabel(split: {
  readonly motherWorkDays: number;
  readonly motherMutterschutzDays: number;
  readonly motherElternzeitDays: number;
  readonly husbandWorkDays: number;
  readonly husbandElternzeitDays: number;
  readonly totalCalendarDays: number;
  readonly motherPhaseOrder: readonly DayPhase[];
}): string {
  const parts: string[] = [];
  for (const phase of split.motherPhaseOrder) {
    if (phase === DayPhase.Work && split.motherWorkDays > 0 && split.motherWorkDays < split.totalCalendarDays) {
      parts.push(`${split.motherWorkDays}d Salary`);
    }
    else if (phase === DayPhase.Mutterschutz && split.motherMutterschutzDays > 0 && split.motherMutterschutzDays < split.totalCalendarDays) {
      parts.push(`${split.motherMutterschutzDays}d Mutterschutz`);
    }
    else if (phase === DayPhase.Elternzeit && split.motherElternzeitDays > 0 && split.motherElternzeitDays < split.totalCalendarDays) {
      parts.push(`${split.motherElternzeitDays}d Elternzeit`);
    }
  }
  if (
    parts.length === 0 &&
    split.husbandWorkDays > 0 &&
    split.husbandElternzeitDays > 0
  ) {
    parts.push(`${split.husbandWorkDays}d Father Work`, `${split.husbandElternzeitDays}d Father Leave`);
  }
  return parts.join(" · ");
}

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
  const totalCalendarDays = daysInCalendarMonth(year, calendarMonth);
  const grossMode = p.salaryInputMode === SalaryInputMode.Gross;
  const benefits = p.benefitRules ?? DEFAULT_BENEFIT_RULES;
  let husbandHours = p.husbandWeeklyHours;
  let wifeHours = p.wifeWeeklyHours;
  let explicitWifeHours = false;
  const sortedWorkingHoursChanges = [...workingHoursChanges].sort(
    (a, b) =>
      a.effectiveSimulationMonth - b.effectiveSimulationMonth ||
      (a.effectiveDate ?? "").localeCompare(b.effectiveDate ?? ""),
  );
  for (const action of sortedWorkingHoursChanges) {
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

  // Check whether day-exact Mutterschutz or mid-month WorkingHoursChange dates apply in this calendar month
  const exactMutterschutzWindows = orderedPregnancies
    .filter((preg) => preg.expectedDueDate !== undefined)
    .map((preg) => ({
      pregnancy: preg,
      window: evaluateMutterschutzWindowFormula({
        expectedDueDate: preg.expectedDueDate!,
        isMultipleOrPrematureBirth: preg.isMultipleOrPrematureBirth,
      }),
    }));
  const hasMidMonthHoursDate = sortedWorkingHoursChanges.some(
    (action) =>
      action.effectiveDate !== undefined &&
      action.effectiveCalendarYear === year &&
      action.effectiveCalendarMonth === calendarMonth,
  );
  const exactMaternityHit = exactMutterschutzWindows
    .map((entry) => ({
      ...entry,
      overlapDays: overlapDaysInCalendarMonth(
        entry.window.preBirthStart,
        entry.window.postBirthEnd,
        year,
        calendarMonth,
      ),
    }))
    .filter((entry) => entry.overlapDays > 0)
    .at(-1);

  const coarseMaternity = orderedPregnancies
    .filter(
      (pregnancy) =>
        pregnancy.expectedDueDate === undefined &&
        index >= pregnancy.calculatedDeliverySimulationMonth - conventions.maternityPreBirthMonths.value &&
        index < pregnancy.calculatedDeliverySimulationMonth + conventions.maternityPostBirthMonths.value,
    )
    .at(-1);

  const maternity = exactMaternityHit?.pregnancy ?? coarseMaternity;
  const mutterschutzDays = exactMaternityHit
    ? exactMaternityHit.overlapDays
    : coarseMaternity
      ? totalCalendarDays
      : 0;
  const delivered = orderedPregnancies.filter((pregnancy) => index >= pregnancy.calculatedDeliverySimulationMonth).at(-1);

  let paidWifeHours = maternity ? toWorkingHours(0) : explicitWifeHours ? wifeHours
    : delivered?.motherPostBirthPartTimeHours ?? wifeHours;
  let effectiveWifeHoursForPayroll: number = paidWifeHours;
  let effectiveHusbandHoursForPayroll: number = husbandHours;
  let daySplit: MonthlyDaySplit | undefined;

  const needsDayProration =
    (exactMaternityHit !== undefined && exactMaternityHit.overlapDays < totalCalendarDays) ||
    hasMidMonthHoursDate;

  if (needsDayProration) {
    let motherWorkDays = 0;
    let motherMutterschutzDays = 0;
    let motherElternzeitDays = 0;
    const motherPhaseOrder: DayPhase[] = [];
    const recordMotherPhase = (phase: DayPhase): void => {
      if (!motherPhaseOrder.includes(phase)) {
        motherPhaseOrder.push(phase);
      }
    };
    let husbandWorkDays = 0;
    let husbandElternzeitDays = 0;
    let sumWifePaidHours = 0;
    let sumHusbandPaidHours = 0;
    let lastDayWifeHours: WorkingHours = paidWifeHours;
    let lastDayHusbandHours: WorkingHours = husbandHours;

    const actionsWithDates = sortedWorkingHoursChanges.map((action) => ({
      action,
      date:
        action.effectiveDate ??
        buildIsoDate(action.effectiveCalendarYear, action.effectiveCalendarMonth, 1),
    }));

    for (let day = 1; day <= totalCalendarDays; day++) {
      const iso: IsoCalendarDate = buildIsoDate(year, calendarMonth, day);
      const isMatDay = exactMutterschutzWindows.some(
        (entry) =>
          diffCalendarDays(entry.window.preBirthStart, iso) >= 0 &&
          diffCalendarDays(iso, entry.window.postBirthEnd) >= 0,
      );
      let dayH = p.husbandWeeklyHours;
      let dayW = p.wifeWeeklyHours;
      let explicitWOnDay = false;
      for (const item of actionsWithDates) {
        if (diffCalendarDays(item.date, iso) >= 0) {
          if (item.action.targetPerson === TargetPerson.Husband || item.action.targetPerson === TargetPerson.Both) {
            dayH = item.action.weeklyHours;
          }
          if (item.action.targetPerson === TargetPerson.Wife || item.action.targetPerson === TargetPerson.Both) {
            dayW = item.action.weeklyHours;
            explicitWOnDay = true;
          }
        }
      }
      if (!explicitWOnDay) {
        const dayDelivered = orderedPregnancies
          .filter((preg) => {
            if (preg.expectedDueDate) {
              return diffCalendarDays(preg.expectedDueDate, iso) >= 0;
            }
            return index >= preg.calculatedDeliverySimulationMonth;
          })
          .at(-1);
        if (dayDelivered) {
          dayW = dayDelivered.motherPostBirthPartTimeHours;
        }
      }

      if (isMatDay) {
        motherMutterschutzDays += 1;
        recordMotherPhase(DayPhase.Mutterschutz);
      }
      else if (dayW <= 0) {
        motherElternzeitDays += 1;
        recordMotherPhase(DayPhase.Elternzeit);
      }
      else {
        motherWorkDays += 1;
        sumWifePaidHours += dayW;
        recordMotherPhase(DayPhase.Work);
      }

      if (dayH <= 0) {
        husbandElternzeitDays += 1;
      }
      else {
        husbandWorkDays += 1;
        sumHusbandPaidHours += dayH;
      }

      lastDayWifeHours = isMatDay ? toWorkingHours(0) : dayW;
      lastDayHusbandHours = dayH;
    }

    effectiveWifeHoursForPayroll = sumWifePaidHours / totalCalendarDays;
    effectiveHusbandHoursForPayroll = sumHusbandPaidHours / totalCalendarDays;
    paidWifeHours = lastDayWifeHours;
    husbandHours = lastDayHusbandHours;

    const isSplitMonth =
      (motherWorkDays > 0 && motherWorkDays < totalCalendarDays) ||
      (motherMutterschutzDays > 0 && motherMutterschutzDays < totalCalendarDays) ||
      (motherElternzeitDays > 0 && motherElternzeitDays < totalCalendarDays) ||
      (husbandWorkDays > 0 && husbandElternzeitDays > 0);

    if (isSplitMonth) {
      daySplit = Object.freeze({
        totalCalendarDays,
        motherWorkDays,
        motherMutterschutzDays,
        motherElternzeitDays,
        husbandWorkDays,
        husbandElternzeitDays,
        summaryLabel: buildDaySplitSummaryLabel({
          motherWorkDays,
          motherMutterschutzDays,
          motherElternzeitDays,
          husbandWorkDays,
          husbandElternzeitDays,
          totalCalendarDays,
          motherPhaseOrder,
        }),
      });
    }
  }
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
  const wageGrowthRate = p.inflationAssumptions?.annualWageGrowthRate;
  const growthYearsElapsed = Math.max(0, Math.floor((index - 1) / 12));
  const growNetMap = (nets: NetClassMap): void => {
    if (!wageGrowthRate || wageGrowthRate <= 0 || growthYearsElapsed === 0) {
      return;
    }
    for (const taxClass of Object.values(Classes)) {
      const net = nets[taxClass];
      if (net !== undefined) {
        nets[taxClass] = toNetSalary(
          evaluateCompoundedWageGrowthFormula({
            baseAmount: toEuroAmount(net),
            annualGrowthRate: wageGrowthRate,
            yearsElapsed: growthYearsElapsed,
          }),
        );
      }
    }
  };
  if (wageGrowthRate && wageGrowthRate > 0 && growthYearsElapsed > 0) {
    if (husbandGross !== undefined) {
      husbandGross = toGrossSalary(
        evaluateCompoundedWageGrowthFormula({
          baseAmount: toEuroAmount(husbandGross),
          annualGrowthRate: wageGrowthRate,
          yearsElapsed: growthYearsElapsed,
        }),
      );
    }
    if (wifeGross !== undefined) {
      wifeGross = toGrossSalary(
        evaluateCompoundedWageGrowthFormula({
          baseAmount: toEuroAmount(wifeGross),
          annualGrowthRate: wageGrowthRate,
          yearsElapsed: growthYearsElapsed,
        }),
      );
    }
    growNetMap(husbandNets);
    growNetMap(wifeFullNets);
    growNetMap(wifePartNets);
  }
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
    validateSalaryReplacement(raise);
    const replacement = raise.newHusbandGross !== undefined || raise.newWifeGross !== undefined;
    if (replacement && !grossMode) {
      throw new TypeError("New gross salaries require gross-input mode.");
    }
    if (grossMode && raise.percentageIncrease === undefined && !replacement) {
      throw new TypeError("Gross-mode salary changes require a percentage or new gross salary.");
    }
    if (raise.targetPerson === TargetPerson.Husband || raise.targetPerson === TargetPerson.Both) {
      if (raise.percentageIncrease !== undefined) {
        scale(husbandNets, raise.percentageIncrease);
        husbandGross = husbandGross === undefined ? undefined : toGrossSalary(husbandGross * (1 + raise.percentageIncrease));
      }
      else if (replacement) {
        husbandGross = raise.newHusbandGross;
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
      else if (replacement) {
        wifeGross = raise.newWifeGross;
      }
      else {
        wifeFullNets[Classes.III] = raise.newWifeClass3FTNet ?? wifeFullNets[Classes.III];
        wifeFullNets[Classes.V] = raise.newWifeClass5FTNet ?? wifeFullNets[Classes.V];
        wifePartNets[Classes.III] = raise.newWifeClass3PTNet ?? wifePartNets[Classes.III];
        wifePartNets[Classes.V] = raise.newWifeClass5PTNet ?? wifePartNets[Classes.V];
      }
    }
  }
  const forHours = (gross: GrossSalary, hours: number, baseline: WorkingHours): GrossSalary => {
    if (hours <= 0) {
      return toGrossSalary(0);
    }
    const denominator = baseline > 0 ? baseline : 40;
    return toGrossSalary(gross * hours / denominator);
  };
  const rules = grossMode ? createTaxRules(year, p.taxRuleOverrides) : undefined;
  const husbandFullMonthGross = husbandGross === undefined ? undefined : forHours(husbandGross, husbandHours, p.husbandWeeklyHours);
  const wifeFullMonthGross = wifeGross === undefined ? undefined : forHours(wifeGross, paidWifeHours, p.wifeWeeklyHours);
  const hGross = husbandGross === undefined ? undefined : forHours(husbandGross, effectiveHusbandHoursForPayroll, p.husbandWeeklyHours);
  const wGross = wifeGross === undefined ? undefined : forHours(wifeGross, effectiveWifeHoursForPayroll, p.wifeWeeklyHours);
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
    const expectedHusbandContractualGross =
      husbandFullMonthGross !== undefined && husbandFullMonthGross > 0
        ? husbandFullMonthGross
        : hGross ?? toGrossSalary(0);
    const expectedWifeContractualGross =
      wifeFullMonthGross !== undefined && wifeFullMonthGross > 0
        ? wifeFullMonthGross
        : wifeGross !== undefined && wGross !== undefined && wGross > 0
          ? wifeGross
          : wGross ?? toGrossSalary(0);
    const hPay = (taxClass: TaxClass) => computeGrossToNetBreakdown(
      hGross ?? toGrossSalary(0),
      taxClass,
      children,
      undefined,
      taxClass === Classes.IV && useFactor ? factor : undefined,
      rules,
      { ...husbandPersonal,
        expectedMonthlyEmploymentGross: employmentAverage(
          expectedHusbandContractualGross,
          true,
        ) },
    );
    const wPay = (gross: GrossSalary, taxClass: TaxClass, expectedContractualGross?: GrossSalary) => computeGrossToNetBreakdown(
      gross,
      taxClass,
      children,
      undefined,
      taxClass === Classes.IV && useFactor ? factor : undefined,
      rules,
      { ...wifePersonal,
        expectedMonthlyEmploymentGross: employmentAverage(expectedContractualGross ?? gross, false) },
    );
    for (const taxClass of [Classes.III, Classes.V, Classes.IV]) {
      const husband = hPay(taxClass);
      const wife = wPay(wGross ?? toGrossSalary(0), taxClass, expectedWifeContractualGross);
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
    wifePayroll ??= wPay(wGross ?? toGrossSalary(0), wifeClass, expectedWifeContractualGross);
    husbandNets[husbandClass] = husbandPayroll.regularNetTakeHome;
    wifeNets[wifeClass] = wifePayroll.regularNetTakeHome;
  }
  else {
    const defaultPartHours = delivered?.motherPostBirthPartTimeHours ?? p.wifePostBirthWeeklyHours;
    for (const taxClass of Object.values(Classes)) {
      const full = wifeFullNets[taxClass];
      const part = wifePartNets[taxClass];
      wifeNets[taxClass] = effectiveWifeHoursForPayroll <= 0 ? toNetSalary(0) : effectiveWifeHoursForPayroll === p.wifeWeeklyHours ? full
        : part !== undefined && defaultPartHours !== undefined && defaultPartHours > 0 ? toNetSalary(part * effectiveWifeHoursForPayroll / defaultPartHours)
          : full !== undefined && p.wifeWeeklyHours > 0 ? toNetSalary(full * effectiveWifeHoursForPayroll / p.wifeWeeklyHours) : undefined;
      if (needsDayProration && p.husbandWeeklyHours > 0 && husbandNets[taxClass] !== undefined) {
        husbandNets[taxClass] = toNetSalary(
          husbandNets[taxClass]! * effectiveHusbandHoursForPayroll / p.husbandWeeklyHours,
        );
      }
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
    const motherVariant = resolveMotherAllowanceVariant(delivered);
    const motherOrdinaryMonths = resolveMotherOrdinaryMonthsCount(delivered, conventions, benefits);
    const ordinaryLength = Math.max(motherOrdinaryMonths, delivered.fatherPartnerMonthsCount);
    const motherEnd = delivered.calculatedDeliverySimulationMonth + conventions.maternityPostBirthMonths.value + motherOrdinaryMonths;
    const bonusStart = delivered.calculatedDeliverySimulationMonth + conventions.maternityPostBirthMonths.value + ordinaryLength;
    if (index < motherEnd) {
      const variantLabel = motherVariant === ElterngeldVariant.Basis ? "Basiselterngeld" : "EGPlus";
      phaseLabel = paidWifeHours > benefits.maximumWeeklyHours.value
        ? `Child ${delivered.childIndex} Post-Leave (Hours >${benefits.maximumWeeklyHours.value}h: No EG § 1 BEEG)`
        : `Child ${delivered.childIndex} ${variantLabel} (Mother)`;
    }
    else if (index >= bonusStart && index < bonusStart + conventions.partnershipBonusMonths.value) {
      phaseLabel = `Child ${delivered.childIndex} Partnership Bonus Planning Window`;
    }
  }
  else if (isSwapActive) {
    phaseLabel = "Swap Active (Pre-Mutterschutz)";
  }
  return Object.freeze({ ordinal,
    calendarYearNum: year,
    calendarMonthNum: calendarMonth,
    totalCalendarDays,
    mutterschutzDays,
    daySplit,
    husbandHours,
    wifeHours: paidWifeHours,
    husbandFullMonthGross,
    wifeFullMonthGross,
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
            createTaxRules(p.startCalendarYear, p.taxRuleOverrides),
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
      mutterschutz = income.mutterschutzDays < income.totalCalendarDays
        ? evaluateMutterschutzMonthlyPayFormula({
          referenceMonthlyNet: rate,
          mutterschutzDaysInMonth: income.mutterschutzDays,
          totalDaysInMonth: income.totalCalendarDays,
        }).totalMonthlyBenefit
        : rate;
    }
    months.push(Object.freeze({ ...income,
      mutterschutz,
      assumptions: Object.freeze(assumptions) }));
  }
  return Object.freeze(months);
}
