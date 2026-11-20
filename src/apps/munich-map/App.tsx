import "./munichMap.css";
import {
  type JSX,
} from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "preact/hooks";
import {
  AppId,
  calculatorPath,
  sitePath,
} from "#/apps/appDefinition.ts";
import {
  AppShell,
} from "#components/ui/AppShell";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  type MapPlace,
  type MapPosition,
  type MapFocus,
  MapCategory,
  MUNICH_CENTER,
  PersonalPin,
  categoryStyle,
  distanceKm,
  formatDriveMinutes,
  formatPlaceDate,
  mapLayers,
  transitLayers,
  munichPlaces,
  toDriveMinutes,
  toMapCategory,
  toMapPlaceId,
  toPersonalPin,
} from "./places.ts";
import {
  type MapData,
  loadMapData,
  saveMapData,
} from "./mapStorage.ts";

import {
  SeasonalPlaceDetails,
} from "./SeasonalPlaceDetails.tsx";
import {
  christmasMarkets,
  munichChristmasMarketGuide,
} from "./christmasMarkets.ts";

import {
  christmasOutings,
} from "./christmasOutings.ts";
import {
  mapSymbol,
  seasonalSymbol,
} from "./mapSymbols.tsx";

const categories = Object.values(MapCategory);
const eventCategories = categories.filter((item) => !mapLayers.includes(item) && item !== MapCategory.Transit);
const defaultLayers: readonly MapCategory[] = [
  MapCategory.Landmark,
  MapCategory.Subway,
  MapCategory.SuburbanRail,
];
const resultLimit = 80;
const driveOptions = [0, 60, 90, 120].map(toDriveMinutes);
const personalPins = Object.values(PersonalPin);
const munichDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin",
  dateStyle: "short" });

function inCategory(
  place: MapPlace,
  category: MapCategory,
): boolean {
  return place.category === category || place.alsoListedUnder === category;
}

const initialData: MapData = { pins: {},
  places: [] };

export default function MunichMap() {
  const [MapView, setMapView] = useState<typeof import("./MapView.tsx").MapView>();
  const [mapFailed, setMapFailed] = useState(false);
  const [data, setData] = useState(initialData);
  const [today, setToday] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MapCategory>();
  const [layers, setLayers] = useState<readonly MapCategory[]>(defaultLayers);
  const [cityPlaces, setCityPlaces] = useState<readonly MapPlace[]>([]);
  const [reference, setReference] = useState<PersonalPin>();
  const [radius, setRadius] = useState(0);
  const [maxDrive, setMaxDrive] = useState(toDriveMinutes(120));
  const [selected, setSelected] = useState<MapPlace>();
  const [focus, setFocus] = useState<MapFocus>();
  const [mapOnly, setMapOnly] = useState(false);
  // A draft is either a home/work pin, or a place with an optional existing record.
  const [draft, setDraft] = useState<{ pin?: PersonalPin;
    place?: MapPlace;
    position?: MapPosition }>();
  const [picking, setPicking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setData(loadMapData());
    setToday(munichDay.format(new Date()));
    let active = true;
    void Promise.all([import("./MapView.tsx"), import("./cityLayers.ts")]).then(([{ MapView }, { cityPlaces }]) => {
      if (active) {
        setMapView(() => MapView);
        setCityPlaces(cityPlaces);
      }
    }).catch(() => {
      if (active) {
        setMapFailed(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const outingsMode = category === MapCategory.ChristmasOuting;
  const activeRadius = outingsMode ? 0 : radius;
  const origin = (reference && data.pins[reference]?.position) || MUNICH_CENTER;
  const places = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return [...munichPlaces, ...christmasMarkets, ...christmasOutings, ...cityPlaces, ...data.places].flatMap((place) => {
      const searchText = [place.title, place.detail, place.schedule?.venue, place.schedule?.theme, place.outing?.locality].join(" ");
      if (!searchText.toLocaleLowerCase().includes(term)) {
        return [];
      }
      if (outingsMode && place.outing?.drive && place.outing.drive.minutes > maxDrive) {
        return [];
      }
      if (place.modes) {
        const activeMode = place.modes.find((mode) => layers.includes(mode));
        return activeMode ? [{ ...place,
          category: activeMode }] : [];
      }
      if (place.category === MapCategory.Transit) {
        return transitLayers.some((layer) => layers.includes(layer)) ? [place] : [];
      }
      if (mapLayers.includes(place.category)) {
        return layers.includes(place.category) ? [place] : [];
      }
      return !category || inCategory(place, category) ? [place] : [];
    }).map((place) => ({
      place,
      distance: distanceKm(origin, place.position),
    })).filter(({ distance }) => activeRadius === 0 || distance <= activeRadius)
      .sort((left, right) => left.distance - right.distance);
  }, [cityPlaces, data.places, origin, query, category, layers, activeRadius, outingsMode, maxDrive]);
  const markers = useMemo(() => places.map(({ place }) => place), [places]);
  const resultPlaces = useMemo(() => {
    if (category) {
      const matching = places.filter(({ place }) => inCategory(place, category));
      return outingsMode ? matching.sort((left, right) =>
        (left.place.outing?.drive?.minutes ?? 0) - (right.place.outing?.drive?.minutes ?? 0)) : matching;
    }
    return [
      ...places.filter(({ place }) => eventCategories.includes(place.category)),
      ...places.filter(({ place }) => !eventCategories.includes(place.category)),
    ];
  }, [category, outingsMode, places]);
  const listedPlaces = resultPlaces.slice(0, resultLimit);

  const fitOutings = useCallback(() => {
    if (resultPlaces.length > 0) {
      setFocus({
        position: resultPlaces[0].place.position,
        fitPositions: resultPlaces.map(({ place }) => place.position),
        minimumZoom: 14,
      });
    }
  }, [resultPlaces]);

  useEffect(() => {
    if (outingsMode) {
      fitOutings();
    }
  }, [outingsMode, fitOutings]);

  const pins = useMemo(() => personalPins.flatMap((name) => {
    const pin = data.pins[name];
    return pin ? [{ title: name,
      position: pin.position }] : [];
  }), [data.pins]);

  function selectCategory(next: MapCategory | undefined) {
    setCategory(next);
    if (outingsMode && next !== MapCategory.ChristmasOuting) {
      setFocus({ position: origin,
        radius,
        zoom: 12 });
    }
  }

  const selectPlace = useCallback((place: MapPlace) => {
    setSelected(place);
    setFocus({ position: place.position,
      minimumZoom: 14 });
  }, []);
  const pickPosition = useCallback((position: MapPosition) => {
    setDraft((current) => ({ ...current,
      position }));
    setPicking(false);
  }, []);

  function updateData(next: MapData) {
    setData(next);
    setMessage(saveMapData(next) ? "Map updated." : "Map updated for this visit. Browser storage is unavailable.");
  }

  function startDraft(next: NonNullable<typeof draft>) {
    setDraft(next);
    setPicking(!next.position);
    setMessage("");
  }

  function submitDraft(event: JSX.TargetedSubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft?.position) {
      return;
    }
    const fields = new FormData(event.currentTarget);
    if (draft.pin) {
      updateData({ ...data,
        pins: { ...data.pins,
          [draft.pin]: {
            position: draft.position,
            address: String(fields.get("address") ?? "").trim(),
          } } });
      setReference(draft.pin);
    }
    else {
      const title = String(fields.get("title") ?? "").trim();
      if (!title) {
        setMessage("Enter a name for this place.");
        return;
      }
      const place: MapPlace = {
        id: draft.place?.id ?? toMapPlaceId(crypto.randomUUID()),
        title,
        category: toMapCategory(String(fields.get("category"))),
        position: draft.position,
        detail: String(fields.get("detail") ?? "").trim(),
        date: String(fields.get("date") ?? "") || undefined,
      };
      updateData({ ...data,
        places: [...data.places.filter((item) => item.id !== place.id), place] });
      setQuery("");
      setRadius(0);
      const layer = place.category === MapCategory.Transit ? MapCategory.Subway : place.category;
      if (mapLayers.includes(layer)) {
        setLayers((current) => current.includes(layer) ? current : [...current, layer]);
      }
      else {
        setCategory(place.category);
      }
      selectPlace(place);
    }
    setDraft(undefined);
  }

  const activePlace = selected && places.find(({ place }) => place.id === selected.id);
  const ownPlace = activePlace && data.places.some((place) => place.id === activePlace.place.id);
  const activeDate = activePlace && (ownPlace || today && today <= (activePlace.place.endDate ?? activePlace.place.date ?? ""))
    ? formatPlaceDate(activePlace.place)
    : undefined;

  return (
    <AppShell currentPath={calculatorPath(AppId.MunichMap)} wide mainClassName="munich-map-page"
      shellClassName={mapOnly ? "munich-map-shell is-map-only" : "munich-map-shell"}>
      <PageHeader title="Munich Map" />
      <div class="munich-map-layout">
        <section class="munich-map-main" aria-label="Map and distance controls">
          <div class="munich-map-frame">
            {MapView ? <MapView places={markers} pins={pins} origin={origin} radius={activeRadius} focus={focus} draft={draft?.position}
              picking={picking} onPick={pickPosition} onSelect={setSelected} /> : <p class="munich-map-placeholder" role="status">{mapFailed ? "The interactive map could not be loaded." : "Loading map…"}</p>}
            <div class="munich-map-tools">
              <details class="munich-map-layer-control">
                <summary>Map layers</summary>
                <fieldset class="munich-map-layers" aria-label="Map layers">
                  {mapLayers.map((layer) => (
                    <label key={layer}>
                      <input type="checkbox" checked={layers.includes(layer)} onChange={(event) => {
                        const { checked } = event.currentTarget;
                        setLayers((current) => checked ? [...current, layer] : current.filter((item) => item !== layer));
                      }} />
                      {layer}
                    </label>
                  ))}
                  {mapOnly && <a href={sitePath("/THIRD_PARTY_NOTICES.txt")}>Third-party notices</a>}
                </fieldset>
              </details>
              <div class="munich-map-view-switch" role="group" aria-label="Map view">
                <button type="button" aria-controls="munich-map-places" aria-pressed={!mapOnly}
                  onClick={() => setMapOnly(false)}>Split</button>
                <button type="button" aria-controls="munich-map-places" aria-pressed={mapOnly}
                  onClick={() => setMapOnly(true)}>Map</button>
              </div>
            </div>
          </div>
          <div class="munich-map-distance">
            {outingsMode ? (
              <>
                <label>Drive from Munich
                  <select value={maxDrive} onChange={(event) => setMaxDrive(toDriveMinutes(Number(event.currentTarget.value)))}>
                    {driveOptions.map((minutes) => (
                      <option key={minutes} value={minutes}>{minutes ? `About ${formatDriveMinutes(minutes)} or less` : "Munich only"}</option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={fitOutings} disabled={!resultPlaces.length}>Fit outings</button>
              </>
            ) : (
              <>
                <label>Distance from
                  <select value={reference ?? ""} onChange={(event) => {
                    const value = event.currentTarget.value;
                    const pin = value ? toPersonalPin(value) : undefined;
                    setReference(pin);
                    setFocus({ position: (pin && data.pins[pin]?.position) || MUNICH_CENTER,
                      radius });
                  }}>
                    <option value="">Marienplatz</option>
                    {personalPins.filter((name) => data.pins[name]).map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
                <label>Straight-line radius
                  <select value={radius} onChange={(event) => {
                    const nextRadius = Number(event.currentTarget.value);
                    setRadius(nextRadius);
                    if (nextRadius > 0) {
                      setFocus({ position: origin,
                        radius: nextRadius });
                    }
                  }}>
                    <option value={0}>Any distance</option>
                    {[1, 2, 5, 10, 20].map((km) => <option key={km} value={km}>{km} km</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => setFocus({ position: origin,
                  radius })}>{radius > 0 ? "Fit radius" : "Center map"}</button>
              </>
            )}
          </div>
        </section>
        <aside id="munich-map-places" class="munich-map-panel" aria-label="Places and event filters" hidden={mapOnly}>
          <div class="munich-map-panel-title">
            <h2>Explore Munich</h2>
            <button type="button" onClick={() => startDraft({})}>Add place</button>
          </div>
          <details class="munich-map-personal">
            <summary>Home &amp; work</summary>
            {personalPins.map((name) => {
              const pin = data.pins[name];
              return (
                <div key={name} class="munich-map-personal-row">
                  <div><strong>{name}</strong>{pin?.address && <small>{pin.address}</small>}</div>
                  <button type="button" onClick={() => {
                    startDraft({ pin: name,
                      position: pin?.position });
                    if (pin) {
                      setFocus({ position: pin.position });
                    }
                  }}>{pin ? `Edit ${name.toLowerCase()}` : `Pin ${name.toLowerCase()}`}</button>
                  {pin && <button type="button" onClick={() => {
                    const next = { ...data.pins };
                    delete next[name];
                    updateData({ ...data,
                      pins: next });
                    if (reference === name) {
                      setReference(undefined);
                    }
                    if (draft?.pin === name) {
                      setDraft(undefined);
                      setPicking(false);
                    }
                  }}>Clear {name.toLowerCase()}</button>}
                </div>
              );
            })}
            <p>Personal pins and events use your Rechner storage setting. Address labels are entered manually.</p>
          </details>
          {draft && <form class="munich-map-editor" key={draft.pin ?? draft.place?.id ?? "new"} onSubmit={submitDraft}>
            <h3>{draft.pin ? `Pin ${draft.pin.toLowerCase()}` : draft.place ? "Edit place" : "Add a place"}</h3>
            <p>{picking ? "Click the map or use its center to choose a location." : "Location selected."}</p>
            {draft.pin ? (
              <label>Address (optional)<input name="address" maxLength={160} defaultValue={data.pins[draft.pin]?.address} /></label>
            ) : (
              <>
                <label>Name<input name="title" required maxLength={100} defaultValue={draft.place?.title} /></label>
                <label>Category<select name="category" defaultValue={draft.place?.category ?? category ?? MapCategory.Event}>
                  {categories.map((item) => <option key={item}>{item}</option>)}
                </select></label>
                <label>Date (optional)<input type="date" name="date" max="9999-12-31" defaultValue={draft.place?.date} /></label>
                <label>Notes (optional)<input name="detail" maxLength={250} defaultValue={draft.place?.detail} /></label>
              </>
            )}
            <div class="munich-map-actions">
              <button type="submit" disabled={picking || !draft.position}>Save</button>
              {!picking && <button type="button" onClick={() => setPicking(true)}>Move pin</button>}
              <button type="button" onClick={() => {
                setDraft(undefined);
                setPicking(false);
              }}>Cancel</button>
            </div>
          </form>}
          <p role="status" class="munich-map-status">{message}</p>
          <label>Search places<input type="search" value={query} placeholder="e.g. Tollwood" onInput={(event) => setQuery(event.currentTarget.value)} /></label>
          <div class="munich-map-categories" aria-label="Event categories">
            {[undefined, ...eventCategories].map((item) =>
              <button type="button" key={item ?? "all"} aria-pressed={category === item} onClick={() => selectCategory(item)}>
                {item && seasonalSymbol(item, 14)}
                {item ?? "All events"}
              </button>)}
          </div>
          <p class="munich-map-count">
            {resultPlaces.length} {outingsMode
              ? (resultPlaces.length === 1 ? "Christmas outing" : "Christmas outings")
              : category === MapCategory.ChristmasMarket
                ? (resultPlaces.length === 1 ? "Christmas market" : "Christmas markets")
                : (resultPlaces.length === 1 ? "place" : "places")}
          </p>
          {outingsMode && <p class="munich-map-count">Approximate one-way drives from Munich. Allow extra time for traffic, parking and transfers.</p>}
          {activePlace && (
            <section class="munich-map-detail" aria-label="Selected place">
              <h3>{activePlace.place.title}</h3>
              {activePlace.place.schedule ? <SeasonalPlaceDetails place={activePlace.place} schedule={activePlace.place.schedule} /> : (
                <>
                  {activeDate && <time dateTime={activePlace.place.date}>{activeDate}</time>}
                  {activePlace.place.detail && <p>{activePlace.place.detail}</p>}
                </>
              )}
              {activePlace.place.source && <a href={activePlace.place.source}>
                {activePlace.place.sourceLabel ?? "Official site"}
              </a>}
              {ownPlace && <div class="munich-map-actions">
                <button type="button" onClick={() => startDraft({ place: activePlace.place,
                  position: activePlace.place.position })}>Edit place</button>
                <button type="button" onClick={() => {
                  updateData({ ...data,
                    places: data.places.filter((place) => place.id !== activePlace.place.id) });
                  setSelected(undefined);
                  if (draft?.place?.id === activePlace.place.id) {
                    setDraft(undefined);
                    setPicking(false);
                  }
                }}>Remove place</button>
              </div>}
            </section>
          )}
          {resultPlaces.length === 0 && <p>No places match these filters.</p>}
          <ul class="munich-map-results">
            {listedPlaces.map(({ place, distance }) => {
              const style = categoryStyle[place.category];
              return (
                <li key={place.id}>
                  <button type="button" aria-pressed={selected?.id === place.id} onClick={() => selectPlace(place)}>
                    <span class="munich-map-category-code" style={{ backgroundColor: style.color }} aria-hidden="true">
                      {mapSymbol(place.category, 16)}
                    </span>
                    <span>
                      <strong>{place.title}</strong>
                      <small>{place.schedule
                        ? [place.outing?.locality, formatPlaceDate(place), place.schedule.theme].filter(Boolean).join(" · ")
                        : place.category}</small>
                    </span>
                    <span>{place.outing
                      ? (place.outing.drive ? `~${formatDriveMinutes(place.outing.drive.minutes)}${place.outing.drive.transfer ? " + ferry" : ""}` : "In Munich")
                      : `${distance.toFixed(1)} km`}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {resultPlaces.length > resultLimit && <p class="munich-map-count">Showing {resultLimit} places. Search or set a radius to narrow the list.</p>}
          <p class="munich-map-schedule">
            {category === MapCategory.ChristmasMarket
              ? <a href={munichChristmasMarketGuide}>Munich’s 2026 Christmas market guide</a>
              : <a href="https://www.muenchen.de/veranstaltungen">Munich event calendar</a>}
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
