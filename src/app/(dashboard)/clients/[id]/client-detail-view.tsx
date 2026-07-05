"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientForm } from "@/components/clients/ClientForm";
import {
  Mail,
  Phone,
  Calendar,
  Globe,
  MapPin,
  FileText,
  Heart,
  Users,
  Briefcase,
  Tag,
  Pencil,
  AlertTriangle,
  Target,
  UserCheck,
  Trash2,
  Send,
} from "lucide-react";
import Link from "next/link";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { CaseTypeLabel, CaseStatusLabel, CasePriorityLabel } from "@/types";
import type { CaseType, CaseStatus, CasePriority } from "@/types";
import type { ClientCreateInput } from "@/lib/api/validations";

// ═══════════════════════════════════════════════════════════════════════════
// ClientDetailView — client component: view mode + edit mode toggle
// ═══════════════════════════════════════════════════════════════════════════

interface SerializedClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  workPermitExpiry: string | null;
  maritalStatus: string | null;
  spouseName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  _count: { cases: number; documents: number };
  cases: Array<{
    id: string;
    title: string;
    caseType: string;
    status: string;
    priority: string;
    createdAt: string;
  }>;
}

interface ClientDetailViewProps {
  client: SerializedClient;
}

export function ClientDetailView({ client }: ClientDetailViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const isLead = (client.tags ?? []).includes("lead");

  async function convertToClient() {
    setConverting(true);
    const newTags = (client.tags ?? []).filter((t: string) => t !== "lead");
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
    setConverting(false);
    router.refresh();
  }

  const fullName = `${client.firstName} ${client.lastName}`;
  const initials = getInitials(fullName);
  const location = [client.city, client.province, client.country]
    .filter(Boolean)
    .join(", ");

  async function handleUpdate(data: ClientCreateInput) {
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: json.error?.message ?? "Failed to update client",
      };
    }

    setIsEditing(false);
    router.refresh();
    return { success: true };
  }

  async function handleDelete() {
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "DELETE",
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: json.error?.message ?? "Failed to delete client",
      };
    }

    router.push("/clients");
    router.refresh();
    return { success: true };
  }

  async function handleDeleteDirectly() {
    if (!window.confirm(`Delete ${fullName}? This cannot be undone.`)) return;
    const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/clients");
      router.refresh();
    } else {
      const json = await res.json();
      alert(json.error?.message ?? "Failed to delete client");
    }
  }

  async function handleResendLinks() {
    setResending(true);
    setResendMsg(null);
    const res = await fetch(`/api/clients/${client.id}/resend-links`, { method: "POST" });
    const json = await res.json();
    setResending(false);
    setResendMsg(res.ok ? "Links sent successfully!" : (json.error ?? "Failed to send links"));
    setTimeout(() => setResendMsg(null), 5000);
  }

  // ─── Edit Mode ──────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <ClientForm
        mode="edit"
        defaultValues={{
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          dateOfBirth: client.dateOfBirth,
          nationality: client.nationality,
          passportNumber: client.passportNumber,
          passportExpiry: client.passportExpiry,
          workPermitExpiry: client.workPermitExpiry,
          maritalStatus: client.maritalStatus,
          spouseName: client.spouseName,
          addressLine1: client.addressLine1,
          addressLine2: client.addressLine2,
          city: client.city,
          province: client.province,
          postalCode: client.postalCode,
          country: client.country,
          notes: client.notes,
          tags: client.tags,
        }}
        onSubmit={handleUpdate}
        onDelete={handleDelete}
      />
    );
  }

  // ─── View Mode ───────────────────────────────────────────────────────────

  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

  const expiryAlerts: { label: string; date: string }[] = [];
  if (client.passportExpiry && new Date(client.passportExpiry) <= sixMonthsFromNow) {
    expiryAlerts.push({ label: "Passport", date: client.passportExpiry });
  }
  if (client.workPermitExpiry && new Date(client.workPermitExpiry) <= sixMonthsFromNow) {
    expiryAlerts.push({ label: "Work Permit", date: client.workPermitExpiry });
  }

  return (
    <div className="space-y-6">
      {/* Expiry alerts */}
      {expiryAlerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">Document Expiry Alert</span>
          </div>
          <div className="space-y-1">
            {expiryAlerts.map(a => {
              const daysLeft = Math.ceil((new Date(a.date).getTime() - Date.now()) / 86400000);
              return (
                <p key={a.label} className="text-sm text-amber-700 dark:text-amber-300">
                  <span className="font-medium">{a.label}</span> expires on{" "}
                  {formatDate(a.date, "MMM d, yyyy")}
                  {daysLeft > 0 ? ` (${daysLeft} days)` : " — already expired"}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {fullName}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {client.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {client.email}
                </span>
              )}
              {client.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {client.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLead && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Target className="h-3 w-3" /> Lead
            </span>
          )}
          {isLead && (
            <button
              onClick={convertToClient}
              disabled={converting}
              className="inline-flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-400"
            >
              <UserCheck className="h-4 w-4" />
              {converting ? "Converting…" : "Convert to Client"}
            </button>
          )}
          <button
            onClick={handleResendLinks}
            disabled={resending}
            className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-400"
          >
            <Send className="h-4 w-4" />
            {resending ? "Sending…" : "Resend Links"}
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={handleDeleteDirectly}
            className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {resendMsg && (
        <div className={cn(
          "rounded-md px-4 py-2.5 text-sm font-medium",
          resendMsg.includes("success")
            ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/40"
            : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/40"
        )}>
          {resendMsg}
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={Briefcase}
          label="Cases"
          value={client._count.cases}
        />
        <StatCard
          icon={FileText}
          label="Documents"
          value={client._count.documents}
        />
        <StatCard
          icon={Calendar}
          label="Added"
          value={formatDate(client.createdAt, "MMM d, yyyy")}
        />
      </div>

      {/* Detail sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal info */}
        <DetailSection title="Personal Information">
          <DetailRow icon={Calendar} label="Date of birth" value={client.dateOfBirth ? formatDate(client.dateOfBirth, "MMM d, yyyy") : null} />
          <DetailRow icon={Globe} label="Nationality" value={client.nationality} />
          <DetailRow icon={Heart} label="Marital status" value={client.maritalStatus} />
          <DetailRow icon={Users} label="Spouse" value={client.spouseName} />
        </DetailSection>

        {/* Passport & Permit info */}
        <DetailSection title="Documents & Expiry">
          <DetailRow icon={FileText} label="Passport number" value={client.passportNumber} />
          <DetailRow icon={Calendar} label="Passport expiry" value={client.passportExpiry ? formatDate(client.passportExpiry, "MMM d, yyyy") : null} />
          <DetailRow icon={Calendar} label="Work permit expiry" value={client.workPermitExpiry ? formatDate(client.workPermitExpiry, "MMM d, yyyy") : null} />
        </DetailSection>

        {/* Address */}
        <DetailSection title="Address">
          <DetailRow icon={MapPin} label="Line 1" value={client.addressLine1} />
          <DetailRow icon={MapPin} label="Line 2" value={client.addressLine2} />
          <DetailRow icon={MapPin} label="City" value={client.city} />
          <DetailRow icon={MapPin} label="Province" value={client.province} />
          <DetailRow icon={MapPin} label="Postal code" value={client.postalCode} />
          <DetailRow icon={Globe} label="Country" value={client.country} />
        </DetailSection>

        {/* Notes & Tags */}
        <DetailSection title="Notes & Tags">
          {client.notes ? (() => {
            // Try to parse JSON blob from portal intake
            try {
              const parsed = JSON.parse(client.notes);
              const labelMap: Record<string, string> = {
                currentStatus: "Immigration Status",
                previousVisas: "Previous Visas",
                languageTest: "Language Test",
                languageScore: "Language Score",
                educationLevel: "Education Level",
                jobTitle: "Job Title",
                nocCode: "NOC Code",
                yearsOfExperience: "Years Experience",
                additionalNotes: "Additional Notes",
              };
              const entries = Object.entries(parsed).filter(([, v]) => v);
              if (entries.length > 0) {
                return (
                  <dl className="space-y-1.5">
                    {entries.map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-sm">
                        <dt className="shrink-0 text-zinc-500 dark:text-zinc-400">{labelMap[k] ?? k}:</dt>
                        <dd className="font-medium text-zinc-900 dark:text-zinc-50">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                );
              }
            } catch {
              // not JSON — render as plain text
            }
            return (
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {client.notes}
              </p>
            );
          })() : (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">No notes</p>
          )}
          {client.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {client.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </DetailSection>
      </div>

      {/* Associated cases */}
      {client.cases.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Recent Cases
          </h2>
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Case
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Priority
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {client.cases.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/clients/${client.id}/application`}
                        className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                      >
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {CaseTypeLabel[c.caseType as CaseType] ?? c.caseType}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={c.status as CaseStatus} />
                    </td>
                    <td className="px-4 py-2.5">
                      <PriorityBadge priority={c.priority as CasePriority} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800">
        <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
      </div>
      <div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="ml-auto truncate font-medium text-zinc-900 dark:text-zinc-50">
        {value ?? "—"}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: CaseStatus }) {
  const colors: Record<CaseStatus, string> = {
    INTAKE: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    DOCUMENT_COLLECTION: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    FORM_FILLING: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    READY_TO_SUBMIT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    SUBMITTED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    AOR_RECEIVED: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    IN_PROCESS: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    ADDITIONAL_DOCS_REQUESTED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    DECISION_MADE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    REFUSED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    CLOSED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
        colors[status],
      )}
    >
      {CaseStatusLabel[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: CasePriority }) {
  const colors: Record<CasePriority, string> = {
    LOW: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
    NORMAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    URGENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
        colors[priority],
      )}
    >
      {CasePriorityLabel[priority]}
    </span>
  );
}
