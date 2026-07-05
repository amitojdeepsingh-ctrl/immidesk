import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser?.email) return null;

  const dbUser = await getSupabaseAdmin()
    .from("User")
    .select("*, organization:Organization(*)")
    .eq("supabaseUserId", supabaseUser.id)
    .maybeSingle();

  if (!dbUser.data) return null;

  await getSupabaseAdmin()
    .from("User")
    .update({ lastLoginAt: new Date().toISOString() })
    .eq("id", dbUser.data.id);

  return {
    supabaseUser,
    prismaUser: dbUser.data,
    organization: dbUser.data.organization,
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
