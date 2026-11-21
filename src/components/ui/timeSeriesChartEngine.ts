/**
 * Pure Mathematical Time-Series Chart Geometry & Projection Engine
 *
 * Domain-agnostic, context-unaware mathematical kernel powering `<TimeSeriesChart />`:
 * - Exact positive/negative series decomposition and conservation
 * - Dynamic Y-axis nice-step tick generation (always anchoring 0 on a tick)
 * - Gap-free signed stacked bar geometry (positive upward from 0, negative downward from 0)
 * - Multi-line, overlay comparison, and positive stacked-area SVG path synthesis
 * - Non-overlapping X-axis tick index selection
 * - ViewBox-accurate pointer hit-testing and scroll/viewport-clamped tooltip positioning
 *
 * Strictly independent of any calculator, tax engine, or application store.
 */

/** Rendering modes supported by the abstract `<TimeSeriesChart />` component (Rule 11). */
export const TimeSeriesChartMode = {
  StackedBar: "stacked_bar",
  Lines: "lines",
  Area: "area",
  Overlay: "overlay",
} as const;
export type TimeSeriesChartMode =
  (typeof TimeSeriesChartMode)[keyof typeof TimeSeriesChartMode];

const TIME_SERIES_CHART_MODE_SET: ReadonlySet<string> = new Set<string>(
  Object.values(TimeSeriesChartMode),
);

/** Runtime type guard validating a `TimeSeriesChartMode`. */
export function isTimeSeriesChartMode(
  value: string,
): value is TimeSeriesChartMode {
  return TIME_SERIES_CHART_MODE_SET.has(value);
}

/** Validated runtime constructor for `TimeSeriesChartMode` (Rule 11). */
export function toTimeSeriesChartMode(
  value: string,
): TimeSeriesChartMode {
  if (!isTimeSeriesChartMode(value)) {
    throw new TypeError(
      `Invalid TimeSeriesChartMode: "${value}". Expected one of: ${Object.values(TimeSeriesChartMode).join(", ")}.`,
    );
  }
  return value;
}

/** Semantic tone classification for tooltip value emphasis (Rule 11). */
export const TimeSeriesTone = {
  Default: "default",
  Positive: "positive",
  Warning: "warning",
  Negative: "negative",
} as const;
export type TimeSeriesTone =
  (typeof TimeSeriesTone)[keyof typeof TimeSeriesTone];

/** Categorical series definition ordered bottom-to-top for stacked bar & area rendering. */
export interface ChartSeriesDefinition<TKey extends string = string> {
  readonly key: TKey;
  readonly label: string;
  readonly color: string;
  readonly seriesClass?: string;
  readonly tooltipLabel?: string;
  readonly tooltipTone?: TimeSeriesTone;
  readonly showPositiveSign?: boolean;
}

/** Multi-curve overlay series (e.g. comparing scenarios or benchmarks) aligned 1:1 with sorted points. */
export interface ChartOverlaySeries {
  readonly key: string;
  readonly label: string;
  readonly color: string;
  readonly swatchClass?: string;
  readonly strokeWidth?: number;
  readonly strokeDasharray?: string;
  readonly values: readonly (number | null)[];
}

/** Single ordered time-series slot containing numeric values keyed by `TKey`. */
export interface ChartDataPoint<TKey extends string = string> {
  readonly id: string;
  readonly order: number;
  readonly xLabel: string;
  readonly xSubLabel?: string;
  readonly groupSeparatorLabel?: string;
  readonly values: Readonly<Record<TKey, number>>;
}

/** Optional horizontal benchmark reference line drawn across the plot area. */
export interface ChartReferenceLine {
  readonly value: number;
  readonly label: string;
}

/** SVG viewBox layout dimensions and margins. */
export interface ChartDimensions {
  readonly width: number;
  readonly height: number;
  readonly marginTop: number;
  readonly marginRight: number;
  readonly marginBottom: number;
  readonly marginLeft: number;
}

/** Resolved chart dimensions including derived inner plot width and height. */
export interface ResolvedChartGeometry extends ChartDimensions {
  readonly plotWidth: number;
  readonly plotHeight: number;
}

/** Default institutional SVG chart viewBox geometry. */
export const DEFAULT_CHART_DIMENSIONS: ChartDimensions = Object.freeze({
  width: 1050,
  height: 440,
  marginTop: 36,
  marginRight: 28,
  marginBottom: 54,
  marginLeft: 72,
});

/** Resolves complete plot geometry from optional dimension overrides. */
export function resolveChartDimensions(
  overrides?: Partial<ChartDimensions>,
): ResolvedChartGeometry {
  const width = overrides?.width ?? DEFAULT_CHART_DIMENSIONS.width;
  const height = overrides?.height ?? DEFAULT_CHART_DIMENSIONS.height;
  const marginTop = overrides?.marginTop ?? DEFAULT_CHART_DIMENSIONS.marginTop;
  const marginRight = overrides?.marginRight ?? DEFAULT_CHART_DIMENSIONS.marginRight;
  const marginBottom = overrides?.marginBottom ?? DEFAULT_CHART_DIMENSIONS.marginBottom;
  const marginLeft = overrides?.marginLeft ?? DEFAULT_CHART_DIMENSIONS.marginLeft;
  return Object.freeze({
    width,
    height,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    plotWidth: Math.max(1, width - marginLeft - marginRight),
    plotHeight: Math.max(1, height - marginTop - marginBottom),
  });
}

/** Returns a new array of data points sorted strictly ascending by `order`. */
export function sortChartPointsChronologically<T extends ChartDataPoint<string>>(
  points: readonly T[],
): readonly T[] {
  return [...points].sort((a, b) => a.order - b.order);
}

/** Creates a uniform all-on or all-off visibility record for a series list. */
export function createChartVisibilityMap<TKey extends string>(
  series: readonly ChartSeriesDefinition<TKey>[],
  visible: boolean,
): Record<TKey, boolean> {
  const result = {} as Record<TKey, boolean>;
  for (const item of series) {
    result[item.key] = visible;
  }
  return result;
}

/** Synchronizes a visibility record with an updated series definition list, preserving existing toggles. */
export function syncChartVisibilityMap<TKey extends string>(
  series: readonly ChartSeriesDefinition<TKey>[],
  previous: Readonly<Record<string, boolean>>,
  defaultVisible = true,
): Record<TKey, boolean> {
  const next = {} as Record<TKey, boolean>;
  for (const item of series) {
    next[item.key] = Object.prototype.hasOwnProperty.call(previous, item.key)
      ? Boolean(previous[item.key])
      : defaultVisible;
  }
  return next;
}

export interface PointSeriesTotals {
  readonly netTotal: number;
  readonly positiveTotal: number;
  readonly negativeTotal: number;
}

/** Computes exact net, positive-stack, and negative-stack sums across currently visible series. */
export function computePointSeriesTotals<TKey extends string>(
  point: ChartDataPoint<TKey>,
  seriesOrder: readonly TKey[],
  visibility: Readonly<Record<TKey, boolean>>,
): PointSeriesTotals {
  let netTotal = 0;
  let positiveTotal = 0;
  let negativeTotal = 0;
  for (const key of seriesOrder) {
    if (!visibility[key]) {
      continue;
    }
    const raw = point.values[key];
    const value = Number.isFinite(raw) ? raw : 0;
    netTotal += value;
    if (value > 0) {
      positiveTotal += value;
    }
    else if (value < 0) {
      negativeTotal += value;
    }
  }
  return Object.freeze({
    netTotal,
    positiveTotal,
    negativeTotal,
  });
}

export interface ChartDataDomainInputs<TKey extends string> {
  readonly mode: TimeSeriesChartMode;
  readonly points: readonly ChartDataPoint<TKey>[];
  readonly seriesOrder: readonly TKey[];
  readonly visibility: Readonly<Record<TKey, boolean>>;
  readonly overlaySeries?: readonly ChartOverlaySeries[];
  readonly referenceValue?: number;
}

export interface ChartDataDomain {
  readonly dataMin: number;
  readonly dataMax: number;
}

/** Computes exact `[dataMin, dataMax]` bounds for the active rendering mode and visible series. */
export function computeChartDataDomain<TKey extends string>(
  inputs: Readonly<ChartDataDomainInputs<TKey>>,
): ChartDataDomain {
  let dataMin = 0;
  let dataMax =
    inputs.referenceValue !== undefined && Number.isFinite(inputs.referenceValue)
      ? Math.max(0, inputs.referenceValue)
      : 0;
  if (
    inputs.referenceValue !== undefined &&
    Number.isFinite(inputs.referenceValue) &&
    inputs.referenceValue < dataMin
  ) {
    dataMin = inputs.referenceValue;
  }

  if (inputs.mode === TimeSeriesChartMode.Overlay) {
    for (const overlay of inputs.overlaySeries ?? []) {
      for (const candidate of overlay.values) {
        if (candidate === null || !Number.isFinite(candidate)) {
          continue;
        }
        if (candidate > dataMax) {
          dataMax = candidate;
        }
        if (candidate < dataMin) {
          dataMin = candidate;
        }
      }
    }
  }
  else {
    for (const point of inputs.points) {
      const totals = computePointSeriesTotals(
        point,
        inputs.seriesOrder,
        inputs.visibility,
      );
      if (totals.positiveTotal > dataMax) {
        dataMax = totals.positiveTotal;
      }
      if (totals.negativeTotal < dataMin) {
        dataMin = totals.negativeTotal;
      }
      if (inputs.mode === TimeSeriesChartMode.Lines) {
        for (const key of inputs.seriesOrder) {
          if (!inputs.visibility[key]) {
            continue;
          }
          const raw = point.values[key];
          const val = Number.isFinite(raw) ? raw : 0;
          if (val > dataMax) {
            dataMax = val;
          }
          if (val < dataMin) {
            dataMin = val;
          }
        }
      }
    }
  }

  return Object.freeze({
    dataMin,
    dataMax,
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
 * to land exactly on a grid tick. Never truncates peaks or negative outflows.
 */
export function computeChartYAxisScale(
  minVal: number,
  maxVal: number,
  targetTickCount = 5,
  minPositiveCeiling = 2000,
): ChartYAxisScale {
  const safeMin = Math.min(0, Number.isFinite(minVal) ? minVal : 0);
  const safeMax = Math.max(
    minPositiveCeiling,
    Number.isFinite(maxVal) ? maxVal : minPositiveCeiling,
  );
  const span = Math.max(1e-6, safeMax - safeMin);
  const minStep = minPositiveCeiling >= 1000 ? 500 : 0;
  const step = Math.max(minStep, pickNiceStep(span / Math.max(2, targetTickCount)));
  const yMin = safeMin < 0 ? Math.floor(safeMin / step) * step : 0;
  const yMax = Math.max(step, Math.ceil(safeMax / step) * step);

  const ticks: number[] = [];
  for (let tick = yMin; tick <= yMax + step * 1e-6; tick += step) {
    const rounded = Math.abs(tick) < step * 1e-6 ? 0 : Number(tick.toPrecision(10));
    ticks.push(rounded);
  }

  return Object.freeze({
    yMin,
    yMax,
    step,
    ticks: Object.freeze(ticks),
  });
}

/** Projects a numeric value within `[yMin, yMax]` to SVG plot-local Y (`0` = top, `plotHeight` = bottom). */
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

export interface ChartSlotMetrics {
  readonly slotWidth: number;
  readonly barWidth: number;
}

/** Computes horizontal slot width and responsive bar width for `pointCount` chronological slots. */
export function computeSlotMetrics(
  plotWidth: number,
  pointCount: number,
): ChartSlotMetrics {
  const slotWidth = pointCount > 0 ? plotWidth / pointCount : plotWidth;
  const barWidth = Math.max(4, Math.min(36, slotWidth * 0.74));
  return Object.freeze({
    slotWidth,
    barWidth,
  });
}

export interface ChartBarSegment<TKey extends string = string> {
  readonly key: TKey;
  readonly value: number;
  readonly y: number;
  readonly height: number;
  readonly stackStart: number;
  readonly stackEnd: number;
}

/**
 * Computes exact, gap-free stacked bar rectangles for one chronological slot.
 * Positive values stack upward from `0` in canonical `seriesOrder`.
 * Negative values stack downward below `0` without corrupting positive stack heights.
 */
export function computeStackedBarSegments<TKey extends string>(
  point: ChartDataPoint<TKey>,
  seriesOrder: readonly TKey[],
  visibility: Readonly<Record<TKey, boolean>>,
  yMin: number,
  yMax: number,
  plotHeight: number,
  marginTop: number,
): readonly ChartBarSegment<TKey>[] {
  const segments: ChartBarSegment<TKey>[] = [];
  let posCursor = 0;
  let negCursor = 0;

  for (const key of seriesOrder) {
    if (!visibility[key]) {
      continue;
    }
    const raw = point.values[key];
    const value = Number.isFinite(raw) ? raw : 0;
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
          stackStart: start,
          stackEnd: end,
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
          stackStart: start,
          stackEnd: end,
        }),
      );
      negCursor = end;
    }
  }

  return Object.freeze(segments);
}

export interface ChartLineMarker {
  readonly pointId: string;
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
  readonly value: number;
}

export interface ChartLineGeometry {
  readonly path: string;
  readonly markers: readonly ChartLineMarker[];
}

/** Synthesizes SVG polyline path and non-zero point markers for a single series. */
export function computeSeriesLineGeometry<TKey extends string>(
  points: readonly ChartDataPoint<TKey>[],
  seriesKey: TKey,
  yMin: number,
  yMax: number,
  geometry: ResolvedChartGeometry,
): ChartLineGeometry {
  if (points.length === 0) {
    return Object.freeze({
      path: "",
      markers: Object.freeze([]),
    });
  }
  const { slotWidth } = computeSlotMetrics(geometry.plotWidth, points.length);
  const pathParts: string[] = [];
  const markers: ChartLineMarker[] = [];

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const raw = point.values[seriesKey];
    const value = Number.isFinite(raw) ? raw : 0;
    const cx = geometry.marginLeft + (i + 0.5) * slotWidth;
    const cy = geometry.marginTop + valueToPlotY(value, yMin, yMax, geometry.plotHeight);
    pathParts.push(`${i === 0 ? "M" : "L"} ${cx} ${cy}`);
    if (value !== 0) {
      markers.push(
        Object.freeze({
          pointId: point.id,
          index: i,
          cx,
          cy,
          value,
        }),
      );
    }
  }

  return Object.freeze({
    path: pathParts.join(" "),
    markers: Object.freeze(markers),
  });
}

/** Synthesizes the SVG path for the active net-total trend line across all visible series. */
export function computeNetTotalLinePath<TKey extends string>(
  points: readonly ChartDataPoint<TKey>[],
  seriesOrder: readonly TKey[],
  visibility: Readonly<Record<TKey, boolean>>,
  yMin: number,
  yMax: number,
  geometry: ResolvedChartGeometry,
): string {
  if (points.length === 0) {
    return "";
  }
  const { slotWidth } = computeSlotMetrics(geometry.plotWidth, points.length);
  return points
    .map((point, i) => {
      const x = geometry.marginLeft + (i + 0.5) * slotWidth;
      const net = computePointSeriesTotals(point, seriesOrder, visibility).netTotal;
      const y = geometry.marginTop + valueToPlotY(net, yMin, yMax, geometry.plotHeight);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

/** Synthesizes an SVG path for an overlay comparison series, breaking cleanly across `null` gaps. */
export function computeOverlayLinePath(
  values: readonly (number | null)[],
  pointCount: number,
  yMin: number,
  yMax: number,
  geometry: ResolvedChartGeometry,
): string {
  if (pointCount <= 0 || values.length === 0) {
    return "";
  }
  const { slotWidth } = computeSlotMetrics(geometry.plotWidth, pointCount);
  const commands: string[] = [];
  let inSegment = false;

  const limit = Math.min(pointCount, values.length);
  for (let i = 0; i < limit; i++) {
    const val = values[i];
    if (val === null || !Number.isFinite(val)) {
      inSegment = false;
      continue;
    }
    const x = geometry.marginLeft + (i + 0.5) * slotWidth;
    const y = geometry.marginTop + valueToPlotY(val, yMin, yMax, geometry.plotHeight);
    commands.push(`${inSegment ? "L" : "M"} ${x} ${y}`);
    inSegment = true;
  }

  return commands.join(" ");
}

export interface ChartAreaBand<TKey extends string = string> {
  readonly series: ChartSeriesDefinition<TKey>;
  readonly path: string;
}

/** Generates closed positive stacked-area polygon paths in canonical bottom-to-top order. */
export function computeStackedAreaBands<TKey extends string>(
  points: readonly ChartDataPoint<TKey>[],
  series: readonly ChartSeriesDefinition<TKey>[],
  visibility: Readonly<Record<TKey, boolean>>,
  yMin: number,
  yMax: number,
  geometry: ResolvedChartGeometry,
): readonly ChartAreaBand<TKey>[] {
  if (points.length === 0) {
    return Object.freeze([]);
  }
  const { slotWidth } = computeSlotMetrics(geometry.plotWidth, points.length);
  const cumulativeBottom = points.map(() => 0);
  const bands: ChartAreaBand<TKey>[] = [];

  for (const item of series) {
    if (!visibility[item.key]) {
      continue;
    }
    const topValues = points.map((point, i) => {
      const raw = point.values[item.key];
      const val = Math.max(0, Number.isFinite(raw) ? raw : 0);
      return cumulativeBottom[i] + val;
    });
    const hasPositiveArea = topValues.some((top, i) => top > cumulativeBottom[i]);
    if (hasPositiveArea) {
      const topEdge = topValues
        .map((top, i) => {
          const x = geometry.marginLeft + (i + 0.5) * slotWidth;
          const y = geometry.marginTop + valueToPlotY(top, yMin, yMax, geometry.plotHeight);
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ");
      const bottomEdge = cumulativeBottom
        .slice()
        .reverse()
        .map((bottom, revIdx) => {
          const i = points.length - 1 - revIdx;
          const x = geometry.marginLeft + (i + 0.5) * slotWidth;
          const y = geometry.marginTop + valueToPlotY(bottom, yMin, yMax, geometry.plotHeight);
          return `L ${x} ${y}`;
        })
        .join(" ");
      bands.push(
        Object.freeze({
          series: item,
          path: `${topEdge} ${bottomEdge} Z`,
        }),
      );
    }
    for (let i = 0; i < points.length; i++) {
      cumulativeBottom[i] = topValues[i];
    }
  }

  return Object.freeze(bands);
}

/** Selects clean, non-overlapping X-axis tick indices always including first and last point. */
export function computeVisibleXTickIndices(pointCount: number): readonly number[] {
  if (pointCount <= 0) {
    return Object.freeze([]);
  }
  const step =
    pointCount <= 12
      ? 1
      : pointCount <= 24
        ? 2
        : pointCount <= 36
          ? 3
          : 6;
  const indices: number[] = [];
  for (let i = 0; i < pointCount; i++) {
    const isFirst = i === 0;
    const isLast = i === pointCount - 1;
    const isRegular = i % step === 0 && pointCount - 1 - i >= Math.ceil(step / 2);
    if (isFirst || isLast || isRegular) {
      indices.push(i);
    }
  }
  return Object.freeze(indices);
}

export interface ClientXToSlotIndexInputs {
  readonly clientX: number;
  readonly svgRectLeft: number;
  readonly svgRectWidth: number;
  readonly svgViewBoxWidth: number;
  readonly marginLeft: number;
  readonly plotWidth: number;
  readonly slotCount: number;
}

/**
 * Converts a pointer `clientX` into the exact hovered slot index by scaling into SVG viewBox coordinates.
 * Returns `null` when the pointer is outside `[marginLeft, marginLeft + plotWidth]`.
 */
export function mapClientXToSlotIndex(
  inputs: Readonly<ClientXToSlotIndexInputs>,
): number | null {
  if (inputs.slotCount <= 0 || inputs.svgRectWidth <= 0 || inputs.plotWidth <= 0) {
    return null;
  }
  const scaleX = inputs.svgViewBoxWidth / inputs.svgRectWidth;
  const svgX = (inputs.clientX - inputs.svgRectLeft) * scaleX;
  const plotX = svgX - inputs.marginLeft;
  if (plotX < 0 || plotX > inputs.plotWidth) {
    return null;
  }
  const slotWidth = inputs.plotWidth / inputs.slotCount;
  return Math.min(
    inputs.slotCount - 1,
    Math.max(0, Math.floor(plotX / slotWidth)),
  );
}

export interface ClampedTooltipPositionInputs {
  readonly slotCenterSvgX: number;
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
 * Computes the CSS `left` pixel offset inside the chart scroll container so the tooltip sits cleanly
 * beside the hovered slot (flipping left/right at the viewport edge) at any screen width or scroll offset.
 */
export function computeClampedTooltipLeftPx(
  inputs: Readonly<ClampedTooltipPositionInputs>,
): number {
  const offset = inputs.offsetPx ?? 14;
  const slotCssX =
    (inputs.slotCenterSvgX / inputs.svgViewBoxWidth) * inputs.svgRectWidth +
    (inputs.svgRectLeft - inputs.containerRectLeft) +
    inputs.containerScrollLeft;
  const visibleLeft = inputs.containerScrollLeft + 8;
  const visibleRight = Math.max(
    visibleLeft,
    inputs.containerScrollLeft + inputs.containerWidth - inputs.tooltipWidth - 8,
  );
  const preferRight = slotCssX + offset;
  if (preferRight <= visibleRight) {
    return Math.round(Math.max(visibleLeft, preferRight));
  }
  const preferLeft = slotCssX - inputs.tooltipWidth - offset;
  return Math.round(Math.min(visibleRight, Math.max(visibleLeft, preferLeft)));
}
