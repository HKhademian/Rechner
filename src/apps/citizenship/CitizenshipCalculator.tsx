import "#/components/DomainCalculator.css";
import "#/components/LifeMonthlyView.css";
import {
  type JSX,
} from "preact";


import {
  citizenshipStore,
} from "#/apps/citizenship/citizenshipStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import CalculationExplanationPanel from "#components/CalculationExplanationPanel";


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
  CitizenshipPathway,
  evaluateCitizenshipPreparation,
  toCitizenshipPathway,
} from "#engine/lifeProfile/citizenshipPreparation";
import {
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  ResidencePermitKind,
  residenceInterruptionModule,
  residencePermitModule,
} from "#engine/lifeProfile/residencePermitEvent";
import {
  EvidenceStatus,
} from "#engine/lifeProfile/residencyPreparation";
import {
  JurisdictionCode,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  type LifeEvent,
  LifeEventStatus,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";

const STANDALONE_PERSON = toPersonId("standalone-citizenship");

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

function formatStatus(status: EvidenceStatus): string {
  if (status === EvidenceStatus.Recorded) {
    return "Ready";
  }
  if (status === EvidenceStatus.NeedsAuthorityReview) {
    return "Authority review";
  }
  return "Missing";
}

export default function CitizenshipCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? citizenshipStore.state.value : citizenshipStore.defaultState;

  const startDate = safeDate(state.residenceStartDate, "2022-03-01");
  const asOfDate = safeDate(state.asOfDate, "2026-04-01");

  const syntheticEvents: LifeEvent<unknown>[] = [
    {
      id: toLifeEventId("standalone-cit-permit"),
      personId: STANDALONE_PERSON,
      kind: residencePermitModule.kind,
      status: LifeEventStatus.Actual,
      date: startDate,
      payload: {
        permitKind: ResidencePermitKind.SkilledWorker,
        issueDate: startDate,
        countryCode: "DE",
        label: "Earliest lawful residence",
      },
    },
  ];

  if (state.longestSingleAbsenceDays > 0) {
    syntheticEvents.push({
      id: toLifeEventId("standalone-cit-absence"),
      personId: STANDALONE_PERSON,
      kind: residenceInterruptionModule.kind,
      status: LifeEventStatus.Actual,
      date: asOfDate,
      payload: {
        days: state.longestSingleAbsenceDays,
        reason: "Longest recorded stay abroad",
      },
    });
  }

  const result = evaluateCitizenshipPreparation({
    events: syntheticEvents,
    personId: STANDALONE_PERSON,
    asOf: asOfDate,
    includePlanned: true,
    pathway: state.pathway,
    jurisdiction: JurisdictionCode.GermanyFederal,
    allowProjection: true,
    documents: {
      hasEligibleResidenceTitle: state.hasEligibleResidenceTitle,
      hasValidIdentityAndPassport: state.hasValidIdentityAndPassport,
      hasLanguageB1Certificate: state.hasLanguageB1Certificate,
      hasNaturalizationTest: state.hasNaturalizationTest,
      hasIndependentLivelihoodProof: state.hasIndependentLivelihoodProof,
      hasCivilStatusCertificates: state.hasCivilStatusCertificates,
    },
  });

  const readyCount = result.checklist.filter((item) => item.status === EvidenceStatus.Recorded).length;

  return <>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Naturalization · Demo"
        title="German Citizenship (Einbürgerung) Planner"
        subtitle="Estimate potential earliest naturalization dates under StARModG (§ 10 / § 9 StAG), review § 12b absence continuity and check document readiness standalone."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={citizenshipStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Citizenship preparation highlights">
        <MetricCard
          label="Potential Earliest Date"
          value={result.potentialEarliestApplicationDate ?? "Needs start date"}
          tone={result.potentialEarliestApplicationDate ? MetricTone.Primary : MetricTone.Loss}
          subtitle={result.requiredMonths ? `${result.requiredMonths} months lawful residence` : "Unsupported date"}
        />
        <MetricCard
          label="Checklist Progress"
          value={`${readyCount} / ${result.checklist.length}`}
          tone={readyCount === result.checklist.length ? MetricTone.Gain : MetricTone.Neutral}
          subtitle="Documents and prerequisites"
        />
        <MetricCard
          label="§ 12b Continuity Check"
          value={result.hasContinuityRisk ? "Review required" : "No 180-day risk"}
          tone={result.hasContinuityRisk ? MetricTone.Loss : MetricTone.Gain}
          subtitle={`Longest stay abroad: ${result.totalAbsenceDays} days`}
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="cit-inputs-heading">
        <h2 id="cit-inputs-heading">Pathway &amp; Residence History</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="cit-pathway" className="ui-field__label">Naturalization pathway</label>
            <select
              id="cit-pathway"
              className="ui-input"
              value={state.pathway}
              onChange={(e) => citizenshipStore.update((s) => ({
                ...s,
                pathway: toCitizenshipPathway((e.target as HTMLSelectElement).value),
              }))}
            >
              <option value={CitizenshipPathway.StandardFiveYear}>Standard naturalization (§ 10 Abs. 1 StAG · 5 years)</option>
              <option value={CitizenshipPathway.SpousalThreeYear}>Spouse of German citizen (§ 9 StAG · 3 years)</option>
            </select>
          </div>
          <div className="ui-field">
            <label htmlFor="cit-start" className="ui-field__label">Earliest lawful residence start</label>
            <input
              id="cit-start"
              type="date"
              className="ui-input"
              value={state.residenceStartDate}
              onChange={(e) => citizenshipStore.update((s) => ({
                ...s,
                residenceStartDate: (e.target as HTMLInputElement).value,
              }))}
            />
          </div>
          <NumberField
            id="cit-absence"
            label="Longest single stay abroad"
            value={state.longestSingleAbsenceDays}
            min={0}
            max={1800}
            step={5}
            unit="days"
            onChange={(v) => citizenshipStore.update((s) => ({ ...s,
              longestSingleAbsenceDays: v }))}
          />
          <div className="ui-field">
            <label htmlFor="cit-asof" className="ui-field__label">Evaluation date (as of)</label>
            <input
              id="cit-asof"
              type="date"
              className="ui-input"
              value={state.asOfDate}
              onChange={(e) => citizenshipStore.update((s) => ({
                ...s,
                asOfDate: (e.target as HTMLInputElement).value,
              }))}
            />
          </div>
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="cit-docs-heading">
        <h2 id="cit-docs-heading">Document Preparation Checklist</h2>
        <div className="domain-calc-grid">
          <label className="ui-check">
            <input
              type="checkbox"
              checked={state.hasEligibleResidenceTitle}
              onChange={(e) => citizenshipStore.update((s) => ({ ...s,
                hasEligibleResidenceTitle: (e.target as HTMLInputElement).checked }))}
            />
            <span>Eligible residence title (§ 10 Abs. 1 Nr. 2 StAG)</span>
          </label>
          <label className="ui-check">
            <input
              type="checkbox"
              checked={state.hasValidIdentityAndPassport}
              onChange={(e) => citizenshipStore.update((s) => ({ ...s,
                hasValidIdentityAndPassport: (e.target as HTMLInputElement).checked }))}
            />
            <span>Valid passport, ID and Meldebescheinigung</span>
          </label>
          <label className="ui-check">
            <input
              type="checkbox"
              checked={state.hasLanguageB1Certificate}
              onChange={(e) => citizenshipStore.update((s) => ({ ...s,
                hasLanguageB1Certificate: (e.target as HTMLInputElement).checked }))}
            />
            <span>Recognized German B1 certificate</span>
          </label>
          <label className="ui-check">
            <input
              type="checkbox"
              checked={state.hasNaturalizationTest}
              onChange={(e) => citizenshipStore.update((s) => ({ ...s,
                hasNaturalizationTest: (e.target as HTMLInputElement).checked }))}
            />
            <span>Einbürgerungstest / Leben in Deutschland passed</span>
          </label>
          <label className="ui-check">
            <input
              type="checkbox"
              checked={state.hasIndependentLivelihoodProof}
              onChange={(e) => citizenshipStore.update((s) => ({ ...s,
                hasIndependentLivelihoodProof: (e.target as HTMLInputElement).checked }))}
            />
            <span>Independent livelihood proof (payslips / tax returns)</span>
          </label>
          <label className="ui-check">
            <input
              type="checkbox"
              checked={state.hasCivilStatusCertificates}
              onChange={(e) => citizenshipStore.update((s) => ({ ...s,
                hasCivilStatusCertificates: (e.target as HTMLInputElement).checked }))}
            />
            <span>Translated / apostilled birth &amp; marriage certificates</span>
          </label>
        </div>

        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Status</th>
                <th>Guidance</th>
              </tr>
            </thead>
            <tbody>
              {result.checklist.map((item) => <tr key={item.id}>
                <th scope="row">{item.label}</th>
                <td>{formatStatus(item.status)}</td>
                <td>{item.detail}</td>
              </tr>)}
            </tbody>
          </table>
        </div>

        <CalculationExplanationPanel explanation={result.explanation} summary="Explain StAG § 10 / § 9 rule and statutory sources" />
      </section>
    </main>
  </>;
}
