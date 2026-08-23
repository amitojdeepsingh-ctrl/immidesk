import type { Metadata } from "next";
import Link from "next/link";
import { CLIENT_CHECKLISTS, CLIENT_CHECKLIST_LABELS, clientChecklistAsText } from "@/lib/client-checklists";
import { CASE_TYPE_LABELS } from "@/lib/checklists";
import { getOrgBranding, OrgBrandHeader, OrgBrandFooter } from "@/components/branding/OrgBrand";
import { ChecklistShareButtons, TypePicker, ChecklistItems } from "./share-buttons";

interface PageProps {
  searchParams: Promise<{ org?: string; type?: string }>;
}

const ALL_LABELS = { ...CASE_TYPE_LABELS, ...CLIENT_CHECKLIST_LABELS };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { org: slug, type } = await searchParams;
  const branding = await getOrgBranding(slug);
  const label = type && ALL_LABELS[type] ? ALL_LABELS[type] : "Document Checklist";
  return {
    title: `${branding?.name ?? "Immigration Services"} — ${label} Checklist`,
    description: `Official document checklist for your ${label} application.`,
  };
}

export default async function ChecklistPage({ searchParams }: PageProps) {
  const { org: slug, type: typeRaw } = await searchParams;
  const branding = await getOrgBranding(slug);
  const type = typeRaw && CLIENT_CHECKLISTS[typeRaw] ? typeRaw : "EXPRESS_ENTRY";
  const items = CLIENT_CHECKLISTS[type];
  const label = ALL_LABELS[type] ?? type.replace(/_/g, " ");
  const shareUrl = `/checklist?${slug ? `org=${slug}&` : ""}type=${type}`;
  const waText = clientChecklistAsText(type, { firmName: branding?.name, label });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {branding && <OrgBrandHeader branding={branding} />}

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Document Checklist</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Everything you need for your application — prepared by {branding?.name ?? "your consultant"}.
          </p>
        </div>

        {/* Type picker */}
        <div className="mb-5 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Application type
          </label>
          <TypePicker
            value={type}
            slug={slug}
            options={Object.keys(CLIENT_CHECKLISTS).map((key) => ({
              value: key,
              label: ALL_LABELS[key] ?? key.replace(/_/g, " "),
            }))}
          />
          <p className="mt-2 text-xs text-zinc-400">
            Not sure which applies to you? Message us — we will confirm the right category for your goals.
          </p>
        </div>

        {/* Checklist card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{label}</h2>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Clear scans are fine to start — keep originals safe. Tick items as you collect them.
          </p>
          <ul className="space-y-2.5">
            <ChecklistItems items={items} />
          </ul>
        </div>

        {/* Share buttons (client component) */}
        <ChecklistShareButtons waText={waText} shareUrl={shareUrl} label={label} />

        <p className="mt-6 text-center text-xs text-zinc-400">
          Need help with any document?{" "}
          {branding?.phone ? (
            <a href={`https://wa.me/${branding.phone.replace(/[^+\d]/g, "")}`} className="underline">
              Message us on WhatsApp
            </a>
          ) : (
            <Link href="/" className="underline">Contact us</Link>
          )}{" "}
          — we prepare all government forms for you.
        </p>
      </div>

      {branding && (
        <OrgBrandFooter
          branding={branding}
          disclaimer="This checklist is general guidance and may be adjusted for your personal situation."
        />
      )}
    </div>
  );
}
