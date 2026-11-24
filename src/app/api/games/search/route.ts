import { desc, ilike } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { games } from "@/db/schema";

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Autocomplete: GET /api/games/search?q=zelda */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 100) return NextResponse.json([]);

  // A sequential ILIKE scan is fine for a few thousand games; add a pg_trgm index if it grows.
  const rows = await db
    .select({
      id: games.id,
      name: games.name,
      releaseYear: games.releaseYear,
      coverImageId: games.coverImageId,
    })
    .from(games)
    .where(ilike(games.name, `%${escapeLike(q)}%`))
    .orderBy(desc(games.popularity))
    .limit(10);

  return NextResponse.json(rows);
}
