import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  handleApiError,
  AppError,
} from "@/lib/api/errors";
import {
  clientCreateSchema,
  paginationSchema,
} from "@/lib/api/validations";

export async function GET(req: NextRequest) {
  try {
    const { organization } = await requireAuth();
    const url = req.nextUrl;
    const rawParams = Object.fromEntries(url.searchParams.entries());
    const params = paginationSchema.parse(rawParams);
    const { page, perPage, search, sortBy, sortOrder } = params;
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("Client")
      .select("*", { count: "exact", head: false })
      .eq("organizationId", organization.id);

    if (search && search.trim().length > 0) {
      const term = search.trim();
      query = query.or(`firstName.ilike.%${term}%,lastName.ilike.%${term}%,email.ilike.%${term}%`);
    }

    query = query.order(sortBy as string, { ascending: sortOrder === "asc" });
    query = query.range((page - 1) * perPage, page * perPage - 1);

    const { data: clients, count, error } = await query;

    if (error) throw new AppError("QUERY_FAILED", error.message, 500);

    const totalPages = count ? Math.ceil(count / perPage) : 0;

    return successResponse(clients ?? [], 200, {
      page,
      perPage,
      totalCount: count ?? 0,
      totalPages,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prismaUser, organization } = await requireAuth();
    const supabase = getSupabaseAdmin();

    const body = await req.json();
    const validated = clientCreateSchema.parse(body);

    const data = {
      ...validated,
      organizationId: organization.id,
      dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth).toISOString() : null,
      passportExpiry: validated.passportExpiry ? new Date(validated.passportExpiry).toISOString() : null,
    };

    const { data: existing } = await supabase
      .from("Client")
      .select("id")
      .eq("organizationId", organization.id)
      .eq("email", validated.email)
      .maybeSingle();

    if (existing) {
      return errorResponse("DUPLICATE_EMAIL", `A client with email ${validated.email} already exists in your organization`, null, 409);
    }

    const { data: client, error: insertError } = await supabase
      .from("Client")
      .insert(data)
      .select()
      .single();

    if (insertError) throw new AppError("INSERT_FAILED", insertError.message, 500);

    const { error: logError } = await supabase
      .from("ActivityLog")
      .insert({
        organizationId: organization.id,
        userId: prismaUser.id,
        action: "CLIENT_CREATED",
        entityType: "Client",
        entityId: client.id,
        metadata: { clientName: `${client.firstName} ${client.lastName}`, clientEmail: client.email },
      });

    if (logError) console.warn("ActivityLog insert failed:", logError.message);

    return successResponse(client, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
