import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton Prisma client — reused across hot-reloads in development.
 *
 * Prisma 7 with PostgreSQL via Supabase session pooler (port 6543).
 * Uses the PrismaPg driver adapter for direct database connection.
 * Connection URL is loaded from DATABASE_URL env var.
 *
 * Usage:
 *   import { prisma } from "@/lib/prisma";
 *   const org = await prisma.organization.findUnique({ where: { slug } });
 *
 * Edge runtime note: PrismaClient requires Node.js APIs and does NOT work
 * in Edge Runtime. Use this only in Server Components, Route Handlers,
 * and Server Actions (which run on Node.js by default in Next.js).
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env["DATABASE_URL"]!,
      connectionTimeoutMillis: 5000,
    }),
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}
