"use client";

import { useState, useRef, useCallback } from "react";
import { CheckCircle2, ChevronRight, Upload, X, FileText, Loader2, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalTabDocsProps {
  token: string;
  caseId: string;
  caseType: string;
  caseLabel: string;
  client: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
  checklist: string[];
  docsUploaded: number;
  existingDocs: Array<{ id: string; name: string; category: string; sizeBytes: number; createdAt: string }>;
}

type Step = "checklist" | "intake" | "upload" | "done";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const inputCls = "h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";
const labelCls = "mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{title}</h3>
      {children}
    </div>
  );
}

export function PortalTabDocs({ token, caseId, caseType, caseLabel, client, checklist, docsUploaded, existingDocs }: PortalTabDocsProps) {
  const [step, setStep] = useState<Step>("checklist");
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [intake, setIntake] = useState({
    dateOfBirth: "",
    nationality: "",
    maritalStatus: "",
    spouseName: "",
    passportNumber: "",
    passportExpiry: "",
    passportCountry: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "",
    languageTest: "",
    languageScore: "",
    educationLevel: "",
    jobTitle: "",
    nocCode: "",
    yearsOfExperience: "",
    currentStatus: "",
    previousVisas: "",
    additionalNotes: "",
  });
  const [intakeSaving, setIntakeSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [category, setCategory] = useState("OTHER");
  const fileRef = useRef<HTMLInputElement>(null);

  // suppress unused warning — docsUploaded is passed for parent progress bar use
  void docsUploaded;

  function toggleCheck(i: number) {
    setCheckedItems(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function submitIntake() {
    setIntakeSaving(true);
    try {
      await fetch("/api/client-portal/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, caseId, intake }),
      });
      setStep("upload");
    } catch {
      setStep("upload");
    } finally {
      setIntakeSaving(false);
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.size <= MAX_FILE_SIZE) setCurrentFile(f);
  }, []);

  async function uploadFile() {
    if (!currentFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", currentFile);
      fd.append("token", token);
      fd.append("category", category);
      fd.append("clientFirstName", client.firstName);
      fd.append("clientLastName", client.lastName);
      const res = await fetch("/api/client-portal/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error?.message ?? "Upload failed");
      }
      setUploadedFiles(prev => [...prev, currentFile.name]);
      setCurrentFile(null);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const stepOrder: Step[] = ["checklist", "intake", "upload", "done"];

  return (
    <div>
      {/* Sub-step tabs */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex">
          {stepOrder.map((s, i) => {
            const labels = ["Checklist", "Your Info", "Documents", "Done"];
            const active = s === step;
            const done = stepOrder.indexOf(s) < stepOrder.indexOf(step);
            return (
              <div key={s} className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium",
                active ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                : done ? "border-transparent text-green-600 dark:text-green-400"
                : "border-transparent text-zinc-400"
              )}>
                {done ? <Check className="h-3.5 w-3.5" /> : <span className="text-xs">{i + 1}</span>}
                {labels[i]}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-8 max-w-2xl mx-auto">

        {/* STEP 1: CHECKLIST */}
        {step === "checklist" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Document Checklist</h2>
              <p className="mt-1 text-sm text-zinc-500">Review what you&apos;ll need to gather for your {caseLabel} application. Tick each item as you prepare it.</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              {checklist.map((item, i) => (
                <button key={i} onClick={() => toggleCheck(i)}
                  className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                    i !== 0 && "border-t border-zinc-100 dark:border-zinc-800")}>
                  <div className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    checkedItems.has(i) ? "border-green-500 bg-green-500" : "border-zinc-300 dark:border-zinc-600")}>
                    {checkedItems.has(i) && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className={cn("text-sm leading-relaxed",
                    checkedItems.has(i) ? "text-zinc-400 line-through dark:text-zinc-500" : "text-zinc-700 dark:text-zinc-300")}>
                    {item}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-400">You don&apos;t need everything ready now — you can still proceed and upload documents as you gather them.</p>
            <button onClick={() => setStep("intake")}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
              Continue to Your Information <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STEP 2: INTAKE FORM */}
        {step === "intake" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Your Information</h2>
              <p className="mt-1 text-sm text-zinc-500">This information will be used to prepare your immigration application. Please fill in as accurately as possible.</p>
            </div>

            <Section title="Personal Details">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Date of Birth</label>
                  <input type="date" value={intake.dateOfBirth} onChange={e => setIntake(p => ({ ...p, dateOfBirth: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Nationality / Country of Birth</label>
                  <input type="text" value={intake.nationality} onChange={e => setIntake(p => ({ ...p, nationality: e.target.value }))} className={inputCls} placeholder="India" />
                </div>
                <div>
                  <label className={labelCls}>Marital Status</label>
                  <select value={intake.maritalStatus} onChange={e => setIntake(p => ({ ...p, maritalStatus: e.target.value }))} className={inputCls}>
                    <option value="">Select…</option>
                    <option>Single</option>
                    <option>Married</option>
                    <option>Common-law partner</option>
                    <option>Divorced</option>
                    <option>Widowed</option>
                    <option>Separated</option>
                  </select>
                </div>
                {(intake.maritalStatus === "Married" || intake.maritalStatus === "Common-law partner") && (
                  <div>
                    <label className={labelCls}>Spouse / Partner Full Name</label>
                    <input type="text" value={intake.spouseName} onChange={e => setIntake(p => ({ ...p, spouseName: e.target.value }))} className={inputCls} />
                  </div>
                )}
              </div>
            </Section>

            <Section title="Passport Information">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Passport Number</label>
                  <input type="text" value={intake.passportNumber} onChange={e => setIntake(p => ({ ...p, passportNumber: e.target.value }))} className={inputCls} placeholder="A1234567" />
                </div>
                <div>
                  <label className={labelCls}>Passport Expiry Date</label>
                  <input type="date" value={intake.passportExpiry} onChange={e => setIntake(p => ({ ...p, passportExpiry: e.target.value }))} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Country of Issue</label>
                  <input type="text" value={intake.passportCountry} onChange={e => setIntake(p => ({ ...p, passportCountry: e.target.value }))} className={inputCls} placeholder="India" />
                </div>
              </div>
            </Section>

            <Section title="Current Address">
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Street Address</label>
                  <input type="text" value={intake.addressLine1} onChange={e => setIntake(p => ({ ...p, addressLine1: e.target.value }))} className={inputCls} placeholder="123 Main Street" />
                </div>
                <div>
                  <label className={labelCls}>Address Line 2 (Apt, Suite, etc.)</label>
                  <input type="text" value={intake.addressLine2} onChange={e => setIntake(p => ({ ...p, addressLine2: e.target.value }))} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>City</label>
                    <input type="text" value={intake.city} onChange={e => setIntake(p => ({ ...p, city: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Province / State</label>
                    <input type="text" value={intake.province} onChange={e => setIntake(p => ({ ...p, province: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Postal / ZIP Code</label>
                    <input type="text" value={intake.postalCode} onChange={e => setIntake(p => ({ ...p, postalCode: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Country</label>
                    <input type="text" value={intake.country} onChange={e => setIntake(p => ({ ...p, country: e.target.value }))} className={inputCls} />
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Immigration Background">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Current Immigration Status</label>
                    <select value={intake.currentStatus} onChange={e => setIntake(p => ({ ...p, currentStatus: e.target.value }))} className={inputCls}>
                      <option value="">Select…</option>
                      <option>Canadian Citizen</option>
                      <option>Permanent Resident</option>
                      <option>Visitor</option>
                      <option>Study Permit Holder</option>
                      <option>Work Permit Holder</option>
                      <option>Outside Canada</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Previous Canadian Visas / Permits</label>
                    <input type="text" value={intake.previousVisas} onChange={e => setIntake(p => ({ ...p, previousVisas: e.target.value }))} className={inputCls} placeholder="e.g. Study Permit 2020-2023" />
                  </div>
                </div>

                {["EXPRESS_ENTRY", "PNP", "WORK_PERMIT", "LMIA_BASED_WORK_PERMIT", "LMIA_EXEMPT_WORK_PERMIT"].includes(caseType) && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Current Job Title</label>
                        <input type="text" value={intake.jobTitle} onChange={e => setIntake(p => ({ ...p, jobTitle: e.target.value }))} className={inputCls} placeholder="Software Engineer" />
                      </div>
                      <div>
                        <label className={labelCls}>NOC Code (if known)</label>
                        <input type="text" value={intake.nocCode} onChange={e => setIntake(p => ({ ...p, nocCode: e.target.value }))} className={inputCls} placeholder="21231" />
                      </div>
                      <div>
                        <label className={labelCls}>Years of Work Experience</label>
                        <input type="number" min="0" value={intake.yearsOfExperience} onChange={e => setIntake(p => ({ ...p, yearsOfExperience: e.target.value }))} className={inputCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Language Test Taken</label>
                        <select value={intake.languageTest} onChange={e => setIntake(p => ({ ...p, languageTest: e.target.value }))} className={inputCls}>
                          <option value="">Select…</option>
                          <option>IELTS General Training</option>
                          <option>IELTS Academic</option>
                          <option>CELPIP-General</option>
                          <option>TEF Canada</option>
                          <option>TCF Canada</option>
                          <option>None yet</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Overall Score / CLB Level</label>
                        <input type="text" value={intake.languageScore} onChange={e => setIntake(p => ({ ...p, languageScore: e.target.value }))} className={inputCls} placeholder="e.g. 7.5 or CLB 9" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Highest Education Level</label>
                      <select value={intake.educationLevel} onChange={e => setIntake(p => ({ ...p, educationLevel: e.target.value }))} className={inputCls}>
                        <option value="">Select…</option>
                        <option>Less than Secondary / High School</option>
                        <option>Secondary Diploma / High School</option>
                        <option>1-year Post-Secondary Program</option>
                        <option>2-year Post-Secondary Program</option>
                        <option>Bachelor&apos;s Degree (3+ years)</option>
                        <option>Two or More Degrees (one 3+ years)</option>
                        <option>Master&apos;s Degree</option>
                        <option>PhD / Doctorate</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className={labelCls}>Additional Notes or Special Circumstances</label>
                  <textarea value={intake.additionalNotes} onChange={e => setIntake(p => ({ ...p, additionalNotes: e.target.value }))}
                    rows={3} placeholder="Anything your consultant should know about your situation…"
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 resize-none" />
                </div>
              </div>
            </Section>

            <button onClick={submitIntake} disabled={intakeSaving}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
              {intakeSaving
                ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                : <>Save & Continue to Documents <ChevronRight className="h-4 w-4" /></>}
            </button>
          </div>
        )}

        {/* STEP 3: DOCUMENT UPLOAD */}
        {step === "upload" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Upload Documents</h2>
              <p className="mt-1 text-sm text-zinc-500">Upload your supporting documents. You can upload multiple files one at a time. PDF, JPG, PNG, DOC, DOCX — max 25 MB each.</p>
            </div>

            {existingDocs.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Already Submitted ({existingDocs.length})</p>
                </div>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {existingDocs.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300">{doc.name}</span>
                      <span className="shrink-0 text-xs text-zinc-400">{doc.category.replace(/_/g, " ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {uploadedFiles.length > 0 && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
                <p className="mb-2 text-xs font-semibold text-green-700 dark:text-green-400">Just Uploaded ({uploadedFiles.length})</p>
                <ul className="space-y-1">
                  {uploadedFiles.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 px-6 py-10 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50">
              {currentFile ? (
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{currentFile.name}</span>
                  <button onClick={e => { e.stopPropagation(); setCurrentFile(null); }}
                    className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                    <X className="h-3.5 w-3.5 text-zinc-500" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="mb-2 h-7 w-7 text-zinc-400" />
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Drag & drop or click to select a file</p>
                </>
              )}
              <input ref={fileRef} type="file" className="hidden" onChange={e => setCurrentFile(e.target.files?.[0] ?? null)} />
            </div>

            {currentFile && (
              <div>
                <label className={labelCls}>Document Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                  <option value="PASSPORT">Passport</option>
                  <option value="LANGUAGE_TEST">Language Test Results</option>
                  <option value="EDUCATION">Education / Degree</option>
                  <option value="EMPLOYMENT">Employment / Work Experience</option>
                  <option value="FINANCIAL">Financial / Bank Statements</option>
                  <option value="POLICE_CERT">Police Certificate</option>
                  <option value="MEDICAL">Medical Exam</option>
                  <option value="PHOTO">Photos</option>
                  <option value="RELATIONSHIP">Relationship / Marriage Proof</option>
                  <option value="IMMIGRATION_FORM">Immigration Form</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950">
                <AlertTriangle className="h-4 w-4 shrink-0" />{uploadError}
              </div>
            )}

            <div className="flex gap-3">
              {currentFile && (
                <button onClick={uploadFile} disabled={uploading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
                  {uploading
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</>
                    : <><Upload className="h-4 w-4" />Upload This File</>}
                </button>
              )}
              <button onClick={() => setStep("done")}
                className={cn("rounded-md border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300",
                  !currentFile && "w-full")}>
                {uploadedFiles.length > 0 ? "I'm Done Uploading" : "Skip for Now"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: DONE */}
        {step === "done" && (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Submission Complete!</h2>
            <p className="mt-3 text-sm text-zinc-500 max-w-sm mx-auto">
              Thank you, {client.firstName}. Your information and documents have been received by your consultant. They will review everything and be in touch with next steps.
            </p>
            {uploadedFiles.length > 0 && (
              <p className="mt-2 text-sm text-zinc-500">
                {uploadedFiles.length} document{uploadedFiles.length !== 1 ? "s" : ""} uploaded successfully.
              </p>
            )}
            <p className="mt-6 text-xs text-zinc-400">You can return to this link any time to upload additional documents.</p>
            <button onClick={() => setStep("upload")}
              className="mt-4 rounded-md border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400">
              Upload More Documents
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
