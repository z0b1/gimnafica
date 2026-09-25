"use client";

import { useActionState } from "react";
import { FormError } from "@/components/FormError";
import { signUp } from "../actions";

const ROLE_OPTIONS = [
  { value: "PROFESOR", label: "Profesor", hint: "Poručujem kafu" },
  { value: "KUHINJA", label: "Kuhinja", hint: "Pripremam kafu" },
];

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, undefined);
  const role = state?.values?.requestedRole ?? "PROFESOR";
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className="label">Ime i prezime</label>
        <input id="name" name="name" autoComplete="name" required
          defaultValue={state?.values?.name} className="input" />
      </div>
      <div>
        <label htmlFor="email" className="label">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required
          defaultValue={state?.values?.email} className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">Lozinka</label>
        <input id="password" name="password" type="password" autoComplete="new-password"
          required minLength={8} className="input" />
        <p className="mt-1 text-xs text-stone-500">Najmanje 8 karaktera.</p>
      </div>
      <fieldset>
        <legend className="label">Uloga</legend>
        <div className="grid grid-cols-2 gap-2">
          {ROLE_OPTIONS.map((o) => (
            <label key={o.value}
              className="flex cursor-pointer flex-col rounded-xl border border-stone-300 p-3 has-checked:border-amber-700 has-checked:bg-amber-50">
              <span className="flex items-center gap-2 font-semibold">
                <input type="radio" name="requestedRole" value={o.value}
                  defaultChecked={role === o.value} className="accent-amber-800" />
                {o.label}
              </span>
              <span className="mt-0.5 text-xs text-stone-500">{o.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <FormError message={state?.error} />
      <button disabled={pending} className="btn-primary w-full py-3">
        {pending ? "Slanje…" : "Registruj se"}
      </button>
    </form>
  );
}
