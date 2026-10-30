"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Pen, Printer, RotateCcw, ShieldCheck } from "lucide-react";
import type { AcknowledgementClause, AcknowledgementItem } from "@/lib/document-acknowledgement";

interface AcknowledgementViewProps {
  token: string;
  acknowledgementId: string;
  title: string;
  statementVersion: string;
  status: string;
  signedAt: string | null;
  printedName: string | null;
  clientNote: string | null;
  items: AcknowledgementItem[];
  clauses: AcknowledgementClause[];
  clientName: string;
  clientEmail: string;
  caseTitle: string | null;
  org: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string;
    ciccNumber: string | null;
  };
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

export function AcknowledgementView(props: AcknowledgementViewProps) {
  const {
    token, acknowledgementId, title, statementVersion, status, signedAt, printedName,
    clientNote, items, clauses, clientName, caseTitle, org,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(status === "SIGNED");
  const [error, setError] = useState<string | null>(null);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const src = "touches" in e ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#18181b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasSignature(true);
  }

  function endDraw() {
    setDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function submit() {
    setError(null);
    if (!hasSignature) return setError("Please draw your signature.");
    if (nameInput.trim().length < 2) return setError("Please type your full name.");
    if (!confirmed) return setError("Please tick the confirmation box.");

    setSubmitting(true);
    try {
      const signatureData = canvasRef.current!.toDataURL("image/png");
      const res = await fetch("/api/client-portal/acknowledgement/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          acknowledgementId,
          signatureData,
          printedName: nameInput.trim(),
          clientNote: noteInput.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not submit");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Acknowledgement signed</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Thank you, {printedName ?? clientName}. You confirmed {items.length} document
            {items.length === 1 ? "" : "s"} for {org.name}
            {signedAt ? ` on ${fmtDate(signedAt)}` : ""}.
          </p>
          <p className="mt-4 text-xs text-zinc-400">
            A signed copy is on file with your consultant. You can close this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 print:bg-white dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-white px-4 py-4 print:hidden dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500">{org.name}</p>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Document Acknowledgement</h1>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 print:px-0 print:py-0">
        <div className="rounded-xl border border-zinc-200 bg-white px-8 py-10 text-sm leading-relaxed text-zinc-800 shadow-sm print:rounded-none print:border-none print:shadow-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <h2 className="text-center text-lg font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-50">
            Document Acknowledgement
          </h2>
          <p className="mt-1 text-center text-xs text-zinc-500">
            {org.name}
            {org.ciccNumber ? ` · RCIC ${org.ciccNumber}` : ""} · Statement version {statementVersion}
          </p>
          {caseTitle && (
            <p className="mt-4 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">{caseTitle}</p>
          )}

          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-800/60">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Client</p>
            <p className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-50">{clientName}</p>
            <p className="text-xs text-zinc-500">{props.clientEmail}</p>
          </div>

          <ol className="mt-6 list-decimal space-y-2 pl-5">
            {clauses.map((c) => (
              <li key={c.number}>{c.text}</li>
            ))}
          </ol>

          <h3 className="mt-7 font-bold text-zinc-900 dark:text-zinc-50">
            Documents covered ({items.length})
          </h3>
          <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                  <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Document</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {items.map((item, i) => (
                  <tr key={item.documentId}>
                    <td className="px-3 py-2 text-zinc-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">{item.name}</td>
                    <td className="px-3 py-2 text-zinc-500">{item.category.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 text-zinc-500">
                      {item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString("en-CA") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-700">
            <p className="mb-2 flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-50">
              <ShieldCheck className="h-4 w-4" /> Signed
            </p>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="font-medium">{clientName} (client)</p>
                <div className="mt-6 border-b border-zinc-400" />
                <p className="mt-1 text-xs text-zinc-500">Signature</p>
              </div>
              <div>
                <p className="font-medium">Date</p>
                <div className="mt-6 border-b border-zinc-400" />
                <p className="mt-1 text-xs text-zinc-500">Signed electronically</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 print:hidden dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              <Pen className="h-4 w-4" /> Confirm and sign
            </div>
            {hasSignature && (
              <button onClick={clearCanvas} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600">
                <RotateCcw className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Type your full name
          </label>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder={clientName}
            className="mb-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />

          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Disclosures or notes (optional)
          </label>
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            rows={2}
            placeholder="e.g. Bank statement for March has a missing page; gift from my father in 2025."
            className="mb-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />

          <canvas
            ref={canvasRef}
            width={680}
            height={140}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            className="w-full touch-none cursor-crosshair rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800"
            style={{ height: 140 }}
          />
          {!hasSignature && <p className="mt-2 text-center text-xs text-zinc-400">Draw your signature above</p>}

          <label className="mt-4 flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              I have read the statement above and confirm that the {items.length} document
              {items.length === 1 ? "" : "s"} listed are the documents I provided.
            </span>
          </label>

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

          <button
            onClick={submit}
            disabled={submitting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40 dark:bg-brand-500 dark:text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              "Sign and confirm documents"
            )}
          </button>
          <p className="mt-3 text-center text-xs text-zinc-400">
            Your signature, name, date, and IP address are recorded with the document list.
          </p>
        </div>

        {clientNote && status === "SIGNED" && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-zinc-200 bg-white p-4 text-xs text-zinc-600 print:hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <FileText className="mt-0.5 h-3.5 w-3.5" />
            <span>Disclosure on file: {clientNote}</span>
          </div>
        )}
      </div>
    </div>
  );
}
