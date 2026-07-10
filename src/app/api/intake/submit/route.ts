import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.id && body.status) {
      return await PATCH(request);
    }

    const { childrenData, ...data } = body;

    const now = new Date().toISOString();
    const submission = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone || null,
      date_of_birth: data.dateOfBirth || null,
      gender: data.gender || null,
      nationality: data.nationality || null,
      passport_number: data.passportNumber || null,
      address: data.address || null,
      city: data.city || null,
      province: data.province || null,
      postal_code: data.postalCode || null,
      country: data.country || "Canada",
      marital_status: data.maritalStatus || "single",
      spouse_first_name: data.spouseFirstName || null,
      spouse_last_name: data.spouseLastName || null,
      spouse_dob: data.spouseDOB || null,
      spouse_nationality: data.spouseNationality || null,
      spouse_passport: data.spousePassport || null,
      children_data: childrenData || "[]",
      occupation: data.occupation || null,
      education_level: data.educationLevel || null,
      english_level: data.englishLevel || null,
      french_level: data.frenchLevel || null,
      program_type: data.programType || null,
      current_status: data.currentStatus || null,
      submitted_at: now,
      updated_at: now,
    };

    const db = getSupabaseAdmin();
    const { data: result, error } = await db
      .from("intake_submissions")
      .insert(submission)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status, orgId } = await request.json();
    const db = getSupabaseAdmin();

    const { error } = await db
      .from("intake_submissions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
