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
  MapCategory,
  categoryStyle,
  mapLayers,
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
  readonly transitVisible: boolean;
  readonly onPick: (position: MapPosition) => void;
  readonly onSelect: (place: MapPlace) => void;
}

const transitCredit = "Münchner Verkehrs- und Tarifverbund GmbH (MVV) · 20 Nov 2026 · CC BY";
const osmCredit = "© OpenStreetMap contributors · Open Database License";

function point(position: MapPosition): [number, number] {
  return [position[0], position[1]];
}

function pinStyle(
  code: string,
  color: string,
  size = 26,
) {
  const label = document.createElement("span");
  label.textContent = code;
  label.style.backgroundColor = color;
  label.style.width = `${size}px`;
  label.style.height = `${size}px`;
  return divIcon({ className: "munich-map-pin",
    html: label,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2] });
}

export function MapView({
  places,
  pins,
  origin,
  radius,
  focus,
  draft,
  picking,
  transitVisible,
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
    view.attributionControl?.addAttribution(osmCredit);
    if (import.meta.env.PUBLIC_SHOW_MAP_ATTRIBUTION === "true") {
      view.attributionControl?.addAttribution("Leaflet");
    }
    const tiles = tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
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
    const credits = instance.current?.attributionControl;
    if (transitVisible) {
      credits?.addAttribution(transitCredit);
      return () => {
        credits?.removeAttribution(transitCredit);
      };
    }
  }, [transitVisible]);

  useEffect(() => {
    const view = instance.current;
    if (!view) {
      return;
    }
    const layer = layerGroup().addTo(view);
    const visiblePlaces = layerGroup().addTo(layer);
    const renderVisiblePlaces = () => {
      visiblePlaces.clearLayers();
      const bounds = view.getBounds().pad(0.1);
      // At city scale, space out the densest layers so rail and event markers stay readable.
      const occupiedCells = new Set<string>();
      const declutter = view.getZoom() <= 13;
      for (const place of places) {
        const coordinates = point(place.position);
        if (!bounds.contains(coordinates)) {
          continue;
        }
        if (declutter && (place.category === MapCategory.Church || place.category === MapCategory.Bus)) {
          const pixel = view.project(coordinates);
          const cell = `${place.category}-${Math.floor(pixel.x / 34)}-${Math.floor(pixel.y / 34)}`;
          if (occupiedCells.has(cell)) {
            continue;
          }
          occupiedCells.add(cell);
        }
        const style = categoryStyle[place.category];
        const overlay = mapLayers.includes(place.category);
        const pin = marker(coordinates, {
          icon: pinStyle(style.code, style.color, overlay ? 20 : 26),
          title: place.title,
          zIndexOffset: overlay ? 0 : 250,
        }).on("click", () => onSelect(place)).addTo(visiblePlaces);
        pin.getElement()?.setAttribute("aria-label", place.title);
      }
    };
    renderVisiblePlaces();
    view.on("moveend resize", renderVisiblePlaces);
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
      view.off("moveend resize", renderVisiblePlaces);
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
