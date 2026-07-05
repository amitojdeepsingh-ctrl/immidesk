"use client"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, Loader2, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  content: string
  sentByClient: boolean
  senderName: string | null
  createdAt: string
}

interface PortalTabMessagesProps {
  token: string
  caseId: string
  client: { firstName: string; lastName: string }
  initialMessages: Message[]
}

export function PortalTabMessages({
  token,
  caseId,
  client,
  initialMessages,
}: PortalTabMessagesProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    const content = input.trim()
    if (!content || sending) return

    setSending(true)
    setInput("")

    try {
      const res = await fetch("/api/client-portal/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, caseId, content }),
      })

      if (!res.ok) throw new Error("Failed to send message")

      const optimistic: Message = {
        id: crypto.randomUUID(),
        content,
        sentByClient: true,
        senderName: `${client.firstName} ${client.lastName}`,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimistic])
    } catch {
      setInput(content)
    } finally {
      setSending(false)
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
      {/* Message area */}
      <div className="min-h-[400px] max-h-[500px] overflow-y-auto p-4 space-y-4 bg-zinc-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2 py-16">
            <MessageSquare className="w-8 h-8" />
            <p className="text-sm">Send a message to your consultant</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isClient = msg.sentByClient
            return (
              <div
                key={msg.id}
                className={cn("flex flex-col gap-0.5 max-w-[75%]", isClient ? "ml-auto items-end" : "mr-auto items-start")}
              >
                {msg.senderName && (
                  <span className="text-xs text-zinc-400 px-1">{msg.senderName}</span>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2 text-sm",
                    isClient
                      ? "bg-zinc-900 text-white rounded-tr-sm"
                      : "bg-zinc-100 text-zinc-900 rounded-tl-sm"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-zinc-400 px-1">
                  {formatDate(msg.createdAt)} · {formatTime(msg.createdAt)}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-200 p-3 flex gap-2 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Type a message…"
          className="flex-1 text-sm border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-300"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="flex items-center gap-1.5 bg-zinc-900 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-zinc-700 transition-colors"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send
        </button>
      </div>
    </div>
  )
}
