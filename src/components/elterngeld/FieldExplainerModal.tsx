import "./ElterngeldPanels.css";
import type {
  JSX,
} from "preact";
import {
  type FieldExplanation,
} from "#engine/explanation/timelineExplainer";
import LawRefLink from "#components/laws/LawRefLink";
import {
  LEGAL_RULE_LAW_MAP,
  activeLegalRuleKey,
} from "#store/elterngeldStore";
import {
  StepTransitionIcon,
} from "#components/Icons";
import {
  ModalDialog,
  ModalDialogSize,
} from "#components/ui/ModalDialog";

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
  if (!explanation) {
    return null;
  }

  return (
    <ModalDialog
      open
      onClose={onClose}
      eyebrow="Field Calculation & Statutory Audit"
      title={explanation.fieldTitle}
      size={ModalDialogSize.Medium}
    >
      <div className="eg-modal-stack">
        <div className="eg-modal-highlight">
          <span className="eg-modal-highlight__label">Active Value:</span>
          <div className="eg-modal-highlight__values">
            <span className="eg-modal-highlight__figure">
              {explanation.valueFormatted}
            </span>
            {explanation.diffVsBFormatted && (
              <div className="eg-modal-highlight__diff">
                {explanation.diffVsBFormatted}
              </div>
            )}
          </div>
        </div>

        {explanation.contributingFactors && explanation.contributingFactors.length > 0 && (
          <div>
            <div className="eg-modal-section-label">
              Contributing Factors &amp; Baseline Inputs
            </div>
            <div className="eg-modal-factors">
              {explanation.contributingFactors.map((f, i) => (
                <div key={i} className="eg-modal-factor">
                  <span className="eg-modal-factor__name">
                    {f.lawId ? (
                      <LawRefLink
                        lawId={f.lawId}
                        label={f.name}
                        variant="plain"
                        showIcon={false}
                      />
                    ) : f.name}
                  </span>
                  <span className="eg-modal-factor__value">{f.value}</span>
                  {f.description && (
                    <span className="eg-modal-factor__desc">{f.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {explanation.calculationSteps && explanation.calculationSteps.length > 0 && (
          <div>
            <div className="eg-modal-section-label">
              Step-by-Step Mathematical Derivation
            </div>
            <div className="eg-modal-list">
              {explanation.calculationSteps.map((step, idx) => (
                <div key={idx} className="eg-modal-step">
                  <div className="eg-modal-step__head">
                    <span className="eg-modal-step__desc">
                      Step {step.stepNumber}: {step.description}
                    </span>
                    <span className="eg-modal-step__result">{step.result}</span>
                  </div>
                  {step.formula && (
                    <div className="eg-modal-step__formula">{step.formula}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="eg-modal-section-label">
            Statutory &amp; Economic Context
          </div>
          <div className="eg-modal-note">{explanation.explanation}</div>
        </div>

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
