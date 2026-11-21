import type {
  JSX,
} from "preact";
import {
  useState,
  useRef,
} from "preact/hooks";
import {
  Badge,
  BadgeTone,
} from "#components/ui/Badge";
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from "#components/ui/Button";
import {
  Disclosure,
} from "#components/ui/Disclosure";
import {
  SegmentedControl,
} from "#components/ui/SegmentedControl";
import {
  TIMELINE_CHART_MODE_OPTIONS,
} from "#utils/timelineChartControls";
import {
  TIMELINE_CHART_SERIES_ORDER,
  TimelineChartSeriesKey,
  computeChartYAxisScale,
  computeStackedBarSegments,
  computeTooltipLeftPx,
  createUniformSeriesVisibility,
  formatCompactXAxisLabel,
  getMonthActiveSeriesTotals,
  getMonthSeriesValue,
  mapClientXToBarIndex,
  valueToPlotY,
} from "#utils/timelineChartGeometry";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  chartMode,
  timeRangeFilter,
  scenarioAData,
  scenarioBData,
  scenarioCData,
  currentScenarioData,
  hoveredMonth,
} from "#store/elterngeldStore";
import LawRefLink from "#components/laws/LawRefLink";
import {
  LawGroupId,
  LawId,
} from "#engine/laws/types";
import {
  type TimelineMonth,
  type ScenarioTimelineResult,
  TimelineChartMode,
  TimelineTimeRangeFilter,
  toEuroAmount,
  toMonthSimRef,
} from "#engine/types";
import "./TimelineChart.css";

function formatCurrency(amount: number, maximumFractionDigits = 0): string {
  return formatEur(amount || 0, maximumFractionDigits);
}

interface TooltipState {
  readonly index: number;
  readonly month: TimelineMonth;
  readonly barCenterSvgX: number;
  readonly leftPx: number;
}

interface SeriesMetadata {
  readonly key: TimelineChartSeriesKey;
  readonly label: string;
  readonly tooltipLabel: string;
  readonly color: string;
  readonly seriesClass: string;
  readonly tooltipToneClass?: string;
}

const SERIES_META_BY_KEY: Readonly<Record<TimelineChartSeriesKey, SeriesMetadata>> = Object.freeze({
  [TimelineChartSeriesKey.HusbandSalary]: Object.freeze({
    key: TimelineChartSeriesKey.HusbandSalary,
    label: "Husband Salary",
    tooltipLabel: "Husband Net Salary:",
    color: "var(--series-salary-husband)",
    seriesClass: "timeline-chart__series--husband-salary",
  }),
  [TimelineChartSeriesKey.WifeSalary]: Object.freeze({
    key: TimelineChartSeriesKey.WifeSalary,
    label: "Wife Salary",
    tooltipLabel: "Wife Net Salary:",
    color: "var(--series-salary-wife)",
    seriesClass: "timeline-chart__series--wife-salary",
  }),
  [TimelineChartSeriesKey.Mutterschutz]: Object.freeze({
    key: TimelineChartSeriesKey.Mutterschutz,
    label: "Maternity (Mutterschutz)",
    tooltipLabel: "Maternity Pay (MuSchG):",
    color: "var(--series-mutterschutz)",
    seriesClass: "timeline-chart__series--mutterschutz",
  }),
  [TimelineChartSeriesKey.WifeElterngeld]: Object.freeze({
    key: TimelineChartSeriesKey.WifeElterngeld,
    label: "Elterngeld (Mother)",
    tooltipLabel: "Elterngeld (Mother / §§ 4, 4a BEEG):",
    color: "var(--series-elterngeld-mother)",
    seriesClass: "timeline-chart__series--wife-elterngeld",
    tooltipToneClass: "timeline-chart__tooltip-row--gain",
  }),
  [TimelineChartSeriesKey.HusbandElterngeld]: Object.freeze({
    key: TimelineChartSeriesKey.HusbandElterngeld,
    label: "Partner Months (Father)",
    tooltipLabel: "Partner Months (Father / §§ 4, 4b BEEG):",
    color: "var(--series-elterngeld-father)",
    seriesClass: "timeline-chart__series--husband-elterngeld",
    tooltipToneClass: "timeline-chart__tooltip-row--warning",
  }),
  [TimelineChartSeriesKey.Kindergeld]: Object.freeze({
    key: TimelineChartSeriesKey.Kindergeld,
    label: "Child Benefit (Kindergeld)",
    tooltipLabel: "Child Benefit (Kindergeld, § 66 EStG):",
    color: "var(--series-kindergeld)",
    seriesClass: "timeline-chart__series--kindergeld",
  }),
  [TimelineChartSeriesKey.BonusesAndEvents]: Object.freeze({
    key: TimelineChartSeriesKey.BonusesAndEvents,
    label: "Bonuses & Events",
    tooltipLabel: "Bonuses & Special Events:",
    color: "var(--series-bonuses-events)",
    seriesClass: "timeline-chart__series--bonuses-events",
  }),
  [TimelineChartSeriesKey.TaxRefund]: Object.freeze({
    key: TimelineChartSeriesKey.TaxRefund,
    label: "Tax Settlement (Finanzamt)",
    tooltipLabel: "Tax Settlement (§ 36 EStG):",
    color: "var(--series-tax-refund)",
    seriesClass: "timeline-chart__series--tax-refund",
    tooltipToneClass: "timeline-chart__tooltip-row--gain",
  }),
});

const SERIES_META_BOTTOM_TO_TOP: readonly SeriesMetadata[] = Object.freeze(
  TIMELINE_CHART_SERIES_ORDER.map((key) => SERIES_META_BY_KEY[key]),
);

const SERIES_META_TOP_TO_BOTTOM: readonly SeriesMetadata[] = Object.freeze(
  [...SERIES_META_BOTTOM_TO_TOP].reverse(),
);

const TOOLTIP_WIDTH_PX = 280;

export default function TimelineChart(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipState, setTooltipState] = useState<TooltipState | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<Record<TimelineChartSeriesKey, boolean>>(
    () => createUniformSeriesVisibility(true),
  );

  const mode = chartMode.value;
  const filter = timeRangeFilter.value;
  const isCompareMode = mode === TimelineChartMode.Compare;

  const currentData = currentScenarioData.value;
  const aData = scenarioAData.value;
  const bData = scenarioBData.value;
  const cData = scenarioCData.value;

  const referenceMonth = bData.months[0];
  const referenceProfile = bData.configuration?.taxProfiles.find(
    (profile) => profile.calendarYear === referenceMonth?.calendarYearNum,
  );
  const referenceSalary = referenceMonth
    ? toEuroAmount(referenceMonth.husbandSalary + referenceMonth.wifeSalary)
    : undefined;
  const referenceProvisional = referenceMonth !== undefined && (
    !referenceMonth.payroll ||
    [referenceMonth.payroll.husband, referenceMonth.payroll.wife].some(
      (payroll) => payroll.payrollLimitations.length > 0,
    )
  );

  const toggleSeries = (key: TimelineChartSeriesKey): void => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setAllSeries = (visible: boolean): void => {
    setVisibleSeries(createUniformSeriesVisibility(visible));
  };

  // Guarantee strict chronological X-axis order after filtering
  const filteredMonths =
    filter === TimelineTimeRangeFilter.Child1
      ? currentData.months.filter((m) => m.month <= 24)
      : filter === TimelineTimeRangeFilter.Child2
        ? currentData.months.filter((m) => m.month >= 25 && m.month <= 48)
        : filter === TimelineTimeRangeFilter.Post
          ? currentData.months.filter((m) => m.month >= 49)
          : currentData.months;
  const displayedMonths = [...filteredMonths].sort((a, b) => a.month - b.month);

  // Build O(1) lookup maps for Compare mode tooltips and curves
  const aByMonth = new Map(aData.months.map((m) => [m.month, m]));
  const bByMonth = new Map(bData.months.map((m) => [m.month, m]));
  const cByMonth = new Map(cData.months.map((m) => [m.month, m]));

  // SVG viewBox geometry
  const svgWidth = 1050;
  const svgHeight = 440;
  const margin = {
    top: 36,
    right: 28,
    bottom: 54,
    left: 72,
  };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Dynamic Y-axis bounds covering active series (positive + negative) and Compare mode
  let dataMin = 0;
  let dataMax = referenceSalary ?? 0;

  if (isCompareMode) {
    for (const m of displayedMonths) {
      for (const candidate of [
        aByMonth.get(m.month)?.monthlyTotal ?? 0,
        bByMonth.get(m.month)?.monthlyTotal ?? 0,
        cByMonth.get(m.month)?.monthlyTotal ?? 0,
      ]) {
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
    for (const m of displayedMonths) {
      const totals = getMonthActiveSeriesTotals(m, visibleSeries);
      if (totals.positiveTotal > dataMax) {
        dataMax = totals.positiveTotal;
      }
      if (totals.negativeTotal < dataMin) {
        dataMin = totals.negativeTotal;
      }
      if (mode === TimelineChartMode.Lines) {
        for (const key of TIMELINE_CHART_SERIES_ORDER) {
          if (!visibleSeries[key]) {
            continue;
          }
          const val = getMonthSeriesValue(m, key);
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

  const yAxisScale = computeChartYAxisScale(dataMin, dataMax, 5);
  const { yMin, yMax, ticks: yTicks } = yAxisScale;
  const scaleY = (val: number): number =>
    valueToPlotY(val, yMin, yMax, plotHeight);
  const zeroLineY = margin.top + scaleY(0);

  // X-axis slot geometry
  const numBars = displayedMonths.length;
  const barSlotWidth = numBars > 0 ? plotWidth / numBars : plotWidth;
  const barWidth = Math.max(4, Math.min(36, barSlotWidth * 0.74));

  // ViewBox-accurate pointer hit-testing
  const handleMouseMove = (e: JSX.TargetedMouseEvent<SVGSVGElement>): void => {
    const container = containerRef.current;
    if (!container || numBars === 0) {
      return;
    }
    const svgRect = e.currentTarget.getBoundingClientRect();
    const idx = mapClientXToBarIndex({
      clientX: e.clientX,
      svgRectLeft: svgRect.left,
      svgRectWidth: svgRect.width,
      svgViewBoxWidth: svgWidth,
      marginLeft: margin.left,
      plotWidth,
      barCount: numBars,
    });
    if (idx === null) {
      setTooltipState(null);
      hoveredMonth.value = null;
      return;
    }
    const mData = displayedMonths[idx];
    const barCenterSvgX = margin.left + (idx + 0.5) * barSlotWidth;
    const containerRect = container.getBoundingClientRect();
    const leftPx = computeTooltipLeftPx({
      barCenterSvgX,
      svgViewBoxWidth: svgWidth,
      svgRectLeft: svgRect.left,
      svgRectWidth: svgRect.width,
      containerRectLeft: containerRect.left,
      containerWidth: container.clientWidth,
      containerScrollLeft: container.scrollLeft,
      tooltipWidth: TOOLTIP_WIDTH_PX,
    });

    setTooltipState({
      index: idx,
      month: mData,
      barCenterSvgX,
      leftPx,
    });
    hoveredMonth.value = mData.month;
  };

  const handleMouseLeave = (): void => {
    setTooltipState(null);
    hoveredMonth.value = null;
  };

  // Line Series path generator
  const getFieldLinePath = (fieldKey: TimelineChartSeriesKey): string => {
    if (!visibleSeries[fieldKey] || displayedMonths.length === 0) {
      return "";
    }
    return displayedMonths
      .map((m, i) => {
        const x = margin.left + (i + 0.5) * barSlotWidth;
        const val = getMonthSeriesValue(m, fieldKey);
        const y = margin.top + scaleY(val);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  // Compare mode curve generator aligned strictly to displayedMonths
  const getComparePath = (scenarioDataset: ScenarioTimelineResult): string => {
    const lookup = new Map(scenarioDataset.months.map((m) => [m.month, m]));
    const points: string[] = [];
    displayedMonths.forEach((dm, i) => {
      const m = lookup.get(dm.month);
      if (!m) {
        return;
      }
      const x = margin.left + (i + 0.5) * barSlotWidth;
      const y = margin.top + scaleY(m.monthlyTotal);
      points.push(`${points.length === 0 ? "M" : "L"} ${x} ${y}`);
    });
    return points.join(" ");
  };

  // Stacked Area polygon generator using positive cumulative stacks in canonical order
  const buildPositiveAreaBands = (): ReadonlyArray<{
    readonly meta: SeriesMetadata;
    readonly path: string;
  }> => {
    if (displayedMonths.length === 0) {
      return [];
    }
    const cumulativeBottom = displayedMonths.map(() => 0);
    const bands: Array<{
      readonly meta: SeriesMetadata;
      readonly path: string;
    }> = [];

    for (const meta of SERIES_META_BOTTOM_TO_TOP) {
      if (!visibleSeries[meta.key]) {
        continue;
      }
      const topValues = displayedMonths.map((m, i) => {
        const val = Math.max(0, getMonthSeriesValue(m, meta.key));
        return cumulativeBottom[i] + val;
      });
      const hasPositiveArea = topValues.some((top, i) => top > cumulativeBottom[i]);
      if (hasPositiveArea) {
        const topEdge = topValues
          .map((top, i) => {
            const x = margin.left + (i + 0.5) * barSlotWidth;
            const y = margin.top + scaleY(top);
            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ");
        const bottomEdge = cumulativeBottom
          .slice()
          .reverse()
          .map((bottom, revIdx) => {
            const i = displayedMonths.length - 1 - revIdx;
            const x = margin.left + (i + 0.5) * barSlotWidth;
            const y = margin.top + scaleY(bottom);
            return `L ${x} ${y}`;
          })
          .join(" ");
        bands.push({
          meta,
          path: `${topEdge} ${bottomEdge} Z`,
        });
      }
      for (let i = 0; i < displayedMonths.length; i++) {
        cumulativeBottom[i] = topValues[i];
      }
    }
    return bands;
  };

  const hoveredCompareA = tooltipState ? aByMonth.get(tooltipState.month.month) : undefined;
  const hoveredCompareB = tooltipState ? bByMonth.get(tooltipState.month.month) : undefined;
  const hoveredCompareC = tooltipState ? cByMonth.get(tooltipState.month.month) : undefined;

  return (
    <div className="ui-card timeline-chart">
      {/* Chart Top Header & View Mode Switcher */}
      <div className="timeline-chart__header">
        <div>
          <h3 className="timeline-chart__title">
            Monthly Cash Inflow &amp; Benefits Timeline ({displayedMonths.length} Months)
          </h3>
          <p className="timeline-chart__subtitle">
            Monthly net salary, parental benefits, Kindergeld, bonuses/events, and tax settlements.
          </p>
          {referenceMonth && referenceSalary !== undefined && (
            <div className="timeline-chart__reference">
              <p className="timeline-chart__reference-line">
                Salary reference: {formatCurrency(referenceSalary, 2)} / month · Scenario B, {referenceMonth.calendarLabel}.
                {" "}Initial net salaries only; later pay, benefits and one-off cash may differ.
                {referenceProvisional && " Provisional payroll estimate."}
              </p>
              <Disclosure title="Inspect reference source" subtle>
                <div className="timeline-chart__reference-details">
                  <p>Scenario B ledger · {referenceMonth.monthId} · {referenceMonth.taxClassLabel}</p>
                  <p className="tabular-nums">
                    Husband {formatCurrency(referenceMonth.husbandSalary, 2)} + wife {formatCurrency(referenceMonth.wifeSalary, 2)} = {formatCurrency(referenceSalary, 2)}.
                    {" "}Benefits, bonuses and annual tax settlements are excluded from this salary benchmark.
                  </p>
                  {referenceProfile && (
                    <p>
                      <LawRefLink
                        lawId={LawId.BMF_PAP}
                        groupId={LawGroupId.EStG_PayrollWithholding}
                        label={`Official payroll rules · ${referenceProfile.sourceYear}`}
                      />
                      {referenceProfile.projected && ` · Projected to ${referenceProfile.calendarYear}`}
                      {referenceProvisional && " · Provisional values based on your supplied inputs."}
                    </p>
                  )}
                </div>
              </Disclosure>
            </div>
          )}
        </div>

        <SegmentedControl
          compact
          label="Timeline chart view"
          value={mode}
          options={TIMELINE_CHART_MODE_OPTIONS}
          onChange={(nextMode) => {
            chartMode.value = nextMode;
          }}
        />
      </div>

      {/* Single Unified Interactive Legend / Series Visibility Bar */}
      <div className="timeline-chart__toolbar">
        {isCompareMode ? (
          <div className="timeline-chart__compare-key" role="list" aria-label="Scenario comparison legend">
            <span className="timeline-chart__toggles-label">Scenarios:</span>
            <span className="timeline-chart__compare-item" role="listitem">
              <span className="timeline-chart__compare-swatch timeline-chart__compare-swatch--a" />
              <span>Status Quo (A · No Children)</span>
            </span>
            <span className="timeline-chart__compare-item" role="listitem">
              <span className="timeline-chart__compare-swatch timeline-chart__compare-swatch--b" />
              <span>Unoptimized Baseline (B)</span>
            </span>
            <span className="timeline-chart__compare-item" role="listitem">
              <span className="timeline-chart__compare-swatch timeline-chart__compare-swatch--c" />
              <span>Statutory Optimized (C)</span>
            </span>
          </div>
        ) : (
          <>
            <div className="timeline-chart__toggles">
              <span className="timeline-chart__toggles-label">
                Series:
              </span>
              {SERIES_META_BOTTOM_TO_TOP.map((s) => {
                const isVisible = visibleSeries[s.key];
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={isVisible}
                    onClick={() => toggleSeries(s.key)}
                    className={[
                      "timeline-chart__series-btn",
                      s.seriesClass,
                      isVisible ? "timeline-chart__series-btn--active" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <span className="timeline-chart__dot" />
                    <span>{s.label}</span>
                    <span className="timeline-chart__state-pill">
                      {isVisible ? "ON" : "OFF"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="timeline-chart__toolbar-actions">
              <Button
                size={ButtonSize.Sm}
                variant={ButtonVariant.Tint}
                onClick={() => setAllSeries(true)}
              >
                All On
              </Button>
              <Button
                size={ButtonSize.Sm}
                variant={ButtonVariant.Secondary}
                onClick={() => setAllSeries(false)}
              >
                All Off
              </Button>
            </div>
          </>
        )}
      </div>

      {/* SVG Chart Plot Area */}
      <div ref={containerRef} className="timeline-chart__plot-wrap">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="timeline-chart__svg"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Dynamic Horizontal Y-Axis Gridlines */}
          {yTicks.map((tick) => {
            const y = margin.top + scaleY(tick);
            const isZero = tick === 0;
            return (
              <g key={`y-tick-${tick}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={svgWidth - margin.right}
                  y2={y}
                  stroke={isZero ? "var(--border-medium)" : "var(--chart-grid-stroke)"}
                  strokeWidth={isZero ? "1.25" : "1"}
                  strokeDasharray={isZero ? undefined : "4 4"}
                />
                <text
                  x={margin.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--text-muted)"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  {formatCurrency(tick)}
                </text>
              </g>
            );
          })}

          {/* Year Boundary Vertical Separators */}
          {displayedMonths.map((m, i) => {
            const isYearStart = i > 0 && m.calendarMonthNum === 1;
            const x = margin.left + i * barSlotWidth;
            return isYearStart ? (
              <g key={`year-sep-${m.monthId}`}>
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={svgHeight - margin.bottom}
                  stroke="var(--border-medium)"
                  strokeWidth="1.25"
                  strokeDasharray="2 2"
                />
                <text
                  x={x + 4}
                  y={margin.top - 10}
                  fill="var(--text-muted)"
                  fontSize="11"
                  fontWeight="700"
                >
                  {m.calendarYearNum}
                </text>
              </g>
            ) : null;
          })}

          {/* Hover Highlight Band & Crosshair (Active Across All Modes) */}
          {tooltipState && (
            <g>
              <rect
                x={margin.left + tooltipState.index * barSlotWidth}
                y={margin.top}
                width={barSlotWidth}
                height={plotHeight}
                fill="var(--chart-hover-fill)"
                rx="2"
              />
              <line
                x1={tooltipState.barCenterSvgX}
                y1={margin.top}
                x2={tooltipState.barCenterSvgX}
                y2={svgHeight - margin.bottom}
                stroke="var(--color-primary)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.65"
              />
            </g>
          )}

          {/* Render Mode 1: STACKED BAR (Exact Conservation & Signed Stacking) */}
          {mode === TimelineChartMode.StackedBar &&
            displayedMonths.map((m, i) => {
              const x = margin.left + i * barSlotWidth + (barSlotWidth - barWidth) / 2;
              const isHovered = tooltipState !== null && tooltipState.month.month === m.month;
              const segments = computeStackedBarSegments(
                m,
                visibleSeries,
                yMin,
                yMax,
                plotHeight,
                margin.top,
              );

              return (
                <g key={m.monthId} opacity={isHovered ? 1 : 0.92}>
                  {segments.map((seg) => (
                    <rect
                      key={seg.key}
                      x={x}
                      y={seg.y}
                      width={barWidth}
                      height={seg.height}
                      fill={SERIES_META_BY_KEY[seg.key].color}
                    />
                  ))}
                </g>
              );
            })}

          {/* Render Mode 2: MULTI-LINE SERIES */}
          {mode === TimelineChartMode.Lines && (
            <g>
              {SERIES_META_BOTTOM_TO_TOP.map((s) => {
                const pathData = getFieldLinePath(s.key);
                if (!pathData) {
                  return null;
                }
                return (
                  <g key={`line-series-${s.key}`}>
                    <path
                      d={pathData}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {displayedMonths.map((m, i) => {
                      const val = getMonthSeriesValue(m, s.key);
                      if (val === 0) {
                        return null;
                      }
                      const cx = margin.left + (i + 0.5) * barSlotWidth;
                      const cy = margin.top + scaleY(val);
                      const isHovered =
                        tooltipState !== null && tooltipState.month.month === m.month;
                      return (
                        <circle
                          key={`point-${s.key}-${m.monthId}`}
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 4.5 : 2}
                          fill={s.color}
                          stroke="var(--bg-surface)"
                          strokeWidth="1.25"
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Active Net Total Trend Line */}
              <path
                d={displayedMonths
                  .map((m, i) => {
                    const x = margin.left + (i + 0.5) * barSlotWidth;
                    const y = margin.top + scaleY(getMonthActiveSeriesTotals(m, visibleSeries).netTotal);
                    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeDasharray="4 2"
              />
            </g>
          )}

          {/* Render Mode 3: STACKED AREA TREND */}
          {mode === TimelineChartMode.Area && (
            <g>
              {buildPositiveAreaBands().map(({ meta, path }) => (
                <path
                  key={`area-${meta.key}`}
                  d={path}
                  fill={meta.color}
                  opacity="0.85"
                />
              ))}

              {/* Active Net Total Line Overlay */}
              <path
                d={displayedMonths
                  .map((m, i) => {
                    const x = margin.left + (i + 0.5) * barSlotWidth;
                    const y = margin.top + scaleY(getMonthActiveSeriesTotals(m, visibleSeries).netTotal);
                    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.25"
              />
            </g>
          )}

          {/* Render Mode 4: COMPARE SCENARIOS OVERLAY */}
          {isCompareMode && (
            <g>
              <path
                d={getComparePath(aData)}
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2.25"
                strokeDasharray="4 4"
              />
              <path
                d={getComparePath(bData)}
                fill="none"
                stroke="var(--color-warning)"
                strokeWidth="2.5"
              />
              <path
                d={getComparePath(cData)}
                fill="none"
                stroke="var(--color-gain)"
                strokeWidth="3.25"
              />
            </g>
          )}

          {/* Reference Salary Benchmark Line */}
          {referenceMonth && referenceSalary !== undefined && (
            <g>
              <line
                x1={margin.left}
                y1={margin.top + scaleY(referenceSalary)}
                x2={svgWidth - margin.right}
                y2={margin.top + scaleY(referenceSalary)}
                stroke="var(--border-medium)"
                strokeWidth="1.25"
                strokeDasharray="6 3"
              />
              <text
                x={svgWidth - margin.right - 4}
                y={margin.top + scaleY(referenceSalary) - 6}
                fill="var(--text-muted)"
                fontSize="10"
                textAnchor="end"
                fontFamily="monospace"
              >
                Initial net salaries · B · {referenceMonth.calendarLabel}: {formatCurrency(referenceSalary, 2)} / mo
              </text>
            </g>
          )}

          {/* Zero Baseline Emphasized When Negative Values Exist */}
          {yMin < 0 && (
            <line
              x1={margin.left}
              y1={zeroLineY}
              x2={svgWidth - margin.right}
              y2={zeroLineY}
              stroke="var(--text-muted)"
              strokeWidth="1.5"
            />
          )}

          {/* Bottom X-Axis (Month & Calendar Markers Indexed by Display Position) */}
          <line
            x1={margin.left}
            y1={svgHeight - margin.bottom}
            x2={svgWidth - margin.right}
            y2={svgHeight - margin.bottom}
            stroke="var(--border-medium)"
            strokeWidth="1"
          />
          {displayedMonths.map((m, i) => {
            const totalCount = displayedMonths.length;
            const step =
              totalCount <= 12
                ? 1
                : totalCount <= 24
                  ? 2
                  : totalCount <= 36
                    ? 3
                    : totalCount <= 60
                      ? 6
                      : 6;
            const isFirst = i === 0;
            const isLast = i === totalCount - 1;
            const isRegularTick = i % step === 0 && totalCount - 1 - i >= Math.ceil(step / 2);
            const isLabel = isFirst || isLast || isRegularTick;
            const x = margin.left + (i + 0.5) * barSlotWidth;
            return isLabel ? (
              <g key={`x-tick-${m.monthId}`}>
                <line
                  x1={x}
                  y1={svgHeight - margin.bottom}
                  x2={x}
                  y2={svgHeight - margin.bottom + 5}
                  stroke="var(--text-muted)"
                />
                <text
                  x={x}
                  y={svgHeight - margin.bottom + 16}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {formatCompactXAxisLabel(m)}
                </text>
                <text
                  x={x}
                  y={svgHeight - margin.bottom + 27}
                  textAnchor="middle"
                  fill="var(--color-primary)"
                  fontSize="7.5"
                  fontFamily="monospace"
                >
                  {m.calendarLabel}
                </text>
              </g>
            ) : null;
          })}
        </svg>

        {/* Cursor-Aligned Tooltip (Top-to-Bottom Matching Visual Stack Order) */}
        {tooltipState && (
          <div
            className="timeline-chart__tooltip"
            style={{ left: `${tooltipState.leftPx}px` }}
          >
            <div className="timeline-chart__tooltip-header">
              <div>
                <span className="timeline-chart__tooltip-title">
                  {tooltipState.month.relativeMonthLabel ||
                    tooltipState.month.relativeBirthLabel}
                </span>
                <span className="timeline-chart__tooltip-calendar">
                  ({tooltipState.month.calendarLabel}) · {tooltipState.month.monthId}
                </span>
                <div className="timeline-chart__tooltip-meta">
                  {tooltipState.month.monthSimRef ||
                    toMonthSimRef(tooltipState.month.month)}{" "}
                  · Year {tooltipState.month.year}
                </div>
              </div>
              <span className="timeline-chart__tooltip-total tabular-nums">
                {formatCurrency(
                  isCompareMode
                    ? tooltipState.month.monthlyTotal
                    : getMonthActiveSeriesTotals(tooltipState.month, visibleSeries).netTotal,
                )}
              </span>
            </div>

            {tooltipState.month.eventTag && (
              <div className="timeline-chart__tooltip-event">
                <Badge tone={BadgeTone.Brand}>{tooltipState.month.eventTag}</Badge>
              </div>
            )}

            {isCompareMode ? (
              <div className="timeline-chart__tooltip-list">
                {hoveredCompareC && (
                  <div className="timeline-chart__tooltip-row timeline-chart__tooltip-row--gain">
                    <span className="timeline-chart__tooltip-row-label">
                      <span className="timeline-chart__compare-swatch timeline-chart__compare-swatch--c" />
                      Scenario C (Optimized):
                    </span>
                    <span className="timeline-chart__tooltip-row-val tabular-nums">
                      {formatCurrency(hoveredCompareC.monthlyTotal)}
                    </span>
                  </div>
                )}
                {hoveredCompareB && (
                  <div className="timeline-chart__tooltip-row timeline-chart__tooltip-row--warning">
                    <span className="timeline-chart__tooltip-row-label">
                      <span className="timeline-chart__compare-swatch timeline-chart__compare-swatch--b" />
                      Scenario B (Baseline):
                    </span>
                    <span className="timeline-chart__tooltip-row-val tabular-nums">
                      {formatCurrency(hoveredCompareB.monthlyTotal)}
                    </span>
                  </div>
                )}
                {hoveredCompareA && (
                  <div className="timeline-chart__tooltip-row">
                    <span className="timeline-chart__tooltip-row-label">
                      <span className="timeline-chart__compare-swatch timeline-chart__compare-swatch--a" />
                      Scenario A (Status Quo):
                    </span>
                    <span className="timeline-chart__tooltip-row-val tabular-nums">
                      {formatCurrency(hoveredCompareA.monthlyTotal)}
                    </span>
                  </div>
                )}
                {hoveredCompareB && hoveredCompareC && (
                  <div
                    className={[
                      "timeline-chart__tooltip-row",
                      hoveredCompareC.monthlyTotal - hoveredCompareB.monthlyTotal >= 0
                        ? "timeline-chart__tooltip-row--gain"
                        : "timeline-chart__tooltip-row--loss",
                    ].join(" ")}
                  >
                    <span className="timeline-chart__tooltip-row-label">
                      Δ C vs. B:
                    </span>
                    <span className="timeline-chart__tooltip-row-val tabular-nums">
                      {hoveredCompareC.monthlyTotal - hoveredCompareB.monthlyTotal >= 0 ? "+" : ""}
                      {formatCurrency(
                        hoveredCompareC.monthlyTotal - hoveredCompareB.monthlyTotal,
                      )}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="timeline-chart__tooltip-status">
                  Status: <strong>{tooltipState.month.taxClassLabel}</strong>
                </div>

                <div className="timeline-chart__tooltip-list">
                  {(() => {
                    const activeRows = SERIES_META_TOP_TO_BOTTOM.filter((series) => {
                      if (!visibleSeries[series.key]) {
                        return false;
                      }
                      return getMonthSeriesValue(tooltipState.month, series.key) !== 0;
                    });
                    if (activeRows.length === 0) {
                      return (
                        <div className="timeline-chart__tooltip-empty">
                          No visible cashflow series in this month.
                        </div>
                      );
                    }
                    return activeRows.map((series) => {
                      const value = getMonthSeriesValue(tooltipState.month, series.key);
                      const rowToneClass =
                        value < 0
                          ? "timeline-chart__tooltip-row--loss"
                          : series.tooltipToneClass ?? "";
                      return (
                        <div
                          key={series.key}
                          className={[
                            "timeline-chart__tooltip-row",
                            series.seriesClass,
                            rowToneClass,
                          ].filter(Boolean).join(" ")}
                        >
                          <span className="timeline-chart__tooltip-row-label">
                            <span className="timeline-chart__dot" />
                            {series.tooltipLabel}
                          </span>
                          <span className="timeline-chart__tooltip-row-val tabular-nums">
                            {value > 0 &&
                            (series.key === TimelineChartSeriesKey.TaxRefund ||
                              series.key === TimelineChartSeriesKey.BonusesAndEvents)
                              ? "+"
                              : ""}
                            {formatCurrency(value)}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
