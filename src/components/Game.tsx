"use client";

import { useCallback, useEffect, useState } from "react";
import type { GuessFeedback } from "@/lib/compare";
import { GuessGrid } from "./GuessGrid";
import { GuessInput, type SearchResult } from "./GuessInput";

interface GameState {
  date: string;
  guesses: GuessFeedback[]; // oldest first
  solved: boolean;
}

export function Game() {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadState = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load today's puzzle.");
      setState(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load today's puzzle.");
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  async function submitGuess(game: SearchResult) {
    if (!state || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Guess failed.");

      if (data.date !== state.date) {
        // The day rolled over since the page loaded; start the new puzzle fresh.
        await loadState();
        return;
      }
      const feedback = data.feedback as GuessFeedback;
      setState({ ...state, guesses: [...state.guesses, feedback], solved: feedback.correct });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Guess failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!state) {
    return <p className="text-center text-zinc-400">{error ?? "Loading…"}</p>;
  }

  return (
    <div className="space-y-6">
      {state.solved ? (
        <p className="rounded-lg bg-emerald-700/30 p-4 text-center text-lg">
          You got it in {state.guesses.length} {state.guesses.length === 1 ? "guess" : "guesses"}! Come
          back tomorrow for a new game.
        </p>
      ) : (
        <GuessInput
          onSelect={submitGuess}
          excludeIds={new Set(state.guesses.map((g) => g.game.id))}
          disabled={submitting}
        />
      )}
      {error && <p className="text-center text-red-400">{error}</p>}
      <GuessGrid guesses={[...state.guesses].reverse()} />
    </div>
  );
}
