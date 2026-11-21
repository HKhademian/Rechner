import {
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  type MapPlace,
  type OutingLocation,
  type SeasonalSchedule,
  MapCategory,
  toDriveMinutes,
  toMapPlaceId,
  toMapPosition,
} from "./places.ts";

interface OutingEntry extends SeasonalSchedule {
  readonly id: string;
  readonly title: string;
  readonly coordinates: readonly [number, number];
  readonly location: OutingLocation;
  readonly starts: string;
  readonly ends?: string;
  readonly detail: string;
  readonly source: string;
  readonly alsoListedUnder?: MapCategory;
}

const munich = { locality: "Munich" };

function regionalStop(
  locality: string,
  routeDestination: string,
  minutes: number,
): OutingLocation {
  return {
    locality,
    drive: {
      minutes: toDriveMinutes(minutes),
      source: `https://maps.adac.de/routenplaner/route-von-muenchen-nach-${routeDestination}`,
    },
  };
}

function nearbyStop(
  locality: string,
  routeDestination: string,
  minutes: number,
): OutingLocation {
  return {
    locality,
    drive: {
      minutes: toDriveMinutes(minutes),
      source: `https://www.rome2rio.com/s/Munich/${routeDestination}`,
    },
  };
}

const dachau = nearbyStop("Dachau", "Dachau", 25);
const fuerstenfeldbruck = nearbyStop("Fürstenfeldbruck", "F%C3%BCrstenfeldbruck", 30);

// Drive times are rounded one-way city-to-city planning estimates from Munich.
const outings: readonly OutingEntry[] = [
  {
    id: "munich-krampus-parade",
    title: "Munich Krampus Parade",
    coordinates: [48.1385, 11.5738],
    location: munich,
    venue: "Frauenplatz / Augustinerstraße",
    starts: "2026-12-13",
    theme: "Alpine costume parade",
    detail: "Krampus and Perchten groups parade through the old town to the Viktualienmarkt and the Old Town Hall.",
    hours: [["13 Dec", "15:00–17:00"]],
    source: "https://www.christkindlmarkt-muenchen.de/programm/krampuslauf/der-krampuslauf-ueber-den-muenchner-christkindlmarkt-2026",
  },
  {
    id: "domspatzen-munich",
    title: "Regensburger Domspatzen Christmas Concert",
    coordinates: [48.1391, 11.6056],
    location: munich,
    venue: "Prinzregententheater",
    starts: "2026-12-08",
    theme: "Choral concert",
    detail: "The boys’ choir sings Christmas motets and carols at the Prinzregententheater. Tickets are required.",
    hours: [["8 Dec", "19:30"]],
    source: "https://domspatzen.de/veranstaltungen/muenchen-7/",
    alsoListedUnder: MapCategory.Concert,
  },
  {
    id: "krone-premiere-munich",
    title: "Circus Krone Christmas Premiere",
    coordinates: [48.1455, 11.5486],
    location: munich,
    venue: "Circus Krone-Bau, Marsstraße",
    starts: "2026-12-25",
    theme: "Christmas circus",
    detail: "The traditional Christmas Day opening of Circus Krone’s winter season. Choose a performance when booking.",
    hours: [["25 Dec", "See the organizer’s showtimes"]],
    source: "https://www.circus-krone.com/winterspielzeit-muenchen/",
  },
  {
    id: "augsburger-engelesspiel",
    title: "Augsburger Engelesspiel",
    coordinates: [48.3688, 10.8984],
    location: regionalStop("Augsburg", "augsburg", 70),
    venue: "Rathausplatz",
    starts: "2026-11-23",
    ends: "2026-12-23",
    theme: "Outdoor Advent performance",
    detail: "Performers dressed as angels appear in the town hall windows, turning the façade into an Advent calendar.",
    hours: [["23 Nov", "18:00"], ["27–29 Nov, 4–6, 11–13 and 18–20 Dec", "18:00"], ["23 Dec", "18:00"]],
    source: "https://augsburgerchristkindlesmarkt.com/engelesspiel/",
  },
  {
    id: "domspatzen-regensburg",
    title: "Weihnachten mit den Regensburger Domspatzen",
    coordinates: [48.9989, 12.0957],
    location: regionalStop("Regensburg", "regensburg", 90),
    venue: "Audimax, Universität Regensburg",
    starts: "2026-12-04",
    theme: "Choral concert",
    detail: "The Regensburger Domspatzen sing a Christmas program in their home city. Tickets are required.",
    hours: [["4 Dec", "19:30"]],
    source: "https://domspatzen.de/veranstaltungen/regensburg-22/",
    alsoListedUnder: MapCategory.Concert,
  },
  {
    id: "nuernberger-sternenhaus",
    title: "Kindererlebnis Sternenhaus",
    coordinates: [49.4543, 11.0775],
    location: regionalStop("Nuremberg", "nuernberg", 120),
    venue: "Sternenhaus, Nuremberg Old Town",
    starts: "2026-11-28",
    ends: "2026-12-23",
    theme: "Children’s theatre and stories",
    detail: "Advent theatre, fairy tales, and music for children. Check the program for ages, performance times, and tickets.",
    hours: [["Selected performances", "See the published program"]],
    source: "https://www.christkindlesmarkt.de/fuer-kinder/sternenhaus",
  },
  {
    id: "salzburger-adventsingen",
    title: "Salzburger Adventsingen",
    coordinates: [47.7986, 13.0417],
    location: regionalStop("Salzburg, Austria", "salzburg", 115),
    venue: "Großes Festspielhaus",
    starts: "2026-11-27",
    ends: "2026-12-13",
    theme: "Advent music and nativity theatre",
    detail: "Das große Geheimnis combines Alpine singing, instrumental music, and a staged nativity story. Tickets are required.",
    hours: [["27 Nov", "19:30"], ["28–29 Nov, 5–6 and 12 Dec", "14:00 and 17:30"], ["8 and 13 Dec", "14:00"]],
    source: "https://www.salzburgeradventsingen.at/werke/salzburger-adventsingen-2026/",
    alsoListedUnder: MapCategory.Concert,
  },
  {
    id: "ingolstaedter-weihnachtscircus",
    title: "Ingolstädter Weihnachtscircus",
    coordinates: [48.7702, 11.4342],
    location: regionalStop("Ingolstadt", "ingolstadt", 65),
    venue: "Volksfestplatz",
    starts: "2026-12-18",
    ends: "2027-01-10",
    theme: "Family Christmas circus",
    detail: "A Christmas circus on the Volksfestplatz. The organizer lists individual showtimes and ticket availability.",
    hours: [["Selected performances", "See the organizer’s showtimes"]],
    source: "https://www.circus-krone.com/ingolstaedter-weihnachtscircus/",
  },
  {
    id: "rosenheimer-weihnachtscircus",
    title: "Rosenheimer Weihnachtscircus",
    coordinates: [47.8605, 12.1211],
    location: regionalStop("Rosenheim", "rosenheim", 60),
    venue: "Loretowiese",
    starts: "2026-12-15",
    ends: "2027-01-10",
    theme: "Family Christmas circus",
    detail: "A holiday circus on the Loretowiese. The organizer lists individual showtimes and ticket availability.",
    hours: [["Selected performances", "See the organizer’s showtimes"]],
    source: "https://www.circus-krone.com/rosenheimer-weihnachtscircus/",
  },
  {
    id: "bad-toelz-knabenchor",
    title: "Tölzer Knabenchor Christmas Concert",
    coordinates: [47.7609, 11.5499],
    location: regionalStop("Bad Tölz", "bad-toelz", 60),
    venue: "Kurhaus Bad Tölz, Ludwigstraße 25",
    starts: "2026-12-26",
    theme: "Christmas choral concert",
    detail: "The Tölzer Knabenchor performs at the Kurhaus on the second day of Christmas. Tickets are required.",
    hours: [["26 Dec", "19:30"]],
    source: "https://www.muenchenticket.de/event/toelzer-knabenchor-2208/",
    alsoListedUnder: MapCategory.Concert,
  },
  {
    id: "kufstein-fortress-christmas",
    title: "Weihnachtszauber auf der Festung Kufstein",
    coordinates: [47.5830, 12.1688],
    location: regionalStop("Kufstein, Austria", "kufstein", 80),
    venue: "Festung Kufstein",
    starts: "2026-11-28",
    ends: "2026-12-20",
    theme: "Fortress Advent weekends",
    detail: "An Advent market in the fortress grounds with crafts, a historic setting, and a hilltop view over Kufstein.",
    hours: [["Sat–Sun", "11:00–19:00"]],
    exceptions: [["8 Dec", "Closed"], ["Last entry", "18:00"]],
    source: "https://www.festung.kufstein.at/de/weihnachtszauber-auf-der-festung-kufstein-2-1-1-1.html",
    alsoListedUnder: MapCategory.ChristmasMarket,
  },
  {
    id: "fraueninsel-advent",
    title: "Christkindlmarkt auf der Fraueninsel",
    coordinates: [47.8734, 12.4250],
    location: {
      locality: "Fraueninsel, Chiemsee",
      drive: {
        minutes: toDriveMinutes(55),
        source: "https://www.rome2rio.com/s/Munich/Prien-am-Chiemsee",
        transfer: "Drive to Prien, then take the ferry",
      },
    },
    venue: "Village lanes around Frauenwörth Abbey",
    starts: "2026-11-26",
    ends: "2026-12-06",
    theme: "Island Advent and lake ferry",
    detail: "A Christmas market on two long weekends on the island. Check the return ferry timetable before leaving.",
    hours: [["26 Nov and 3 Dec", "15:00–20:00"], ["27–29 Nov and 4–6 Dec", "12:00–20:00"]],
    source: "https://fraueninsel-christkindlmarkt.de/der-markt-2026/",
    alsoListedUnder: MapCategory.ChristmasMarket,
  },
  {
    id: "dachauer-christkindlmarkt",
    title: "Dachauer Christkindlmarkt",
    coordinates: [48.2594, 11.4341],
    location: dachau,
    venue: "Rathausplatz, Dachau Altstadt",
    starts: "2026-11-20",
    ends: "2026-12-23",
    theme: "Old-town market and town hall Advent calendar",
    detail: "Market stalls and music in front of the town hall. The decorated Rathaus façade doubles as a large Advent calendar.",
    hours: [["Mon–Fri", "15:00–20:30"], ["Sat–Sun", "12:00–20:30"]],
    source: "https://www.dachau.de/dachauer-christkindlmarkt/",
    alsoListedUnder: MapCategory.ChristmasMarket,
  },
  {
    id: "advent-in-fuerstenfeld",
    title: "Advent in Fürstenfeld",
    coordinates: [48.1706, 11.2488],
    location: fuerstenfeldbruck,
    venue: "Stadtsaalhof and Tenne, Kloster Fürstenfeld",
    starts: "2026-11-27",
    ends: "2026-12-06",
    theme: "Monastery courtyards, crafts and music",
    detail: "Two weekends of artisan stalls, choirs, and children's activities in the former monastery grounds.",
    hours: [["27 Nov and 4 Dec", "14:00–20:00"], ["28–29 Nov and 5–6 Dec", "12:00–20:00"]],
    source: "https://adventinfuerstenfeld.de/programm/",
    alsoListedUnder: MapCategory.ChristmasMarket,
  },
  {
    id: "pettersson-feiert-weihnachten",
    title: "Pettersson feiert Weihnachten",
    coordinates: [48.1706, 11.2488],
    location: fuerstenfeldbruck,
    venue: "Stadtsaal, Veranstaltungsforum Fürstenfeld",
    starts: "2026-11-29",
    theme: "Children’s Christmas theatre",
    detail: "A family theatre production about Pettersson and Findus getting ready for Christmas. Tickets are required.",
    hours: [["29 Nov", "14:00"]],
    source: "https://www.fuerstenfeld.de/programmdetail/event/20261129_pettersson_feiert_weihnachten",
  },
  {
    id: "starnberger-christkindlmarkt",
    title: "Starnberger Christkindlmarkt",
    coordinates: [48.0017, 11.3402],
    location: nearbyStop("Starnberg", "Starnberg", 25),
    venue: "Kirchplatz",
    starts: "2026-12-03",
    ends: "2026-12-06",
    theme: "Lakeside town market with live music",
    detail: "Four days of crafts, brass bands and live music, with weekend activities for children.",
    hours: [["3 Dec", "16:00–21:00"], ["4 Dec", "14:00–21:00"], ["5 Dec", "12:00–21:00"], ["6 Dec", "12:00–20:00"]],
    source: "https://www.starnberg.de/buergerservice-verwaltung/aktuelles/news/starnberger-christkindlmarkt-vom-3-bis-6-dezember-2026",
    alsoListedUnder: MapCategory.ChristmasMarket,
  },
  {
    id: "freisinger-caritativer-christkindlmarkt",
    title: "Caritativer Christkindlmarkt Freising",
    coordinates: [48.4006, 11.7435],
    location: nearbyStop("Freising", "Freising", 35),
    venue: "Marienplatz, Freising",
    starts: "2026-12-13",
    theme: "Charity Christmas market",
    detail: "Local nonprofits sell handmade decorations, baked goods and small gifts to raise money for charitable causes.",
    hours: [["13 Dec", "See the city’s event listing"]],
    source: "https://veranstaltungen-tourismus.freising.de/freising/48-caritativer-christkindlmarkt-eea9b14ed92b0390b948bbd58da493a42.html",
    alsoListedUnder: MapCategory.ChristmasMarket,
  },
];

export const christmasOutings: readonly MapPlace[] = outings.map((entry) => ({
  id: toMapPlaceId(entry.id),
  category: MapCategory.ChristmasOuting,
  alsoListedUnder: entry.alsoListedUnder,
  title: entry.title,
  position: toMapPosition(...entry.coordinates),
  detail: entry.detail,
  date: toLifeDate(entry.starts),
  endDate: entry.ends ? toLifeDate(entry.ends) : undefined,
  source: entry.source,
  sourceLabel: "Published program",
  schedule: {
    venue: entry.venue,
    theme: entry.theme,
    hours: entry.hours,
    exceptions: entry.exceptions,
  },
  outing: entry.location,
}));
