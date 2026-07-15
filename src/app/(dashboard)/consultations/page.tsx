"use client";

import { useState, useEffect } from "react";
import { Video, Calendar, Clock, User, Phone, Mail, MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";

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

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("SCHEDULED");

  useEffect(() => {
    const params = new URLSearchParams({ status: filter });
    fetch(`/api/consultations?${params}`)
      .then(r => r.json())
      .then(j => { if (j.data) setConsultations(j.data); })
      .finally(() => setLoading(false));
  }, [filter]);

  const changeStatus = async (id: string, status: string) => {
    await fetch(`/api/consultations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setConsultations(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Consultations</h1>
          <p className="text-sm text-zinc-500">Manage and join video consultations</p>
        </div>
        <Link href="/consultations/book"
          className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
          <Plus className="h-3.5 w-3.5" /> New
        </Link>
      </div>

      <div className="flex gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        {["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              filter === s ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-zinc-400">Loading...</p>
      ) : consultations.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-400">No {filter.toLowerCase().replace("_", " ")} consultations</p>
      ) : (
        <div className="space-y-3">
          {consultations.map(c => {
            const name = c.client ? `${c.client.firstName} ${c.client.lastName}` : c.lead_name;
            const email = c.client ? "" : c.lead_email;
            return (
              <div key={c.id} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{c.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[c.status] ?? ""}`}>
                        {c.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-zinc-500">
                      {name && <p className="flex items-center gap-1.5"><User className="h-3 w-3" /> {name}</p>}
                      {email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {email}</p>}
                      <p className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {new Date(c.start_time).toLocaleDateString()}</p>
                      <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {new Date(c.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — {new Date(c.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.status === "SCHEDULED" && (
                      <Link href={`/consultations/${c.id}`}
                        className="flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
                        <Video className="h-3 w-3" /> Join
                      </Link>
                    )}
                    <div className="relative group">
                      <button className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      <div className="absolute right-0 top-full z-10 mt-1 hidden w-36 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg group-hover:block dark:border-zinc-700 dark:bg-zinc-900">
                        {["COMPLETED", "CANCELLED", "NO_SHOW"].map(s => (
                          <button key={s} onClick={() => changeStatus(c.id, s)}
                            className="flex w-full px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800">
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
      )}
    </div>
  );
}
