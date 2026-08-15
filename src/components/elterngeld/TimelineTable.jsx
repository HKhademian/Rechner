import { useState } from 'preact/hooks';
import {
  currentScenarioData,
  activeScenario,
  scenarioBData,
  scenarioCData,
  hoveredMonth
} from '../../store/elterngeldStore';

function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export default function TimelineTable() {
  const [selectedYear, setSelectedYear] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDelta, setShowDelta] = useState(false);

  const scenario = activeScenario.value;
  const current = currentScenarioData.value;
  const bData = scenarioBData.value;
  const cData = scenarioCData.value;

  // Filter rows
  const filteredMonths = current.months.filter(m => {
    if (selectedYear !== 'all' && m.year !== Number(selectedYear)) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchMonth = `m${m.month}`.includes(term) || `month ${m.month}`.includes(term);
      const matchPhase = m.phaseLabel.toLowerCase().includes(term);
      const matchTax = m.taxClassLabel.toLowerCase().includes(term);
      const matchEvent = m.eventTag && m.eventTag.toLowerCase().includes(term);
      if (!matchMonth && !matchPhase && !matchTax && !matchEvent) return false;
    }
    return true;
  });

  // Export to CSV
  const exportCSV = () => {
    const headers = [
      'Month',
      'Year',
      'Phase',
      'Tax Classes',
      'Husband Salary',
      'Wife Salary',
      'Mutterschutz',
      'Wife Elterngeld',
      'Husband Elterngeld',
      'Kindergeld',
      'Tax Refund',
      'Total Monthly Inflow',
      'Cumulative Inflow'
    ];

    const rows = current.months.map(m => [
      `Month ${m.month}`,
      `Year ${m.year}`,
      `"${m.phaseLabel}"`,
      `"${m.taxClassLabel}"`,
      m.husbandSalary,
      m.wifeSalary,
      m.mutterschutz,
      m.wifeElterngeld,
      m.husbandElterngeld,
      m.kindergeld,
      m.taxRefund,
      m.monthlyTotal,
      m.cumulatedTotal
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Elterngeld_Simulation_Scenario_${scenario}_60M.csv`);
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
            Complete month-by-month cash flow audit with tax classes, benefit distributions, and refund timelines.
          </p>
        </div>

        {/* Filters & Export Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search box */}
          <input
            type="text"
            placeholder="Filter phase, event, M..."
            value={searchTerm}
            onInput={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              width: '180px'
            }}
          />

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              width: '120px'
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
                borderRadius: '8px',
                border: showDelta ? '1px solid #10b981' : '1px solid #64748b',
                background: showDelta ? 'rgba(16, 185, 129, 0.2)' : 'rgba(51, 65, 85, 0.4)',
                color: showDelta ? '#34d399' : '#cbd5e1',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {showDelta ? '✓ Delta vs B Active' : '+ Compare Delta vs B'}
            </button>
          )}

          {/* Export CSV button */}
          <button
            type="button"
            onClick={exportCSV}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid #3b82f6',
              background: 'rgba(59, 130, 246, 0.25)',
              color: '#93c5fd',
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
        borderRadius: '10px',
        border: '1px solid rgba(51, 65, 85, 0.6)'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.78rem',
          textAlign: 'right'
        }}>
          <thead>
            <tr style={{
              background: 'rgba(15, 23, 42, 0.95)',
              color: '#94a3b8',
              borderBottom: '2px solid rgba(51, 65, 85, 0.8)',
              fontWeight: 700
            }}>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Month</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Phase / Milestone</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Tax Classes</th>
              <th style={{ padding: '10px 12px' }}>Husband</th>
              <th style={{ padding: '10px 12px' }}>Wife</th>
              <th style={{ padding: '10px 12px' }}>Mutterschutz</th>
              <th style={{ padding: '10px 12px' }}>Wife EG</th>
              <th style={{ padding: '10px 12px' }}>Husband EG</th>
              <th style={{ padding: '10px 12px' }}>Kindergeld</th>
              <th style={{ padding: '10px 12px' }}>Tax Refund</th>
              <th style={{ padding: '10px 12px', color: '#f8fafc' }}>Monthly Net</th>
              {showDelta && <th style={{ padding: '10px 12px', color: '#34d399' }}>Gain vs B</th>}
              <th style={{ padding: '10px 12px', color: '#93c5fd' }}>Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {filteredMonths.map((m) => {
              const isHovered = hoveredMonth.value === m.month;
              const bMonth = bData.months[m.month - 1];
              const deltaVsB = m.monthlyTotal - (bMonth ? bMonth.monthlyTotal : 0);

              return (
                <tr
                  key={m.month}
                  style={{
                    borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
                    background: isHovered
                      ? 'rgba(59, 130, 246, 0.15)'
                      : m.eventTag
                      ? 'rgba(236, 72, 153, 0.06)'
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
                        background: 'rgba(236, 72, 153, 0.2)',
                        color: '#f472b6',
                        border: '1px solid rgba(236, 72, 153, 0.3)'
                      }}>
                        {m.eventTag}
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>{m.phaseLabel}</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'left', color: m.isSwapActive ? '#34d399' : '#94a3b8', fontWeight: m.isSwapActive ? 700 : 500 }}>
                    {m.taxClassLabel}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                    {formatCurrency(m.husbandSalary)}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                    {formatCurrency(m.wifeSalary)}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: m.mutterschutz > 0 ? '#d8b4fe' : '#64748b' }}>
                    {m.mutterschutz > 0 ? formatCurrency(m.mutterschutz) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: m.wifeElterngeld > 0 ? '#6ee7b7' : '#64748b' }}>
                    {m.wifeElterngeld > 0 ? formatCurrency(m.wifeElterngeld) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: m.husbandElterngeld > 0 ? '#fde68a' : '#64748b' }}>
                    {m.husbandElterngeld > 0 ? formatCurrency(m.husbandElterngeld) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: m.kindergeld > 0 ? '#fda4af' : '#64748b' }}>
                    {m.kindergeld > 0 ? formatCurrency(m.kindergeld) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: m.taxRefund > 0 ? '#67e8f9' : '#64748b', fontWeight: m.taxRefund > 0 ? 800 : 400 }}>
                    {m.taxRefund > 0 ? `+${formatCurrency(m.taxRefund)}` : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 800, color: '#10b981' }}>
                    {formatCurrency(m.monthlyTotal)}
                  </td>
                  {showDelta && (
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: deltaVsB >= 0 ? '#34d399' : '#f59e0b' }}>
                      {deltaVsB >= 0 ? `+${formatCurrency(deltaVsB)}` : formatCurrency(deltaVsB)}
                    </td>
                  )}
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#93c5fd' }}>
                    {formatCurrency(m.cumulatedTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
