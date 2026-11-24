import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { games, guesses } from "@/db/schema";
import { compareGames } from "@/lib/compare";
import { getPuzzle } from "@/lib/daily";
import { getOrCreateSessionId } from "@/lib/session";

const bodySchema = z.object({ gameId: z.number().int().positive() });

/** Submit a guess for today's puzzle: POST /api/guess { gameId } */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const sessionId = await getOrCreateSessionId();
  const puzzle = await getPuzzle();

  const [guessed, answer] = await Promise.all([
    db.query.games.findFirst({ where: eq(games.id, parsed.data.gameId) }),
    db.query.games.findFirst({ where: eq(games.id, puzzle.gameId) }),
  ]);
  if (!guessed) return NextResponse.json({ error: "Unknown game" }, { status: 404 });
  if (!answer) throw new Error(`Puzzle ${puzzle.puzzleDate} references missing game ${puzzle.gameId}`);

  const alreadySolved = await db.query.guesses.findFirst({
    where: and(
      eq(guesses.sessionId, sessionId),
      eq(guesses.puzzleDate, puzzle.puzzleDate),
      eq(guesses.gameId, puzzle.gameId),
    ),
  });
  if (alreadySolved) {
    return NextResponse.json({ error: "Today's puzzle is already solved" }, { status: 409 });
  }

  const inserted = await db
    .insert(guesses)
    .values({ sessionId, puzzleDate: puzzle.puzzleDate, gameId: guessed.id })
    .onConflictDoNothing()
    .returning({ id: guesses.id });
  if (inserted.length === 0) {
    return NextResponse.json({ error: "You already guessed that game" }, { status: 409 });
  }

  return NextResponse.json({ date: puzzle.puzzleDate, feedback: compareGames(guessed, answer) });
}
