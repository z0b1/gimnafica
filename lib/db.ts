import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // DATABASE_SCHEMA (optional) runs the app against a non-public schema, e.g. a
  // throwaway preview. Raw SQL then also needs `options=-c search_path=<schema>`
  // in DATABASE_URL.
  const adapter = new PrismaPg(
    { connectionString: process.env.DATABASE_URL! },
    { schema: process.env.DATABASE_SCHEMA || undefined },
  );
  return new PrismaClient({ adapter });
}

// Reuse one client across hot reloads in dev.
export const db = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
