"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
  FileText,
  MessageSquare,
  Scale,
  FileSpreadsheet,
  FilePen,
  BookOpen,
  Bell,
  Loader2,
  Sparkles,
  Send,
  ArrowRight,
  Calculator,
  Shield,
  PenLine,
  Search,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AiFeatureType =
  | "DOCUMENT_ANALYST"
  | "COMMUNICATION_DRAFTER"
  | "CASE_ASSESSOR"
  | "FORM_AUTO_FILLER"
  | "SUBMISSIONS_WRITER"
  | "KNOWLEDGE_ASSISTANT"
  | "COMPLIANCE_MONITOR";

type AiFeature = {
  type: AiFeatureType;
  enabled: boolean;
};

const FEATURE_DEFS: {
  type: AiFeatureType;
  name: string;
  description: string;
  icon: typeof Brain;
  accent: string;
  category: string;
}[] = [
  {
    type: "DOCUMENT_ANALYST",
    name: "DocuCheck AI",
    description: "Scans client documents for completeness, flags missing fields, and checks IRCC compliance",
    icon: FileText,
    accent: "from-blue-500 to-blue-600",
    category: "Review",
  },
  {
    type: "COMMUNICATION_DRAFTER",
    name: "Correspondence Studio",
    description: "Generates SOP (Statement of Purpose) letters and ICCRC communications for case submissions",
    icon: MessageSquare,
    accent: "from-emerald-500 to-emerald-600",
    category: "Draft",
  },
  {
    type: "CASE_ASSESSOR",
    name: "Eligibility Engine",
    description: "Evaluates eligibility across 80+ immigration programs with confidence scoring",
    icon: Scale,
    accent: "from-violet-500 to-violet-600",
    category: "Assess",
  },
  {
    type: "FORM_AUTO_FILLER",
    name: "IMM Form Assist",
    description: "Pre-fills IMM forms using stored client data — reduces data entry by 90%",
    icon: FileSpreadsheet,
    accent: "from-amber-500 to-amber-600",
    category: "Automate",
  },
  {
    type: "SUBMISSIONS_WRITER",
    name: "Submission Builder",
    description: "Drafts persuasive submission letters with case law references and legal reasoning",
    icon: FilePen,
    accent: "from-rose-500 to-rose-600",
    category: "Draft",
  },
  {
    type: "KNOWLEDGE_ASSISTANT",
    name: "IRCC Insights",
    description: "Instant Q&A across IRPR, IRCC policy manuals, and operational bulletins",
    icon: BookOpen,
    accent: "from-sky-500 to-sky-600",
    category: "Research",
  },
  {
    type: "COMPLIANCE_MONITOR",
    name: "Deadline Watch",
    description: "Tracks deadline changes, policy updates, and renewal windows automatically",
    icon: Bell,
    accent: "from-orange-500 to-orange-600",
    category: "Monitor",
  },
];

const QUICK_ACTIONS = [
  { label: "Check Compliance Deadlines", href: "/compliance", icon: Bell, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "hover:border-amber-300 dark:hover:border-amber-500/40" },
  { label: "Assess a Case", href: "/assess", icon: Scale, color: "text-brand-600 dark:text-brand-400", bg: "bg-brand-50 dark:bg-brand-500/10", border: "hover:border-brand-300 dark:hover:border-brand-500/40" },
  { label: "Draft Communication to Client", href: "/messages", icon: PenLine, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-500/10", border: "hover:border-sky-300 dark:hover:border-sky-500/40" },
  { label: "CRS Calculator", href: "/crs", icon: Calculator, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "hover:border-emerald-300 dark:hover:border-emerald-500/40" },
];

const SUGGESTED_QUESTIONS = [
  "What are the requirements for spousal sponsorship?",
  "How long does Express Entry processing take?",
  "What documents are needed for a work permit?",
  "What is the minimum CRS score for 2025?",
];

export default function AiFeaturesPage() {
  const [features, setFeatures] = useState<AiFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string; sources?: { title: string; citations: string }[] }[]
  >([]);
  const [chatLoading, setChatLoading] = useState(false);
  // Track if the knowledge assistant has been used
  const [hasUsedChat, setHasUsedChat] = useState(false);

  useEffect(() => {
    fetch("/api/ai/features")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setFeatures(j.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const [toggleError, setToggleError] = useState("");

  const isEnabled = (type: AiFeatureType) =>
    features.find((f) => f.type === type)?.enabled ?? false;

  const toggle = async (type: AiFeatureType) => {
    setToggleError("");
    const newEnabled = !isEnabled(type);
    // Optimistic update
    setFeatures((prev) => {
      const exists = prev.find((f) => f.type === type);
      if (exists) {
        return prev.map((f) => (f.type === type ? { ...f, enabled: newEnabled } : f));
      }
      return [...prev, { type, enabled: newEnabled } as AiFeature];
    });
    setToggling(type);
    try {
      const res = await fetch("/api/ai/features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureType: type, enabled: newEnabled }),
      });
      const j = await res.json();
      if (!res.ok || !j.data) {
        // Revert on failure
        setFeatures((prev) => prev.map((f) => (f.type === type ? { ...f, enabled: !newEnabled } : f)));
        setToggleError(j?.error || "Failed to update feature");
      }
    } catch {
      setFeatures((prev) => prev.map((f) => (f.type === type ? { ...f, enabled: !newEnabled } : f)));
      setToggleError("Network error — feature not saved");
    }
    setToggling(null);
  };

  const sendChat = async (q: string) => {
    if (!q.trim() || chatLoading) return;
    setHasUsedChat(true);
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: q }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const j = await res.json();
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: j.data?.reply || "Sorry, I couldn't process that question.",
          sources: j.data?.sources || [],
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "An error occurred. Please try again." },
      ]);
    }
    setChatLoading(false);
  };

  const enabledCount = features.filter((f) => f.enabled).length;

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 px-6 py-8">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-[12px] border-white/5" />
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full border-8 border-white/5" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 shadow-lg ring-1 ring-inset ring-white/25 backdrop-blur">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-xl font-bold text-white">
              AI-Powered Smart Portal
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-100">
                {enabledCount}/{FEATURE_DEFS.length} active
              </span>
            </h1>
        <p className="mt-1 text-sm text-brand-100/80">
            Intelligent tools purpose-built for Canadian immigration practice
          </p>
          <span className="text-[10px] text-white/40">v2.1-redesign</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <Zap className="h-3.5 w-3.5" /> Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                "group flex items-center justify-between rounded-lg border border-zinc-200 p-4 transition-all hover:shadow-md dark:border-zinc-800",
                action.bg,
                action.border,
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110",
                    action.bg,
                  )}
                >
                  <action.icon className={cn("h-5 w-5", action.color)} />
                </div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {action.label}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>

      {/* Add-on banner */}
      <section className="rounded-lg border border-brand-200/70 bg-gradient-to-r from-brand-50 via-brand-50/70 to-transparent px-6 py-4 dark:border-brand-500/25 dark:from-brand-500/10 dark:via-brand-500/[0.04]">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
          <div>
            <p className="text-sm font-medium text-brand-900 dark:text-brand-100">
              AI Features Add-On
            </p>
            <p className="mt-1 text-xs text-brand-700 dark:text-brand-300">
              All AI tools are available for <strong>$29/month flat per firm</strong>.
              Toggle features on below — your subscription updates automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Toggles — grouped */}
      <div>
        <h2 className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <Shield className="h-3.5 w-3.5" /> Available Features
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-3 h-10 w-10 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                <div className="mb-2 h-4 w-28 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {toggleError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                {toggleError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_DEFS.map((feat) => {
              const enabled = isEnabled(feat.type);
              const togglingNow = toggling === feat.type;
              return (
                <div
                  key={feat.type}
                  className={cn(
                    "group relative rounded-lg border p-5 transition-all hover:shadow-md",
                    enabled
                      ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      : "border-zinc-100 bg-zinc-50 dark:border-zinc-800/50 dark:bg-zinc-900/50",
                  )}
                >
                  {/* Accent stripe */}
                  <div
                    className={cn(
                      "absolute left-0 top-0 h-full w-1 rounded-l-lg transition-opacity",
                      enabled ? "opacity-100" : "opacity-0",
                      feat.accent,
                    )}
                  />

                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br transition-transform group-hover:scale-110",
                          enabled ? feat.accent : "from-zinc-300 to-zinc-400 dark:from-zinc-700 dark:to-zinc-600",
                        )}
                      >
                        <feat.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3
                          className={cn(
                            "text-sm font-semibold",
                            enabled
                              ? "text-zinc-900 dark:text-zinc-50"
                              : "text-zinc-500 dark:text-zinc-400",
                          )}
                        >
                          {feat.name}
                        </h3>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          {feat.category}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggle(feat.type)}
                      disabled={togglingNow}
                      className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                        enabled
                          ? "bg-brand-600 dark:bg-brand-500"
                          : "bg-zinc-300 dark:bg-zinc-700",
                      )}
                    >
                      {togglingNow ? (
                        <Loader2 className="absolute left-1 top-1 h-4 w-4 animate-spin text-white dark:text-white" />
                      ) : (
                        <span
                          className={cn(
                            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-900",
                            enabled && "translate-x-5",
                          )}
                        />
                      )}
                    </button>
                  </div>
                  <p
                    className={cn(
                      "mt-3 text-xs leading-relaxed",
                      enabled
                        ? "text-zinc-500 dark:text-zinc-400"
                        : "text-zinc-400 dark:text-zinc-500",
                    )}
                  >
                    {feat.description}
                  </p>
                  {enabled && feat.type === "COMMUNICATION_DRAFTER" && (
                    <Link
                      href="/correspondence"
                      className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                    >
                      Open Studio <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        )}
      </div>

      {/* Knowledge Assistant */}
      <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-600">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Knowledge Assistant
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  IRPR, IRCC policy, and operational guidance — ask anything
                </p>
              </div>
            </div>
            {!isEnabled("KNOWLEDGE_ASSISTANT") && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                Disabled
              </span>
            )}
            <Link
              href="/knowledge"
              className="flex items-center gap-1.5 rounded-md border border-sky-200 px-3 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-50 dark:border-sky-500/40 dark:text-sky-400 dark:hover:bg-sky-500/10"
            >
              Open full page <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 max-h-72 space-y-3 overflow-y-auto">
            {chatMessages.length === 0 && !hasUsedChat && (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <Search className="h-6 w-6 text-zinc-400" />
                </div>
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  Ask anything about Canadian immigration
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SUGGESTED_QUESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendChat(suggestion)}
                      className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-lg rounded-lg px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-brand-600 text-white dark:bg-brand-500 dark:text-white"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 border-t border-zinc-300 pt-2 text-xs text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
                      <span className="font-semibold">Sources:</span>
                      {msg.sources.map((s, si) => (
                        <div key={si} className="mt-1">
                          {s.title} — {s.citations}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
              onKeyDown={async (e) => {
                if (e.key === "Enter") await sendChat(chatInput);
              }}
            />
            {chatLoading && (
              <div className="flex items-center rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
              </div>
            )}
            <button
              onClick={() => sendChat(chatInput)}
              disabled={!chatInput.trim() || chatLoading}
              className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500 dark:text-white"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
