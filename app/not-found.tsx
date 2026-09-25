import Link from "next/link";
import { Logo } from "@/components/AppHeader";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-4">
        <Logo />
        <h1 className="text-xl font-bold">Stranica ne postoji</h1>
        <p className="text-sm text-stone-600">Adresa je pogrešna ili je stranica uklonjena.</p>
        <Link href="/" className="btn-primary">Na početnu</Link>
      </div>
    </main>
  );
}
