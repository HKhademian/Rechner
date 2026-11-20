import {
  type MapPlace,
  type MarketDetails,
  formatPlaceDate,
} from "./places.ts";

function MarketHours({ rows }: { readonly rows: MarketDetails["hours"] }) {
  return (
    <dl class="munich-market-hours">
      {rows.map(([label, time]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{time}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ChristmasMarketDetails({ place, market }: {
  readonly place: MapPlace;
  readonly market: MarketDetails;
}) {
  return (
    <div class="munich-market-details">
      <p class="munich-market-venue">{market.venue}</p>
      <dl class="munich-market-hours">
        <div><dt>Dates</dt><dd>{formatPlaceDate(place)}</dd></div>
        <div><dt>Theme</dt><dd>{market.theme}</dd></div>
      </dl>
      <p>{place.detail}</p>
      <section aria-label="Opening hours">
        <strong>Opening hours</strong>
        <MarketHours rows={market.hours} />
        {market.exceptions && (
          <>
            <strong>Special hours and closures</strong>
            <MarketHours rows={market.exceptions} />
          </>
        )}
      </section>
    </div>
  );
}
