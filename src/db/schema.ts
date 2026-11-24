import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const textArray = (name: string) =>
  text(name)
    .array()
    .notNull()
    .default(sql`'{}'::text[]`);

/**
 * Local copy of IGDB game data, filled by `npm run sync:igdb`.
 * Multi-valued attributes are stored as text arrays: the game only ever
 * reads and compares them as sets, so join tables would add no value yet.
 */
export const games = pgTable(
  "games",
  {
    id: integer("id").primaryKey(), // IGDB game id
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    releaseYear: integer("release_year"),
    genres: textArray("genres"),
    platforms: textArray("platforms"),
    gameModes: textArray("game_modes"),
    perspectives: textArray("perspectives"),
    developers: textArray("developers"),
    maxPlayers: integer("max_players"),
    coverImageId: text("cover_image_id"),
    popularity: integer("popularity").notNull().default(0), // IGDB total_rating_count
    dailyEligible: boolean("daily_eligible").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("games_daily_eligible_idx").on(t.dailyEligible)],
);

/** One row per day; the answer is fixed once picked. */
export const dailyPuzzles = pgTable("daily_puzzles", {
  puzzleDate: date("puzzle_date", { mode: "string" }).primaryKey(), // UTC date, YYYY-MM-DD
  gameId: integer("game_id")
    .notNull()
    .references(() => games.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Anonymous browser sessions. `userId` stays null until accounts exist;
 * linking a session to a user later keeps all of its history.
 */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const guesses = pgTable(
  "guesses",
  {
    id: serial("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    puzzleDate: date("puzzle_date", { mode: "string" })
      .notNull()
      .references(() => dailyPuzzles.puzzleDate),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("guesses_session_date_game_uq").on(t.sessionId, t.puzzleDate, t.gameId),
    index("guesses_session_date_idx").on(t.sessionId, t.puzzleDate),
  ],
);

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type DailyPuzzle = typeof dailyPuzzles.$inferSelect;
