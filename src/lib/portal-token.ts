import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "fallback-dev-secret";
const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

// ─── Portal Token (client intake + document upload) ────────────────────────

export interface PortalTokenPayload {
  clientId: string;
  caseId: string;
  organizationId: string;
  expiresAt: number;
}

export interface AgreementTokenPayload {
  agreementId: string;
  clientId: string;
  organizationId: string;
  expiresAt: number;
}

function sign(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function verify<T>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expected = createHmac("sha256", SECRET).update(encoded).digest("base64url");
    const a = Buffer.from(sig, "base64url");
    const b = Buffer.from(expected, "base64url");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as T & { expiresAt: number };
    if (Date.now() > payload.expiresAt * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function generatePortalToken(clientId: string, caseId: string, organizationId: string, days = 30): string {
  return sign({ clientId, caseId, organizationId, expiresAt: Math.floor(Date.now() / 1000) + days * 86400 });
}

export function verifyPortalToken(token: string): PortalTokenPayload | null {
  const p = verify<PortalTokenPayload>(token);
  if (!p?.clientId || !p?.caseId || !p?.organizationId) return null;
  return p;
}

export function generateAgreementToken(agreementId: string, clientId: string, organizationId: string, days = 30): string {
  return sign({ agreementId, clientId, organizationId, expiresAt: Math.floor(Date.now() / 1000) + days * 86400 });
}

export function verifyAgreementToken(token: string): AgreementTokenPayload | null {
  const p = verify<AgreementTokenPayload>(token);
  if (!p?.agreementId || !p?.clientId || !p?.organizationId) return null;
  return p;
}

export function portalUrl(token: string) {
  return `${APP_URL}/portal/${token}`;
}

export function agreementUrl(token: string) {
  return `${APP_URL}/agreement/${token}`;
}
