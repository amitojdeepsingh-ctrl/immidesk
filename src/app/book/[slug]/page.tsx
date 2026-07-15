"use client";

import { useState, useEffect, use } from "react";
import { Calendar, Clock, User, ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";

type Consultant = { id: string; name: string };
type TimeSlot = { date: string; startTime: string; endTime: string; consultantId: string; consultantName: string };

export default function BookConsultationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [step, setStep] = useState<"date" | "time" | "info" | "confirm">("date");
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [selectedConsultant, setSelectedConsultant] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const today = new Date();
  const [calendarOffset, setCalendarOffset] = useState(0);
  const calStart = new Date(today.getFullYear(), today.getMonth() + calendarOffset, 1);
  const daysInMonth = new Date(calStart.getFullYear(), calStart.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = calStart.getDay();

  useEffect(() => {
    fetch(`/api/consultations/available-slots?slug=${slug}`)
      .then(r => r.json())
      .then(j => {
        if (j.data?.consultants) setConsultants(j.data.consultants);
        if (j.data?.consultants?.length > 0) setSelectedConsultant(j.data.consultants[0].id);
      });
  }, [slug]);

  const loadSlots = (date: string) => {
    fetch(`/api/consultations/available-slots?slug=${slug}&date=${date}`)
      .then(r => r.json())
      .then(j => { if (j.data?.slots) setSlots(j.data.slots); });
  };

  const selectDate = (day: number) => {
    const date = new Date(calStart.getFullYear(), calStart.getMonth(), day);
    const dateStr = date.toISOString().slice(0, 10);
    setSelectedDate(dateStr);
    loadSlots(dateStr);
    setStep("time");
  };

  const selectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep("info");
  };

  const book = async () => {
    if (!selectedSlot || !email) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/consultations/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name,
          email,
          phone,
          consultantId: selectedSlot.consultantId,
          startTime: `${selectedSlot.date}T${selectedSlot.startTime}:00`,
          endTime: `${selectedSlot.date}T${selectedSlot.endTime}:00`,
          title: `Consultation with ${name}`,
        }),
      });
      const json = await res.json();
      if (json.error) setError(json.error.message);
      else setSubmitted(true);
    } catch { setError("Something went wrong"); }
    setSending(false);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="max-w-md text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <h1 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Consultation Booked!</h1>
          <p className="mt-2 text-sm text-zinc-500">We&apos;ll send a confirmation to {email}. You&apos;ll receive a video link before the meeting.</p>
        </div>
      </div>
    );
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Book a Consultation</h1>
          <p className="mt-1 text-sm text-zinc-500">Choose a time that works for you</p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2 text-xs">
          {["date", "time", "info"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                step === s ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" :
                s === "date" && step !== "date" ? "bg-green-500 text-white" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800"
              }`}>{i + 1}</div>
              <span className={step === s ? "text-zinc-900 font-medium dark:text-zinc-50" : "text-zinc-400"}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
              {i < 2 && <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-700" />}
            </div>
          ))}
        </div>

        {step === "date" && (
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalendarOffset(prev => prev - 1)} disabled={calendarOffset <= 0}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{monthNames[calStart.getMonth()]} {calStart.getFullYear()}</h2>
              <button onClick={() => setCalendarOffset(prev => prev + 1)} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {dayNames.map(d => <div key={d} className="text-[10px] font-medium text-zinc-400 py-1">{d}</div>)}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const d = new Date(calStart.getFullYear(), calStart.getMonth(), day);
                const isPast = d < new Date(new Date().toDateString());
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <button key={day} disabled={isPast}
                    onClick={() => selectDate(day)}
                    className={`rounded-md py-2 text-sm transition-colors ${
                      isPast ? "text-zinc-300 cursor-not-allowed dark:text-zinc-700" :
                      isToday ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" :
                      "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "time" && (
          <div className="space-y-4">
            <button onClick={() => setStep("date")} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {new Date(selectedDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </h2>
              {consultants.length > 1 && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-zinc-500">Consultant</label>
                  <select value={selectedConsultant} onChange={e => setSelectedConsultant(e.target.value)}
                    className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
                    {consultants.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {slots.filter(s => !selectedConsultant || s.consultantId === selectedConsultant).length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-400">No available slots for this day</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {slots.filter(s => !selectedConsultant || s.consultantId === selectedConsultant).map((slot, i) => (
                    <button key={i} onClick={() => selectSlot(slot)}
                      className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-50">
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "info" && (
          <div className="space-y-4">
            <button onClick={() => setStep("time")} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              {selectedSlot && (
                <div className="mb-4 rounded-md bg-zinc-50 p-3 dark:bg-zinc-800">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {new Date(selectedSlot.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                  <p className="text-xs text-zinc-500">{selectedSlot.startTime} — {selectedSlot.endTime}</p>
                  {selectedSlot.consultantName && <p className="text-xs text-zinc-500 mt-1">with {selectedSlot.consultantName}</p>}
                </div>
              )}
              <div className="space-y-3">
                <div><label className="text-xs font-medium text-zinc-500">Name <span className="text-red-500">*</span></label><input value={name} onChange={e => setName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" placeholder="Your name" /></div>
                <div><label className="text-xs font-medium text-zinc-500">Email <span className="text-red-500">*</span></label><input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" placeholder="your@email.com" /></div>
                <div><label className="text-xs font-medium text-zinc-500">Phone</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" placeholder="+1 (604) 555-0123" /></div>
              </div>
              {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
              <button onClick={book} disabled={sending || !name || !email}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {sending ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
