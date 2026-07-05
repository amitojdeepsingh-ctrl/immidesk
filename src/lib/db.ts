import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

export async function rawSql(query: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }> {
  const client = await getPool().connect();
  try {
    return await client.query(query, params as never[]);
  } finally {
    client.release();
  }
}

export async function ensureInvoiceTable(): Promise<void> {
  await rawSql(`
    CREATE TABLE IF NOT EXISTS "Invoice" (
      id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "organizationId" TEXT NOT NULL,
      "clientId"       TEXT,
      "invoiceNumber"  TEXT NOT NULL,
      "invoiceDate"    TIMESTAMPTZ NOT NULL DEFAULT now(),
      "dueDate"        TIMESTAMPTZ,
      status           TEXT NOT NULL DEFAULT 'DRAFT',
      "billToName"     TEXT NOT NULL,
      "billToEmail"    TEXT,
      "billToPhone"    TEXT,
      "billToAddress"  TEXT,
      "lineItems"      JSONB NOT NULL DEFAULT '[]',
      subtotal         NUMERIC(12,2) NOT NULL DEFAULT 0,
      "taxRate"        NUMERIC(5,2) NOT NULL DEFAULT 0,
      "taxAmount"      NUMERIC(12,2) NOT NULL DEFAULT 0,
      total            NUMERIC(12,2) NOT NULL DEFAULT 0,
      currency         TEXT NOT NULL DEFAULT 'CAD',
      "paymentInstructions" TEXT,
      notes            TEXT,
      "paidAt"         TIMESTAMPTZ,
      "createdAt"      TIMESTAMPTZ DEFAULT now(),
      "updatedAt"      TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT "Invoice_invoiceNumber_orgId_key" UNIQUE ("organizationId", "invoiceNumber")
    )
  `);
}
