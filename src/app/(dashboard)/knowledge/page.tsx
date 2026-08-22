"use client";

import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Search,
  Send,
  Scale,
  Users,
  GraduationCap,
  Briefcase,
  Plane,
  Gavel,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; citations: string }[];
};

const TOPIC_GROUPS: { label: string; icon: typeof BookOpen; questions: string[] }[] = [
  {
    label: "Express Entry & PR",
    icon: Scale,
    questions: [
      "How does Express Entry work?",
      "What is the CRS score out of?",
      "What are category-based draws?",
      "How many points do I need for FSW?",
      "What are the proof of funds amounts?",
    ],
  },
  {
    label: "Family Sponsorship",
    icon: Users,
    questions: [
      "What are the requirements for spousal sponsorship?",
      "Can I sponsor my parents and grandparents?",
      "What is the dependent child lock-in age?",
      "Inland vs outland spousal sponsorship?",
    ],
  },
  {
    label: "Work Permits",
    icon: Briefcase,
    questions: [
      "What is an LMIA and when is it needed?",
      "Which work permits are LMIA-exempt?",
      "What is the Global Talent Stream?",
      "How do I get a bridging open work permit?",
      "What is IEC working holiday?",
    ],
  },
  {
    label: "Study & Post-Graduation",
    icon: GraduationCap,
    questions: [
      "What are the study permit financial requirements?",
      "What is a PAL for a study permit?",
      "PGWP field of study requirements?",
      "How many hours can students work off campus?",
    ],
  },
  {
    label: "Visiting Canada",
    icon: Plane,
    questions: [
      "Do I need a visa or eTA to visit Canada?",
      "What is the Super Visa?",
      "How do I extend my stay in Canada?",
      "What is maintained status?",
    ],
  },
  {
    label: "Enforcement & Protection",
    icon: Gavel,
    questions: [
      "What are the grounds of inadmissibility?",
      "How long is the misrepresentation ban?",
      "What is criminal rehabilitation?",
      "Who qualifies as a convention refugee?",
      "What is a PRRA?",
    ],
  },
];

export default function KnowledgePage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeGroupLabel, setActiveGroupLabel] = useState<string | null>(null);

  const send = async (q: string) => {
    if (!q.trim() || loading) return;
    setInput("");
    if (activeGroupLabel === null) {
      // First question from a topic card — remember which group to suggest next.
      setActiveGroupLabel(TOPIC_GROUPS.find((g) => g.questions.includes(q))?.label ?? null);
    }
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const j = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: j.data?.reply || "Sorry, I couldn't process that question.",
          sources: j.data?.sources || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "An error occurred. Please try again." },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-sm">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Knowledge Assistant
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Grounded Q&amp;A on Canadian immigration — IRPA/IRPR, programs, requirements, timelines
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => {
              if (loading) return;
              setMessages([]);
              setActiveGroupLabel(null);
            }}
            className="ml-auto flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All topics
          </button>
        )}
      </div>

      {/* Topic browser (only before first question) */}
      {messages.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPIC_GROUPS.map((group) => (
            <button
              key={group.label}
              onClick={() => send(group.questions[0])}
              disabled={loading}
              className={cn(
                "group rounded-lg border border-zinc-200 bg-white p-4 text-left transition-all hover:border-zinc-300 hover:shadow-md",
                "dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
              )}
            >
              <div className="flex items-center gap-2.5">
                <group.icon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  {group.label}
                </span>
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {group.questions.slice(0, 3).map((q) => (
                  <li
                    key={q}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!loading) send(q);
                    }}
                    className="cursor-pointer truncate text-xs text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    · {q}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <Search className="h-7 w-7 text-zinc-400" />
            </div>
            <p className="mt-4 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
              Pick a topic above or ask anything below — answers come straight
              from a curated base of IRPA/IRPR provisions, program criteria,
              fees, and timelines.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-2xl rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2.5 border-t border-zinc-300 pt-2 text-xs text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
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
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching knowledge base…
                </div>
              </div>
            )}
            {!loading && messages.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  Try:
                </span>
                {(() => {
                  const asked = new Set(
                    messages.filter((m) => m.role === "user").map((m) => m.content),
                  );
                  const group = TOPIC_GROUPS.find((g) => g.label === activeGroupLabel);
                  const suggestions = (group?.questions ?? TOPIC_GROUPS.flatMap((g) => g.questions))
                    .filter((q) => !asked.has(q))
                    .slice(0, 6);
                  return suggestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
                    >
                      {q}
                    </button>
                  ));
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about any immigration program, requirement, or process…"
          className="h-11 flex-1 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
