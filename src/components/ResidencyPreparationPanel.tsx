import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  type LifeDate,
  type PersonId,
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
} from "#engine/lifeProfile/timeline";
import {
  type JurisdictionCode,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  EvidenceStatus,
  PermanentResidencyRoute,
  evaluateResidencyPreparation,
  toPermanentResidencyRoute,
} from "#engine/lifeProfile/residencyPreparation";
import CalculationExplanationPanel from "#components/CalculationExplanationPanel";

export interface ResidencyPreparationPanelProps {
  readonly events: readonly LifeEvent<unknown>[];
  readonly personId: PersonId;
  readonly date: string;
  readonly includePlanned: boolean;
  readonly jurisdiction: JurisdictionCode;
  readonly allowProjection: boolean;
}

function formatEvidenceStatus(status: EvidenceStatus): string {
  if (status === EvidenceStatus.Recorded) {
    return "Ready";
  }
  if (status === EvidenceStatus.NeedsAuthorityReview) {
    return "Verify with authority";
  }
  return "Missing";
}

export default function ResidencyPreparationPanel({
  events,
  personId,
  date,
  includePlanned,
  jurisdiction,
  allowProjection,
}: ResidencyPreparationPanelProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [route, setRoute] = useState<PermanentResidencyRoute>(PermanentResidencyRoute.BlueCardB1);
  const [hasLanguage, setHasLanguage] = useState(false);
  const [hasPension, setHasPension] = useState(false);
  const [hasCivicTest, setHasCivicTest] = useState(false);
  const [hasLivelihood, setHasLivelihood] = useState(false);

  let evaluation;
  if (expanded && date) {
    try {
      const asOf: LifeDate = toLifeDate(date);
      evaluation = evaluateResidencyPreparation({
        events,
        personId,
        asOf,
        includePlanned,
        route,
        jurisdiction,
        allowProjection,
        evidence: {
          hasLanguageCertificate: hasLanguage,
          hasPensionHistoryProof: hasPension,
          hasCivicTestCertificate: hasCivicTest,
          hasLivelihoodAndHousingProof: hasLivelihood,
        },
      });
    }
    catch {
      evaluation = undefined;
    }
  }

  return <section className="life-monthly" aria-label="Residence permits and permanent residency preparation">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide permanent residency preparation" : "Prepare residence & permanent residency"}
    </button>
    {expanded && <>
      <p>Track permits, absences and milestones for a verified Germany federal route. This is a preparation aid and not an official Ausländerbehörde decision. You can also explore eligibility thresholds in the <a href="/calculators/visa/">Visa &amp; Blue Card calculator</a>.</p>
      <div className="life-people__form">
        <label className="life-people__field">Target permanent residency route
          <select value={route} onChange={(event) => setRoute(toPermanentResidencyRoute(event.currentTarget.value))}>
            <option value={PermanentResidencyRoute.BlueCardB1}>EU Blue Card + B1 German (21 months)</option>
            <option value={PermanentResidencyRoute.BlueCardA1}>EU Blue Card + A1 German (27 months)</option>
            <option value={PermanentResidencyRoute.SkilledWorkerGermanGraduate}>German graduate skilled worker (24 months)</option>
            <option value={PermanentResidencyRoute.SkilledWorkerStandard}>Skilled worker standard route (36 months)</option>
          </select>
        </label>
        <label><input type="checkbox" checked={hasLanguage} onChange={(event) => setHasLanguage(event.currentTarget.checked)} /> Language certificate ready</label>
        <label><input type="checkbox" checked={hasPension} onChange={(event) => setHasPension(event.currentTarget.checked)} /> Pension history (Rentenversicherungsverlauf) ready</label>
        <label><input type="checkbox" checked={hasCivicTest} onChange={(event) => setHasCivicTest(event.currentTarget.checked)} /> Leben in Deutschland / civic test ready</label>
        <label><input type="checkbox" checked={hasLivelihood} onChange={(event) => setHasLivelihood(event.currentTarget.checked)} /> Income, lease &amp; health insurance proof ready</label>
      </div>
      {!evaluation ? <p>Choose a valid view date above to evaluate residency preparation.</p> : <>
        {evaluation.expiringPermits.length > 0 && <ul className="calc-explain__list">
          {evaluation.expiringPermits.map((alert) => <li key={`${alert.permitKind}-${alert.expiryDate}`}>
            <strong>{alert.expired ? "Permit expired" : "Permit expiring soon"}:</strong> {alert.label ?? alert.permitKind} ({alert.expiryDate}, {alert.expired ? `${Math.abs(alert.daysRemaining)} days ago` : `in ${alert.daysRemaining} days`}).
          </li>)}
        </ul>}
        {!evaluation.supported ? <p>No verified statutory residency rule applies for this jurisdiction and date.</p> : <>
          <p>
            <strong>Potential earliest application date:</strong>{" "}
            {evaluation.potentialEarliestApplicationDate
              ? `${evaluation.potentialEarliestApplicationDate} (${evaluation.requiredMonths} months from ${evaluation.qualifyingStartDate})`
              : "Record a qualifying residence permit with an exact issue or start date in the timeline above."}
          </p>
          {evaluation.totalAbsenceDays > 0 && <p>
            <strong>Recorded absences:</strong> {evaluation.totalAbsenceDays} days{evaluation.hasLongAbsenceRisk ? " (continuity risk — verify with Ausländerbehörde)." : "."}
          </p>}
          <div className="life-monthly__scroll">
            <table>
              <thead>
                <tr>
                  <th>Requirement / Evidence</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.evidenceChecklist.map((item) => <tr key={item.id}>
                  <th scope="row">{item.label}</th>
                  <td>{formatEvidenceStatus(item.status)}</td>
                  <td>{item.detail}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {evaluation.milestones.length > 0 && <>
            <h4>Recorded application milestones</h4>
            <ul className="calc-explain__list">
              {evaluation.milestones.map((milestone, index) => <li key={`${milestone.payload.title}-${index}`}>
                {milestone.date ?? "Date unknown"} · {milestone.payload.title} ({milestone.payload.target} · {milestone.payload.stage})
              </li>)}
            </ul>
          </>}
        </>}
        <CalculationExplanationPanel
          explanation={evaluation.explanation}
          summary="Explain permanent residency rule and sources"
        />
      </>}
    </>}
  </section>;
}
