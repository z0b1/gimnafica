"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { homePathFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { signInSchema, signUpSchema } from "@/lib/validation";

export type AuthFormState = { error?: string; values?: Record<string, string> } | undefined;

// Compared against when the email doesn't exist, so response time doesn't
// reveal which emails have accounts.
const DUMMY_HASH = "$2b$10$JvsuMkPU.ql0TbdeyRkMKu3oiX.ashGvsMX9HvktqskybMzSKjiPi";

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "local";
}

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Neispravni podaci.";
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = { email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") };
  const values = { email: raw.email };
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) return { error: firstError(parsed.error), values };

  const { email, password } = parsed.data;
  if (!rateLimit(`login:${await clientIp()}:${email}`, 10, 15 * 60_000)) {
    return { error: "Previše pokušaja. Sačekajte nekoliko minuta.", values };
  }

  const user = await db.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Pogrešan e-mail ili lozinka.", values };

  await createSession(user.id);
  redirect(homePathFor(user));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    requestedRole: String(formData.get("requestedRole") ?? ""),
  };
  const values = { name: raw.name, email: raw.email, requestedRole: raw.requestedRole };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { error: firstError(parsed.error), values };

  if (!rateLimit(`signup:${await clientIp()}`, 5, 60 * 60_000)) {
    return { error: "Previše registracija. Pokušajte kasnije.", values };
  }

  const { name, email, password, requestedRole } = parsed.data;
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return { error: "Nalog sa ovom e-mail adresom već postoji.", values };
  }

  const user = await db.user.create({
    data: { name, email, requestedRole, passwordHash: await bcrypt.hash(password, 10) },
  });
  await createSession(user.id);
  redirect("/na-cekanju");
}
