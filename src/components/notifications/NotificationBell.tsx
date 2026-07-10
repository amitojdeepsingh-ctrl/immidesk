"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, CheckCircle2, FileText, MessageSquare, AlertTriangle, Calendar } from "lucide-react";
import Link from "next/link";
import { cn, formatRelativeTime } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const ACTION_ICONS: Record<string, typeof Bell> = {
  DOCUMENT_UPLOADED: FileText,
  PORTAL_MESSAGE: MessageSquare,
  DEADLINE_APPROACHING: AlertTriangle,
  TASK_ASSIGNED: Calendar,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.data) {
        setNotifications(json.data.notifications ?? []);
        setUnreadCount(json.data.unreadCount ?? 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAsRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchNotifications();
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readAll: true }),
    });
    fetchNotifications();
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900 z-50">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-zinc-400">No notifications yet</p>
            ) : (
              notifications.slice(0, 15).map(n => {
                const Icon = ACTION_ICONS[n.title] ?? Bell;
                return (
                  <div key={n.id} className={cn(
                    "flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
                    !n.read && "bg-blue-50/50 dark:bg-blue-950/10"
                  )}>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <Icon className="h-3.5 w-3.5 text-zinc-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {n.link ? (
                        <Link href={n.link} onClick={() => { if (!n.read) markAsRead(n.id); }} className="text-sm font-medium text-zinc-900 hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300">
                          {n.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{n.title}</p>
                      )}
                      {n.message && <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{n.message}</p>}
                      <p className="mt-0.5 text-[10px] text-zinc-400">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <button onClick={() => markAsRead(n.id)} className="mt-1 shrink-0 text-zinc-300 hover:text-green-500">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
