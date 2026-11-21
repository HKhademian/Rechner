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
  toEuroAmount,
  TimelineTimeRangeFilter,
  toMonthSimRef,
} from "#engine/types";
import "./TimelineChart.css";

function formatCurrency(amount: number, maximumFractionDigits = 0): string {
  return formatEur(amount || 0, maximumFractionDigits);
}

/**
 * Toggle Visibility State for Interactive Timeline Chart Series.
 */
interface VisibleSeriesState {
  /** Husband's earned take-home salary series. */
  husbandSalary: boolean;
  /** Wife's earned take-home salary series. */
  wifeSalary: boolean;
  /** Maternity protection benefit series. */
  mutterschutz: boolean;
  /** Mother's parental allowance series. */
  wifeElterngeld: boolean;
  /** Father's parental allowance series. */
  husbandElterngeld: boolean;
  /** Child benefit (Kindergeld) series. */
  kindergeld: boolean;
  /** Annual tax reconciliation refund series. */
  taxRefund: boolean;
}

/**
 * Interactive Timeline Chart Tooltip Hover State.
 */
interface TooltipState {
  /** Monthly ledger snapshot for hovered data point. */
  month: TimelineMonth;
  /** Chart SVG container relative X coordinate. */
  x: number;
  /** Chart SVG container relative Y coordinate. */
  y: number;
  /** Viewport client X coordinate. */
  clientX: number;
  /** Viewport client Y coordinate. */
  clientY: number;
}

interface SeriesMetadata {
  readonly key: keyof VisibleSeriesState;
  readonly label: string;
  readonly tooltipLabel: string;
  readonly statutory: string;
  readonly color: string;
  readonly seriesClass: string;
  readonly tooltipToneClass?: string;
  readonly prefixPlus?: boolean;
}

export default function TimelineChart(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipState, setTooltipState] = useState<TooltipState | null>(null);

  // Series visibility state for interactive on/off toggling
  const [visibleSeries, setVisibleSeries] = useState<VisibleSeriesState>({
    husbandSalary: true,
    wifeSalary: true,
    mutterschutz: true,
    wifeElterngeld: true,
    husbandElterngeld: true,
    kindergeld: true,
    taxRefund: true,
  });

  const mode = chartMode.value;
  const filter = timeRangeFilter.value;

  const currentData = currentScenarioData.value;
  const aData = scenarioAData.value;
  const bData = scenarioBData.value;
  const cData = scenarioCData.value;

  // Reference the initial baseline ledger salaries, excluding benefits and one-off cash.
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

  // Toggle single series
  const toggleSeries = (key: keyof VisibleSeriesState): void => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle all series
  const setAllSeries = (val: boolean): void => {
    setVisibleSeries({
      husbandSalary: val,
      wifeSalary: val,
      mutterschutz: val,
      wifeElterngeld: val,
      husbandElterngeld: val,
      kindergeld: val,
      taxRefund: val,
    });
  };

  // Filter months according to active time range
  let displayedMonths = currentData.months;
  if (filter === TimelineTimeRangeFilter.Child1) {
    displayedMonths = currentData.months.filter((m) => m.month <= 24);
  }
  else if (filter === TimelineTimeRangeFilter.Child2) {
    displayedMonths = currentData.months.filter(
      (m) => m.month >= 25 && m.month <= 48,
    );
  }
  else if (filter === TimelineTimeRangeFilter.Post) {
    displayedMonths = currentData.months.filter((m) => m.month >= 49);
  }

  // Calculate dynamic active sum for each month based on visible series
  const getMonthActiveTotal = (m: TimelineMonth): number => {
    let total = 0;
    if (visibleSeries.husbandSalary) {
      total += m.husbandSalary || 0;
    }
    if (visibleSeries.wifeSalary) {
      total += m.wifeSalary || 0;
    }
    if (visibleSeries.mutterschutz) {
      total += m.mutterschutz || 0;
    }
    if (visibleSeries.wifeElterngeld) {
      total += m.wifeElterngeld || 0;
    }
    if (visibleSeries.husbandElterngeld) {
      total += m.husbandElterngeld || 0;
    }
    if (visibleSeries.kindergeld) {
      total += m.kindergeld || 0;
    }
    if (visibleSeries.taxRefund) {
      total += m.taxRefund || 0;
    }
    return total;
  };

  // Dimensions
  const svgWidth = 1050;
  const svgHeight = 440;
  const margin = {
    top: 40,
    right: 30,
    bottom: 55,
    left: 65,
  };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Max scale Y calculation based on active series and modes
  const maxMonthValue = Math.max(
    6000,
    referenceSalary ?? 0,
    ...displayedMonths.map((m) => getMonthActiveTotal(m)),
    ...cData.months.map((m) => m.monthlyTotal),
  );
  const yMax = Math.max(2000, Math.ceil(maxMonthValue / 1000) * 1000 + 500);

  // X scale mapping
  const numBars = displayedMonths.length;
  const barSlotWidth = plotWidth / numBars;
  const barWidth = Math.max(6, barSlotWidth * 0.72);

  // Y Scale function
  const scaleY = (val: number): number =>
    plotHeight - (val / yMax) * plotHeight;

  // Colors bound to institutional CSS tokens for full light/dark and palette support
  const colors = {
    husbandSalary: "var(--series-salary-husband)",
    wifeSalary: "var(--series-salary-wife)",
    mutterschutz: "var(--series-mutterschutz)",
    wifeElterngeld: "var(--series-elterngeld-mother)",
    husbandElterngeld: "var(--series-elterngeld-father)",
    kindergeld: "var(--series-kindergeld)",
    taxRefund: "var(--series-tax-refund)",
  };

  const seriesMeta: readonly SeriesMetadata[] = [
    {
      key: "husbandSalary",
      label: "Husband Salary",
      tooltipLabel: "Husband Net Salary:",
      statutory: "Gehalt Mann",
      color: colors.husbandSalary,
      seriesClass: "timeline-chart__series--husband-salary",
    },
    {
      key: "wifeSalary",
      label: "Wife Salary",
      tooltipLabel: "Wife Net Salary:",
      statutory: "Gehalt Frau",
      color: colors.wifeSalary,
      seriesClass: "timeline-chart__series--wife-salary",
    },
    {
      key: "mutterschutz",
      label: "Maternity (Mutterschutz)",
      tooltipLabel: "Maternity Pay (MuSchG):",
      statutory: "MuSchG",
      color: colors.mutterschutz,
      seriesClass: "timeline-chart__series--mutterschutz",
    },
    {
      key: "wifeElterngeld",
      label: "ElterngeldPlus (Mother)",
      tooltipLabel: "ElterngeldPlus (Mother / § 4 BEEG):",
      statutory: "§ 4 BEEG",
      color: colors.wifeElterngeld,
      seriesClass: "timeline-chart__series--wife-elterngeld",
      tooltipToneClass: "timeline-chart__tooltip-row--gain",
    },
    {
      key: "husbandElterngeld",
      label: "Partner Months (Partnermonate)",
      tooltipLabel: "Partner Months (Partnermonate, § 4 BEEG):",
      statutory: "§ 4 BEEG",
      color: colors.husbandElterngeld,
      seriesClass: "timeline-chart__series--husband-elterngeld",
      tooltipToneClass: "timeline-chart__tooltip-row--warning",
    },
    {
      key: "kindergeld",
      label: "Child Benefit (Kindergeld)",
      tooltipLabel: "Child Benefit (Kindergeld, § 66 EStG):",
      statutory: "§ 66 EStG",
      color: colors.kindergeld,
      seriesClass: "timeline-chart__series--kindergeld",
      tooltipToneClass: "timeline-chart__tooltip-row--loss",
    },
    {
      key: "taxRefund",
      label: "Tax Office Refund (Finanzamt)",
      tooltipLabel: "Tax Office Refund (Finanzamt, § 26b EStG):",
      statutory: "§ 26b EStG",
      color: colors.taxRefund,
      seriesClass: "timeline-chart__series--tax-refund",
      tooltipToneClass: "timeline-chart__tooltip-row--gain",
      prefixPlus: true,
    },
  ];

  // Handle Mouse Move for Tooltip
  const handleMouseMove = (e: JSX.TargetedMouseEvent<SVGSVGElement>): void => {
    if (!containerRef.current) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - margin.left;
    if (mouseX >= 0 && mouseX <= plotWidth) {
      const idx = Math.min(
        numBars - 1,
        Math.max(0, Math.floor(mouseX / barSlotWidth)),
      );
      const mData = displayedMonths[idx];
      setTooltipState({
        month: mData,
        x: margin.left + idx * barSlotWidth + barSlotWidth / 2,
        y: e.clientY - rect.top,
        clientX: e.clientX,
        clientY: e.clientY,
      });
      hoveredMonth.value = mData.month;
    }
  };

  const handleMouseLeave = (): void => {
    setTooltipState(null);
    hoveredMonth.value = null;
  };

  // Individual Field Line Path Generator
  const getFieldLinePath = (fieldKey: keyof VisibleSeriesState): string => {
    if (!visibleSeries[fieldKey]) {
      return "";
    }
    return displayedMonths.reduce((acc, m, i) => {
      const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
      const val = m[fieldKey] || 0;
      const y = margin.top + scaleY(val);
      return `${acc} ${i === 0 ? "M" : "L"} ${x} ${y}`;
    }, "");
  };

  // Comparison curves path generator for Compare mode
  const getComparePath = (scenarioDataset: ScenarioTimelineResult): string => {
    const subset = scenarioDataset.months.filter((m) =>
      displayedMonths.some((dm) => dm.month === m.month));
    if (subset.length === 0) {
      return "";
    }
    return subset.reduce((acc, m, i) => {
      const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
      const y = margin.top + scaleY(m.monthlyTotal);
      return `${acc} ${i === 0 ? "M" : "L"} ${x} ${y}`;
    }, "");
  };

  // Stacked Area generator for Area mode
  const getStackedAreaPath = (
    topFn: (m: TimelineMonth) => number,
    bottomFn: (m: TimelineMonth) => number,
  ): string => {
    if (displayedMonths.length === 0) {
      return "";
    }
    const topPoints = displayedMonths
      .map((m, i) => {
        const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
        const y = margin.top + scaleY(topFn(m));
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    const bottomPoints = displayedMonths
      .slice()
      .reverse()
      .map((m, i) => {
        const originalIdx = displayedMonths.length - 1 - i;
        const x = margin.left + originalIdx * barSlotWidth + barSlotWidth / 2;
        const y = margin.top + scaleY(bottomFn(m));
        return `L ${x} ${y}`;
      })
      .join(" ");

    return `${topPoints} ${bottomPoints} Z`;
  };

  return (
    <div className="ui-card timeline-chart">
      {/* Chart Top Header & Controls */}
      <div className="timeline-chart__header">
        <div>
          <h3 className="timeline-chart__title">
            Monthly Cash Inflow &amp; Benefits Timeline ({displayedMonths.length} Months)
          </h3>
          <p className="timeline-chart__subtitle">
            Monthly net salary, parental benefits, Kindergeld, and tax refunds.
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

        {/* View Mode Switcher */}
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

      {/* Series Visibility Toolbar (On/Off Controls) */}
      <div className="timeline-chart__toolbar">
        <div className="timeline-chart__toggles">
          <span className="timeline-chart__toggles-label">
            Series Toggles:
          </span>
          {seriesMeta.map((s) => {
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
      </div>

      {/* SVG Chart Plot Area */}
      <div ref={containerRef} className="timeline-chart__plot-wrap">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="timeline-chart__svg"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grid lines (Horizontal Y-Axis) */}
          {[0, 2000, 4000, 6000, 8000].map((tick) => {
            if (tick > yMax) {
              return null;
            }
            const y = margin.top + scaleY(tick);
            return (
              <g key={tick}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={svgWidth - margin.right}
                  y2={y}
                  stroke="var(--chart-grid-stroke)"
                  strokeDasharray="4 4"
                />
                <text
                  x={margin.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--text-muted)"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  €{tick}
                </text>
              </g>
            );
          })}

          {/* Year Background Bands & Vertical Separators */}
          {displayedMonths.map((m, i) => {
            const isYearStart = m.monthInYear === 1 && m.month !== 1;
            const x = margin.left + i * barSlotWidth;
            return isYearStart ? (
              <g key={`year-sep-${m.month}`}>
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={svgHeight - margin.bottom}
                  stroke="var(--border-medium)"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                <text
                  x={x + 4}
                  y={margin.top - 12}
                  fill="var(--text-muted)"
                  fontSize="11"
                  fontWeight="700"
                >
                  Year {m.year}
                </text>
              </g>
            ) : null;
          })}

          {/* Render Mode 1: STACKED BAR */}
          {mode === "stacked_bar" &&
            displayedMonths.map((m, i) => {
              const x =
                margin.left + i * barSlotWidth + (barSlotWidth - barWidth) / 2;
              const isHovered =
                tooltipState && tooltipState.month.month === m.month;

              let currentY = 0;

              const segments = [
                {
                  key: "husbandSalary",
                  val: visibleSeries.husbandSalary ? m.husbandSalary : 0,
                  fill: colors.husbandSalary,
                },
                {
                  key: "wifeSalary",
                  val: visibleSeries.wifeSalary ? m.wifeSalary : 0,
                  fill: colors.wifeSalary,
                },
                {
                  key: "mutterschutz",
                  val: visibleSeries.mutterschutz ? m.mutterschutz : 0,
                  fill: colors.mutterschutz,
                },
                {
                  key: "wifeElterngeld",
                  val: visibleSeries.wifeElterngeld ? m.wifeElterngeld : 0,
                  fill: colors.wifeElterngeld,
                },
                {
                  key: "husbandElterngeld",
                  val: visibleSeries.husbandElterngeld
                    ? m.husbandElterngeld
                    : 0,
                  fill: colors.husbandElterngeld,
                },
                {
                  key: "kindergeld",
                  val: visibleSeries.kindergeld ? m.kindergeld : 0,
                  fill: colors.kindergeld,
                },
                {
                  key: "taxRefund",
                  val: visibleSeries.taxRefund ? m.taxRefund : 0,
                  fill: colors.taxRefund,
                },
              ];

              return (
                <g key={m.monthId} opacity={isHovered ? 1 : 0.92}>
                  {isHovered && (
                    <rect
                      x={margin.left + i * barSlotWidth}
                      y={margin.top}
                      width={barSlotWidth}
                      height={plotHeight}
                      fill="var(--chart-hover-fill)"
                      rx="2"
                    />
                  )}
                  {segments.map((seg) => {
                    if (seg.val <= 0) {
                      return null;
                    }
                    const segHeight = (seg.val / yMax) * plotHeight;
                    const segY = margin.top + scaleY(currentY + seg.val);
                    currentY += seg.val;

                    return (
                      <rect
                        key={seg.key}
                        x={x}
                        y={segY}
                        width={barWidth}
                        height={Math.max(1, segHeight)}
                        fill={seg.fill}
                        rx="1"
                      />
                    );
                  })}
                </g>
              );
            })}

          {/* Render Mode 2: MULTI-LINE SERIES */}
          {mode === "lines" && (
            <g>
              {seriesMeta.map((s) => {
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
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Points on each month */}
                    {displayedMonths.map((m, i) => {
                      const val = m[s.key] || 0;
                      if (val <= 0) {
                        return null;
                      }
                      const cx =
                        margin.left + i * barSlotWidth + barSlotWidth / 2;
                      const cy = margin.top + scaleY(val);
                      const isHovered =
                        tooltipState && tooltipState.month.month === m.month;
                      return (
                        <circle
                          key={`point-${s.key}-${m.month}`}
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 4.5 : 2.5}
                          fill={s.color}
                          stroke="var(--bg-surface)"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Active Total Top Trend Line */}
              <path
                d={displayedMonths.reduce((acc, m, i) => {
                  const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
                  const y = margin.top + scaleY(getMonthActiveTotal(m));
                  return `${acc} ${i === 0 ? "M" : "L"} ${x} ${y}`;
                }, "")}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeDasharray="4 2"
              />
            </g>
          )}

          {/* Render Mode 3: AREA TREND */}
          {mode === "area" && (
            <g>
              {/* Layer 1: Husband Salary */}
              {visibleSeries.husbandSalary && (
                <path
                  d={getStackedAreaPath(
                    (m) => m.husbandSalary,
                    () => 0,
                  )}
                  fill={colors.husbandSalary}
                  opacity="0.85"
                />
              )}
              {/* Layer 2: Wife Salary */}
              {visibleSeries.wifeSalary && (
                <path
                  d={getStackedAreaPath(
                    (m) =>
                      (visibleSeries.husbandSalary ? m.husbandSalary : 0) +
                      m.wifeSalary,
                    (m) => (visibleSeries.husbandSalary ? m.husbandSalary : 0),
                  )}
                  fill={colors.wifeSalary}
                  opacity="0.85"
                />
              )}
              {/* Layer 3: Mutterschutz */}
              {visibleSeries.mutterschutz && (
                <path
                  d={getStackedAreaPath(
                    (m) =>
                      (visibleSeries.husbandSalary ? m.husbandSalary : 0) +
                      (visibleSeries.wifeSalary ? m.wifeSalary : 0) +
                      m.mutterschutz,
                    (m) =>
                      (visibleSeries.husbandSalary ? m.husbandSalary : 0) +
                      (visibleSeries.wifeSalary ? m.wifeSalary : 0),
                  )}
                  fill={colors.mutterschutz}
                  opacity="0.85"
                />
              )}
              {/* Layer 4: Wife Elterngeld */}
              {visibleSeries.wifeElterngeld && (
                <path
                  d={getStackedAreaPath(
                    (m) =>
                      (visibleSeries.husbandSalary ? m.husbandSalary : 0) +
                      (visibleSeries.wifeSalary ? m.wifeSalary : 0) +
                      (visibleSeries.mutterschutz ? m.mutterschutz : 0) +
                      m.wifeElterngeld,
                    (m) =>
                      (visibleSeries.husbandSalary ? m.husbandSalary : 0) +
                      (visibleSeries.wifeSalary ? m.wifeSalary : 0) +
                      (visibleSeries.mutterschutz ? m.mutterschutz : 0),
                  )}
                  fill={colors.wifeElterngeld}
                  opacity="0.85"
                />
              )}
              {/* Layer 5: Husband Elterngeld */}
              {visibleSeries.husbandElterngeld && (
                <path
                  d={getStackedAreaPath(
                    (m) =>
                      (visibleSeries.husbandSalary ? m.husbandSalary : 0) +
                      (visibleSeries.wifeSalary ? m.wifeSalary : 0) +
                      (visibleSeries.mutterschutz ? m.mutterschutz : 0) +
                      (visibleSeries.wifeElterngeld ? m.wifeElterngeld : 0) +
                      m.husbandElterngeld,
                    (m) =>
                      (visibleSeries.husbandSalary ? m.husbandSalary : 0) +
                      (visibleSeries.wifeSalary ? m.wifeSalary : 0) +
                      (visibleSeries.mutterschutz ? m.mutterschutz : 0) +
                      (visibleSeries.wifeElterngeld ? m.wifeElterngeld : 0),
                  )}
                  fill={colors.husbandElterngeld}
                  opacity="0.85"
                />
              )}
              {/* Layer 6: Kindergeld */}
              {visibleSeries.kindergeld && (
                <path
                  d={getStackedAreaPath(
                    (m) =>
                      (visibleSeries.husbandSalary ? m.husbandSalary : 0) +
                      (visibleSeries.wifeSalary ? m.wifeSalary : 0) +
                      (visibleSeries.mutterschutz ? m.mutterschutz : 0) +
                      (visibleSeries.wifeElterngeld ? m.wifeElterngeld : 0) +
                      (visibleSeries.husbandElterngeld
                        ? m.husbandElterngeld
                        : 0) +
                      m.kindergeld,
                    (m) =>
                      (visibleSeries.husbandSalary ? m.husbandSalary : 0) +
                      (visibleSeries.wifeSalary ? m.wifeSalary : 0) +
                      (visibleSeries.mutterschutz ? m.mutterschutz : 0) +
                      (visibleSeries.wifeElterngeld ? m.wifeElterngeld : 0) +
                      (visibleSeries.husbandElterngeld
                        ? m.husbandElterngeld
                        : 0),
                  )}
                  fill={colors.kindergeld}
                  opacity="0.85"
                />
              )}
              {/* Layer 7: Tax Refund */}
              {visibleSeries.taxRefund && (
                <path
                  d={getStackedAreaPath(
                    (m) => getMonthActiveTotal(m),
                    (m) => getMonthActiveTotal(m) - m.taxRefund,
                  )}
                  fill={colors.taxRefund}
                  opacity="0.85"
                />
              )}

              {/* Total Line Top Border */}
              <path
                d={displayedMonths.reduce((acc, m, i) => {
                  const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
                  const y = margin.top + scaleY(getMonthActiveTotal(m));
                  return `${acc} ${i === 0 ? "M" : "L"} ${x} ${y}`;
                }, "")}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
              />
            </g>
          )}

          {/* Render Mode 4: COMPARE SCENARIOS OVERLAY */}
          {mode === "compare" && (
            <g>
              {/* Scenario A (No Kids) */}
              <path
                d={getComparePath(aData)}
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />
              {/* Scenario B (Unoptimized) */}
              <path
                d={getComparePath(bData)}
                fill="none"
                stroke="var(--color-warning)"
                strokeWidth="2.5"
              />
              {/* Scenario C (Fully Optimized) */}
              <path
                d={getComparePath(cData)}
                fill="none"
                stroke="var(--color-gain)"
                strokeWidth="3.5"
              />
            </g>
          )}

          {/* Initial Scenario B salary benchmark; source is available above the chart. */}
          {referenceMonth && referenceSalary !== undefined && (
            <g>
              <line
                x1={margin.left}
                y1={margin.top + scaleY(referenceSalary)}
                x2={svgWidth - margin.right}
                y2={margin.top + scaleY(referenceSalary)}
                stroke="var(--border-medium)"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              <text
                x={svgWidth - margin.right - 5}
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

          {/* Bottom X-Axis (Month & Calendar Markers) */}
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
                    : 6;
            const isLabel =
              m.month === 1 || m.month % step === 0 || m.month === totalCount;
            const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
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
                  y={svgHeight - margin.bottom + 15}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {m.relativeMonthLabel || m.relativeBirthLabel}
                </text>
                <text
                  x={x}
                  y={svgHeight - margin.bottom + 25}
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

        {/* Custom Tooltip */}
        {tooltipState && (
          <div
            className="timeline-chart__tooltip"
            style={{
              left: `${Math.min(svgWidth - 280, Math.max(margin.left, tooltipState.x - 120))}px`,
            }}
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
                {formatCurrency(getMonthActiveTotal(tooltipState.month))}
              </span>
            </div>

            {tooltipState.month.eventTag && (
              <div className="timeline-chart__tooltip-event">
                <Badge tone={BadgeTone.Brand}>{tooltipState.month.eventTag}</Badge>
              </div>
            )}

            <div className="timeline-chart__tooltip-status">
              Status: <strong>{tooltipState.month.taxClassLabel}</strong>
            </div>

            <div className="timeline-chart__tooltip-list">
              {seriesMeta.map((series) => {
                const value = tooltipState.month[series.key];
                if (!visibleSeries[series.key] || value <= 0) {
                  return null;
                }
                return (
                  <div
                    key={series.key}
                    className={[
                      "timeline-chart__tooltip-row",
                      series.seriesClass,
                      series.tooltipToneClass ?? "",
                    ].filter(Boolean).join(" ")}
                  >
                    <span className="timeline-chart__tooltip-row-label">
                      <span className="timeline-chart__dot" />
                      {series.tooltipLabel}
                    </span>
                    <span className="timeline-chart__tooltip-row-val tabular-nums">
                      {series.prefixPlus ? "+" : ""}
                      {formatCurrency(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Legend Bar with Click-to-Toggle Actions */}
      <div className="timeline-chart__legend">
        {seriesMeta.map((s) => {
          const isVisible = visibleSeries[s.key];
          return (
            <button
              key={`legend-${s.key}`}
              type="button"
              aria-pressed={isVisible}
              onClick={() => toggleSeries(s.key)}
              className={[
                "timeline-chart__legend-btn",
                s.seriesClass,
                isVisible ? "" : "timeline-chart__legend-btn--hidden",
              ].filter(Boolean).join(" ")}
            >
              <span className="timeline-chart__legend-swatch" />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
