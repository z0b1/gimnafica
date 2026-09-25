import type { Metadata } from "next";
import { PRIVATE_PAGE } from "@/lib/site";
import { AppHeader } from "@/components/AppHeader";
import { AutoRefresh } from "@/components/AutoRefresh";
import { SubmitButton } from "@/components/SubmitButton";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLastCompletedItems, getProfessorOrder } from "@/lib/orders";
import { ORDER_STATUS_LABELS, formatTime } from "@/lib/strings";
import { MAX_QUANTITY } from "@/lib/validation";
import { cancelOrder } from "./actions";
import { OrderForm } from "./OrderForm";

export const metadata: Metadata = { title: "Kafa", robots: PRIVATE_PAGE };

const STATUS_STYLES = {
  ACTIVE: "bg-amber-100 text-amber-900",
  DONE: "bg-green-100 text-green-900",
  CANCELLED: "bg-stone-200 text-stone-700",
} as const;

export default async function ProfessorPage() {
  const user = await requireRole("PROFESOR");
  const [{ order, inOpenRound }, coffeeTypes, lastItems] = await Promise.all([
    getProfessorOrder(user.id),
    db.coffeeType.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    getLastCompletedItems(user.id),
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
        <h1 className="sr-only">Kafa za pauzu</h1>
        {order && (
          <section className="card" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="section-title">Vaša porudžbina</h2>
                <p className="muted mt-0.5">
                  {order.status === "DONE"
                    ? "Kuhinja je završila prethodnu rundu. Možete poručiti za sledeću pauzu."
                    : order.status === "CANCELLED"
                      ? "Otkazali ste porudžbinu."
                      : `Kuhinja je vidi od ${formatTime(order.createdAt)}. Možete je menjati dok se runda ne završi.`}
                </p>
              </div>
              <span className={`badge shrink-0 ${STATUS_STYLES[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
            <ul className={`mt-3 space-y-1 ${order.status === "CANCELLED" ? "text-stone-400 line-through" : ""}`}>
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span>{i.coffeeType.name}</span>
                  <span className="font-semibold tabular-nums">{i.quantity}</span>
                </li>
              ))}
            </ul>
            {active && (
              <form action={cancelOrder} className="mt-4 border-t border-stone-100 pt-4">
                <SubmitButton className="btn-danger" pendingText="Otkazivanje…">
                  Otkaži porudžbinu
                </SubmitButton>
              </form>
            )}
          </section>
        )}

        <section className="card">
          <h2 className="section-title mb-1">{active ? "Izmena porudžbine" : "Nova porudžbina"}</h2>
          <p className="muted mb-3">Najviše {MAX_QUANTITY} komada po vrsti.</p>
          {coffeeTypes.length === 0 ? (
            <p className="text-sm text-stone-600">Trenutno nema dostupnih vrsta kafe.</p>
          ) : (
            // Remount (reset steppers) when switching between new and edit.
            <OrderForm
              key={active ? "edit" : "new"}
              coffeeTypes={coffeeTypes}
              initial={initial}
              isEdit={active}
              lastItems={active ? [] : lastItems}
            />
          )}
        </section>
      </main>
    </>
  );
}
