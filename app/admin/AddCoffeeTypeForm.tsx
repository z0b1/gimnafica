"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormError } from "@/components/FormError";
import { addCoffeeType } from "./actions";

export function AddCoffeeTypeForm() {
  const [state, action, pending] = useActionState(addCoffeeType, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state?.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <div className="flex gap-2">
        <input name="name" required placeholder="npr. Makijato" aria-label="Naziv nove vrste"
          className="input" />
        <button disabled={pending} className="btn-primary shrink-0">Dodaj</button>
      </div>
      <FormError message={state?.error} />
    </form>
  );
}
