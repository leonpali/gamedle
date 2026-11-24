# Gamedle

A daily video game guessing game. Every player gets the same game each day (it changes at midnight UTC). After each guess, the app shows how the guessed game compares to the answer: release year, genres, platforms, game modes, perspective, developer and max player count.

Game data comes from [IGDB](https://api-docs.igdb.com/). It is synced into our own Postgres database, so gameplay never calls IGDB directly.

## Stack

- **Next.js 15** (App Router, TypeScript): UI and API routes
- **PostgreSQL** + **Drizzle ORM**
- **Tailwind CSS v4**
- Anonymous sessions: a signed, httpOnly cookie pointing at a `sessions` row (no accounts yet)

## Getting started

Requirements: Node.js 20.9+ (22 LTS recommended), plus Postgres (Docker, or a hosted database such as Neon or Supabase).

```bash
npm install
cp .env.example .env           # then fill in the values
docker compose up -d           # local Postgres (skip if using a hosted DB)
npm run db:generate            # create SQL migrations from src/db/schema.ts
npm run db:migrate             # apply them
npm run sync:igdb              # import games from IGDB
npm run dev                    # http://localhost:3000
```

To get IGDB credentials, register an application in the [Twitch developer console](https://dev.twitch.tv/console/apps) and put its client ID and secret in `.env`.

## How it works

| Path | Purpose |
|---|---|
| `src/db/schema.ts` | Tables: `games`, `daily_puzzles`, `sessions`, `guesses` |
| `scripts/sync-igdb.ts` | Pages through IGDB and upserts games. Re-run it to refresh the data. |
| `src/lib/daily.ts` | Picks and stores the day's answer the first time it is requested |
| `src/lib/compare.ts` | Compares a guess with the answer (exact / partial / none, higher / lower) |
| `src/lib/session.ts` | Anonymous session cookie |
| `GET /api/games/search?q=` | Autocomplete |
| `POST /api/guess` | Submit a guess. Comparison happens on the server, so the answer is never sent to the client. |
| `GET /api/state` | The current session's guesses for today |

Popularity thresholds in `.env` control which games can be searched (`IGDB_MIN_RATING_COUNT`) and which can be the daily answer (`DAILY_MIN_RATING_COUNT`).
