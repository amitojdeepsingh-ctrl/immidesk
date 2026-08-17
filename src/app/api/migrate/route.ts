import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFileSync } from "fs";
import { join } from "path";

type MigrationDef = {
  label: string;
  file: string;
  isApplied: (
    tables: string[],
    columns: Array<{ table_name: string; column_name: string }>
  ) => boolean;
};

const MIGRATIONS: MigrationDef[] = [
  {
    label: "payment",
    file: "migration-payment.sql",
    isApplied: (tables) => tables.includes("Payment"),
  },
  {
    label: "applicant-label",
    file: "migration-applicant-label.sql",
    isApplied: (tables, columns) =>
      columns.some(
        (c) => c.table_name === "Document" && c.column_name === "applicantLabel"
      ),
  },
];

const SQL_CACHE = new Map<string, string>();

function migrationSql(file: string): string {
  if (!SQL_CACHE.has(file)) {
    SQL_CACHE.set(file, readFileSync(join(process.cwd(), "prisma", file), "utf-8"));
  }
  return SQL_CACHE.get(file) as string;
}

function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("--"));
}

async function dbState() {
  const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  const columns = await prisma.$queryRawUnsafe<
    Array<{ table_name: string; column_name: string }>
  >(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'"
  );
  return {
    tables: tables.map((t) => t.table_name),
    columns,
  };
}

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
      migrations: MIGRATIONS.map((m) => m.label),
      sql: MIGRATIONS.map((m) => `-- ${m.label}\n${migrationSql(m.file)}`).join("\n\n"),
      instructions:
        "Copy the SQL above and paste it into Supabase Dashboard SQL Editor at https://supabase.com/dashboard/project/hcilbqzipmpxqektvzgk/sql/new",
    });
  }

  const results: string[] = [];
  const pending: MigrationDef[] = [];

  try {
    const { tables, columns } = await dbState();

    for (const m of MIGRATIONS) {
      if (m.isApplied(tables, columns)) {
        results.push(`${m.label}: already applied`);
      } else {
        pending.push(m);
      }
    }

    if (pending.length === 0) {
      results.push("All migrations up-to-date");
    }

    for (const m of pending) {
      const statements = splitStatements(migrationSql(m.file));
      for (const stmt of statements) {
        await prisma.$executeRawUnsafe(stmt + ";");
      }
      results.push(`${m.label}: migration applied (${statements.length} statements)`);
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