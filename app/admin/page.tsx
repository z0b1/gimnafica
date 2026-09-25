import type { Metadata } from "next";
import { PRIVATE_PAGE } from "@/lib/site";
import { AppHeader } from "@/components/AppHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS, daysAgo, formatDateTime } from "@/lib/strings";
import { blockUser, setUserRole } from "./actions";
import { RoleSelect } from "./RoleSelect";
import { UsersPanel } from "./UsersPanel";

export const metadata: Metadata = { title: "Korisnici", robots: PRIVATE_PAGE };

export default async function AdminUsersPage() {
  const admin = await requireRole("ADMIN");
  const since = daysAgo(30);
  const [pending, users, orderCounts] = await Promise.all([
    db.user.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    db.user.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { name: "asc" },
    }),
    db.order.groupBy({
      by: ["userId"],
      where: { status: "DONE", round: { closedAt: { gte: since } } },
      _count: true,
    }),
  ]);
  const ordersByUser = new Map(orderCounts.map((c) => [c.userId, c._count]));

  return (
    <>
      <AppHeader user={admin} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-6">
        <h1 className="text-2xl font-bold">Korisnici</h1>

        <section className="card p-0">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="section-title">
              Zahtevi za nalog{" "}
              <span className="font-normal text-stone-500">({pending.length})</span>
            </h2>
          </div>
          {pending.length === 0 ? (
            <p className="px-5 py-6 text-sm text-stone-500">Nema zahteva koji čekaju odobrenje.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {pending.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="font-semibold">{u.name}</div>
                    <div className="truncate text-sm text-stone-500">{u.email}</div>
                    <div className="mt-1 text-xs text-stone-500">
                      Traži ulogu <span className="font-medium text-stone-700">{ROLE_LABELS[u.requestedRole]}</span>
                      {" · "}prijava {formatDateTime(u.createdAt)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={setUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <RoleSelect defaultValue={u.requestedRole} />
                      <SubmitButton className="btn-primary" pendingText="Odobravanje…">
                        Odobri
                      </SubmitButton>
                    </form>
                    <form action={blockUser}>
                      <input type="hidden" name="userId" value={u.id} />
                      <SubmitButton className="btn-danger" pendingText="Odbijanje…">
                        Odbij
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <UsersPanel
          selfId={admin.id}
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role ?? u.requestedRole,
            blocked: u.status === "REJECTED",
            createdAt: u.createdAt.toISOString(),
            orders30: ordersByUser.get(u.id) ?? 0,
          }))}
        />
      </main>
    </>
  );
}
