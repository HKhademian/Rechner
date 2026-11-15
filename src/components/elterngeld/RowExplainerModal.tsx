import type {
  JSX, 
} from "preact";
import {
  type RowExplanation, 
} from "#engine/explanation/timelineExplainer";
import {
  ExplainerRowType, 
} from "#engine/types";
import LawRefLink from "#components/laws/LawRefLink";
import {
  LEGAL_RULE_LAW_MAP,
  activeLegalRuleKey,
} from "#store/elterngeldStore";
import {
  SimulationPeriodIcon,
  SpecialEventTriggerIcon,
  FinancialInflowIcon,
  StepTransitionIcon,
} from "#components/Icons";
import {
  ModalDialog,
  ModalDialogSize,
} from "#components/ui/ModalDialog";

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
    <ModalDialog
      open
      onClose={onClose}
      eyebrow={(
        <span
          style={{
            display: "inline-flex",
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
              textTransform: "none",
              letterSpacing: "normal",
            }}
          >
            {explanation.phaseOrCategory}
          </span>
        </span>
      )}
      title={explanation.title}
      subtitle={explanation.subtitle}
      size={ModalDialogSize.Medium}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >

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

        {/* Action Link: Open Statutory Reference Popup or Ctrl+Click Full Law Page */}
        {explanation.legalRuleKey && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              paddingTop: "8px",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <LawRefLink
              lawId={LEGAL_RULE_LAW_MAP[explanation.legalRuleKey].lawId}
              groupId={LEGAL_RULE_LAW_MAP[explanation.legalRuleKey].groupId}
              variant="plain"
              onOpen={() => {
                if (explanation.legalRuleKey) {
                  activeLegalRuleKey.value = explanation.legalRuleKey;
                }
                onClose();
              }}
              style={{
                background: "var(--color-primary-bg)",
                border: "1px solid var(--color-primary-border)",
                color: "var(--color-primary)",
                padding: "8px 16px",
                borderRadius: "var(--border-radius-sm)",
                fontSize: "0.8rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "var(--transition)",
              }}
            >
              <span>Open Statutory Reference Popup</span>
              <StepTransitionIcon size={14} />
            </LawRefLink>
          </div>
        )}
      </div>
    </ModalDialog>
  );
}
