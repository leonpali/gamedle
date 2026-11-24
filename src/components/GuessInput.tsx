"use client";

import { useEffect, useState, type KeyboardEvent } from "react";

export interface SearchResult {
  id: number;
  name: string;
  releaseYear: number | null;
  coverImageId: string | null;
}

interface Props {
  onSelect: (game: SearchResult) => void;
  excludeIds: Set<number>;
  disabled?: boolean;
}

export function GuessInput({ onSelect, excludeIds, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/games/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : []))
        .then((rows: SearchResult[]) => {
          setResults(rows);
          setActive(0);
        })
        .catch(() => {}); // aborted or network error: keep the previous suggestions
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const visible = results.filter((r) => !excludeIds.has(r.id));

  function choose(game: SearchResult) {
    onSelect(game);
    setQuery("");
    setResults([]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!visible.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % visible.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + visible.length) % visible.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(visible[Math.min(active, visible.length - 1)]);
    } else if (e.key === "Escape") {
      setResults([]);
    }
  }

  return (
    <div className="relative mx-auto max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder="Type a game name…"
        aria-label="Guess a game"
        autoComplete="off"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-zinc-400 disabled:opacity-50"
      />
      {visible.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg">
          {visible.map((game, i) => (
            <li key={game.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(game)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full justify-between px-4 py-2 text-left ${i === active ? "bg-zinc-800" : ""}`}
              >
                <span>{game.name}</span>
                {game.releaseYear && <span className="text-zinc-500">{game.releaseYear}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
