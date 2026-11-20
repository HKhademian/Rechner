import {
  type JSX,
} from "preact";
import {
  type LifePerson,
  type PersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
} from "#engine/lifeProfile/timeline";
import {
  type JurisdictionCode,
} from "#engine/lifeProfile/statutoryRuleResolver";
import ResidencyPreparationPanel from "#components/ResidencyPreparationPanel";
import CitizenshipPreparationPanel from "#components/CitizenshipPreparationPanel";

export interface LifeJourneyPanelsProps {
  readonly people: readonly LifePerson[];
  readonly events: readonly LifeEvent<unknown>[];
  readonly personId: PersonId;
  readonly date: string;
  readonly includePlanned: boolean;
  readonly jurisdiction: JurisdictionCode;
  readonly allowProjection: boolean;
}

export default function LifeJourneyPanels({
  events,
  personId,
  date,
  includePlanned,
  jurisdiction,
  allowProjection,
}: LifeJourneyPanelsProps): JSX.Element {
  return <>
    <ResidencyPreparationPanel
      events={events}
      personId={personId}
      date={date}
      includePlanned={includePlanned}
      jurisdiction={jurisdiction}
      allowProjection={allowProjection}
    />
    <CitizenshipPreparationPanel
      events={events}
      personId={personId}
      date={date}
      includePlanned={includePlanned}
      jurisdiction={jurisdiction}
      allowProjection={allowProjection}
    />
  </>;
}
