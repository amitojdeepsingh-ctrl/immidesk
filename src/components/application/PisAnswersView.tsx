import { PIS_SECTIONS, STATUTORY_QUESTIONS } from "@/lib/intake/pis-schema";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════
// PisAnswersView — read-only rendering of a submitted Personal Information
// Sheet, laid out the way the form was filled: schema sections in order,
// repeater tables as clean cards, statutory questions with full question
// text. Empty fields are hidden so only real answers show.
// ═══════════════════════════════════════════════════════════════════════════

interface PisAnswersViewProps {
  applicantLabel: string;
  formName: string;
  status: string;
  updatedAt: string | null;
  filledData: Record<string, unknown>;
}

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") {
    return Object.values(v as Record<string, unknown>).every(isEmpty);
  }
  return false;
}

function roleLabel(label: string): string {
  if (label === "PRIMARY") return "Main applicant";
  if (label === "SPOUSE") return "Spouse";
  if (label.startsWith("CHILD#")) return `Child ${label.split("#")[1]}`;
  return label;
}

const REPEATER_LAYOUTS: Record<string, { title: string; fields: Array<{ key: string; label: string }> }> = {
  education: {
    title: "Education",
    fields: [
      { key: "schoolName", label: "School" },
      { key: "certificate", label: "Certificate / Diploma" },
      { key: "areaOfStudy", label: "Area of study" },
      { key: "cityCountry", label: "City / Country" },
      { key: "from", label: "From" },
      { key: "to", label: "To" },
    ],
  },
  employment: {
    title: "Employment",
    fields: [
      { key: "jobTitle", label: "Job title" },
      { key: "employer", label: "Employer" },
      { key: "cityCountry", label: "City / Country" },
      { key: "canadianEmployerAddress", label: "Canadian employer address" },
      { key: "from", label: "From" },
      { key: "to", label: "To" },
    ],
  },
  travel: {
    title: "Travel history",
    fields: [
      { key: "cityCountry", label: "City / Country" },
      { key: "purpose", label: "Purpose" },
      { key: "from", label: "From" },
      { key: "to", label: "To" },
      { key: "visaIssued", label: "Visa issued" },
    ],
  },
  addressHistory: {
    title: "Address history",
    fields: [
      { key: "street", label: "Street" },
      { key: "cityProvince", label: "City / Province" },
      { key: "postalCode", label: "Postal code" },
      { key: "country", label: "Country" },
      { key: "from", label: "From" },
      { key: "to", label: "To" },
    ],
  },
};

function RepeaterBlock({ rows, layout }: { rows: unknown; layout: (typeof REPEATER_LAYOUTS)[string] }) {
  const list = (Array.isArray(rows) ? rows : []).filter(
    (r) => typeof r === "object" && r !== null && !isEmpty(r),
  ) as Array<Record<string, unknown>>;
  if (list.length === 0) return null;
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {layout.title} ({list.length})
      </h4>
      <div className="space-y-2">
        {list.map((row, i) => (
          <div
            key={i}
            className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {layout.fields.map(({ key, label }) =>
                isEmpty(row[key]) ? null : (
                  <div key={key} className="flex flex-col gap-0.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      {label}
                    </dt>
                    <dd className="text-sm text-zinc-800 dark:text-zinc-200">{String(row[key])}</dd>
                  </div>
                ),
              )}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatutoryBlock({ statutory }: { statutory: unknown }) {
  if (typeof statutory !== "object" || statutory === null) return null;
  const answers = statutory as Record<string, { answer?: string; explanation?: string }>;
  const numbers = Object.keys(answers).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
  if (numbers.length === 0) return null;
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Statutory questions
      </h4>
      <ol className="space-y-2">
        {numbers.map((n) => {
          const q = STATUTORY_QUESTIONS.find((s) => s.number === Number(n));
          const a = answers[n] ?? {};
          const yes = a.answer === "Yes";
          return (
            <li
              key={n}
              className={cn(
                "rounded-md border p-3",
                yes
                  ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-zinc-800 dark:text-zinc-200">
                  <span className="font-semibold">{n}.</span> {q?.text ?? ""}
                </p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                    yes
                      ? "bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
                  )}
                >
                  {a.answer || "—"}
                </span>
              </div>
              {a.explanation ? (
                <p className="mt-1.5 text-sm italic text-zinc-600 dark:text-zinc-400">{a.explanation}</p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function PisAnswersView({ applicantLabel, formName, status, updatedAt, filledData }: PisAnswersViewProps) {
  const meta = (filledData._meta ?? {}) as Record<string, unknown>;
  const name =
    `${(meta.firstName as string) ?? ""} ${(meta.lastName as string) ?? ""}`.trim() ||
    `${(filledData.givenNames as string) ?? ""} ${(filledData.surname as string) ?? ""}`.trim() ||
    roleLabel(applicantLabel);

  const sections = PIS_SECTIONS.map((section) => ({
    ...section,
    rows: section.fields.filter(({ key }) => !isEmpty(filledData[key])),
  })).filter((s) => s.rows.length > 0);

  // Coverage — makes thin submissions self-evident (client left fields blank)
  // instead of looking like a broken view.
  const flatAnswered = sections.reduce((n, s) => n + s.rows.length, 0);
  const flatTotal = PIS_SECTIONS.reduce((n, s) => n + s.fields.length, 0);
  const statutoryAnswers =
    typeof filledData.statutory === "object" && filledData.statutory !== null
      ? (filledData.statutory as Record<string, { answer?: string }>)
      : {};
  const statutoryAnswered = Object.values(statutoryAnswers).filter(
    (a) => a?.answer === "Yes" || a?.answer === "No",
  ).length;
  const repeaterEntries = Object.keys(REPEATER_LAYOUTS).reduce((n, key) => {
    const rows = filledData[key];
    return n + (Array.isArray(rows) ? rows.filter((r) => typeof r === "object" && r !== null && !isEmpty(r)).length : 0);
  }, 0);

  return (
    <div className="space-y-5 rounded-lg border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900 dark:bg-brand-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {name} <span className="font-normal text-zinc-500">· {roleLabel(applicantLabel)}</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {formName}
            {typeof meta.programType === "string" && meta.programType ? ` · ${meta.programType.replace(/_/g, " ")}` : ""}
            {updatedAt ? ` · Updated ${new Date(updatedAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}` : ""}
          </p>
          <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {flatAnswered + statutoryAnswered} of {flatTotal + STATUTORY_QUESTIONS.length} questions answered
            {repeaterEntries > 0 ? ` · ${repeaterEntries} history ${repeaterEntries === 1 ? "entry" : "entries"}` : ""}
            {flatAnswered + statutoryAnswered < 10 ? " — client left most fields blank" : ""}
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          {status}
        </span>
      </div>

      {sections.map((section) => (
        <section key={section.key}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {section.title}
          </h4>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {section.rows.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-0.5 border-b border-zinc-200/70 pb-1.5 dark:border-zinc-800">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  {label}
                </dt>
                <dd className="text-sm text-zinc-800 dark:text-zinc-200">{String(filledData[key])}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {Object.entries(REPEATER_LAYOUTS).map(([key, layout]) => (
        <RepeaterBlock key={key} rows={filledData[key]} layout={layout} />
      ))}

      <StatutoryBlock statutory={filledData.statutory} />
    </div>
  );
}
