import "./CalculationStatus.css";
import {
  type JSX,
} from "preact";
import {
  type EuroAmount,
  type SimulationResult,
  ScenarioId,
} from "#engine/types";

function formatTaxCurrency(amount: EuroAmount): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}

const scenarioLabels: Record<ScenarioId, string> = {
  [ScenarioId.A]: "A",
  [ScenarioId.B]: "B",
  [ScenarioId.C]: "C",
};

/** Keep availability visible while leaving supporting audit detail on demand. */
export default function CalculationStatus({ result }: { result: SimulationResult }): JSX.Element {
  const missingBenefits = result.benefitsComplete !== true;
  const missingTax = result.taxComplete === false;
  const provisionalPayroll = result.payrollComplete === false;
  const reasons = result.unavailableReasons ?? [];

  return (
    <section className="calculation-status glass-panel" aria-labelledby="calculation-status-heading">
      <div className="calculation-status__heading">
        <h2 id="calculation-status-heading">Calculation status</h2>
        <span>Summary · Scenario {scenarioLabels[result.scenarioKey]}</span>
      </div>
      <dl className="calculation-status__overview">
        <div>
          <dt>Benefits</dt>
          <dd className={missingBenefits ? "calculation-status__warning" : ""}>{missingBenefits ? "Incomplete" : "Modeled under assumptions"}</dd>
        </div>
        <div>
          <dt>Payroll</dt>
          <dd className={provisionalPayroll ? "calculation-status__warning" : ""}>{provisionalPayroll ? "Supplied or provisional" : "Modeled"}</dd>
        </div>
        <div>
          <dt>Annual tax</dt>
          <dd className={missingTax ? "calculation-status__warning" : ""}>{missingTax ? "Some balances unavailable" : "Modeled"}</dd>
        </div>
      </dl>
      {(missingBenefits || missingTax) && (
        <p className="calculation-status__notice">Partial cash flow: totals omit unavailable {missingBenefits && missingTax ? "benefit payments and annual tax settlements" : missingBenefits ? "benefit payments" : "annual tax settlements"}. Review the reasons below before comparing scenarios.</p>
      )}
      {provisionalPayroll && <p className="calculation-status__notice">Payroll includes supplied values or provisional estimates. Review the assumptions before relying on the totals.</p>}
      {reasons.length > 0 && (
        <details>
          <summary>Unavailable calculations ({reasons.length})</summary>
          <ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        </details>
      )}
      <details>
        <summary>Assessment history and assumptions</summary>
        <ul>{(result.assumptions ?? []).map((note) => <li key={note}>{note}</li>)}</ul>
        {(result.benefitAssessments ?? []).map((assessment) => (
          <p key={`${assessment.pregnancyId}-${assessment.parent}`}>
            {assessment.parent}, birth {assessment.birthMonthId}: class {assessment.taxClass};
            {" "}assessment months {assessment.selectedMonths.join(", ")}.
            {assessment.assumedMonths.length > 0 && ` Repeated initial inputs: ${assessment.assumedMonths.join(", ")}.`}
            {assessment.reason && ` Unavailable: ${assessment.reason}`}
          </p>
        ))}
      </details>
      <details>
        <summary>Annual tax settlements and cash timing</summary>
        <p>Signed tax cash flow within the period: {formatTaxCurrency(result.summary.totalTaxRefunds)}</p>
        <ul>{(result.annualTaxRecords ?? []).map((record) => (
          <li key={record.calendarYear}>
            {record.calendarYear}: {record.assessment ? formatTaxCurrency(record.assessment.settlement) : "Unavailable"}.
            {" "}Planned {record.settlementMonthId}, {record.scheduledMonthInHorizon ? "within" : "outside"} the cash-flow period.
            {record.reasons.map((reason) => <p key={reason}>{reason}</p>)}
          </li>
        ))}</ul>
      </details>
    </section>
  );
}
