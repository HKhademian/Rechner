import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import {
  currentScenarioData,
  activeScenario,
  scenarioBData,
  hoveredMonth,
  showSpecialEventRows,
  scrollToLegalRule,
  LegalRuleKey
} from '#store/elterngeldStore';
import type { TimelineMonth, SpecialEventItem } from '#engine/types';

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
  const [showDelta, setShowDelta] = useState<boolean>(true);

  const scenario = activeScenario.value;
  const current = currentScenarioData.value;
  const bData = scenarioBData.value;
  const isSpecialRowsActive = showSpecialEventRows.value;

  // Unique calendar years for the filter dropdown
  const uniqueCalYears = Array.from(new Set(current.months.map(m => m.calendarYearNum)));

  // Filter rows
  const filteredMonths = current.months.filter(m => {
    if (selectedYear !== 'all') {
      if (selectedYear.startsWith('cal_')) {
        const calYearNum = Number(selectedYear.replace('cal_', ''));
        if (m.calendarYearNum !== calYearNum) return false;
      } else if ((m.year as number) !== Number(selectedYear)) {
        return false;
      }
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchMonth = `m${m.month}`.includes(term) || `month ${m.month}`.includes(term) || m.calendarLabel.includes(term) || m.relativeBirthLabel.toLowerCase().includes(term);
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
      'Simulation Month',
      'Calendar Date',
      'Relative to Delivery',
      'Simulation Year',
      'Phase / Event Name',
      'Tax Classes',
      'Husband Base Salary',
      'Δ Husband vs B',
      'Wife Base Salary',
      'Δ Wife vs B',
      'Maternity (MuSchG)',
      'Δ Maternity vs B',
      'ElterngeldPlus (Mother)',
      'Δ ElterngeldPlus vs B',
      'Partner Months (Father)',
      'Δ Partner Months vs B',
      'Kindergeld',
      'Δ Kindergeld vs B',
      'Special Payment / Tax Return',
      'Δ Special Payment vs B',
      'Net Inflow',
      'Δ Net Inflow vs B',
      'Cumulative Total',
      'Δ Cumulative Total vs B'
    ];

    const rows: (string | number)[][] = [];
    current.months.forEach(m => {
      const bMonth = bData.months[(m.month as number) - 1];
      const diffHusband = (m.husbandSalary as number) - (bMonth ? (bMonth.husbandSalary as number) : 0);
      const diffWife = (m.wifeSalary as number) - (bMonth ? (bMonth.wifeSalary as number) : 0);
      const diffMutterschutz = (m.mutterschutz as number) - (bMonth ? (bMonth.mutterschutz as number) : 0);
      const diffWifeElterngeld = (m.wifeElterngeld as number) - (bMonth ? (bMonth.wifeElterngeld as number) : 0);
      const diffHusbandElterngeld = (m.husbandElterngeld as number) - (bMonth ? (bMonth.husbandElterngeld as number) : 0);
      const diffKindergeld = (m.kindergeld as number) - (bMonth ? (bMonth.kindergeld as number) : 0);
      const diffSpecialEvents = (m.specialEventsTotal as number) - (bMonth ? (bMonth.specialEventsTotal as number) : 0);
      const diffNetInflow = (m.monthlyTotal as number) - (bMonth ? (bMonth.monthlyTotal as number) : 0);
      // 1. Action Milestone Rows (Placed immediately BEFORE month m)
      if (m.startingActions && m.startingActions.length > 0) {
        m.startingActions.forEach((act) => {
          rows.push([
            'Action Milestone',
            `Month ${m.month} (Action)`,
            m.calendarLabel,
            m.relativeBirthLabel,
            `Year ${m.year}`,
            `"${act.title}"`,
            `"${act.taxClassLabel || ''}"`,
            '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—'
          ]);
        });
      }

      // 2. Special Event Rows (Placed immediately BEFORE month m)
      if (m.specialEvents && m.specialEvents.length > 0) {
        m.specialEvents.forEach((ev: SpecialEventItem) => {
          const bEv = bMonth?.specialEvents?.find((bItem: SpecialEventItem) => bItem.type === ev.type);
          const bEvAmount = bEv ? (bEv.amount as number) : 0;
          const evDiff = (ev.amount as number) - bEvAmount;
          rows.push([
            'Special Event',
            `Month ${m.month} (Event)`,
            ev.calendarLabel,
            ev.relativeBirthLabel,
            `Year ${m.year}`,
            `"${ev.title}"`,
            `"${ev.taxClassLabel}"`,
            '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—',
            ev.amount as number,
            evDiff,
            ev.amount as number,
            evDiff,
            '—', '—'
          ]);
        });
      }

      // 3. Base Monthly Row
      rows.push([
        'Monthly Base',
        `Month ${m.month}`,
        m.calendarLabel,
        m.relativeBirthLabel,
        `Year ${m.year}`,
        `"${m.phaseLabel}"`,
        `"${m.taxClassLabel}"`,
        m.husbandSalary as number,
        diffHusband,
        m.wifeSalary as number,
        diffWife,
        m.mutterschutz as number,
        diffMutterschutz,
        m.wifeElterngeld as number,
        diffWifeElterngeld,
        m.husbandElterngeld as number,
        diffHusbandElterngeld,
        m.kindergeld as number,
        diffKindergeld,
        0,
        0,
        m.regularMonthlyTotal as number,
        diffNetInflow,
        m.cumulatedTotal as number,
        diffCumulated
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Elterngeld_Simulation_Scenario_${scenario}_${current.months.length}M_Ledger_with_Diffs.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to render diff badge: red for negative, green for positive, gray 0 for zero
  const renderDiffBadge = (diff: number): JSX.Element => {
    if (diff === 0) {
      return (
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 600,
          color: '#64748b',
          fontFamily: 'monospace'
        }}>
          0 €
        </span>
      );
    }
    const isPositive = diff > 0;
    const color = isPositive ? '#4ade80' : '#f87171';
    const prefix = isPositive ? '+' : '';
    return (
      <span style={{
        fontSize: '0.68rem',
        fontWeight: 700,
        color,
        fontFamily: 'monospace'
      }}>
        {prefix}{formatCurrency(diff)}
      </span>
    );
  };

  // Helper to render target scenario actual value on top, and reference diff below
  const renderCell = (
    value: number,
    diff: number,
    showZeroAsDash = true,
    valueColor?: string,
    isBoldValue = false
  ): JSX.Element => {
    const displayVal = (value === 0 && showZeroAsDash) ? '—' : formatCurrency(value);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
        <span style={{
          color: valueColor || '#cbd5e1',
          fontWeight: isBoldValue ? 800 : 500,
          fontFamily: 'monospace'
        }}>
          {displayVal}
        </span>
        {showDelta && scenario === 'C' && renderDiffBadge(diff)}
      </div>
    );
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
            {scenario === 'C' && showDelta
              ? 'Showing actual Scenario C cash flow with colored per-column reference diffs vs. Scenario B (Green +, Red -, Gray 0).'
              : 'Base monthly salaries & statutory benefits cleanly separated from annual 13th salary chunks and tax refunds.'}
          </p>
        </div>

        {/* Filters & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Per-Column Diff Toggle for Scenario C */}
          {scenario === 'C' && (
            <button
              type="button"
              onClick={() => setShowDelta(!showDelta)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: showDelta ? '1px solid #1e40af' : '1px solid #334155',
                background: showDelta ? 'rgba(30, 64, 175, 0.25)' : '#0f172a',
                color: showDelta ? '#60a5fa' : '#94a3b8',
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
                backgroundColor: showDelta ? '#3b82f6' : '#64748b'
              }}></span>
              {showDelta ? 'Per-Column Diff (vs. B): ON' : 'Per-Column Diff (vs. B): OFF'}
            </button>
          )}

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
            {isSpecialRowsActive ? 'Special Rows: Separate' : 'Special Rows: Combined'}
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
              <th style={{ padding: '10px 12px' }}>
                <div>Husband Base Salary</div>
                {showDelta && scenario === 'C' && (
                  <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500 }}>Target / Δ vs B</div>
                )}
              </th>
              <th style={{ padding: '10px 12px' }}>
                <div>Wife Base Salary</div>
                {showDelta && scenario === 'C' && (
                  <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500 }}>Target / Δ vs B</div>
                )}
              </th>
              <th style={{ padding: '10px 12px' }}>
                <div>
                  <span>Maternity </span>
                  <button
                    type="button"
                    onClick={() => scrollToLegalRule(LegalRuleKey.MuSchG_Maternity)}
                    style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '0.74rem' }}
                    title="Click to view § 3 MuSchG statutory rule and example"
                  >
                    (*MuSchG ↗*)
                  </button>
                </div>
                {showDelta && scenario === 'C' && (
                  <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500 }}>Target / Δ vs B</div>
                )}
              </th>
              <th style={{ padding: '10px 12px' }}>
                <div>
                  <span>ElterngeldPlus </span>
                  <button
                    type="button"
                    onClick={() => scrollToLegalRule(LegalRuleKey.BEEG_SyntheticNet)}
                    style={{ background: 'none', border: 'none', color: '#86efac', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '0.74rem' }}
                    title="Click to view § 4 BEEG statutory rule and example"
                  >
                    (*§ 4 BEEG ↗*)
                  </button>
                </div>
                {showDelta && scenario === 'C' && (
                  <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500 }}>Target / Δ vs B</div>
                )}
              </th>
              <th style={{ padding: '10px 12px' }}>
                <div>
                  <span>Partner Months </span>
                  <button
                    type="button"
                    onClick={() => scrollToLegalRule(LegalRuleKey.BEEG_PartnershipBonus)}
                    style={{ background: 'none', border: 'none', color: '#fde68a', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '0.74rem' }}
                    title="Click to view § 4b BEEG Partnership Bonus statutory rule and example"
                  >
                    (*§ 4b BEEG ↗*)
                  </button>
                </div>
                {showDelta && scenario === 'C' && (
                  <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500 }}>Target / Δ vs B</div>
                )}
              </th>
              <th style={{ padding: '10px 12px' }}>
                <div>
                  <span>Child Benefit </span>
                  <button
                    type="button"
                    onClick={() => scrollToLegalRule(LegalRuleKey.EStG_Kindergeld)}
                    style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '0.74rem' }}
                    title="Click to view § 66 EStG Kindergeld statutory rule and example"
                  >
                    (*§ 66 EStG ↗*)
                  </button>
                </div>
                {showDelta && scenario === 'C' && (
                  <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500 }}>Target / Δ vs B</div>
                )}
              </th>
              <th style={{ padding: '10px 12px', color: '#fbbf24' }}>
                <div>
                  <span>Special / Tax </span>
                  <button
                    type="button"
                    onClick={() => scrollToLegalRule(LegalRuleKey.EStG_TaxSplitting)}
                    style={{ background: 'none', border: 'none', color: '#5eead4', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '0.74rem' }}
                    title="Click to view § 26b EStG Marital Splitting statutory rule and example"
                  >
                    (*§ 26b ↗*)
                  </button>
                </div>
                {showDelta && scenario === 'C' && (
                  <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500 }}>Target / Δ vs B</div>
                )}
              </th>
              <th style={{ padding: '10px 12px', color: '#f8fafc' }}>
                <div>Net Inflow</div>
                {showDelta && scenario === 'C' && (
                  <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500 }}>Target / Δ vs B</div>
                )}
              </th>
              <th style={{ padding: '10px 12px', color: '#cbd5e1' }}>
                <div>Cumulated</div>
                {showDelta && scenario === 'C' && (
                  <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500 }}>Target / Δ vs B</div>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMonths.map((m: TimelineMonth) => {
              const isHovered = hoveredMonth.value === m.month;
              const bMonth = bData.months[(m.month as number) - 1];

              // Per-column diff calculations vs Reference Scenario B
              const diffHusband = (m.husbandSalary as number) - (bMonth ? (bMonth.husbandSalary as number) : 0);
              const diffWife = (m.wifeSalary as number) - (bMonth ? (bMonth.wifeSalary as number) : 0);
              const diffMutterschutz = (m.mutterschutz as number) - (bMonth ? (bMonth.mutterschutz as number) : 0);
              const diffWifeElterngeld = (m.wifeElterngeld as number) - (bMonth ? (bMonth.wifeElterngeld as number) : 0);
              const diffHusbandElterngeld = (m.husbandElterngeld as number) - (bMonth ? (bMonth.husbandElterngeld as number) : 0);
              const diffKindergeld = (m.kindergeld as number) - (bMonth ? (bMonth.kindergeld as number) : 0);
              const diffSpecialEvents = (m.specialEventsTotal as number) - (bMonth ? (bMonth.specialEventsTotal as number) : 0);
              const diffNetInflow = (m.monthlyTotal as number) - (bMonth ? (bMonth.monthlyTotal as number) : 0);
              const diffCumulated = (m.cumulatedTotal as number) - (bMonth ? (bMonth.cumulatedTotal as number) : 0);

              const hasEvents = isSpecialRowsActive && m.specialEvents && m.specialEvents.length > 0;

              return [
                /* 1. Action Event Rows (Pre-Month Life & Decision Events) */
                m.startingActions && m.startingActions.map((act) => (
                  <tr
                    key={`action-${act.actionId}-m${m.month}`}
                    style={{
                      background: 'rgba(59, 7, 100, 0.40)',
                      borderBottom: '1px solid #7e22ce',
                      borderTop: '1px solid #7e22ce'
                    }}
                  >
                    <td style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 800, color: '#c084fc', fontFamily: 'monospace' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>M{m.month}</span>
                        <span style={{ fontSize: '0.65rem', color: '#f3e8ff', background: '#581c87', padding: '1px 5px', borderRadius: '3px', fontWeight: 800 }}>
                          ACTION
                        </span>
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#c084fc' }}>
                        {m.calendarLabel}
                      </div>
                    </td>
                    <td style={{ padding: '6px 12px', textAlign: 'left' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: '#581c87',
                        color: '#f3e8ff',
                        border: '1px solid #9333ea'
                      }}>
                        ⚡ {act.title}
                      </span>
                      <div style={{ fontSize: '0.68rem', color: '#e2e8f0', marginTop: '2px' }}>
                        {act.description}
                      </div>
                    </td>
                    <td style={{ padding: '6px 12px', textAlign: 'left', color: '#c084fc', fontWeight: 600 }}>
                      {act.taxClassLabel || '—'}
                    </td>
                    <td style={{ padding: '6px 12px', color: '#475569', fontStyle: 'italic' }}>—</td>
                    <td style={{ padding: '6px 12px', color: '#475569', fontStyle: 'italic' }}>—</td>
                    <td style={{ padding: '6px 12px', color: '#475569', fontStyle: 'italic' }}>—</td>
                    <td style={{ padding: '6px 12px', color: '#475569', fontStyle: 'italic' }}>—</td>
                    <td style={{ padding: '6px 12px', color: '#475569', fontStyle: 'italic' }}>—</td>
                    <td style={{ padding: '6px 12px', color: '#475569', fontStyle: 'italic' }}>—</td>
                    <td style={{ padding: '6px 12px', color: '#475569', fontStyle: 'italic' }}>—</td>
                    <td style={{ padding: '6px 12px', color: '#475569', fontStyle: 'italic' }}>—</td>
                    <td style={{ padding: '6px 12px', color: '#64748b', fontSize: '0.72rem' }}>—</td>
                  </tr>
                )),

                /* 2. Special Fiscal Event Rows (Pre-Month 13th Salary Bonuses & Annual Tax Returns) */
                hasEvents && m.specialEvents.map((ev: SpecialEventItem) => {
                  const bEv = bMonth?.specialEvents?.find((bItem: SpecialEventItem) => bItem.type === ev.type);
                  const bEvAmount = bEv ? (bEv.amount as number) : 0;
                  const evDiff = (ev.amount as number) - bEvAmount;
                  return (
                    <tr
                      key={ev.eventId}
                      style={{
                        borderBottom: '1px dashed #334155',
                        background: (ev.type as string).startsWith('bonus')
                          ? 'rgba(180, 83, 9, 0.12)'
                          : 'rgba(15, 118, 110, 0.15)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={() => { hoveredMonth.value = m.month; }}
                      onMouseLeave={() => { hoveredMonth.value = null; }}
                    >
                      <td style={{ padding: '6px 12px', textAlign: 'left', color: (ev.type as string).startsWith('bonus') ? '#fbbf24' : '#5eead4', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                        <div>↳ M{m.month} Event</div>
                        <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>({ev.calendarLabel})</div>
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
                        <div>{ev.taxClassLabel}</div>
                        {showDelta && scenario === 'C' && (
                          <div style={{ fontSize: '0.66rem', color: '#64748b' }}>
                            {evDiff !== 0 ? 'Splitting Reconciled' : 'Same as B'}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '6px 12px', color: '#475569', fontStyle: 'italic' }}>—</td>
                      <td style={{ padding: '6px 12px', color: '#475569', fontStyle: 'italic' }}>—</td>
                      <td style={{ padding: '6px 12px', color: '#475569', fontStyle: 'italic' }}>—</td>
                      <td style={{ padding: '6px 12px', color: '#475569', fontStyle: 'italic' }}>—</td>
                      <td style={{ padding: '6px 12px', color: '#475569', fontStyle: 'italic' }}>—</td>
                      <td style={{ padding: '6px 12px', color: '#475569', fontStyle: 'italic' }}>—</td>
                      <td style={{ padding: '6px 12px' }}>
                        {renderCell(
                          ev.amount as number,
                          evDiff,
                          false,
                          (ev.type as string).startsWith('bonus') ? '#fbbf24' : '#5eead4',
                          true
                        )}
                      </td>
                      <td style={{ padding: '6px 12px' }}>
                        {renderCell(
                          ev.amount as number,
                          evDiff,
                          false,
                          (ev.type as string).startsWith('bonus') ? '#fbbf24' : '#5eead4',
                          true
                        )}
                      </td>
                      <td style={{ padding: '6px 12px', color: '#64748b', fontSize: '0.72rem' }}>—</td>
                    </tr>
                  );
                }),

                /* 3. Base Monthly Row */
                <tr
                  key={`month-${m.month}`}
                  style={{
                    borderBottom: '1px solid #334155',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>M{m.month}</span>
                      <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>({m.calendarLabel})</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>
                      {m.relativeBirthLabel} · Y{m.year}
                    </div>
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
                  <td style={{ padding: '8px 12px', textAlign: 'left' }}>
                    <div style={{
                      color: m.isSwapActive ? '#60a5fa' : '#94a3b8',
                      fontWeight: m.isSwapActive ? 700 : 500
                    }}>
                      {m.taxClassLabel}
                    </div>
                    {showDelta && scenario === 'C' && (
                      <div style={{
                        fontSize: '0.68rem',
                        color: m.isSwapActive ? '#f59e0b' : '#64748b',
                        fontWeight: m.isSwapActive ? 700 : 500
                      }}>
                        {m.isSwapActive ? 'Swapped (vs. B: III/V)' : 'Same as B (III/V)'}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {renderCell(m.husbandSalary as number, diffHusband, false)}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {renderCell(m.wifeSalary as number, diffWife, false)}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {renderCell(
                      m.mutterschutz as number,
                      diffMutterschutz,
                      true,
                      (m.mutterschutz as number) > 0 ? '#93c5fd' : undefined
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {renderCell(
                      m.wifeElterngeld as number,
                      diffWifeElterngeld,
                      true,
                      (m.wifeElterngeld as number) > 0 ? '#86efac' : undefined
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {renderCell(
                      m.husbandElterngeld as number,
                      diffHusbandElterngeld,
                      true,
                      (m.husbandElterngeld as number) > 0 ? '#fde68a' : undefined
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {renderCell(
                      m.kindergeld as number,
                      diffKindergeld,
                      true,
                      (m.kindergeld as number) > 0 ? '#fca5a5' : undefined
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {isSpecialRowsActive ? (
                      <span style={{ color: '#475569', fontStyle: 'italic' }}>—</span>
                    ) : (
                      renderCell(
                        (m.specialEventsTotal as number),
                        diffSpecialEvents,
                        true,
                        '#fbbf24'
                      )
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {renderCell(
                      isSpecialRowsActive ? (m.regularMonthlyTotal as number) : (m.monthlyTotal as number),
                      diffNetInflow,
                      false,
                      '#f8fafc',
                      true
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {renderCell(
                      m.cumulatedTotal as number,
                      diffCumulated,
                      false,
                      '#cbd5e1'
                    )}
                  </td>
                </tr>
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
