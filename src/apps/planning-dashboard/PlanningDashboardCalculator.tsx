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
  planningDashboardStore,
} from "#/apps/planning-dashboard/planningDashboardStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";


import {
  MetricCard,
  MetricTone,
} from "#components/ui/MetricCard";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  AssetActionKind,
  AssetCategory,
  assetEventModule,
  toLifeAssetId,
} from "#engine/lifeProfile/assetEvent";
import {
  ChildcareApplicationStatus,
  ChildcareFacilityKind,
  childcarePlanModule,
} from "#engine/lifeProfile/childcareEvent";
import {
  JobEndReason,
  jobEndedModule,
  jobStartedModule,
  toLifeJobId,
} from "#engine/lifeProfile/employmentEvent";
import {
  pregnancyStartedModule,
  toFamilyPregnancyId,
} from "#engine/lifeProfile/familyEvent";
import {
  type LifePerson,
  PersonRelationship,
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  PlanningPriority,
  buildPlanningAssistance,
  toPlanningPriority,
} from "#engine/lifeProfile/planningAssistant";
import {
  ResidencePermitKind,
  residencePermitModule,
} from "#engine/lifeProfile/residencePermitEvent";
import {
  TaxClassCombination,
  taxClassSwitchModule,
} from "#engine/lifeProfile/taxSwitchEvent";
import {
  type LifeEvent,
  LifeEventStatus,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";
import {
  TravelDestinationRegion,
  travelTripModule,
} from "#engine/lifeProfile/travelEvent";
import {
  toEuroCents,
} from "#engine/types";

const SELF_ID = toPersonId("dashboard-self");
const PARTNER_ID = toPersonId("dashboard-partner");
const AS_OF = toLifeDate("2026-04-01");

const STANDALONE_TOOL_LINKS: readonly {
  readonly appId: Exclude<AppId, typeof AppId.Catalog>;
  readonly label: string;
  readonly intent: string;
}[] = [
  { appId: AppId.ExpensePlanner,
    label: "Household Expense Planner",
    intent: "Budgeting, account funding & sustainability stress tests" },
  { appId: AppId.ResignationRunway,
    label: "Resignation & Transition Runway",
    intent: "Job endings, Sperrzeit waiting periods & savings runway" },
  { appId: AppId.PermanentResidency,
    label: "Permanent Residency (§ 18c)",
    intent: "Blue Card & skilled worker earliest application dates" },
  { appId: AppId.Citizenship,
    label: "German Citizenship (§ 10 / § 9)",
    intent: "Naturalization timeline & 6-document readiness" },
  { appId: AppId.FamilyMilestones,
    label: "Family Milestones & Births",
    intent: "Household birthdays, pregnancy & Elterngeld handoff" },
  { appId: AppId.ChildcarePlanner,
    label: "Kita, Krippe & School Planner",
    intent: "Shortlist, application deadlines & monthly fees" },
  { appId: AppId.TravelPlanner,
    label: "Travel Readiness & Transport",
    intent: "Passport/permit checks & offline Car/Bus/Train/Flight" },
  { appId: AppId.TaxClassSwitch,
    label: "Tax Class Switch Comparator",
    intent: "Monthly withholding vs. final annual joint tax" },
  { appId: AppId.AssetAffordability,
    label: "Purchases, Housing, Cars & Solar",
    intent: "Upfront gap, ongoing net burden & single-counting" },
  { appId: AppId.PlanningDashboard,
    label: "Planning Priorities Dashboard",
    intent: "Prioritize next steps & compare 5-way trade-offs" },
];

export default function PlanningDashboardCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? planningDashboardStore.state.value : planningDashboardStore.defaultState;

  const people: LifePerson[] = [
    {
      id: SELF_ID,
      name: "Primary",
      relationship: PersonRelationship.Self,
    },
    ...(state.hasPartnerTaxSwitch || state.hasFamilyOrChildcare
      ? [{
        id: PARTNER_ID,
        name: "Partner",
        relationship: PersonRelationship.Partner,
      }]
      : []),
  ];

  const events: LifeEvent<unknown>[] = [];
  if (state.hasJobTransition) {
    const jobId = toLifeJobId("dash-job-1");
    events.push(
      {
        id: toLifeEventId("dash-job-start"),
        personId: SELF_ID,
        kind: jobStartedModule.kind,
        status: LifeEventStatus.Actual,
        date: toLifeDate("2023-01-01"),
        payload: { jobId,
          employer: "Current Employer" },
      },
      {
        id: toLifeEventId("dash-job-end"),
        personId: SELF_ID,
        kind: jobEndedModule.kind,
        status: LifeEventStatus.Planned,
        date: toLifeDate("2026-07-31"),
        payload: { jobId,
          reason: JobEndReason.Resignation },
      },
    );
  }
  if (state.hasResidencyOrCitizenship) {
    events.push({
      id: toLifeEventId("dash-permit"),
      personId: SELF_ID,
      kind: residencePermitModule.kind,
      status: LifeEventStatus.Actual,
      date: toLifeDate("2024-06-01"),
      payload: {
        permitKind: ResidencePermitKind.EuBlueCard,
        issueDate: toLifeDate("2024-06-01"),
        expiryDate: toLifeDate("2028-05-31"),
        countryCode: "DE",
      },
    });
  }
  if (state.hasFamilyOrChildcare) {
    events.push(
      {
        id: toLifeEventId("dash-pregnancy"),
        personId: SELF_ID,
        kind: pregnancyStartedModule.kind,
        status: LifeEventStatus.Actual,
        date: AS_OF,
        payload: {
          pregnancyId: toFamilyPregnancyId("dash-preg-1"),
          expectedDueDate: toLifeDate("2026-10-15"),
        },
      },
      {
        id: toLifeEventId("dash-kita"),
        personId: SELF_ID,
        kind: childcarePlanModule.kind,
        status: LifeEventStatus.Planned,
        date: toLifeDate("2027-09-01"),
        payload: {
          facilityKind: ChildcareFacilityKind.Krippe,
          providerName: "Local Krippe",
          applicationStatus: ChildcareApplicationStatus.Shortlisted,
          monthlyFeeCents: toEuroCents(30000),
        },
      },
    );
  }
  if (state.hasPartnerTaxSwitch) {
    events.push({
      id: toLifeEventId("dash-tax-switch"),
      personId: SELF_ID,
      kind: taxClassSwitchModule.kind,
      status: LifeEventStatus.Planned,
      date: toLifeDate("2026-05-01"),
      payload: {
        combination: TaxClassCombination.III_V,
      },
    });
  }
  if (state.hasMajorPurchase) {
    events.push({
      id: toLifeEventId("dash-asset"),
      personId: SELF_ID,
      kind: assetEventModule.kind,
      status: LifeEventStatus.Planned,
      date: toLifeDate("2026-08-01"),
      payload: {
        assetId: toLifeAssetId("dash-solar-1"),
        category: AssetCategory.Solar,
        action: AssetActionKind.Installation,
        title: "Rooftop Solar PV",
        upfrontCents: toEuroCents(1800000),
      },
    });
  }
  if (state.hasUpcomingTravel) {
    events.push({
      id: toLifeEventId("dash-trip"),
      personId: SELF_ID,
      kind: travelTripModule.kind,
      status: LifeEventStatus.Planned,
      date: toLifeDate("2026-09-10"),
      payload: {
        destination: "Tokyo",
        originCity: "Frankfurt",
        region: TravelDestinationRegion.InternationalNonEu,
        endDate: toLifeDate("2026-09-24"),
        budgetCents: toEuroCents(300000),
      },
    });
  }

  const assistance = buildPlanningAssistance({
    people,
    events,
    asOf: AS_OF,
    includePlanned: true,
    priority: state.priority,
  });

  const activeToggleCount = [
    state.hasJobTransition,
    state.hasResidencyOrCitizenship,
    state.hasFamilyOrChildcare,
    state.hasPartnerTaxSwitch,
    state.hasMajorPurchase,
    state.hasUpcomingTravel,
  ].filter(Boolean).length;

  return <>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Planning Hub · Demo"
        title="Life Planning Priorities &amp; Next-Steps Dashboard"
        subtitle="Select what you are planning right now and compare priority trade-offs. Jump straight into any of the 10 standalone intent-based tools without setting up a Life Profile."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={planningDashboardStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Planning dashboard highlights">
        <MetricCard
          label="Active Situations"
          value={`${activeToggleCount} / 6`}
          subtitle="Toggle focus areas below"
        />
        <MetricCard
          label="Ranked Next Steps"
          value={`${assistance.suggestions.length}`}
          tone={MetricTone.Primary}
          subtitle="Ordered by your chosen priority"
        />
        <MetricCard
          label="Standalone Tools Ready"
          value={`${STANDALONE_TOOL_LINKS.length}`}
          tone={MetricTone.Gain}
          subtitle="Each works independently offline"
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="pd-controls-heading">
        <h2 id="pd-controls-heading">Your Active Situations &amp; Top Priority</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="pd-priority" className="ui-field__label">Primary planning priority</label>
            <select
              id="pd-priority"
              className="ui-input"
              value={state.priority}
              onChange={(e) => planningDashboardStore.update((s) => ({
                ...s,
                priority: toPlanningPriority((e.target as HTMLSelectElement).value),
              }))}
            >
              <option value={PlanningPriority.CashRunway}>Cash buffer &amp; resilience</option>
              <option value={PlanningPriority.ResidencyAndCitizenship}>Residency &amp; citizenship milestones</option>
              <option value={PlanningPriority.FamilyAndChildcare}>Family, parental leave &amp; childcare</option>
              <option value={PlanningPriority.TaxOptimization}>Tax &amp; withholding timing</option>
              <option value={PlanningPriority.MajorPurchases}>Major purchases, housing &amp; solar</option>
            </select>
          </div>
          <label className="ui-check">
            <input type="checkbox" checked={state.hasJobTransition} onChange={(e) => planningDashboardStore.update((s) => ({ ...s,
              hasJobTransition: (e.target as HTMLInputElement).checked }))} />
            <span>Job transition, resignation or sabbatical</span>
          </label>
          <label className="ui-check">
            <input type="checkbox" checked={state.hasResidencyOrCitizenship} onChange={(e) => planningDashboardStore.update((s) => ({ ...s,
              hasResidencyOrCitizenship: (e.target as HTMLInputElement).checked }))} />
            <span>Permanent residency or German citizenship</span>
          </label>
          <label className="ui-check">
            <input type="checkbox" checked={state.hasFamilyOrChildcare} onChange={(e) => planningDashboardStore.update((s) => ({ ...s,
              hasFamilyOrChildcare: (e.target as HTMLInputElement).checked }))} />
            <span>Pregnancy, birth, Elterngeld or Kita/school</span>
          </label>
          <label className="ui-check">
            <input type="checkbox" checked={state.hasPartnerTaxSwitch} onChange={(e) => planningDashboardStore.update((s) => ({ ...s,
              hasPartnerTaxSwitch: (e.target as HTMLInputElement).checked }))} />
            <span>Spousal tax class switch (III/V, IV/IV-factor)</span>
          </label>
          <label className="ui-check">
            <input type="checkbox" checked={state.hasMajorPurchase} onChange={(e) => planningDashboardStore.update((s) => ({ ...s,
              hasMajorPurchase: (e.target as HTMLInputElement).checked }))} />
            <span>Housing, car, solar PV or major purchase</span>
          </label>
          <label className="ui-check">
            <input type="checkbox" checked={state.hasUpcomingTravel} onChange={(e) => planningDashboardStore.update((s) => ({ ...s,
              hasUpcomingTravel: (e.target as HTMLInputElement).checked }))} />
            <span>Upcoming international or Schengen travel</span>
          </label>
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="pd-suggestions-heading">
        <h2 id="pd-suggestions-heading">Prioritized Next Steps &amp; Checklists</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Next step</th>
                <th>Checklist</th>
                <th>Recommended tool</th>
              </tr>
            </thead>
            <tbody>
              {assistance.suggestions.map((item) => <tr key={item.id}>
                <th scope="row">
                  <div>{item.title}</div>
                  <div><small>{item.whySuggested}</small></div>
                </th>
                <td>
                  <ul>
                    {item.checklistSteps.map((step) => <li key={step}>{step}</li>)}
                  </ul>
                </td>
                <td>
                  {item.calculatorPath && item.calculatorTitle
                    ? <a className="ui-btn ui-btn--sm" href={item.calculatorPath}>{item.calculatorTitle}</a>
                    : "Review checklist"}
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="pd-tradeoffs-heading">
        <h2 id="pd-tradeoffs-heading">Priority Trade-Offs</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Priority focus</th>
                <th>Upside</th>
                <th>Trade-off to watch</th>
                <th>Active signals</th>
              </tr>
            </thead>
            <tbody>
              {assistance.tradeOffs.map((row) => <tr key={row.priority}>
                <th scope="row">{row.label}{row.priority === state.priority ? " (Selected)" : ""}</th>
                <td>{row.upside}</td>
                <td>{row.tradeOff}</td>
                <td>{row.activeSignalCount}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="pd-suite-heading">
        <h2 id="pd-suite-heading">All 10 Standalone Intent-Based Planning Tools</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Standalone tool</th>
                <th>When to use it</th>
                <th>Launch</th>
              </tr>
            </thead>
            <tbody>
              {STANDALONE_TOOL_LINKS.map((tool) => <tr key={tool.appId}>
                <th scope="row">{tool.label}</th>
                <td>{tool.intent}</td>
                <td><a className="ui-btn ui-btn--sm" href={calculatorPath(tool.appId)}>Open tool</a></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <div>
          <a className="ui-btn ui-btn--primary" href="/profile/">Open Unified Life Profile (combine all events)</a>
        </div>
      </section>
    </main>
  </>;
}
