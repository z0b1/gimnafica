import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { daysAgo } from "@/lib/strings";
import { AddCoffeeTypeForm } from "./AddCoffeeTypeForm";
import { CoffeeTypeRow } from "./CoffeeTypeRow";

export const metadata: Metadata = { title: "Vrste kafe" };

export default async function CoffeeTypesPage() {
  const admin = await requireRole("ADMIN");
  const since = daysAgo(30);
  const [types, usage] = await Promise.all([
    db.coffeeType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.orderItem.groupBy({
      by: ["coffeeTypeId"],
      where: { order: { status: "DONE", round: { closedAt: { gte: since } } } },
      _sum: { quantity: true },
    }),
  ]);
  const used = new Map(usage.map((u) => [u.coffeeTypeId, u._sum.quantity ?? 0]));

  return (
    <>
      <AppHeader user={admin} />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">Vrste kafe</h1>
          <p className="muted mt-1">
            Redosled je isti kod profesora i u kuhinji. Skrivene vrste se ne mogu poručiti, ali ostaju u istoriji.
          </p>
        </div>

        <section className="card p-0">
          {types.length === 0 ? (
            <p className="px-5 py-6 text-sm text-stone-500">Još nema nijedne vrste.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {types.map((t, i) => (
                <CoffeeTypeRow
                  key={t.id}
                  type={{ id: t.id, name: t.name, active: t.active }}
                  ordered30={used.get(t.id) ?? 0}
                  first={i === 0}
                  last={i === types.length - 1}
                />
              ))}
            </ul>
          )}
          <div className="border-t border-stone-100 px-5 py-4">
            <AddCoffeeTypeForm />
          </div>
        </section>
      </main>
    </>
  );
}
