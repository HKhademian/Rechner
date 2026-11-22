import type {
  JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  lifePlannerApp,
} from "#/apps/life-planner/manifest.ts";
import {
  AppShell,
} from "#components/ui/AppShell";
import {
  Badge,
  BadgeTone,
  PageHeader,
} from "#/components/ui/index.ts";

const CURRENT_PATH = calculatorPath(AppId.LifePlanner);

/**
 * Life Planner Workbench (Beta Preview Shell — Phase 0).
 * Replaced by the full Concept A Quiet Command Header + 6-tab Analysis Canvas in Phase 2.
 */
export default function LifePlannerApp(): JSX.Element {
  return (
    <AppShell currentPath={CURRENT_PATH} wide>
      <PageHeader
        eyebrow="Preview Workbench"
        title={lifePlannerApp.title}
        subtitle={lifePlannerApp.description}
        actions={<Badge tone={BadgeTone.Brand}>Beta</Badge>}
      />
      <section className="ui-card">
        <div className="ui-card__body">
          <p>
            The Life Planner simulation engine, unified German annual tax collector, and Life Disaster Simulator are
            being assembled in Phase 1. The full Concept A workbench UI launches next in Phase 2.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
