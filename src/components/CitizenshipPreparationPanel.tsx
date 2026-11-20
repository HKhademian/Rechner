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
  CitizenshipPathway,
  evaluateCitizenshipPreparation,
  toCitizenshipPathway,
} from "#engine/lifeProfile/citizenshipPreparation";
import {
  EvidenceStatus,
} from "#engine/lifeProfile/residencyPreparation";
import CalculationExplanationPanel from "#components/CalculationExplanationPanel";

export interface CitizenshipPreparationPanelProps {
  readonly events: readonly LifeEvent<unknown>[];
  readonly personId: PersonId;
  readonly date: string;
  readonly includePlanned: boolean;
  readonly jurisdiction: JurisdictionCode;
  readonly allowProjection: boolean;
}

function formatStatus(status: EvidenceStatus): string {
  if (status === EvidenceStatus.Recorded) {
    return "Ready";
  }
  if (status === EvidenceStatus.NeedsAuthorityReview) {
    return "Verify with authority";
  }
  return "Missing";
}

export default function CitizenshipPreparationPanel({
  events,
  personId,
  date,
  includePlanned,
  jurisdiction,
  allowProjection,
}: CitizenshipPreparationPanelProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [pathway, setPathway] = useState<CitizenshipPathway>(CitizenshipPathway.StandardFiveYear);
  const [hasIdentity, setHasIdentity] = useState(false);
  const [hasLanguage, setHasLanguage] = useState(false);
  const [hasTest, setHasTest] = useState(false);
  const [hasLivelihood, setHasLivelihood] = useState(false);
  const [hasCivilDocs, setHasCivilDocs] = useState(false);
  const [hasEligibleTitle, setHasEligibleTitle] = useState(false);

  let evaluation;
  if (expanded && date) {
    try {
      const asOf: LifeDate = toLifeDate(date);
      evaluation = evaluateCitizenshipPreparation({
        events,
        personId,
        asOf,
        includePlanned,
        pathway,
        jurisdiction,
        allowProjection,
        documents: {
          hasValidIdentityAndPassport: hasIdentity,
          hasLanguageB1Certificate: hasLanguage,
          hasNaturalizationTest: hasTest,
          hasIndependentLivelihoodProof: hasLivelihood,
          hasCivilStatusCertificates: hasCivilDocs,
          hasEligibleResidenceTitle: hasEligibleTitle,
        },
      });
    }
    catch {
      evaluation = undefined;
    }
  }

  return <section className="life-monthly" aria-label="Citizenship preparation">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide citizenship preparation" : "Prepare citizenship (Einbürgerung)"}
    </button>
    {expanded && <>
      <p>Track residence duration, document readiness and application milestones under Germany&apos;s Citizenship Act (StAG). This checklist does not replace an official Einbürgerungsbehörde review.</p>
      <div className="life-people__form">
        <label className="life-people__field">Naturalization pathway
          <select value={pathway} onChange={(event) => setPathway(toCitizenshipPathway(event.currentTarget.value))}>
            <option value={CitizenshipPathway.StandardFiveYear}>Standard route (§ 10 Abs. 1 StAG · 5 years)</option>
            <option value={CitizenshipPathway.SpousalThreeYear}>Spouse of German citizen (§ 9 StAG · 3 years)</option>
          </select>
        </label>
        <label><input type="checkbox" checked={hasEligibleTitle} onChange={(event) => setHasEligibleTitle(event.currentTarget.checked)} /> Eligible residence title</label>
        <label><input type="checkbox" checked={hasIdentity} onChange={(event) => setHasIdentity(event.currentTarget.checked)} /> Passport &amp; Meldebescheinigung ready</label>
        <label><input type="checkbox" checked={hasLanguage} onChange={(event) => setHasLanguage(event.currentTarget.checked)} /> B1 German certificate ready</label>
        <label><input type="checkbox" checked={hasTest} onChange={(event) => setHasTest(event.currentTarget.checked)} /> Einbürgerungstest passed</label>
        <label><input type="checkbox" checked={hasLivelihood} onChange={(event) => setHasLivelihood(event.currentTarget.checked)} /> Independent livelihood proof ready</label>
        <label><input type="checkbox" checked={hasCivilDocs} onChange={(event) => setHasCivilDocs(event.currentTarget.checked)} /> Birth / marriage certificates ready</label>
      </div>
      {!evaluation ? <p>Choose a valid view date above to evaluate citizenship preparation.</p> : <>
        {!evaluation.supported ? <p>No verified citizenship rule applies for this jurisdiction and date.</p> : <>
          <p>
            <strong>Potential earliest application date:</strong>{" "}
            {evaluation.potentialEarliestApplicationDate
              ? `${evaluation.potentialEarliestApplicationDate} (${evaluation.requiredMonths} months from ${evaluation.residenceStartDate})`
              : "Record your earliest residence permit start date in the timeline to calculate a potential date."}
          </p>
          {evaluation.totalAbsenceDays > 0 && <p>
            <strong>Recorded absences:</strong> {evaluation.totalAbsenceDays} days{evaluation.hasContinuityRisk ? " (includes >=180-day absence — verify § 12b StAG continuity)." : "."}
          </p>}
          <div className="life-monthly__scroll">
            <table>
              <thead>
                <tr>
                  <th>Requirement / Document</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.checklist.map((item) => <tr key={item.id}>
                  <th scope="row">{item.label}</th>
                  <td>{formatStatus(item.status)}</td>
                  <td>{item.detail}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {evaluation.citizenshipMilestones.length > 0 && <>
            <h4>Citizenship milestones</h4>
            <ul className="calc-explain__list">
              {evaluation.citizenshipMilestones.map((milestone, index) => <li key={`${milestone.payload.title}-${index}`}>
                {milestone.date ?? "Date unknown"} · {milestone.payload.title} ({milestone.payload.stage})
              </li>)}
            </ul>
          </>}
        </>}
        <CalculationExplanationPanel
          explanation={evaluation.explanation}
          summary="Explain citizenship preparation rule and sources"
        />
      </>}
    </>}
  </section>;
}
