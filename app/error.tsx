"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">Nešto nije u redu</h1>
        <p className="text-sm text-stone-600">
          Server trenutno ne odgovara kako treba. Pokušajte ponovo za nekoliko sekundi.
        </p>
        <div className="flex gap-2">
          <button onClick={reset} className="btn-primary">Pokušaj ponovo</button>
          <Link href="/" className="btn-secondary">Na početnu</Link>
        </div>
      </div>
    </main>
  );
}
