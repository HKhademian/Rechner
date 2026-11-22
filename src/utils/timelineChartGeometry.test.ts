import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  type ScenarioActionBatches,
  FederalStateKitaPresetId,
  FinancialEventCategory,
  SalaryInputMode,
  ScenarioId,
  TaxClass,
  toCalendarMonth,
  toChildIndex,
  toEuroAmount,
  toFinancialEventId,
  toFullCalendarYear,
  toGrossSalary,
  toMonthDuration,
  toNetSalary,
  toPregnancyId,
  toSimulationMonth,
  toSwitchId,
  toWorkingHours,
} from "#engine/types";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  TIMELINE_CHART_SERIES_ORDER,
  TimelineChartSeriesKey,
  computeChartYAxisScale,
  computeStackedBarSegments,
  computeTooltipLeftPx,
  createUniformSeriesVisibility,
  formatCompactXAxisLabel,
  getActiveTimelineSeriesKeys,
  getMonthActiveSeriesTotals,
  getMonthSeriesValue,
  isTimelineChartSeriesKey,
  mapClientXToBarIndex,
  toTimelineChartSeriesKey,
  valueToPlotY,
} from "#utils/timelineChartGeometry";
import {
  standardPreexistingConditions,
} from "../../test/fixture/standardHouseholds.ts";

describe("timelineChartGeometry (Pure Chart Math & Hit-Testing)", () => {
  it("validates TimelineChartSeriesKey const enum strictly", () => {
    for (const key of TIMELINE_CHART_SERIES_ORDER) {
      assert.equal(isTimelineChartSeriesKey(key), true);
      assert.equal(toTimelineChartSeriesKey(key), key);
    }
    assert.equal(isTimelineChartSeriesKey("unknown"), false);
    assert.throws(() => toTimelineChartSeriesKey("unknown"), TypeError);
  });

  it("conserves exact monthlyTotal across all 12 granular series without conflating bonuses, investments, daycare, grants, or costs", () => {
    const batches: ScenarioActionBatches = {
      scenarioKey: ScenarioId.C,
      preexisting: {
        ...standardPreexistingConditions,
        salaryInputMode: SalaryInputMode.Gross,
        husbandGross: toGrossSalary(4500),
        wifeGross: toGrossSalary(3200),
        enable13thSalary: true,
        investmentReturnMonthly: toEuroAmount(250),
        childcarePlan: {
          enabled: true,
          presetId: FederalStateKitaPresetId.Custom,
          customMonthlyFeePerChild: toEuroAmount(350),
          startAgeMonths: 12,
          endAgeMonths: 72,
        },
        simulationDurationMonths: toMonthDuration(36),
      },
      pregnancies: [
        {
          pregnancyId: toPregnancyId("PREG-CHART-1"),
          childIndex: toChildIndex(1),
          positiveTestCalendarMonth: toCalendarMonth(9),
          positiveTestCalendarYear: toFullCalendarYear(2026),
          positiveTestSimulationMonth: toSimulationMonth(9),
          calculatedDeliverySimulationMonth: toSimulationMonth(17),
          motherPostBirthPartTimeHours: toWorkingHours(24),
          motherPostBirthPartTimeClass5Net: toNetSalary(0),
          motherPostBirthPartTimeClass3Net: toNetSalary(0),
          fatherPartnerMonthsCount: toMonthDuration(4),
        },
      ],
      taxClassSwitches: [
        {
          switchId: toSwitchId("SWAP-CHART-1"),
          effectiveSimulationMonth: toSimulationMonth(9),
          effectiveCalendarMonth: toCalendarMonth(9),
          effectiveCalendarYear: toFullCalendarYear(2026),
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          revertSimulationMonth: toSimulationMonth(17),
          statutoryReason: "Chart accounting test",
        },
      ],
      salaryRaises: [],
      financialEvents: [
        {
          eventId: toFinancialEventId("FEVENT-CHART-COST-1"),
          effectiveSimulationMonth: toSimulationMonth(29), // May 2028 (also has 40% vacation bonus + Kita fee!)
          effectiveCalendarMonth: toCalendarMonth(5),
          effectiveCalendarYear: toFullCalendarYear(2028),
          title: "Baby Equipment",
          amount: toEuroAmount(-1500),
          category: FinancialEventCategory.BabyEquipment,
          description: "Stroller and crib",
        },
        {
          eventId: toFinancialEventId("FEVENT-CHART-GRANT-1"),
          effectiveSimulationMonth: toSimulationMonth(29),
          effectiveCalendarMonth: toCalendarMonth(5),
          effectiveCalendarYear: toFullCalendarYear(2028),
          title: "Family Grant",
          amount: toEuroAmount(500),
          category: FinancialEventCategory.HealthcareFamily,
          description: "State family grant",
        },
      ],
    };

    const result = runScenarioBatches(batches);
    const allOn = createUniformSeriesVisibility(true);

    // Every single month in the 36-month timeline must sum identically to monthlyTotal
    for (const month of result.months) {
      const totals = getMonthActiveSeriesTotals(month, allOn);
      assert.equal(totals.netTotal, month.monthlyTotal);

      const scale = computeChartYAxisScale(totals.negativeTotal, totals.positiveTotal);
      const segments = computeStackedBarSegments(month, allOn, scale.yMin, scale.yMax, 345, 40);

      const positiveSegs = segments.filter((seg) => seg.value > 0);
      if (positiveSegs.length > 0) {
        // Segments must be strictly contiguous and ordered bottom-to-top with zero overlap
        for (let i = 1; i < positiveSegs.length; i++) {
          assert.equal(positiveSegs[i].stackStart, positiveSegs[i - 1].stackEnd);
          assert.ok(
            Math.abs(positiveSegs[i].y + positiveSegs[i].height - positiveSegs[i - 1].y) < 1e-6,
          );
        }
        // Top of highest positive segment must match valueToPlotY(positiveTotal) exactly
        const topSeg = positiveSegs[positiveSegs.length - 1];
        assert.equal(topSeg.stackEnd, totals.positiveTotal);
        assert.ok(
          Math.abs(topSeg.y - (40 + valueToPlotY(totals.positiveTotal, scale.yMin, scale.yMax, 345))) < 1e-6,
        );
      }

      // Month 29 (05.2028) simultaneously has: 13th-salary vacation bonus (+), investment return (+250),
      // one-off grant (+500), Kita fee (-350), and Baby Equipment (-1,500) — each in its own bucket!
      if (month.month === 29) {
        assert.ok(getMonthSeriesValue(month, TimelineChartSeriesKey.SalaryBonuses) > 0);
        assert.equal(getMonthSeriesValue(month, TimelineChartSeriesKey.InvestmentReturns), 250);
        assert.equal(getMonthSeriesValue(month, TimelineChartSeriesKey.CustomIncome), 500);
        assert.equal(getMonthSeriesValue(month, TimelineChartSeriesKey.DaycareFees), -350);
        assert.equal(getMonthSeriesValue(month, TimelineChartSeriesKey.CustomCosts), -1500);

        const negSegs = segments.filter((seg) => seg.value < 0);
        assert.deepEqual(negSegs.map((s) => s.key), [
          TimelineChartSeriesKey.DaycareFees,
          TimelineChartSeriesKey.CustomCosts,
        ]);
        const zeroY = 40 + valueToPlotY(0, scale.yMin, scale.yMax, 345);
        assert.ok(Math.abs(negSegs[0].y - zeroY) < 1e-6);
        assert.ok(Math.abs(negSegs[1].y - (negSegs[0].y + negSegs[0].height)) < 1e-6);
      }
    }

    const activeKeys = getActiveTimelineSeriesKeys(result.months);
    assert.equal(activeKeys.includes(TimelineChartSeriesKey.SalaryBonuses), true);
    assert.equal(activeKeys.includes(TimelineChartSeriesKey.InvestmentReturns), true);
    assert.equal(activeKeys.includes(TimelineChartSeriesKey.CustomIncome), true);
    assert.equal(activeKeys.includes(TimelineChartSeriesKey.DaycareFees), true);
    assert.equal(activeKeys.includes(TimelineChartSeriesKey.CustomCosts), true);

    // A baseline plan without optional events omits unused optional buckets from the active legend
    const minimalResult = runScenarioBatches({
      ...batches,
      preexisting: {
        ...batches.preexisting,
        enable13thSalary: false,
        investmentReturnMonthly: toEuroAmount(0),
        childcarePlan: undefined,
      },
      financialEvents: [],
    });
    const minimalActiveKeys = getActiveTimelineSeriesKeys(minimalResult.months);
    assert.equal(minimalActiveKeys.includes(TimelineChartSeriesKey.SalaryBonuses), false);
    assert.equal(minimalActiveKeys.includes(TimelineChartSeriesKey.InvestmentReturns), false);
    assert.equal(minimalActiveKeys.includes(TimelineChartSeriesKey.DaycareFees), false);
    assert.equal(minimalActiveKeys.includes(TimelineChartSeriesKey.CustomIncome), false);
    assert.equal(minimalActiveKeys.includes(TimelineChartSeriesKey.CustomCosts), false);
  });

  it("scales Y-axis dynamically above €8,000 and below €0 with €0 always on a grid tick", () => {
    const highScale = computeChartYAxisScale(0, 14250);
    assert.equal(highScale.yMin, 0);
    assert.ok(highScale.yMax >= 14250);
    assert.equal(highScale.ticks[0], 0);
    assert.equal(highScale.ticks[highScale.ticks.length - 1], highScale.yMax);

    const signedScale = computeChartYAxisScale(-1800, 9200);
    assert.ok(signedScale.yMin <= -1800);
    assert.ok(signedScale.yMax >= 9200);
    assert.equal(signedScale.ticks.includes(0), true);
  });

  it("maps cursor clientX accurately across arbitrary SVG CSS scaling and horizontal scroll", () => {
    // SVG viewBox is 1050 wide, marginLeft=65, plotWidth=955, 72 bars.
    // Suppose browser stretches SVG to 1400px wide (scaleX = 1050 / 1400 = 0.75) starting at left=100.
    const svgRectLeft = 100;
    const svgRectWidth = 1400;
    const svgViewBoxWidth = 1050;
    const marginLeft = 65;
    const plotWidth = 955;
    const barCount = 72;

    // Clicking inside left Y-axis margin must return null
    assert.equal(
      mapClientXToBarIndex({
        clientX: svgRectLeft + 20,
        svgRectLeft,
        svgRectWidth,
        svgViewBoxWidth,
        marginLeft,
        plotWidth,
        barCount,
      }),
      null,
    );

    // Clicking exact center of bar #0 (index 0) and bar #71 (index 71)
    for (const targetIdx of [0, 17, 35, 71]) {
      const slotCenterSvgX = marginLeft + (targetIdx + 0.5) * (plotWidth / barCount);
      const clientX = svgRectLeft + (slotCenterSvgX / svgViewBoxWidth) * svgRectWidth;
      assert.equal(
        mapClientXToBarIndex({
          clientX,
          svgRectLeft,
          svgRectWidth,
          svgViewBoxWidth,
          marginLeft,
          plotWidth,
          barCount,
        }),
        targetIdx,
      );
    }

    // Clicking past right plot edge must return null
    assert.equal(
      mapClientXToBarIndex({
        clientX: svgRectLeft + svgRectWidth - 5,
        svgRectLeft,
        svgRectWidth,
        svgViewBoxWidth,
        marginLeft,
        plotWidth,
        barCount,
      }),
      null,
    );
  });

  it("positions tooltip beside the hovered bar and flips cleanly near the right edge", () => {
    const leftEdgeTooltip = computeTooltipLeftPx({
      barCenterSvgX: 100,
      svgViewBoxWidth: 1050,
      svgRectLeft: 0,
      svgRectWidth: 1050,
      containerRectLeft: 0,
      containerWidth: 1050,
      containerScrollLeft: 0,
      tooltipWidth: 280,
    });
    assert.equal(leftEdgeTooltip, 114);

    const rightEdgeTooltip = computeTooltipLeftPx({
      barCenterSvgX: 1000,
      svgViewBoxWidth: 1050,
      svgRectLeft: 0,
      svgRectWidth: 1050,
      containerRectLeft: 0,
      containerWidth: 1050,
      containerScrollLeft: 0,
      tooltipWidth: 280,
    });
    assert.equal(rightEdgeTooltip, 706);
  });

  it("strips long parenthetical suffixes for compact non-overlapping X-axis labels", () => {
    assert.equal(
      formatCompactXAxisLabel({
        relativeMonthLabel: "M1 (Pregnancy Positive)",
        relativeBirthLabel: "M1 (Pregnancy Positive)",
        month: 9,
      } as unknown as Parameters<typeof formatCompactXAxisLabel>[0]),
      "M1",
    );
    assert.equal(
      formatCompactXAxisLabel({
        relativeMonthLabel: "M9 (Birth 1)",
        relativeBirthLabel: "M9 (Birth 1)",
        month: 17,
      } as unknown as Parameters<typeof formatCompactXAxisLabel>[0]),
      "M9",
    );
  });
});
