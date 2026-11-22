/**
 * Elterngeld Domain Adapter for the Abstract `<TimeSeriesChart />` Component
 *
 * Translates Elterngeld `MonthlyLedgerEntry` (`TimelineMonth`) records and `TimelineChartMode`
 * enums onto the domain-agnostic `timeSeriesChartEngine` mathematical kernel.
 * Decomposes monthly cash flows into 12 mutually exclusive, transparent sources so
 * bonuses, investment returns, daycare fees, one-off grants, and one-off expenses
 * are never conflated into a single ambiguous bucket.
 */

import {
  type ChartYAxisScale,
  TimeSeriesChartMode,
  computeChartYAxisScale,
  computeClampedTooltipLeftPx,
  computePointSeriesTotals,
  computeStackedBarSegments as computeGenericStackedBarSegments,
  mapClientXToSlotIndex,
  valueToPlotY,
} from "#/components/ui/timeSeriesChartEngine.ts";
import {
  type TimeSeriesChartPoint,
} from "#/components/ui/timeSeriesChartCore.ts";
import {
  type EuroAmount,
  type SpecialEventItem,
  type TimelineMonth,
  SpecialEventCategory,
  SpecialEventType,
  TimelineChartMode,
  toEuroAmount,
} from "#engine/types";

export {
  type ChartYAxisScale,
  computeChartYAxisScale,
  valueToPlotY,
};

/**
 * Strongly-typed categorical series keys for the Elterngeld monthly cashflow timeline chart (Rule 11).
 * Ordered bottom-to-top in stacked bar & stacked area visual layers.
 */
export const TimelineChartSeriesKey = {
  HusbandSalary: "husbandSalary",
  WifeSalary: "wifeSalary",
  Mutterschutz: "mutterschutz",
  WifeElterngeld: "wifeElterngeld",
  HusbandElterngeld: "husbandElterngeld",
  Kindergeld: "kindergeld",
  SalaryBonuses: "salaryBonuses",
  InvestmentReturns: "investmentReturns",
  CustomIncome: "customIncome",
  TaxRefund: "taxRefund",
  DaycareFees: "daycareFees",
  CustomCosts: "customCosts",
} as const;
export type TimelineChartSeriesKey =
  (typeof TimelineChartSeriesKey)[keyof typeof TimelineChartSeriesKey];

const TIMELINE_CHART_SERIES_KEY_SET: ReadonlySet<string> = new Set<string>(
  Object.values(TimelineChartSeriesKey),
);

/** Runtime type guard validating a `TimelineChartSeriesKey`. */
export function isTimelineChartSeriesKey(
  value: string,
): value is TimelineChartSeriesKey {
  return TIMELINE_CHART_SERIES_KEY_SET.has(value);
}

/** Validated runtime constructor for `TimelineChartSeriesKey` (Rule 11). */
export function toTimelineChartSeriesKey(
  value: string,
): TimelineChartSeriesKey {
  if (!isTimelineChartSeriesKey(value)) {
    throw new TypeError(
      `Invalid TimelineChartSeriesKey: "${value}". Expected one of: ${Object.values(TimelineChartSeriesKey).join(", ")}.`,
    );
  }
  return value;
}

/** Canonical bottom-to-top stack order for Elterngeld stacked bar & stacked area charts. */
export const TIMELINE_CHART_SERIES_ORDER: readonly TimelineChartSeriesKey[] =
  Object.freeze([
    TimelineChartSeriesKey.HusbandSalary,
    TimelineChartSeriesKey.WifeSalary,
    TimelineChartSeriesKey.Mutterschutz,
    TimelineChartSeriesKey.WifeElterngeld,
    TimelineChartSeriesKey.HusbandElterngeld,
    TimelineChartSeriesKey.Kindergeld,
    TimelineChartSeriesKey.SalaryBonuses,
    TimelineChartSeriesKey.InvestmentReturns,
    TimelineChartSeriesKey.CustomIncome,
    TimelineChartSeriesKey.TaxRefund,
    TimelineChartSeriesKey.DaycareFees,
    TimelineChartSeriesKey.CustomCosts,
  ]);

/** Core series always displayed in the Elterngeld chart legend. */
const CORE_TIMELINE_SERIES_KEYS: ReadonlySet<TimelineChartSeriesKey> = new Set([
  TimelineChartSeriesKey.HusbandSalary,
  TimelineChartSeriesKey.WifeSalary,
  TimelineChartSeriesKey.Mutterschutz,
  TimelineChartSeriesKey.WifeElterngeld,
  TimelineChartSeriesKey.HusbandElterngeld,
  TimelineChartSeriesKey.Kindergeld,
  TimelineChartSeriesKey.TaxRefund,
]);

/** Visibility map keyed by `TimelineChartSeriesKey`. */
export type TimelineChartVisibilityMap = Readonly<Record<TimelineChartSeriesKey, boolean>>;

/** Creates a uniform all-on or all-off Elterngeld series visibility map. */
export function createUniformSeriesVisibility(
  visible: boolean,
): Record<TimelineChartSeriesKey, boolean> {
  return {
    [TimelineChartSeriesKey.HusbandSalary]: visible,
    [TimelineChartSeriesKey.WifeSalary]: visible,
    [TimelineChartSeriesKey.Mutterschutz]: visible,
    [TimelineChartSeriesKey.WifeElterngeld]: visible,
    [TimelineChartSeriesKey.HusbandElterngeld]: visible,
    [TimelineChartSeriesKey.Kindergeld]: visible,
    [TimelineChartSeriesKey.SalaryBonuses]: visible,
    [TimelineChartSeriesKey.InvestmentReturns]: visible,
    [TimelineChartSeriesKey.CustomIncome]: visible,
    [TimelineChartSeriesKey.TaxRefund]: visible,
    [TimelineChartSeriesKey.DaycareFees]: visible,
    [TimelineChartSeriesKey.CustomCosts]: visible,
  };
}

/** Maps Elterngeld `TimelineChartMode` onto abstract `TimeSeriesChartMode`. */
export function mapTimelineModeToAbstractMode(
  mode: TimelineChartMode,
): TimeSeriesChartMode {
  switch (mode) {
    case TimelineChartMode.StackedBar:
      return TimeSeriesChartMode.StackedBar;
    case TimelineChartMode.Lines:
      return TimeSeriesChartMode.Lines;
    case TimelineChartMode.Area:
      return TimeSeriesChartMode.Area;
    case TimelineChartMode.Compare:
      return TimeSeriesChartMode.Overlay;
  }
}

/** Maps abstract `TimeSeriesChartMode` back to Elterngeld `TimelineChartMode`. */
export function mapAbstractModeToTimelineMode(
  mode: TimeSeriesChartMode,
): TimelineChartMode {
  switch (mode) {
    case TimeSeriesChartMode.StackedBar:
      return TimelineChartMode.StackedBar;
    case TimeSeriesChartMode.Lines:
      return TimelineChartMode.Lines;
    case TimeSeriesChartMode.Area:
      return TimelineChartMode.Area;
    case TimeSeriesChartMode.Overlay:
      return TimelineChartMode.Compare;
  }
}

/**
 * Classifies a non-tax `SpecialEventItem` into its exact mutually exclusive chart series bucket.
 * Returns `null` for annual tax settlements (`SpecialEventType.TaxReturn`), which are tracked
 * directly via `TimelineChartSeriesKey.TaxRefund`.
 */
export function classifySpecialEventSeriesKey(
  event: SpecialEventItem,
): TimelineChartSeriesKey | null {
  if (event.type === SpecialEventType.TaxReturn || event.amount === 0) {
    return null;
  }
  if (
    event.type === SpecialEventType.Bonus40 ||
    event.type === SpecialEventType.Bonus60 ||
    event.category === SpecialEventCategory.ThirteenthSalary ||
    event.category === SpecialEventCategory.FourteenthSalary ||
    event.category === SpecialEventCategory.FifteenthSalary ||
    event.category === SpecialEventCategory.SalaryBonus ||
    (event.category === SpecialEventCategory.CareerBonus && event.amount > 0)
  ) {
    return TimelineChartSeriesKey.SalaryBonuses;
  }
  if (event.category === SpecialEventCategory.InvestmentReturn && event.amount > 0) {
    return TimelineChartSeriesKey.InvestmentReturns;
  }
  if (event.category === SpecialEventCategory.ChildcareFees && event.amount < 0) {
    return TimelineChartSeriesKey.DaycareFees;
  }
  return event.amount > 0
    ? TimelineChartSeriesKey.CustomIncome
    : TimelineChartSeriesKey.CustomCosts;
}

export interface MonthSpecialEventBreakdown {
  readonly salaryBonuses: EuroAmount;
  readonly investmentReturns: EuroAmount;
  readonly customIncome: EuroAmount;
  readonly daycareFees: EuroAmount;
  readonly customCosts: EuroAmount;
}

/**
 * Decomposes all non-tax special events of a ledger month into 5 mutually exclusive buckets.
 * Always satisfies:
 * `salaryBonuses + investmentReturns + customIncome + daycareFees + customCosts + taxRefund === specialEventsTotal`.
 */
export function decomposeMonthSpecialEvents(
  month: TimelineMonth,
): MonthSpecialEventBreakdown {
  let salaryBonuses = 0;
  let investmentReturns = 0;
  let customIncome = 0;
  let daycareFees = 0;
  let customCosts = 0;

  if (month.specialEvents.length > 0) {
    for (const event of month.specialEvents) {
      const bucket = classifySpecialEventSeriesKey(event);
      if (bucket === TimelineChartSeriesKey.SalaryBonuses) {
        salaryBonuses += event.amount;
      }
      else if (bucket === TimelineChartSeriesKey.InvestmentReturns) {
        investmentReturns += event.amount;
      }
      else if (bucket === TimelineChartSeriesKey.CustomIncome) {
        customIncome += event.amount;
      }
      else if (bucket === TimelineChartSeriesKey.DaycareFees) {
        daycareFees += event.amount;
      }
      else if (bucket === TimelineChartSeriesKey.CustomCosts) {
        customCosts += event.amount;
      }
    }
  }
  else {
    salaryBonuses = month.specialBonusTotal;
    const residual = month.specialEventsTotal - month.taxRefund - salaryBonuses;
    if (residual > 0) {
      customIncome = residual;
    }
    else if (residual < 0) {
      customCosts = residual;
    }
  }

  return Object.freeze({
    salaryBonuses: toEuroAmount(salaryBonuses),
    investmentReturns: toEuroAmount(investmentReturns),
    customIncome: toEuroAmount(customIncome),
    daycareFees: toEuroAmount(daycareFees),
    customCosts: toEuroAmount(customCosts),
  });
}

/**
 * Extracts the exact signed EUR amount for a single series key from a ledger month.
 * Across all 12 keys, the sum equals `month.monthlyTotal` to the exact cent.
 */
export function getMonthSeriesValue(
  month: TimelineMonth,
  key: TimelineChartSeriesKey,
): EuroAmount {
  switch (key) {
    case TimelineChartSeriesKey.HusbandSalary:
      return month.husbandSalary;
    case TimelineChartSeriesKey.WifeSalary:
      return month.wifeSalary;
    case TimelineChartSeriesKey.Mutterschutz:
      return month.mutterschutz;
    case TimelineChartSeriesKey.WifeElterngeld:
      return month.wifeElterngeld;
    case TimelineChartSeriesKey.HusbandElterngeld:
      return month.husbandElterngeld;
    case TimelineChartSeriesKey.Kindergeld:
      return month.kindergeld;
    case TimelineChartSeriesKey.SalaryBonuses:
      return decomposeMonthSpecialEvents(month).salaryBonuses;
    case TimelineChartSeriesKey.InvestmentReturns:
      return decomposeMonthSpecialEvents(month).investmentReturns;
    case TimelineChartSeriesKey.CustomIncome:
      return decomposeMonthSpecialEvents(month).customIncome;
    case TimelineChartSeriesKey.TaxRefund:
      return month.taxRefund;
    case TimelineChartSeriesKey.DaycareFees:
      return decomposeMonthSpecialEvents(month).daycareFees;
    case TimelineChartSeriesKey.CustomCosts:
      return decomposeMonthSpecialEvents(month).customCosts;
  }
}

/**
 * Returns the canonical ordered subset of series keys to display in the legend:
 * always includes the 7 core income/benefit/tax series plus any granular bonus/event
 * series that actually carries a non-zero value in at least one displayed month.
 */
export function getActiveTimelineSeriesKeys(
  months: readonly TimelineMonth[],
): readonly TimelineChartSeriesKey[] {
  const nonZeroOptional = new Set<TimelineChartSeriesKey>();
  for (const month of months) {
    const breakdown = decomposeMonthSpecialEvents(month);
    if (breakdown.salaryBonuses !== 0) {
      nonZeroOptional.add(TimelineChartSeriesKey.SalaryBonuses);
    }
    if (breakdown.investmentReturns !== 0) {
      nonZeroOptional.add(TimelineChartSeriesKey.InvestmentReturns);
    }
    if (breakdown.customIncome !== 0) {
      nonZeroOptional.add(TimelineChartSeriesKey.CustomIncome);
    }
    if (breakdown.daycareFees !== 0) {
      nonZeroOptional.add(TimelineChartSeriesKey.DaycareFees);
    }
    if (breakdown.customCosts !== 0) {
      nonZeroOptional.add(TimelineChartSeriesKey.CustomCosts);
    }
  }
  return Object.freeze(
    TIMELINE_CHART_SERIES_ORDER.filter(
      (key) => CORE_TIMELINE_SERIES_KEYS.has(key) || nonZeroOptional.has(key),
    ),
  );
}

/** Formats a compact non-overlapping X-axis month label (e.g. `M1`, `M9`, `M-3`). */
export function formatCompactXAxisLabel(month: TimelineMonth): string {
  const raw = month.relativeMonthLabel || month.relativeBirthLabel || `M${month.month}`;
  const parenIndex = raw.indexOf(" (");
  return parenIndex > 0 ? raw.slice(0, parenIndex) : raw;
}

/** Maps an Elterngeld `TimelineMonth` into a domain-agnostic `TimeSeriesChartPoint`. */
export function mapTimelineMonthToChartPoint(
  month: TimelineMonth,
): TimeSeriesChartPoint<TimelineChartSeriesKey, TimelineMonth> {
  const breakdown = decomposeMonthSpecialEvents(month);
  return Object.freeze({
    id: month.monthId,
    order: month.month,
    xLabel: formatCompactXAxisLabel(month),
    xSubLabel: month.calendarLabel,
    groupSeparatorLabel:
      month.calendarMonthNum === 1 ? String(month.calendarYearNum) : undefined,
    values: Object.freeze({
      [TimelineChartSeriesKey.HusbandSalary]: month.husbandSalary,
      [TimelineChartSeriesKey.WifeSalary]: month.wifeSalary,
      [TimelineChartSeriesKey.Mutterschutz]: month.mutterschutz,
      [TimelineChartSeriesKey.WifeElterngeld]: month.wifeElterngeld,
      [TimelineChartSeriesKey.HusbandElterngeld]: month.husbandElterngeld,
      [TimelineChartSeriesKey.Kindergeld]: month.kindergeld,
      [TimelineChartSeriesKey.SalaryBonuses]: breakdown.salaryBonuses,
      [TimelineChartSeriesKey.InvestmentReturns]: breakdown.investmentReturns,
      [TimelineChartSeriesKey.CustomIncome]: breakdown.customIncome,
      [TimelineChartSeriesKey.TaxRefund]: month.taxRefund,
      [TimelineChartSeriesKey.DaycareFees]: breakdown.daycareFees,
      [TimelineChartSeriesKey.CustomCosts]: breakdown.customCosts,
    }),
    meta: month,
  });
}

export interface MonthActiveSeriesTotals {
  readonly netTotal: EuroAmount;
  readonly positiveTotal: EuroAmount;
  readonly negativeTotal: EuroAmount;
}

/** Computes exact net, positive-stack, and negative-stack totals across currently visible series. */
export function getMonthActiveSeriesTotals(
  month: TimelineMonth,
  visibility: TimelineChartVisibilityMap,
): MonthActiveSeriesTotals {
  const point = mapTimelineMonthToChartPoint(month);
  const totals = computePointSeriesTotals(
    point,
    TIMELINE_CHART_SERIES_ORDER,
    visibility,
  );
  return Object.freeze({
    netTotal: toEuroAmount(totals.netTotal),
    positiveTotal: toEuroAmount(totals.positiveTotal),
    negativeTotal: toEuroAmount(totals.negativeTotal),
  });
}

export interface StackedBarSegment {
  readonly key: TimelineChartSeriesKey;
  readonly value: EuroAmount;
  readonly y: number;
  readonly height: number;
  readonly stackStart: EuroAmount;
  readonly stackEnd: EuroAmount;
}

/** Delegates Elterngeld stacked bar geometry directly to the abstract `timeSeriesChartEngine`. */
export function computeStackedBarSegments(
  month: TimelineMonth,
  visibility: TimelineChartVisibilityMap,
  yMin: number,
  yMax: number,
  plotHeight: number,
  marginTop: number,
): readonly StackedBarSegment[] {
  const point = mapTimelineMonthToChartPoint(month);
  return computeGenericStackedBarSegments(
    point,
    TIMELINE_CHART_SERIES_ORDER,
    visibility,
    yMin,
    yMax,
    plotHeight,
    marginTop,
  ).map((seg) =>
    Object.freeze({
      key: seg.key,
      value: toEuroAmount(seg.value),
      y: seg.y,
      height: seg.height,
      stackStart: toEuroAmount(seg.stackStart),
      stackEnd: toEuroAmount(seg.stackEnd),
    }));
}

export interface ClientXToBarIndexInputs {
  readonly clientX: number;
  readonly svgRectLeft: number;
  readonly svgRectWidth: number;
  readonly svgViewBoxWidth: number;
  readonly marginLeft: number;
  readonly plotWidth: number;
  readonly barCount: number;
}

/** Delegates pointer-to-bar hit-testing to the abstract `timeSeriesChartEngine`. */
export function mapClientXToBarIndex(
  inputs: Readonly<ClientXToBarIndexInputs>,
): number | null {
  return mapClientXToSlotIndex({
    clientX: inputs.clientX,
    svgRectLeft: inputs.svgRectLeft,
    svgRectWidth: inputs.svgRectWidth,
    svgViewBoxWidth: inputs.svgViewBoxWidth,
    marginLeft: inputs.marginLeft,
    plotWidth: inputs.plotWidth,
    slotCount: inputs.barCount,
  });
}

export interface TooltipPositionInputs {
  readonly barCenterSvgX: number;
  readonly svgViewBoxWidth: number;
  readonly svgRectLeft: number;
  readonly svgRectWidth: number;
  readonly containerRectLeft: number;
  readonly containerWidth: number;
  readonly containerScrollLeft: number;
  readonly tooltipWidth: number;
  readonly offsetPx?: number;
}

/** Delegates scroll- and viewport-clamped tooltip positioning to the abstract `timeSeriesChartEngine`. */
export function computeTooltipLeftPx(
  inputs: Readonly<TooltipPositionInputs>,
): number {
  return computeClampedTooltipLeftPx({
    slotCenterSvgX: inputs.barCenterSvgX,
    svgViewBoxWidth: inputs.svgViewBoxWidth,
    svgRectLeft: inputs.svgRectLeft,
    svgRectWidth: inputs.svgRectWidth,
    containerRectLeft: inputs.containerRectLeft,
    containerWidth: inputs.containerWidth,
    containerScrollLeft: inputs.containerScrollLeft,
    tooltipWidth: inputs.tooltipWidth,
    offsetPx: inputs.offsetPx,
  });
}
