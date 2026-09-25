import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import type { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS, formatDateTime } from "@/lib/strings";
import { blockUser, moveCoffeeType, setUserRole, toggleCoffeeType } from "./actions";
import { AddCoffeeTypeForm } from "./AddCoffeeTypeForm";

export const metadata: Metadata = { title: "Administracija" };

const ROLES = Object.keys(ROLE_LABELS) as Role[];

function RoleSelect({ defaultValue }: { defaultValue: Role }) {
  return (
    <select name="role" defaultValue={defaultValue} aria-label="Uloga"
      className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm">
      {ROLES.map((r) => (
        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
      ))}
    </select>
  );
}

export default async function AdminPage() {
  const admin = await requireRole("ADMIN");
  const [pending, users, coffeeTypes, rounds] = await Promise.all([
    db.user.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    db.user.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    db.coffeeType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.round.findMany({
      where: { closedAt: { not: null } },
      orderBy: { closedAt: "desc" },
      take: 20,
      include: {
        closedBy: { select: { name: true } },
        orders: {
          where: { status: "DONE" },
          include: { items: { include: { coffeeType: { select: { name: true } } } } },
        },
      },
    }),
  ]);

  const history = rounds.map((round) => {
    const totals = new Map<string, number>();
    for (const order of round.orders) {
      for (const item of order.items) {
        totals.set(item.coffeeType.name, (totals.get(item.coffeeType.name) ?? 0) + item.quantity);
      }
    }
    return {
      id: round.id,
      closedAt: round.closedAt!,
      closedBy: round.closedBy?.name,
      orderCount: round.orders.length,
      total: [...totals.values()].reduce((a, b) => a + b, 0),
      totals: [...totals.entries()],
    };
  });

  return (
    <>
      <AppHeader user={admin} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Administracija</h1>
          <Link href="/kuhinja" className="btn-secondary">Otvori ekran kuhinje →</Link>
        </div>

        <section className="card">
          <h2 className="mb-3 font-semibold">
            Zahtevi za nalog{" "}
            {pending.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-700 px-2 py-0.5 text-xs text-white">
                {pending.length}
              </span>
            )}
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-stone-500">Nema novih zahteva.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {pending.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-semibold">{u.name}</div>
                    <div className="text-sm text-stone-500">
                      {u.email} · traži ulogu: {ROLE_LABELS[u.requestedRole]} · {formatDateTime(u.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={setUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <RoleSelect defaultValue={u.requestedRole} />
                      <button className="btn-primary">Odobri</button>
                    </form>
                    <form action={blockUser}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button className="btn-danger">Odbij</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="card">
            <h2 className="mb-3 font-semibold">Korisnici</h2>
            <ul className="divide-y divide-stone-100">
              {users.map((u) => {
                const self = u.id === admin.id;
                const blocked = u.status === "REJECTED";
                return (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className={blocked ? "opacity-60" : ""}>
                      <div className="font-semibold">
                        {u.name} {self && <span className="text-xs font-normal text-stone-500">(vi)</span>}
                      </div>
                      <div className="text-sm text-stone-500">
                        {u.email}
                        {blocked && <span className="ml-1 font-semibold text-red-700">· blokiran</span>}
                      </div>
                    </div>
                    {!self && (
                      <div className="flex items-center gap-2">
                        <form action={setUserRole} className="flex items-center gap-2">
                          <input type="hidden" name="userId" value={u.id} />
                          <RoleSelect defaultValue={u.role ?? u.requestedRole} />
                          <button className="btn-secondary">{blocked ? "Vrati" : "Sačuvaj"}</button>
                        </form>
                        {!blocked && (
                          <form action={blockUser}>
                            <input type="hidden" name="userId" value={u.id} />
                            <button className="btn-danger">Blokiraj</button>
                          </form>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">Vrste kafe</h2>
            <ul className="mb-4 divide-y divide-stone-100">
              {coffeeTypes.map((t, i) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                  <span className={t.active ? "" : "text-stone-400 line-through"}>{t.name}</span>
                  <div className="flex items-center gap-1">
                    {(["up", "down"] as const).map((direction) => (
                      <form key={direction} action={moveCoffeeType}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="direction" value={direction} />
                        <button
                          disabled={direction === "up" ? i === 0 : i === coffeeTypes.length - 1}
                          aria-label={direction === "up" ? `Pomeri gore: ${t.name}` : `Pomeri dole: ${t.name}`}
                          className="btn-secondary h-9 w-9 p-0"
                        >
                          {direction === "up" ? "↑" : "↓"}
                        </button>
                      </form>
                    ))}
                    <form action={toggleCoffeeType}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="btn-secondary h-9 w-24 px-2 py-0">
                        {t.active ? "Sakrij" : "Prikaži"}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
            <AddCoffeeTypeForm />
          </section>
        </div>

        <section className="card">
          <h2 className="mb-3 font-semibold">Istorija rundi</h2>
          {history.length === 0 ? (
            <p className="text-sm text-stone-500">Još nijedna runda nije završena.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-stone-500">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Završena</th>
                    <th className="py-2 pr-4 font-medium">Zatvorio/la</th>
                    <th className="py-2 pr-4 font-medium">Porudžbine</th>
                    <th className="py-2 pr-4 font-medium">Kafe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {history.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{formatDateTime(r.closedAt)}</td>
                      <td className="py-2 pr-4">{r.closedBy ?? "—"}</td>
                      <td className="py-2 pr-4 tabular-nums">{r.orderCount}</td>
                      <td className="py-2 pr-4">
                        <span className="font-semibold tabular-nums">{r.total}</span>
                        {r.totals.length > 0 && (
                          <span className="text-stone-500">
                            {" "}({r.totals.map(([name, n]) => `${n}× ${name}`).join(", ")})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
