"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/FormError";
import { MAX_QUANTITY } from "@/lib/validation";
import { submitOrder } from "./actions";

type Props = {
  coffeeTypes: { id: string; name: string }[];
  initial: Record<string, number>;
  isEdit: boolean;
};

export function OrderForm({ coffeeTypes, initial, isEdit }: Props) {
  const [state, action, pending] = useActionState(submitOrder, undefined);
  const [qty, setQty] = useState<Record<string, number>>(initial);
  const total = coffeeTypes.reduce((sum, t) => sum + (qty[t.id] ?? 0), 0);
  const unchanged =
    isEdit && coffeeTypes.every((t) => (qty[t.id] ?? 0) === (initial[t.id] ?? 0));

  const change = (id: string, delta: number) =>
    setQty((q) => ({
      ...q,
      [id]: Math.min(MAX_QUANTITY, Math.max(0, (q[id] ?? 0) + delta)),
    }));

  return (
    <form action={action} className="space-y-4">
      <ul className="divide-y divide-stone-100">
        {coffeeTypes.map((t) => {
          const n = qty[t.id] ?? 0;
          return (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className={n > 0 ? "font-semibold" : ""}>{t.name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => change(t.id, -1)}
                  disabled={n === 0}
                  aria-label={`Manje: ${t.name}`}
                  className="btn-secondary h-10 w-10 p-0 text-lg"
                >
                  −
                </button>
                <span className="w-6 text-center text-lg font-bold tabular-nums">{n}</span>
                <button
                  type="button"
                  onClick={() => change(t.id, 1)}
                  disabled={n >= MAX_QUANTITY}
                  aria-label={`Više: ${t.name}`}
                  className="btn-secondary h-10 w-10 p-0 text-lg"
                >
                  +
                </button>
                <input type="hidden" name={`qty:${t.id}`} value={n} />
              </div>
            </li>
          );
        })}
      </ul>

      <FormError message={state?.error} />
      {state?.ok && unchanged && (
        <p role="status" className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.ok}
        </p>
      )}

      <button
        disabled={pending || total === 0 || unchanged}
        className="btn-primary w-full py-3 text-base"
      >
        {pending
          ? "Slanje…"
          : total === 0
            ? "Izaberite kafu"
            : unchanged
              ? "Sačuvano"
              : `${isEdit ? "Sačuvaj izmene" : "Naruči"} (${total})`}
      </button>
    </form>
  );
}
