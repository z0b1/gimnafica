import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEFAULT_COFFEE_TYPES = [
  "Espreso",
  "Espreso sa mlekom",
  "Kapućino",
  "Domaća kafa",
  "Nes kafa",
  "Čaj",
];

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Postavite ADMIN_EMAIL i ADMIN_PASSWORD u .env fajlu.");
  }

  // Only creates the admin; never overwrites an existing account's password.
  await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: process.env.ADMIN_NAME?.trim() || "Administrator",
      passwordHash: await bcrypt.hash(password, 10),
      requestedRole: "ADMIN",
      role: "ADMIN",
      status: "APPROVED",
    },
  });

  if ((await db.coffeeType.count()) === 0) {
    await db.coffeeType.createMany({
      data: DEFAULT_COFFEE_TYPES.map((name, i) => ({ name, sortOrder: i })),
    });
  }

  console.log(`Admin: ${email}`);
}

main()
  .finally(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
