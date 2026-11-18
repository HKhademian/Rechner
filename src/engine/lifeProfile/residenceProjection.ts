import {
  type LifeDate,
  type PersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  LifeEventStatus,
} from "#engine/lifeProfile/timeline";
import {
  type ProjectedFact,
  selectDatedFact,
} from "#engine/lifeProfile/datedFacts";
import {
  type ResidenceMovePayload,
  residenceMoveModule,
} from "#engine/lifeProfile/residenceEvent";

export function projectResidenceAtDate(
  events: readonly LifeEvent<unknown>[],
  personId: PersonId,
  date: LifeDate,
  includePlanned: boolean,
): ProjectedFact<ResidenceMovePayload> {
  return selectDatedFact(events.filter((event) => event.personId === personId
    && event.kind === residenceMoveModule.kind && (includePlanned || event.status === LifeEventStatus.Actual))
    .map((event) => ({ event,
      value: residenceMoveModule.parsePayload(event.payload) })), date);
}
