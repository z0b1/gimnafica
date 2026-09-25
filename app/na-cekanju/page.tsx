import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/AppHeader";
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
        <div className="card text-center">
          <div className="mb-3 text-4xl" aria-hidden>{rejected ? "🚫" : "⏳"}</div>
          <h1 className="mb-2 text-xl font-bold">
            {rejected ? "Nalog nije odobren" : "Vaš nalog čeka odobrenje"}
          </h1>
          <p className="mb-5 text-sm text-stone-600">
            {rejected
              ? "Administrator je odbio ili blokirao ovaj nalog. Obratite mu se ako mislite da je greška."
              : `Zdravo, ${user.name}! Administrator treba da odobri vaš nalog. Proverite ponovo malo kasnije.`}
          </p>
          <div className="flex justify-center gap-2">
            {!rejected && (
              <a href="/na-cekanju" className="btn-primary">Proveri ponovo</a>
            )}
            <form action="/odjava" method="post">
              <button className="btn-secondary">Odjava</button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
