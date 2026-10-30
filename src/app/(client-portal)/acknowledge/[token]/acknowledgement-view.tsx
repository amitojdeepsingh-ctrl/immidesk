"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, ExternalLink, Eye, FileText, Loader2, Pen, Printer, RotateCcw } from "lucide-react";

interface AcknowledgementViewProps {
  token: string;
  acknowledgementId: string;
  title: string;
  statementVersion: string;
  status: string;
  signedAt: string | null;
  printedName: string | null;
  statement: string[];
  documents: string[];
  documentsUrl: string;
  caseTitle: string | null;
  clientName: string;
  clientEmail: string;
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
    token, acknowledgementId, statementVersion, status, signedAt, printedName,
    statement, documents, documentsUrl, caseTitle, clientName, clientEmail, org,
  } = props;

  const [showDocuments, setShowDocuments] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [nameInput, setNameInput] = useState(clientName);
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
            Thank you, {printedName ?? nameInput}. Your signature has been added to the acknowledgement page
            {signedAt ? ` (${fmtDate(signedAt)})` : ""}.
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
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Acknowledgement of documents</h1>
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
            Acknowledgement of Documents
          </h2>
          <p className="mt-1 text-center text-xs text-zinc-500">
            {org.name}
            {org.ciccNumber ? ` · RCIC ${org.ciccNumber}` : ""} · Statement version {statementVersion}
          </p>
          {caseTitle && (
            <p className="mt-4 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">{caseTitle}</p>
          )}

          <div className="mt-6 space-y-4">
            {statement.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          <h3 className="mt-7 font-bold text-zinc-900 dark:text-zinc-50">
            Documents attached ({documents.length})
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {documents.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>

          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 print:hidden dark:border-zinc-700 dark:bg-zinc-800/60">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Open the file and check that the pages inside are yours before you sign.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowDocuments((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                <Eye className="h-3.5 w-3.5" />
                {showDocuments ? "Hide documents" : "View documents"}
              </button>
              <a
                href={documentsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open in a new tab
              </a>
              <a
                href={`${documentsUrl}&download=1`}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            </div>

            {showDocuments && (
              <div className="mt-3 overflow-hidden rounded-md border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900">
                <iframe
                  src={documentsUrl}
                  title="Documents attached to this acknowledgement"
                  className="h-[70vh] w-full"
                />
                <p className="border-t border-zinc-200 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-700">
                  If the file does not display here, use &ldquo;Open in a new tab&rdquo; above.
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-700">
            <div className="space-y-6">
              <div>
                <p className="text-xs text-zinc-500">Client name</p>
                <p className="min-h-[1.6rem] text-base font-medium text-zinc-900 dark:text-zinc-50">
                  {status === "SIGNED" ? printedName : ""}
                </p>
                <div className="mt-1 border-b border-zinc-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Signature</p>
                <div className="mt-1 min-h-[3rem] border-b border-zinc-400" />
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs text-zinc-500">Date</p>
                  <p className="min-h-[1.6rem] text-sm">{status === "SIGNED" ? fmtDate(signedAt) : ""}</p>
                  <div className="mt-1 border-b border-zinc-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Client email</p>
                  <p className="min-h-[1.6rem] text-sm">{clientEmail}</p>
                  <div className="mt-1 border-b border-zinc-400" />
                </div>
              </div>
            </div>
          </div>

          <p className="mt-8 flex items-center gap-1.5 text-xs text-zinc-500">
            <FileText className="h-3.5 w-3.5" />
            The acknowledgement page is appended to the end of the documents listed above.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 print:hidden dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              <Pen className="h-4 w-4" /> Sign here
            </div>
            {hasSignature && (
              <button onClick={clearCanvas} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600">
                <RotateCcw className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Client name
          </label>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
            <span>I confirm the statement above and that the documents listed are the documents I provided.</span>
          </label>

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

          <button
            onClick={submit}
            disabled={submitting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40 dark:bg-brand-500 dark:text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signing…
              </>
            ) : (
              "Sign acknowledgement"
            )}
          </button>
          <p className="mt-3 text-center text-xs text-zinc-400">
            Your name, signature, date and IP address are recorded on the acknowledgement page.
          </p>
        </div>
      </div>
    </div>
  );
}
