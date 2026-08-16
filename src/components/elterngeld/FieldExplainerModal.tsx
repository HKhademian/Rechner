import type { JSX } from 'preact';
import { type FieldExplanation } from '#engine/explanation/timelineExplainer';
import { scrollToLegalRule } from '#store/elterngeldStore';

export interface FieldExplainerModalProps {
  readonly explanation: FieldExplanation | null;
  readonly onClose: () => void;
}

export default function FieldExplainerModal({
  explanation,
  onClose
}: FieldExplainerModalProps): JSX.Element | null {
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
          border: '1px solid #38bdf8',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '620px',
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
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Field Calculation &amp; Statutory Audit
            </div>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', color: '#f8fafc', fontWeight: 800 }}>
              {explanation.fieldTitle}
            </h3>
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

        {/* Formatted Value & Variance */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '12px 16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <span style={{ fontSize: '0.84rem', color: '#94a3b8', fontWeight: 600 }}>Active Value:</span>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.35rem', fontFamily: 'monospace', fontWeight: 800, color: '#5eead4' }}>
              {explanation.valueFormatted}
            </span>
            {explanation.diffVsBFormatted && (
              <div style={{ fontSize: '0.74rem', color: '#4ade80', fontWeight: 700 }}>
                {explanation.diffVsBFormatted}
              </div>
            )}
          </div>
        </div>

        {/* Contributing Factors & Input Parameters */}
        {explanation.contributingFactors && explanation.contributingFactors.length > 0 && (
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🧩 Contributing Fields &amp; Variables:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {explanation.contributingFactors.map((factor, idx) => (
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
                      {factor.name}
                    </div>
                    {factor.description && (
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        {factor.description}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 700, color: '#fbcfe8' }}>
                    {factor.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step-by-Step Actual Calculation Breakdown */}
        {explanation.calculationSteps && explanation.calculationSteps.length > 0 && (
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a78bfa', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🧮 Step-by-Step Actual Calculation:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {explanation.calculationSteps.map((step) => (
                <div
                  key={step.stepNumber}
                  style={{
                    background: '#111827',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        background: '#6366f1',
                        color: '#ffffff',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {step.stepNumber}
                      </span>
                      <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f8fafc' }}>
                        {step.description}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.80rem', fontFamily: 'monospace', fontWeight: 800, color: '#5eead4' }}>
                      {step.result}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace', background: '#0a0f1d', padding: '4px 8px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                    {step.formula}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Derivation / Formula Step (Fallback if no steps) */}
        {(!explanation.calculationSteps || explanation.calculationSteps.length === 0) && explanation.derivationFormula && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
              🧮 Mathematical Derivation:
            </div>
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '6px', padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.80rem', color: '#bae6fd', lineHeight: 1.4 }}>
              {explanation.derivationFormula}
            </div>
          </div>
        )}

        {/* Contextual Explanation */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
            📖 Context &amp; Statutory Rationale:
          </div>
          <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5, background: '#1e293b', padding: '12px 14px', borderRadius: '6px', border: '1px solid #334155' }}>
            {explanation.explanation}
          </div>
        </div>

        {/* Legal Reference with Scroll Action */}
        {explanation.legalCitation && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', padding: '10px 14px' }}>
            <div>
              <div style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Statutory Legal Reference:
              </div>
              <div style={{ fontSize: '0.80rem', color: '#38bdf8', fontWeight: 700 }}>
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
                  background: '#0284c7',
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
