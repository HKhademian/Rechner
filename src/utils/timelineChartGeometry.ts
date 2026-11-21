/**
 * Elterngeld Domain Adapter for the Abstract `<TimeSeriesChart />` Component
 *
 * Translates Elterngeld `MonthlyLedgerEntry` (`TimelineMonth`) records and `TimelineChartMode`
 * enums onto the domain-agnostic `timeSeriesChartEngine` mathematical kernel.
 * All generic axis, stacking, path, and hit-testing mathematics live in
 * `src/components/ui/timeSeriesChartEngine.ts`.
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
  type TimelineMonth,
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
  BonusesAndEvents: "bonusesAndEvents",
  TaxRefund: "taxRefund",
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
    TimelineChartSeriesKey.BonusesAndEvents,
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
    [TimelineChartSeriesKey.BonusesAndEvents]: visible,
    [TimelineChartSeriesKey.TaxRefund]: visible,
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
 * Extracts the exact signed EUR amount for a single series key from a ledger month.
 * Across all 8 keys, the sum equals `month.monthlyTotal` to the exact cent.
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
    case TimelineChartSeriesKey.BonusesAndEvents:
      return toEuroAmount(month.specialEventsTotal - month.taxRefund);
    case TimelineChartSeriesKey.TaxRefund:
      return month.taxRefund;
  }
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
  return Object.freeze({
    id: month.monthId,
    order: month.month,
    xLabel: formatCompactXAxisLabel(month),
    xSubLabel: month.calendarLabel,
    groupSeparatorLabel:
      month.calendarMonthNum === 1 ? String(month.calendarYearNum) : undefined,
    values: Object.freeze({
      [TimelineChartSeriesKey.HusbandSalary]: getMonthSeriesValue(
        month,
        TimelineChartSeriesKey.HusbandSalary,
      ),
      [TimelineChartSeriesKey.WifeSalary]: getMonthSeriesValue(
        month,
        TimelineChartSeriesKey.WifeSalary,
      ),
      [TimelineChartSeriesKey.Mutterschutz]: getMonthSeriesValue(
        month,
        TimelineChartSeriesKey.Mutterschutz,
      ),
      [TimelineChartSeriesKey.WifeElterngeld]: getMonthSeriesValue(
        month,
        TimelineChartSeriesKey.WifeElterngeld,
      ),
      [TimelineChartSeriesKey.HusbandElterngeld]: getMonthSeriesValue(
        month,
        TimelineChartSeriesKey.HusbandElterngeld,
      ),
      [TimelineChartSeriesKey.Kindergeld]: getMonthSeriesValue(
        month,
        TimelineChartSeriesKey.Kindergeld,
      ),
      [TimelineChartSeriesKey.BonusesAndEvents]: getMonthSeriesValue(
        month,
        TimelineChartSeriesKey.BonusesAndEvents,
      ),
      [TimelineChartSeriesKey.TaxRefund]: getMonthSeriesValue(
        month,
        TimelineChartSeriesKey.TaxRefund,
      ),
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
