"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { approveSchema, coffeeTypeNameSchema } from "@/lib/validation";

export type AdminFormState = { error?: string } | undefined;

const idSchema = z.string().min(1);

function done() {
  revalidatePath("/admin");
}

/** Approve a pending user, or change an existing user's role. */
export async function setUserRole(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const { userId, role } = approveSchema.parse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  // Don't let the admin lock themselves out.
  if (userId === admin.id && role !== "ADMIN") return;
  await db.user.update({ where: { id: userId }, data: { role, status: "APPROVED" } });
  done();
}

/** Reject a pending user or block an existing one. */
export async function blockUser(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const userId = idSchema.parse(formData.get("userId"));
  if (userId === admin.id) return;
  await db.user.update({ where: { id: userId }, data: { status: "REJECTED" } });
  done();
}

export async function addCoffeeType(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireRole("ADMIN");
  const parsed = coffeeTypeNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const name = parsed.data;
  const existing = await db.coffeeType.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    if (existing.active) return { error: "Ta vrsta već postoji." };
    await db.coffeeType.update({ where: { id: existing.id }, data: { active: true } });
  } else {
    const last = await db.coffeeType.aggregate({ _max: { sortOrder: true } });
    await db.coffeeType.create({ data: { name, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  }
  done();
  return undefined;
}

export async function toggleCoffeeType(formData: FormData) {
  await requireRole("ADMIN");
  const id = idSchema.parse(formData.get("id"));
  const type = await db.coffeeType.findUniqueOrThrow({ where: { id } });
  await db.coffeeType.update({ where: { id }, data: { active: !type.active } });
  done();
}

export async function moveCoffeeType(formData: FormData) {
  await requireRole("ADMIN");
  const id = idSchema.parse(formData.get("id"));
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));

  await db.$transaction(async (tx) => {
    const types = await tx.coffeeType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    const from = types.findIndex((t) => t.id === id);
    const to = direction === "up" ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= types.length) return;
    [types[from], types[to]] = [types[to], types[from]];
    // Renumber everything so ties from older data can't block a move.
    for (const [i, t] of types.entries()) {
      if (t.sortOrder !== i) {
        await tx.coffeeType.update({ where: { id: t.id }, data: { sortOrder: i } });
      }
    }
  });
  done();
}
