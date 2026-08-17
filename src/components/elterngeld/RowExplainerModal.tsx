import type { JSX } from 'preact';
import { type RowExplanation } from '#engine/explanation/timelineExplainer';
import { ExplainerRowType } from '#engine/types';
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

  const isMonth = explanation.rowType === ExplainerRowType.Month;
  const isAction = explanation.rowType === ExplainerRowType.Action;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
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
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--border-radius-lg)',
          padding: '24px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'fadeIn 0.15s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={isMonth ? 'badge-brand' : isAction ? 'badge-warning' : 'badge-gain'}>
                {isMonth ? '📅 Monthly Audit' : isAction ? '⚡ Lifecycle Action' : '💰 Fiscal Event'}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {explanation.phaseOrCategory}
              </span>
            </div>
            <h3 style={{ margin: '6px 0 2px 0', fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800 }}>
              {explanation.title}
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {explanation.subtitle}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-surface-secondary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--border-radius-sm)',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        {/* Summary Description */}
        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-surface-secondary)', padding: '12px 14px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-subtle)' }}>
          {explanation.summaryDescription}
        </div>

        {/* Itemized Cash Flow Streams (For Monthly Rows) */}
        {explanation.streams && explanation.streams.length > 0 && (
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                    background: 'var(--bg-surface-secondary)',
                    border: '1px solid var(--border-subtle)',
                    padding: '8px 12px',
                    borderRadius: 'var(--border-radius-sm)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {st.label}
                    </div>
                    {st.formula && (
                      <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {st.formula}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.90rem', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: 'var(--color-primary)' }}>
                      {st.valueFormatted}
                    </span>
                    {st.notes && (
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
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
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-warning)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ⚙️ Action Milestone Parameters:
            </div>
            <div style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--border-radius-sm)', padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              {Object.entries(explanation.actionDetails.details).map(([k, v]) => (
                <div key={k} style={{ fontSize: '0.76rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row Totals Scorecard */}
        {isMonth && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', background: 'var(--bg-surface-secondary)', padding: '14px', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Monthly Inflow
              </div>
              <div style={{ fontSize: '1.25rem', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: 'var(--color-primary)' }}>
                {explanation.totalNetInflowFormatted}
              </div>
              {explanation.diffVsBFormatted && (
                <div style={{ fontSize: '0.72rem', color: 'var(--color-gain)', fontWeight: 700 }}>
                  {explanation.diffVsBFormatted} vs Scenario B
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Progressive 5-Year Total
              </div>
              <div style={{ fontSize: '1.25rem', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: 'var(--color-gain)' }}>
                {explanation.cumulatedTotalFormatted}
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                Cumulative balance up to Month {explanation.title.match(/Month (\d+)/)?.[1] || ''}
              </div>
            </div>
          </div>
        )}

        {/* Statutory Legal Framework Citation */}
        {explanation.legalCitation && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-border)', borderRadius: 'var(--border-radius)', padding: '10px 14px' }}>
            <div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Statutory Governing Law:
              </div>
              <div style={{ fontSize: '0.80rem', color: 'var(--color-primary)', fontWeight: 700 }}>
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
                  background: 'var(--color-primary)',
                  border: 'none',
                  borderRadius: 'var(--border-radius-sm)',
                  color: '#ffffff',
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: 'var(--shadow-sm)'
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
