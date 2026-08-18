import type { JSX } from "preact";
import { type FieldExplanation } from "#engine/explanation/timelineExplainer";
import { scrollToLegalRule } from "#store/elterngeldStore";
import { DismissIcon, StepTransitionIcon } from "#components/Icons";

/**
 * Field-Level Drill-Down Explanation Modal Component Properties.
 */
export interface FieldExplainerModalProps {
  /** Active field explanation data payload to render, or null if modal is closed. */
  readonly explanation: FieldExplanation | null;
  /** Callback triggered when user dismisses the modal. */
  readonly onClose: () => void;
}

export default function FieldExplainerModal({
  explanation,
  onClose,
}: FieldExplainerModalProps): JSX.Element | null {
  if (!explanation) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--border-radius-lg)",
          padding: "24px",
          maxWidth: "620px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          animation: "fadeIn 0.15s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "var(--color-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Field Calculation &amp; Statutory Audit
            </div>
            <h3
              style={{
                margin: "4px 0 0 0",
                fontSize: "1.2rem",
                color: "var(--text-primary)",
                fontWeight: 800,
              }}
            >
              {explanation.fieldTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--bg-surface-secondary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
              borderRadius: "var(--border-radius-sm)",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 700,
            }}
          >
            <DismissIcon size={14} />
          </button>
        </div>

        {/* Formatted Value & Variance */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-surface-secondary)",
            padding: "12px 16px",
            borderRadius: "var(--border-radius)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <span
            style={{
              fontSize: "0.84rem",
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            Active Value:
          </span>
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                fontSize: "1.35rem",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 800,
                color: "var(--color-primary)",
              }}
            >
              {explanation.valueFormatted}
            </span>
            {explanation.diffVsBFormatted && (
              <div
                style={{
                  fontSize: "0.74rem",
                  color: "var(--color-gain)",
                  fontWeight: 700,
                }}
              >
                {explanation.diffVsBFormatted}
              </div>
            )}
          </div>
        </div>

        {/* Contributing Factors & Input Parameters */}
        {explanation.contributingFactors &&
          explanation.contributingFactors.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Contributing Factors &amp; Baseline Inputs
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "8px",
                }}
              >
                {explanation.contributingFactors.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--bg-surface-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--border-radius-sm)",
                      padding: "8px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {f.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.86rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {f.value}
                    </span>
                    {f.description && (
                      <span
                        style={{
                          fontSize: "0.66rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {f.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Step-by-Step Calculation Breakdown */}
        {explanation.calculationSteps &&
          explanation.calculationSteps.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Step-by-Step Mathematical Derivation
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {explanation.calculationSteps.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--bg-surface-secondary)",
                      borderLeft: "3px solid var(--color-primary)",
                      padding: "8px 12px",
                      borderRadius: "0 6px 6px 0",
                      borderTop: "1px solid var(--border-subtle)",
                      borderRight: "1px solid var(--border-subtle)",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Step {step.stepNumber}: {step.description}
                      </span>
                      <span
                        style={{
                          fontSize: "0.84rem",
                          fontWeight: 700,
                          color: "var(--color-primary)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {step.result}
                      </span>
                    </div>
                    {step.formula && (
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          fontVariantNumeric: "tabular-nums",
                          background: "var(--bg-surface)",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          border: "1px solid var(--border-subtle)",
                          marginTop: "4px",
                        }}
                      >
                        {step.formula}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Narrative Description & Rationale */}
        <div>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            Statutory &amp; Economic Context
          </div>
          <div
            style={{
              fontSize: "0.84rem",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              background: "var(--bg-surface-secondary)",
              padding: "12px 14px",
              borderRadius: "var(--border-radius-sm)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {explanation.explanation}
          </div>
        </div>

        {/* Action Button: Jump to Legal Rule Explainer */}
        {explanation.legalRuleKey && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              paddingTop: "8px",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                onClose();
                if (explanation.legalRuleKey) {
                  scrollToLegalRule(explanation.legalRuleKey);
                }
              }}
              style={{
                background: "var(--color-primary-bg)",
                border: "1px solid var(--color-primary-border)",
                color: "var(--color-primary)",
                padding: "8px 16px",
                borderRadius: "var(--border-radius-sm)",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "var(--transition)",
              }}
            >
              <span>View Full Statutory Rule &amp; Case Law</span>
              <StepTransitionIcon size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
