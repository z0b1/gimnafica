import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

type Tx = Prisma.TransactionClient;

/** Creates the open round if there isn't one. Safe to call concurrently. */
export async function ensureOpenRound() {
  // Relies on the partial unique index "Round_single_open" (see migration).
  await db.$executeRaw`
    INSERT INTO "Round" ("id", "openedAt")
    VALUES (gen_random_uuid()::text, now())
    ON CONFLICT ((true)) WHERE "closedAt" IS NULL DO NOTHING`;
  const round = await db.round.findFirst({ where: { closedAt: null } });
  if (!round) throw new Error("Nije moguće otvoriti rundu.");
  return round;
}

/**
 * Locks the open round for the rest of the transaction so it can't be closed
 * while an order is being written into it. Returns null if it was closed
 * in the meantime (caller should retry).
 */
async function lockOpenRoundShared(tx: Tx) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Round" WHERE "closedAt" IS NULL FOR SHARE`;
  return rows[0]?.id ?? null;
}

/** Runs `fn` inside a transaction holding a share lock on the open round. */
export async function withOpenRound<T>(fn: (tx: Tx, roundId: string) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await ensureOpenRound();
    const result = await db.$transaction(async (tx) => {
      const roundId = await lockOpenRoundShared(tx);
      if (!roundId) return { retry: true as const };
      return { retry: false as const, value: await fn(tx, roundId) };
    });
    if (!result.retry) return result.value;
  }
  throw new Error("Runda je upravo zatvorena, pokušajte ponovo.");
}

/**
 * Closes `roundId` (the round the kitchen is looking at): marks all active
 * orders as done and opens a fresh round. Returns false if that round was
 * already closed, e.g. a double click or a second kitchen screen.
 */
export async function closeRound(roundId: string, closedById: string) {
  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Round" WHERE "id" = ${roundId} AND "closedAt" IS NULL FOR UPDATE`;
    if (locked.length === 0) return false;

    await tx.order.updateMany({
      where: { roundId, status: "ACTIVE" },
      data: { status: "DONE" },
    });
    await tx.round.update({
      where: { id: roundId },
      data: { closedAt: new Date(), closedById },
    });
    await tx.round.create({ data: {} });
    return true;
  });
}
