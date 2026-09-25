import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { AutoRefresh } from "@/components/AutoRefresh";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProfessorOrder } from "@/lib/orders";
import { ORDER_STATUS_LABELS, formatTime } from "@/lib/strings";
import { cancelOrder } from "./actions";
import { OrderForm } from "./OrderForm";

export const metadata: Metadata = { title: "Poruči kafu" };

const STATUS_STYLES = {
  ACTIVE: "bg-amber-100 text-amber-900",
  DONE: "bg-green-100 text-green-900",
  CANCELLED: "bg-stone-200 text-stone-700",
} as const;

export default async function ProfessorPage() {
  const user = await requireRole("PROFESOR");
  const [{ order, inOpenRound }, coffeeTypes] = await Promise.all([
    getProfessorOrder(user.id),
    db.coffeeType.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const active = inOpenRound && order?.status === "ACTIVE";
  const initial = Object.fromEntries(
    (active ? order.items : []).map((i) => [i.coffeeTypeId, i.quantity]),
  );

  return (
    <>
      <AppHeader user={user} />
      {/* Picks up the kitchen closing the round. */}
      <AutoRefresh seconds={15} />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-6">
        <h1 className="text-2xl font-bold">Kafa za pauzu</h1>

        {order && (
          <section className="card">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-semibold">Vaša porudžbina</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
            <ul className="text-sm text-stone-700">
              {order.items.map((i) => (
                <li key={i.id}>
                  {i.quantity}× {i.coffeeType.name}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-stone-500">
              {order.status === "DONE"
                ? "Kuhinja je pripremila ovu porudžbinu. Možete poručiti ponovo za sledeću pauzu."
                : `Poslednja izmena u ${formatTime(order.updatedAt)}`}
            </p>
            {active && (
              <form action={cancelOrder} className="mt-3">
                <button className="btn-danger">Otkaži porudžbinu</button>
              </form>
            )}
          </section>
        )}

        <section className="card">
          <h2 className="mb-3 font-semibold">
            {active ? "Izmeni porudžbinu" : "Nova porudžbina"}
          </h2>
          {coffeeTypes.length === 0 ? (
            <p className="text-sm text-stone-600">Trenutno nema dostupnih kafa.</p>
          ) : (
            // Remount (reset steppers) when switching between new and edit.
            <OrderForm
              key={active ? "edit" : "new"}
              coffeeTypes={coffeeTypes}
              initial={initial}
              isEdit={active}
            />
          )}
        </section>
      </main>
    </>
  );
}
