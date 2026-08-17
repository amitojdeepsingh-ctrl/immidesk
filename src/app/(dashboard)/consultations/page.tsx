"use client";

import { useState, useEffect } from "react";
import {
  CalendarClock,
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Video,
  MoreHorizontal,
  Link2,
  Check,
  ExternalLink,
  Copy,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Consultation = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  room_name: string | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  consultant: { id: string; name: string } | null;
  client: { id: string; firstName: string; lastName: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  NO_SHOW: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const TABS = [
  { id: "book" as const, label: "Book Appointment", icon: CalendarClock },
  { id: "upcoming" as const, label: "Upcoming", icon: Clock },
  { id: "past" as const, label: "Past", icon: CalendarIcon },
];

export default function ConsultationsPage() {
  const [activeTab, setActiveTab] = useState<"book" | "upcoming" | "past">("book");
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  // Cal.com config
  const [calUsername, setCalUsername] = useState("");
  const [calEventType, setCalEventType] = useState("15min");
  const [showConfig, setShowConfig] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("calcom_username");
    const savedEvent = localStorage.getItem("calcom_event");
    if (saved) setCalUsername(saved);
    if (savedEvent) setCalEventType(savedEvent);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab === "upcoming") {
      params.set("status", "SCHEDULED");
    } else if (activeTab === "past") {
      params.set("status", "SCHEDULED,COMPLETED,CANCELLED,NO_SHOW");
    }
    fetch(`/api/consultations?${params}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          if (activeTab === "past") {
            setConsultations(j.data.filter((c: Consultation) => c.status !== "SCHEDULED"));
          } else {
            setConsultations(j.data);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  const changeStatus = async (id: string, status: string) => {
    await fetch(`/api/consultations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setConsultations((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  };

  const saveCalConfig = () => {
    localStorage.setItem("calcom_username", calUsername);
    localStorage.setItem("calcom_event", calEventType);
    setShowConfig(false);
  };

  const calUrl = calUsername
    ? `https://cal.com/${calUsername}/${calEventType}`
    : null;

  const copyLink = async () => {
    if (!calUrl) return;
    try {
      await navigator.clipboard.writeText(calUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = calUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderBookingTab = () => (
    <div className="space-y-6">
      {/* Share link card */}
      {calUrl ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Link2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Share Booking Link
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Send this link to clients so they can book their own appointment.
                  They will enter their name, email, and phone number.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {calUrl}
                  </code>
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                  >
                    {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                  </button>
                  <a
                    href={calUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    <ExternalLink className="h-3 w-3" /> Open
                  </a>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Change Cal.com settings"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Cal.com not configured
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Enter your Cal.com username below to generate a shareable booking link.
          </p>
        </div>
      )}

      {/* Cal.com config */}
      {showConfig && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Cal.com Settings</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Don&apos;t have a Cal.com account?{" "}
            <a href="https://cal.com/signup" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
              Sign up free
            </a>
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Cal.com username</label>
              <input
                type="text"
                value={calUsername}
                onChange={(e) => setCalUsername(e.target.value)}
                placeholder="yourname"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Event type</label>
              <input
                type="text"
                value={calEventType}
                onChange={(e) => setCalEventType(e.target.value)}
                placeholder="15min"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={saveCalConfig}
                disabled={!calUsername}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cal.com embed */}
      {calUrl && (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Book an Appointment
            </h3>
          </div>
          <div className="p-2">
            <iframe
              src={calUrl}
              width="100%"
              height="700"
              className="rounded-md"
              style={{ border: "none" }}
              title="Cal.com booking"
            />
          </div>
        </div>
      )}

      {!calUrl && !showConfig && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarClock className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Configure your Cal.com account to start taking bookings
          </p>
          <button
            onClick={() => setShowConfig(true)}
            className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Configure Cal.com
          </button>
        </div>
      )}
    </div>
  );

  const renderConsultationList = (isPast: boolean) => {
    if (loading) {
      return <p className="py-12 text-center text-sm text-zinc-400">Loading...</p>;
    }

    const filtered = isPast
      ? consultations.filter((c) => c.status !== "SCHEDULED")
      : consultations.filter((c) => c.status === "SCHEDULED");

    if (filtered.length === 0) {
      return (
        <p className="py-12 text-center text-sm text-zinc-400">
          {isPast ? "No past consultations" : "No upcoming consultations"}
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {filtered.map((c) => {
          const name = c.client ? `${c.client.firstName} ${c.client.lastName}` : c.lead_name;
          const email = c.client ? "" : c.lead_email;
          return (
            <div key={c.id} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{c.title}</h3>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_STYLES[c.status])}>
                      {c.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-zinc-500">
                    {name && (
                      <p className="flex items-center gap-1.5">
                        <User className="h-3 w-3" /> {name}
                      </p>
                    )}
                    {email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> {email}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5">
                      <CalendarIcon className="h-3 w-3" />{" "}
                      {new Date(c.start_time).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric", year: "numeric",
                      })}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />{" "}
                      {new Date(c.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} —{" "}
                      {new Date(c.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.status === "SCHEDULED" && (
                    <Link
                      href={`/consultations/${c.id}`}
                      className="flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                    >
                      <Video className="h-3 w-3" /> Join
                    </Link>
                  )}
                  <div className="relative group">
                    <button className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    <div className="absolute right-0 top-full z-10 mt-1 hidden w-36 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg group-hover:block dark:border-zinc-700 dark:bg-zinc-900">
                      {["COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => (
                        <button
                          key={s}
                          onClick={() => changeStatus(c.id, s)}
                          className="flex w-full px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Mark {s.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          <CalendarClock className="h-5 w-5 text-blue-600" />
          Book Appointment
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Let clients book appointments via your Cal.com link — they enter name, email, and phone
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-800/50">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
              activeTab === tab.id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "book" && renderBookingTab()}
      {activeTab === "upcoming" && renderConsultationList(false)}
      {activeTab === "past" && renderConsultationList(true)}
    </div>
  );
}
