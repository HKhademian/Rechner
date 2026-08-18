import type {
  JSX, 
} from "preact";
import {
  type RowExplanation, 
} from "#engine/explanation/timelineExplainer";
import {
  ExplainerRowType, 
} from "#engine/types";
import {
  scrollToLegalRule, 
} from "#store/elterngeldStore";
import {
  SimulationPeriodIcon,
  SpecialEventTriggerIcon,
  FinancialInflowIcon,
  DismissIcon,
  StepTransitionIcon,
} from "#components/Icons";

/**
 * Row Explanation Modal Component Properties.
 */
export interface RowExplainerModalProps {
  /** Active row explanation data payload to render, or null if modal is closed. */
  readonly explanation: RowExplanation | null;
  /** Callback triggered when user dismisses the modal. */
  readonly onClose: () => void;
}

export default function RowExplainerModal({
  explanation,
  onClose,
}: RowExplainerModalProps): JSX.Element | null {
  if (!explanation) {
    return null;
  }

  const isMonth = explanation.rowType === ExplainerRowType.Month;
  const isAction = explanation.rowType === ExplainerRowType.Action;

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
          maxWidth: "680px",
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
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                className={
                  isMonth
                    ? "badge-brand"
                    : isAction
                      ? "badge-warning"
                      : "badge-gain"
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                {isMonth ? (
                  <>
                    <SimulationPeriodIcon size={12} />
                    <span>Monthly Audit</span>
                  </>
                ) : isAction ? (
                  <>
                    <SpecialEventTriggerIcon size={12} />
                    <span>Lifecycle Action</span>
                  </>
                ) : (
                  <>
                    <FinancialInflowIcon size={12} />
                    <span>Fiscal Event</span>
                  </>
                )}
              </span>
              <span
                style={{
                  fontSize: "0.74rem",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                {explanation.phaseOrCategory}
              </span>
            </div>
            <h3
              style={{
                margin: "6px 0 2px 0",
                fontSize: "1.25rem",
                color: "var(--text-primary)",
                fontWeight: 800,
              }}
            >
              {explanation.title}
            </h3>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--text-secondary)",
              }}
            >
              {explanation.subtitle}
            </div>
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

        {/* Summary Description */}
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
          {explanation.summaryDescription}
        </div>

        {/* Breakdown Items List */}
        {explanation.streams && explanation.streams.length > 0 && (
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
              Cash Flow Stream Decomposition
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {explanation.streams.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "var(--bg-surface-secondary)",
                    padding: "8px 12px",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {item.valueFormatted}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Net Inflow Summary & Variance */}
        {explanation.totalNetInflowFormatted && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--color-gain-bg)",
              padding: "12px 16px",
              borderRadius: "var(--border-radius)",
              border: "1px solid var(--color-gain-border)",
            }}
          >
            <span
              style={{
                fontSize: "0.86rem",
                color: "var(--color-gain)",
                fontWeight: 700,
              }}
            >
              Total Net Cash Inflow for this Period:
            </span>
            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  fontSize: "1.35rem",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 800,
                  color: "var(--color-gain)",
                }}
              >
                {explanation.totalNetInflowFormatted}
              </span>
              {explanation.diffVsBFormatted && (
                <div
                  style={{
                    fontSize: "0.74rem",
                    color: "var(--color-gain)",
                    fontWeight: 700,
                  }}
                >
                  {explanation.diffVsBFormatted} vs Scenario B
                </div>
              )}
            </div>
          </div>
        )}

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
