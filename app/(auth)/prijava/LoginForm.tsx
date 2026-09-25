"use client";

import { useActionState } from "react";
import { FormError } from "@/components/FormError";
import { signIn } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required
          defaultValue={state?.values?.email} className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">Lozinka</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required
          className="input" />
      </div>
      <FormError message={state?.error} />
      <button disabled={pending} className="btn-primary w-full py-3">
        {pending ? "Prijavljivanje…" : "Prijavi se"}
      </button>
    </form>
  );
}
