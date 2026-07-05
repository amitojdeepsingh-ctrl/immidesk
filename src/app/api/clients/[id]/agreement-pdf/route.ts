import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateAgreementPdf } from "@/lib/pdf/generator";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  WORK_PERMIT: "Work Permit",
  STUDY_PERMIT: "Study Permit",
  VISITOR_VISA: "Visitor Visa",
  PERMANENT_RESIDENCE: "Permanent Residence",
  EXPRESS_ENTRY: "Express Entry",
  FAMILY_SPONSORSHIP: "Family Sponsorship",
  CITIZENSHIP: "Citizenship Application",
  RESTORATION_VISITOR: "Restoration of Status – Visitor",
  RESTORATION_WORKER: "Restoration of Status – Worker",
  RESTORATION_STUDENT: "Restoration of Status – Student",
  PRRA: "Pre-Removal Risk Assessment (PRRA)",
  REFUGEE: "Refugee Protection",
  HUMANITARIAN: "Humanitarian & Compassionate",
  OTHER: "Immigration Services",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { organization } = await requireAuth();
    const { id: clientId } = await params;
    const db = getSupabaseAdmin();

    // Fetch latest signed agreement with all fields needed for PDF
    const { data: agreement, error: agreementErr } = await db
      .from("ServiceAgreement")
      .select("id, status, title, description, serviceType, feeAmount, feeCurrency, feeStructure, paymentSchedule, startDate, endDate, terms, signedAt, pdfStoragePath, signatureDataUrl, client:Client!inner(firstName, lastName, email, phone, nationality, addressLine1, city, province, postalCode, country), organization:Organization!inner(name, phone, ciccRegistrationNumber, addressLine1, city, province, postalCode)")
      .eq("clientId", clientId)
      .eq("organizationId", organization.id)
      .eq("status", "SIGNED")
      .order("signedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (agreementErr) {
      console.error("agreement-pdf fetch error:", agreementErr);
      return NextResponse.json({ error: "Failed to fetch agreement" }, { status: 500 });
    }

    if (!agreement) {
      return NextResponse.json({ error: "No signed agreement found" }, { status: 404 });
    }

    const client = Array.isArray(agreement.client) ? agreement.client[0] : agreement.client;
    const org = Array.isArray(agreement.organization) ? agreement.organization[0] : agreement.organization;

    // Try stored PDF first
    if (agreement.pdfStoragePath && agreement.pdfStoragePath.endsWith(".pdf")) {
      const { data: urlData } = await db.storage
        .from("client-documents")
        .createSignedUrl(agreement.pdfStoragePath, 300);
      if (urlData?.signedUrl) {
        const filename = `${agreement.title.replace(/[^a-z0-9]/gi, "_")}_signed.pdf`;
        return NextResponse.json({ url: urlData.signedUrl, filename, signedAt: agreement.signedAt });
      }
    }

    // Use DB-stored signature (most reliable — set at sign time)
    // Fall back to storage fetch for agreements signed before this column was added
    let signatureDataUrl: string | undefined = (agreement as Record<string, unknown>).signatureDataUrl as string | undefined;

    if (!signatureDataUrl) {
      const sigPath = `${organization.id}/agreements/${agreement.id}/signature.png`;
      const { data: sigBlob } = await db.storage
        .from("client-documents")
        .download(sigPath)
        .catch(() => ({ data: null }));

      if (sigBlob) {
        const arrayBuffer = await sigBlob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        signatureDataUrl = `data:image/png;base64,${base64}`;
      }
    }

    // Generate PDF on-the-fly
    const fmtFee = new Intl.NumberFormat("en-CA", { style: "currency", currency: agreement.feeCurrency }).format(agreement.feeAmount);
    const terms = (agreement.terms ?? {}) as Record<string, unknown>;
    const clientAddress = [client.addressLine1, client.city, client.province, client.postalCode, client.country].filter(Boolean).join(", ");
    const orgAddress = [org.addressLine1, org.city, org.province, org.postalCode].filter(Boolean).join(", ");
    const serviceLabel = SERVICE_TYPE_LABELS[agreement.serviceType] ?? agreement.serviceType.replace(/_/g, " ");
    const signedDate = new Date(agreement.signedAt as string).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

    const pdfBuffer = await generateAgreementPdf({
      firm: {
        name: org.name,
        rcicName: "Amitojdeep Singh",
        address: orgAddress || undefined,
        ciccNumber: org.ciccRegistrationNumber ?? undefined,
        phone: org.phone ?? undefined,
      },
      client: {
        fullName: `${client.firstName} ${client.lastName}`,
        email: client.email,
        phone: client.phone ?? undefined,
        address: clientAddress || undefined,
        nationality: client.nationality ?? undefined,
      },
      agreement: {
        title: agreement.title,
        description: agreement.description ?? `${serviceLabel} services provided by ${org.name}.`,
        serviceType: agreement.serviceType as never,
        feeAmount: agreement.feeAmount,
        feeCurrency: agreement.feeCurrency,
        feeStructure: (agreement.feeStructure ?? "flat") as never,
        paymentSchedule: (agreement.paymentSchedule ?? "upfront") as never,
        startDate: agreement.startDate ?? undefined,
        endDate: agreement.endDate ?? undefined,
        signatureDataUrl,
        terms: {
          scopeOfWork: String(terms.scopeOfWork ?? `Provision of ${serviceLabel} services as discussed and agreed upon with your consultant.`),
          feesAndPayment: String(terms.feesAndPayment ?? `Total fee: ${fmtFee}. Payment is due as per the agreed schedule.`),
          clientResponsibilities: String(terms.clientResponsibilities ?? "The client agrees to provide accurate, complete, and timely information and documents required for the application."),
          confidentiality: String(terms.confidentiality ?? "All information shared between the parties is kept strictly confidential and will not be disclosed to third parties without consent."),
          termination: String(terms.termination ?? "Either party may terminate this agreement with 15 days written notice. Fees for work completed are non-refundable."),
          governingLaw: String(terms.governingLaw ?? "Province of British Columbia, Canada"),
          additionalClauses: Array.isArray(terms.additionalClauses) ? (terms.additionalClauses as string[]) : undefined,
        },
      },
      meta: {
        agreementNumber: agreement.id.slice(0, 8).toUpperCase(),
        generatedAt: signedDate,
        version: "1.0",
      },
    });

    const filename = `${agreement.title.replace(/[^a-z0-9]/gi, "_")}_signed.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("agreement-pdf error:", err);
    return NextResponse.json({ error: "Server error", detail: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
