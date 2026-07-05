// ═══════════════════════════════════════════════════════════════════════════
// API Validation Schemas — Zod schemas for request bodies and query params
// ═══════════════════════════════════════════════════════════════════════════

import { z } from "zod";

// ─── Client Schemas ────────────────────────────────────────────────────────

/**
 * Schema for creating a new client.
 * Required: firstName, lastName, email.
 * Optional: all other Client fields.
 */
export const clientCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  phone: z.string().max(30).optional().nullable(),
  dateOfBirth: z.string().datetime({ offset: true }).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  passportNumber: z.string().max(50).optional().nullable(),
  passportExpiry: z.string().datetime({ offset: true }).optional().nullable(),
  workPermitExpiry: z.string().datetime({ offset: true }).optional().nullable(),
  maritalStatus: z.string().max(50).optional().nullable(),
  spouseName: z.string().max(200).optional().nullable(),
  addressLine1: z.string().max(255).optional().nullable(),
  addressLine2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;

/**
 * Schema for updating an existing client.
 * All fields optional — only provided fields are updated.
 */
export const clientUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email("Invalid email address").max(255).optional(),
  phone: z.string().max(30).optional().nullable(),
  dateOfBirth: z.string().datetime({ offset: true }).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  passportNumber: z.string().max(50).optional().nullable(),
  passportExpiry: z.string().datetime({ offset: true }).optional().nullable(),
  workPermitExpiry: z.string().datetime({ offset: true }).optional().nullable(),
  maritalStatus: z.string().max(50).optional().nullable(),
  spouseName: z.string().max(200).optional().nullable(),
  addressLine1: z.string().max(255).optional().nullable(),
  addressLine2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;

// ─── Query Param Schemas ───────────────────────────────────────────────────

/**
 * Schema for paginated list query parameters.
 * Used by GET /api/clients and similar list endpoints.
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 1;
      return isNaN(n) || n < 1 ? 1 : n;
    }),
  perPage: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 20;
      if (isNaN(n) || n < 1) return 20;
      return Math.min(n, 100); // cap at 100
    }),
  search: z.string().optional(),
  sortBy: z.enum(["firstName", "lastName", "email", "createdAt", "updatedAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// ─── Agreement Schemas ─────────────────────────────────────────────────────

export const agreementTermsSchema = z.object({
  scopeOfWork: z.string().min(10, "Scope of work must be at least 10 characters").max(10000),
  feesAndPayment: z.string().min(5, "Fees and payment terms required").max(5000),
  clientResponsibilities: z.string().min(5, "Client responsibilities required").max(5000),
  confidentiality: z.string().min(5, "Confidentiality clause required").max(5000),
  termination: z.string().min(5, "Termination clause required").max(5000),
  governingLaw: z.string().min(2, "Governing law required").max(200),
  additionalClauses: z.array(z.string().max(2000)).max(10).optional(),
});

export type AgreementTermsInput = z.infer<typeof agreementTermsSchema>;

export const agreementGenerateSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  caseId: z.string().optional().nullable(),
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(5000).optional().nullable(),
  serviceType: z.enum(["consultation", "representation", "document_review", "form_filing", "full_service", "other"]),
  feeAmount: z.number().min(0, "Fee must be 0 or greater").max(999999),
  feeCurrency: z.string().length(3, "Currency must be a 3-letter code").default("CAD"),
  feeStructure: z.enum(["flat", "hourly", "milestone", "retainer"]),
  paymentSchedule: z.enum(["upfront", "monthly", "on_completion", "milestone", "split"]),
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  signatureDataUrl: z.string().max(500000).optional().nullable(),
  terms: agreementTermsSchema,
});

export type AgreementGenerateInput = z.infer<typeof agreementGenerateSchema>;

export const agreementUpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["DRAFT", "SENT", "SIGNED", "EXPIRED", "VOIDED"]).optional(),
  feeAmount: z.number().min(0).max(999999).optional(),
  feeCurrency: z.string().length(3).optional(),
  feeStructure: z.enum(["flat", "hourly", "milestone", "retainer"]).optional(),
  paymentSchedule: z.enum(["upfront", "monthly", "on_completion", "milestone", "split"]).optional(),
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  terms: agreementTermsSchema.partial().optional(),
});

export type AgreementUpdateInput = z.infer<typeof agreementUpdateSchema>;