"use client";

import { useState } from "react";
import { Plus, Mail, Trash2, Download, RefreshCw, X, Loader2, Building2, MapPin, Briefcase, ExternalLink } from "lucide-react";

type LeadStatus = "NEW" | "CONTACTED" | "INTERESTED" | "NOT_INTERESTED" | "CONVERTED";

interface Lead {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  province: string | null;
  jobTitle: string | null;
  nocCode: string | null;
  source: string;
  sourceUrl: string | null;
  status: LeadStatus;
  notes: string | null;
  emailSentAt: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
  NEW:            { label: "New",            className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  CONTACTED:      { label: "Contacted",      className: "bg-blue-50 text-blue-700 border border-blue-200" },
  INTERESTED:     { label: "Interested",     className: "bg-green-50 text-green-700 border border-green-200" },
  NOT_INTERESTED: { label: "Not Interested", className: "bg-red-50 text-red-600 border border-red-200" },
  CONVERTED:      { label: "Converted ✓",   className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
};

const PROVINCES = ["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"];
const SOURCES = ["MANUAL","JOB_BANK","LINKEDIN","REFERRAL","WEBSITE","OTHER"];

const EMAIL_TEMPLATE = (companyName: string, jobTitle: string) => ({
  subject: `LMIA Services for ${companyName} — Hire Foreign Workers`,
  html: `
<p>Dear Hiring Manager at ${companyName},</p>

<p>My name is [Your Name] from ADS Immigration Services. I noticed you are actively hiring for <strong>${jobTitle || "positions"}</strong> and wanted to reach out about our LMIA (Labour Market Impact Assessment) services.</p>

<p><strong>We help Canadian employers like you:</strong></p>
<ul>
  <li>Navigate the LMIA application process from start to finish</li>
  <li>Ensure full ESDC compliance (advertising, documentation, timelines)</li>
  <li>Access a larger talent pool by hiring qualified foreign workers</li>
  <li>Reduce risk of refusals with our proven track record</li>
</ul>

<p>With a shortage of local workers in many industries, an LMIA allows you to hire internationally and fill your positions faster.</p>

<p><strong>Book a free 15-minute consultation</strong> to learn how we can help your business grow without being limited by local labour shortages.</p>

<p>Reply to this email or call us at [Your Phone] to get started.</p>

<p>Best regards,<br/>
[Your Name]<br/>
ADS Immigration Services<br/>
[Phone] | [Email] | [Website]</p>
  `.trim(),
});

export function LeadsManager({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [filter, setFilter] = useState<LeadStatus | "ALL">("ALL");
  const [importing, setImporting] = useState(false);
  const [importProvince, setImportProvince] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [sending, setSending] = useState(false);
  const [emailDraft, setEmailDraft] = useState({ subject: "", html: "" });
  const [addForm, setAddForm] = useState({
    companyName: "", contactName: "", email: "", phone: "",
    industry: "", province: "", jobTitle: "", nocCode: "", source: "MANUAL", sourceUrl: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const filtered = filter === "ALL" ? leads : leads.filter(l => l.status === filter);

  const counts = {
    ALL: leads.length,
    NEW: leads.filter(l => l.status === "NEW").length,
    CONTACTED: leads.filter(l => l.status === "CONTACTED").length,
    INTERESTED: leads.filter(l => l.status === "INTERESTED").length,
    CONVERTED: leads.filter(l => l.status === "CONVERTED").length,
  };

  async function importFromJobBank() {
    setImporting(true);
    try {
      const res = await fetch("/api/lmia/leads/import-jobbank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ province: importProvince || undefined }),
      });
      const j = await res.json();
      if (j.imported > 0) {
        const fresh = await fetch("/api/lmia/leads").then(r => r.json());
        setLeads(fresh.leads ?? []);
        alert(`Imported ${j.imported} new employer leads from Job Bank Canada.`);
      } else {
        alert(j.message ?? "No new leads found.");
      }
    } finally {
      setImporting(false);
    }
  }

  async function addLead(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.companyName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/lmia/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    const j = await res.json();
    setSaving(false);
    if (j.lead) {
      setLeads(prev => [j.lead, ...prev]);
      setShowAddForm(false);
      setAddForm({ companyName: "", contactName: "", email: "", phone: "", industry: "", province: "", jobTitle: "", nocCode: "", source: "MANUAL", sourceUrl: "", notes: "" });
    }
  }

  async function updateStatus(leadId: string, status: LeadStatus) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
    await fetch(`/api/lmia/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteLead(leadId: string) {
    if (!confirm("Delete this lead?")) return;
    setLeads(prev => prev.filter(l => l.id !== leadId));
    await fetch(`/api/lmia/leads/${leadId}`, { method: "DELETE" });
  }

  function openEmailModal(lead: Lead) {
    const template = EMAIL_TEMPLATE(lead.companyName, lead.jobTitle ?? "");
    setEmailDraft(template);
    setEmailLead(lead);
  }

  async function sendEmail() {
    if (!emailLead) return;
    setSending(true);
    const res = await fetch(`/api/lmia/leads/${emailLead.id}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailDraft),
    });
    const j = await res.json();
    setSending(false);
    if (j.ok) {
      setLeads(prev => prev.map(l => l.id === emailLead.id ? { ...l, status: "CONTACTED", emailSentAt: new Date().toISOString() } : l));
      setEmailLead(null);
      alert("Email sent successfully!");
    } else {
      alert("Failed to send: " + (j.error ?? "Unknown error"));
    }
  }

  function exportCsv() {
    const rows = [
      ["Company","Contact","Email","Phone","Industry","Province","Job Title","NOC","Source","Status","Notes"],
      ...filtered.map(l => [
        l.companyName, l.contactName ?? "", l.email ?? "", l.phone ?? "",
        l.industry ?? "", l.province ?? "", l.jobTitle ?? "", l.nocCode ?? "",
        l.source, l.status, l.notes ?? "",
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "lmia-leads.csv"; a.click();
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-zinc-500">Find employers hiring foreign workers — import from Job Bank or add manually, then send outreach emails</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button onClick={() => setShowAddForm(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
            <Plus className="h-4 w-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* Job Bank Import Bar */}
      <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Quick Import — Reddit &amp; Canadian Business Forums</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Searches Reddit for Canadian employers actively discussing hiring foreign workers &amp; LMIA</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={importProvince}
              onChange={e => setImportProvince(e.target.value)}
              className="rounded-md border border-blue-200 bg-white px-2 py-1.5 text-sm text-zinc-700 dark:border-blue-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="">All Provinces</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button
              onClick={importFromJobBank}
              disabled={importing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {importing ? "Importing…" : "Import Leads"}
            </button>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {(["ALL","NEW","CONTACTED","INTERESTED","CONVERTED"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === s
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {s === "ALL" ? "All" : STATUS_CONFIG[s].label} ({counts[s] ?? leads.filter(l => l.status === s).length})
          </button>
        ))}
      </div>

      {/* Leads Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 flex flex-col items-center justify-center py-20 gap-3">
          <Building2 className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-500">No leads yet</p>
          <p className="text-xs text-zinc-400">Import from Job Bank or add manually</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => (
            <div key={lead.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">{lead.companyName}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[lead.status].className}`}>
                      {STATUS_CONFIG[lead.status].label}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                      {lead.source.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                    {lead.contactName && <span>👤 {lead.contactName}</span>}
                    {lead.email && <span>✉ {lead.email}</span>}
                    {lead.phone && <span>📞 {lead.phone}</span>}
                    {lead.jobTitle && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{lead.jobTitle}{lead.nocCode ? ` (NOC ${lead.nocCode})` : ""}</span>}
                    {lead.province && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.province}</span>}
                    {lead.sourceUrl && (
                      <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                        <ExternalLink className="h-3 w-3" />View Job
                      </a>
                    )}
                  </div>
                  {lead.notes && <p className="mt-1.5 text-xs text-zinc-400 italic">{lead.notes}</p>}
                  {lead.emailSentAt && (
                    <p className="mt-1 text-xs text-blue-500">
                      Email sent {new Date(lead.emailSentAt).toLocaleDateString("en-CA")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <select
                    value={lead.status}
                    onChange={e => updateStatus(lead.id, e.target.value as LeadStatus)}
                    className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(s => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                  {lead.email && (
                    <button
                      onClick={() => openEmailModal(lead)}
                      className="rounded-md p-1.5 text-zinc-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950"
                      title="Send outreach email"
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteLead(lead.id)}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete lead"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Add Lead Manually</h2>
              <button onClick={() => setShowAddForm(false)} className="text-zinc-400 hover:text-zinc-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={addLead} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Company Name *</label>
                  <input required value={addForm.companyName} onChange={e => setAddForm(f => ({ ...f, companyName: e.target.value }))} className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" placeholder="ABC Farms Ltd." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Contact Name</label>
                  <input value={addForm.contactName} onChange={e => setAddForm(f => ({ ...f, contactName: e.target.value }))} className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" placeholder="John Smith" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Email</label>
                  <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" placeholder="hr@company.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Phone</label>
                  <input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" placeholder="604-000-0000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Province</label>
                  <select value={addForm.province} onChange={e => setAddForm(f => ({ ...f, province: e.target.value }))} className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50">
                    <option value="">Select…</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Job Title</label>
                  <input value={addForm.jobTitle} onChange={e => setAddForm(f => ({ ...f, jobTitle: e.target.value }))} className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" placeholder="Farm Worker" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">NOC Code</label>
                  <input value={addForm.nocCode} onChange={e => setAddForm(f => ({ ...f, nocCode: e.target.value }))} className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" placeholder="85100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Source</label>
                  <select value={addForm.source} onChange={e => setAddForm(f => ({ ...f, source: e.target.value }))} className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50">
                    {SOURCES.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Notes</label>
                  <textarea value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Add Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Send Outreach Email</h2>
                <p className="text-xs text-zinc-500 mt-0.5">To: {emailLead.email} · {emailLead.companyName}</p>
              </div>
              <button onClick={() => setEmailLead(null)} className="text-zinc-400 hover:text-zinc-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Subject</label>
                <input
                  value={emailDraft.subject}
                  onChange={e => setEmailDraft(d => ({ ...d, subject: e.target.value }))}
                  className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Email Body (HTML)</label>
                <textarea
                  value={emailDraft.html}
                  onChange={e => setEmailDraft(d => ({ ...d, html: e.target.value }))}
                  rows={14}
                  className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-mono focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </div>
              <p className="text-xs text-zinc-400">Replace <code>[Your Name]</code>, <code>[Your Phone]</code> etc. before sending.</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setEmailLead(null)} className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100">Cancel</button>
              <button
                onClick={sendEmail}
                disabled={sending}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-4 w-4" />}
                {sending ? "Sending…" : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
