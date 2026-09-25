"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/FormError";
import { SubmitButton } from "@/components/SubmitButton";
import { moveCoffeeType, renameCoffeeType, toggleCoffeeType } from "../actions";

type Props = {
  type: { id: string; name: string; active: boolean };
  ordered30: number;
  first: boolean;
  last: boolean;
};

export function CoffeeTypeRow({ type, ordered30, first, last }: Props) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof renameCoffeeType>>, formData: FormData) => {
      const result = await renameCoffeeType(prev, formData);
      if (result?.ok) setEditing(false);
      return result;
    },
    undefined,
  );

  if (editing) {
    return (
      <li className="px-5 py-3">
        <form action={action} className="space-y-2">
          <input type="hidden" name="id" value={type.id} />
          <div className="flex gap-2">
            <input
              name="name"
              defaultValue={state?.name ?? type.name}
              required
              autoFocus
              aria-label={`Novi naziv za ${type.name}`}
              className="input py-2"
            />
            <button disabled={pending} className="btn-primary">
              {pending ? "Čuvanje…" : "Sačuvaj"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost">
              Odustani
            </button>
          </div>
          <FormError message={state?.error} />
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-2.5">
      <div className="min-w-0 flex-1 basis-40">
        <div className="flex items-center gap-2">
          <span className={type.active ? "font-medium" : "text-stone-400"}>{type.name}</span>
          {!type.active && <span className="badge bg-stone-100 text-stone-500">Skriveno</span>}
        </div>
        <div className="text-xs text-stone-500">
          <span className="tabular-nums">{ordered30}</span> poručeno za 30 dana
        </div>
      </div>
      <div className="-mr-2 flex shrink-0 items-center gap-1">
        <button onClick={() => setEditing(true)} className="btn-ghost px-3 py-2">
          Preimenuj
        </button>
        <form action={toggleCoffeeType}>
          <input type="hidden" name="id" value={type.id} />
          <SubmitButton className="btn-ghost w-20 px-3 py-2">
            {type.active ? "Sakrij" : "Prikaži"}
          </SubmitButton>
        </form>
        {(["up", "down"] as const).map((direction) => (
          <form key={direction} action={moveCoffeeType}>
            <input type="hidden" name="id" value={type.id} />
            <input type="hidden" name="direction" value={direction} />
            <SubmitButton
              disabled={direction === "up" ? first : last}
              aria-label={direction === "up" ? `Pomeri gore: ${type.name}` : `Pomeri dole: ${type.name}`}
              className="btn-secondary size-9 p-0"
            >
              <svg viewBox="0 0 16 16" className={`size-4 ${direction === "down" ? "rotate-180" : ""}`} aria-hidden>
                <path d="M8 3.5 3.5 8h3v4.5h3V8h3z" fill="currentColor" />
              </svg>
            </SubmitButton>
          </form>
        ))}
      </div>
    </li>
  );
}
