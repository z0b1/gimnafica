import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Not env("DATABASE_URL"): that throws when the variable is missing, which
    // breaks `prisma generate` (postinstall) on CI/Vercel where no DB is needed.
    // Commands that do connect (migrate, seed) still fail clearly without it.
    // Migrations need a direct connection, not Neon's pgbouncer pooler.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});
