/**
 * German Elterngeld & Parental Leave 5-Year Simulator - State Persistence Engine
 *
 * Provides type-safe serialization, deserialization, schema validation,
 * and robust localStorage persistence for all user sandbox inputs,
 * timeline parameters, custom actions, and UI view preferences.
 * Enforces nominal branded types, const object enums, and runtime validation
 * per repository rules and domain modeling guidelines.
 */

import {
  SalaryInputMode,
  SalaryPeriod,
  ActiveScenarioView,
  TimelineChartMode,
  TimelineTimeRangeFilter,
  TaxClass,
  TargetPerson,
  FinancialEventCategory,
  AnnualSalariesCount,
  toSalaryInputMode,
  toSalaryPeriod,
  toAnnualSalariesCount,
  toActiveScenarioView,
  toTimelineChartMode,
  toTimelineTimeRangeFilter,
  toTaxClass,
  toTargetPerson,
  toFinancialEventCategory,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  toHoursChangeId,
  toFinancialEventId,
  toEuroAmount,
  toGrossSalary,
  toNetSalary,
  toWorkingHours,
  toSimulationMonth,
  toCalendarMonth,
  toFullCalendarYear,
  toTaxFactor,
  toMonthDuration,
  toChildIndex,
  toPercentageRate,
  type GrossSalary,
  type NetSalary,
  type WorkingHours,
  type EuroAmount,
  type SimulationMonth,
  type CalendarMonth,
  type FullCalendarYear,
  type MonthDuration,
  type SalaryBonusSlot,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction,
  type WorkingHoursChangeAction,
  type FinancialEventAction,
} from "#engine/types";

import standard3ChildrenData from "../../data/scenarios/standard_3_children.json" with { type: "json" };
import testScenarioData from "../../data/testScenario.json" with { type: "json" };
import emptyScenarioData from "../../data/scenarios/empty.json" with { type: "json" };
import {
  findBuiltinScenario,
} from "#data/scenarios/scenarioRegistry";




/** LocalStorage key for persisting the complete simulator state envelope. */
export const ELTERNGELD_STORAGE_KEY = "elterngeld_simulator_state_v1";

/**
 * Strongly-Typed Simulator State Persistence Schema.
 * Contains all baseline financial parameters, action batch collections, and view preferences.
 */
export interface ElterngeldPersistedState {
  // Input Modes & Salaries
  /** Salary input format specification (Gross pre-tax vs Net take-home). */
  readonly salaryInputMode: SalaryInputMode;
  /** Salary payment frequency (Monthly vs Yearly). */
  readonly salaryPeriod: SalaryPeriod;
  /** Husband's regular full-time gross salary in EUR. */
  readonly husbandGross: GrossSalary;
  /** Wife's pre-birth regular full-time gross salary in EUR. */
  readonly wifeGross: GrossSalary;
  /** Husband's regular weekly working hours (e.g. 40h). */
  readonly husbandHours: WorkingHours;
  /** Total annual salaries for husband (12, 13, 14, or 15). */
  readonly husbandSalariesCount?: AnnualSalariesCount;
  /** Husband's bonus installment distribution schedule across calendar months. */
  readonly husbandBonusDistribution?: readonly SalaryBonusSlot[];
  /** Wife's pre-birth weekly working hours (e.g. 40h). */
  readonly wifeInitialHours: WorkingHours;
  /** Wife's post-birth part-time weekly working hours during leave (e.g. 24h..32h). */
  readonly wifePostBirthHours: WorkingHours;
  /** Total annual salaries for wife (12, 13, 14, or 15). */
  readonly wifeSalariesCount?: AnnualSalariesCount;
  /** Wife's bonus installment distribution schedule across calendar months. */
  readonly wifeBonusDistribution?: readonly SalaryBonusSlot[];
  /** Husband's monthly net salary in Tax Class III in EUR. */
  readonly husbandClass3Net: NetSalary;
  /** Husband's monthly net salary in Tax Class V in EUR. */
  readonly husbandClass5Net: NetSalary;
  /** Wife's full-time monthly net salary in Tax Class V in EUR. */
  readonly wifeClass5FullTimeNet: NetSalary;
  /** Wife's full-time monthly net salary in Tax Class III in EUR. */
  readonly wifeClass3FullTimeNet: NetSalary;
  /** Husband's starting tax class at simulation commencement (§ 38b EStG). */
  readonly husbandInitialTaxClass?: TaxClass;
  /** Wife's starting tax class at simulation commencement (§ 38b EStG). */
  readonly wifeInitialTaxClass?: TaxClass;
  /** True if § 39f EStG factor method is enabled on starting Tax Class IV. */
  readonly useInitialTaxFactor?: boolean;

  // Additional Inflows
  /** Annual bonus gross compensation in EUR if applicable. */
  readonly annualBonusGross: GrossSalary;
  /** Calendar month when annual bonus is paid out (1..12). */
  readonly annualBonusMonth: CalendarMonth;
  /** Recurring monthly capital or investment income in EUR. */
  readonly investmentReturnMonthly: EuroAmount;

  // Benefits & Calendar Timelines
  /** Statutory monthly Kindergeld rate per child in EUR (§ 66 EStG). */
  readonly kindergeldPerChild: EuroAmount;
  /** Toggle enabling 13th salary bonus payments (vacation and Christmas bonuses). */
  readonly enable13thSalary: boolean;
  /** Month in which 40% mid-year vacation bonus is disbursed (1..12). */
  readonly bonus40Month: CalendarMonth;
  /** Month in which 60% year-end Christmas bonus is disbursed (1..12). */
  readonly bonus60Month: CalendarMonth;
  /** Month in which annual tax return refund is disbursed (1..12). */
  readonly taxReturnMonth: CalendarMonth;
  /** Boolean toggle controlling visibility of special event sub-rows in the table. */
  readonly showSpecialEventRows: boolean;
  /** Boolean toggle enabling annual salary raise modeling. */
  readonly enableSalaryRaises: boolean;
  /** Annual career salary increase percentage (e.g. 0.05 for +5%). */
  readonly annualSalaryRaisePercent: number;

  // Simulation Duration & Milestones
  /** 4-digit Gregorian simulation start year (e.g. 2025). */
  readonly startCalendarYear: FullCalendarYear;
  /** 1-based Gregorian simulation start month (1..12). */
  readonly startCalendarMonth: CalendarMonth;
  /** Total simulation duration in months (e.g. 60 or 120). */
  readonly simulationDurationMonths: MonthDuration;
  /** Pre-pregnancy planning buffer duration in months before first positive pregnancy test. */
  readonly prePregnancyPlanningMonths: MonthDuration;
  /** Simulation month when Child 1 is delivered. */
  readonly child1BirthMonth: SimulationMonth;
  /** Spacing between Child 1 and Child 2 deliveries in elapsed months. */
  readonly birthSpacingMonths: MonthDuration;
  /** Proactive tax class swap lead time prior to conception in months. */
  readonly swapLeadMonths: MonthDuration;
  /** Pre-delivery maternity protection period in months (typically 1.5 months ~ 6 weeks). */
  readonly preMutterschutzMonths: MonthDuration;
  /** Post-delivery maternity protection period in months (typically 2 months ~ 8 weeks). */
  readonly postMutterschutzMonths: MonthDuration;

  // Dynamic Batch Action Collections
  /** Batch 1: User-configured pregnancy timeline milestone actions. */
  readonly customPregnancies: readonly PregnancyAction[];
  /** Batch 2: User-configured proactive spousal tax class switches. */
  readonly customTaxClassSwitches: readonly TaxClassSwitchAction[];
  /** Batch 3: User-configured salary raise and compensation adjustments. */
  readonly customSalaryRaises: readonly SalaryRaiseAction[];
  /** Batch 3: User-configured working hours and employment schedule adjustments. */
  readonly customWorkingHoursChanges?: readonly WorkingHoursChangeAction[];
  /** Batch 4: User-configured discrete financial expense and inflow events. */
  readonly customFinancialEvents: readonly FinancialEventAction[];

  // UI View Preferences
  /** Active scenario tab selection in the user interface (A, B, C, or Compare). */
  readonly activeScenario: ActiveScenarioView;
  /** Visual chart render mode (stacked_bar, lines, area, compare). */
  readonly chartMode: TimelineChartMode;
  /** Timeline horizontal zoom and milestone filtering selection. */
  readonly timeRangeFilter: TimelineTimeRangeFilter;
}

/**
 * Parses and validates raw scenario JSON payload into a strongly-typed `ElterngeldPersistedState`
 * with nominal branded types and strict range validation.
 *
 * @param raw - Arbitrary raw parsed JSON object.
 * @returns Strongly-typed and normalized `ElterngeldPersistedState`.
 * @throws {TypeError} if payload is not a non-null object or contains corrupted properties.
 */
export function parseRawScenarioData(raw: unknown): ElterngeldPersistedState {
  if (!raw || typeof raw !== "object") {
    throw new TypeError("Scenario JSON payload must be a non-null object.");
  }
  const root = raw as Record<string, unknown>;
  const obj =
    typeof root.simulationState === "object" && root.simulationState !== null
      ? (root.simulationState as Record<string, unknown>)
      : root;

  const salaryInputModeVal =
    typeof obj.salaryInputMode === "string"
      ? toSalaryInputMode(obj.salaryInputMode)
      : SalaryInputMode.Gross;

  const salaryPeriodVal =
    typeof obj.salaryPeriod === "string"
      ? toSalaryPeriod(obj.salaryPeriod)
      : SalaryPeriod.Monthly;

  const activeScenarioVal =
    typeof obj.activeScenario === "string"
      ? toActiveScenarioView(obj.activeScenario)
      : ActiveScenarioView.C;

  const chartModeVal =
    typeof obj.chartMode === "string"
      ? toTimelineChartMode(obj.chartMode)
      : TimelineChartMode.StackedBar;

  const timeRangeFilterVal =
    typeof obj.timeRangeFilter === "string"
      ? toTimelineTimeRangeFilter(obj.timeRangeFilter)
      : TimelineTimeRangeFilter.All;

  const husbandGross = toGrossSalary(Number(obj.husbandGross) || 0);
  const wifeGross = toGrossSalary(Number(obj.wifeGross) || 0);
  const husbandHours = toWorkingHours(Number(obj.husbandHours) || 0);
  const wifeInitialHours = toWorkingHours(Number(obj.wifeInitialHours) || 0);
  const wifePostBirthHours = toWorkingHours(
    Number(obj.wifePostBirthHours) || 0,
  );

  const husbandSalariesCount =
    obj.husbandSalariesCount !== undefined
      ? toAnnualSalariesCount(obj.husbandSalariesCount as number | string)
      : obj.enable13thSalary
        ? AnnualSalariesCount.Thirteen
        : AnnualSalariesCount.Twelve;

  const husbandBonusDistribution: SalaryBonusSlot[] = Array.isArray(
    obj.husbandBonusDistribution,
  )
    ? (obj.husbandBonusDistribution as Array<Record<string, unknown>>).map(
      (slot) => ({
        calendarMonth: toCalendarMonth(Number(slot.calendarMonth) || 1),
        payoutFraction: toPercentageRate(Number(slot.payoutFraction) || 0),
        label: typeof slot.label === "string" ? slot.label : undefined,
      }),
    )
    : husbandSalariesCount === AnnualSalariesCount.Thirteen
      ? [
        {
          calendarMonth: toCalendarMonth(Number(obj.bonus40Month) || 5),
          payoutFraction: toPercentageRate(0.4),
          label: "13th Salary: 40% Vacation Bonus",
        },
        {
          calendarMonth: toCalendarMonth(Number(obj.bonus60Month) || 11),
          payoutFraction: toPercentageRate(0.6),
          label: "13th Salary: 60% Christmas Bonus",
        },
      ]
      : husbandSalariesCount === AnnualSalariesCount.Fourteen
        ? [
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
        ]
        : husbandSalariesCount === AnnualSalariesCount.Fifteen
          ? [
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
          ]
          : [];

  const wifeSalariesCount =
    obj.wifeSalariesCount !== undefined
      ? toAnnualSalariesCount(obj.wifeSalariesCount as number | string)
      : AnnualSalariesCount.Twelve;

  const wifeBonusDistribution: SalaryBonusSlot[] = Array.isArray(
    obj.wifeBonusDistribution,
  )
    ? (obj.wifeBonusDistribution as Array<Record<string, unknown>>).map(
      (slot) => ({
        calendarMonth: toCalendarMonth(Number(slot.calendarMonth) || 1),
        payoutFraction: toPercentageRate(Number(slot.payoutFraction) || 0),
        label: typeof slot.label === "string" ? slot.label : undefined,
      }),
    )
    : wifeSalariesCount === AnnualSalariesCount.Thirteen
      ? [
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
      ]
      : wifeSalariesCount === AnnualSalariesCount.Fourteen
        ? [
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
        ]
        : wifeSalariesCount === AnnualSalariesCount.Fifteen
          ? [
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
          ]
          : [];

  const husbandClass3Net = toNetSalary(Number(obj.husbandClass3Net) || 0);
  const husbandClass5Net = toNetSalary(Number(obj.husbandClass5Net) || 0);
  const wifeClass5FullTimeNet = toNetSalary(
    Number(obj.wifeClass5FullTimeNet) || 0,
  );
  const wifeClass3FullTimeNet = toNetSalary(
    Number(obj.wifeClass3FullTimeNet) || 0,
  );

  const husbandInitialTaxClass =
    typeof obj.husbandInitialTaxClass === "string"
      ? toTaxClass(obj.husbandInitialTaxClass)
      : TaxClass.III;

  const wifeInitialTaxClass =
    typeof obj.wifeInitialTaxClass === "string"
      ? toTaxClass(obj.wifeInitialTaxClass)
      : TaxClass.V;

  const useInitialTaxFactor = Boolean(obj.useInitialTaxFactor);

  const annualBonusGross = toGrossSalary(Number(obj.annualBonusGross) || 0);
  const annualBonusMonth = toCalendarMonth(Number(obj.annualBonusMonth) || 12);
  const investmentReturnMonthly = toEuroAmount(
    Number(obj.investmentReturnMonthly) || 0,
  );

  const kindergeldPerChild = toEuroAmount(Number(obj.kindergeldPerChild) || 0);
  const enable13thSalary = Boolean(obj.enable13thSalary);
  const bonus40Month = toCalendarMonth(Number(obj.bonus40Month) || 5);
  const bonus60Month = toCalendarMonth(Number(obj.bonus60Month) || 11);
  const taxReturnMonth = toCalendarMonth(Number(obj.taxReturnMonth) || 3);
  const showSpecialEventRows = Boolean(obj.showSpecialEventRows);
  const enableSalaryRaises = Boolean(obj.enableSalaryRaises);
  const annualSalaryRaisePercent = Number(obj.annualSalaryRaisePercent) || 0;

  const startCalendarYear = toFullCalendarYear(
    Number(obj.startCalendarYear) || 2026,
  );
  const startCalendarMonth = toCalendarMonth(
    Number(obj.startCalendarMonth) || 1,
  );
  const simulationDurationMonths = toMonthDuration(
    Number(obj.simulationDurationMonths) || 60,
  );
  const prePregnancyPlanningMonths = toMonthDuration(
    Number(obj.prePregnancyPlanningMonths) || 0,
  );
  const child1BirthMonth = toSimulationMonth(Number(obj.child1BirthMonth) || 1);
  const birthSpacingMonths = toMonthDuration(
    Number(obj.birthSpacingMonths) || 0,
  );
  const swapLeadMonths = toMonthDuration(Number(obj.swapLeadMonths) || 0);
  const preMutterschutzMonths = toMonthDuration(
    Number(obj.preMutterschutzMonths) || 0,
  );
  const postMutterschutzMonths = toMonthDuration(
    Number(obj.postMutterschutzMonths) || 0,
  );

  const customPregnancies: readonly PregnancyAction[] = Array.isArray(
    obj.customPregnancies,
  )
    ? obj.customPregnancies.map((p, idx) => {
      const pObj = (p && typeof p === "object" ? p : {}) as Record<
        string,
        unknown
      >;
      return {
        pregnancyId: toPregnancyId(
          typeof pObj.pregnancyId === "string"
            ? pObj.pregnancyId
            : `PREG-CHILD-${idx + 1}`,
        ),
        childIndex: toChildIndex(Number(pObj.childIndex) || idx + 1),
        positiveTestCalendarMonth: toCalendarMonth(
          Number(pObj.positiveTestCalendarMonth) || startCalendarMonth,
        ),
        positiveTestCalendarYear: toFullCalendarYear(
          Number(pObj.positiveTestCalendarYear) || startCalendarYear,
        ),
        positiveTestSimulationMonth: toSimulationMonth(
          Number(pObj.positiveTestSimulationMonth) || 1,
        ),
        calculatedDeliverySimulationMonth: toSimulationMonth(
          Number(pObj.calculatedDeliverySimulationMonth) || 1,
        ),
        motherPostBirthPartTimeHours: toWorkingHours(
          Number(pObj.motherPostBirthPartTimeHours) || wifePostBirthHours,
        ),
        motherPostBirthPartTimeClass5Net: toNetSalary(
          Number(pObj.motherPostBirthPartTimeClass5Net) || 0,
        ),
        motherPostBirthPartTimeClass3Net: toNetSalary(
          Number(pObj.motherPostBirthPartTimeClass3Net) || 0,
        ),
        fatherPartnerMonthsCount: toMonthDuration(
          Number(pObj.fatherPartnerMonthsCount) || 0,
        ),
      };
    })
    : [];

  const customTaxClassSwitches: readonly TaxClassSwitchAction[] = Array.isArray(
    obj.customTaxClassSwitches,
  )
    ? obj.customTaxClassSwitches.map((s, idx) => {
      const sObj = (s && typeof s === "object" ? s : {}) as Record<
        string,
        unknown
      >;
      return {
        switchId: toSwitchId(
          typeof sObj.switchId === "string"
            ? sObj.switchId
            : `SWAP-CHILD-${idx + 1}`,
        ),
        effectiveSimulationMonth: toSimulationMonth(
          Number(sObj.effectiveSimulationMonth) || 1,
        ),
        effectiveCalendarMonth: toCalendarMonth(
          Number(sObj.effectiveCalendarMonth) || startCalendarMonth,
        ),
        effectiveCalendarYear: toFullCalendarYear(
          Number(sObj.effectiveCalendarYear) || startCalendarYear,
        ),
        targetHusbandTaxClass:
            typeof sObj.targetHusbandTaxClass === "string"
              ? toTaxClass(sObj.targetHusbandTaxClass)
              : TaxClass.V,
        targetWifeTaxClass:
            typeof sObj.targetWifeTaxClass === "string"
              ? toTaxClass(sObj.targetWifeTaxClass)
              : TaxClass.III,
        targetUseTaxFactor:
            typeof sObj.targetUseTaxFactor === "boolean"
              ? sObj.targetUseTaxFactor
              : undefined,
        targetTaxFactor:
            typeof sObj.targetTaxFactor === "number" &&
            sObj.targetTaxFactor > 0 &&
            sObj.targetTaxFactor <= 1
              ? toTaxFactor(sObj.targetTaxFactor)
              : undefined,
        revertHusbandTaxClass:
            typeof sObj.revertHusbandTaxClass === "string"
              ? toTaxClass(sObj.revertHusbandTaxClass)
              : undefined,
        revertWifeTaxClass:
            typeof sObj.revertWifeTaxClass === "string"
              ? toTaxClass(sObj.revertWifeTaxClass)
              : undefined,
        revertUseTaxFactor:
            typeof sObj.revertUseTaxFactor === "boolean"
              ? sObj.revertUseTaxFactor
              : undefined,
        statutoryReason:
            typeof sObj.statutoryReason === "string"
              ? sObj.statutoryReason
              : "",
        revertSimulationMonth:
            sObj.revertSimulationMonth !== undefined
              ? toSimulationMonth(Number(sObj.revertSimulationMonth) || 1)
              : undefined,
      };
    })
    : [];

  const customSalaryRaises: readonly SalaryRaiseAction[] = Array.isArray(
    obj.customSalaryRaises,
  )
    ? obj.customSalaryRaises.map((r, idx) => {
      const rObj = (r && typeof r === "object" ? r : {}) as Record<
        string,
        unknown
      >;
      let rawPct = Number(rObj.percentageIncrease) || 0;
      if (rawPct > 1) {
        rawPct = rawPct / 100;
      }
      return {
        raiseId: toRaiseId(
          typeof rObj.raiseId === "string"
            ? rObj.raiseId
            : `RAISE-Y${idx + 2}`,
        ),
        effectiveSimulationMonth: toSimulationMonth(
          Number(rObj.effectiveSimulationMonth) || (idx + 1) * 12 + 1,
        ),
        effectiveCalendarMonth: toCalendarMonth(
          Number(rObj.effectiveCalendarMonth) || 1,
        ),
        effectiveCalendarYear: toFullCalendarYear(
          Number(rObj.effectiveCalendarYear) || startCalendarYear + idx + 1,
        ),
        targetPerson:
            typeof rObj.targetPerson === "string"
              ? toTargetPerson(rObj.targetPerson)
              : TargetPerson.Both,
        percentageIncrease: toPercentageRate(
          Math.min(1.0, Math.max(0, rawPct)),
        ),
        reason: typeof rObj.reason === "string" ? rObj.reason : "",
      };
    })
    : [];

  const customWorkingHoursChanges: readonly WorkingHoursChangeAction[] =
    Array.isArray(obj.customWorkingHoursChanges)
      ? obj.customWorkingHoursChanges.map((h, idx) => {
        const hObj = (h && typeof h === "object" ? h : {}) as Record<
          string,
          unknown
        >;
        return {
          changeId: toHoursChangeId(
            typeof hObj.changeId === "string"
              ? hObj.changeId
              : `HOURS-${idx + 1}`,
          ),
          effectiveSimulationMonth: toSimulationMonth(
            Number(hObj.effectiveSimulationMonth) || 1,
          ),
          effectiveCalendarMonth: toCalendarMonth(
            Number(hObj.effectiveCalendarMonth) || startCalendarMonth,
          ),
          effectiveCalendarYear: toFullCalendarYear(
            Number(hObj.effectiveCalendarYear) || startCalendarYear,
          ),
          targetPerson:
              typeof hObj.targetPerson === "string"
                ? toTargetPerson(hObj.targetPerson)
                : TargetPerson.Wife,
          weeklyHours: toWorkingHours(
            Number(hObj.weeklyHours) || wifePostBirthHours,
          ),
          reason: typeof hObj.reason === "string" ? hObj.reason : "",
        };
      })
      : [];

  const customFinancialEvents: readonly FinancialEventAction[] = Array.isArray(
    obj.customFinancialEvents,
  )
    ? obj.customFinancialEvents.map((e, idx) => {
      const eObj = (e && typeof e === "object" ? e : {}) as Record<
        string,
        unknown
      >;
      return {
        eventId: toFinancialEventId(
          typeof eObj.eventId === "string" ? eObj.eventId : `FIN-${idx + 1}`,
        ),
        effectiveSimulationMonth: toSimulationMonth(
          Number(eObj.effectiveSimulationMonth) || 1,
        ),
        effectiveCalendarMonth: toCalendarMonth(
          Number(eObj.effectiveCalendarMonth) || startCalendarMonth,
        ),
        effectiveCalendarYear: toFullCalendarYear(
          Number(eObj.effectiveCalendarYear) || startCalendarYear,
        ),
        title:
            typeof eObj.title === "string"
              ? eObj.title
              : `Custom Event #${idx + 1}`,
        amount: toEuroAmount(Number(eObj.amount) || 0),
        category:
            typeof eObj.category === "string"
              ? toFinancialEventCategory(eObj.category)
              : FinancialEventCategory.CustomSpecial,
        description:
            typeof eObj.description === "string" ? eObj.description : "",
      };
    })
    : [];

  return {
    salaryInputMode: salaryInputModeVal,
    salaryPeriod: salaryPeriodVal,
    husbandGross,
    wifeGross,
    husbandHours,
    husbandSalariesCount,
    husbandBonusDistribution,
    wifeInitialHours,
    wifePostBirthHours,
    wifeSalariesCount,
    wifeBonusDistribution,
    husbandClass3Net,
    husbandClass5Net,
    wifeClass5FullTimeNet,
    wifeClass3FullTimeNet,
    husbandInitialTaxClass,
    wifeInitialTaxClass,
    useInitialTaxFactor,
    annualBonusGross,
    annualBonusMonth,
    investmentReturnMonthly,
    kindergeldPerChild,
    enable13thSalary,
    bonus40Month,
    bonus60Month,
    taxReturnMonth,
    showSpecialEventRows,
    enableSalaryRaises,
    annualSalaryRaisePercent,
    startCalendarYear,
    startCalendarMonth,
    simulationDurationMonths,
    prePregnancyPlanningMonths,
    child1BirthMonth,
    birthSpacingMonths,
    swapLeadMonths,
    preMutterschutzMonths,
    postMutterschutzMonths,
    customPregnancies,
    customTaxClassSwitches,
    customSalaryRaises,
    customWorkingHoursChanges,
    customFinancialEvents,
    activeScenario: activeScenarioVal,
    chartMode: chartModeVal,
    timeRangeFilter: timeRangeFilterVal,
  };
}

// Detect optional untracked user scenario at compile-time (Vite / Astro bundler)
let userScenarioData: unknown | null = null;
try {
  const meta = import.meta as unknown as {
    glob?: (
      pattern: string,
      opts?: { eager: boolean },
    ) => Record<string, { default?: unknown }>;
  };
  if (typeof meta?.glob === "function") {
    const glob = meta.glob("../../data/userScenario.json", {
      eager: true,
    });
    const mod = Object.values(glob)[0];
    if (mod) {
      userScenarioData = mod.default ?? mod;
    }
  }
}
catch {
  // Gracefully fallback if glob is unsupported in current runtime
}

/**
 * Checks whether an optional unversioned userScenario.json is currently loaded.
 *
 * @returns True if a custom user scenario is detected; false otherwise.
 */
export function hasUserScenario(): boolean {
  return userScenarioData !== null;
}

/**
 * Sets or overrides the in-memory user scenario data dynamically.
 * Useful for runtime injection in CLI, Node scripts, or unit tests.
 *
 * @param data - Raw scenario object or null to clear override.
 */
export function setUserScenarioOverride(data: unknown | null): void {
  userScenarioData = data;
}

/**
 * Returns the parsed user scenario if present, or null if absent.
 *
 * @returns Sanitized `ElterngeldPersistedState` from userScenario.json, or null.
 */
export function getUserPersistedState(): ElterngeldPersistedState | null {
  if (!userScenarioData) {
    return null;
  }
  try {
    return parseRawScenarioData(userScenarioData);
  }
  catch {
    return null;
  }
}

/**
 * Returns the repository standard 3-children persisted simulation state parsed directly from standard_3_children.json.
 *
 * @returns Baseline `ElterngeldPersistedState` specification from standard_3_children.json.
 */
export function getDefaultScenarioPersistedState(): ElterngeldPersistedState {
  return parseRawScenarioData(standard3ChildrenData);
}

/**
 * Returns the effective default persisted simulation state.
 * Priority:
 *   1. Optional unversioned userScenario.local.json or userScenario.json (if present)
 *   2. Default empty base scenario (empty.json)
 *
 * @returns Effective baseline `ElterngeldPersistedState` specification.
 */
export function getDefaultPersistedState(): ElterngeldPersistedState {
  if (userScenarioData) {
    try {
      return parseRawScenarioData(userScenarioData);
    }
    catch {
      // Fall back to empty scenario if user scenario is malformed
    }
  }
  return parseRawScenarioData(emptyScenarioData);
}

/**
 * Returns the canonical 3-children lifecycle scenario simulation state parsed from standard_3_children.json.
 *
 * @returns Canonical 3-children `ElterngeldPersistedState` specification.
 */
export function getStandard3ChildrenPersistedState(): ElterngeldPersistedState {
  return parseRawScenarioData(standard3ChildrenData);
}


/**
 * Returns the canonical test scenario simulation state parsed directly from testScenario.json.
 * Used across the test suite for deterministic assertions decoupled from user default modifications.
 *
 * @returns Canonical testing `ElterngeldPersistedState` specification.
 */
export function getTestPersistedState(): ElterngeldPersistedState {
  return parseRawScenarioData(testScenarioData);
}

/**
 * Returns the canonical empty scenario simulation state parsed directly from empty.json.
 * Has zero custom pregnancies, tax class switches, salary raises, hours changes, or financial events.
 *
 * @returns Canonical empty `ElterngeldPersistedState` specification.
 */

export function getEmptyScenarioPersistedState(): ElterngeldPersistedState {
  return parseRawScenarioData(emptyScenarioData);
}

/**
 * Convenience alias for `getEmptyScenarioPersistedState()`.
 *
 * @returns Canonical empty `ElterngeldPersistedState` specification.
 */
export function getEmptyPersistedState(): ElterngeldPersistedState {
  return getEmptyScenarioPersistedState();
}

/**
 * Loads a built-in scenario by its catalog identifier or alias.
 *
 * @param identifier - Scenario ID (e.g., 'empty', 'standard_3_children', 'high_earner_household')
 * @returns Parsed and validated ElterngeldPersistedState, or undefined if not found.
 */
export function loadScenarioById(
  identifier: string,
): ElterngeldPersistedState | undefined {
  const item = findBuiltinScenario(identifier);
  if (item) {
    return parseRawScenarioData(item.data);
  }
  return undefined;
}



/**
 * Validates, bounds-checks, and sanitizes an arbitrary raw object into a complete, strongly-typed
 * `ElterngeldPersistedState`. Missing or out-of-bounds fields are gracefully substituted with defaults.
 *
 * @param raw - Arbitrary parsed JSON or storage payload.
 * @param fallback - Optional explicit fallback state (defaults to repository default state).
 * @param warnings - Optional array collecting non-fatal clamping or migration warnings.
 * @returns Fully validated and normalized `ElterngeldPersistedState`.
 */
export function validateAndSanitizePersistedState(
  raw: unknown,
  fallback?: ElterngeldPersistedState,
  warnings?: string[],
): ElterngeldPersistedState {
  const defaults = fallback ?? getDefaultPersistedState();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const root = raw as Record<string, unknown>;
  const obj =
    typeof root.simulationState === "object" && root.simulationState !== null
      ? (root.simulationState as Record<string, unknown>)
      : root;

  // Validate salaryInputMode const enum
  let salaryInputModeVal: SalaryInputMode = defaults.salaryInputMode;
  if (typeof obj.salaryInputMode === "string") {
    try {
      salaryInputModeVal = toSalaryInputMode(obj.salaryInputMode);
    }
    catch {
      salaryInputModeVal = defaults.salaryInputMode;
    }
  }

  // Validate salaryPeriod const enum
  let salaryPeriodVal: SalaryPeriod = defaults.salaryPeriod;
  if (typeof obj.salaryPeriod === "string") {
    try {
      salaryPeriodVal = toSalaryPeriod(obj.salaryPeriod);
    }
    catch {
      salaryPeriodVal = defaults.salaryPeriod;
    }
  }

  // Validate activeScenario const enum
  let activeScenarioVal: ActiveScenarioView = defaults.activeScenario;
  if (typeof obj.activeScenario === "string") {
    try {
      activeScenarioVal = toActiveScenarioView(obj.activeScenario);
    }
    catch {
      activeScenarioVal = defaults.activeScenario;
    }
  }

  // Validate chartMode const enum
  let chartModeVal: TimelineChartMode = defaults.chartMode;
  if (typeof obj.chartMode === "string") {
    try {
      chartModeVal = toTimelineChartMode(obj.chartMode);
    }
    catch {
      chartModeVal = defaults.chartMode;
    }
  }

  // Validate timeRangeFilter const enum
  let timeRangeFilterVal: TimelineTimeRangeFilter = defaults.timeRangeFilter;
  if (typeof obj.timeRangeFilter === "string") {
    try {
      timeRangeFilterVal = toTimelineTimeRangeFilter(obj.timeRangeFilter);
    }
    catch {
      timeRangeFilterVal = defaults.timeRangeFilter;
    }
  }

  const num = (
    v: unknown,
    def: number,
    min?: number,
    max?: number,
    fieldName?: string,
  ): number => {
    if (typeof v !== "number" || isNaN(v)) {
      if (typeof v === "string") {
        const parsed = parseFloat(v);
        if (!isNaN(parsed)) {
          if (min !== undefined && parsed < min) {
            if (warnings) {
              warnings.push(
                `${fieldName || "Field"} clamped from ${parsed} to [${min}, ${max}]`,
              );
            }
            return min;
          }
          if (max !== undefined && parsed > max) {
            if (warnings) {
              warnings.push(
                `${fieldName || "Field"} clamped from ${parsed} to [${min}, ${max}]`,
              );
            }
            return max;
          }
          return parsed;
        }
      }
      return def;
    }
    if (min !== undefined && v < min) {
      if (warnings) {
        warnings.push(
          `${fieldName || "Field"} clamped from ${v} to [${min}, ${max}]`,
        );
      }
      return min;
    }
    if (max !== undefined && v > max) {
      if (warnings) {
        warnings.push(
          `${fieldName || "Field"} clamped from ${v} to [${min}, ${max}]`,
        );
      }
      return max;
    }
    return v;
  };

  const bool = (v: unknown, def: boolean): boolean => {
    return typeof v === "boolean" ? v : def;
  };

  const str = (v: unknown, def: string): string => {
    return typeof v === "string" && v.trim() ? v : def;
  };

  // Validate Batch 1: Pregnancies Action Collection
  const pregnancies: readonly PregnancyAction[] = Array.isArray(
    obj.customPregnancies,
  )
    ? obj.customPregnancies.map((p, idx) => {
      const pObj = (p && typeof p === "object" ? p : {}) as Record<
        string,
        unknown
      >;
      const defP = defaults.customPregnancies[idx];
      return {
        pregnancyId: toPregnancyId(
          typeof pObj.pregnancyId === "string"
            ? pObj.pregnancyId
            : defP?.pregnancyId || `PREG-CHILD-${idx + 1}`,
        ),
        childIndex: toChildIndex(
          num(pObj.childIndex, defP?.childIndex ?? idx + 1, 1, 10),
        ),
        positiveTestCalendarMonth: toCalendarMonth(
          num(
            pObj.positiveTestCalendarMonth,
            defP?.positiveTestCalendarMonth ?? defaults.startCalendarMonth,
            1,
            12,
          ),
        ),
        positiveTestCalendarYear: toFullCalendarYear(
          num(
            pObj.positiveTestCalendarYear,
            defP?.positiveTestCalendarYear ?? defaults.startCalendarYear,
            1900,
            2100,
          ),
        ),
        positiveTestSimulationMonth: toSimulationMonth(
          num(
            pObj.positiveTestSimulationMonth,
            defP?.positiveTestSimulationMonth ?? 1,
            1,
            120,
          ),
        ),
        calculatedDeliverySimulationMonth: toSimulationMonth(
          num(
            pObj.calculatedDeliverySimulationMonth,
            defP?.calculatedDeliverySimulationMonth ??
                (defP?.positiveTestSimulationMonth
                  ? defP.positiveTestSimulationMonth + 8
                  : 9),
            1,
            120,
          ),
        ),
        motherPostBirthPartTimeHours: toWorkingHours(
          num(
            pObj.motherPostBirthPartTimeHours,
            defP?.motherPostBirthPartTimeHours ?? defaults.wifePostBirthHours,
            0,
            60,
          ),
        ),
        motherPostBirthPartTimeClass5Net: toNetSalary(
          num(
            pObj.motherPostBirthPartTimeClass5Net,
            defP?.motherPostBirthPartTimeClass5Net ?? 0,
            0,
            100000,
          ),
        ),
        motherPostBirthPartTimeClass3Net: toNetSalary(
          num(
            pObj.motherPostBirthPartTimeClass3Net,
            defP?.motherPostBirthPartTimeClass3Net ?? 0,
            0,
            100000,
          ),
        ),
        fatherPartnerMonthsCount: toMonthDuration(
          num(
            pObj.fatherPartnerMonthsCount,
            defP?.fatherPartnerMonthsCount ?? 0,
            0,
            14,
          ),
        ),
      };
    })
    : defaults.customPregnancies;

  // Validate Batch 2: Tax Class Switches Action Collection
  const taxSwitches: readonly TaxClassSwitchAction[] = Array.isArray(
    obj.customTaxClassSwitches,
  )
    ? obj.customTaxClassSwitches.map((s, idx) => {
      const sObj = (s && typeof s === "object" ? s : {}) as Record<
        string,
        unknown
      >;
      const defS = defaults.customTaxClassSwitches[idx];
      let targetH: TaxClass = defS?.targetHusbandTaxClass ?? TaxClass.V;
      if (typeof sObj.targetHusbandTaxClass === "string") {
        try {
          targetH = toTaxClass(sObj.targetHusbandTaxClass);
        }
        catch {
          targetH = defS?.targetHusbandTaxClass ?? TaxClass.V;
        }
      }
      let targetW: TaxClass = defS?.targetWifeTaxClass ?? TaxClass.III;
      if (typeof sObj.targetWifeTaxClass === "string") {
        try {
          targetW = toTaxClass(sObj.targetWifeTaxClass);
        }
        catch {
          targetW = defS?.targetWifeTaxClass ?? TaxClass.III;
        }
      }
      let revH: TaxClass | undefined = defS?.revertHusbandTaxClass;
      if (typeof sObj.revertHusbandTaxClass === "string") {
        try {
          revH = toTaxClass(sObj.revertHusbandTaxClass);
        }
        catch {
          revH = defS?.revertHusbandTaxClass;
        }
      }
      let revW: TaxClass | undefined = defS?.revertWifeTaxClass;
      if (typeof sObj.revertWifeTaxClass === "string") {
        try {
          revW = toTaxClass(sObj.revertWifeTaxClass);
        }
        catch {
          revW = defS?.revertWifeTaxClass;
        }
      }
      return {
        switchId: toSwitchId(
          typeof sObj.switchId === "string"
            ? sObj.switchId
            : defS?.switchId || `SWAP-CHILD-${idx + 1}`,
        ),
        effectiveSimulationMonth: toSimulationMonth(
          num(
            sObj.effectiveSimulationMonth,
            defS?.effectiveSimulationMonth ?? 1,
            1,
            120,
          ),
        ),
        effectiveCalendarMonth: toCalendarMonth(
          num(
            sObj.effectiveCalendarMonth,
            defS?.effectiveCalendarMonth ?? defaults.startCalendarMonth,
            1,
            12,
          ),
        ),
        effectiveCalendarYear: toFullCalendarYear(
          num(
            sObj.effectiveCalendarYear,
            defS?.effectiveCalendarYear ?? defaults.startCalendarYear,
            1900,
            2100,
          ),
        ),
        targetHusbandTaxClass: targetH,
        targetWifeTaxClass: targetW,
        targetUseTaxFactor:
            typeof sObj.targetUseTaxFactor === "boolean"
              ? sObj.targetUseTaxFactor
              : defS?.targetUseTaxFactor,
        targetTaxFactor:
            typeof sObj.targetTaxFactor === "number" &&
            sObj.targetTaxFactor > 0 &&
            sObj.targetTaxFactor <= 1
              ? toTaxFactor(sObj.targetTaxFactor)
              : defS?.targetTaxFactor,
        revertHusbandTaxClass: revH,
        revertWifeTaxClass: revW,
        revertUseTaxFactor:
            typeof sObj.revertUseTaxFactor === "boolean"
              ? sObj.revertUseTaxFactor
              : defS?.revertUseTaxFactor,
        statutoryReason: str(
          sObj.statutoryReason,
          defS?.statutoryReason ||
              "Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)",
        ),
        revertSimulationMonth:
            sObj.revertSimulationMonth !== undefined
              ? toSimulationMonth(
                num(
                  sObj.revertSimulationMonth,
                  defS?.revertSimulationMonth ??
                      defS?.effectiveSimulationMonth ??
                      1,
                  1,
                  120,
                ),
              )
              : defS?.revertSimulationMonth,
      };
    })
    : defaults.customTaxClassSwitches;

  // Validate Batch 3: Salary Raises Action Collection
  const salaryRaises: readonly SalaryRaiseAction[] = Array.isArray(
    obj.customSalaryRaises,
  )
    ? obj.customSalaryRaises.map((r, idx) => {
      const rObj = (r && typeof r === "object" ? r : {}) as Record<
        string,
        unknown
      >;
      const defR = defaults.customSalaryRaises[idx];
      let tp: TargetPerson = defR?.targetPerson ?? TargetPerson.Both;
      if (typeof rObj.targetPerson === "string") {
        try {
          tp = toTargetPerson(rObj.targetPerson);
        }
        catch {
          tp = defR?.targetPerson ?? TargetPerson.Both;
        }
      }
      let rawPct = num(
        rObj.percentageIncrease,
        defR?.percentageIncrease ?? 0,
        0,
        100,
      );
        // Normalize percentage: if entered as e.g. 5 or 3 (meaning 5% or 3%), convert to 0.05 or 0.03
      if (rawPct > 1) {
        rawPct = rawPct / 100;
      }
      rawPct = Math.min(1.0, Math.max(0, rawPct));

      return {
        raiseId: toRaiseId(
          typeof rObj.raiseId === "string"
            ? rObj.raiseId
            : defR?.raiseId || `RAISE-Y${idx + 2}`,
        ),
        effectiveSimulationMonth: toSimulationMonth(
          num(
            rObj.effectiveSimulationMonth,
            defR?.effectiveSimulationMonth ?? (idx + 1) * 12 + 1,
            1,
            120,
          ),
        ),
        effectiveCalendarMonth: toCalendarMonth(
          num(
            rObj.effectiveCalendarMonth,
            defR?.effectiveCalendarMonth ?? 1,
            1,
            12,
          ),
        ),
        effectiveCalendarYear: toFullCalendarYear(
          num(
            rObj.effectiveCalendarYear,
            defR?.effectiveCalendarYear ??
                defaults.startCalendarYear + idx + 1,
            1900,
            2100,
          ),
        ),
        targetPerson: tp,
        percentageIncrease: toPercentageRate(rawPct),
        reason: str(
          rObj.reason,
          defR?.reason || "Annual Merit / Tariff Raise",
        ),
      };
    })
    : defaults.customSalaryRaises;

  // Validate Batch 3: Working Hours Changes Action Collection
  const workingHoursChanges: readonly WorkingHoursChangeAction[] =
    Array.isArray(obj.customWorkingHoursChanges)
      ? obj.customWorkingHoursChanges.map((h, idx) => {
        const hObj = (h && typeof h === "object" ? h : {}) as Record<
          string,
          unknown
        >;
        const defH = defaults.customWorkingHoursChanges?.[idx];
        let tp: TargetPerson = defH?.targetPerson ?? TargetPerson.Wife;
        if (typeof hObj.targetPerson === "string") {
          try {
            tp = toTargetPerson(hObj.targetPerson);
          }
          catch {
            tp = defH?.targetPerson ?? TargetPerson.Wife;
          }
        }
        return {
          changeId: toHoursChangeId(
            typeof hObj.changeId === "string" && hObj.changeId.length > 0
              ? hObj.changeId
              : defH?.changeId || `HOURS-CHANGE-${idx + 1}`,
          ),
          effectiveSimulationMonth: toSimulationMonth(
            num(
              hObj.effectiveSimulationMonth,
              defH?.effectiveSimulationMonth ?? 1,
              1,
              120,
            ),
          ),
          effectiveCalendarMonth: toCalendarMonth(
            num(
              hObj.effectiveCalendarMonth,
              defH?.effectiveCalendarMonth ?? defaults.startCalendarMonth,
              1,
              12,
            ),
          ),
          effectiveCalendarYear: toFullCalendarYear(
            num(
              hObj.effectiveCalendarYear,
              defH?.effectiveCalendarYear ?? defaults.startCalendarYear,
              1900,
              2100,
            ),
          ),
          targetPerson: tp,
          weeklyHours: toWorkingHours(
            num(
              hObj.weeklyHours,
              defH?.weeklyHours ?? defaults.wifePostBirthHours,
              0,
              60,
            ),
          ),
          reason: str(hObj.reason, defH?.reason || "Schedule adjustment"),
        };
      })
      : defaults.customWorkingHoursChanges || [];

  // Validate Batch 4: Financial Events Action Collection
  const financialEvents: readonly FinancialEventAction[] = Array.isArray(
    obj.customFinancialEvents,
  )
    ? obj.customFinancialEvents.map((e, idx) => {
      const eObj = (e && typeof e === "object" ? e : {}) as Record<
        string,
        unknown
      >;
      const defE = defaults.customFinancialEvents[idx];
      let cat: FinancialEventCategory =
        defE?.category ?? FinancialEventCategory.CustomSpecial;
      if (typeof eObj.category === "string") {
        try {
          cat = toFinancialEventCategory(eObj.category);
        }
        catch {
          cat = defE?.category ?? FinancialEventCategory.CustomSpecial;
        }
      }
      return {
        eventId: toFinancialEventId(
          typeof eObj.eventId === "string"
            ? eObj.eventId
            : defE?.eventId || `FIN-EVENT-${idx + 1}`,
        ),
        effectiveSimulationMonth: toSimulationMonth(
          num(
            eObj.effectiveSimulationMonth,
            defE?.effectiveSimulationMonth ?? 1,
            1,
            120,
          ),
        ),
        effectiveCalendarMonth: toCalendarMonth(
          num(
            eObj.effectiveCalendarMonth,
            defE?.effectiveCalendarMonth ?? defaults.startCalendarMonth,
            1,
            12,
          ),
        ),
        effectiveCalendarYear: toFullCalendarYear(
          num(
            eObj.effectiveCalendarYear,
            defE?.effectiveCalendarYear ?? defaults.startCalendarYear,
            1900,
            2100,
          ),
        ),
        title: str(eObj.title, defE?.title || `Custom Event #${idx + 1}`),
        amount: toEuroAmount(num(eObj.amount, defE?.amount ?? 0)),
        category: cat,
        description: str(eObj.description, defE?.description || ""),
      };
    })
    : defaults.customFinancialEvents;

  return {
    salaryInputMode: salaryInputModeVal,
    salaryPeriod: salaryPeriodVal,
    husbandGross: toGrossSalary(
      num(obj.husbandGross, defaults.husbandGross, 0, 1000000, "husbandGross"),
    ),
    wifeGross: toGrossSalary(
      num(obj.wifeGross, defaults.wifeGross, 0, 1000000, "wifeGross"),
    ),
    husbandHours: toWorkingHours(
      num(obj.husbandHours, defaults.husbandHours, 0, 60, "husbandHours"),
    ),
    husbandSalariesCount:
      obj.husbandSalariesCount !== undefined
        ? (() => {
          try {
            return toAnnualSalariesCount(
              obj.husbandSalariesCount as number | string,
            );
          }
          catch {
            return defaults.husbandSalariesCount ?? AnnualSalariesCount.Twelve;
          }
        })()
        : obj.enable13thSalary
          ? AnnualSalariesCount.Thirteen
          : defaults.husbandSalariesCount ?? AnnualSalariesCount.Twelve,
    husbandBonusDistribution: Array.isArray(obj.husbandBonusDistribution)
      ? (obj.husbandBonusDistribution as Array<Record<string, unknown>>).map(
        (slot) => ({
          calendarMonth: toCalendarMonth(Number(slot.calendarMonth) || 1),
          payoutFraction: toPercentageRate(Number(slot.payoutFraction) || 0),
          label: typeof slot.label === "string" ? slot.label : undefined,
        }),
      )
      : defaults.husbandBonusDistribution ?? [],
    wifeInitialHours: toWorkingHours(
      num(
        obj.wifeInitialHours,
        defaults.wifeInitialHours,
        0,
        60,
        "wifeInitialHours",
      ),
    ),
    wifePostBirthHours: toWorkingHours(
      num(
        obj.wifePostBirthHours,
        defaults.wifePostBirthHours,
        0,
        60,
        "wifePostBirthHours",
      ),
    ),
    wifeSalariesCount:
      obj.wifeSalariesCount !== undefined
        ? (() => {
          try {
            return toAnnualSalariesCount(
              obj.wifeSalariesCount as number | string,
            );
          }
          catch {
            return defaults.wifeSalariesCount ?? AnnualSalariesCount.Twelve;
          }
        })()
        : defaults.wifeSalariesCount ?? AnnualSalariesCount.Twelve,
    wifeBonusDistribution: Array.isArray(obj.wifeBonusDistribution)
      ? (obj.wifeBonusDistribution as Array<Record<string, unknown>>).map(
        (slot) => ({
          calendarMonth: toCalendarMonth(Number(slot.calendarMonth) || 1),
          payoutFraction: toPercentageRate(Number(slot.payoutFraction) || 0),
          label: typeof slot.label === "string" ? slot.label : undefined,
        }),
      )
      : defaults.wifeBonusDistribution ?? [],
    husbandClass3Net: toNetSalary(
      num(
        obj.husbandClass3Net,
        defaults.husbandClass3Net,
        0,
        100000,
        "husbandClass3Net",
      ),
    ),
    husbandClass5Net: toNetSalary(
      num(
        obj.husbandClass5Net,
        defaults.husbandClass5Net,
        0,
        100000,
        "husbandClass5Net",
      ),
    ),
    wifeClass5FullTimeNet: toNetSalary(
      num(
        obj.wifeClass5FullTimeNet,
        defaults.wifeClass5FullTimeNet,
        0,
        100000,
        "wifeClass5FullTimeNet",
      ),
    ),
    wifeClass3FullTimeNet: toNetSalary(
      num(
        obj.wifeClass3FullTimeNet,
        defaults.wifeClass3FullTimeNet,
        0,
        100000,
        "wifeClass3FullTimeNet",
      ),
    ),
    husbandInitialTaxClass:
      typeof obj.husbandInitialTaxClass === "string"
        ? (() => {
          try {
            return toTaxClass(obj.husbandInitialTaxClass);
          }
          catch {
            return defaults.husbandInitialTaxClass;
          }
        })()
        : defaults.husbandInitialTaxClass,
    wifeInitialTaxClass:
      typeof obj.wifeInitialTaxClass === "string"
        ? (() => {
          try {
            return toTaxClass(obj.wifeInitialTaxClass);
          }
          catch {
            return defaults.wifeInitialTaxClass;
          }
        })()
        : defaults.wifeInitialTaxClass,
    useInitialTaxFactor: bool(
      obj.useInitialTaxFactor,
      defaults.useInitialTaxFactor ?? false,
    ),

    annualBonusGross: toGrossSalary(
      num(
        obj.annualBonusGross,
        defaults.annualBonusGross,
        0,
        1000000,
        "annualBonusGross",
      ),
    ),
    annualBonusMonth: toCalendarMonth(
      num(
        obj.annualBonusMonth,
        defaults.annualBonusMonth,
        1,
        12,
        "annualBonusMonth",
      ),
    ),
    investmentReturnMonthly: toEuroAmount(
      num(
        obj.investmentReturnMonthly,
        defaults.investmentReturnMonthly,
        0,
        1000000,
        "investmentReturnMonthly",
      ),
    ),

    kindergeldPerChild: toEuroAmount(
      num(
        obj.kindergeldPerChild,
        defaults.kindergeldPerChild,
        0,
        10000,
        "kindergeldPerChild",
      ),
    ),
    enable13thSalary: bool(obj.enable13thSalary, defaults.enable13thSalary),
    bonus40Month: toCalendarMonth(
      num(obj.bonus40Month, defaults.bonus40Month, 1, 12, "bonus40Month"),
    ),
    bonus60Month: toCalendarMonth(
      num(obj.bonus60Month, defaults.bonus60Month, 1, 12, "bonus60Month"),
    ),
    taxReturnMonth: toCalendarMonth(
      num(obj.taxReturnMonth, defaults.taxReturnMonth, 1, 12, "taxReturnMonth"),
    ),
    showSpecialEventRows: bool(
      obj.showSpecialEventRows,
      defaults.showSpecialEventRows,
    ),
    enableSalaryRaises: bool(
      obj.enableSalaryRaises,
      defaults.enableSalaryRaises,
    ),
    annualSalaryRaisePercent: num(
      obj.annualSalaryRaisePercent,
      defaults.annualSalaryRaisePercent,
      0,
      100,
    ),

    startCalendarYear: toFullCalendarYear(
      num(obj.startCalendarYear, defaults.startCalendarYear, 1900, 2100),
    ),
    startCalendarMonth: toCalendarMonth(
      num(obj.startCalendarMonth, defaults.startCalendarMonth, 1, 12),
    ),
    simulationDurationMonths: toMonthDuration(
      num(
        obj.simulationDurationMonths,
        defaults.simulationDurationMonths,
        12,
        120,
      ),
    ),
    prePregnancyPlanningMonths: toMonthDuration(
      num(
        obj.prePregnancyPlanningMonths,
        defaults.prePregnancyPlanningMonths,
        0,
        36,
      ),
    ),
    child1BirthMonth: toSimulationMonth(
      num(obj.child1BirthMonth, defaults.child1BirthMonth, 1, 120),
    ),
    birthSpacingMonths: toMonthDuration(
      num(obj.birthSpacingMonths, defaults.birthSpacingMonths, 6, 60),
    ),
    swapLeadMonths: toMonthDuration(
      num(obj.swapLeadMonths, defaults.swapLeadMonths, 1, 18),
    ),
    preMutterschutzMonths: toMonthDuration(
      num(obj.preMutterschutzMonths, defaults.preMutterschutzMonths, 0, 6),
    ),
    postMutterschutzMonths: toMonthDuration(
      num(obj.postMutterschutzMonths, defaults.postMutterschutzMonths, 0, 6),
    ),

    customPregnancies: pregnancies,
    customTaxClassSwitches: taxSwitches,
    customSalaryRaises: salaryRaises,
    customWorkingHoursChanges: workingHoursChanges,
    customFinancialEvents: financialEvents,

    activeScenario: activeScenarioVal,
    chartMode: chartModeVal,
    timeRangeFilter: timeRangeFilterVal,
  };
}

/**
 * Serializes a strongly-typed `ElterngeldPersistedState` into a formatted JSON string.
 *
 * @param state - Complete persisted simulator state.
 * @returns JSON string representation.
 */
export function serializeState(state: ElterngeldPersistedState): string {
  return JSON.stringify(state);
}

/**
 * Deserializes and validates a JSON string into an `ElterngeldPersistedState`,
 * falling back to default values if parsing fails.
 *
 * @param jsonStr - Raw JSON string.
 * @returns Validated `ElterngeldPersistedState`.
 */
export function deserializeState(
  jsonStr: string,
  fallback?: ElterngeldPersistedState,
): ElterngeldPersistedState {
  try {
    const raw = JSON.parse(jsonStr);
    return validateAndSanitizePersistedState(raw, fallback);
  }
  catch {
    return fallback ?? getDefaultPersistedState();
  }
}

/**
 * Saves simulator state directly into browser `localStorage`.
 *
 * @param state - Complete simulator state to persist.
 * @param key - Storage key (defaults to `ELTERNGELD_STORAGE_KEY`).
 * @returns True if successfully persisted; false if storage is unavailable or quota exceeded.
 */
export function saveToStorage(
  state: ElterngeldPersistedState,
  key: string = ELTERNGELD_STORAGE_KEY,
): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return false;
  }
  try {
    const serialized = serializeState(state);
    localStorage.setItem(key, serialized);
    return true;
  }
  catch {
    return false;
  }
}

/**
 * Loads and validates simulator state from browser `localStorage`, falling back to statutory defaults.
 *
 * @param key - Storage key (defaults to `ELTERNGELD_STORAGE_KEY`).
 * @returns Validated `ElterngeldPersistedState`.
 */
export function loadFromStorage(
  key: string = ELTERNGELD_STORAGE_KEY,
): ElterngeldPersistedState {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return getDefaultPersistedState();
  }
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return getDefaultPersistedState();
    }
    return deserializeState(item);
  }
  catch {
    return getDefaultPersistedState();
  }
}

/**
 * Removes persisted simulator state from browser `localStorage`.
 *
 * @param key - Storage key to purge (defaults to `ELTERNGELD_STORAGE_KEY`).
 * @returns True if successfully removed.
 */
export function clearStorage(key: string = ELTERNGELD_STORAGE_KEY): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return false;
  }
  try {
    localStorage.removeItem(key);
    return true;
  }
  catch {
    return false;
  }
}
