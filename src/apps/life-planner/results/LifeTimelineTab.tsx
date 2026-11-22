import type {
  JSX,
} from "preact";
import {
  Badge,
  BadgeTone,
  Button,
  ButtonSize,
  ButtonVariant,
} from "#/components/ui/index.ts";
import {
  ParameterSlidersIcon,
  RemoveItemIcon,
} from "#components/Icons";
import {
  lifeWorkbenchPlan,
  removeLifeEvent,
} from "#/apps/life-planner/store/lifeWorkbenchState.ts";
import {
  LifeDrawerSection,
  openLifeInputsDrawer,
} from "#/apps/life-planner/store/lifeWorkbenchUiState.ts";

/** Chronological multi-domain Life Event Timeline tab. */
export function LifeTimelineTab(): JSX.Element {
  const { events } = lifeWorkbenchPlan.value;

  return (
    <section className="lpw-card">
      <div className="lpw-card__header">
        <div>
          <h2 className="lpw-card__title">Life Event Timeline ({events.length})</h2>
          <p className="lpw-hint">
            All career, family, childcare, tax, housing, travel, and residency events ordered chronologically.
          </p>
        </div>
        <Button
          size={ButtonSize.Sm}
          variant={ButtonVariant.Secondary}
          onClick={() => openLifeInputsDrawer(LifeDrawerSection.Career)}
        >
          <ParameterSlidersIcon size={13} />
          <span>Manage Events</span>
        </Button>
      </div>

      {events.length === 0 ? (
        <p className="lpw-hint">No life events configured. Choose a template from the Plan menu or open Edit Plan.</p>
      ) : (
        <div className="lpw-table-wrap">
          <table className="lpw-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Domain</th>
                <th>Event</th>
                <th>Type</th>
                <th className="lpw-num">Action</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td><strong>M{ev.effectiveMonth}</strong></td>
                  <td><Badge tone={BadgeTone.Neutral}>{ev.domain}</Badge></td>
                  <td>{ev.title}</td>
                  <td>{ev.kind}</td>
                  <td className="lpw-num">
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
