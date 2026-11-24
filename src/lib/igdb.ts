import { requireEnv } from "./env";

// IGDB client. Server/script use only: it needs the Twitch client secret.
// Docs: https://api-docs.igdb.com/

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const API_URL = "https://api.igdb.com/v4";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value;

  const params = new URLSearchParams({
    client_id: requireEnv("TWITCH_CLIENT_ID"),
    client_secret: requireEnv("TWITCH_CLIENT_SECRET"),
    grant_type: "client_credentials",
  });
  const res = await fetch(`${TOKEN_URL}?${params}`, { method: "POST" });
  if (!res.ok) throw new Error(`Twitch token request failed: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs an Apicalypse query against an IGDB endpoint, e.g.
 * igdbQuery("games", "fields name; where id = 1942;").
 * Retries on 429 (IGDB allows 4 requests/second).
 */
export async function igdbQuery<T>(endpoint: string, query: string, retries = 3): Promise<T[]> {
  const res = await fetch(`${API_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": requireEnv("TWITCH_CLIENT_ID"),
      Authorization: `Bearer ${await getAccessToken()}`,
      Accept: "application/json",
    },
    body: query,
  });

  if (res.status === 429 && retries > 0) {
    await sleep(1000);
    return igdbQuery<T>(endpoint, query, retries - 1);
  }
  if (!res.ok) throw new Error(`IGDB ${endpoint} query failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T[];
}

/** Shape of the expanded fields requested by the sync script. */
export interface IgdbGame {
  id: number;
  name: string;
  slug: string;
  first_release_date?: number; // unix seconds
  total_rating_count?: number;
  cover?: { image_id: string };
  genres?: { name: string }[];
  platforms?: { name: string; abbreviation?: string }[];
  game_modes?: { name: string }[];
  player_perspectives?: { name: string }[];
  involved_companies?: { developer: boolean; company: { name: string } }[];
  multiplayer_modes?: {
    onlinemax?: number;
    offlinemax?: number;
    onlinecoopmax?: number;
    offlinecoopmax?: number;
  }[];
}
