import "server-only";
import { db } from "./db";
import { ensureOpenRound, withOpenRound } from "./rounds";

export class OrderError extends Error {}

export type OrderItemInput = { coffeeTypeId: string; quantity: number };

/** Creates or replaces the professor's order in the open round. */
export async function submitOrder(userId: string, items: OrderItemInput[]) {
  await withOpenRound(async (tx, roundId) => {
    const ids = items.map((i) => i.coffeeTypeId);
    const available = await tx.coffeeType.count({
      where: { id: { in: ids }, active: true },
    });
    if (available !== ids.length) {
      throw new OrderError("Neka od izabranih kafa više nije dostupna.");
    }

    const order = await tx.order.upsert({
      where: { userId_roundId: { userId, roundId } },
      create: { userId, roundId },
      // Explicit updatedAt so the kitchen sees re-submits as a change.
      update: { status: "ACTIVE", updatedAt: new Date() },
    });
    await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    await tx.orderItem.createMany({
      data: items.map((i) => ({ ...i, orderId: order.id })),
    });
  });
}

export async function cancelOrder(userId: string) {
  await withOpenRound((tx, roundId) =>
    tx.order.updateMany({
      where: { userId, roundId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    }),
  );
}

const orderInclude = {
  items: {
    include: { coffeeType: { select: { name: true } } },
    orderBy: { coffeeType: { sortOrder: "asc" } },
  },
} as const;

/**
 * What the professor page shows: their order in the open round if any,
 * otherwise their order from the most recently closed round (shown as done).
 */
export async function getProfessorOrder(userId: string) {
  const round = await ensureOpenRound();
  const current = await db.order.findUnique({
    where: { userId_roundId: { userId, roundId: round.id } },
    include: orderInclude,
  });
  if (current) return { order: current, inOpenRound: true };

  const lastClosed = await db.round.findFirst({
    where: { closedAt: { not: null } },
    orderBy: { closedAt: "desc" },
    select: { id: true },
  });
  if (!lastClosed) return { order: null, inOpenRound: false };
  const previous = await db.order.findUnique({
    where: { userId_roundId: { userId, roundId: lastClosed.id } },
    include: orderInclude,
  });
  return {
    order: previous?.status === "DONE" ? previous : null,
    inOpenRound: false,
  };
}

/** Items of the professor's most recent completed order, for "order the same again". */
export async function getLastCompletedItems(userId: string) {
  const last = await db.order.findFirst({
    where: { userId, status: "DONE" },
    orderBy: { updatedAt: "desc" },
    select: {
      items: {
        where: { coffeeType: { active: true } },
        select: { coffeeTypeId: true, quantity: true, coffeeType: { select: { name: true } } },
        orderBy: { coffeeType: { sortOrder: "asc" } },
      },
    },
  });
  return (last?.items ?? []).map((i) => ({
    coffeeTypeId: i.coffeeTypeId,
    quantity: i.quantity,
    name: i.coffeeType.name,
  }));
}

export type KitchenSummary = {
  roundId: string;
  openedAt: string;
  total: number;
  totals: { coffeeTypeId: string; name: string; quantity: number }[];
  cancelled: number;
  orders: {
    id: string;
    professor: string;
    createdAt: string;
    updatedAt: string;
    /** Changed after it was first placed. */
    edited: boolean;
    items: { name: string; quantity: number }[];
  }[];
  /** Changes whenever any order in the round is created, edited or cancelled. */
  version: string;
};

export async function getKitchenSummary(): Promise<KitchenSummary> {
  const round = await ensureOpenRound();
  const [orders, coffeeTypes, stats, cancelled] = await Promise.all([
    db.order.findMany({
      where: { roundId: round.id, status: "ACTIVE" },
      include: { ...orderInclude, user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.coffeeType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.order.aggregate({
      where: { roundId: round.id },
      _count: true,
      _max: { updatedAt: true },
    }),
    db.order.count({ where: { roundId: round.id, status: "CANCELLED" } }),
  ]);

  const qty = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      qty.set(item.coffeeTypeId, (qty.get(item.coffeeTypeId) ?? 0) + item.quantity);
    }
  }

  // Always list active types (even at 0) so the board layout stays stable;
  // inactive types only appear if someone still has them in an order.
  const totals = coffeeTypes
    .filter((t) => t.active || qty.has(t.id))
    .map((t) => ({ coffeeTypeId: t.id, name: t.name, quantity: qty.get(t.id) ?? 0 }));

  return {
    roundId: round.id,
    openedAt: round.openedAt.toISOString(),
    total: totals.reduce((sum, t) => sum + t.quantity, 0),
    totals,
    cancelled,
    orders: orders.map((o) => ({
      id: o.id,
      professor: o.user.name,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      edited: o.updatedAt.getTime() - o.createdAt.getTime() > 2000,
      items: o.items.map((i) => ({ name: i.coffeeType.name, quantity: i.quantity })),
    })),
    version: `${round.id}:${stats._count}:${stats._max.updatedAt?.getTime() ?? 0}`,
  };
}
