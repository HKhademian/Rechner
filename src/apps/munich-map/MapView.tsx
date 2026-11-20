import "leaflet/dist/leaflet.css";
import {
  type Map as LeafletMap,
  type LeafletMouseEvent,
  circle,
  divIcon,
  layerGroup,
  map,
  marker,
  tileLayer,
} from "leaflet";
import {
  useEffect,
  useRef,
  useState,
} from "preact/hooks";
import {
  type MapPlace,
  type MapPosition,
  MUNICH_CENTER,
  categoryStyle,
  toMapPosition,
} from "./places.ts";

interface MapViewProps {
  readonly places: readonly MapPlace[];
  readonly pins: readonly { readonly title: string;
    readonly position: MapPosition }[];
  readonly origin: MapPosition;
  readonly radius: number;
  readonly focus?: MapPosition;
  readonly draft?: MapPosition;
  readonly picking: boolean;
  readonly onPick: (position: MapPosition) => void;
  readonly onSelect: (place: MapPlace) => void;
}

function point(position: MapPosition): [number, number] {
  return [position[0], position[1]];
}

function pinStyle(
  code: string,
  color: string,
) {
  const label = document.createElement("span");
  label.textContent = code;
  label.style.backgroundColor = color;
  return divIcon({ className: "munich-map-pin",
    html: label,
    iconSize: [26, 26],
    iconAnchor: [13, 13] });
}

export function MapView({
  places,
  pins,
  origin,
  radius,
  focus,
  draft,
  picking,
  onPick,
  onSelect,
}: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<LeafletMap>();
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    if (!container.current) {
      return;
    }
    const view = map(container.current, {
      center: point(MUNICH_CENTER),
      zoom: 12,
      scrollWheelZoom: false,
    });
    instance.current = view;
    view.attributionControl?.setPrefix(false);
    const tiles = tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      maxZoom: 19,
      referrerPolicy: "strict-origin-when-cross-origin",
    });
    tiles.on("tileerror", () => setTileError(true));
    tiles.on("load", () => {
      if (container.current?.querySelector(".leaflet-tile-loaded")) {
        setTileError(false);
      }
    });
    tiles.addTo(view);
    const resize = new ResizeObserver(() => view.invalidateSize({ pan: false }));
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      view.remove();
      instance.current = undefined;
    };
  }, []);

  useEffect(() => {
    const view = instance.current;
    if (!view) {
      return;
    }
    const layer = layerGroup().addTo(view);
    for (const place of places) {
      const style = categoryStyle[place.category];
      marker(point(place.position), { icon: pinStyle(style.code, style.color),
        title: place.title,
        alt: place.title })
        .on("click", () => onSelect(place)).addTo(layer);
    }
    for (const pin of pins) {
      marker(point(pin.position), {
        icon: pinStyle(pin.title[0], "var(--qr-ink)"),
        title: pin.title,
        alt: pin.title,
        keyboard: false,
        interactive: false,
        zIndexOffset: 500,
      }).addTo(layer);
    }
    if (draft) {
      marker(point(draft), {
        icon: pinStyle("+", "var(--color-primary-hover)"),
        keyboard: false,
        interactive: false,
        zIndexOffset: 700,
      }).addTo(layer);
    }
    if (radius > 0) {
      circle(point(origin), { radius: radius * 1000,
        color: "var(--color-primary)",
        weight: 2,
        fillOpacity: 0.08,
        interactive: false }).addTo(layer);
    }
    return () => {
      layer.remove();
    };
  }, [places, pins, origin, radius, draft, onSelect]);

  useEffect(() => {
    if (focus) {
      instance.current?.panTo(point(focus));
    }
  }, [focus]);

  useEffect(() => {
    const view = instance.current;
    if (!view || !picking) {
      return;
    }
    const choose = ({ latlng }: LeafletMouseEvent) => onPick(toMapPosition(latlng.lat, latlng.wrap().lng));
    view.on("click", choose);
    return () => {
      view.off("click", choose);
    };
  }, [picking, onPick]);

  return (
    <div class="munich-map-frame">
      <div ref={container} class={`munich-map-surface${picking ? " is-picking" : ""}`} aria-label="Interactive Munich map" />
      {tileError && <p class="munich-map-tile-status" role="status">The basemap is unavailable. Pins and the place list are still available.</p>}
      {picking && <button type="button" class="munich-map-center-picker" onClick={() => {
        const center = instance.current?.getCenter().wrap();
        if (center) {
          onPick(toMapPosition(center.lat, center.lng));
        }
      }}>Use map center</button>}
    </div>
  );
}
