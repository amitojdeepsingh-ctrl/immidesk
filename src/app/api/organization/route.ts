import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  email: z
    .union([z.string().email("Enter a valid contact email"), z.literal("")])
    .optional(),
  phone: z.string().max(40).optional(),
  ciccRegistrationNumber: z.string().max(40).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  logoUrl: z
    .union([z.string().url("Logo must be a valid https URL"), z.literal("")])
    .optional(),
});

export async function GET() {
  try {
    const { organization } = await requireAuth();
    return NextResponse.json({ data: organization });
  } catch (err) {
    console.error("organization GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { prismaUser, organization } = await requireAuth();
    if (!["OWNER", "ADMIN"].includes(prismaUser.role)) {
      return NextResponse.json({ error: "Only organization owners can update company details" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.parse(body);

    const now = new Date().toISOString();
    const update: Record<string, unknown> = { updatedAt: now };
    for (const [key, value] of Object.entries(parsed)) {
      if (value === undefined) continue;
      update[key] = value === "" ? null : value;
    }

    // RCIC number is globally unique — surface a friendly error on collision
    const { error } = await getSupabaseAdmin()
      .from("Organization")
      .update(update)
      .eq("id", organization.id);

    if (error) {
      const msg = error.message.includes("duplicate key")
        ? "That RCIC registration number is already used by another organization"
        : error.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 422 });
    }
    console.error("organization PATCH error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
