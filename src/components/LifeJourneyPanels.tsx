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
import FamilyParentalHandoffPanel from "#components/FamilyParentalHandoffPanel";
import ChildcareTimelinePanel from "#components/ChildcareTimelinePanel";
import TravelPlannerPanel from "#components/TravelPlannerPanel";
import TaxSwitchComparisonPanel from "#components/TaxSwitchComparisonPanel";

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
  people,
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
    <FamilyParentalHandoffPanel
      people={people}
      events={events}
      date={date}
      includePlanned={includePlanned}
    />
    <ChildcareTimelinePanel
      events={events}
      date={date}
      includePlanned={includePlanned}
    />
    <TravelPlannerPanel
      events={events}
      personId={personId}
      includePlanned={includePlanned}
    />
    <TaxSwitchComparisonPanel jurisdiction={jurisdiction} />
  </>;
}
