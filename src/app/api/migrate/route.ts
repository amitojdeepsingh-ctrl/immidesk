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
    label: "v2",
    file: "migration-v2.sql",
    isApplied: (tables) =>
      ["CaseTypeConfig", "RolePermission", "NotificationPreference", "AiFeatureConfig"].every(
        (t) => tables.includes(t)
      ),
  },
  {
    label: "intake",
    file: "migration-intake.sql",
    isApplied: (tables) => tables.includes("intake_submissions"),
  },
  {
    label: "consultations",
    file: "migration-consultations.sql",
    isApplied: (tables) =>
      ["Consultation", "AvailabilityRule"].every((t) => tables.includes(t)),
  },
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
  const statements: string[] = [];
  let buf = "";
  let i = 0;
  let inSingleQuote = false;
  let inDollar = false;
  let inLineComment = false;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      buf += ch;
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }

    if (inSingleQuote) {
      buf += ch;
      if (ch === "'" && next === "'") {
        buf += next;
        i += 2;
        continue;
      }
      if (ch === "'") inSingleQuote = false;
      i++;
      continue;
    }

    if (inDollar) {
      buf += ch;
      if (ch === "$" && next === "$") {
        buf += next;
        inDollar = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (ch === "-" && next === "-") {
      inLineComment = true;
      buf += ch + next;
      i += 2;
      continue;
    }
    if (ch === "'") {
      inSingleQuote = true;
      buf += ch;
      i++;
      continue;
    }
    if (ch === "$" && next === "$") {
      inDollar = true;
      buf += ch + next;
      i += 2;
      continue;
    }
    if (ch === ";") {
      const stmt = buf.trim();
      if (stmt) statements.push(stmt);
      buf = "";
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  const last = buf.trim();
  if (last) statements.push(last);
  return statements;
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