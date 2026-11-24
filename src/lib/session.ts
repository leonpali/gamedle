import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { requireEnv } from "./env";

const COOKIE_NAME = "gamedle_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 400; // browsers cap cookie lifetime at 400 days

function secret(): string {
  const value = requireEnv("SESSION_SECRET");
  if (value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return value;
}

function sign(id: string): string {
  return createHmac("sha256", secret()).update(id).digest("base64url");
}

function verify(cookieValue: string): string | null {
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = cookieValue.slice(0, dot);
  const given = Buffer.from(cookieValue.slice(dot + 1));
  const expected = Buffer.from(sign(id));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return id;
}

/** Reads the session id from the cookie without creating one. */
export async function getSessionId(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  return value ? verify(value) : null;
}

/**
 * Returns the caller's session id, creating the session (and cookie) if needed.
 * Only call from route handlers or server actions, where cookies can be set.
 */
export async function getOrCreateSessionId(): Promise<string> {
  const existing = await getSessionId();
  if (existing) {
    // Upsert so a valid cookie still works if the row is gone (e.g. a reset dev database).
    await db
      .insert(sessions)
      .values({ id: existing })
      .onConflictDoUpdate({ target: sessions.id, set: { lastSeenAt: new Date() } });
    return existing;
  }

  const [created] = await db.insert(sessions).values({}).returning({ id: sessions.id });
  (await cookies()).set(COOKIE_NAME, `${created.id}.${sign(created.id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return created.id;
}
