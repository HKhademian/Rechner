import {
  type LifeEvent,
  toLifeEventDate,
} from "#engine/lifeProfile/timeline";
import {
  type PersonId,
} from "#engine/lifeProfile/person";
import {
  type ReplayMonth,
  type MonthlySnapshot,
  replayMonthly,
} from "#engine/lifeProfile/monthlyReplay";
import {
  type JobAtDate,
  projectEmploymentAtDate,
} from "#engine/lifeProfile/employmentProjection";
import {
  type ProjectedFact,
  ProjectedFactStatus,
  eventDateBounds,
} from "#engine/lifeProfile/datedFacts";
import {
  type ResidenceMovePayload,
} from "#engine/lifeProfile/residenceEvent";
import {
  projectResidenceAtDate,
} from "#engine/lifeProfile/residenceProjection";

export interface RecordedLifeMonth {
  readonly jobs: readonly JobAtDate[];
  readonly residence: ProjectedFact<ResidenceMovePayload>;
}

/** Composition stays outside the generic runner; each domain owns its own projection. */
export function recordedLifeMonths(
  events: readonly LifeEvent<unknown>[],
  personId: PersonId,
  origin: ReplayMonth,
  viewStart: ReplayMonth,
  through: ReplayMonth,
  includePlanned: boolean,
): readonly MonthlySnapshot<RecordedLifeMonth>[] {
  return replayMonthly<RecordedLifeMonth, LifeEvent<unknown>, boolean>({ origin,
    viewStart,
    through,
    events,
    scenario: includePlanned,
    openingState: { jobs: [],
      residence: { status: ProjectedFactStatus.Unknown } },
    advance: (_state, month, allEvents, planned) => {
      const monthDate = toLifeEventDate(`${month.year}-${String(month.month).padStart(2, "0")}`);
      const end = eventDateBounds(monthDate)?.[1];
      if (!end) {
        throw new TypeError("A valid month is required.");
      }
      return { jobs: projectEmploymentAtDate(allEvents, personId, end, planned),
        residence: projectResidenceAtDate(allEvents, personId, end, planned) };
    } });
}
