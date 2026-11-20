import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  type PersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
} from "#engine/lifeProfile/timeline";
import {
  OFFLINE_TRAVEL_CITIES,
  estimateTransportModes,
  evaluateTravelReadiness,
  findOfflineCity,
  haversineDistanceKm,
} from "#engine/lifeProfile/travelEstimate";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

export interface TravelPlannerPanelProps {
  readonly events: readonly LifeEvent<unknown>[];
  readonly personId: PersonId;
  readonly includePlanned: boolean;
}

export default function TravelPlannerPanel({
  events,
  personId,
  includePlanned,
}: TravelPlannerPanelProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [originCity, setOriginCity] = useState("Munich");
  const [destCity, setDestCity] = useState("Paris");
  const [manualKm, setManualKm] = useState("");

  const summary = expanded
    ? evaluateTravelReadiness({
      events,
      personId,
      includePlanned,
    })
    : undefined;

  const orig = findOfflineCity(originCity);
  const dest = findOfflineCity(destCity);
  const parsedManualKm = manualKm.trim() ? Number(manualKm) : undefined;
  const compareKm = parsedManualKm !== undefined && Number.isFinite(parsedManualKm) && parsedManualKm > 0
    ? parsedManualKm
    : orig && dest
      ? Math.round(haversineDistanceKm(orig.lat, orig.lon, dest.lat, dest.lon))
      : 0;
  const modeEstimates = expanded && compareKm > 0 ? estimateTransportModes(compareKm) : [];

  return <section className="life-monthly" aria-label="Travel readiness and offline transport comparison">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide travel planner & document checks" : "Plan travel, document validity & transport"}
    </button>
    {expanded && summary && <>
      <p>Track trip dates, budgets, passport and residence-permit validity, and rough offline transport estimates. Always verify destination-specific visa and entry rules with official authorities for your nationality.</p>
      {summary.trips.length === 0 ? <p>No trips recorded for this person yet. Add a trip in the journey event form below.</p> : <>
        <p>
          <strong>Recorded trips:</strong> {summary.trips.length}
          {summary.totalBudgetCents > 0 ? ` · Total budgeted: ${formatIntegerEuroCents(summary.totalBudgetCents)}` : ""}
          {summary.warningCount > 0 ? ` · ${summary.warningCount} document/entry warning(s)` : " · No document warnings flagged"}
        </p>
        <ul className="life-people__list">
          {summary.trips.map((trip) => <li key={trip.eventId}>
            <div>
              <strong>{trip.payload.destination}</strong> ({trip.startDate ?? "Date unknown"}{trip.payload.endDate ? ` to ${trip.payload.endDate}` : ""})
              {trip.payload.budgetCents !== undefined && <> · Budget: {formatIntegerEuroCents(trip.payload.budgetCents)}</>}
              <p>{trip.entryGuidance}</p>
              {trip.documentWarnings.length > 0 && <ul className="calc-explain__list">
                {trip.documentWarnings.map((warning) => <li key={warning}><strong>Warning:</strong> {warning}</li>)}
              </ul>}
              {trip.payload.tasks && trip.payload.tasks.length > 0 && <p>Preparation tasks: {trip.payload.tasks.join(", ")}</p>}
              {trip.straightLineKm !== undefined && <p>Offline straight-line estimate from {trip.payload.originCity}: ~{trip.straightLineKm} km.</p>}
            </div>
          </li>)}
        </ul>
      </>}
      <h4>Offline multi-mode transport comparator (Car / Bus / Train / Flight)</h4>
      <div className="life-people__form">
        <label className="life-people__field">Origin city
          <select value={originCity} onChange={(event) => {
            setOriginCity(event.currentTarget.value);
            setManualKm("");
          }}>
            {OFFLINE_TRAVEL_CITIES.map((city) => <option key={city.name} value={city.name}>{city.name}</option>)}
          </select>
        </label>
        <label className="life-people__field">Destination city
          <select value={destCity} onChange={(event) => {
            setDestCity(event.currentTarget.value);
            setManualKm("");
          }}>
            {OFFLINE_TRAVEL_CITIES.map((city) => <option key={city.name} value={city.name}>{city.name}</option>)}
          </select>
        </label>
        <label className="life-people__field">Or custom straight-line distance (km)
          <input type="number" min="1" step="1" value={manualKm} onInput={(event) => setManualKm(event.currentTarget.value)} placeholder={compareKm > 0 ? String(compareKm) : "e.g. 500"} />
        </label>
      </div>
      {modeEstimates.length > 0 && <div className="life-monthly__scroll">
        <table>
          <thead>
            <tr>
              <th>Mode</th>
              <th>Est. distance</th>
              <th>Est. duration</th>
              <th>One-way est.</th>
              <th>Round-trip est.</th>
            </tr>
          </thead>
          <tbody>
            {modeEstimates.map((mode) => <tr key={mode.mode}>
              <th scope="row">{mode.label} ({mode.providerHint})</th>
              <td>{mode.distanceKm} km</td>
              <td>{mode.durationText}</td>
              <td>{formatIntegerEuroCents(mode.estimatedOneWayCents)}</td>
              <td>{formatIntegerEuroCents(mode.estimatedRoundTripCents)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    </>}
  </section>;
}
