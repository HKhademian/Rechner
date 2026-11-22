import type {
  JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  Badge,
  BadgeTone,
  Button,
  ButtonSize,
  ButtonVariant,
} from "#/components/ui/index.ts";
import {
  AddActionIcon,
  EditSettingsIcon,
  RemoveItemIcon,
} from "#components/Icons";
import {
  toSimulationMonth,
} from "#engine/types";
import {
  LifeEventDomain,
} from "#engine/lifeSimulator/types";
import {
  lifeWorkbenchPlan,
  removeLifeEvent,
  updateLifeEventMonth,
} from "#/apps/life-planner/store/lifeWorkbenchState.ts";
import {
  openLifeEventComposer,
  openLifeEventEditor,
} from "#/apps/life-planner/store/lifeWorkbenchUiState.ts";

/** Chronological multi-domain Life Event Timeline tab with domain filters & inline month shifting. */
export function LifeTimelineTab(): JSX.Element {
  const [domainFilter, setDomainFilter] = useState<LifeEventDomain | null>(null);
  const { baseline, events } = lifeWorkbenchPlan.value;

  const visibleEvents = domainFilter
    ? events.filter((ev) => ev.domain === domainFilter)
    : events;

  return (
    <section className="lpw-card">
      <div className="lpw-card__header">
        <div>
          <h2 className="lpw-card__title">Life Event Timeline ({visibleEvents.length} / {events.length})</h2>
          <p className="lpw-hint">
            Filter by life domain or shift any event forward/backward in time to test tax &amp; cashflow timing.
          </p>
        </div>
        <Button
          size={ButtonSize.Sm}
          variant={ButtonVariant.Primary}
          onClick={openLifeEventComposer}
        >
          <AddActionIcon size={13} />
          <span>Add Event</span>
        </Button>
      </div>

      <div className="lpw-disaster-chips" role="group" aria-label="Filter timeline by domain">
        <button
          type="button"
          className={`lpw-chip${domainFilter === null ? " lpw-chip--active" : ""}`}
          onClick={() => setDomainFilter(null)}
        >
          All Domains
        </button>
        {Object.values(LifeEventDomain).map((domain) => (
          <button
            key={domain}
            type="button"
            className={`lpw-chip${domainFilter === domain ? " lpw-chip--active" : ""}`}
            onClick={() => setDomainFilter(domain)}
          >
            {domain}
          </button>
        ))}
      </div>

      {visibleEvents.length === 0 ? (
        <p className="lpw-hint">No events match this filter. Click + Add Event to schedule a life milestone.</p>
      ) : (
        <div className="lpw-table-wrap">
          <table className="lpw-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Domain</th>
                <th>Event</th>
                <th>Type</th>
                <th className="lpw-num">Timing</th>
                <th className="lpw-num">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map((ev) => (
                <tr key={ev.id}>
                  <td><strong>M{ev.effectiveMonth}</strong></td>
                  <td><Badge tone={BadgeTone.Neutral}>{ev.domain}</Badge></td>
                  <td>{ev.title}</td>
                  <td>{ev.kind}</td>
                  <td className="lpw-num">
                    <Button
                      size={ButtonSize.Sm}
                      variant={ButtonVariant.Ghost}
                      disabled={ev.effectiveMonth <= 1}
                      onClick={() => updateLifeEventMonth(ev.id, toSimulationMonth(ev.effectiveMonth - 1))}
                      aria-label={`Shift ${ev.title} earlier by 1 month`}
                    >
                      −1m
                    </Button>
                    <Button
                      size={ButtonSize.Sm}
                      variant={ButtonVariant.Ghost}
                      disabled={ev.effectiveMonth >= baseline.horizonMonths}
                      onClick={() => updateLifeEventMonth(ev.id, toSimulationMonth(ev.effectiveMonth + 1))}
                      aria-label={`Shift ${ev.title} later by 1 month`}
                    >
                      +1m
                    </Button>
                  </td>
                  <td className="lpw-num">
                    <Button
                      size={ButtonSize.Sm}
                      variant={ButtonVariant.Ghost}
                      onClick={() => openLifeEventEditor(ev.id)}
                      aria-label={`Edit ${ev.title}`}
                    >
                      <EditSettingsIcon size={13} />
                    </Button>
                    <Button
                      size={ButtonSize.Sm}
                      variant={ButtonVariant.Ghost}
                      onClick={() => removeLifeEvent(ev.id)}
                      aria-label={`Remove ${ev.title}`}
                    >
                      <RemoveItemIcon size={13} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
