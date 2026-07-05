"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sentByClient: boolean;
  senderName: string | null;
  createdAt: string;
}

export function MessagesView({
  clientId,
  clientName,
  rcicName,
  caseId,
  caseTitle,
  initialMessages,
}: {
  clientId: string;
  clientName: string;
  rcicName: string;
  caseId: string | null;
  caseTitle: string | null;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !caseId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, content: text.trim() }),
      });
      const j = await res.json();
      if (j.message) {
        setMessages(prev => [...prev, j.message]);
        setText("");
      }
    } finally {
      setSending(false);
    }
  }

  function fmt(date: string) {
    return new Date(date).toLocaleString("en-CA", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  if (!caseId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <MessageSquare className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm text-zinc-500">No case found for this client.</p>
        <p className="mt-1 text-xs text-zinc-400">Create a case first to enable messaging.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[400px] flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Messages with {clientName}</p>
          {caseTitle && <p className="text-xs text-zinc-400">{caseTitle}</p>}
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
          {messages.length} message{messages.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-400">No messages yet</p>
            <p className="mt-1 text-xs text-zinc-400">Messages from the client portal will appear here</p>
          </div>
        ) : (
          messages.map(msg => {
            const isClient = msg.sentByClient;
            return (
              <div key={msg.id} className={cn("flex", isClient ? "justify-start" : "justify-end")}>
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5",
                  isClient
                    ? "rounded-tl-sm bg-zinc-100 dark:bg-zinc-800"
                    : "rounded-tr-sm bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900",
                )}>
                  <p className={cn("text-xs font-medium mb-1", isClient ? "text-zinc-500" : "text-zinc-400 dark:text-zinc-500")}>
                    {msg.senderName ?? (isClient ? clientName : rcicName)}
                  </p>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={cn("mt-1 text-right text-[11px]", isClient ? "text-zinc-400" : "text-zinc-400 dark:text-zinc-500")}>
                    {fmt(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <form onSubmit={send} className="border-t border-zinc-100 p-3 dark:border-zinc-800">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`Reply to ${clientName}…`}
            className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </div>
        <p className="mt-1.5 text-xs text-zinc-400">Client will see your reply the next time they open their portal</p>
      </form>
    </div>
  );
}
