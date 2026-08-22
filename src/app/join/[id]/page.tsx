"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Video, Loader2 } from "lucide-react";
import VideoRoom from "@/components/consultations/VideoRoom";

export default function JoinPage() {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [room, setRoom] = useState<{ token: string; roomName: string; identity: string } | null>(null);

  useEffect(() => {
    if (!room) return;
    // nothing else needed — VideoRoom takes over
  }, [room]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setError("");
    try {
      const id = window.location.pathname.split("/").pop();
      const res = await fetch("/api/consultations/guest-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json?.data?.token) throw new Error(json?.error ?? "Could not join");
      setRoom(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the meeting");
    }
    setJoining(false);
  }

  if (room) {
    return (
      <div className="h-screen">
        <VideoRoom
          token={room.token}
          roomName={room.roomName}
          identity={room.identity}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <form onSubmit={join} className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-sm">
          <Video className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Ready to join your meeting</h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Your camera and microphone will be requested when you join.
        </p>
        <button
          type="submit"
          disabled={joining}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
          {joining ? "Connecting…" : "Join Meeting"}
        </button>
        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        <p className="mt-6 text-xs text-zinc-400">
          Trouble joining? Contact your consultant · <Link href="/" className="underline">Home</Link>
        </p>
      </form>
    </div>
  );
}
