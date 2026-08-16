import { useState, useRef } from 'preact/hooks';
import {
  activeScenario,
  chartMode,
  timeRangeFilter,
  scenarioAData,
  scenarioBData,
  scenarioCData,
  currentScenarioData,
  hoveredMonth
} from '../../store/elterngeldStore';

function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export default function TimelineChart() {
  const containerRef = useRef(null);
  const [tooltipState, setTooltipState] = useState(null);

  const scenarioKey = activeScenario.value;
  const mode = chartMode.value;
  const filter = timeRangeFilter.value;

  const currentData = currentScenarioData.value;
  const aData = scenarioAData.value;
  const bData = scenarioBData.value;
  const cData = scenarioCData.value;

  // Filter months according to active time range
  let displayedMonths = currentData.months;
  if (filter === 'child1') {
    displayedMonths = currentData.months.filter(m => m.month <= 24);
  } else if (filter === 'child2') {
    displayedMonths = currentData.months.filter(m => m.month >= 25 && m.month <= 48);
  } else if (filter === 'post') {
    displayedMonths = currentData.months.filter(m => m.month >= 49);
  }

  // Dimensions
  const svgWidth = 1050;
  const svgHeight = 440;
  const margin = { top: 40, right: 30, bottom: 55, left: 65 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Max scale Y calculation
  const maxMonthValue = Math.max(
    8000,
    ...displayedMonths.map(m => m.monthlyTotal),
    ...cData.months.map(m => m.monthlyTotal)
  );
  const yMax = Math.ceil(maxMonthValue / 1000) * 1000 + 500;

  // X scale mapping
  const numBars = displayedMonths.length;
  const barSlotWidth = plotWidth / numBars;
  const barWidth = Math.max(6, barSlotWidth * 0.72);

  // Y Scale function
  const scaleY = (val) => plotHeight - (val / yMax) * plotHeight;

  // Colors (Corporate Minimal Palette)
  const colors = {
    husbandSalary: '#1e40af',     // Corporate Navy Blue
    wifeSalary: '#0284c7',        // Steel Blue
    mutterschutz: '#475569',      // Slate Gray
    wifeElterngeld: '#15803d',    // Deep Forest Green
    husbandElterngeld: '#b45309', // Muted Bronze Amber
    kindergeld: '#991b1b',        // Dark Crimson Red
    taxRefund: '#0f766e'          // Petrol Teal
  };

  // Handle Mouse Move for Tooltip
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - margin.left;
    if (mouseX >= 0 && mouseX <= plotWidth) {
      const idx = Math.min(
        numBars - 1,
        Math.max(0, Math.floor(mouseX / barSlotWidth))
      );
      const mData = displayedMonths[idx];
      setTooltipState({
        month: mData,
        x: margin.left + idx * barSlotWidth + barSlotWidth / 2,
        y: e.clientY - rect.top,
        clientX: e.clientX,
        clientY: e.clientY
      });
      hoveredMonth.value = mData.month;
    }
  };

  const handleMouseLeave = () => {
    setTooltipState(null);
    hoveredMonth.value = null;
  };

  // Comparison curves path generator for Compare mode
  const getComparePath = (scenarioDataset) => {
    const subset = scenarioDataset.months.filter(m => displayedMonths.some(dm => dm.month === m.month));
    if (subset.length === 0) return '';
    return subset.reduce((acc, m, i) => {
      const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
      const y = margin.top + scaleY(m.monthlyTotal);
      return `${acc} ${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }, '');
  };

  // Stacked Area generator for Area mode
  const getStackedAreaPath = (topFn, bottomFn) => {
    if (displayedMonths.length === 0) return '';
    const topPoints = displayedMonths.map((m, i) => {
      const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
      const y = margin.top + scaleY(topFn(m));
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const bottomPoints = displayedMonths.slice().reverse().map((m, i) => {
      const originalIdx = displayedMonths.length - 1 - i;
      const x = margin.left + originalIdx * barSlotWidth + barSlotWidth / 2;
      const y = margin.top + scaleY(bottomFn(m));
      return `L ${x} ${y}`;
    }).join(' ');

    return `${topPoints} ${bottomPoints} Z`;
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px', position: 'relative' }}>
      {/* Chart Top Header & Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '18px'
      }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Monthly Cash Inflow & Benefits Timeline (60 Months)
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
            Interactive breakdown of working salaries, maternity pay, ElterngeldPlus, child benefits, and tax refunds.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div style={{
          display: 'flex',
          background: '#0f172a',
          padding: '3px',
          borderRadius: '6px',
          border: '1px solid #334155',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => chartMode.value = 'stacked_bar'}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: mode === 'stacked_bar' ? '#1e40af' : 'transparent',
              color: mode === 'stacked_bar' ? '#ffffff' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Stacked Bar
          </button>
          <button
            type="button"
            onClick={() => chartMode.value = 'area'}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: mode === 'area' ? '#1e40af' : 'transparent',
              color: mode === 'area' ? '#ffffff' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Area Trend
          </button>
          <button
            type="button"
            onClick={() => chartMode.value = 'compare'}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: mode === 'compare' ? '#1e40af' : 'transparent',
              color: mode === 'compare' ? '#ffffff' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Scenario Compare
          </button>
        </div>
      </div>

      {/* SVG Chart Plot Area */}
      <div ref={containerRef} style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', minWidth: '850px', display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grid lines (Horizontal Y-Axis) */}
          {[0, 2000, 4000, 6000, 8000].map((tick) => {
            if (tick > yMax) return null;
            const y = margin.top + scaleY(tick);
            return (
              <g key={tick}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={svgWidth - margin.right}
                  y2={y}
                  stroke="rgba(51, 65, 85, 0.4)"
                  strokeDasharray="4 4"
                />
                <text
                  x={margin.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
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
                  stroke="#334155"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                <text
                  x={x + 4}
                  y={margin.top - 12}
                  fill="#94a3b8"
                  fontSize="11"
                  fontWeight="700"
                >
                  Year {m.year}
                </text>
              </g>
            ) : null;
          })}

          {/* Render Mode: STACKED BAR */}
          {mode === 'stacked_bar' && displayedMonths.map((m, i) => {
            const x = margin.left + i * barSlotWidth + (barSlotWidth - barWidth) / 2;
            const isHovered = tooltipState && tooltipState.month.month === m.month;

            let currentY = 0;

            const segments = [
              { key: 'husbandSalary', val: m.husbandSalary, fill: colors.husbandSalary },
              { key: 'wifeSalary', val: m.wifeSalary, fill: colors.wifeSalary },
              { key: 'mutterschutz', val: m.mutterschutz, fill: colors.mutterschutz },
              { key: 'wifeElterngeld', val: m.wifeElterngeld, fill: colors.wifeElterngeld },
              { key: 'husbandElterngeld', val: m.husbandElterngeld, fill: colors.husbandElterngeld },
              { key: 'kindergeld', val: m.kindergeld, fill: colors.kindergeld },
              { key: 'taxRefund', val: m.taxRefund, fill: colors.taxRefund }
            ];

            return (
              <g key={m.month} opacity={isHovered ? 1 : 0.92}>
                {isHovered && (
                  <rect
                    x={margin.left + i * barSlotWidth}
                    y={margin.top}
                    width={barSlotWidth}
                    height={plotHeight}
                    fill="rgba(255, 255, 255, 0.04)"
                    rx="2"
                  />
                )}
                {segments.map((seg) => {
                  if (seg.val <= 0) return null;
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

          {/* Render Mode: AREA TREND */}
          {mode === 'area' && (
            <g>
              {/* Layer 1: Husband Salary */}
              <path
                d={getStackedAreaPath(
                  m => m.husbandSalary,
                  () => 0
                )}
                fill={colors.husbandSalary}
                opacity="0.85"
              />
              {/* Layer 2: Wife Salary */}
              <path
                d={getStackedAreaPath(
                  m => m.husbandSalary + m.wifeSalary,
                  m => m.husbandSalary
                )}
                fill={colors.wifeSalary}
                opacity="0.85"
              />
              {/* Layer 3: Mutterschutz */}
              <path
                d={getStackedAreaPath(
                  m => m.husbandSalary + m.wifeSalary + m.mutterschutz,
                  m => m.husbandSalary + m.wifeSalary
                )}
                fill={colors.mutterschutz}
                opacity="0.85"
              />
              {/* Layer 4: Wife Elterngeld */}
              <path
                d={getStackedAreaPath(
                  m => m.husbandSalary + m.wifeSalary + m.mutterschutz + m.wifeElterngeld,
                  m => m.husbandSalary + m.wifeSalary + m.mutterschutz
                )}
                fill={colors.wifeElterngeld}
                opacity="0.85"
              />
              {/* Layer 5: Husband Elterngeld */}
              <path
                d={getStackedAreaPath(
                  m => m.husbandSalary + m.wifeSalary + m.mutterschutz + m.wifeElterngeld + m.husbandElterngeld,
                  m => m.husbandSalary + m.wifeSalary + m.mutterschutz + m.wifeElterngeld
                )}
                fill={colors.husbandElterngeld}
                opacity="0.85"
              />
              {/* Layer 6: Kindergeld */}
              <path
                d={getStackedAreaPath(
                  m => m.husbandSalary + m.wifeSalary + m.mutterschutz + m.wifeElterngeld + m.husbandElterngeld + m.kindergeld,
                  m => m.husbandSalary + m.wifeSalary + m.mutterschutz + m.wifeElterngeld + m.husbandElterngeld
                )}
                fill={colors.kindergeld}
                opacity="0.85"
              />
              {/* Layer 7: Tax Refund */}
              <path
                d={getStackedAreaPath(
                  m => m.monthlyTotal,
                  m => m.husbandSalary + m.wifeSalary + m.mutterschutz + m.wifeElterngeld + m.husbandElterngeld + m.kindergeld
                )}
                fill={colors.taxRefund}
                opacity="0.85"
              />

              {/* Total Line Top Border */}
              <path
                d={displayedMonths.reduce((acc, m, i) => {
                  const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
                  const y = margin.top + scaleY(m.monthlyTotal);
                  return `${acc} ${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }, '')}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2.5"
              />
            </g>
          )}

          {/* Render Mode: COMPARE SCENARIOS OVERLAY */}
          {mode === 'compare' && (
            <g>
              {/* Scenario A (No Kids) */}
              <path
                d={getComparePath(aData)}
                fill="none"
                stroke="#64748b"
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />
              {/* Scenario B (Unoptimized) */}
              <path
                d={getComparePath(bData)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
              />
              {/* Scenario C (Fully Optimized) */}
              <path
                d={getComparePath(cData)}
                fill="none"
                stroke="#10b981"
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
            stroke="#475569"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
          <text
            x={svgWidth - margin.right - 5}
            y={margin.top + scaleY(6125) - 6}
            fill="#94a3b8"
            fontSize="10"
            textAnchor="end"
            fontFamily="monospace"
          >
            Baseline Net Inflow (€6,125 / mo)
          </text>

          {/* Bottom X-Axis (Month Markers) */}
          <line
            x1={margin.left}
            y1={svgHeight - margin.bottom}
            x2={svgWidth - margin.right}
            y2={svgHeight - margin.bottom}
            stroke="#475569"
            strokeWidth="1"
          />
          {displayedMonths.map((m, i) => {
            const isLabel = m.month === 1 || m.month % 6 === 0 || m.month === 60;
            const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
            return isLabel ? (
              <g key={`x-tick-${m.month}`}>
                <line
                  x1={x}
                  y1={svgHeight - margin.bottom}
                  x2={x}
                  y2={svgHeight - margin.bottom + 5}
                  stroke="#64748b"
                />
                <text
                  x={x}
                  y={svgHeight - margin.bottom + 18}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  M{m.month}
                </text>
              </g>
            ) : null;
          })}
        </svg>

        {/* Custom Tooltip */}
        {tooltipState && (
          <div style={{
            position: 'absolute',
            left: `${Math.min(svgWidth - 280, Math.max(margin.left, tooltipState.x - 120))}px`,
            top: '20px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '12px 16px',
            minWidth: '240px',
            pointerEvents: 'none',
            zIndex: 30
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#f8fafc' }}>
                Month {tooltipState.month.month} ({tooltipState.month.dateFormatted})
              </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#60a5fa', fontSize: '0.95rem' }}>
                {formatCurrency(tooltipState.month.monthlyTotal)}
              </span>
            </div>

            {tooltipState.month.eventTag && (
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#38bdf8',
                background: '#1e293b',
                borderRadius: '4px',
                padding: '2px 6px',
                marginBottom: '8px'
              }}>
                {tooltipState.month.eventTag}
              </div>
            )}

            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '6px' }}>
              Status: <span style={{ color: '#cbd5e1' }}>{tooltipState.month.taxClassLabel}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.75rem' }}>
              {tooltipState.month.husbandSalary > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.husbandSalary }}></span>
                    Husband Net Salary:
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(tooltipState.month.husbandSalary)}</span>
                </div>
              )}
              {tooltipState.month.wifeSalary > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.wifeSalary }}></span>
                    Wife Net Salary:
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(tooltipState.month.wifeSalary)}</span>
                </div>
              )}
              {tooltipState.month.mutterschutz > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#93c5fd' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.mutterschutz }}></span>
                    Maternity Pay (*Mutterschutz* MuSchG):
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(tooltipState.month.mutterschutz)}</span>
                </div>
              )}
              {tooltipState.month.wifeElterngeld > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6ee7b7' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.wifeElterngeld }}></span>
                    ElterngeldPlus (Mother / § 4 BEEG):
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(tooltipState.month.wifeElterngeld)}</span>
                </div>
              )}
              {tooltipState.month.husbandElterngeld > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fde68a' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.husbandElterngeld }}></span>
                    Partner Months (*Partnermonate* § 4 BEEG):
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(tooltipState.month.husbandElterngeld)}</span>
                </div>
              )}
              {tooltipState.month.kindergeld > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fda4af' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.kindergeld }}></span>
                    Child Benefit (*Kindergeld* § 66 EStG):
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(tooltipState.month.kindergeld)}</span>
                </div>
              )}
              {tooltipState.month.taxRefund > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#67e8f9' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.taxRefund }}></span>
                    Tax Office Refund (*Finanzamt* § 26b EStG):
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>+{formatCurrency(tooltipState.month.taxRefund)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chart Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginTop: '16px',
        fontSize: '0.78rem',
        color: '#cbd5e1'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors.husbandSalary }}></span>
          <span>Husband Salary</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors.wifeSalary }}></span>
          <span>Wife Salary</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors.mutterschutz }}></span>
          <span>Maternity (*Mutterschutz* MuSchG)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors.wifeElterngeld }}></span>
          <span>ElterngeldPlus (Mother / § 4 BEEG)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors.husbandElterngeld }}></span>
          <span>Partner Months (*Partnermonate*)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors.kindergeld }}></span>
          <span>Child Benefit (*Kindergeld* €259 / child)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors.taxRefund }}></span>
          <span>Tax Office Refund (*Finanzamt-Erstattung*)</span>
        </div>
      </div>
    </div>
  );
}
