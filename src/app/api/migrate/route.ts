import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFileSync } from "fs";
import { join } from "path";

const MIGRATION_SQL = readFileSync(join(process.cwd(), "prisma", "migration-payment.sql"), "utf-8");

export async function GET(request: NextRequest) {
  const MIGRATION_SECRET = process.env["MIGRATE_SECRET"];
  if (!MIGRATION_SECRET) {
    return NextResponse.json({ error: "MIGRATE_SECRET not configured on server" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${MIGRATION_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dry-run") === "true";

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      sql: MIGRATION_SQL,
      instructions:
        "Copy the SQL above and paste it into Supabase Dashboard SQL Editor at https://supabase.com/dashboard/project/hcilbqzipmpxqektvzgk/sql/new",
    });
  }

  const results: string[] = [];

  try {
    const tables = await prisma.$queryRawUnsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    ) as Array<{ table_name: string }>;

    const hasPayment = tables.some((t: { table_name: string }) => t.table_name === "Payment");
    results.push(`Payment table exists: ${hasPayment}`);

    if (!hasPayment) {
      const statements = MIGRATION_SQL
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("--"));

      for (const stmt of statements) {
        await prisma.$executeRawUnsafe(stmt + ";");
      }
      results.push("Migration complete!");
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ok: false,
      error: message,
      hint: "Try /api/migrate?dry-run=true to get the SQL to run manually in Supabase Dashboard",
    }, { status: 500 });
  }
}
