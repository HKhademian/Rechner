import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import {
  currentScenarioData,
  activeScenario,
  scenarioBData,
  hoveredMonth,
  showSpecialEventRows
} from '../../store/elterngeldStore.ts';
import type { TimelineMonth, SpecialEventItem } from '../../engine/types.ts';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export default function TimelineTable(): JSX.Element {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDelta, setShowDelta] = useState<boolean>(false);

  const scenario = activeScenario.value;
  const current = currentScenarioData.value;
  const bData = scenarioBData.value;
  const isSpecialRowsActive = showSpecialEventRows.value;

  // Filter rows
  const filteredMonths = current.months.filter(m => {
    if (selectedYear !== 'all' && (m.year as number) !== Number(selectedYear)) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchMonth = `m${m.month}`.includes(term) || `month ${m.month}`.includes(term);
      const matchPhase = m.phaseLabel.toLowerCase().includes(term);
      const matchTax = m.taxClassLabel.toLowerCase().includes(term);
      const matchEvent = m.eventTag && m.eventTag.toLowerCase().includes(term);
      const matchSpecial = m.specialEvents && m.specialEvents.some((e: SpecialEventItem) => e.title.toLowerCase().includes(term) || (e.category as string).toLowerCase().includes(term));
      if (!matchMonth && !matchPhase && !matchTax && !matchEvent && !matchSpecial) return false;
    }
    return true;
  });

  // Export to CSV
  const exportCSV = (): void => {
    const headers = [
      'Entry Type',
      'Month',
      'Year',
      'Phase / Event Name',
      'Tax Classes',
      'Husband Base Salary',
      'Wife Base Salary',
      'Maternity (MuSchG)',
      'ElterngeldPlus (Mother)',
      'Partner Months (Father)',
      'Kindergeld',
      'Special Payment / Tax Return',
      'Net Inflow',
      'Cumulative Total'
    ];

    const rows: (string | number)[][] = [];
    current.months.forEach(m => {
      // Base monthly row
      rows.push([
        'Monthly Base',
        `Month ${m.month}`,
        `Year ${m.year}`,
        `"${m.phaseLabel}"`,
        `"${m.taxClassLabel}"`,
        m.husbandSalary as number,
        m.wifeSalary as number,
        m.mutterschutz as number,
        m.wifeElterngeld as number,
        m.husbandElterngeld as number,
        m.kindergeld as number,
        0,
        m.regularMonthlyTotal as number,
        m.cumulatedTotal as number
      ]);

      // Special Event Rows
      if (m.specialEvents && m.specialEvents.length > 0) {
        m.specialEvents.forEach((ev: SpecialEventItem) => {
          rows.push([
            'Special Event',
            `Month ${m.month} (Event)`,
            `Year ${m.year}`,
            `"${ev.title}"`,
            `"${ev.taxClassLabel}"`,
            0,
            0,
            0,
            0,
            0,
            0,
            ev.amount as number,
            ev.amount as number,
            m.cumulatedTotal as number
          ]);
        });
      }
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Elterngeld_Simulation_Scenario_${scenario}_60M_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
      {/* Top Table Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '18px'
      }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            60-Month Cash Flow Ledger (Scenario {scenario})
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
            Base monthly salaries & statutory benefits cleanly separated from annual 13th salary chunks and tax refunds.
          </p>
        </div>

        {/* Filters & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Special Events Row Toggle */}
          <button
            type="button"
            onClick={() => { showSpecialEventRows.value = !showSpecialEventRows.value; }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: isSpecialRowsActive ? '1px solid #b45309' : '1px solid #334155',
              background: isSpecialRowsActive ? 'rgba(180, 83, 9, 0.2)' : '#0f172a',
              color: isSpecialRowsActive ? '#fde68a' : '#94a3b8',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isSpecialRowsActive ? '#f59e0b' : '#64748b'
            }}></span>
            {isSpecialRowsActive ? 'Special Event Rows: Separate' : 'Special Event Rows: Combined'}
          </button>

          {/* Search box */}
          <input
            type="text"
            placeholder="Filter phase, event, month..."
            value={searchTerm}
            onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: '0.78rem',
              width: '180px'
            }}
          />

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear((e.target as HTMLSelectElement).value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: '0.78rem',
              width: '130px'
            }}
          >
            <option value="all">All Years (1–5)</option>
            <option value="1">Year 1 (M1–12)</option>
            <option value="2">Year 2 (M13–24)</option>
            <option value="3">Year 3 (M25–36)</option>
            <option value="4">Year 4 (M37–48)</option>
            <option value="5">Year 5 (M49–60)</option>
          </select>

          {/* Scenario C vs B Delta toggle */}
          {scenario === 'C' && (
            <button
              type="button"
              onClick={() => setShowDelta(!showDelta)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: showDelta ? '1px solid #1e40af' : '1px solid #334155',
                background: showDelta ? '#1e293b' : '#0f172a',
                color: showDelta ? '#60a5fa' : '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {showDelta ? '✓ Delta vs. B Active' : '+ Show Delta vs. B'}
            </button>
          )}

          {/* Export CSV button */}
          <button
            type="button"
            onClick={exportCSV}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div style={{
        overflowX: 'auto',
        borderRadius: '6px',
        border: '1px solid #334155'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.78rem',
          textAlign: 'right'
        }}>
          <thead>
            <tr style={{
              background: '#0f172a',
              color: '#94a3b8',
              borderBottom: '2px solid #334155',
              fontWeight: 700
            }}>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Month / Entry</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Phase / Milestone / Event</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Tax Classes (*Steuerklassen*)</th>
              <th style={{ padding: '10px 12px' }}>Husband Base Salary</th>
              <th style={{ padding: '10px 12px' }}>Wife Base Salary</th>
              <th style={{ padding: '10px 12px' }}>Maternity (*Mutterschutz* MuSchG)</th>
              <th style={{ padding: '10px 12px' }}>ElterngeldPlus (Mother / § 4 BEEG)</th>
              <th style={{ padding: '10px 12px' }}>Partner Months (*Partnermonate*)</th>
              <th style={{ padding: '10px 12px' }}>Child Benefit (*Kindergeld*)</th>
              <th style={{ padding: '10px 12px', color: '#fbbf24' }}>Special Payment / Tax (*Sonderzahlung*)</th>
              <th style={{ padding: '10px 12px', color: '#f8fafc' }}>Net Inflow</th>
              {showDelta && <th style={{ padding: '10px 12px', color: '#60a5fa' }}>Delta vs. B</th>}
              <th style={{ padding: '10px 12px', color: '#cbd5e1' }}>Cumulated</th>
            </tr>
          </thead>
          <tbody>
            {filteredMonths.map((m: TimelineMonth) => {
              const isHovered = hoveredMonth.value === m.month;
              const bMonth = bData.months[(m.month as number) - 1];
              const deltaVsB = (m.monthlyTotal as number) - (bMonth ? (bMonth.monthlyTotal as number) : 0);
              const hasEvents = isSpecialRowsActive && m.specialEvents && m.specialEvents.length > 0;

              return [
                /* 1. Base Monthly Row */
                <tr
                  key={`month-${m.month}`}
                  style={{
                    borderBottom: hasEvents ? '1px dashed #334155' : '1px solid #334155',
                    background: isHovered
                      ? 'rgba(30, 64, 175, 0.15)'
                      : m.eventTag
                      ? 'rgba(30, 41, 59, 0.5)'
                      : 'transparent',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={() => { hoveredMonth.value = m.month; }}
                  onMouseLeave={() => { hoveredMonth.value = null; }}
                >
                  <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                    M{m.month}
                    <span style={{ fontSize: '0.68rem', color: '#64748b', marginLeft: '4px' }}>(Y{m.year})</span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'left' }}>
                    {m.eventTag ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: '#1e293b',
                        color: '#60a5fa',
                        border: '1px solid #334155'
                      }}>
                        {m.eventTag}
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>{m.phaseLabel}</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'left', color: m.isSwapActive ? '#60a5fa' : '#94a3b8', fontWeight: m.isSwapActive ? 700 : 500 }}>
                    {m.taxClassLabel}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                    {formatCurrency(m.husbandSalary as number)}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                    {formatCurrency(m.wifeSalary as number)}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: (m.mutterschutz as number) > 0 ? '#93c5fd' : '#64748b' }}>
                    {(m.mutterschutz as number) > 0 ? formatCurrency(m.mutterschutz as number) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: (m.wifeElterngeld as number) > 0 ? '#86efac' : '#64748b' }}>
                    {(m.wifeElterngeld as number) > 0 ? formatCurrency(m.wifeElterngeld as number) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: (m.husbandElterngeld as number) > 0 ? '#fde68a' : '#64748b' }}>
                    {(m.husbandElterngeld as number) > 0 ? formatCurrency(m.husbandElterngeld as number) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: (m.kindergeld as number) > 0 ? '#fca5a5' : '#64748b' }}>
                    {(m.kindergeld as number) > 0 ? formatCurrency(m.kindergeld as number) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#64748b' }}>
                    {!isSpecialRowsActive && (m.specialEventsTotal as number) > 0
                      ? formatCurrency(m.specialEventsTotal as number)
                      : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#f8fafc' }}>
                    {formatCurrency(isSpecialRowsActive ? (m.regularMonthlyTotal as number) : (m.monthlyTotal as number))}
                  </td>
                  {showDelta && (
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: deltaVsB >= 0 ? '#4ade80' : '#f87171' }}>
                      {deltaVsB >= 0 ? `+${formatCurrency(deltaVsB)}` : formatCurrency(deltaVsB)}
                    </td>
                  )}
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                    {formatCurrency(m.cumulatedTotal as number)}
                  </td>
                </tr>,

                /* 2. Special Event Rows (13th Month Salary Chunks & Annual Tax Returns) */
                hasEvents && m.specialEvents.map((ev: SpecialEventItem) => (
                  <tr
                    key={ev.eventId}
                    style={{
                      borderBottom: '1px solid #334155',
                      background: (ev.type as string).startsWith('bonus')
                        ? 'rgba(180, 83, 9, 0.12)'
                        : 'rgba(15, 118, 110, 0.15)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={() => { hoveredMonth.value = m.month; }}
                    onMouseLeave={() => { hoveredMonth.value = null; }}
                  >
                    <td style={{ padding: '6px 12px', textAlign: 'left', color: (ev.type as string).startsWith('bonus') ? '#fbbf24' : '#5eead4', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                      ↳ M{m.month} Event
                    </td>
                    <td style={{ padding: '6px 12px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: '3px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          background: (ev.type as string).startsWith('bonus') ? '#b45309' : '#0f766e',
                          color: '#ffffff'
                        }}>
                          {ev.category}
                        </span>
                        <span style={{ fontWeight: 600, color: (ev.type as string).startsWith('bonus') ? '#fde68a' : '#99f6e4', fontSize: '0.75rem' }}>
                          {ev.title}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                        {ev.description}
                      </div>
                    </td>
                    <td style={{ padding: '6px 12px', textAlign: 'left', color: '#94a3b8', fontSize: '0.72rem' }}>
                      {ev.taxClassLabel}
                    </td>
                    <td style={{ padding: '6px 12px', color: '#64748b' }}>—</td>
                    <td style={{ padding: '6px 12px', color: '#64748b' }}>—</td>
                    <td style={{ padding: '6px 12px', color: '#64748b' }}>—</td>
                    <td style={{ padding: '6px 12px', color: '#64748b' }}>—</td>
                    <td style={{ padding: '6px 12px', color: '#64748b' }}>—</td>
                    <td style={{ padding: '6px 12px', color: '#64748b' }}>—</td>
                    <td style={{
                      padding: '6px 12px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      color: (ev.type as string).startsWith('bonus') ? '#fbbf24' : '#5eead4'
                    }}>
                      +{formatCurrency(ev.amount as number)}
                    </td>
                    <td style={{
                      padding: '6px 12px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      color: (ev.type as string).startsWith('bonus') ? '#fbbf24' : '#5eead4'
                    }}>
                      +{formatCurrency(ev.amount as number)}
                    </td>
                    {showDelta && <td style={{ padding: '6px 12px', color: '#64748b' }}>—</td>}
                    <td style={{ padding: '6px 12px', fontFamily: 'monospace', color: '#94a3b8' }}>
                      {formatCurrency(m.cumulatedTotal as number)}
                    </td>
                  </tr>
                ))
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
