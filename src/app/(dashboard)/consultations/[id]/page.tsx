"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Video, Phone, Mail, User, Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import VideoRoom from "@/components/consultations/VideoRoom";

type Consultation = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: string;
  room_name: string | null;
  meeting_link: string | null;
  notes: string | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  consultant: { id: string; name: string; email: string } | null;
  client: { id: string; firstName: string; lastName: string } | null;
};

export default function ConsultationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoToken, setVideoToken] = useState<string | null>(null);
  const [inCall, setInCall] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch(`/api/consultations/${id}`)
      .then(r => r.json())
      .then(j => {
        if (j.data) {
          setConsultation(j.data);
          setNotes(j.data.notes ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const joinVideo = async () => {
    if (!consultation?.room_name) return;
    const res = await fetch("/api/consultations/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName: consultation.room_name, identity: `consultant_${id}`, name: "Consultant" }),
    });
    const json = await res.json();
    if (json.data?.token) {
      setVideoToken(json.data.token);
      setInCall(true);
      await fetch(`/api/consultations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
    }
  };

  const saveNotes = async () => {
    await fetch(`/api/consultations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>;
  }

  if (!consultation) {
    return <p className="py-12 text-center text-sm text-zinc-500">Consultation not found</p>;
  }

  if (inCall && videoToken) {
    return (
      <div className="space-y-4">
        <button onClick={() => { setInCall(false); setVideoToken(null); }} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" /> Back to details
        </button>
        <VideoRoom token={videoToken} roomName={consultation.room_name ?? ""} identity={`consultant_${id}`} onLeave={() => { setInCall(false); setVideoToken(null); }} />
      </div>
    );
  }

  const name = consultation.client ? `${consultation.client.firstName} ${consultation.client.lastName}` : consultation.lead_name;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/consultations" className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{consultation.title}</h1>
          <p className="text-sm text-zinc-500">Consultation details</p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            consultation.status === "SCHEDULED" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
            consultation.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
            consultation.status === "COMPLETED" ? "bg-green-100 text-green-700" :
            "bg-zinc-100 text-zinc-500"
          }`}>
            {consultation.status.replace("_", " ")}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          {name && <p className="flex items-center gap-2 text-zinc-600"><User className="h-4 w-4 text-zinc-400" /> {name}</p>}
          {consultation.lead_email && <p className="flex items-center gap-2 text-zinc-600"><Mail className="h-4 w-4 text-zinc-400" /> {consultation.lead_email}</p>}
          {consultation.lead_phone && <p className="flex items-center gap-2 text-zinc-600"><Phone className="h-4 w-4 text-zinc-400" /> {consultation.lead_phone}</p>}
          <p className="flex items-center gap-2 text-zinc-600"><Calendar className="h-4 w-4 text-zinc-400" /> {new Date(consultation.start_time).toLocaleDateString()}</p>
          <p className="flex items-center gap-2 text-zinc-600"><Clock className="h-4 w-4 text-zinc-400" /> {new Date(consultation.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — {new Date(consultation.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
        </div>

        {consultation.status === "SCHEDULED" && (
          <button onClick={joinVideo}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
            <Video className="h-4 w-4" /> Join Video Call
          </button>
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Notes</h2>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          rows={4} placeholder="Add consultation notes..." />
        <button onClick={saveNotes}
          className="mt-2 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
          Save Notes
        </button>
      </div>
    </div>
  );
}
