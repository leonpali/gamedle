import type { Game } from "@/db/schema";

/** exact = green, partial = yellow, none = grey */
export type Match = "exact" | "partial" | "none";

export interface SetFeedback {
  value: string[];
  match: Match;
}

export interface NumberFeedback {
  value: number | null;
  match: Match;
  /** Whether the answer is higher or lower than the guess; null if equal or unknown. */
  direction: "higher" | "lower" | null;
}

export interface GuessFeedback {
  game: { id: number; name: string; coverImageId: string | null };
  correct: boolean;
  releaseYear: NumberFeedback;
  maxPlayers: NumberFeedback;
  genres: SetFeedback;
  platforms: SetFeedback;
  gameModes: SetFeedback;
  perspectives: SetFeedback;
  developers: SetFeedback;
}

function compareSets(guess: string[], answer: string[]): SetFeedback {
  const answerSet = new Set(answer);
  const guessSet = new Set(guess);
  const overlap = [...guessSet].filter((v) => answerSet.has(v)).length;

  let match: Match = "none";
  if (overlap === answerSet.size && overlap === guessSet.size) match = "exact";
  else if (overlap > 0) match = "partial";

  return { value: guess, match };
}

function compareNumbers(guess: number | null, answer: number | null): NumberFeedback {
  if (guess === null || answer === null) return { value: guess, match: "none", direction: null };
  if (guess === answer) return { value: guess, match: "exact", direction: null };
  return { value: guess, match: "none", direction: answer > guess ? "higher" : "lower" };
}

export function compareGames(guess: Game, answer: Game): GuessFeedback {
  return {
    game: { id: guess.id, name: guess.name, coverImageId: guess.coverImageId },
    correct: guess.id === answer.id,
    releaseYear: compareNumbers(guess.releaseYear, answer.releaseYear),
    maxPlayers: compareNumbers(guess.maxPlayers, answer.maxPlayers),
    genres: compareSets(guess.genres, answer.genres),
    platforms: compareSets(guess.platforms, answer.platforms),
    gameModes: compareSets(guess.gameModes, answer.gameModes),
    perspectives: compareSets(guess.perspectives, answer.perspectives),
    developers: compareSets(guess.developers, answer.developers),
  };
}
