import type { JSX } from 'preact';
import { type RowExplanation } from '#engine/explanation/timelineExplainer';
import { scrollToLegalRule } from '#store/elterngeldStore';

export interface RowExplainerModalProps {
  readonly explanation: RowExplanation | null;
  readonly onClose: () => void;
}

export default function RowExplainerModal({
  explanation,
  onClose
}: RowExplainerModalProps): JSX.Element | null {
  if (!explanation) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.80)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #6366f1',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 30px -5px rgba(0, 0, 0, 0.6), 0 10px 15px -5px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'fadeIn 0.15s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: explanation.rowType === 'month' ? '#4f46e5' : explanation.rowType === 'action' ? '#be185d' : '#0284c7',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase'
              }}>
                {explanation.rowType === 'month' ? '📅 Monthly Audit' : explanation.rowType === 'action' ? '⚡ Lifecycle Action' : '💰 Fiscal Event'}
              </span>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>
                {explanation.phaseOrCategory}
              </span>
            </div>
            <h3 style={{ margin: '6px 0 2px 0', fontSize: '1.25rem', color: '#f8fafc', fontWeight: 800 }}>
              {explanation.title}
            </h3>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
              {explanation.subtitle}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #475569',
              color: '#94a3b8',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        {/* Summary Description */}
        <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5, background: '#1e293b', padding: '12px 14px', borderRadius: '6px', border: '1px solid #334155' }}>
          {explanation.summaryDescription}
        </div>

        {/* Itemized Cash Flow Streams (For Monthly Rows) */}
        {explanation.streams && explanation.streams.length > 0 && (
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              📊 Itemized Monthly Inflows &amp; Benefits:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {explanation.streams.map((st, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#111827',
                    border: '1px solid #1f2937',
                    padding: '8px 12px',
                    borderRadius: '6px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#f8fafc' }}>
                      {st.label}
                    </div>
                    {st.formula && (
                      <div style={{ fontSize: '0.70rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {st.formula}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.90rem', fontFamily: 'monospace', fontWeight: 800, color: '#5eead4' }}>
                      {st.valueFormatted}
                    </span>
                    {st.notes && (
                      <div style={{ fontSize: '0.66rem', color: '#64748b' }}>
                        {st.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Details Table (For Action Milestone Rows) */}
        {explanation.actionDetails && (
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f472b6', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ⚙️ Action Milestone Parameters:
            </div>
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '6px', padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              {Object.entries(explanation.actionDetails.details).map(([k, v]) => (
                <div key={k} style={{ fontSize: '0.76rem' }}>
                  <span style={{ color: '#94a3b8' }}>{k}: </span>
                  <strong style={{ color: '#fbcfe8' }}>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row Totals Scorecard */}
        {explanation.rowType === 'month' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', background: '#1e293b', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div>
              <div style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Monthly Inflow
              </div>
              <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                {explanation.totalNetInflowFormatted}
              </div>
              {explanation.diffVsBFormatted && (
                <div style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700 }}>
                  {explanation.diffVsBFormatted} vs Scenario B
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Progressive 5-Year Total
              </div>
              <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 800, color: '#5eead4' }}>
                {explanation.cumulatedTotalFormatted}
              </div>
              <div style={{ fontSize: '0.70rem', color: '#64748b' }}>
                Cumulative balance up to Month {explanation.title.match(/Month (\d+)/)?.[1] || ''}
              </div>
            </div>
          </div>
        )}

        {/* Statutory Legal Framework Citation */}
        {explanation.legalCitation && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '8px', padding: '10px 14px' }}>
            <div>
              <div style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Statutory Governing Law:
              </div>
              <div style={{ fontSize: '0.80rem', color: '#a5b4fc', fontWeight: 700 }}>
                {explanation.legalCitation}
              </div>
            </div>
            {explanation.legalRuleKey && (
              <button
                type="button"
                onClick={() => {
                  if (explanation.legalRuleKey) {
                    scrollToLegalRule(explanation.legalRuleKey);
                    onClose();
                  }
                }}
                style={{
                  background: '#4f46e5',
                  border: 'none',
                  borderRadius: '5px',
                  color: '#ffffff',
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                View Legal Rule ↗
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
