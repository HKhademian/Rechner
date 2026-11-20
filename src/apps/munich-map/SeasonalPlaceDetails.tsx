import {
  type MapPlace,
  type SeasonalSchedule,
  MapCategory,
  formatDriveMinutes,
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
  const drive = place.outing?.drive;
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
      {drive && (
        <p>
          <a href={drive.source}>About {formatDriveMinutes(drive.minutes)} from Munich</a> by car
          {drive.transfer && ` · ${drive.transfer}`}
        </p>
      )}
    </div>
  );
}
