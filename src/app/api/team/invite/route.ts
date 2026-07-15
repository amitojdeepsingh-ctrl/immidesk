import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError, AppError } from "@/lib/api/errors";
import { z } from "zod";

const roleEnum = z.enum(["OWNER", "ADMIN", "CONSULTANT", "ASSISTANT", "AUDITOR"]);

const inviteSchema = z.object({
  email: z.string().email(),
  role: roleEnum.default("CONSULTANT"),
});

export async function POST(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const parsed = inviteSchema.parse(body);

    const { data: existing } = await supabase
      .from("User")
      .select("id, email")
      .eq("email", parsed.email)
      .maybeSingle();

    if (existing) throw new AppError("USER_EXISTS", "A user with this email already exists in the system.", 409);

    const supabaseUserId = crypto.randomUUID();

    const { data: user, error } = await supabase
      .from("User")
      .insert({
        email: parsed.email,
        name: parsed.email.split("@")[0],
        role: parsed.role,
        organizationId: organization.id,
        supabaseUserId,
      })
      .select("id, email, name, role, createdAt")
      .single();

    if (error) throw new AppError("CREATE_FAILED", error.message, 500);

    return successResponse(user, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
