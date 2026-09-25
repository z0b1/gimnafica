/**
 * Runs the round/order logic against a real Postgres. Each run creates its own
 * throwaway schema (dropped afterwards), so it never touches the app's tables.
 *
 * Uses TEST_DATABASE_URL, or DATABASE_URL_UNPOOLED from .env. Must be a direct
 * connection: raw SQL finds the schema via the `search_path` startup option,
 * which poolers like pgbouncer don't pass through. Prisma's own queries are
 * schema-qualified, so its adapter gets the schema explicitly as well.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";

const baseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
const schema = `gimnafica_test_${Date.now()}`;

function withSearchPath(url: string) {
  const u = new URL(url);
  u.searchParams.set("options", `-c search_path=${schema}`);
  return u.toString();
}

describe.skipIf(!baseUrl)("rounds and orders (database)", () => {
  let lib: {
    db: typeof import("./db").db;
    rounds: typeof import("./rounds");
    orders: typeof import("./orders");
  };
  let espreso: string;
  let caj: string;
  let hidden: string;
  let profA: string;
  let profB: string;
  let kitchen: string;

  beforeAll(async () => {
    const admin = new Client({ connectionString: baseUrl });
    await admin.connect();
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await admin.query(`SET search_path TO "${schema}"`);
    const sql = readFileSync("prisma/migrations/20260925000000_init/migration.sql", "utf8")
      .replace('CREATE SCHEMA IF NOT EXISTS "public";', "");
    await admin.query(sql);
    await admin.end();

    const testDb = new PrismaClient({
      adapter: new PrismaPg({ connectionString: withSearchPath(baseUrl!) }, { schema }),
    });
    // Safety net: refuse to write anything unless we're really in the empty test schema.
    if ((await testDb.coffeeType.count()) !== 0) {
      throw new Error(`Test client is not isolated in schema ${schema}`);
    }
    vi.doMock("./db", () => ({ db: testDb }));
    lib = {
      db: testDb,
      rounds: await import("./rounds"),
      orders: await import("./orders"),
    };

    const { db } = lib;
    [espreso, caj, hidden] = await Promise.all(
      [
        { name: "Espreso", sortOrder: 0 },
        { name: "Čaj", sortOrder: 1 },
        { name: "Stara kafa", sortOrder: 2, active: false },
      ].map(async (data) => (await db.coffeeType.create({ data })).id),
    );
    [profA, profB, kitchen] = await Promise.all(
      (["PROFESOR", "PROFESOR", "KUHINJA"] as const).map(async (role, i) =>
        (
          await db.user.create({
            data: {
              name: `Korisnik ${i}`,
              email: `u${i}@test.rs`,
              passwordHash: "x",
              requestedRole: role,
              role,
              status: "APPROVED",
            },
          })
        ).id,
      ),
    );
  });

  afterAll(async () => {
    await lib?.db.$disconnect();
    const admin = new Client({ connectionString: baseUrl });
    await admin.connect();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  });

  it("opens exactly one round even when called concurrently", async () => {
    const rounds = await Promise.all(Array.from({ length: 8 }, () => lib.rounds.ensureOpenRound()));
    expect(new Set(rounds.map((r) => r.id)).size).toBe(1);
    expect(await lib.db.round.count({ where: { closedAt: null } })).toBe(1);
  });

  it("keeps one order per professor per round and re-submitting replaces it", async () => {
    const { orders } = lib;
    await orders.submitOrder(profA, [
      { coffeeTypeId: espreso, quantity: 2 },
      { coffeeTypeId: caj, quantity: 1 },
    ]);
    await orders.submitOrder(profB, [{ coffeeTypeId: espreso, quantity: 1 }]);

    let summary = await orders.getKitchenSummary();
    expect(summary.total).toBe(4);
    expect(summary.totals).toEqual([
      { coffeeTypeId: espreso, name: "Espreso", quantity: 3 },
      { coffeeTypeId: caj, name: "Čaj", quantity: 1 },
    ]);

    const before = summary.version;
    await orders.submitOrder(profA, [{ coffeeTypeId: espreso, quantity: 1 }]);
    summary = await orders.getKitchenSummary();
    expect(summary.orders).toHaveLength(2);
    expect(summary.total).toBe(2);
    expect(summary.version).not.toBe(before);
  });

  it("cancelling removes the order from the kitchen totals", async () => {
    await lib.orders.cancelOrder(profB);
    const summary = await lib.orders.getKitchenSummary();
    expect(summary.orders.map((o) => o.professor)).toEqual(["Korisnik 0"]);
    expect(summary.total).toBe(1);
  });

  it("rejects inactive coffee types", async () => {
    await expect(
      lib.orders.submitOrder(profB, [{ coffeeTypeId: hidden, quantity: 1 }]),
    ).rejects.toBeInstanceOf(lib.orders.OrderError);
  });

  it("closing a round marks orders done and opens a fresh round", async () => {
    const { orders, rounds, db } = lib;
    const { roundId } = await orders.getKitchenSummary();

    expect(await rounds.closeRound(roundId, kitchen)).toBe(true);
    // Second click / second kitchen screen: no-op, doesn't close the new round.
    expect(await rounds.closeRound(roundId, kitchen)).toBe(false);

    const next = await orders.getKitchenSummary();
    expect(next.roundId).not.toBe(roundId);
    expect(next.total).toBe(0);
    expect(await db.round.count({ where: { closedAt: null } })).toBe(1);

    const statuses = await db.order.findMany({ where: { roundId }, select: { userId: true, status: true } });
    expect(Object.fromEntries(statuses.map((o) => [o.userId, o.status]))).toEqual({
      [profA]: "DONE",
      [profB]: "CANCELLED",
    });

    const view = await orders.getProfessorOrder(profA);
    expect(view.inOpenRound).toBe(false);
    expect(view.order?.status).toBe("DONE");
  });

  it("never leaves an active order in a closed round under concurrent submits", async () => {
    const { orders, rounds, db } = lib;
    const { roundId } = await orders.getKitchenSummary();
    const submits = Array.from({ length: 6 }, (_, i) =>
      orders.submitOrder(i % 2 ? profA : profB, [{ coffeeTypeId: espreso, quantity: (i % 3) + 1 }]),
    );
    await Promise.all([...submits, rounds.closeRound(roundId, kitchen)]);

    const stranded = await db.order.count({
      where: { status: "ACTIVE", round: { closedAt: { not: null } } },
    });
    expect(stranded).toBe(0);
    expect(await db.round.count({ where: { closedAt: null } })).toBe(1);
  });
});
