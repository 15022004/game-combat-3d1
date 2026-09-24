import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-black p-8 text-center text-white">
      <h1 className="text-4xl font-bold tracking-tight">Battle Arena</h1>
      <p className="max-w-md text-zinc-400">Regardez KAIRO et RAZEN s&apos;affronter dans l&apos;arène 3D.</p>
      <Link href="/battle" className="rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-zinc-200">
        Lancer le combat
      </Link>
    </main>
  );
}
