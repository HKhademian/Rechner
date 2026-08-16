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

  // Colors
  const colors = {
    husbandSalary: '#2563eb', // Institutional Financial Blue
    wifeSalary: '#0284c7',    // Steel Blue
    mutterschutz: '#4338ca',  // Dark Indigo
    wifeElterngeld: '#059669',// Forest / Emerald Green
    husbandElterngeld: '#d97706', // Warm Amber
    kindergeld: '#be123c',    // Burgundy / Brick Red
    taxRefund: '#0891b2'      // Petrol Cyan
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
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  };

  // Area path generator for Area mode
  const getStackedAreaPath = (stackTopFn, stackBottomFn) => {
    if (displayedMonths.length === 0) return '';
    let topPoints = [];
    let bottomPoints = [];
    displayedMonths.forEach((m, i) => {
      const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
      const yTop = margin.top + scaleY(stackTopFn(m));
      const yBottom = margin.top + scaleY(stackBottomFn(m));
      topPoints.push(`${x},${yTop}`);
      bottomPoints.unshift(`${x},${yBottom}`);
    });
    return `M ${topPoints.join(' L ')} L ${bottomPoints.join(' L ')} Z`;
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
            Monatlicher Mittelzufluss & Leistungsverlauf (60 Monate)
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
            Aufschlüsselung von Erwerbseinkommen, Mutterschutz, ElterngeldPlus, Kindergeld und Steuererstattungen.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.8)',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid #334155',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => chartMode.value = 'stacked_bar'}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: mode === 'stacked_bar' ? '#2563eb' : 'transparent',
              color: mode === 'stacked_bar' ? '#ffffff' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Gestapeltes Balkendiagramm
          </button>
          <button
            type="button"
            onClick={() => chartMode.value = 'area'}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: mode === 'area' ? '#2563eb' : 'transparent',
              color: mode === 'area' ? '#ffffff' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Flächendiagramm
          </button>
          <button
            type="button"
            onClick={() => chartMode.value = 'compare'}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: mode === 'compare' ? '#2563eb' : 'transparent',
              color: mode === 'compare' ? '#ffffff' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Szenarien-Vergleich
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
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="gradHusband" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="gradWife" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="gradMutterschutz" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
            <linearGradient id="gradWifeEG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="gradHusbandEG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="gradKindergeld" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>
            <linearGradient id="gradTaxRefund" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>
          </defs>

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
                  stroke="rgba(99, 102, 241, 0.35)"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                <text
                  x={x + 4}
                  y={margin.top - 12}
                  fill="#818cf8"
                  fontSize="11"
                  fontWeight="700"
                >
                  Jahr {m.year}
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
              { key: 'husbandSalary', val: m.husbandSalary, fill: 'url(#gradHusband)' },
              { key: 'wifeSalary', val: m.wifeSalary, fill: 'url(#gradWife)' },
              { key: 'mutterschutz', val: m.mutterschutz, fill: 'url(#gradMutterschutz)' },
              { key: 'wifeElterngeld', val: m.wifeElterngeld, fill: 'url(#gradWifeEG)' },
              { key: 'husbandElterngeld', val: m.husbandElterngeld, fill: 'url(#gradHusbandEG)' },
              { key: 'kindergeld', val: m.kindergeld, fill: 'url(#gradKindergeld)' },
              { key: 'taxRefund', val: m.taxRefund, fill: 'url(#gradTaxRefund)' }
            ];

            return (
              <g key={m.month} opacity={isHovered ? 1 : 0.9}>
                {isHovered && (
                  <rect
                    x={margin.left + i * barSlotWidth}
                    y={margin.top}
                    width={barSlotWidth}
                    height={plotHeight}
                    fill="rgba(255, 255, 255, 0.05)"
                    rx="4"
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
                      rx="2"
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Render Mode: AREA TREND */}
          {mode === 'area' && (
            <g>
              <path d={getStackedAreaPath(m => m.husbandSalary, () => 0)} fill="url(#gradHusband)" opacity="0.85" />
              <path d={getStackedAreaPath(m => m.husbandSalary + m.wifeSalary, m => m.husbandSalary)} fill="url(#gradWife)" opacity="0.85" />
              <path d={getStackedAreaPath(m => m.husbandSalary + m.wifeSalary + m.mutterschutz, m => m.husbandSalary + m.wifeSalary)} fill="url(#gradMutterschutz)" opacity="0.85" />
              <path d={getStackedAreaPath(m => m.husbandSalary + m.wifeSalary + m.mutterschutz + m.wifeElterngeld, m => m.husbandSalary + m.wifeSalary + m.mutterschutz)} fill="url(#gradWifeEG)" opacity="0.85" />
              <path d={getStackedAreaPath(m => m.husbandSalary + m.wifeSalary + m.mutterschutz + m.wifeElterngeld + m.husbandElterngeld, m => m.husbandSalary + m.wifeSalary + m.mutterschutz + m.wifeElterngeld)} fill="url(#gradHusbandEG)" opacity="0.85" />
              <path d={getStackedAreaPath(m => m.husbandSalary + m.wifeSalary + m.mutterschutz + m.wifeElterngeld + m.husbandElterngeld + m.kindergeld, m => m.husbandSalary + m.wifeSalary + m.mutterschutz + m.wifeElterngeld + m.husbandElterngeld)} fill="url(#gradKindergeld)" opacity="0.85" />
              {displayedMonths.map((m, i) => {
                if (m.taxRefund <= 0) return null;
                const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
                const yBase = margin.top + scaleY(m.monthlyTotal - m.taxRefund);
                const yTop = margin.top + scaleY(m.monthlyTotal);
                return (
                  <g key={`refund-bar-${m.month}`}>
                    <line x1={x} y1={yBase} x2={x} y2={yTop} stroke="#0891b2" strokeWidth="4" strokeLinecap="round" />
                    <circle cx={x} cy={yTop} r="4" fill="#0891b2" />
                  </g>
                );
              })}
            </g>
          )}

          {/* Render Mode: COMPARE A/B/C OVERLAY */}
          {mode === 'compare' && (
            <g>
              <path d={getComparePath(aData)} fill="none" stroke="#64748b" strokeWidth="2.5" strokeDasharray="6 4" opacity="0.8" />
              <path d={getComparePath(bData)} fill="none" stroke="#f59e0b" strokeWidth="3" opacity="0.9" />
              <path d={getComparePath(cData)} fill="none" stroke="#10b981" strokeWidth="3" />
              {displayedMonths.map((m, i) => {
                const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
                const yA = margin.top + scaleY(aData.months[m.month - 1]?.monthlyTotal || 0);
                const yB = margin.top + scaleY(bData.months[m.month - 1]?.monthlyTotal || 0);
                const yC = margin.top + scaleY(cData.months[m.month - 1]?.monthlyTotal || 0);
                return (
                  <g key={`compare-pts-${m.month}`}>
                    <circle cx={x} cy={yA} r="2" fill="#64748b" />
                    <circle cx={x} cy={yB} r="3" fill="#f59e0b" />
                    <circle cx={x} cy={yC} r="3.5" fill="#10b981" />
                  </g>
                );
              })}
            </g>
          )}

          {/* Vertical Event Annotation Pins & Reference Lines */}
          {displayedMonths.map((m, i) => {
            if (!m.eventTag) return null;
            const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
            const isBirth = m.eventType === 'birth';
            const isSwap = m.eventType === 'swap';
            const pinColor = isBirth ? '#2563eb' : isSwap ? '#10b981' : '#f59e0b';
            return (
              <g key={`event-pin-${m.month}`} style={{ cursor: 'pointer' }}>
                <line x1={x} y1={margin.top - 16} x2={x} y2={svgHeight - margin.bottom} stroke={pinColor} strokeWidth="1.5" strokeDasharray={isBirth ? 'none' : '3 3'} opacity="0.85" />
                <circle cx={x} cy={margin.top - 16} r="8" fill={pinColor} />
                <text x={x} y={margin.top - 13} textAnchor="middle" fontSize="8" fill="#ffffff" fontWeight="700">
                  {isBirth ? '1' : isSwap ? '§' : '•'}
                </text>
              </g>
            );
          })}

          <line x1={margin.left} y1={svgHeight - margin.bottom} x2={svgWidth - margin.right} y2={svgHeight - margin.bottom} stroke="#475569" strokeWidth="1" />

          {displayedMonths.map((m, i) => {
            const x = margin.left + i * barSlotWidth + barSlotWidth / 2;
            const showLabel = numBars <= 24 || m.month % 3 === 0 || m.month === 1;
            if (!showLabel) return null;
            return (
              <text key={`xlabel-${m.month}`} x={x} y={svgHeight - margin.bottom + 18} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                M{m.month}
              </text>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {tooltipState && (
          <div style={{
            position: 'absolute',
            left: `${Math.min(svgWidth - 220, Math.max(10, tooltipState.x - 110))}px`,
            top: '10px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #475569',
            borderRadius: '8px',
            padding: '12px 16px',
            pointerEvents: 'none',
            zIndex: 30,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
            minWidth: '220px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '6px', marginBottom: '8px' }}>
              <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.9rem' }}>
                Monat {tooltipState.month.month} (Jahr {tooltipState.month.year})
              </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981', fontSize: '0.95rem' }}>
                {formatCurrency(tooltipState.month.monthlyTotal)}
              </span>
            </div>

            {tooltipState.month.eventTag && (
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#60a5fa',
                background: 'rgba(37, 99, 235, 0.15)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
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
                    Gehalt Ehemann:
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(tooltipState.month.husbandSalary)}</span>
                </div>
              )}
              {tooltipState.month.wifeSalary > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.wifeSalary }}></span>
                    Gehalt Ehefrau:
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(tooltipState.month.wifeSalary)}</span>
                </div>
              )}
              {tooltipState.month.mutterschutz > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#93c5fd' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.mutterschutz }}></span>
                    Mutterschaftsleistungen:
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(tooltipState.month.mutterschutz)}</span>
                </div>
              )}
              {tooltipState.month.wifeElterngeld > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6ee7b7' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.wifeElterngeld }}></span>
                    ElterngeldPlus (Mutter):
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(tooltipState.month.wifeElterngeld)}</span>
                </div>
              )}
              {tooltipState.month.husbandElterngeld > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fde68a' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.husbandElterngeld }}></span>
                    Partnermonate (Vater):
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(tooltipState.month.husbandElterngeld)}</span>
                </div>
              )}
              {tooltipState.month.kindergeld > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fda4af' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.kindergeld }}></span>
                    Kindergeld:
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(tooltipState.month.kindergeld)}</span>
                </div>
              )}
              {tooltipState.month.taxRefund > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#67e8f9' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.taxRefund }}></span>
                    Finanzamt Steuererstattung:
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
          <span>Gehalt Ehemann</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors.wifeSalary }}></span>
          <span>Gehalt Ehefrau</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors.mutterschutz }}></span>
          <span>Mutterschutz</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors.wifeElterngeld }}></span>
          <span>ElterngeldPlus (Mutter)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors.husbandElterngeld }}></span>
          <span>Partnermonate (Vater €150)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors.kindergeld }}></span>
          <span>Kindergeld (€259 / Kind)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors.taxRefund }}></span>
          <span>Finanzamt Steuererstattung</span>
        </div>
      </div>
    </div>
  );
}
