"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { closeRound as close } from "@/lib/rounds";

/** `roundId` is the round shown on the kitchen screen, so a stale screen can't close a newer round. */
export async function closeRound(roundId: string) {
  const user = await requireRole("KUHINJA", "ADMIN");
  const closed = await close(roundId, user.id);
  revalidatePath("/kuhinja");
  return { closed };
}
