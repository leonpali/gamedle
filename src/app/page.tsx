import { Game } from "@/components/Game";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Gamedle</h1>
        <p className="mt-1 text-zinc-400">Guess today&apos;s video game. A new one every day at midnight UTC.</p>
      </header>
      <Game />
    </main>
  );
}
