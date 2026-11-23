import "#/components/DomainCalculator.css";
import "#/components/LifeMonthlyView.css";
import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";


import {
  travelPlannerStore,
} from "#/apps/travel-planner/travelPlannerStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";


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
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  ResidencePermitKind,
  residencePermitModule,
} from "#engine/lifeProfile/residencePermitEvent";
import {
  type LifeEvent,
  LifeEventStatus,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";
import {
  OFFLINE_TRAVEL_CITIES,
  estimateTransportModes,
  evaluateTravelReadiness,
  findOfflineCity,
  haversineDistanceKm,
} from "#engine/lifeProfile/travelEstimate";
import {
  TravelDestinationRegion,
  toTravelDestinationRegion,
  travelTripModule,
} from "#engine/lifeProfile/travelEvent";
import {
  toEuroCents,
} from "#engine/types";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

const STANDALONE_PERSON = toPersonId("standalone-traveler");

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

export default function TravelPlannerCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? travelPlannerStore.state.value : travelPlannerStore.defaultState;

  const [originCity, setOriginCity] = useState("Munich");
  const [destination, setDestination] = useState("Rome");
  const [region, setRegion] = useState<TravelDestinationRegion>(TravelDestinationRegion.SchengenArea);
  const [startDate, setStartDate] = useState("2026-08-05");
  const [endDate, setEndDate] = useState("2026-08-12");
  const [budgetEur, setBudgetEur] = useState(1400);

  const passportExpiry = optionalDate(state.passportExpiryDate);
  const permitExpiry = optionalDate(state.permitExpiryDate);

  const syntheticEvents: LifeEvent<unknown>[] = [];
  if (permitExpiry) {
    syntheticEvents.push({
      id: toLifeEventId("standalone-travel-permit"),
      personId: STANDALONE_PERSON,
      kind: residencePermitModule.kind,
      status: LifeEventStatus.Actual,
      date: toLifeDate("2024-01-01"),
      payload: {
        permitKind: ResidencePermitKind.SkilledWorker,
        expiryDate: permitExpiry,
        countryCode: "DE",
      },
    });
  }

  for (const trip of state.trips) {
    const start = optionalDate(trip.startDate);
    const end = optionalDate(trip.endDate);
    syntheticEvents.push({
      id: toLifeEventId(trip.id),
      personId: STANDALONE_PERSON,
      kind: travelTripModule.kind,
      status: LifeEventStatus.Planned,
      ...(start ? { date: start } : {}),
      payload: {
        destination: trip.destination,
        region: trip.region,
        ...(trip.originCity ? { originCity: trip.originCity } : {}),
        ...(end ? { endDate: end } : {}),
        budgetCents: toEuroCents(Math.round(trip.budgetEur * 100)),
        ...(passportExpiry ? { passportExpiryDate: passportExpiry } : {}),
      },
    });
  }

  const summary = evaluateTravelReadiness({
    events: syntheticEvents,
    personId: STANDALONE_PERSON,
    includePlanned: true,
  });

  const originCoord = findOfflineCity(state.compareOrigin);
  const destCoord = findOfflineCity(state.compareDestination);
  const compareDistanceKm = originCoord && destCoord
    ? Math.round(haversineDistanceKm(originCoord.lat, originCoord.lon, destCoord.lat, destCoord.lon))
    : 0;
  const modeComparison = estimateTransportModes(compareDistanceKm);

  function addTrip(): void {
    const trimmedDest = destination.trim();
    if (!trimmedDest) {
      return;
    }
    travelPlannerStore.update((s) => ({
      ...s,
      trips: [
        ...s.trips,
        {
          id: `trip-${Date.now()}`,
          originCity: originCity.trim() || "Berlin",
          destination: trimmedDest,
          region,
          startDate,
          endDate,
          budgetEur,
        },
      ],
    }));
  }

  function removeTrip(id: string): void {
    travelPlannerStore.update((s) => ({
      ...s,
      trips: s.trips.filter((t) => t.id !== id),
    }));
  }

  return <>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Travel & Mobility · Demo"
        title="Travel Readiness &amp; Transport Comparator"
        subtitle="Check passport and German residence permit validity against trip return dates and compare offline Car, Bus, Train and Flight estimates without needing a Life Profile."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={travelPlannerStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Travel readiness highlights">
        <MetricCard
          label="Planned Trips"
          value={`${summary.trips.length}`}
          subtitle="Active itinerary items"
        />
        <MetricCard
          label="Total Travel Budget"
          value={formatIntegerEuroCents(summary.totalBudgetCents)}
          tone={MetricTone.Primary}
          subtitle="Combined planned trip budgets"
        />
        <MetricCard
          label="Document Warnings"
          value={`${summary.warningCount}`}
          tone={summary.warningCount > 0 ? MetricTone.Loss : MetricTone.Gain}
          subtitle={summary.warningCount > 0 ? "Review passport / permit validity below" : "All recorded documents valid"}
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="tr-docs-heading">
        <h2 id="tr-docs-heading">Travel Documents &amp; Offline Route Comparator</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="tr-passport" className="ui-field__label">Passport expiry date</label>
            <input
              id="tr-passport"
              type="date"
              className="ui-input"
              value={state.passportExpiryDate}
              onChange={(e) => travelPlannerStore.update((s) => ({ ...s,
                passportExpiryDate: (e.target as HTMLInputElement).value }))}
            />
          </div>
          <div className="ui-field">
            <label htmlFor="tr-permit" className="ui-field__label">German residence permit (eAT) expiry (optional)</label>
            <input
              id="tr-permit"
              type="date"
              className="ui-input"
              value={state.permitExpiryDate}
              onChange={(e) => travelPlannerStore.update((s) => ({ ...s,
                permitExpiryDate: (e.target as HTMLInputElement).value }))}
            />
          </div>
          <div className="ui-field">
            <label htmlFor="tr-cmp-origin" className="ui-field__label">Compare from city</label>
            <select
              id="tr-cmp-origin"
              className="ui-input"
              value={state.compareOrigin}
              onChange={(e) => travelPlannerStore.update((s) => ({ ...s,
                compareOrigin: (e.target as HTMLSelectElement).value }))}
            >
              {OFFLINE_TRAVEL_CITIES.map((city) => <option key={city.name} value={city.name}>{city.name}</option>)}
            </select>
          </div>
          <div className="ui-field">
            <label htmlFor="tr-cmp-dest" className="ui-field__label">Compare to city</label>
            <select
              id="tr-cmp-dest"
              className="ui-input"
              value={state.compareDestination}
              onChange={(e) => travelPlannerStore.update((s) => ({ ...s,
                compareDestination: (e.target as HTMLSelectElement).value }))}
            >
              {OFFLINE_TRAVEL_CITIES.map((city) => <option key={city.name} value={city.name}>{city.name}</option>)}
            </select>
          </div>
        </div>

        {modeComparison.length > 0 && <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Mode ({state.compareOrigin} to {state.compareDestination}, ~{compareDistanceKm} km straight-line)</th>
                <th>Provider hint</th>
                <th>Est. distance</th>
                <th>One-way duration</th>
                <th>One-way est.</th>
                <th>Round-trip est.</th>
              </tr>
            </thead>
            <tbody>
              {modeComparison.map((est) => <tr key={est.mode}>
                <th scope="row">{est.label}</th>
                <td>{est.providerHint}</td>
                <td>{est.distanceKm} km</td>
                <td>{est.durationText}</td>
                <td>{formatIntegerEuroCents(est.estimatedOneWayCents)}</td>
                <td>{formatIntegerEuroCents(est.estimatedRoundTripCents)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>}
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="tr-add-heading">
        <h2 id="tr-add-heading">Planned Trips &amp; Document Readiness</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="tr-origin" className="ui-field__label">Origin city</label>
            <input id="tr-origin" type="text" className="ui-input" value={originCity} onInput={(e) => setOriginCity((e.target as HTMLInputElement).value)} />
          </div>
          <div className="ui-field">
            <label htmlFor="tr-dest" className="ui-field__label">Destination</label>
            <input id="tr-dest" type="text" className="ui-input" value={destination} onInput={(e) => setDestination((e.target as HTMLInputElement).value)} />
          </div>
          <div className="ui-field">
            <label htmlFor="tr-region" className="ui-field__label">Destination region</label>
            <select
              id="tr-region"
              className="ui-input"
              value={region}
              onChange={(e) => setRegion(toTravelDestinationRegion((e.target as HTMLSelectElement).value))}
            >
              <option value={TravelDestinationRegion.DomesticGermany}>Domestic Germany</option>
              <option value={TravelDestinationRegion.SchengenArea}>Schengen Area</option>
              <option value={TravelDestinationRegion.EuNonSchengen}>EU (non-Schengen)</option>
              <option value={TravelDestinationRegion.UkIreland}>UK / Ireland</option>
              <option value={TravelDestinationRegion.InternationalNonEu}>International (non-EU)</option>
            </select>
          </div>
          <div className="ui-field">
            <label htmlFor="tr-start" className="ui-field__label">Departure date</label>
            <input id="tr-start" type="date" className="ui-input" value={startDate} onChange={(e) => setStartDate((e.target as HTMLInputElement).value)} />
          </div>
          <div className="ui-field">
            <label htmlFor="tr-end" className="ui-field__label">Return date</label>
            <input id="tr-end" type="date" className="ui-input" value={endDate} onChange={(e) => setEndDate((e.target as HTMLInputElement).value)} />
          </div>
          <NumberField id="tr-budget" label="Trip budget" value={budgetEur} min={0} max={100000} step={100} unit="€" onChange={setBudgetEur} />
        </div>
        <div>
          <button type="button" className="ui-btn ui-btn--sm" onClick={addTrip}>Add trip</button>
        </div>

        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Trip</th>
                <th>Dates</th>
                <th>Budget</th>
                <th>Document &amp; entry check</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {summary.trips.map((trip) => <tr key={trip.eventId}>
                <th scope="row">
                  {trip.payload.originCity ? `${trip.payload.originCity} -> ` : ""}{trip.payload.destination}
                  {trip.straightLineKm ? ` (${trip.straightLineKm} km)` : ""}
                </th>
                <td>{trip.startDate ?? "—"} to {trip.payload.endDate ?? "—"}</td>
                <td>{trip.payload.budgetCents !== undefined ? formatIntegerEuroCents(trip.payload.budgetCents) : "—"}</td>
                <td>
                  <div>{trip.entryGuidance}</div>
                  {trip.documentWarnings.map((warn) => <div key={warn}><strong>Warning:</strong> {warn}</div>)}
                </td>
                <td>
                  <button type="button" className="ui-btn ui-btn--sm" onClick={() => removeTrip(trip.eventId)}>Remove</button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </>;
}
