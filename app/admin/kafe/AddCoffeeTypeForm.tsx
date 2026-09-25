"use client";

import { useActionState } from "react";
import { FormError } from "@/components/FormError";
import { addCoffeeType } from "../actions";

export function AddCoffeeTypeForm() {
  const [state, action, pending] = useActionState(addCoffeeType, undefined);
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="new-coffee" className="label">Nova vrsta</label>
      <div className="flex gap-2">
        <input
          id="new-coffee"
          name="name"
          required
          placeholder="npr. Makijato"
          defaultValue={state?.name ?? ""}
          className="input"
        />
        <button disabled={pending} className="btn-primary shrink-0">
          {pending ? "Dodavanje…" : "Dodaj"}
        </button>
      </div>
      <FormError message={state?.error} />
    </form>
  );
}
