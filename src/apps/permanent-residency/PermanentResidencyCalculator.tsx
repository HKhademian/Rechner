import "#/components/DomainCalculator.css";
import "#/components/LifeMonthlyView.css";
import {
  type JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  permanentResidencyStore,
} from "#/apps/permanent-residency/permanentResidencyStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import CalculationExplanationPanel from "#components/CalculationExplanationPanel";
import {
  AppShell,
} from "#components/ui/AppShell";
import {
  MetricCard,
  MetricTone,
} from "#components/ui/MetricCard";
import {
  NumberField,
} from "#components/ui/NumberField";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  ResidencePermitKind,
  residenceInterruptionModule,
  residencePermitModule,
  toResidencePermitKind,
} from "#engine/lifeProfile/residencePermitEvent";
import {
  EvidenceStatus,
  PermanentResidencyRoute,
  evaluateResidencyPreparation,
  toPermanentResidencyRoute,
} from "#engine/lifeProfile/residencyPreparation";
import {
  JurisdictionCode,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  type LifeEvent,
  LifeEventStatus,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";

const STANDALONE_PERSON = toPersonId("standalone-applicant");

function safeDate(value: string, fallback: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try {
      return toLifeDate(value);
    }
    catch {
      return toLifeDate(fallback);
    }
  }
  return toLifeDate(fallback);
}

function formatEvidenceStatus(status: EvidenceStatus): string {
  if (status === EvidenceStatus.Recorded) {
    return "Ready";
  }
  if (status === EvidenceStatus.NeedsAuthorityReview) {
    return "Authority review";
  }
  return "Missing";
}

export default function PermanentResidencyCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? permanentResidencyStore.state.value : permanentResidencyStore.defaultState;

  const issueDate = safeDate(state.permitIssueDate, "2024-06-01");
  const rawExpiry = safeDate(state.permitExpiryDate, "2028-05-31");
  const expiryDate = rawExpiry >= issueDate ? rawExpiry : issueDate;
  const asOfDate = safeDate(state.asOfDate, "2026-04-01");

  const syntheticEvents: LifeEvent<unknown>[] = [
    {
      id: toLifeEventId("standalone-permit-1"),
      personId: STANDALONE_PERSON,
      kind: residencePermitModule.kind,
      status: LifeEventStatus.Actual,
      date: issueDate,
      payload: {
        permitKind: state.permitKind,
        issueDate,
        expiryDate,
        countryCode: "DE",
        label: "Current residence permit",
      },
    },
  ];

  if (state.absenceDays > 0) {
    syntheticEvents.push({
      id: toLifeEventId("standalone-absence-1"),
      personId: STANDALONE_PERSON,
      kind: residenceInterruptionModule.kind,
      status: LifeEventStatus.Actual,
      date: asOfDate,
      payload: {
        days: state.absenceDays,
        reason: "Recorded stays abroad",
      },
    });
  }

  const result = evaluateResidencyPreparation({
    events: syntheticEvents,
    personId: STANDALONE_PERSON,
    asOf: asOfDate,
    includePlanned: true,
    route: state.route,
    jurisdiction: JurisdictionCode.GermanyFederal,
    allowProjection: true,
    evidence: {
      hasLanguageCertificate: state.hasLanguageCertificate,
      hasPensionHistoryProof: state.hasPensionHistoryProof,
      hasCivicTestCertificate: state.hasCivicTestCertificate,
      hasLivelihoodAndHousingProof: state.hasLivelihoodAndHousingProof,
    },
  });

  const readyCount = result.evidenceChecklist.filter((item) => item.status === EvidenceStatus.Recorded).length;

  return <AppShell currentPath={calculatorPath(AppId.PermanentResidency)}>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Residence & Immigration · Demo"
        title="Permanent Residency (Niederlassungserlaubnis)"
        subtitle="Check potential earliest § 18c AufenthG application dates, permit expiry buffers, absence risks and required documents without needing a Life Profile."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={permanentResidencyStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Permanent residency highlights">
        <MetricCard
          label="Potential Earliest Date"
          value={result.potentialEarliestApplicationDate ?? "Needs qualifying permit"}
          tone={result.potentialEarliestApplicationDate ? MetricTone.Primary : MetricTone.Loss}
          subtitle={result.requiredMonths ? `${result.requiredMonths} qualifying months required` : "Unsupported route/date"}
        />
        <MetricCard
          label="Evidence Readiness"
          value={`${readyCount} / ${result.evidenceChecklist.length}`}
          tone={readyCount === result.evidenceChecklist.length ? MetricTone.Gain : MetricTone.Neutral}
          subtitle={result.hasLongAbsenceRisk ? "Absence >=180 days: confirm continuity" : `${result.totalAbsenceDays} absence days recorded`}
        />
        <MetricCard
          label="Permit Expiry Check"
          value={result.expiringPermits.length > 0 ? `${result.expiringPermits[0].daysRemaining} days` : "Over 180 days"}
          tone={result.expiringPermits.some((p) => p.expired) ? MetricTone.Loss : MetricTone.Neutral}
          subtitle={`Current expiry: ${expiryDate}`}
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="pr-inputs-heading">
        <h2 id="pr-inputs-heading">Permit &amp; Route Details</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="pr-route" className="ui-field__label">Target § 18c route</label>
            <select
              id="pr-route"
              className="ui-input"
              value={state.route}
              onChange={(e) => permanentResidencyStore.update((s) => ({
                ...s,
                route: toPermanentResidencyRoute((e.target as HTMLSelectElement).value),
              }))}
            >
              <option value={PermanentResidencyRoute.BlueCardB1}>EU Blue Card + German B1 (21 months)</option>
              <option value={PermanentResidencyRoute.BlueCardA1}>EU Blue Card + German A1 (27 months)</option>
              <option value={PermanentResidencyRoute.SkilledWorkerGermanGraduate}>German Graduate Skilled Worker (24 months)</option>
              <option value={PermanentResidencyRoute.SkilledWorkerStandard}>Skilled Worker Standard + B1 (36 months)</option>
            </select>
          </div>
          <div className="ui-field">
            <label htmlFor="pr-permit" className="ui-field__label">Current residence permit</label>
            <select
              id="pr-permit"
              className="ui-input"
              value={state.permitKind}
              onChange={(e) => permanentResidencyStore.update((s) => ({
                ...s,
                permitKind: toResidencePermitKind((e.target as HTMLSelectElement).value),
              }))}
            >
              <option value={ResidencePermitKind.EuBlueCard}>EU Blue Card (§ 18g)</option>
              <option value={ResidencePermitKind.SkilledWorker}>Skilled Worker (§ 18a / § 18b)</option>
              <option value={ResidencePermitKind.Student}>Student Permit (§ 16b)</option>
              <option value={ResidencePermitKind.FamilyReunion}>Family Reunion</option>
              <option value={ResidencePermitKind.OpportunityCard}>Opportunity Card (Chancenkarte)</option>
            </select>
          </div>
          <div className="ui-field">
            <label htmlFor="pr-issue" className="ui-field__label">Qualifying permit start date</label>
            <input
              id="pr-issue"
              type="date"
              className="ui-input"
              value={state.permitIssueDate}
              onChange={(e) => permanentResidencyStore.update((s) => ({
                ...s,
                permitIssueDate: (e.target as HTMLInputElement).value,
              }))}
            />
          </div>
          <div className="ui-field">
            <label htmlFor="pr-expiry" className="ui-field__label">Permit expiry date</label>
            <input
              id="pr-expiry"
              type="date"
              className="ui-input"
              value={state.permitExpiryDate}
              onChange={(e) => permanentResidencyStore.update((s) => ({
                ...s,
                permitExpiryDate: (e.target as HTMLInputElement).value,
              }))}
            />
          </div>
          <NumberField
            id="pr-absences"
            label="Cumulative days spent abroad"
            value={state.absenceDays}
            min={0}
            max={1800}
            step={5}
            unit="days"
            onChange={(v) => permanentResidencyStore.update((s) => ({ ...s,
              absenceDays: v }))}
          />
          <div className="ui-field">
            <label htmlFor="pr-asof" className="ui-field__label">Evaluation date (as of)</label>
            <input
              id="pr-asof"
              type="date"
              className="ui-input"
              value={state.asOfDate}
              onChange={(e) => permanentResidencyStore.update((s) => ({
                ...s,
                asOfDate: (e.target as HTMLInputElement).value,
              }))}
            />
          </div>
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="pr-evidence-heading">
        <h2 id="pr-evidence-heading">Document &amp; Evidence Checklist</h2>
        <div className="domain-calc-grid">
          <label className="ui-check">
            <input
              type="checkbox"
              checked={state.hasLanguageCertificate}
              onChange={(e) => permanentResidencyStore.update((s) => ({ ...s,
                hasLanguageCertificate: (e.target as HTMLInputElement).checked }))}
            />
            <span>Required German language certificate ready</span>
          </label>
          <label className="ui-check">
            <input
              type="checkbox"
              checked={state.hasPensionHistoryProof}
              onChange={(e) => permanentResidencyStore.update((s) => ({ ...s,
                hasPensionHistoryProof: (e.target as HTMLInputElement).checked }))}
            />
            <span>Pension contribution history (Rentenversicherungsverlauf)</span>
          </label>
          <label className="ui-check">
            <input
              type="checkbox"
              checked={state.hasCivicTestCertificate}
              onChange={(e) => permanentResidencyStore.update((s) => ({ ...s,
                hasCivicTestCertificate: (e.target as HTMLInputElement).checked }))}
            />
            <span>Leben in Deutschland / Einbürgerungstest passed</span>
          </label>
          <label className="ui-check">
            <input
              type="checkbox"
              checked={state.hasLivelihoodAndHousingProof}
              onChange={(e) => permanentResidencyStore.update((s) => ({ ...s,
                hasLivelihoodAndHousingProof: (e.target as HTMLInputElement).checked }))}
            />
            <span>Payslips, employment confirmation, lease &amp; health insurance</span>
          </label>
        </div>

        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {result.evidenceChecklist.map((item) => <tr key={item.id}>
                <th scope="row">{item.label}</th>
                <td>{formatEvidenceStatus(item.status)}</td>
                <td>{item.detail}</td>
              </tr>)}
            </tbody>
          </table>
        </div>

        <CalculationExplanationPanel explanation={result.explanation} summary="Explain § 18c AufenthG rule, dates and sources" />
      </section>
    </main>
  </AppShell>;
}
