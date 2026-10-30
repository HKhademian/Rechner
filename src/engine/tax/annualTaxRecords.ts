import {
  type MonthlyLedgerEntry,
  type FullCalendarYear,
  type CalendarMonth,
  toEuroAmount,
  toGrossSalary,
  toCalendarMonth,
} from "#engine/types";
import {
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  type ChildYearPresence,
} from "#engine/tax/jointAssessment";
import {
  computeAnnualEmploymentTaxBase,
} from "#engine/tax/annualEmploymentIncome";
import {
  computeAnnualTaxSettlement,
} from "#engine/tax/annualTaxSettlement";

export interface AnnualTaxRecord {
  readonly calendarYear: FullCalendarYear;
  readonly missingMonths: readonly CalendarMonth[];
  /** Income may be known while replacement benefits needed for tax progression are unavailable. */
  readonly incomeAvailable: boolean;
  readonly available: boolean;
  readonly taxBase?: ReturnType<typeof computeAnnualEmploymentTaxBase>;
  readonly assessment?: ReturnType<typeof computeAnnualTaxSettlement>;
  readonly reasons: readonly string[];
  readonly assumptions: readonly string[];
}

/** Aggregate actual regular/bonus payroll once per complete calendar year.
 * Missing months, manual nets and unsupported contributions never become invented tax figures.
 */
export function collectAnnualTaxRecords(
  months: readonly MonthlyLedgerEntry[],
  children: readonly ChildYearPresence[],
  unsupportedByYear: ReadonlyMap<FullCalendarYear, readonly string[]> = new Map(),
): readonly AnnualTaxRecord[] {
  const years = [...new Set(months.map((month) => month.calendarYearNum))].sort((a, b) => a - b);
  return Object.freeze(years.map((calendarYear): AnnualTaxRecord => {
    const records = months.filter((month) => month.calendarYearNum === calendarYear);
    const present = new Set(records.map((month) => month.calendarMonthNum));
    if (present.size !== records.length) {
      throw new TypeError("Annual accounting contains duplicate calendar months.");
    }
    const missingMonths = Array.from({ length: 12 }, (_, index) => toCalendarMonth(index + 1)).filter((month) => !present.has(month));
    const reasons = [...(unsupportedByYear.get(calendarYear) ?? [])];
    const assumptions = ["Joint assessment of ordinary employer-insured spouses, with standard expenses and no additional taxable income or deductions."];
    if (missingMonths.length > 0) {
      reasons.push(`Tax year ${calendarYear} lacks calendar months ${missingMonths.join(", ")}; no unseen income is inferred.`);
    }
    if (records.some((month) => !month.payroll)) {
      reasons.push("Manual net salaries do not establish annual gross, actual contributions or withholding.");
    }
    for (const month of records) {
      for (const payroll of [month.payroll?.husband, month.payroll?.wife]) {
        if (payroll) {
          reasons.push(...payroll.payrollLimitations, ...(payroll.bonuses ?? []).flatMap((bonus) => bonus.payrollLimitations ?? []));
          if (payroll.monthlyChurchTax > 0 || payroll.bonuses?.some((bonus) => bonus.churchTax > 0)) {
            reasons.push("Annual church tax, including its deduction and joint-household rules, is not supported.");
          }
        }
      }
    }
    let taxBase: AnnualTaxRecord["taxBase"];
    let assessment: AnnualTaxRecord["assessment"];
    try {
      const rules = createTaxRules(calendarYear);
      if (rules.projected) {
        assumptions.push(`Published ${rules.sourceYear} annual rules are projected to ${calendarYear}.`);
      }
      if (reasons.length === 0) {
        const parent = (husband: boolean) => {
          const payrolls = records.map((month) => husband ? month.payroll!.husband : month.payroll!.wife);
          const gross = toGrossSalary(payrolls.reduce((sum, payroll) => sum + payroll.monthlyGross +
            (payroll.bonuses ?? []).reduce((total, bonus) => total + bonus.gross, 0), 0));
          const component = (
            regular: (payroll: typeof payrolls[number]) => number,
            bonusValue: (bonus: NonNullable<typeof payrolls[number]["bonuses"]>[number]) => number,
          ) =>
            toEuroAmount(payrolls.reduce((sum, payroll) => sum + regular(payroll) +
              (payroll.bonuses ?? []).reduce((total, bonus) => total + bonusValue(bonus), 0), 0));
          return { gross,
            health: component((payroll) => payroll.healthInsurance, (bonus) => bonus.health),
            care: component((payroll) => payroll.careInsurance, (bonus) => bonus.care),
            pension: component((payroll) => payroll.pensionInsurance, (bonus) => bonus.pension),
            unemployment: component((payroll) => payroll.unemploymentInsurance, (bonus) => bonus.unemployment),
            withheldIncomeTax: component((payroll) => payroll.monthlyWageTax, (bonus) => bonus.wageTax),
            withheldSolidarity: component((payroll) => payroll.monthlySolidaritySurcharge, (bonus) => bonus.solidarity) };
        };
        const husband = parent(true);
        const wife = parent(false);
        taxBase = computeAnnualEmploymentTaxBase(husband, wife, rules);
        if (records.some((month) => month.benefitAssessmentAvailable === false)) {
          reasons.push("An unavailable benefit payment prevents annual progression-income assessment.");
        }
        else {
          const husbandProgression = records.reduce((sum, month) => sum + month.husbandElterngeld, 0);
          const wifeProgression = records.reduce((sum, month) => sum + month.wifeElterngeld + month.mutterschutz, 0);
          const progressionIncome = toEuroAmount(Math.max(0, husbandProgression - taxBase.husbandUnusedWorkAllowance) +
            Math.max(0, wifeProgression - taxBase.wifeUnusedWorkAllowance));
          assessment = computeAnnualTaxSettlement({ calendarYear,
            taxableIncome: taxBase.taxableIncome,
            progressionIncome,
            withheldIncomeTax: toEuroAmount(husband.withheldIncomeTax + wife.withheldIncomeTax),
            withheldSolidarity: toEuroAmount(husband.withheldSolidarity + wife.withheldSolidarity),
            children });
        }
      }
    }
    catch (error) {
      reasons.push(error instanceof Error ? error.message : "Annual rules are unavailable.");
    }
    return Object.freeze({ calendarYear,
      missingMonths: Object.freeze(missingMonths),
      incomeAvailable: taxBase !== undefined,
      available: assessment !== undefined,
      taxBase,
      assessment,
      reasons: Object.freeze([...new Set(reasons)]),
      assumptions: Object.freeze(assumptions) });
  }));
}
