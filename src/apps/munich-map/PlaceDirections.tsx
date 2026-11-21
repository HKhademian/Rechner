import {
  externalLinkAttributes,
} from "#utils/uiHelpers";
import {
  type MapPosition,
} from "./places.ts";

interface PlaceDirectionsProps {
  readonly home?: MapPosition;
  readonly destination: MapPosition;
  readonly onSetHome: () => void;
}

export function PlaceDirections({ home, destination, onSetHome }: PlaceDirectionsProps) {
  if (!home) {
    return <button type="button" class="munich-map-direction-link" onClick={onSetHome}>Set Home pin for directions</button>;
  }

  const origin = home.join(",");
  const target = destination.join(",");
  const google = new URLSearchParams({ api: "1",
    origin,
    destination: target });
  const apple = new URLSearchParams({ source: origin,
    destination: target });

  return (
    <div class="munich-map-directions" role="group" aria-label="Directions from Home">
      <strong>Directions from Home</strong>
      <div class="munich-map-actions">
        <a class="munich-map-direction-link" href={`https://www.google.com/maps/dir/?${google}`} {...externalLinkAttributes}>Google Maps</a>
        <a class="munich-map-direction-link" href={`https://maps.apple.com/directions?${apple}`} {...externalLinkAttributes}>Apple Maps</a>
      </div>
    </div>
  );
}
