import type { JSX } from "preact";
import { useState, useRef } from "preact/hooks";
import {
  chartMode,
  timeRangeFilter,
  scenarioAData,
  scenarioBData,
  scenarioCData,
  currentScenarioData,
  hoveredMonth,
} from "#store/elterngeldStore";
import {
  TimelineChartMode,
  TimelineTimeRangeFilter,
  type TimelineMonth,
  type ScenarioTimelineResult,
} from "#engine/types";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
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
    displayedMonths = currentData.months.filter(
      (m) => (m.month as number) <= 24,
    );
  } else if (filter === TimelineTimeRangeFilter.Child2) {
    displayedMonths = currentData.months.filter(
      (m) => (m.month as number) >= 25 && (m.month as number) <= 48,
    );
  } else if (filter === TimelineTimeRangeFilter.Post) {
    displayedMonths = currentData.months.filter(
      (m) => (m.month as number) >= 49,
    );
  }

  // Calculate dynamic active sum for each month based on visible series
  const getMonthActiveTotal = (m: TimelineMonth): number => {
    let total = 0;
    if (visibleSeries.husbandSalary) {
      total += (m.husbandSalary as number) || 0;
    }
    if (visibleSeries.wifeSalary) {
      total += (m.wifeSalary as number) || 0;
    }
    if (visibleSeries.mutterschutz) {
      total += (m.mutterschutz as number) || 0;
    }
    if (visibleSeries.wifeElterngeld) {
      total += (m.wifeElterngeld as number) || 0;
    }
    if (visibleSeries.husbandElterngeld) {
      total += (m.husbandElterngeld as number) || 0;
    }
    if (visibleSeries.kindergeld) {
      total += (m.kindergeld as number) || 0;
    }
    if (visibleSeries.taxRefund) {
      total += (m.taxRefund as number) || 0;
    }
    return total;
  };

  // Dimensions
  const svgWidth = 1050;
  const svgHeight = 440;
  const margin = { top: 40, right: 30, bottom: 55, left: 65 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Max scale Y calculation based on active series and modes
  const maxMonthValue = Math.max(
    6000,
    ...displayedMonths.map((m) => getMonthActiveTotal(m)),
    ...cData.months.map((m) => m.monthlyTotal as number),
  );
  const yMax = Math.max(2000, Math.ceil(maxMonthValue / 1000) * 1000 + 500);

  // X scale mapping
  const numBars = displayedMonths.length;
  const barSlotWidth = plotWidth / numBars;
  const barWidth = Math.max(6, barSlotWidth * 0.72);

  // Y Scale function
  const scaleY = (val: number): number =>
    plotHeight - (val / yMax) * plotHeight;

  // Colors (Institutional Professional Palette)
  const colors = {
    husbandSalary: "#1e3a8a", // Deep Navy Blue
    wifeSalary: "#4338ca", // Indigo
    mutterschutz: "#0284c7", // Sky Blue
    wifeElterngeld: "#059669", // Forest Green
    husbandElterngeld: "#0d9488", // Teal
    kindergeld: "#d97706", // Amber
    taxRefund: "#0891b2", // Cyan
  };

  const seriesMeta: {
    key: keyof VisibleSeriesState;
    label: string;
    statutory: string;
    color: string;
  }[] = [
    {
      key: "husbandSalary",
      label: "Husband Salary",
      statutory: "Gehalt Mann",
      color: colors.husbandSalary,
    },
    {
      key: "wifeSalary",
      label: "Wife Salary",
      statutory: "Gehalt Frau",
      color: colors.wifeSalary,
    },
    {
      key: "mutterschutz",
      label: "Maternity (*Mutterschutz*)",
      statutory: "MuSchG",
      color: colors.mutterschutz,
    },
    {
      key: "wifeElterngeld",
      label: "ElterngeldPlus (Mother)",
      statutory: "§ 4 BEEG",
      color: colors.wifeElterngeld,
    },
    {
      key: "husbandElterngeld",
      label: "Partner Months (*Partnermonate*)",
      statutory: "§ 4 BEEG",
      color: colors.husbandElterngeld,
    },
    {
      key: "kindergeld",
      label: "Child Benefit (*Kindergeld*)",
      statutory: "§ 66 EStG",
      color: colors.kindergeld,
    },
    {
      key: "taxRefund",
      label: "Tax Office Refund (*Finanzamt*)",
      statutory: "§ 26b EStG",
      color: colors.taxRefund,
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
      const val = (m[fieldKey as keyof TimelineMonth] as number) || 0;
      const y = margin.top + scaleY(val);
      return `${acc} ${i === 0 ? "M" : "L"} ${x} ${y}`;
    }, "");
  };

  // Comparison curves path generator for Compare mode
  const getComparePath = (scenarioDataset: ScenarioTimelineResult): string => {
    const subset = scenarioDataset.months.filter((m) =>
      displayedMonths.some((dm) => dm.month === m.month),
    );
    if (subset.length === 0) {
      return "";
    }
    return subset.reduce((acc, m, i) => {
      const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
      const y = margin.top + scaleY(m.monthlyTotal as number);
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
    <div
      className="glass-panel"
      style={{ padding: "24px", marginBottom: "28px", position: "relative" }}
    >
      {/* Chart Top Header & Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Monthly Cash Inflow & Benefits Timeline (60 Months)
          </h3>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              margin: "3px 0 0 0",
            }}
          >
            Interactive timeline with visible line curves, stacked cash flow,
            and toggleable statutory benefit series.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-surface-secondary)",
            padding: "3px",
            borderRadius: "var(--border-radius-sm)",
            border: "1px solid var(--border-subtle)",
            gap: "4px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => {
              chartMode.value = TimelineChartMode.StackedBar;
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "none",
              background:
                mode === TimelineChartMode.StackedBar
                  ? "var(--color-primary)"
                  : "transparent",
              color:
                mode === TimelineChartMode.StackedBar
                  ? "#ffffff"
                  : "var(--text-secondary)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow:
                mode === TimelineChartMode.StackedBar
                  ? "var(--shadow-sm)"
                  : "none",
              transition: "var(--transition)",
            }}
          >
            Stacked Bar
          </button>
          <button
            type="button"
            onClick={() => {
              chartMode.value = TimelineChartMode.Lines;
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "none",
              background:
                mode === TimelineChartMode.Lines
                  ? "var(--color-primary)"
                  : "transparent",
              color:
                mode === TimelineChartMode.Lines
                  ? "#ffffff"
                  : "var(--text-secondary)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow:
                mode === TimelineChartMode.Lines ? "var(--shadow-sm)" : "none",
              transition: "var(--transition)",
            }}
          >
            Multi-Line Series
          </button>
          <button
            type="button"
            onClick={() => {
              chartMode.value = TimelineChartMode.Area;
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "none",
              background:
                mode === TimelineChartMode.Area
                  ? "var(--color-primary)"
                  : "transparent",
              color:
                mode === TimelineChartMode.Area
                  ? "#ffffff"
                  : "var(--text-secondary)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow:
                mode === TimelineChartMode.Area ? "var(--shadow-sm)" : "none",
              transition: "var(--transition)",
            }}
          >
            Area Trend
          </button>
          <button
            type="button"
            onClick={() => {
              chartMode.value = TimelineChartMode.Compare;
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "none",
              background:
                mode === TimelineChartMode.Compare
                  ? "var(--color-primary)"
                  : "transparent",
              color:
                mode === TimelineChartMode.Compare
                  ? "#ffffff"
                  : "var(--text-secondary)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow:
                mode === TimelineChartMode.Compare
                  ? "var(--shadow-sm)"
                  : "none",
              transition: "var(--transition)",
            }}
          >
            Scenario Compare
          </button>
        </div>
      </div>

      {/* Series Visibility Toolbar (On/Off Controls) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
          padding: "10px 14px",
          background: "var(--bg-surface-secondary)",
          borderRadius: "var(--border-radius-sm)",
          border: "1px solid var(--border-subtle)",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Series Toggles:
          </span>
          {seriesMeta.map((s) => {
            const isVisible = visibleSeries[s.key];
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSeries(s.key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  border: isVisible
                    ? `1px solid ${s.color}`
                    : "1px solid var(--border-subtle)",
                  background: isVisible ? "var(--bg-surface)" : "transparent",
                  color: isVisible
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                  fontSize: "0.74rem",
                  fontWeight: isVisible ? 600 : 400,
                  cursor: "pointer",
                  boxShadow: isVisible ? "var(--shadow-sm)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: isVisible
                      ? s.color
                      : "var(--border-medium)",
                  }}
                ></span>
                <span>{s.label}</span>
                <span
                  style={{
                    fontSize: "0.66rem",
                    padding: "0 4px",
                    borderRadius: "2px",
                    background: isVisible ? s.color : "var(--border-medium)",
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
                >
                  {isVisible ? "ON" : "OFF"}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setAllSeries(true)}
            style={{
              padding: "3px 8px",
              borderRadius: "4px",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-surface)",
              color: "var(--color-primary)",
              fontSize: "0.7rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            All On
          </button>
          <button
            type="button"
            onClick={() => setAllSeries(false)}
            style={{
              padding: "3px 8px",
              borderRadius: "4px",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-surface)",
              color: "var(--text-muted)",
              fontSize: "0.7rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            All Off
          </button>
        </div>
      </div>

      {/* SVG Chart Plot Area */}
      <div
        ref={containerRef}
        style={{ position: "relative", width: "100%", overflowX: "auto" }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            width: "100%",
            height: "auto",
            minWidth: "850px",
            display: "block",
          }}
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
                  stroke="rgba(148, 163, 184, 0.25)"
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
            const isYearStart =
              (m.monthInYear as number) === 1 && (m.month as number) !== 1;
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
                  val: visibleSeries.husbandSalary
                    ? (m.husbandSalary as number)
                    : 0,
                  fill: colors.husbandSalary,
                },
                {
                  key: "wifeSalary",
                  val: visibleSeries.wifeSalary ? (m.wifeSalary as number) : 0,
                  fill: colors.wifeSalary,
                },
                {
                  key: "mutterschutz",
                  val: visibleSeries.mutterschutz
                    ? (m.mutterschutz as number)
                    : 0,
                  fill: colors.mutterschutz,
                },
                {
                  key: "wifeElterngeld",
                  val: visibleSeries.wifeElterngeld
                    ? (m.wifeElterngeld as number)
                    : 0,
                  fill: colors.wifeElterngeld,
                },
                {
                  key: "husbandElterngeld",
                  val: visibleSeries.husbandElterngeld
                    ? (m.husbandElterngeld as number)
                    : 0,
                  fill: colors.husbandElterngeld,
                },
                {
                  key: "kindergeld",
                  val: visibleSeries.kindergeld ? (m.kindergeld as number) : 0,
                  fill: colors.kindergeld,
                },
                {
                  key: "taxRefund",
                  val: visibleSeries.taxRefund ? (m.taxRefund as number) : 0,
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
                      fill="rgba(59, 130, 246, 0.08)"
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
                      const val =
                        (m[s.key as keyof TimelineMonth] as number) || 0;
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
                    (m) => m.husbandSalary as number,
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
                      (visibleSeries.husbandSalary
                        ? (m.husbandSalary as number)
                        : 0) + (m.wifeSalary as number),
                    (m) =>
                      visibleSeries.husbandSalary
                        ? (m.husbandSalary as number)
                        : 0,
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
                      (visibleSeries.husbandSalary
                        ? (m.husbandSalary as number)
                        : 0) +
                      (visibleSeries.wifeSalary
                        ? (m.wifeSalary as number)
                        : 0) +
                      (m.mutterschutz as number),
                    (m) =>
                      (visibleSeries.husbandSalary
                        ? (m.husbandSalary as number)
                        : 0) +
                      (visibleSeries.wifeSalary ? (m.wifeSalary as number) : 0),
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
                      (visibleSeries.husbandSalary
                        ? (m.husbandSalary as number)
                        : 0) +
                      (visibleSeries.wifeSalary
                        ? (m.wifeSalary as number)
                        : 0) +
                      (visibleSeries.mutterschutz
                        ? (m.mutterschutz as number)
                        : 0) +
                      (m.wifeElterngeld as number),
                    (m) =>
                      (visibleSeries.husbandSalary
                        ? (m.husbandSalary as number)
                        : 0) +
                      (visibleSeries.wifeSalary
                        ? (m.wifeSalary as number)
                        : 0) +
                      (visibleSeries.mutterschutz
                        ? (m.mutterschutz as number)
                        : 0),
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
                      (visibleSeries.husbandSalary
                        ? (m.husbandSalary as number)
                        : 0) +
                      (visibleSeries.wifeSalary
                        ? (m.wifeSalary as number)
                        : 0) +
                      (visibleSeries.mutterschutz
                        ? (m.mutterschutz as number)
                        : 0) +
                      (visibleSeries.wifeElterngeld
                        ? (m.wifeElterngeld as number)
                        : 0) +
                      (m.husbandElterngeld as number),
                    (m) =>
                      (visibleSeries.husbandSalary
                        ? (m.husbandSalary as number)
                        : 0) +
                      (visibleSeries.wifeSalary
                        ? (m.wifeSalary as number)
                        : 0) +
                      (visibleSeries.mutterschutz
                        ? (m.mutterschutz as number)
                        : 0) +
                      (visibleSeries.wifeElterngeld
                        ? (m.wifeElterngeld as number)
                        : 0),
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
                      (visibleSeries.husbandSalary
                        ? (m.husbandSalary as number)
                        : 0) +
                      (visibleSeries.wifeSalary
                        ? (m.wifeSalary as number)
                        : 0) +
                      (visibleSeries.mutterschutz
                        ? (m.mutterschutz as number)
                        : 0) +
                      (visibleSeries.wifeElterngeld
                        ? (m.wifeElterngeld as number)
                        : 0) +
                      (visibleSeries.husbandElterngeld
                        ? (m.husbandElterngeld as number)
                        : 0) +
                      (m.kindergeld as number),
                    (m) =>
                      (visibleSeries.husbandSalary
                        ? (m.husbandSalary as number)
                        : 0) +
                      (visibleSeries.wifeSalary
                        ? (m.wifeSalary as number)
                        : 0) +
                      (visibleSeries.mutterschutz
                        ? (m.mutterschutz as number)
                        : 0) +
                      (visibleSeries.wifeElterngeld
                        ? (m.wifeElterngeld as number)
                        : 0) +
                      (visibleSeries.husbandElterngeld
                        ? (m.husbandElterngeld as number)
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
                    (m) => getMonthActiveTotal(m) - (m.taxRefund as number),
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

          {/* Baseline Net Salary Reference Line (€6,125) */}
          <line
            x1={margin.left}
            y1={margin.top + scaleY(6125)}
            x2={svgWidth - margin.right}
            y2={margin.top + scaleY(6125)}
            stroke="var(--border-medium)"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
          <text
            x={svgWidth - margin.right - 5}
            y={margin.top + scaleY(6125) - 6}
            fill="var(--text-muted)"
            fontSize="10"
            textAnchor="end"
            fontFamily="monospace"
          >
            Baseline Net Inflow (€6,125 / mo)
          </text>

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
              (m.month as number) === 1 ||
              (m.month as number) % step === 0 ||
              (m.month as number) === totalCount;
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
            style={{
              position: "absolute",
              left: `${Math.min(svgWidth - 280, Math.max(margin.left, tooltipState.x - 120))}px`,
              top: "20px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--border-radius-sm)",
              padding: "12px 16px",
              minWidth: "250px",
              pointerEvents: "none",
              zIndex: 30,
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: "4px",
              }}
            >
              <div>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "0.88rem",
                    color: "var(--text-primary)",
                  }}
                >
                  {tooltipState.month.relativeMonthLabel ||
                    tooltipState.month.relativeBirthLabel}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-primary)",
                    marginLeft: "6px",
                    fontWeight: 600,
                  }}
                >
                  ({tooltipState.month.calendarLabel}) ·{" "}
                  {tooltipState.month.monthId}
                </span>
                <div
                  style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}
                >
                  {tooltipState.month.monthSimRef ||
                    `Sim${tooltipState.month.month}`}{" "}
                  · Year {tooltipState.month.year}
                </div>
              </div>
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: 800,
                  color: "var(--color-primary)",
                  fontSize: "0.95rem",
                }}
              >
                {formatCurrency(getMonthActiveTotal(tooltipState.month))}
              </span>
            </div>

            {tooltipState.month.eventTag && (
              <div className="badge-brand" style={{ marginBottom: "8px" }}>
                {tooltipState.month.eventTag}
              </div>
            )}

            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Status:{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                {tooltipState.month.taxClassLabel}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "3px",
                fontSize: "0.75rem",
              }}
            >
              {visibleSeries.husbandSalary &&
                (tooltipState.month.husbandSalary as number) > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: colors.husbandSalary,
                        }}
                      ></span>
                      Husband Net Salary:
                    </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {formatCurrency(
                        tooltipState.month.husbandSalary as number,
                      )}
                    </span>
                  </div>
                )}
              {visibleSeries.wifeSalary &&
                (tooltipState.month.wifeSalary as number) > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: colors.wifeSalary,
                        }}
                      ></span>
                      Wife Net Salary:
                    </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {formatCurrency(tooltipState.month.wifeSalary as number)}
                    </span>
                  </div>
                )}
              {visibleSeries.mutterschutz &&
                (tooltipState.month.mutterschutz as number) > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: colors.mutterschutz,
                        }}
                      ></span>
                      Maternity Pay (*MuSchG*):
                    </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {formatCurrency(
                        tooltipState.month.mutterschutz as number,
                      )}
                    </span>
                  </div>
                )}
              {visibleSeries.wifeElterngeld &&
                (tooltipState.month.wifeElterngeld as number) > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "var(--color-gain)",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: colors.wifeElterngeld,
                        }}
                      ></span>
                      ElterngeldPlus (Mother / § 4 BEEG):
                    </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {formatCurrency(
                        tooltipState.month.wifeElterngeld as number,
                      )}
                    </span>
                  </div>
                )}
              {visibleSeries.husbandElterngeld &&
                (tooltipState.month.husbandElterngeld as number) > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "var(--color-warning)",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: colors.husbandElterngeld,
                        }}
                      ></span>
                      Partner Months (*Partnermonate* § 4 BEEG):
                    </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {formatCurrency(
                        tooltipState.month.husbandElterngeld as number,
                      )}
                    </span>
                  </div>
                )}
              {visibleSeries.kindergeld &&
                (tooltipState.month.kindergeld as number) > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "var(--color-loss)",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: colors.kindergeld,
                        }}
                      ></span>
                      Child Benefit (*Kindergeld* § 66 EStG):
                    </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {formatCurrency(tooltipState.month.kindergeld as number)}
                    </span>
                  </div>
                )}
              {visibleSeries.taxRefund &&
                (tooltipState.month.taxRefund as number) > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "var(--color-gain)",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: colors.taxRefund,
                        }}
                      ></span>
                      Tax Office Refund (*Finanzamt* § 26b EStG):
                    </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      +{formatCurrency(tooltipState.month.taxRefund as number)}
                    </span>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Legend Bar with Click-to-Toggle Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginTop: "18px",
          fontSize: "0.78rem",
          color: "var(--text-secondary)",
        }}
      >
        {seriesMeta.map((s) => {
          const isVisible = visibleSeries[s.key];
          return (
            <button
              key={`legend-${s.key}`}
              type="button"
              onClick={() => toggleSeries(s.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border: "none",
                color: isVisible ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
                opacity: isVisible ? 1 : 0.45,
                transition: "opacity 0.15s ease",
                textDecoration: isVisible ? "none" : "line-through",
              }}
            >
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "3px",
                  background: s.color,
                }}
              ></span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
