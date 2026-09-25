import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/AppHeader";
import { AutoRefresh } from "@/components/AutoRefresh";
import { getCurrentUser, homePathFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Nalog na čekanju" };

export default async function PendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/odjava");
  if (user.status === "APPROVED" && user.role) redirect(homePathFor(user));

  const rejected = user.status === "REJECTED";
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        {!rejected && <AutoRefresh seconds={15} />}
        <div className="card">
          <h1 className="mb-2 text-xl font-bold">
            {rejected ? "Nalog nije odobren" : "Vaš nalog čeka odobrenje"}
          </h1>
          <p className="mb-3 text-sm text-stone-600">
            {rejected
              ? "Administrator je odbio ili blokirao ovaj nalog. Ako je u pitanju greška, javite mu se."
              : "Administrator još nije odobrio nalog. Ova stranica se sama osvežava, a kada nalog bude odobren, bićete prebačeni dalje."}
          </p>
          <p className="mb-5 text-sm text-stone-500">
            Prijavljeni ste kao <span className="font-medium text-stone-700">{user.email}</span>
          </p>
          <div className="flex gap-2">
            <form action="/odjava" method="post">
              <button className="btn-secondary">Odjava</button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
