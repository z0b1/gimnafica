import type { Metadata } from "next";
import { PRIVATE_PAGE } from "@/lib/site";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  COFFEES,
  ORDERS,
  ROUNDS,
  dayKey,
  daysAgo,
  formatDayLabel,
  formatDuration,
  formatTime,
  plural,
} from "@/lib/strings";
import { BarList } from "./BarList";

export const metadata: Metadata = { title: "Istorija", robots: PRIVATE_PAGE };

const PAGE_SIZE = 10;
const STATS_DAYS = 30;

function sumItems(items: { quantity: number }[]) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

async function getStats() {
  const since = daysAgo(STATS_DAYS);
  const orders = await db.order.findMany({
    where: { status: "DONE", round: { closedAt: { gte: since } } },
    select: {
      roundId: true,
      userId: true,
      user: { select: { name: true } },
      items: { select: { quantity: true, coffeeType: { select: { id: true, name: true } } } },
    },
  });

  const byType = new Map<string, { label: string; value: number }>();
  const byProfessor = new Map<string, { label: string; value: number }>();
  const rounds = new Set<string>();
  let total = 0;
  for (const order of orders) {
    rounds.add(order.roundId);
    const n = sumItems(order.items);
    total += n;
    const p = byProfessor.get(order.userId) ?? { label: order.user.name, value: 0 };
    p.value += n;
    byProfessor.set(order.userId, p);
    for (const item of order.items) {
      const t = byType.get(item.coffeeType.id) ?? { label: item.coffeeType.name, value: 0 };
      t.value += item.quantity;
      byType.set(item.coffeeType.id, t);
    }
  }
  const desc = (a: { value: number }, b: { value: number }) => b.value - a.value;
  return {
    total,
    rounds: rounds.size,
    orders: orders.length,
    professors: byProfessor.size,
    byType: [...byType.values()].sort(desc),
    byProfessor: [...byProfessor.values()].sort(desc),
  };
}

async function getRounds(page: number) {
  const [count, rounds] = await Promise.all([
    db.round.count({ where: { closedAt: { not: null } } }),
    db.round.findMany({
      where: { closedAt: { not: null } },
      orderBy: { closedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        closedBy: { select: { name: true } },
        orders: {
          where: { status: { in: ["DONE", "CANCELLED"] } },
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { name: true } },
            items: {
              include: { coffeeType: { select: { name: true, sortOrder: true } } },
              orderBy: { coffeeType: { sortOrder: "asc" } },
            },
          },
        },
      },
    }),
  ]);

  const detailed = rounds.map((round) => {
    const done = round.orders.filter((o) => o.status === "DONE");
    const types = new Map<string, { name: string; sortOrder: number; quantity: number }>();
    for (const item of done.flatMap((o) => o.items)) {
      const t = types.get(item.coffeeTypeId) ?? { ...item.coffeeType, quantity: 0 };
      t.quantity += item.quantity;
      types.set(item.coffeeTypeId, t);
    }
    return {
      ...round,
      closedAt: round.closedAt!,
      total: sumItems(done.flatMap((o) => o.items)),
      doneCount: done.length,
      cancelledCount: round.orders.length - done.length,
      types: [...types.values()].sort((a, b) => a.sortOrder - b.sortOrder),
    };
  });

  // Group consecutive rounds by the day they were closed (Serbian time).
  const days: { key: string; label: string; total: number; rounds: typeof detailed }[] = [];
  for (const round of detailed) {
    const key = dayKey(round.closedAt);
    let day = days.at(-1);
    if (day?.key !== key) {
      day = { key, label: formatDayLabel(round.closedAt), total: 0, rounds: [] };
      days.push(day);
    }
    day.rounds.push(round);
    day.total += round.total;
  }

  return { days, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)), count };
}

function Stat({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="card">
      <div className="text-sm text-stone-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
      {detail && <div className="mt-0.5 truncate text-xs text-stone-500">{detail}</div>}
    </div>
  );
}

export default async function HistoryPage({ searchParams }: PageProps<"/istorija">) {
  const user = await requireRole("ADMIN", "KUHINJA");
  const raw = (await searchParams).strana;
  const requested = Math.max(1, Number.parseInt(Array.isArray(raw) ? raw[0] : (raw ?? "1"), 10) || 1);

  const [stats, { days, pages, count }] = await Promise.all([getStats(), getRounds(requested)]);
  if (requested > pages) redirect(`/istorija?strana=${pages}`);
  const page = requested;
  const topType = stats.byType[0];

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold">Istorija</h1>

        <section aria-labelledby="stats-title" className="space-y-3">
          <h2 id="stats-title" className="section-title">
            Poslednjih {STATS_DAYS} dana
          </h2>
          {stats.total === 0 ? (
            <p className="card text-sm text-stone-500">U poslednjih {STATS_DAYS} dana nije bilo završenih rundi.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Kafa ukupno" value={stats.total} detail={`${stats.orders} ${plural(stats.orders, ORDERS)}`} />
                <Stat label="Rundi" value={stats.rounds} />
                <Stat
                  label="Prosek po rundi"
                  value={(stats.total / stats.rounds).toLocaleString("sr-Latn-RS", { maximumFractionDigits: 1 })}
                />
                <Stat
                  label="Najčešće"
                  value={topType.label}
                  detail={`${topType.value} ${plural(topType.value, COFFEES)}, ${Math.round((topType.value / stats.total) * 100)}%`}
                />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="card">
                  <h3 className="mb-3 text-sm font-semibold">Po vrsti</h3>
                  <BarList rows={stats.byType} total={stats.total} showShare />
                </div>
                <div className="card">
                  <h3 className="mb-3 text-sm font-semibold">
                    Po profesoru <span className="font-normal text-stone-500">({stats.professors})</span>
                  </h3>
                  <BarList rows={stats.byProfessor} total={stats.total} limit={8} />
                </div>
              </div>
            </>
          )}
        </section>

        <section aria-labelledby="rounds-title" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="rounds-title" className="section-title">
              Runde <span className="font-normal text-stone-500">({count})</span>
            </h2>
            {pages > 1 && (
              <span className="muted">
                Strana {page} od {pages}
              </span>
            )}
          </div>

          {days.length === 0 ? (
            <p className="card text-sm text-stone-500">
              Još nijedna runda nije završena. Runda se završava na ekranu kuhinje.
            </p>
          ) : (
            days.map((day) => (
              <div key={day.key} className="space-y-2">
                <h3 className="flex items-baseline justify-between gap-3 pt-2 text-sm">
                  <span className="font-semibold">{day.label}</span>
                  <span className="text-stone-500">
                    {day.rounds.length} {plural(day.rounds.length, ROUNDS)} · {day.total} {plural(day.total, COFFEES)}
                  </span>
                </h3>
                {day.rounds.map((round) => (
                  <article key={round.id} className="card p-0">
                    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 py-4">
                      <div>
                        <div className="font-semibold tabular-nums">
                          {formatTime(round.openedAt)}–{formatTime(round.closedAt)}
                          <span className="ml-2 font-normal text-stone-500">
                            {formatDuration(round.closedAt.getTime() - round.openedAt.getTime())}
                          </span>
                        </div>
                        <div className="muted">Završio/la: {round.closedBy?.name ?? "nepoznato"}</div>
                      </div>
                      <dl className="flex gap-6 text-sm">
                        <div>
                          <dt className="text-stone-500">Kafa</dt>
                          <dd className="text-xl font-semibold">{round.total}</dd>
                        </div>
                        <div>
                          <dt className="text-stone-500">Porudžbina</dt>
                          <dd className="text-xl font-semibold">{round.doneCount}</dd>
                        </div>
                        {round.cancelledCount > 0 && (
                          <div>
                            <dt className="text-stone-500">Otkazano</dt>
                            <dd className="text-xl font-semibold text-stone-400">{round.cancelledCount}</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    {round.types.length > 0 && (
                      <ul className="flex flex-wrap gap-1.5 px-5 pb-4">
                        {round.types.map((t) => (
                          <li key={t.name} className="rounded-md bg-stone-100 px-2 py-1 text-sm">
                            {t.name} <span className="font-semibold tabular-nums">{t.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {round.orders.length > 0 && (
                      <details className="group border-t border-stone-100">
                        <summary className="flex list-none items-center justify-between px-5 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 [&::-webkit-details-marker]:hidden">
                          Ko je šta poručio
                          <svg viewBox="0 0 16 16" className="size-4 text-stone-400 transition-transform group-open:rotate-180" aria-hidden>
                            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </summary>
                        <div className="overflow-x-auto px-5 pb-4">
                          <table className="w-full text-left text-sm">
                            <thead className="text-xs text-stone-500">
                              <tr>
                                <th className="py-2 pr-4 font-medium">Profesor</th>
                                <th className="py-2 pr-4 font-medium">Poručeno</th>
                                <th className="py-2 pr-4 text-right font-medium">Kom.</th>
                                <th className="py-2 text-right font-medium">Vreme</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                              {round.orders.map((o) => {
                                const cancelled = o.status === "CANCELLED";
                                return (
                                  <tr key={o.id} className={cancelled ? "text-stone-400" : ""}>
                                    <td className="py-2 pr-4 font-medium">
                                      {o.user.name}
                                      {cancelled && <span className="badge ml-2 bg-stone-100 text-stone-500">Otkazano</span>}
                                    </td>
                                    <td className={`py-2 pr-4 ${cancelled ? "line-through" : ""}`}>
                                      {o.items.map((i) => `${i.quantity}× ${i.coffeeType.name}`).join(", ")}
                                    </td>
                                    <td className="py-2 pr-4 text-right tabular-nums">{cancelled ? "–" : sumItems(o.items)}</td>
                                    <td className="py-2 text-right whitespace-nowrap tabular-nums">
                                      {formatTime(o.createdAt)}
                                      {o.updatedAt.getTime() - o.createdAt.getTime() > 2000 && !cancelled && (
                                        <span className="block text-xs text-stone-400">izm. {formatTime(o.updatedAt)}</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}
                  </article>
                ))}
              </div>
            ))
          )}

          {pages > 1 && (
            <nav aria-label="Strane" className="flex items-center justify-between gap-3 pt-2">
              {page > 1 ? (
                <Link href={page === 2 ? "/istorija" : `/istorija?strana=${page - 1}`} className="btn-secondary">
                  Novije
                </Link>
              ) : (
                <span />
              )}
              {page < pages && (
                <Link href={`/istorija?strana=${page + 1}`} className="btn-secondary">
                  Starije
                </Link>
              )}
            </nav>
          )}
        </section>
      </main>
    </>
  );
}
