"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { RotateCcw, Check, Pencil, Type } from "lucide-react";

interface SignaturePadProps {
  onCapture: (dataUrl: string | null) => void;
  clientName?: string;
}

type Mode = "draw" | "type";

export function SignaturePad({ onCapture, clientName }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState(clientName || "");
  const [isEmpty, setIsEmpty] = useState(true);
  const [currentDataUrl, setCurrentDataUrl] = useState<string | null>(null);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setCurrentDataUrl(null);
    onCapture(null);
  }, [onCapture]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 200;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#18181b";
    clearCanvas();
  }, [clearCanvas]);

  useEffect(() => {
    if (mode !== "type" || !typedName) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "italic 48px 'Brush Script MT', 'Segoe Script', 'Comic Sans MS', cursive";
    ctx.fillStyle = "#18181b";
    ctx.textAlign = "center";
    ctx.fillText(typedName, canvas.width / 2, 130);
    setIsEmpty(false);
    setCurrentDataUrl(canvas.toDataURL());
  }, [typedName, mode]);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    if (mode !== "draw") return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing || mode !== "draw") return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDrawing() {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    setIsEmpty(false);
    setCurrentDataUrl(dataUrl);
  }

  function handleConfirm() {
    if (isEmpty) return;
    onCapture(currentDataUrl);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Signature
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode("draw")}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              mode === "draw"
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
            )}
          >
            <Pencil className="mr-1 inline h-3.5 w-3.5" />
            Draw
          </button>
          <button
            type="button"
            onClick={() => setMode("type")}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              mode === "type"
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
            )}
          >
            <Type className="mr-1 inline h-3.5 w-3.5" />
            Type
          </button>
          <button
            type="button"
            onClick={clearCanvas}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <RotateCcw className="mr-1 inline h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      {mode === "type" && (
        <input
          type="text"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder={clientName ? `Sign for ${clientName}` : "Type your name to sign"}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
      )}

      <div
        className="relative overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
        style={{ touchAction: mode === "draw" ? "none" : "auto" }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full"
          style={{ height: 200 }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {!isEmpty && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
          >
            <Check className="h-3.5 w-3.5" />
            Use this signature
          </button>
        </div>
      )}
    </div>
  );
}
