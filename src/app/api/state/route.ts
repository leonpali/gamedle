import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { games, guesses } from "@/db/schema";
import { compareGames } from "@/lib/compare";
import { getPuzzle } from "@/lib/daily";
import { getSessionId } from "@/lib/session";

/** Today's guesses for the current session, so the board survives reloads. */
export async function GET() {
  const puzzle = await getPuzzle();
  const sessionId = await getSessionId();
  if (!sessionId) return NextResponse.json({ date: puzzle.puzzleDate, guesses: [], solved: false });

  const [answer, rows] = await Promise.all([
    db.query.games.findFirst({ where: eq(games.id, puzzle.gameId) }),
    db
      .select({ game: games })
      .from(guesses)
      .innerJoin(games, eq(guesses.gameId, games.id))
      .where(and(eq(guesses.sessionId, sessionId), eq(guesses.puzzleDate, puzzle.puzzleDate)))
      .orderBy(asc(guesses.createdAt)),
  ]);
  if (!answer) throw new Error(`Puzzle ${puzzle.puzzleDate} references missing game ${puzzle.gameId}`);

  const feedback = rows.map((r) => compareGames(r.game, answer));
  return NextResponse.json({
    date: puzzle.puzzleDate,
    guesses: feedback,
    solved: feedback.some((f) => f.correct),
  });
}
