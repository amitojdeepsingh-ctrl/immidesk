"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ChevronDown,
  Users,
  User,
} from "lucide-react";
import {
  PIS_SECTIONS,
  PIS_PROGRAMS,
  STATUTORY_QUESTIONS,
  type ApplicantDraft,
  type PisField,
  type PisSection,
  type EducationRow,
  type EmploymentRow,
  type TravelRow,
  type AddressHistoryRow,
  type ChildDraft,
} from "@/lib/intake/pis-schema";

// ─── Props ─────────────────────────────────────────────────────────────────

export interface ExistingSubmission {
  applicantLabel: string;
  status: string;
  filledData: Record<string, unknown>;
}

interface Props {
  token: string;
  caseId: string;
  defaultProgramType?: string;
  clientName?: string;
  existing?: ExistingSubmission[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++idCounter}-${Date.now()}`;

function emptyPis() {
  return Object.fromEntries(PIS_SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, ""])));
}

function applicantFromPrefill(sub: ExistingSubmission | undefined, role: "PRIMARY" | "SPOUSE" | "CHILD"): ApplicantDraft {
  if (!sub) {
    return {
      role,
      applicantLabel: role,
      firstName: "",
      lastName: "",
      willApply: role === "PRIMARY",
      pis: emptyPis(),
      education: [],
      employment: [],
      travel: [],
      addressHistory: [],
      statutory: {},
    };
  }
  const data = sub.filledData ?? {};
  const meta = (data._meta ?? {}) as Record<string, unknown>;
  const scalars: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (["education", "employment", "travel", "addressHistory", "statutory", "_meta"].includes(k)) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") scalars[k] = String(v ?? "");
  }
  return {
    role,
    applicantLabel: sub.applicantLabel,
    firstName: String(meta.firstName ?? scalars.givenNames ?? ""),
    lastName: String(meta.lastName ?? scalars.surname ?? ""),
    willApply: meta.willApply !== false && role === "PRIMARY",
    relationLabel: meta.relationLabel ? String(meta.relationLabel) : undefined,
    pis: scalars,
    education: (data.education ?? []) as EducationRow[],
    employment: (data.employment ?? []) as EmploymentRow[],
    travel: (data.travel ?? []) as TravelRow[],
    addressHistory: (data.addressHistory ?? []) as AddressHistoryRow[],
    statutory: (data.statutory ?? {}) as ApplicantDraft["statutory"],
  };
}

// ─── Shared field renderer ─────────────────────────────────────────────────

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50";
const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1";

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: PisField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </label>
      {field.type === "select" || field.type === "boolean" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">{field.type === "boolean" ? "—" : "Select…"}</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === "date" ? "date" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={inputClass}
          placeholder={field.type === "text" ? field.label : ""}
        />
      )}
    </div>
  );
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StaticSections({
  sections,
  values,
  onChange,
}: {
  sections: PisSection[];
  values: Record<string, string>;
  onChange: (key: string, v: string) => void;
}) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <SectionCard key={section.key} title={section.title} hint={section.hint}>
          <div className={section.wide ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
            {section.fields.map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                value={values[f.key] ?? ""}
                onChange={(v) => onChange(f.key, v)}
              />
            ))}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

// ─── Statutory questions block ─────────────────────────────────────────────

function StatutoryBlock({
  statutory,
  onChange,
}: {
  statutory: Record<string, { answer?: "Yes" | "No"; explanation?: string }>;
  onChange: (num: number, patch: { answer?: "Yes" | "No"; explanation?: string }) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <SectionCard
      title="Additional Questions (Statutory)"
      hint="Read the following questions carefully and answer truthfully (for you, your spouse/partner or dependants)."
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-3 flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {open ? "Hide" : "Show"} 18 questions
      </button>
      {open && (
        <div className="space-y-3">
          {STATUTORY_QUESTIONS.map((q) => (
            <div
              key={q.number}
              className="rounded-md border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-zinc-800 dark:text-zinc-200">
                  <span className="mr-1.5 font-semibold text-zinc-400">{q.number}.</span>
                  {q.text}
                </p>
                <div className="flex shrink-0 gap-1">
                  {(["No", "Yes"] as const).map((opt) => {
                    const active = statutory[q.number]?.answer === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          onChange(q.number, {
                            answer: active ? undefined : opt,
                            explanation: active ? undefined : statutory[q.number]?.explanation,
                          })
                        }
                        className={`rounded px-2.5 py-1 text-xs font-medium ${
                          active
                            ? opt === "Yes"
                              ? "bg-amber-500 text-white"
                              : "bg-emerald-500 text-white"
                            : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
              {statutory[q.number]?.answer === "Yes" && (
                <textarea
                  className={`${inputClass} mt-2 resize-none`}
                  rows={2}
                  placeholder="Provide a detailed explanation…"
                  value={statutory[q.number]?.explanation ?? ""}
                  onChange={(e) =>
                    onChange(q.number, { answer: "Yes", explanation: e.target.value })
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Repeater editors ───────────────────────────────────────────────────────

function RepeaterHeader({
  title,
  count,
  onAdd,
  accent,
}: {
  title: string;
  count: number;
  onAdd: () => void;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {title}
        {count > 0 && <span className="ml-1.5 text-xs text-zinc-400">({count})</span>}
      </h3>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <Plus className="h-3 w-3" /> Add {accent ? "Child" : "Row"}
      </button>
    </div>
  );
}

function GridField({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  type?: "date" | "text" | "select";
  options?: string[];
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type === "date" ? "date" : "text"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

function RepeaterRows<T extends { id: string }>({
  rows,
  cols,
  renderColumns,
  onUpdate,
  onRemove,
}: {
  rows: T[];
  cols: number;
  renderColumns: (row: T, update: (key: keyof T, v: string) => void) => React.ReactNode;
  onUpdate: (i: number, row: T) => void;
  onRemove: (i: number) => void;
}) {
  if (rows.length === 0) {
    return <p className="mt-2 text-xs text-zinc-400">No entries added.</p>;
  }
  return (
    <div className="mt-3 space-y-3">
      {rows.map((row, i) => (
        <div
          key={row.id}
          className="relative rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50"
        >
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute right-2 top-2 text-zinc-400 hover:text-red-500"
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <div className={`grid gap-3 ${cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            {renderColumns(row, (key, v) =>
              onUpdate(i, { ...row, [key]: v } as unknown as T),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EducationEditor({
  rows,
  onChange,
}: {
  rows: EducationRow[];
  onChange: (rows: EducationRow[]) => void;
}) {
  return (
    <SectionCard
      title="Education History"
      hint="Years of school completed — Primary, Secondary, College, University."
    >
      <RepeaterHeader title="Education" count={rows.length} onAdd={() => onChange([...rows, { id: nextId("edu") }])} />
      <RepeaterRows<EducationRow>
        rows={rows}
        cols={3}
        renderColumns={(r, u) => (
          <>
            <GridField label="From" value={r.from} onChange={(v) => u("from", v)} type="date" />
            <GridField label="To" value={r.to} onChange={(v) => u("to", v)} type="date" />
            <GridField label="Name of School" value={r.schoolName} onChange={(v) => u("schoolName", v)} type="text" />
            <GridField label="City/Country" value={r.cityCountry} onChange={(v) => u("cityCountry", v)} type="text" />
            <GridField label="Certificate / Diploma" value={r.certificate} onChange={(v) => u("certificate", v)} type="text" />
            <GridField label="Area of Study (or 'General')" value={r.areaOfStudy} onChange={(v) => u("areaOfStudy", v)} type="text" />
          </>
        )}
        onUpdate={(i, row) => onChange(rows.map((x, j) => (j === i ? row : x)))}
        onRemove={(i) => onChange(rows.filter((_, j) => j !== i))}
      />
    </SectionCard>
  );
}

function EmploymentEditor({
  rows,
  onChange,
}: {
  rows: EmploymentRow[];
  onChange: (rows: EmploymentRow[]) => void;
}) {
  return (
    <SectionCard
      title="Employment History"
      hint="Past 10 years — beginning with current, include part-time positions."
    >
      <RepeaterHeader title="Employment" count={rows.length} onAdd={() => onChange([...rows, { id: nextId("emp") }])} />
      <RepeaterRows<EmploymentRow>
        rows={rows}
        cols={3}
        renderColumns={(r, u) => (
          <>
            <GridField label="From" value={r.from} onChange={(v) => u("from", v)} type="date" />
            <GridField label="To" value={r.to} onChange={(v) => u("to", v)} type="date" />
            <GridField label="Job Title" value={r.jobTitle} onChange={(v) => u("jobTitle", v)} type="text" />
            <GridField label="City/Country" value={r.cityCountry} onChange={(v) => u("cityCountry", v)} type="text" />
            <GridField label="Company / Employer / School" value={r.employer} onChange={(v) => u("employer", v)} type="text" />
            <GridField label="Street Address (CANADIAN employers only)" value={r.canadianEmployerAddress} onChange={(v) => u("canadianEmployerAddress", v)} type="text" />
          </>
        )}
        onUpdate={(i, row) => onChange(rows.map((x, j) => (j === i ? row : x)))}
        onRemove={(i) => onChange(rows.filter((_, j) => j !== i))}
      />
    </SectionCard>
  );
}

function TravelEditor({
  rows,
  onChange,
}: {
  rows: TravelRow[];
  onChange: (rows: TravelRow[]) => void;
}) {
  return (
    <SectionCard title="Travel History" hint="All international travel in the last 10 years.">
      <RepeaterHeader title="Travel" count={rows.length} onAdd={() => onChange([...rows, { id: nextId("trv") }])} />
      <RepeaterRows<TravelRow>
        rows={rows}
        cols={3}
        renderColumns={(r, u) => (
          <>
            <GridField label="City and Country" value={r.cityCountry} onChange={(v) => u("cityCountry", v)} type="text" />
            <GridField label="Purpose of Trip" value={r.purpose} onChange={(v) => u("purpose", v)} type="text" />
            <GridField label="From" value={r.from} onChange={(v) => u("from", v)} type="date" />
            <GridField label="To" value={r.to} onChange={(v) => u("to", v)} type="date" />
            <GridField label="Visa Issued" value={r.visaIssued} onChange={(v) => u("visaIssued", v)} type="text" />
          </>
        )}
        onUpdate={(i, row) => onChange(rows.map((x, j) => (j === i ? row : x)))}
        onRemove={(i) => onChange(rows.filter((_, j) => j !== i))}
      />
    </SectionCard>
  );
}

function AddressHistoryEditor({
  rows,
  onChange,
}: {
  rows: AddressHistoryRow[];
  onChange: (rows: AddressHistoryRow[]) => void;
}) {
  return (
    <SectionCard title="Address History" hint="All addresses where you lived for the past 10 years.">
      <RepeaterHeader title="Addresses" count={rows.length} onAdd={() => onChange([...rows, { id: nextId("addr") }])} />
      <RepeaterRows<AddressHistoryRow>
        rows={rows}
        cols={3}
        renderColumns={(r, u) => (
          <>
            <GridField label="From" value={r.from} onChange={(v) => u("from", v)} type="date" />
            <GridField label="To" value={r.to} onChange={(v) => u("to", v)} type="text" />
            <GridField label="Street Name and No." value={r.street} onChange={(v) => u("street", v)} type="text" />
            <GridField label="City and Province" value={r.cityProvince} onChange={(v) => u("cityProvince", v)} type="text" />
            <GridField label="Postal Code" value={r.postalCode} onChange={(v) => u("postalCode", v)} type="text" />
            <GridField label="Country" value={r.country} onChange={(v) => u("country", v)} type="text" />
          </>
        )}
        onUpdate={(i, row) => onChange(rows.map((x, j) => (j === i ? row : x)))}
        onRemove={(i) => onChange(rows.filter((_, j) => j !== i))}
      />
    </SectionCard>
  );
}

// ─── Full PIS form for one applicant (PRIMARY / SPOUSE) ────────────────────

function ApplicantPisForm({
  title,
  applicant,
  onChange,
}: {
  title: string;
  applicant: ApplicantDraft;
  onChange: (patch: Partial<ApplicantDraft>) => void;
}) {
  const [open, setOpen] = useState(true);
  const setPis = (key: string, v: string) => onChange({ pis: { ...applicant.pis, [key]: v } });

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </button>
      {open && (
        <>
          <StaticSections sections={PIS_SECTIONS} values={applicant.pis} onChange={setPis} />
          <EducationEditor
            rows={applicant.education}
            onChange={(education) => onChange({ education })}
          />
          <EmploymentEditor
            rows={applicant.employment}
            onChange={(employment) => onChange({ employment })}
          />
          <TravelEditor rows={applicant.travel} onChange={(travel) => onChange({ travel })} />
          <AddressHistoryEditor
            rows={applicant.addressHistory}
            onChange={(addressHistory) => onChange({ addressHistory })}
          />
          <StatutoryBlock
            statutory={applicant.statutory}
            onChange={(number, patch) =>
              onChange({
                statutory: { ...applicant.statutory, [number]: patch },
              })
            }
          />
        </>
      )}
    </div>
  );
}

// ─── Child compact identity form ───────────────────────────────────────────

function ChildCompactForm({
  child,
  onChange,
}: {
  child: ChildDraft;
  onChange: (patch: Partial<ChildDraft>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <GridField label="First Name" value={child.firstName} onChange={(v) => onChange({ firstName: v })} />
      <GridField label="Last Name" value={child.lastName} onChange={(v) => onChange({ lastName: v })} />
      <GridField label="Date of Birth" value={child.dateOfBirth} onChange={(v) => onChange({ dateOfBirth: v })} type="date" />
      <GridField label="Nationality" value={child.nationality} onChange={(v) => onChange({ nationality: v })} />
    </div>
  );
}

// ─── Will-apply toggle ─────────────────────────────────────────────────────

function WillApplyToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</p>
      </div>
      <div className="flex gap-1">
        {(
          [
            { v: false, label: "Not applying", cls: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" },
            { v: true, label: "Applying with you", cls: "bg-emerald-500 text-white" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.v)}
            className={`rounded px-2.5 py-1 text-xs font-medium ${
              value === opt.v ? opt.cls : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-500"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main form ─────────────────────────────────────────────────────────────

export default function IntakeForm({
  token,
  caseId,
  defaultProgramType = "",
  clientName,
  existing = [],
}: Props) {
  const [step, setStep] = useState(0);
  const [programType, setProgramType] = useState(defaultProgramType);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const [primary, setPrimary] = useState<ApplicantDraft>(() =>
    applicantFromPrefill(existing.find((s) => s.applicantLabel === "PRIMARY") as unknown as ExistingSubmission, "PRIMARY"),
  );
  const [spouse, setSpouse] = useState<ApplicantDraft>(() =>
    applicantFromPrefill(existing.find((s) => s.applicantLabel === "SPOUSE") as unknown as ExistingSubmission, "SPOUSE"),
  );
  const [children, setChildren] = useState<ChildDraft[]>(() =>
    existing
      .filter((s) => s.applicantLabel?.startsWith("CHILD"))
      .map((s) => {
        const meta = (s.filledData?._meta ?? {}) as Record<string, unknown>;
        return {
          id: nextId("child"),
          firstName: String(meta.firstName ?? ""),
          lastName: String(meta.lastName ?? ""),
          dateOfBirth: String((s.filledData?.dateOfBirth ?? "") as string),
          nationality: String((s.filledData?.birthCountry ?? "") as string),
          willApply: meta.willApply === true,
        };
      }),
  );

  const steps = useMemo(
    () => [
      { id: "program", label: "Program" },
      { id: "primary", label: "Primary Applicant" },
      { id: "family", label: "Spouse & Dependants" },
      { id: "review", label: "Review" },
    ],
    [],
  );

  // ── Children → applicant drafts (only shown fully when applying) ────────

  const familyApplicants: ApplicantDraft[] = useMemo(() => {
    const list: ApplicantDraft[] = [];
    if (spouse.firstName || spouse.lastName || spouse.willApply) list.push(spouse);
    children.forEach((c, i) => {
      list.push({
        role: "CHILD",
        applicantLabel: `CHILD#${i + 1}`,
        firstName: c.firstName,
        lastName: c.lastName,
        willApply: c.willApply,
        relationLabel: "Dependent child",
        pis: {
          givenNames: c.firstName,
          surname: c.lastName,
          dateOfBirth: c.dateOfBirth ?? "",
          birthCountry: c.nationality ?? "",
          ...emptyPis(),
        },
        education: [],
        employment: [],
        travel: [],
        addressHistory: [],
        statutory: {},
      });
    });
    return list;
  }, [spouse, children]);

  const fullPisForChild = (i: number): ApplicantDraft => {
    const c = children[i];
    return {
      role: "CHILD",
      applicantLabel: `CHILD#${i + 1}`,
      firstName: c.firstName,
      lastName: c.lastName,
      willApply: true,
      relationLabel: "Dependent child",
      pis: {
        ...emptyPis(),
        givenNames: c.firstName,
        surname: c.lastName,
        dateOfBirth: c.dateOfBirth ?? "",
        birthCountry: c.nationality ?? "",
      },
      education: [],
      employment: [],
      travel: [],
      addressHistory: [],
      statutory: {},
    };
  }

  // Child full-PIS editors (lazy materialized when child applies)
  const [childPisEditors, setChildPisEditors] = useState<Record<number, ApplicantDraft>>({});
  const ensureChildEditor = (i: number) => {
    setChildPisEditors((prev) => {
      if (prev[i]) return prev;
      return { ...prev, [i]: fullPisForChild(i) };
    });
  };

  const setChild = (i: number, patch: Partial<ChildDraft>) => {
    setChildren((list) => list.map((c, j) => (j === i ? { ...c, ...patch } : c)));
    setChildPisEditors((prev) =>
      prev[i]
        ? {
            ...prev,
            [i]: {
              ...prev[i],
              firstName: patch.firstName ?? prev[i].firstName,
              lastName: patch.lastName ?? prev[i].lastName,
              pis: {
                ...prev[i].pis,
                ...(patch.firstName ? { givenNames: patch.firstName } : {}),
                ...(patch.lastName ? { surname: patch.lastName } : {}),
                ...(patch.dateOfBirth !== undefined ? { dateOfBirth: patch.dateOfBirth ?? "" } : {}),
                ...(patch.nationality !== undefined ? { birthCountry: patch.nationality ?? "" } : {}),
              },
            },
          }
        : prev,
    );
  };

  const addChild = () =>
    setChildren([...children, { id: nextId("child"), firstName: "", lastName: "", willApply: false }]);
  const removeChild = (i: number) => {
    setChildren(children.filter((_, j) => j !== i));
    setChildPisEditors((prev) => {
      const next = { ...prev };
      delete next[i];
      return next;
    });
  };

  const spouseApplicants = spouse.firstName || spouse.lastName || spouse.willApply ? [spouse] : [];

  // ── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const familyDrafts: ApplicantDraft[] = [];
      if (spouse.firstName || spouse.lastName || spouse.willApply) {
        familyDrafts.push({ ...spouse, applicantLabel: "SPOUSE", role: "SPOUSE" });
      }
      children.forEach((_c, i) => {
        familyDrafts.push(childPisEditors[i] ?? fullPisForChild(i));
      });

      const res = await fetch("/api/client-portal/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          caseId,
          intake: { programType, primary, family: familyDrafts },
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Submission failed");
      setSubmitted(true);
    } catch (err: unknown) {
      console.error(err);
      alert("Something went wrong submitting the form. Please try again.");
    }
    setSending(false);
  };

  // ── Success screen ──────────────────────────────────────────────────────

  if (submitted) {
    const applicantCount = 1 + familyApplicants.filter((a) => a.willApply).length;
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="max-w-md text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <h1 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Application Information Received
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Thank you{clientName ? `, ${clientName}` : ""}! Your information sheet
            {applicantCount > 1 ? ` (${applicantCount} applicants)` : ""} has been
            received. Your representative will review it and guide you through the
            next steps.
          </p>
        </div>
      </div>
    );
  }

  // ── Stepper ─────────────────────────────────────────────────────────────

  const canContinue =
    step !== 2 || familyApplicants.length === 0 || familyApplicants.some((a) => a.willApply);

  return (
    <div className="min-h-screen bg-zinc-50 py-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-4">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-50">
            <Users className="h-6 w-6 text-white dark:text-zinc-900" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Personal Information Sheet
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Please complete each section accurately. A firm will use this to assess
            and prepare your application.
          </p>
        </div>

        {/* Stepper */}
        <ol className="mb-6 flex items-center justify-center gap-2 text-xs">
          {steps.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  i === step
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : i < step
                      ? "bg-emerald-500 text-white"
                      : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800"
                }`}
              >
                {i + 1}
              </button>
              <span
                className={`hidden sm:inline ${i === step ? "font-medium text-zinc-900 dark:text-zinc-50" : "text-zinc-400"}`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && <span className="text-zinc-300 dark:text-zinc-700">→</span>}
            </li>
          ))}
        </ol>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Step 0: Program ─────────────────────────────────────────── */}
          {step === 0 && (
            <SectionCard
              title="Details of Application"
              hint="Select the immigration program you are applying under."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {PIS_PROGRAMS.map((p) => (
                  <label
                    key={p.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm ${
                      programType === p.value
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="programType"
                      className="sr-only"
                      checked={programType === p.value}
                      onChange={() => setProgramType(p.value)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── Step 1: Primary applicant ───────────────────────────────── */}
          {step === 1 && (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                <p className="font-medium">Primary applicant — {clientName ?? "you"}</p>
                <p className="mt-0.5 text-xs">
                  Complete the full Personal Information Sheet below, including the
                  statutory questions and your history.
                </p>
              </div>
              <ApplicantPisForm
                title="Primary Applicant — Personal Information Sheet"
                applicant={primary}
                onChange={(patch) => setPrimary((p) => ({ ...p, ...patch }))}
              />
            </>
          )}

          {/* ── Step 2: Family ──────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Spouse / partner */}
              <SectionCard
                title="Spouse / Partner"
                hint="Anyone you are legally married to, or living common-law with."
              >
                {spouseApplicants.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <User className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                    <div>
                      <WillApplyToggle
                        label="Spouse / Partner"
                        value={spouse.willApply}
                        onChange={(v) => setSpouse((s) => ({ ...s, willApply: v }))}
                      />
                      <div className="mt-3">
                        <MiniSpouseFields
                        spouse={spouse}
                        onChange={(patch) =>
                          setSpouse((s) => ({ ...s, ...patch }))
                        }
                      />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSpouse((s) => ({
                          ...s,
                          firstName: s.firstName || "",
                          lastName: s.lastName || "",
                          relationLabel: "Spouse",
                        }))
                      }
                      className="text-xs text-zinc-500 underline"
                    >
                      I have a spouse — fill in their details
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <WillApplyToggle
                      label="Spouse / Partner"
                      value={spouse.willApply}
                      onChange={(v) => setSpouse((s) => ({ ...s, willApply: v }))}
                    />
                    {spouse.willApply && (
                      <ApplicantPisForm
                        title="Spouse — Personal Information Sheet"
                        applicant={spouse}
                        onChange={(patch) => setSpouse((s) => ({ ...s, ...patch }))}
                      />
                    )}
                  </div>
                )}
              </SectionCard>

              {/* Children */}
              <SectionCard
                title="Children"
                hint="Dependent children, whether or not they are immigrating with you."
              >
                <RepeaterHeader
                  title="Children"
                  count={children.length}
                  onAdd={addChild}
                  accent
                />
                {children.length === 0 && (
                  <p className="mt-2 text-xs text-zinc-400">No children added.</p>
                )}
                <div className="mt-3 space-y-4">
                  {children.map((child, i) => (
                    <div
                      key={child.id}
                      className="relative rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50"
                    >
                      <button
                        type="button"
                        onClick={() => removeChild(i)}
                        className="absolute right-2 top-2 text-zinc-400 hover:text-red-500"
                        title="Remove child"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <p className="mb-3 text-xs font-medium text-zinc-500">
                        Child #{i + 1}
                      </p>
                      <ChildCompactForm
                        child={child}
                        onChange={(patch) => setChild(i, patch)}
                      />
                      <div className="mt-3">
                        <WillApplyToggle
                          label={`Child #${i + 1}${child.firstName ? ` — ${child.firstName}` : ""}`}
                          value={child.willApply}
                          onChange={(v) => {
                            const next = { ...child, willApply: v };
                            setChildren((list) => list.map((c, j) => (j === i ? next : c)));
                            if (v) ensureChildEditor(i);
                            else
                              setChildPisEditors((prev) => {
                                const out = { ...prev };
                                delete out[i];
                                return out;
                              });
                          }}
                        />
                      </div>
                      {child.willApply && childPisEditors[i] && (
                        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                          <ApplicantPisForm
                            title={`${child.firstName || `Child #${i + 1}`} — Personal Information Sheet`}
                            applicant={childPisEditors[i]}
                            onChange={(patch) =>
                              setChildPisEditors((prev) => ({
                                ...prev,
                                [i]: { ...prev[i], ...patch },
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {/* ── Step 3: Review ──────────────────────────────────────────── */}
          {step === 3 && (
            <SectionCard title="Review & Submit">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Program</dt>
                  <dd className="font-medium">
                    {PIS_PROGRAMS.find((p) => p.value === programType)?.label ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Primary applicant</dt>
                  <dd className="font-medium">
                    {primary.firstName || primary.pis.givenNames || "—"}{" "}
                    {primary.lastName || primary.pis.surname || ""}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Applicants</dt>
                  <dd className="font-medium">
                    {familyApplicants.filter((a) => a.willApply).length + 1}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Family members</dt>
                  <dd className="font-medium">
                    {Math.max(0, familyApplicants.length - 1)} applying
                    {children.filter((c) => !c.willApply).length > 0 &&
                      `, ${children.filter((c) => !c.willApply).length} dependants not applying`}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-zinc-400">
                By submitting you declare that all information stated is up-to-date
                and accurate. A separate sheet is required for your spouse and any
                dependent children above the age of 19 who will apply.
              </p>
            </SectionCard>
          )}

          {/* ── Navigation ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300"
            >
              Back
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                disabled={step === 2 && !canContinue}
                className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Submitting…" : "Submit Information Sheet"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Mini spouse identity fields (shown before full PIS chosen) ────────────

function MiniSpouseFields({
  spouse,
  onChange,
}: {
  spouse: ApplicantDraft;
  onChange: (patch: Partial<ApplicantDraft>) => void;
}) {
  const values: Record<string, string> = {
    firstName: spouse.firstName,
    lastName: spouse.lastName,
    dateOfBirth: "",
  };
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {([
        ["firstName", "First Name"],
        ["lastName", "Last Name"],
        ["dateOfBirth", "Date of Birth"],
      ] as const).map(([key, label]) => (
        <div key={key}>
          <label className={labelClass}>{label}</label>
          <input
            type={key === "dateOfBirth" ? "date" : "text"}
            value={values[key] || ""}
            onChange={(e) => onChange({ [key]: e.target.value } as Partial<ApplicantDraft>)}
            className={inputClass}
          />
        </div>
      ))}
    </div>
  );
}