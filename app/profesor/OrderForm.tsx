"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/FormError";
import { MAX_QUANTITY } from "@/lib/validation";
import { submitOrder } from "./actions";

type Props = {
  coffeeTypes: { id: string; name: string }[];
  initial: Record<string, number>;
  isEdit: boolean;
  /** Professor's last completed order, offered as a one-tap repeat. */
  lastItems: { coffeeTypeId: string; quantity: number; name: string }[];
};

export function OrderForm({ coffeeTypes, initial, isEdit, lastItems }: Props) {
  const [state, action, pending] = useActionState(submitOrder, undefined);
  const [qty, setQty] = useState<Record<string, number>>(initial);
  const total = coffeeTypes.reduce((sum, t) => sum + (qty[t.id] ?? 0), 0);
  const unchanged = coffeeTypes.every((t) => (qty[t.id] ?? 0) === (initial[t.id] ?? 0));
  const saved = isEdit && unchanged;

  const change = (id: string, delta: number) =>
    setQty((q) => ({
      ...q,
      [id]: Math.min(MAX_QUANTITY, Math.max(0, (q[id] ?? 0) + delta)),
    }));

  const repeatLast = () =>
    setQty(Object.fromEntries(lastItems.map((i) => [i.coffeeTypeId, i.quantity])));

  return (
    <form action={action}>
      {lastItems.length > 0 && total === 0 && (
        <button
          type="button"
          onClick={repeatLast}
          className="mb-3 flex w-full items-center justify-between gap-3 rounded-lg border border-dashed border-stone-300 px-3 py-2.5 text-left text-sm hover:border-amber-700 hover:bg-amber-50"
        >
          <span>
            <span className="block font-semibold">Isto kao prošli put</span>
            <span className="text-stone-500">
              {lastItems.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
            </span>
          </span>
          <span className="shrink-0 font-semibold text-amber-800">Popuni</span>
        </button>
      )}

      <ul className="divide-y divide-stone-100">
        {coffeeTypes.map((t) => {
          const n = qty[t.id] ?? 0;
          return (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2">
              <span className={n > 0 ? "font-semibold" : "text-stone-700"}>{t.name}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => change(t.id, -1)}
                  disabled={n === 0}
                  aria-label={`Manje: ${t.name}`}
                  className="btn-secondary size-11 p-0 text-xl"
                >
                  −
                </button>
                <output
                  aria-label={`${t.name}: količina`}
                  className={`w-9 text-center text-lg font-bold tabular-nums ${n === 0 ? "text-stone-300" : ""}`}
                >
                  {n}
                </output>
                <button
                  type="button"
                  onClick={() => change(t.id, 1)}
                  disabled={n >= MAX_QUANTITY}
                  aria-label={`Više: ${t.name}`}
                  className="btn-secondary size-11 p-0 text-xl"
                >
                  +
                </button>
                <input type="hidden" name={`qty:${t.id}`} value={n} />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Stays visible at the bottom of the screen on phones. */}
      <div className="sticky bottom-0 -mx-5 -mb-5 mt-3 space-y-3 rounded-b-xl border-t border-stone-200 bg-white/95 p-5 backdrop-blur">
        <FormError message={state?.error} />
        <div className="flex items-center gap-3">
          <div className="min-w-16">
            <div className="text-xs text-stone-500">Ukupno</div>
            <div className="text-xl font-bold tabular-nums">{total}</div>
          </div>
          {!unchanged && total > 0 && (
            <button type="button" onClick={() => setQty(initial)} className="btn-ghost">
              Poništi
            </button>
          )}
          <button
            disabled={pending || total === 0 || unchanged}
            className={`ml-auto min-w-40 py-3 text-base ${
              total === 0 || saved
                ? "btn border border-stone-200 bg-stone-50 text-stone-500 disabled:opacity-100"
                : "btn-primary"
            }`}
          >
            {pending
              ? "Slanje…"
              : saved
                ? "Sačuvano"
                : total === 0
                  ? "Izaberite kafu"
                  : isEdit
                    ? "Sačuvaj izmene"
                    : "Naruči"}
          </button>
        </div>
      </div>
    </form>
  );
}
