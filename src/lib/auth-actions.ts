"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { redirect } from "next/navigation";
import {
  signupSchema,
  type SignupInput,
  type AuthActionResult,
} from "@/lib/auth-schemas";

/**
 * Login is handled client-side via createBrowserClient().
 * This file only contains signup and logout.
 */

export async function signupAction(
  input: SignupInput,
): Promise<AuthActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { name, email, password, organizationName } = parsed.data;

  // Check if email already exists
  const { data: existingUser } = await getSupabaseAdmin()
    .from("User")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    return {
      success: false,
      error: "An account with this email already exists",
    };
  }

  const adminClient = await createAdminClient();

  const {
    data: { user: supabaseUser },
    error: signUpError,
  } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (signUpError || !supabaseUser) {
    return {
      success: false,
      error: signUpError?.message ?? "Failed to create account",
    };
  }

  let slug = slugify(organizationName);
  const { data: existingOrg } = await getSupabaseAdmin()
    .from("Organization")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existingOrg) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const now = new Date().toISOString();
  const { error: orgError } = await getSupabaseAdmin().from("Organization").insert({
    id: crypto.randomUUID(),
    name: organizationName,
    slug,
    updatedAt: now,
  });

  if (orgError) {
    await adminClient.auth.admin.deleteUser(supabaseUser.id);
    return {
      success: false,
      error: "Failed to set up your workspace. Please try again.",
    };
  }

  const { data: org, error: fetchOrgError } = await getSupabaseAdmin()
    .from("Organization")
    .select("id")
    .eq("slug", slug)
    .single();

  if (fetchOrgError || !org) {
    await getSupabaseAdmin().from("Organization").delete().eq("slug", slug);
    await adminClient.auth.admin.deleteUser(supabaseUser.id);
    return { success: false, error: "Failed to set up your workspace." };
  }

  const { error: userError } = await getSupabaseAdmin().from("User").insert({
    id: crypto.randomUUID(),
    email,
    name,
    role: "OWNER",
    supabaseUserId: supabaseUser.id,
    organizationId: org.id,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (userError) {
    await getSupabaseAdmin().from("Organization").delete().eq("id", org.id);
    await adminClient.auth.admin.deleteUser(supabaseUser.id);
    return {
      success: false,
      error: "Failed to set up your workspace. Please try again.",
    };
  }

  // Auto-sign in so user doesn't need to log in manually
  try {
    const supabase = await createClient();
    await supabase.auth.signInWithPassword({ email, password });
  } catch {
    // Non-critical: session will be created on next login
  }

  return { success: true };
}

/**
 * Logout server action — signs out and redirects to /login.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
