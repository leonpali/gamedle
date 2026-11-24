import type { GuessFeedback, Match, NumberFeedback, SetFeedback } from "@/lib/compare";
import { coverUrl } from "@/lib/images";

const MATCH_STYLES: Record<Match, string> = {
  exact: "bg-emerald-600",
  partial: "bg-amber-500 text-zinc-950",
  none: "bg-zinc-800",
};

const COLUMNS = ["Game", "Year", "Genres", "Platforms", "Modes", "Perspective", "Developer", "Max players"];

function Cell({ match, children }: { match: Match; children: React.ReactNode }) {
  return <td className={`rounded-md p-2 text-center text-sm ${MATCH_STYLES[match]}`}>{children}</td>;
}

function SetCell({ feedback }: { feedback: SetFeedback }) {
  return <Cell match={feedback.match}>{feedback.value.length ? feedback.value.join(", ") : "—"}</Cell>;
}

function NumberCell({ feedback }: { feedback: NumberFeedback }) {
  const arrow = feedback.direction === "higher" ? " ↑" : feedback.direction === "lower" ? " ↓" : "";
  return (
    <Cell match={feedback.match}>
      {feedback.value ?? "?"}
      {arrow}
    </Cell>
  );
}

export function GuessGrid({ guesses }: { guesses: GuessFeedback[] }) {
  if (!guesses.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] border-separate border-spacing-1">
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c} className="px-2 text-xs font-medium uppercase text-zinc-400">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {guesses.map((g) => (
            <tr key={g.game.id}>
              <Cell match={g.correct ? "exact" : "none"}>
                <div className="flex items-center gap-2 text-left">
                  {g.game.coverImageId && (
                    <img src={coverUrl(g.game.coverImageId)} alt="" className="h-12 w-9 rounded object-cover" />
                  )}
                  <span className="font-medium">{g.game.name}</span>
                </div>
              </Cell>
              <NumberCell feedback={g.releaseYear} />
              <SetCell feedback={g.genres} />
              <SetCell feedback={g.platforms} />
              <SetCell feedback={g.gameModes} />
              <SetCell feedback={g.perspectives} />
              <SetCell feedback={g.developers} />
              <NumberCell feedback={g.maxPlayers} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
