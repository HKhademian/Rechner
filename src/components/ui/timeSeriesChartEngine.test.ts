import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  type ChartDataPoint,
  type ChartSeriesDefinition,
  DEFAULT_CHART_DIMENSIONS,
  TimeSeriesChartMode,
  computeChartDataDomain,
  computeChartYAxisScale,
  computeClampedTooltipLeftPx,
  computeNetTotalLinePath,
  computeOverlayLinePath,
  computePointSeriesTotals,
  computeSeriesLineGeometry,
  computeStackedAreaBands,
  computeStackedBarSegments,
  computeVisibleXTickIndices,
  createChartVisibilityMap,
  isTimeSeriesChartMode,
  mapClientXToSlotIndex,
  resolveChartDimensions,
  sortChartPointsChronologically,
  syncChartVisibilityMap,
  toTimeSeriesChartMode,
  valueToPlotY,
} from "#/components/ui/timeSeriesChartEngine.ts";

const TestSeriesKey = {
  Alpha: "alpha",
  Beta: "beta",
  Gamma: "gamma",
} as const;
type TestSeriesKey = (typeof TestSeriesKey)[keyof typeof TestSeriesKey];

const TEST_SERIES: readonly ChartSeriesDefinition<TestSeriesKey>[] = Object.freeze([
  Object.freeze({
    key: TestSeriesKey.Alpha,
    label: "Alpha",
    color: "var(--color-primary)",
  }),
  Object.freeze({
    key: TestSeriesKey.Beta,
    label: "Beta",
    color: "var(--color-gain)",
  }),
  Object.freeze({
    key: TestSeriesKey.Gamma,
    label: "Gamma",
    color: "var(--color-warning)",
  }),
]);

const TEST_SERIES_ORDER: readonly TestSeriesKey[] = Object.freeze(
  TEST_SERIES.map((s) => s.key),
);

function makePoint(
  id: string,
  order: number,
  alpha: number,
  beta: number,
  gamma: number,
): ChartDataPoint<TestSeriesKey> {
  return Object.freeze({
    id,
    order,
    xLabel: `T${order}`,
    values: Object.freeze({
      [TestSeriesKey.Alpha]: alpha,
      [TestSeriesKey.Beta]: beta,
      [TestSeriesKey.Gamma]: gamma,
    }),
  });
}

describe("timeSeriesChartEngine (Domain-Agnostic Chart Math)", () => {
  it("validates TimeSeriesChartMode strictly", () => {
    for (const mode of Object.values(TimeSeriesChartMode)) {
      assert.equal(isTimeSeriesChartMode(mode), true);
      assert.equal(toTimeSeriesChartMode(mode), mode);
    }
    assert.equal(isTimeSeriesChartMode("pie"), false);
    assert.throws(() => toTimeSeriesChartMode("pie"), TypeError);
  });

  it("sorts points chronologically without mutating input and synchronizes visibility maps", () => {
    const unsorted = [
      makePoint("p3", 3, 100, 50, 0),
      makePoint("p1", 1, 200, 0, 0),
      makePoint("p2", 2, 150, 25, -50),
    ];
    const sorted = sortChartPointsChronologically(unsorted);
    assert.deepEqual(sorted.map((p) => p.order), [1, 2, 3]);
    assert.deepEqual(unsorted.map((p) => p.order), [3, 1, 2]);

    const vis = createChartVisibilityMap(TEST_SERIES, true);
    assert.deepEqual(vis, {
      alpha: true,
      beta: true,
      gamma: true,
    });
    const synced = syncChartVisibilityMap(TEST_SERIES, {
      alpha: false,
      legacyRemoved: true,
    });
    assert.deepEqual(synced, {
      alpha: false,
      beta: true,
      gamma: true,
    });
  });

  it("conserves positive, negative, and net series totals and stacks segments gap-free in canonical order", () => {
    const point = makePoint("p1", 1, 3000, 1200, -800);
    const vis = createChartVisibilityMap(TEST_SERIES, true);
    const totals = computePointSeriesTotals(point, TEST_SERIES_ORDER, vis);
    assert.equal(totals.positiveTotal, 4200);
    assert.equal(totals.negativeTotal, -800);
    assert.equal(totals.netTotal, 3400);

    const scale = computeChartYAxisScale(totals.negativeTotal, totals.positiveTotal, 5);
    assert.ok(scale.yMin <= -800);
    assert.ok(scale.yMax >= 4200);
    assert.equal(scale.ticks.includes(0), true);

    const geom = resolveChartDimensions(DEFAULT_CHART_DIMENSIONS);
    const segments = computeStackedBarSegments(
      point,
      TEST_SERIES_ORDER,
      vis,
      scale.yMin,
      scale.yMax,
      geom.plotHeight,
      geom.marginTop,
    );
    assert.deepEqual(segments.map((s) => s.key), [
      TestSeriesKey.Alpha,
      TestSeriesKey.Beta,
      TestSeriesKey.Gamma,
    ]);

    const zeroY = geom.marginTop + valueToPlotY(0, scale.yMin, scale.yMax, geom.plotHeight);
    // Alpha sits on 0, Beta sits flush on top of Alpha, Gamma hangs below 0
    assert.ok(Math.abs(segments[0].y + segments[0].height - zeroY) < 1e-6);
    assert.ok(Math.abs(segments[1].y + segments[1].height - segments[0].y) < 1e-6);
    assert.ok(Math.abs(segments[2].y - zeroY) < 1e-6);

    const positiveTopY = geom.marginTop + valueToPlotY(4200, scale.yMin, scale.yMax, geom.plotHeight);
    assert.ok(Math.abs(segments[1].y - positiveTopY) < 1e-6);
  });

  it("computes data domain across StackedBar, Lines, Area, and Overlay modes without truncating peaks", () => {
    const points = [
      makePoint("p1", 1, 5000, 4000, 3500),
      makePoint("p2", 2, 2000, 0, -1500),
    ];
    const vis = createChartVisibilityMap(TEST_SERIES, true);
    const stackedDomain = computeChartDataDomain({
      mode: TimeSeriesChartMode.StackedBar,
      points,
      seriesOrder: TEST_SERIES_ORDER,
      visibility: vis,
    });
    assert.equal(stackedDomain.dataMax, 12500);
    assert.equal(stackedDomain.dataMin, -1500);

    const overlayDomain = computeChartDataDomain({
      mode: TimeSeriesChartMode.Overlay,
      points,
      seriesOrder: TEST_SERIES_ORDER,
      visibility: vis,
      overlaySeries: [
        {
          key: "curve-a",
          label: "Curve A",
          color: "var(--color-primary)",
          values: [8000, null],
        },
        {
          key: "curve-b",
          label: "Curve B",
          color: "var(--color-gain)",
          values: [14500, -500],
        },
      ],
    });
    assert.equal(overlayDomain.dataMax, 14500);
    assert.equal(overlayDomain.dataMin, -500);
  });

  it("generates line, net-total, overlay (with null gaps), stacked area, and non-overlapping X ticks", () => {
    const geom = resolveChartDimensions(DEFAULT_CHART_DIMENSIONS);
    const points = [
      makePoint("p1", 1, 1000, 500, 0),
      makePoint("p2", 2, 1200, 600, 200),
      makePoint("p3", 3, 1400, 700, 0),
    ];
    const vis = createChartVisibilityMap(TEST_SERIES, true);

    const line = computeSeriesLineGeometry(points, TestSeriesKey.Alpha, 0, 3000, geom);
    assert.equal(line.markers.length, 3);
    assert.equal(line.path.startsWith("M "), true);

    const netPath = computeNetTotalLinePath(points, TEST_SERIES_ORDER, vis, 0, 3000, geom);
    assert.equal(netPath.startsWith("M "), true);

    const overlayPath = computeOverlayLinePath([1000, null, 2000], 3, 0, 3000, geom);
    assert.equal(overlayPath.split("M ").length - 1, 2);

    const bands = computeStackedAreaBands(points, TEST_SERIES, vis, 0, 3000, geom);
    assert.equal(bands.length, 3);
    assert.deepEqual(bands.map((b) => b.series.key), TEST_SERIES_ORDER);
    assert.equal(bands.every((b) => b.path.endsWith(" Z")), true);

    const ticks72 = computeVisibleXTickIndices(72);
    assert.equal(ticks72[0], 0);
    assert.equal(ticks72[ticks72.length - 1], 71);
    for (let i = 1; i < ticks72.length; i++) {
      assert.ok(ticks72[i] - ticks72[i - 1] >= 3, "Adjacent X ticks must never crowd");
    }
  });

  it("maps pointer clientX accurately to slot index across CSS scaling and clamps tooltip inside viewport", () => {
    const geom = resolveChartDimensions(DEFAULT_CHART_DIMENSIONS);
    const svgRectWidth = 1400;
    const svgRectLeft = 50;
    const scale = svgRectWidth / geom.width;

    // Left margin outside plot -> null
    assert.equal(
      mapClientXToSlotIndex({
        clientX: svgRectLeft + 10,
        svgRectLeft,
        svgRectWidth,
        svgViewBoxWidth: geom.width,
        marginLeft: geom.marginLeft,
        plotWidth: geom.plotWidth,
        slotCount: 72,
      }),
      null,
    );

    // Every single slot center maps back to its exact index
    const slotWidth = geom.plotWidth / 72;
    for (const targetIndex of [0, 11, 35, 71]) {
      const centerSvgX = geom.marginLeft + (targetIndex + 0.5) * slotWidth;
      const clientX = svgRectLeft + centerSvgX * scale;
      assert.equal(
        mapClientXToSlotIndex({
          clientX,
          svgRectLeft,
          svgRectWidth,
          svgViewBoxWidth: geom.width,
          marginLeft: geom.marginLeft,
          plotWidth: geom.plotWidth,
          slotCount: 72,
        }),
        targetIndex,
      );
    }

    // Tooltip flips left near right edge and never overflows container
    const rightEdgeLeft = computeClampedTooltipLeftPx({
      slotCenterSvgX: geom.marginLeft + geom.plotWidth - 5,
      svgViewBoxWidth: geom.width,
      svgRectLeft: 0,
      svgRectWidth: 900,
      containerRectLeft: 0,
      containerWidth: 900,
      containerScrollLeft: 0,
      tooltipWidth: 280,
    });
    assert.ok(rightEdgeLeft >= 8 && rightEdgeLeft + 280 <= 900);
  });
});
