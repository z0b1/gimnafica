import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import { APP_NAME, ROLE_LABELS } from "@/lib/strings";

export function Logo() {
  return (
    <span className="flex items-center gap-2 text-lg font-bold tracking-tight text-amber-900">
      <span aria-hidden className="text-2xl">☕</span>
      {APP_NAME}
    </span>
  );
}

export function AppHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-right sm:block">
            <span className="block font-medium">{user.name}</span>
            {user.role && (
              <span className="block text-xs text-stone-500">{ROLE_LABELS[user.role]}</span>
            )}
          </span>
          <form action="/odjava" method="post">
            <button className="btn-secondary py-2">Odjava</button>
          </form>
        </div>
      </div>
    </header>
  );
}
