import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { APP_NAME, ROLE_LABELS } from "@/lib/strings";
import { NavLinks, type NavItem } from "./NavLinks";

export function Logo() {
  return <span className="text-lg font-bold tracking-tight text-amber-900">{APP_NAME}</span>;
}

async function navFor(user: CurrentUser): Promise<NavItem[]> {
  switch (user.role) {
    case "ADMIN": {
      const pending = await db.user.count({ where: { status: "PENDING" } });
      return [
        { href: "/admin", label: "Korisnici", count: pending },
        { href: "/admin/kafe", label: "Vrste kafe" },
        { href: "/kuhinja", label: "Kuhinja" },
        { href: "/istorija", label: "Istorija" },
      ];
    }
    case "KUHINJA":
      return [
        { href: "/kuhinja", label: "Porudžbine" },
        { href: "/istorija", label: "Istorija" },
      ];
    default:
      return [];
  }
}

export async function AppHeader({ user }: { user: CurrentUser }) {
  const nav = await navFor(user);
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="rounded-md">
          <Logo />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-right leading-tight sm:block">
            <span className="block font-medium">{user.name}</span>
            {user.role && <span className="block text-xs text-stone-500">{ROLE_LABELS[user.role]}</span>}
          </span>
          <form action="/odjava" method="post">
            <button className="btn-secondary px-3 py-2">Odjava</button>
          </form>
        </div>
      </div>
      {nav.length > 0 && (
        <div className="mx-auto max-w-5xl px-4">
          <NavLinks items={nav} />
        </div>
      )}
    </header>
  );
}
