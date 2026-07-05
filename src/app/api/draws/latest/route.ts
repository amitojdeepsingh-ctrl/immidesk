import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  successResponse,
  handleApiError,
} from "@/lib/api/errors";

export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: draws, error } = await supabase
      .from("PNPDraw")
      .select("*")
      .order("drawDate", { ascending: false })
      .limit(10);

    if (error) throw error;

    const serialized = (draws ?? []).map((d: Record<string, unknown>) => ({
      ...d,
      drawDate: typeof d.drawDate === "string" ? d.drawDate : new Date(d.drawDate as Date).toISOString(),
      createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date(d.createdAt as Date).toISOString(),
    }));

    return successResponse(serialized, 200);
  } catch (err) {
    return handleApiError(err);
  }
}
