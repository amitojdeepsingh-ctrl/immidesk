// ImmigDesk ? Prisma 7 Configuration
// Connection URLs, migration path, and schema location.
// Requires: npm install --save-dev dotenv (or use Bun which loads .env natively)
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Supabase session pooler URL (port 6543, pooled connections with pgbouncer)
    url: process.env["DATABASE_URL"]!,
  },
});
