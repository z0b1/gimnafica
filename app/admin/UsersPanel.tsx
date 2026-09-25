"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { Role } from "@/generated/prisma/enums";
import { ORDERS, ROLE_LABELS, formatDate, plural } from "@/lib/strings";
import { blockUser, setUserRole } from "./actions";
import { RoleSelect } from "./RoleSelect";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  blocked: boolean;
  createdAt: string;
  orders30: number;
};

type Filter = Role | "BLOCKED" | "ALL";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Svi" },
  { value: "PROFESOR", label: "Profesori" },
  { value: "KUHINJA", label: "Kuhinja" },
  { value: "ADMIN", label: "Admini" },
  { value: "BLOCKED", label: "Blokirani" },
];

const ROLE_BADGE: Record<Role, string> = {
  PROFESOR: "bg-stone-100 text-stone-700",
  KUHINJA: "bg-amber-100 text-amber-900",
  ADMIN: "bg-stone-800 text-white",
};

function matches(user: User, filter: Filter) {
  if (filter === "ALL") return true;
  if (filter === "BLOCKED") return user.blocked;
  return !user.blocked && user.role === filter;
}

export function UsersPanel({ users, selfId }: { users: User[]; selfId: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  const q = query.trim().toLowerCase();
  const visible = users.filter(
    (u) => matches(u, filter) && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
  );

  return (
    <section className="card p-0">
      <div className="space-y-3 border-b border-stone-100 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">
            Nalozi <span className="font-normal text-stone-500">({users.length})</span>
          </h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pretraga po imenu ili e-mailu"
            aria-label="Pretraga korisnika"
            className="input w-full py-2 text-sm sm:w-72"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter po ulozi">
          {FILTERS.map((f) => {
            const count = users.filter((u) => matches(u, f.value)).length;
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                aria-pressed={active}
                className={`rounded-md border px-2.5 py-1 text-sm ${
                  active
                    ? "border-stone-800 bg-stone-800 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                {f.label} <span className={active ? "text-stone-300" : "text-stone-400"}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="px-5 py-6 text-sm text-stone-500">Nema korisnika za ovaj filter.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {visible.map((u) => (
            <UserRow key={u.id} user={u} self={u.id === selfId} />
          ))}
        </ul>
      )}
    </section>
  );
}

function UserRow({ user: u, self }: { user: User; self: boolean }) {
  const [role, setRole] = useState(u.role);
  const changed = role !== u.role;
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5">
      <div className={`min-w-0 flex-1 basis-60 ${u.blocked ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{u.name}</span>
          {u.blocked ? (
            <span className="badge bg-red-100 text-red-800">Blokiran</span>
          ) : (
            <span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABELS[u.role]}</span>
          )}
          {self && <span className="text-xs text-stone-500">(vi)</span>}
        </div>
        <div className="truncate text-sm text-stone-500">{u.email}</div>
        <div className="mt-0.5 text-xs text-stone-500">
          Od {formatDate(u.createdAt)}
          {u.role === "PROFESOR" && ` · ${u.orders30} ${plural(u.orders30, ORDERS)} za 30 dana`}
        </div>
      </div>
      {!self && (
        <div className="flex items-center gap-1">
          <form action={setUserRole} className="flex items-center gap-2">
            <input type="hidden" name="userId" value={u.id} />
            {/* key resets the select to the saved role after a save/revalidate */}
            <RoleSelect key={u.role} defaultValue={u.role} onChange={setRole} />
            {(changed || u.blocked) && (
              <SubmitButton className={u.blocked ? "btn-secondary" : "btn-primary"} pendingText="Čuvanje…">
                {u.blocked ? "Vrati nalog" : "Sačuvaj"}
              </SubmitButton>
            )}
          </form>
          {!u.blocked && !changed && (
            <form action={blockUser}>
              <input type="hidden" name="userId" value={u.id} />
              <SubmitButton className="btn-ghost text-red-700 hover:bg-red-50" pendingText="Blokiranje…">
                Blokiraj
              </SubmitButton>
            </form>
          )}
        </div>
      )}
    </li>
  );
}
