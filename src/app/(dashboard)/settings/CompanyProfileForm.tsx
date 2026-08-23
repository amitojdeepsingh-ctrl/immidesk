"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompanyProfile {
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  ciccRegistrationNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  logoUrl: string | null;
}

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-500/40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50";

function F({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputCls, "mt-1")}
      />
    </div>
  );
}

export function CompanyProfileForm({ profile, canEdit }: { profile: CompanyProfile; canEdit: boolean }) {
  const [form, setForm] = useState<CompanyProfile>(profile);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const router = useRouter();

  const set = (key: keyof CompanyProfile) => (v: string) => setForm((p) => ({ ...p, [key]: v }));

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/organization/logo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Upload failed");
      setForm((p) => ({ ...p, logoUrl: json.data.logoUrl }));
      setMsg({ ok: true, text: "Logo uploaded — remember to Save" });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Upload failed" });
    }
    setUploadingLogo(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Save failed");
      setMsg({ ok: true, text: "Company profile saved" });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Save failed" });
    }
    setSaving(false);
  }

  return (
    <form onSubmit={save} className="space-y-4 px-6 py-5">
      {!canEdit && (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          Only organization owners can edit company details.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Company Name" value={form.name} onChange={set("name")} />
        <F
          label="Contact Email (Reply-To on client emails)"
          value={form.email ?? ""}
          onChange={set("email")}
          placeholder="info@yourfirm.com"
          type="email"
        />
        <F label="Phone" value={form.phone ?? ""} onChange={set("phone")} placeholder="+1 (416) 555-0123" />
        <F label="Website" value={form.website ?? ""} onChange={set("website")} placeholder="https://yourfirm.com" />
        <F label="RCIC Registration Number" value={form.ciccRegistrationNumber ?? ""} onChange={set("ciccRegistrationNumber")} placeholder="R123456" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Address Line 1" value={form.addressLine1 ?? ""} onChange={set("addressLine1")} />
        <F label="Address Line 2" value={form.addressLine2 ?? ""} onChange={set("addressLine2")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <F label="City" value={form.city ?? ""} onChange={set("city")} />
        <F label="Province" value={form.province ?? ""} onChange={set("province")} />
        <F label="Postal Code" value={form.postalCode ?? ""} onChange={set("postalCode")} />
        <F label="Country" value={form.country ?? "CA"} onChange={set("country")} />
      </div>

      <F label="Logo URL" value={form.logoUrl ?? ""} onChange={set("logoUrl")} placeholder="https://yourfirm.com/logo.png" />

      <div className="flex flex-wrap items-center gap-4">
        {form.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.logoUrl}
            alt="Logo preview"
            className="h-14 w-14 rounded-lg border border-zinc-200 object-contain dark:border-zinc-700"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-400 dark:border-zinc-700">
            No logo
          </div>
        )}
        <div>
          <label className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800",
            (!canEdit || uploadingLogo) && "pointer-events-none opacity-50",
          )}>
            {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {uploadingLogo ? "Uploading…" : "Upload logo (PNG/JPG/SVG, ≤2 MB)"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo(f);
                e.target.value = "";
              }}
            />
          </label>
          <p className="mt-1 text-xs text-zinc-400">Shown on client-facing pages (calculator, checklists).</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <p className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Mail className="h-3.5 w-3.5" />
          Contact email is used as the Reply-To on all client emails.
        </p>
        <div className="flex items-center gap-3">
          {msg && (
            <span className={cn("text-xs", msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
              {msg.text}
            </span>
          )}
          <button
            type="submit"
            disabled={!canEdit || saving}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500 dark:text-white"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Building2 className="h-3.5 w-3.5" />}
            Save Company Profile
          </button>
        </div>
      </div>
    </form>
  );
}
