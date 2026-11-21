import "./ElterngeldPanels.css";
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
  Badge,
  BadgeTone,
} from "#components/ui/Badge";
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
  const badgeTone = isMonth
    ? BadgeTone.Brand
    : isAction
      ? BadgeTone.Warning
      : BadgeTone.Gain;

  return (
    <ModalDialog
      open
      onClose={onClose}
      eyebrow={(
        <span className="eg-modal-eyebrow">
          <Badge tone={badgeTone}>
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
          </Badge>
          <span className="eg-modal-eyebrow__phase">
            {explanation.phaseOrCategory}
          </span>
        </span>
      )}
      title={explanation.title}
      subtitle={explanation.subtitle}
      size={ModalDialogSize.Medium}
    >
      <div className="eg-modal-stack">
        <div className="eg-modal-note">
          {explanation.summaryDescription}
        </div>

        {explanation.streams && explanation.streams.length > 0 && (
          <div>
            <div className="eg-modal-section-label">
              Cash Flow Stream Decomposition
            </div>
            <div className="eg-modal-list">
              {explanation.streams.map((item, idx) => (
                <div key={idx} className="eg-modal-stream-row">
                  <span className="eg-modal-stream-row__label">{item.label}</span>
                  <span className="eg-modal-stream-row__value">{item.valueFormatted}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {explanation.totalNetInflowFormatted && (
          <div className="eg-modal-highlight eg-modal-highlight--gain">
            <span className="eg-modal-highlight__label">
              Total Net Cash Inflow for this Period:
            </span>
            <div className="eg-modal-highlight__values">
              <span className="eg-modal-highlight__figure">
                {explanation.totalNetInflowFormatted}
              </span>
              {explanation.diffVsBFormatted && (
                <div className="eg-modal-highlight__diff">
                  {explanation.diffVsBFormatted} vs Scenario B
                </div>
              )}
            </div>
          </div>
        )}

        {explanation.legalRuleKey && (
          <div className="eg-modal-footer-action">
            <LawRefLink
              lawId={LEGAL_RULE_LAW_MAP[explanation.legalRuleKey].lawId}
              groupId={LEGAL_RULE_LAW_MAP[explanation.legalRuleKey].groupId}
              variant="plain"
              className="ui-btn ui-btn--tint ui-btn--sm"
              onOpen={() => {
                if (explanation.legalRuleKey) {
                  activeLegalRuleKey.value = explanation.legalRuleKey;
                }
                onClose();
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
