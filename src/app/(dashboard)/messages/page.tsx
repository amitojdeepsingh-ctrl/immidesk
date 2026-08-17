"use client";

import { useState } from "react";
import { MessageSquare, Send, Loader2, User, CheckCircle2 } from "lucide-react";

export default function MessagesPage() {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!recipient || !subject || !body) return;
    setSending(true);
    // Mock send — in production this would call an API
    await new Promise((r) => setTimeout(r, 1000));
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    setRecipient("");
    setSubject("");
    setBody("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          <MessageSquare className="h-5 w-5 text-emerald-600" />
          Communications
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Draft and send messages to clients
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        {sent ? (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">Message sent</p>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">New Message</h2>
            <div className="mt-4 space-y-3">
              <input
                type="email"
                placeholder="Client email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
              <textarea
                placeholder="Message body"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!recipient || !subject || !body || sending}
              className="mt-4 flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
