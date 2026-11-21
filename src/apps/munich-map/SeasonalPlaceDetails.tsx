import {
  type MapPlace,
  type SeasonalSchedule,
  MapCategory,
  OutingTravelMode,
  formatTravelMinutes,
  formatPlaceDate,
} from "./places.ts";

function ScheduleRows({ rows }: { readonly rows: SeasonalSchedule["hours"] }) {
  return (
    <dl class="munich-seasonal-hours">
      {rows.map(([label, time]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{time}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SeasonalPlaceDetails({ place, schedule }: {
  readonly place: MapPlace;
  readonly schedule: SeasonalSchedule;
}) {
  const { outing } = place;
  const scheduleLabel = place.category === MapCategory.ChristmasMarket || place.alsoListedUnder === MapCategory.ChristmasMarket
    ? "Opening hours"
    : "Event times";
  return (
    <div class="munich-seasonal-details">
      <p class="munich-seasonal-venue">{schedule.venue}{place.outing && ` · ${place.outing.locality}`}</p>
      <dl class="munich-seasonal-hours">
        <div><dt>Dates</dt><dd>{formatPlaceDate(place)}</dd></div>
        <div><dt>Theme</dt><dd>{schedule.theme}</dd></div>
      </dl>
      <p>{place.detail}</p>
      <section aria-label={scheduleLabel}>
        <strong>{scheduleLabel}</strong>
        <ScheduleRows rows={schedule.hours} />
        {schedule.exceptions && (
          <>
            <strong>Special hours and closures</strong>
            <ScheduleRows rows={schedule.exceptions} />
          </>
        )}
      </section>
      {outing && Object.values(OutingTravelMode).map((mode) => {
        const journey = outing[mode];
        return journey && (
          <p key={mode}>
            <a href={journey.source}>
              About {formatTravelMinutes(journey.minutes)} by {mode === OutingTravelMode.Drive ? "car" : "train"}
            </a>
            {journey.from ? ` from ${journey.from}` : " from Munich"}
            {journey.transfer && ` · ${journey.transfer.instructions}`}
          </p>
        );
      })}
    </div>
  );
}
