// Dev-only seed: vult de DB met wat demodata zodat de Verken-pagina lokaal gevuld is —
// een tweede gebruiker met gevolgde series + films ("Toegevoegd door anderen") en een
// paar items voor de huidige gebruiker (zodat de "Omdat je …"-aanbevelingen verschijnen).
// Idempotent (upserts). Draai met: npm run seed:dev
//
// Werkt het mooist samen met TMDB_MOCK=1 (mock-data voor trending/aanbevelingen).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const d = (s) => new Date(s);

// Series die "anderen" volgen — status komt uit de DB (voedt de loopt/geëindigd-badge).
const otherShows = [
  { tmdbId: 100088, name: "The Last of Us", posterPath: "/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg", status: "Returning Series", firstAirDate: d("2023-01-15") },
  { tmdbId: 87108, name: "Chernobyl", posterPath: "/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg", status: "Ended", firstAirDate: d("2019-05-06") },
  { tmdbId: 76479, name: "The Boys", posterPath: "/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg", status: "Returning Series", firstAirDate: d("2019-07-25") },
];

// Films die "anderen" op hun watchlist zetten / al zagen.
const otherMovies = [
  { tmdbId: 438631, title: "Dune", overview: "Paul Atreides reist naar de gevaarlijkste planeet van het universum om de toekomst van zijn familie en volk veilig te stellen.", posterPath: "/d5NXSklXo0qyIYkgV94XAgMIckC.jpg", releaseDate: d("2021-09-15") },
  { tmdbId: 496243, title: "Parasite", overview: "De arme familie Kim dringt sluw binnen in het leven van de rijke familie Park, met onverwachte en explosieve gevolgen.", posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", releaseDate: d("2019-05-30") },
];

// Seeds voor de huidige gebruiker → triggeren de "Omdat je …"-aanbevelingen (mock).
const seedShow = { tmdbId: 95396, name: "Severance", posterPath: "/lFf6LLrQjYldcZItzOkGmMMigP7.jpg", status: "Returning Series", firstAirDate: d("2022-02-18") };
const seedMovie = { tmdbId: 634649, title: "Spider-Man: No Way Home", overview: "Peter Parker vraagt Doctor Strange om hulp wanneer zijn identiteit bekend wordt, maar een spreuk opent het multiversum.", posterPath: "/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg", releaseDate: d("2021-12-15") };

async function upsertShow(s) {
  return prisma.show.upsert({
    where: { tmdbId: s.tmdbId },
    create: s,
    update: { name: s.name, posterPath: s.posterPath, status: s.status, firstAirDate: s.firstAirDate },
  });
}

async function upsertMovie(m) {
  return prisma.movie.upsert({
    where: { tmdbId: m.tmdbId },
    create: m,
    update: { title: m.title, overview: m.overview, posterPath: m.posterPath, releaseDate: m.releaseDate },
  });
}

async function main() {
  // Huidige gebruiker: eerste ADMIN, anders de eerste gebruiker.
  const adminEmail = (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim().toLowerCase();
  const me =
    (adminEmail && (await prisma.user.findUnique({ where: { email: adminEmail } }))) ||
    (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!me) {
    console.error("Geen gebruiker gevonden. Log eerst één keer in.");
    process.exit(1);
  }

  // Tweede ("andere") gebruiker.
  const other = await prisma.user.upsert({
    where: { email: "familie@voorbeeld.nl" },
    create: { email: "familie@voorbeeld.nl", name: "Familielid" },
    update: {},
  });

  // "Anderen" volgen series + voegen films toe.
  for (const s of otherShows) {
    const show = await upsertShow(s);
    await prisma.follow.upsert({
      where: { userId_showId: { userId: other.id, showId: show.id } },
      create: { userId: other.id, showId: show.id, status: "WATCHING" },
      update: {},
    });
  }
  for (const m of otherMovies) {
    const movie = await upsertMovie(m);
    await prisma.watchlistMovie.upsert({
      where: { userId_movieId: { userId: other.id, movieId: movie.id } },
      create: { userId: other.id, movieId: movie.id },
      update: {},
    });
  }

  // Huidige gebruiker: één gevolgde serie + één geziene film als aanbevelings-seed.
  const mine = await upsertShow(seedShow);
  await prisma.follow.upsert({
    where: { userId_showId: { userId: me.id, showId: mine.id } },
    create: { userId: me.id, showId: mine.id, status: "WATCHING" },
    update: {},
  });
  const myMovie = await upsertMovie(seedMovie);
  await prisma.watchedMovie.upsert({
    where: { userId_movieId: { userId: me.id, movieId: myMovie.id } },
    create: { userId: me.id, movieId: myMovie.id },
    update: {},
  });

  console.log(`Seed klaar. Huidige gebruiker: ${me.email}. Andere gebruiker: ${other.email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
