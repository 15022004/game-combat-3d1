import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-black p-8 text-center text-white">
      <h1 className="text-4xl font-bold tracking-tight">Battle Arena</h1>
      <p className="max-w-md text-zinc-400">
        Choisis ton combattant parmi 9 personnages et affronte un bot dans l&apos;arène 3D — 5 niveaux de
        difficulté, de Très facile à Légende.
      </p>
      <Link href="/battle" className="rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-zinc-200">
        Entrer dans l&apos;arène
      </Link>
    </main>
  );
}
