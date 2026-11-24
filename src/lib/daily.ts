import { and, eq, gt, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyPuzzles, games, type DailyPuzzle } from "@/db/schema";

/** Days before the same game can be the answer again. */
const REPEAT_COOLDOWN_DAYS = 365;

/** Puzzles roll over at midnight UTC. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBefore(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the puzzle for `date`, picking and storing a random eligible game
 * the first time that date is requested. Safe to call concurrently: the
 * primary key on puzzle_date means only the first insert wins.
 */
export async function getPuzzle(date: string = todayUtc()): Promise<DailyPuzzle> {
  const existing = await db.query.dailyPuzzles.findFirst({
    where: eq(dailyPuzzles.puzzleDate, date),
  });
  if (existing) return existing;

  const recentAnswers = db
    .select({ id: dailyPuzzles.gameId })
    .from(dailyPuzzles)
    .where(gt(dailyPuzzles.puzzleDate, daysBefore(date, REPEAT_COOLDOWN_DAYS)));

  const pickRandom = (excludeRecent: boolean) =>
    db
      .select({ id: games.id })
      .from(games)
      .where(
        excludeRecent
          ? and(eq(games.dailyEligible, true), notInArray(games.id, recentAnswers))
          : eq(games.dailyEligible, true),
      )
      .orderBy(sql`random()`)
      .limit(1);

  // Fall back to allowing repeats once every eligible game has been used within the cooldown.
  let [pick] = await pickRandom(true);
  if (!pick) [pick] = await pickRandom(false);
  if (!pick) {
    throw new Error("No daily-eligible games in the database. Run `npm run sync:igdb` first.");
  }

  await db.insert(dailyPuzzles).values({ puzzleDate: date, gameId: pick.id }).onConflictDoNothing();

  const puzzle = await db.query.dailyPuzzles.findFirst({
    where: eq(dailyPuzzles.puzzleDate, date),
  });
  if (!puzzle) throw new Error(`Failed to create puzzle for ${date}`);
  return puzzle;
}
