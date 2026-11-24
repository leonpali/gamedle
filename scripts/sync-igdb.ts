/**
 * Copies games from IGDB into the local database.
 * Run with: npm run sync:igdb   (safe to re-run; rows are upserted)
 */
import { sql } from "drizzle-orm";
import { client, db } from "@/db";
import { games, type NewGame } from "@/db/schema";
import { igdbQuery, type IgdbGame } from "@/lib/igdb";

const PAGE_SIZE = 500; // IGDB maximum
const MIN_RATING_COUNT = Number(process.env.IGDB_MIN_RATING_COUNT ?? 20);
const DAILY_MIN_RATING_COUNT = Number(process.env.DAILY_MIN_RATING_COUNT ?? 200);

const FIELDS = [
  "name",
  "slug",
  "first_release_date",
  "total_rating_count",
  "cover.image_id",
  "genres.name",
  "platforms.name",
  "platforms.abbreviation",
  "game_modes.name",
  "player_perspectives.name",
  "involved_companies.developer",
  "involved_companies.company.name",
  "multiplayer_modes.onlinemax",
  "multiplayer_modes.offlinemax",
  "multiplayer_modes.onlinecoopmax",
  "multiplayer_modes.offlinecoopmax",
].join(",");

const names = (items?: { name: string }[]) => [...new Set((items ?? []).map((i) => i.name))];

function maxPlayers(game: IgdbGame): number | null {
  const counts = (game.multiplayer_modes ?? []).flatMap((m) =>
    [m.onlinemax, m.offlinemax, m.onlinecoopmax, m.offlinecoopmax].filter(
      (n): n is number => typeof n === "number" && n > 0,
    ),
  );
  if (counts.length) return Math.max(...counts);
  const modes = names(game.game_modes);
  if (modes.length === 1 && modes[0] === "Single player") return 1;
  return null; // IGDB has no player-count data for this game
}

function toRow(game: IgdbGame): NewGame {
  const popularity = game.total_rating_count ?? 0;
  return {
    id: game.id,
    name: game.name,
    slug: game.slug,
    releaseYear: game.first_release_date
      ? new Date(game.first_release_date * 1000).getUTCFullYear()
      : null,
    genres: names(game.genres),
    platforms: [...new Set((game.platforms ?? []).map((p) => p.abbreviation ?? p.name))],
    gameModes: names(game.game_modes),
    perspectives: names(game.player_perspectives),
    developers: [
      ...new Set(
        (game.involved_companies ?? []).filter((c) => c.developer).map((c) => c.company.name),
      ),
    ],
    maxPlayers: maxPlayers(game),
    coverImageId: game.cover?.image_id ?? null,
    popularity,
    dailyEligible: popularity >= DAILY_MIN_RATING_COUNT,
    updatedAt: new Date(),
  };
}

const excluded = (column: string) => sql.raw(`excluded.${column}`);

async function main() {
  let offset = 0;
  let total = 0;

  for (;;) {
    // game_type 0 = main game (excludes DLCs, bundles, editions, mods).
    const page = await igdbQuery<IgdbGame>(
      "games",
      `fields ${FIELDS};
       where total_rating_count >= ${MIN_RATING_COUNT} & game_type = 0 & first_release_date != null;
       sort id asc; limit ${PAGE_SIZE}; offset ${offset};`,
    );
    if (page.length === 0) break;

    await db
      .insert(games)
      .values(page.map(toRow))
      .onConflictDoUpdate({
        target: games.id,
        set: {
          name: excluded("name"),
          slug: excluded("slug"),
          releaseYear: excluded("release_year"),
          genres: excluded("genres"),
          platforms: excluded("platforms"),
          gameModes: excluded("game_modes"),
          perspectives: excluded("perspectives"),
          developers: excluded("developers"),
          maxPlayers: excluded("max_players"),
          coverImageId: excluded("cover_image_id"),
          popularity: excluded("popularity"),
          dailyEligible: excluded("daily_eligible"),
          updatedAt: excluded("updated_at"),
        },
      });

    total += page.length;
    offset += PAGE_SIZE;
    console.log(`Synced ${total} games...`);
    await new Promise((resolve) => setTimeout(resolve, 300)); // stay under 4 req/s
  }

  console.log(`Done. ${total} games synced.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
