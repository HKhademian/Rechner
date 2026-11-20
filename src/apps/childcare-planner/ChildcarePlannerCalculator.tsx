import "#/components/DomainCalculator.css";
import "#/components/LifeMonthlyView.css";
import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  childcarePlannerStore,
} from "#/apps/childcare-planner/childcarePlannerStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
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
  ChildcareApplicationStatus,
  ChildcareFacilityKind,
  childcarePlanModule,
  toChildcareApplicationStatus,
  toChildcareFacilityKind,
} from "#engine/lifeProfile/childcareEvent";
import {
  ChildcareDeadlineKind,
  summarizeChildcareTimeline,
} from "#engine/lifeProfile/childcareTimeline";
import {
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  LifeEventStatus,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";
import {
  toEuroCents,
} from "#engine/types";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

const STANDALONE_PERSON = toPersonId("standalone-child");

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

function optionalDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try {
      return toLifeDate(value);
    }
    catch {
      return undefined;
    }
  }
  return undefined;
}

function formatDeadlineKind(kind: ChildcareDeadlineKind): string {
  if (kind === ChildcareDeadlineKind.Application) {
    return "Application deadline";
  }
  if (kind === ChildcareDeadlineKind.Enrollment) {
    return "Enrollment deadline";
  }
  return "Desired start";
}

export default function ChildcarePlannerCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? childcarePlannerStore.state.value : childcarePlannerStore.defaultState;

  const [providerName, setProviderName] = useState("");
  const [municipality, setMunicipality] = useState("Berlin");
  const [facilityKind, setFacilityKind] = useState<ChildcareFacilityKind>(ChildcareFacilityKind.Kita);
  const [desiredStartDate, setDesiredStartDate] = useState("2026-09-01");
  const [applicationDeadline, setApplicationDeadline] = useState("2026-05-31");
  const [monthlyFeeEur, setMonthlyFeeEur] = useState(200);
  const [monthlyMealEur, setMonthlyMealEur] = useState(70);

  const asOfDate = safeDate(state.asOfDate, "2026-04-01");

  const syntheticEvents: LifeEvent<unknown>[] = state.options.map((option) => {
    const start = optionalDate(option.desiredStartDate);
    const appDl = optionalDate(option.applicationDeadline);
    const enrollDl = optionalDate(option.enrollmentDeadline);
    return {
      id: toLifeEventId(option.id),
      personId: STANDALONE_PERSON,
      kind: childcarePlanModule.kind,
      status: option.applicationStatus === ChildcareApplicationStatus.Enrolled ? LifeEventStatus.Actual : LifeEventStatus.Planned,
      ...(start ? { date: start } : {}),
      payload: {
        facilityKind: option.facilityKind,
        providerName: option.providerName,
        ...(option.municipality ? { municipality: option.municipality } : {}),
        ...(start ? { desiredStartDate: start } : {}),
        ...(appDl ? { applicationDeadline: appDl } : {}),
        ...(enrollDl ? { enrollmentDeadline: enrollDl } : {}),
        applicationStatus: option.applicationStatus,
        monthlyFeeCents: toEuroCents(Math.round(option.monthlyFeeEur * 100)),
        monthlyMealCents: toEuroCents(Math.round(option.monthlyMealEur * 100)),
      },
    };
  });

  const summary = summarizeChildcareTimeline({
    events: syntheticEvents,
    asOf: asOfDate,
    includePlanned: true,
  });

  function addOption(): void {
    const trimmed = providerName.trim();
    if (!trimmed) {
      return;
    }
    childcarePlannerStore.update((s) => ({
      ...s,
      options: [
        ...s.options,
        {
          id: `cc-${Date.now()}`,
          providerName: trimmed,
          municipality: municipality.trim(),
          facilityKind,
          applicationStatus: ChildcareApplicationStatus.Shortlisted,
          desiredStartDate,
          applicationDeadline,
          enrollmentDeadline: "",
          monthlyFeeEur,
          monthlyMealEur,
        },
      ],
    }));
    setProviderName("");
  }

  function updateStatus(id: string, status: ChildcareApplicationStatus): void {
    childcarePlannerStore.update((s) => ({
      ...s,
      options: s.options.map((item) => (item.id === id ? { ...item,
        applicationStatus: status } : item)),
    }));
  }

  function removeOption(id: string): void {
    childcarePlannerStore.update((s) => ({
      ...s,
      options: s.options.filter((item) => item.id !== id),
    }));
  }

  const nextDeadline = summary.deadlines[0];

  return <AppShell currentPath={calculatorPath(AppId.ChildcarePlanner)}>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Childcare & School · Demo"
        title="Kita, Krippe &amp; School Applications Planner"
        subtitle="Compare local childcare and school options, track application or enrollment deadlines, and estimate monthly fees standalone."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={childcarePlannerStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Childcare planner highlights">
        <MetricCard
          label="Tracked Options"
          value={`${summary.options.length}`}
          subtitle={summary.minShortlistedMonthlyCents !== undefined && summary.maxShortlistedMonthlyCents !== undefined
            ? `Shortlist range: ${formatIntegerEuroCents(summary.minShortlistedMonthlyCents)} – ${formatIntegerEuroCents(summary.maxShortlistedMonthlyCents)}/mo`
            : "Add options to compare costs"}
        />
        <MetricCard
          label="Enrolled Monthly Total"
          value={formatIntegerEuroCents(summary.enrolledMonthlyTotalCents)}
          tone={summary.enrolledMonthlyTotalCents > 0 ? MetricTone.Primary : MetricTone.Neutral}
          subtitle={`${formatIntegerEuroCents(summary.enrolledAnnualTotalCents)} / year`}
        />
        <MetricCard
          label="Next Deadline"
          value={nextDeadline ? `${nextDeadline.date} (${nextDeadline.daysUntil}d)` : "None"}
          tone={nextDeadline?.overdue ? MetricTone.Loss : MetricTone.Neutral}
          subtitle={nextDeadline ? `${nextDeadline.providerName} · ${formatDeadlineKind(nextDeadline.kind)}` : "All clear"}
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="cc-add-heading">
        <h2 id="cc-add-heading">Add Kita, Krippe or School Option</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="cc-asof" className="ui-field__label">Reference date (as of)</label>
            <input
              id="cc-asof"
              type="date"
              className="ui-input"
              value={state.asOfDate}
              onChange={(e) => childcarePlannerStore.update((s) => ({ ...s,
                asOfDate: (e.target as HTMLInputElement).value }))}
            />
          </div>
          <div className="ui-field">
            <label htmlFor="cc-name" className="ui-field__label">Facility / school name</label>
            <input
              id="cc-name"
              type="text"
              className="ui-input"
              placeholder="e.g. Kita Regenbogen"
              value={providerName}
              onInput={(e) => setProviderName((e.target as HTMLInputElement).value)}
            />
          </div>
          <div className="ui-field">
            <label htmlFor="cc-city" className="ui-field__label">Municipality</label>
            <input
              id="cc-city"
              type="text"
              className="ui-input"
              value={municipality}
              onInput={(e) => setMunicipality((e.target as HTMLInputElement).value)}
            />
          </div>
          <div className="ui-field">
            <label htmlFor="cc-kind" className="ui-field__label">Facility type</label>
            <select
              id="cc-kind"
              className="ui-input"
              value={facilityKind}
              onChange={(e) => setFacilityKind(toChildcareFacilityKind((e.target as HTMLSelectElement).value))}
            >
              <option value={ChildcareFacilityKind.Krippe}>Krippe (under 3)</option>
              <option value={ChildcareFacilityKind.Kita}>Kita / Kindergarten</option>
              <option value={ChildcareFacilityKind.Tagespflege}>Tagespflege</option>
              <option value={ChildcareFacilityKind.Grundschule}>Grundschule</option>
              <option value={ChildcareFacilityKind.Hort}>Hort / After-school</option>
              <option value={ChildcareFacilityKind.SecondarySchool}>Secondary School</option>
            </select>
          </div>
          <div className="ui-field">
            <label htmlFor="cc-start" className="ui-field__label">Desired start date</label>
            <input id="cc-start" type="date" className="ui-input" value={desiredStartDate} onChange={(e) => setDesiredStartDate((e.target as HTMLInputElement).value)} />
          </div>
          <div className="ui-field">
            <label htmlFor="cc-deadline" className="ui-field__label">Application deadline</label>
            <input id="cc-deadline" type="date" className="ui-input" value={applicationDeadline} onChange={(e) => setApplicationDeadline((e.target as HTMLInputElement).value)} />
          </div>
          <NumberField id="cc-fee" label="Monthly fee" value={monthlyFeeEur} min={0} max={3000} step={10} unit="€" onChange={setMonthlyFeeEur} />
          <NumberField id="cc-meal" label="Monthly meals" value={monthlyMealEur} min={0} max={500} step={5} unit="€" onChange={setMonthlyMealEur} />
        </div>
        <div>
          <button type="button" className="ui-btn ui-btn--sm" onClick={addOption}>Add option</button>
          {" "}
          <a className="ui-btn ui-btn--sm" href={calculatorPath(AppId.Kita)}>Compare regional Kita fee rules</a>
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="cc-list-heading">
        <h2 id="cc-list-heading">Shortlist &amp; Deadlines</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Facility</th>
                <th>Type</th>
                <th>Status</th>
                <th>Monthly total</th>
                <th>Annual total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {summary.options.map((opt) => <tr key={opt.eventId}>
                <th scope="row">{opt.payload.providerName}{opt.payload.municipality ? ` (${opt.payload.municipality})` : ""}</th>
                <td>{opt.payload.facilityKind}</td>
                <td>
                  <select
                    aria-label={`Status for ${opt.payload.providerName}`}
                    className="ui-input"
                    value={opt.payload.applicationStatus}
                    onChange={(e) => updateStatus(opt.eventId, toChildcareApplicationStatus((e.target as HTMLSelectElement).value))}
                  >
                    <option value={ChildcareApplicationStatus.Shortlisted}>Shortlisted</option>
                    <option value={ChildcareApplicationStatus.Applied}>Applied</option>
                    <option value={ChildcareApplicationStatus.Waitlisted}>Waitlisted</option>
                    <option value={ChildcareApplicationStatus.Offered}>Offered</option>
                    <option value={ChildcareApplicationStatus.Enrolled}>Enrolled</option>
                    <option value={ChildcareApplicationStatus.Declined}>Declined</option>
                  </select>
                </td>
                <td>{formatIntegerEuroCents(opt.totalMonthlyCents)}</td>
                <td>{formatIntegerEuroCents(opt.annualTotalCents)}</td>
                <td>
                  <button type="button" className="ui-btn ui-btn--sm" onClick={() => removeOption(opt.eventId)}>Remove</button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>

        {summary.deadlines.length > 0 && <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Facility</th>
                <th>Milestone</th>
                <th>Countdown</th>
              </tr>
            </thead>
            <tbody>
              {summary.deadlines.map((deadline) => <tr key={`${deadline.eventId}-${deadline.kind}`}>
                <th scope="row">{deadline.date}</th>
                <td>{deadline.providerName}</td>
                <td>{formatDeadlineKind(deadline.kind)}</td>
                <td>{deadline.overdue ? `Overdue by ${Math.abs(deadline.daysUntil)}d` : `In ${deadline.daysUntil}d`}</td>
              </tr>)}
            </tbody>
          </table>
        </div>}
      </section>
    </main>
  </AppShell>;
}
