// Dev-only TMDB-fixtures. Actief zodra TMDB_MOCK=1 in de env staat; dan geeft de
// lage tmdb()-fetch canned, TMDB-vormige responses terug op basis van het request-pad.
// Zo werkt Verken (trending, aanbevelingen, loopt/geëindigd-badge) lokaal zonder een
// geldige TMDB-key. Staat standaard uit, dus productie is niet geraakt.

interface FixtureItem {
  kind: "tv" | "movie";
  id: number;
  title: string;
  overview: string;
  poster: string;
  date: string; // first_air_date (tv) / release_date (movie)
  status: string; // TMDB-status, o.a. voor de loopt/geëindigd-badge
}

const TRENDING_TV: FixtureItem[] = [
  {
    kind: "tv",
    id: 1396,
    title: "Breaking Bad",
    overview:
      "Scheikundeleraar Walter White verandert na een kankerdiagnose in een meedogenloze producent van crystal meth.",
    poster: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    date: "2008-01-20",
    status: "Ended",
  },
  {
    kind: "tv",
    id: 66732,
    title: "Stranger Things",
    overview:
      "In het stadje Hawkins verdwijnt een jongen en botsen kinderen op bovennatuurlijke krachten en een geheim lab.",
    poster: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    date: "2016-07-15",
    status: "Returning Series",
  },
  {
    kind: "tv",
    id: 119051,
    title: "Wednesday",
    overview:
      "Wednesday Addams onderzoekt op de mysterieuze Nevermore Academy een reeks moorden in de omgeving.",
    poster: "/9PFonBhy4cQy7Jz20NpMygczOkv.jpg",
    date: "2022-11-23",
    status: "Returning Series",
  },
  {
    kind: "tv",
    id: 94997,
    title: "House of the Dragon",
    overview:
      "Tweehonderd jaar voor Game of Thrones scheurt Huis Targaryen zichzelf uiteen in een strijd om de troon.",
    poster: "/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg",
    date: "2022-08-21",
    status: "Returning Series",
  },
];

const TRENDING_MOVIE: FixtureItem[] = [
  {
    kind: "movie",
    id: 27205,
    title: "Inception",
    overview:
      "Een dief die bedrijfsgeheimen steelt via droomtechnologie krijgt de opdracht een idee te planten in iemands geest.",
    poster: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    date: "2010-07-16",
    status: "Released",
  },
  {
    kind: "movie",
    id: 155,
    title: "The Dark Knight",
    overview:
      "Batman neemt het op tegen de Joker, een chaotische crimineel die Gotham City in angst wil laten leven.",
    poster: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    date: "2008-07-16",
    status: "Released",
  },
  {
    kind: "movie",
    id: 157336,
    title: "Interstellar",
    overview:
      "Een groep ontdekkingsreizigers reist door een wormgat om een nieuwe woonplaats voor de mensheid te vinden.",
    poster: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    date: "2014-11-05",
    status: "Released",
  },
  {
    kind: "movie",
    id: 872585,
    title: "Oppenheimer",
    overview:
      "Het verhaal van J. Robert Oppenheimer en zijn rol bij de ontwikkeling van de atoombom.",
    poster: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    date: "2023-07-19",
    status: "Released",
  },
];

const REC_TV: FixtureItem[] = [
  {
    kind: "tv",
    id: 82856,
    title: "The Mandalorian",
    overview:
      "Een eenzame premiejager trekt door de buitenste rand van het sterrenstelsel, ver van het gezag van de Republiek.",
    poster: "/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg",
    date: "2019-11-12",
    status: "Returning Series",
  },
  {
    kind: "tv",
    id: 1399,
    title: "Game of Thrones",
    overview:
      "Negen adellijke families strijden om de controle over de landen van Westeros, terwijl een oude vijand terugkeert.",
    poster: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    date: "2011-04-17",
    status: "Ended",
  },
];

const REC_MOVIE: FixtureItem[] = [
  {
    kind: "movie",
    id: 603,
    title: "The Matrix",
    overview:
      "Een hacker ontdekt dat de werkelijkheid een simulatie is en sluit zich aan bij een opstand tegen de machines.",
    poster: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    date: "1999-03-31",
    status: "Released",
  },
  {
    kind: "movie",
    id: 550,
    title: "Fight Club",
    overview:
      "Een slapeloze kantoormedewerker en een charismatische zeepverkoper richten een ondergrondse vechtclub op.",
    poster: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    date: "1999-10-15",
    status: "Released",
  },
  {
    kind: "movie",
    id: 680,
    title: "Pulp Fiction",
    overview:
      "De levens van twee huurmoordenaars, een bokser en een gangsterpaar verweven zich in vier verhalen vol geweld.",
    poster: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    date: "1994-09-10",
    status: "Released",
  },
];

// Alle bekende items bij elkaar, voor status- en detail-lookups per id.
const ALL: FixtureItem[] = [
  ...TRENDING_TV,
  ...TRENDING_MOVIE,
  ...REC_TV,
  ...REC_MOVIE,
];
const BY_ID = new Map(ALL.map((i) => [`${i.kind}-${i.id}`, i]));

function toRaw(i: FixtureItem) {
  return {
    id: i.id,
    media_type: i.kind,
    name: i.title,
    title: i.title,
    overview: i.overview,
    poster_path: i.poster,
    first_air_date: i.kind === "tv" ? i.date : undefined,
    release_date: i.kind === "movie" ? i.date : undefined,
  };
}

function tvDetails(i: FixtureItem | undefined, id: number) {
  const status = i?.status ?? "Returning Series";
  // Lopende series krijgen een volgende aflevering over 6 dagen, zodat het
  // "Volgende aflevering"-blok op de seriepagina lokaal te zien is.
  const nextAirDate = new Date(Date.now() + 6 * 86_400_000).toISOString().slice(0, 10);
  const running = status !== "Ended" && status !== "Canceled";
  return {
    id,
    name: i?.title ?? `Serie ${id}`,
    overview: i?.overview ?? "",
    poster_path: i?.poster ?? null,
    status,
    first_air_date: i?.date ?? null,
    number_of_seasons: 1,
    seasons: [{ season_number: 1, episode_count: 0 }],
    next_episode_to_air: running
      ? {
          id: id * 1000 + 1,
          season_number: 2,
          episode_number: 5,
          name: "Het volgende hoofdstuk",
          overview: "Een gloednieuwe aflevering, vers van de pers.",
          air_date: nextAirDate,
        }
      : null,
    external_ids: { imdb_id: null },
  };
}

// Filmreeksen: welke fixture-film bij welke collection hoort + de reeks zelf.
const COLLECTION_BY_MOVIE: Record<number, number> = {
  155: 263, // The Dark Knight -> The Dark Knight Collection
  603: 2344, // The Matrix -> The Matrix Collection
};

const COLLECTIONS: Record<
  number,
  { name: string; parts: { id: number; title: string; poster: string; date: string }[] }
> = {
  263: {
    name: "The Dark Knight Collection",
    parts: [
      {
        id: 272,
        title: "Batman Begins",
        poster: "/8RW2runSEc34IwKN2D1aPcJd2UL.jpg",
        date: "2005-06-10",
      },
      {
        id: 155,
        title: "The Dark Knight",
        poster: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        date: "2008-07-16",
      },
      {
        id: 49026,
        title: "The Dark Knight Rises",
        poster: "/85cWkCVftiVs0BVey6pxX8uNmLt.jpg",
        date: "2012-07-16",
      },
    ],
  },
  2344: {
    name: "The Matrix Collection",
    parts: [
      {
        id: 603,
        title: "The Matrix",
        poster: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
        date: "1999-03-31",
      },
      {
        id: 604,
        title: "The Matrix Reloaded",
        poster: "/9TGHDvWrqKBzwDxDodHYXEmOE6J.jpg",
        date: "2003-05-15",
      },
      {
        id: 605,
        title: "The Matrix Revolutions",
        poster: "/fgm8OZ7o4G1G1I9EeGcb85Noe6L.jpg",
        date: "2003-11-05",
      },
    ],
  },
};

// Geeft een canned response terug voor het pad, of undefined als er geen fixture is
// (de echte fetch neemt het dan over — al is dat zonder geldige key meestal leeg).
export function mockTmdb(path: string): unknown | undefined {
  if (path.startsWith("/trending/tv")) return { results: TRENDING_TV.map(toRaw) };
  if (path.startsWith("/trending/movie")) return { results: TRENDING_MOVIE.map(toRaw) };

  const recTv = path.match(/^\/tv\/(\d+)\/recommendations$/);
  if (recTv) return { results: REC_TV.map(toRaw) };
  const recMovie = path.match(/^\/movie\/(\d+)\/recommendations$/);
  if (recMovie) return { results: REC_MOVIE.map(toRaw) };

  const season = path.match(/^\/tv\/(\d+)\/season\/\d+$/);
  if (season) return { episodes: [] };

  if (path.match(/\/watch\/providers$/)) return { results: {} };

  const collection = path.match(/^\/collection\/(\d+)$/);
  if (collection) {
    const c = COLLECTIONS[Number(collection[1])];
    if (!c) return { name: "", parts: [] };
    return {
      id: Number(collection[1]),
      name: c.name,
      parts: c.parts.map((p) => ({
        id: p.id,
        title: p.title,
        poster_path: p.poster,
        release_date: p.date,
      })),
    };
  }

  const tv = path.match(/^\/tv\/(\d+)$/);
  if (tv) {
    const id = Number(tv[1]);
    return tvDetails(BY_ID.get(`tv-${id}`), id);
  }
  const movie = path.match(/^\/movie\/(\d+)$/);
  if (movie) {
    const id = Number(movie[1]);
    const i = BY_ID.get(`movie-${id}`);
    const collectionId = COLLECTION_BY_MOVIE[id];
    return {
      id,
      title: i?.title ?? `Film ${id}`,
      overview: i?.overview ?? "",
      poster_path: i?.poster ?? null,
      release_date: i?.date ?? null,
      status: i?.status ?? "Released",
      imdb_id: null,
      belongs_to_collection: collectionId
        ? { id: collectionId, name: COLLECTIONS[collectionId].name }
        : null,
    };
  }

  return undefined;
}
