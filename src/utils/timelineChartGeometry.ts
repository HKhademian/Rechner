/**
 * Pure Timeline Chart Geometry, Series Accounting, and Hit-Testing Engine
 *
 * Context-unaware pure mathematical projections powering `TimelineChart.tsx`:
 * - Exact accounting decomposition of `MonthlyLedgerEntry.monthlyTotal` into mutually exclusive series
 * - Dynamic Y-axis tick generation supporting arbitrary positive/negative cashflow ranges
 * - Exact non-overlapping stacked bar geometry (positive upward from €0, negative downward from €0)
 * - ViewBox-aware cursor-to-bar hit-testing and container-clamped tooltip positioning
 */

import {
  type EuroAmount,
  type TimelineMonth,
  toEuroAmount,
} from "#engine/types";

/**
 * Strongly-typed categorical series keys for the monthly cashflow timeline chart (Rule 11).
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

/** Canonical bottom-to-top stack order for stacked bar & stacked area charts. */
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

/** Creates a uniform all-on or all-off series visibility map. */
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
  let net = 0;
  let positive = 0;
  let negative = 0;
  for (const key of TIMELINE_CHART_SERIES_ORDER) {
    if (!visibility[key]) {
      continue;
    }
    const val = getMonthSeriesValue(month, key);
    net += val;
    if (val > 0) {
      positive += val;
    }
    else if (val < 0) {
      negative += val;
    }
  }
  return Object.freeze({
    netTotal: toEuroAmount(net),
    positiveTotal: toEuroAmount(positive),
    negativeTotal: toEuroAmount(negative),
  });
}

export interface ChartYAxisScale {
  readonly yMin: number;
  readonly yMax: number;
  readonly step: number;
  readonly ticks: readonly number[];
}

const NICE_STEP_MULTIPLIERS = [1, 2, 2.5, 5, 10] as const;

function pickNiceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1000;
  }
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  for (const multiplier of NICE_STEP_MULTIPLIERS) {
    if (normalized <= multiplier) {
      return multiplier * magnitude;
    }
  }
  return 10 * magnitude;
}

/**
 * Computes a clean, evenly spaced Y-axis scale covering `[minVal, maxVal]` with `0` guaranteed
 * to land exactly on a grid tick. Never truncates high-value months.
 */
export function computeChartYAxisScale(
  minVal: number,
  maxVal: number,
  targetTickCount = 5,
): ChartYAxisScale {
  const safeMin = Math.min(0, Number.isFinite(minVal) ? minVal : 0);
  const safeMax = Math.max(2000, Number.isFinite(maxVal) ? maxVal : 2000);
  const span = Math.max(1000, safeMax - safeMin);
  const step = Math.max(500, pickNiceStep(span / Math.max(2, targetTickCount)));
  const yMin = safeMin < 0 ? Math.floor(safeMin / step) * step : 0;
  const yMax = Math.max(step, Math.ceil(safeMax / step) * step);

  const ticks: number[] = [];
  for (let tick = yMin; tick <= yMax + 1e-6; tick += step) {
    ticks.push(Math.round(tick));
  }

  return Object.freeze({
    yMin,
    yMax,
    step,
    ticks: Object.freeze(ticks),
  });
}

/** Projects a monetary value within `[yMin, yMax]` to SVG plot-local Y (`0` = top, `plotHeight` = bottom). */
export function valueToPlotY(
  value: number,
  yMin: number,
  yMax: number,
  plotHeight: number,
): number {
  const span = yMax - yMin;
  if (span <= 0) {
    return plotHeight;
  }
  return plotHeight - ((value - yMin) / span) * plotHeight;
}

export interface StackedBarSegment {
  readonly key: TimelineChartSeriesKey;
  readonly value: EuroAmount;
  readonly y: number;
  readonly height: number;
  readonly stackStart: EuroAmount;
  readonly stackEnd: EuroAmount;
}

/**
 * Computes exact, gap-free stacked bar rectangles for one month.
 * Positive values stack upward from `€0` in canonical `TIMELINE_CHART_SERIES_ORDER`.
 * Negative values stack downward below `€0` without corrupting the positive total height.
 */
export function computeStackedBarSegments(
  month: TimelineMonth,
  visibility: TimelineChartVisibilityMap,
  yMin: number,
  yMax: number,
  plotHeight: number,
  marginTop: number,
): readonly StackedBarSegment[] {
  const segments: StackedBarSegment[] = [];
  let posCursor = 0;
  let negCursor = 0;

  for (const key of TIMELINE_CHART_SERIES_ORDER) {
    if (!visibility[key]) {
      continue;
    }
    const value = getMonthSeriesValue(month, key);
    if (value === 0) {
      continue;
    }
    if (value > 0) {
      const start = posCursor;
      const end = posCursor + value;
      const topY = marginTop + valueToPlotY(end, yMin, yMax, plotHeight);
      const bottomY = marginTop + valueToPlotY(start, yMin, yMax, plotHeight);
      segments.push(
        Object.freeze({
          key,
          value,
          y: topY,
          height: Math.max(0, bottomY - topY),
          stackStart: toEuroAmount(start),
          stackEnd: toEuroAmount(end),
        }),
      );
      posCursor = end;
    }
    else {
      const start = negCursor;
      const end = negCursor + value;
      const topY = marginTop + valueToPlotY(start, yMin, yMax, plotHeight);
      const bottomY = marginTop + valueToPlotY(end, yMin, yMax, plotHeight);
      segments.push(
        Object.freeze({
          key,
          value,
          y: topY,
          height: Math.max(0, bottomY - topY),
          stackStart: toEuroAmount(start),
          stackEnd: toEuroAmount(end),
        }),
      );
      negCursor = end;
    }
  }

  return Object.freeze(segments);
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

/**
 * Converts a pointer `clientX` into the exact hovered bar index by scaling into SVG viewBox coordinates.
 * Returns `null` when the pointer is outside the plot area `[marginLeft, marginLeft + plotWidth]`.
 */
export function mapClientXToBarIndex(
  inputs: Readonly<ClientXToBarIndexInputs>,
): number | null {
  if (inputs.barCount <= 0 || inputs.svgRectWidth <= 0 || inputs.plotWidth <= 0) {
    return null;
  }
  const scaleX = inputs.svgViewBoxWidth / inputs.svgRectWidth;
  const svgX = (inputs.clientX - inputs.svgRectLeft) * scaleX;
  const plotX = svgX - inputs.marginLeft;
  if (plotX < 0 || plotX > inputs.plotWidth) {
    return null;
  }
  const slotWidth = inputs.plotWidth / inputs.barCount;
  return Math.min(
    inputs.barCount - 1,
    Math.max(0, Math.floor(plotX / slotWidth)),
  );
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

/**
 * Computes the CSS `left` pixel offset inside `.timeline-chart__plot-wrap` so the tooltip sits cleanly
 * beside the hovered bar (flipping left/right at the viewport edge) at any screen width or scroll position.
 */
export function computeTooltipLeftPx(
  inputs: Readonly<TooltipPositionInputs>,
): number {
  const offset = inputs.offsetPx ?? 14;
  const barCssX =
    (inputs.barCenterSvgX / inputs.svgViewBoxWidth) * inputs.svgRectWidth +
    (inputs.svgRectLeft - inputs.containerRectLeft) +
    inputs.containerScrollLeft;
  const visibleLeft = inputs.containerScrollLeft + 8;
  const visibleRight = Math.max(
    visibleLeft,
    inputs.containerScrollLeft + inputs.containerWidth - inputs.tooltipWidth - 8,
  );
  const preferRight = barCssX + offset;
  if (preferRight <= visibleRight) {
    return Math.round(Math.max(visibleLeft, preferRight));
  }
  const preferLeft = barCssX - inputs.tooltipWidth - offset;
  return Math.round(Math.min(visibleRight, Math.max(visibleLeft, preferLeft)));
}

/** Formats a compact non-overlapping X-axis month label (e.g. `M1`, `M9`, `M-3`). */
export function formatCompactXAxisLabel(month: TimelineMonth): string {
  const raw = month.relativeMonthLabel || month.relativeBirthLabel || `M${month.month}`;
  const parenIndex = raw.indexOf(" (");
  return parenIndex > 0 ? raw.slice(0, parenIndex) : raw;
}
