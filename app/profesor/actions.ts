"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { cancelOrder as cancel, OrderError, submitOrder as submit } from "@/lib/orders";
import { orderItemsSchema } from "@/lib/validation";

export type OrderFormState = { error?: string } | undefined;

export async function submitOrder(_prev: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const user = await requireRole("PROFESOR");
  const items = [...formData.entries()]
    .filter(([key]) => key.startsWith("qty:"))
    .map(([key, value]) => ({ coffeeTypeId: key.slice(4), quantity: Number(value) }));

  const parsed = orderItemsSchema.safeParse(items);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Neispravna porudžbina." };

  try {
    await submit(user.id, parsed.data);
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    throw e;
  }
  revalidatePath("/profesor");
  return undefined;
}

export async function cancelOrder() {
  const user = await requireRole("PROFESOR");
  await cancel(user.id);
  revalidatePath("/profesor");
}
