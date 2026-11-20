import "leaflet/dist/leaflet.css";
import {
  type JSX,
  render,
} from "preact";
import {
  type Map as LeafletMap,
  type Marker,
  type LeafletMouseEvent,
  circle,
  divIcon,
  latLng,
  latLngBounds,
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
  type MapFocus,
  type MapPlace,
  type MapPlaceId,
  type MapPosition,
  MUNICH_CENTER,
  MapCategory,
  categoryStyle,
  mapLayers,
  toMapPosition,
} from "./places.ts";

import {
  SeasonalPlaceDetails,
} from "./SeasonalPlaceDetails.tsx";
import {
  mapSymbol,
} from "./mapSymbols.tsx";

interface MapViewProps {
  readonly places: readonly MapPlace[];
  readonly pins: readonly { readonly title: string;
    readonly position: MapPosition }[];
  readonly origin: MapPosition;
  readonly radius: number;
  readonly focus?: MapFocus;
  readonly draft?: MapPosition;
  readonly picking: boolean;
  readonly onPick: (position: MapPosition) => void;
  readonly onSelect: (place: MapPlace) => void;
}

const osmCredit = "© OpenStreetMap";

function point(position: MapPosition): [number, number] {
  return [position[0], position[1]];
}

function pinStyle(
  symbol: string | JSX.Element,
  color: string,
  size = 26,
) {
  const label = document.createElement("span");
  if (typeof symbol === "string") {
    label.textContent = symbol;
  }
  else {
    render(symbol, label);
  }
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
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 90,
      preferCanvas: true,
      trackResize: false,
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
    const resize = new ResizeObserver(() => view.invalidateSize({ debounceMoveend: true }));
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
    const visiblePlaces = layerGroup().addTo(view);
    const markers = new Map<MapPlaceId, Marker>();
    // Multiple seasonal programs can use the same venue on different dates.
    const schedulesByPosition = new Map<string, MapPlace[]>();
    for (const place of places) {
      if (place.schedule) {
        const key = place.position.join(",");
        const schedules = schedulesByPosition.get(key) ?? [];
        schedules.push(place);
        schedulesByPosition.set(key, schedules);
      }
    }
    const renderVisiblePlaces = () => {
      const visibleIds = new Set<MapPlaceId>();
      const bounds = view.getBounds().pad(0.1);
      // At city scale, space out the densest layers so rail and event markers stay readable.
      const occupiedCells = new Set<string>();
      const declutter = view.getZoom() <= 13;
      for (const place of places) {
        const coordinates = point(place.position);
        const venueSchedules = place.schedule ? schedulesByPosition.get(place.position.join(",")) : undefined;
        if (!bounds.contains(coordinates) || (venueSchedules && venueSchedules[0].id !== place.id)) {
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
        visibleIds.add(place.id);
        if (markers.has(place.id)) {
          continue;
        }
        const style = categoryStyle[place.category];
        const overlay = mapLayers.includes(place.category);
        const symbol = mapSymbol(place.category, 17);
        const pin = marker(coordinates, {
          icon: pinStyle(symbol, style.color, overlay ? 20 : 26),
          title: venueSchedules?.map((entry) => entry.title).join(" · ") ?? place.title,
          zIndexOffset: overlay ? 0 : 250,
        }).on("click", () => onSelect(place)).addTo(visiblePlaces);
        pin.bindPopup(() => {
          const content = document.createElement("div");
          if (venueSchedules) {
            render(
              <div class="munich-seasonal-popup">
                {venueSchedules.map((item) => item.schedule && (
                  <section key={item.id} aria-label={item.title}>
                    <strong>{item.title}</strong>
                    <SeasonalPlaceDetails place={item} schedule={item.schedule} />
                    {item.source && <a href={item.source}>{item.sourceLabel ?? "Published schedule"}</a>}
                  </section>
                ))}
              </div>,
              content,
            );
            return content;
          }
          const title = document.createElement("strong");
          title.textContent = place.title;
          content.append(title);
          if (place.detail) {
            const detail = document.createElement("div");
            detail.textContent = place.detail;
            content.append(detail);
          }
          return content;
        }, { maxHeight: 300,
          maxWidth: 300 });
        markers.set(place.id, pin);
        pin.getElement()?.setAttribute("aria-label", pin.options.title ?? place.title);
      }
      for (const [id, pin] of markers) {
        if (!visibleIds.has(id)) {
          visiblePlaces.removeLayer(pin);
          markers.delete(id);
        }
      }
    };
    renderVisiblePlaces();
    view.on("moveend", renderVisiblePlaces);
    return () => {
      view.off("moveend", renderVisiblePlaces);
      visiblePlaces.remove();
    };
  }, [places, onSelect]);

  useEffect(() => {
    const view = instance.current;
    if (!view) {
      return;
    }
    const layer = layerGroup().addTo(view);
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
  }, [pins, origin, radius, draft]);

  useEffect(() => {
    const view = instance.current;
    if (!view || !focus) {
      return;
    }
    const target = point(focus.position);
    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    view.closePopup();
    if (focus.fitPositions && focus.fitPositions.length > 1) {
      view.fitBounds(latLngBounds(focus.fitPositions.map(point)), {
        paddingTopLeft: [42, 54],
        paddingBottomRight: [42, 86],
        maxZoom: 14,
        animate,
      });
    }
    else if (focus.radius) {
      const bounds = latLng(target).toBounds(focus.radius * 2000);
      view.fitBounds(bounds, { paddingTopLeft: [28, 28],
        paddingBottomRight: [28, 80],
        maxZoom: 15,
        animate });
    }
    else {
      const zoom = focus.zoom ?? Math.max(view.getZoom(), focus.minimumZoom ?? 0);
      if (animate) {
        view.flyTo(target, zoom, { duration: 0.5 });
      }
      else {
        view.setView(target, zoom, { animate: false });
      }
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
    <>
      <div ref={container} class={`munich-map-surface${picking ? " is-picking" : ""}`} aria-label="Interactive Munich map" />
      {tileError && <p class="munich-map-tile-status" role="status">The basemap is unavailable. Pins and the place list are still available.</p>}
      {picking && <button type="button" class="munich-map-center-picker" onClick={() => {
        const center = instance.current?.getCenter().wrap();
        if (center) {
          onPick(toMapPosition(center.lat, center.lng));
        }
      }}>Use map center</button>}
    </>
  );
}
