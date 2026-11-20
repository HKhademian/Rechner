import {
  type JSX,
} from "preact";
import {
  sitePath,
} from "#/apps/appDefinition.ts";
import LawRefLink from "#components/laws/LawRefLink";
import {
  TopicHelp,
} from "#components/topics/TopicHelp";
import {
  type CalculationExplanation,
  ExplanationFormulaKind,
  ExplanationStatus,
} from "#engine/lifeProfile/calculationExplanation";
import {
  JurisdictionCode,
  RuleResolutionStatus,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  topicPath,
} from "#utils/topicPath";
import "./CalculationExplanationPanel.css";

function statusLabel(explanation: CalculationExplanation): string {
  if (explanation.status === ExplanationStatus.Unsupported) {
    return "No supported rule applies";
  }
  if (explanation.status === ExplanationStatus.Projected) {
    return "Projected from latest verified rule";
  }
  return explanation.kind === ExplanationFormulaKind.Statutory
    ? "Verified statutory rule"
    : "Pure arithmetic formula";
}

function jurisdictionLabel(code: JurisdictionCode): string {
  return code === JurisdictionCode.GermanyFederal
    ? "Germany (federal · DE)"
    : "Other / unsupported jurisdiction";
}

export interface CalculationExplanationPanelProps {
  readonly explanation: CalculationExplanation;
  readonly summary?: string;
}

/** Displays formula, inputs, resolved statutory parameters, jurisdiction, effective dates and sources. */
export default function CalculationExplanationPanel({
  explanation,
  summary = "Inspect formula, inputs and rules",
}: CalculationExplanationPanelProps): JSX.Element {
  return <details className="calc-explain">
    <summary>{summary}</summary>
    <div className="calc-explain__body">
      <div className="calc-explain__meta">
        <span><strong>Status:</strong> {statusLabel(explanation)}</span>
        <span><strong>Formula:</strong> {explanation.formulaName} (<code>{explanation.formulaVersion}</code>)</span>
        {explanation.jurisdiction && <span><strong>Jurisdiction:</strong> {jurisdictionLabel(explanation.jurisdiction)}</span>}
        {explanation.effectiveDate && <span><strong>Date:</strong> {explanation.effectiveDate}</span>}
      </div>
      <p><strong>Expression:</strong> <code>{explanation.formulaExpression}</code></p>
      {explanation.unsupportedReason && <p className="calc-explain__notice" role="status">{explanation.unsupportedReason}</p>}
      <div>
        <strong>Inputs</strong>
        <ul className="calc-explain__list">
          {explanation.inputs.map((item) => <li key={`${item.label}-${item.source}`}>
            {item.label}: <strong>{item.value}</strong> ({item.source})
          </li>)}
        </ul>
      </div>
      {explanation.parameters.length > 0 && <div>
        <strong>Statutory parameters and effective dates</strong>
        <ul className="calc-explain__list">
          {explanation.parameters.map((parameter) => <li key={`${parameter.label}-${parameter.effectiveFrom}`}>
            {parameter.parameterId
              ? <a href={sitePath(`/constants/${parameter.parameterId}/`)}>{parameter.label}</a>
              : parameter.label}
            : <strong>{parameter.value}</strong> · {jurisdictionLabel(parameter.jurisdiction)} · effective {parameter.effectiveFrom} to {parameter.effectiveTo} · {parameter.status === RuleResolutionStatus.Projected ? "Projected" : "Enacted"}
          </li>)}
        </ul>
      </div>}
      {(explanation.lawIds.length > 0 || explanation.topicIds.length > 0) && <div className="calc-explain__refs">
        <strong>References:</strong>
        {explanation.lawIds.map((lawId) => <LawRefLink key={lawId} lawId={lawId} variant="badge" />)}
        {explanation.topicIds.map((topicId) => <span key={topicId} className="calc-explain__refs">
          <a href={topicPath(topicId)}>Topic guide</a>
          <TopicHelp id={topicId} />
        </span>)}
        <a href={sitePath("/formulas/")}>Formula catalog</a>
        <a href={sitePath("/constants/")}>Rates &amp; parameters</a>
      </div>}
      {explanation.assumptions.length > 0 && <div>
        <strong>Assumptions and limits</strong>
        <ul className="calc-explain__list">
          {explanation.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
        </ul>
      </div>}
    </div>
  </details>;
}
