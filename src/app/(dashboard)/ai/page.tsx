"use client";

import { useState, useEffect } from "react";
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
}[] = [
  {
    type: "DOCUMENT_ANALYST",
    name: "Document Analyst",
    description: "Analyzes uploaded documents for completeness and compliance",
    icon: FileText,
  },
  {
    type: "COMMUNICATION_DRAFTER",
    name: "Communication Drafter",
    description: "Drafts client communications and emails",
    icon: MessageSquare,
  },
  {
    type: "CASE_ASSESSOR",
    name: "Case Assessor",
    description: "Provides initial case eligibility assessment",
    icon: Scale,
  },
  {
    type: "FORM_AUTO_FILLER",
    name: "Form Auto-Filler",
    description: "Auto-fills IMM forms from client data",
    icon: FileSpreadsheet,
  },
  {
    type: "SUBMISSIONS_WRITER",
    name: "Submissions Writer",
    description: "Drafts submission letters and arguments",
    icon: FilePen,
  },
  {
    type: "KNOWLEDGE_ASSISTANT",
    name: "Knowledge Assistant",
    description: "Q&A grounded in IRPR/IRCC regulations",
    icon: BookOpen,
  },
  {
    type: "COMPLIANCE_MONITOR",
    name: "Compliance Monitor",
    description: "Tracks deadlines and compliance events",
    icon: Bell,
  },
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

  useEffect(() => {
    fetch("/api/ai/features")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setFeatures(j.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const isEnabled = (type: AiFeatureType) =>
    features.find((f) => f.type === type)?.enabled ?? false;

  const toggle = async (type: AiFeatureType) => {
    setToggling(type);
    const res = await fetch("/api/ai/features", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureType: type, enabled: !isEnabled(type) }),
    });
    const j = await res.json();
    if (j.data) {
      setFeatures((prev) => {
        const exists = prev.find((f) => f.type === type);
        if (exists) {
          return prev.map((f) =>
            f.type === type ? { ...f, enabled: j.data.enabled } : f,
          );
        }
        return [...prev, j.data];
      });
    }
    setToggling(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          AI Features
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Enhance your firm with artificial intelligence capabilities
        </p>
      </div>

      <section className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-4 dark:border-amber-800 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              AI Features Add-On
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              AI features are available as an add-on for{" "}
              <strong>$29/month flat per firm</strong>. Enable the features you
              need below. Your subscription will be updated accordingly.
            </p>
          </div>
        </div>
      </section>

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_DEFS.map((feat) => {
            const enabled = isEnabled(feat.type);
            const togglingNow = toggling === feat.type;
            return (
              <div
                key={feat.type}
                className={cn(
                  "rounded-lg border p-5 transition-colors",
                  enabled
                    ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                    : "border-zinc-100 bg-zinc-50 dark:border-zinc-800/50 dark:bg-zinc-900/50",
                )}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      enabled
                        ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                        : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
                    )}
                  >
                    <feat.icon className="h-5 w-5" />
                  </div>
                  <button
                    onClick={() => toggle(feat.type)}
                    disabled={togglingNow}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      enabled
                        ? "bg-zinc-900 dark:bg-zinc-50"
                        : "bg-zinc-300 dark:bg-zinc-700",
                    )}
                  >
                    {togglingNow ? (
                      <Loader2 className="absolute left-1 top-1 h-4 w-4 animate-spin text-white dark:text-zinc-900" />
                    ) : (
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm dark:bg-zinc-900",
                          enabled && "translate-x-5",
                        )}
                      />
                    )}
                  </button>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {feat.name}
                </h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {isEnabled("KNOWLEDGE_ASSISTANT") && (
        <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Knowledge Assistant Preview
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Ask questions grounded in IRPR/IRCC regulations
            </p>
          </div>

          <div className="px-6 py-5">
            <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
              {chatMessages.length === 0 && (
                <p className="py-8 text-center text-sm text-zinc-400">
                  Ask a question about immigration regulations, forms, or
                  procedures
                </p>
              )}
              {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-lg rounded-lg px-3 py-2 text-sm",
                        msg.role === "user"
                          ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
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
                className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && chatInput.trim() && !chatLoading) {
                    const q = chatInput.trim();
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
                      setChatMessages((prev) => [...prev, {
                        role: "assistant",
                        content: j.data?.reply || "Sorry, I couldn't process that question.",
                        sources: j.data?.sources || [],
                      }]);
                    } catch {
                      setChatMessages((prev) => [...prev, {
                        role: "assistant",
                        content: "An error occurred. Please try again.",
                      }]);
                    }
                    setChatLoading(false);
                  }
                }}
              />
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <button
                onClick={async () => {
                  if (chatInput.trim() && !chatLoading) {
                    const q = chatInput.trim();
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
                      setChatMessages((prev) => [...prev, {
                        role: "assistant",
                        content: j.data?.reply || "Sorry, I couldn't process that question.",
                        sources: j.data?.sources || [],
                      }]);
                    } catch {
                      setChatMessages((prev) => [...prev, {
                        role: "assistant",
                        content: "An error occurred. Please try again.",
                      }]);
                    }
                    setChatLoading(false);
                  }
                }}
                disabled={!chatInput.trim() || chatLoading}
                className="flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
