// ═══════════════════════════════════════════════════════════════════════════
// API Error Handling — AppError class + response envelope helpers
// ═══════════════════════════════════════════════════════════════════════════
// Every API route handler returns a consistent envelope:
//   { data: T | null, meta: Meta | null, error: ApiError | null }
//
// Usage:
//   import { AppError, successResponse, errorResponse } from "@/lib/api/errors";
//   return successResponse(client, 201);
//   return errorResponse("NOT_FOUND", "Client not found", null, 404);
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

export interface ApiEnvelope<T = unknown> {
  data: T | null;
  meta: PaginationMeta | null;
  error: ApiError | null;
}

// ─── AppError ──────────────────────────────────────────────────────────────

/**
 * Application-level error with machine-readable code and HTTP status.
 * Throw this from service/validation layers; catch in route handlers.
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ─── Response Helpers ──────────────────────────────────────────────────────

/**
 * Build a success envelope response.
 * Automatically wraps data in { data, meta: null, error: null }.
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  meta?: PaginationMeta,
): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json(
    { data, meta: meta ?? null, error: null },
    { status },
  );
}

/**
 * Build an error envelope response.
 * Accepts an AppError instance, or raw code/message/details/status.
 */
export function errorResponse(
  code: string,
  message: string,
  details?: unknown,
  status: number = 400,
): NextResponse<ApiEnvelope<never>> {
  return NextResponse.json(
    { data: null, meta: null, error: { code, message, details: details ?? null } },
    { status },
  );
}

/**
 * Normalize any caught error into a proper errorResponse.
 * Handles ZodError (validation), AppError (business logic), and unknown errors.
 */
export function handleApiError(err: unknown): NextResponse<ApiEnvelope<never>> {
  if (err instanceof ZodError) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid input",
      err.issues,
      422,
    );
  }

  if (err instanceof AppError) {
    return errorResponse(err.code, err.message, err.details, err.statusCode);
  }

  // Log unexpected errors — in production this would go to Sentry
  console.error("Unhandled API error:", err);

  return errorResponse(
    "INTERNAL_ERROR",
    "Something went wrong",
    null,
    500,
  );
}
