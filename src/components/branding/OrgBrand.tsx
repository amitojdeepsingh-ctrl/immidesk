import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface OrgBranding {
  name: string;
  slug?: string;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

const DEFAULT_ORG_SLUG = process.env["PLATFORM_ORG_SLUG"] ?? "amitoj-singhs-workspace";

export async function getOrgBranding(slug?: string): Promise<OrgBranding | undefined> {
  try {
    const db = getSupabaseAdmin();
    const effective = slug && /^[a-z0-9-]{2,}$/i.test(slug) ? slug : DEFAULT_ORG_SLUG;
    const { data: org } = await db
      .from("Organization")
      .select("name, slug, email, phone, logoUrl, website")
      .eq("slug", effective)
      .maybeSingle();
    if (!org) return undefined;
    return {
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      phone: org.phone,
      email: org.email,
      website: org.website,
    };
  } catch {
    return undefined;
  }
}

/** Branded top bar — logo, firm name, phone + email quick contacts. */
export function OrgBrandHeader({ branding }: { branding: OrgBranding }) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt={`${branding.name} logo`}
              className="h-11 w-11 rounded-lg border border-zinc-200 object-contain dark:border-zinc-700"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
              {branding.name.slice(0, 1)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{branding.name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Immigration Consulting Services</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-0.5 text-xs sm:items-end">
          {branding.phone && (
            <a href={`tel:${branding.phone.replace(/[^+\d]/g, "")}`} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
              📞 {branding.phone}
            </a>
          )}
          {branding.email && (
            <a href={`mailto:${branding.email}`} className="text-zinc-500 hover:underline dark:text-zinc-400">
              ✉️ {branding.email}
            </a>
          )}
          {branding.website && (
            <a href={branding.website.startsWith("http") ? branding.website : `https://${branding.website}`} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:underline dark:text-zinc-400">
              🌐 {branding.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

/** Branded footer with contact repeat + disclaimer. */
export function OrgBrandFooter({ branding, disclaimer }: { branding: OrgBranding; disclaimer?: string }) {
  return (
    <footer className="border-t border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{branding.name}</p>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          {branding.phone && (
            <a href={`tel:${branding.phone.replace(/[^+\d]/g, "")}`} className="hover:underline">
              📞 {branding.phone}
            </a>
          )}
          {branding.email && (
            <a href={`mailto:${branding.email}`} className="hover:underline">
              ✉️ {branding.email}
            </a>
          )}
          {branding.website && (
            <a href={branding.website.startsWith("http") ? branding.website : `https://${branding.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
              🌐 {branding.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          )}
        </p>
        {disclaimer && <p className="mt-2 text-[11px] text-zinc-400">{disclaimer}</p>}
      </div>
    </footer>
  );
}
