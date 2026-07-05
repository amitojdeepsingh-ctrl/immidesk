"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  User,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import {
  DocumentCategory,
  DocumentCategoryLabel,
} from "@/types";
import type { DocumentCategory as DocCatType } from "@/types";
import {
  isAllowedExtension,
  getAllowedExtensionsString,
  guessCategoryFromFileName,
} from "@/lib/document-naming";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-rar-compressed",
];

interface UploadState {
  status: "idle" | "uploading" | "done" | "error";
  progress: number;
  errorMessage?: string;
  documentName?: string;
}

interface ClientPortalUploadFormProps {
  token: string;
}

interface ClientInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  passportNumber: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

const emptyClient: ClientInfo = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  passportNumber: "",
  addressLine1: "",
  city: "",
  province: "",
  postalCode: "",
  country: "",
};

export function ClientPortalUploadForm({ token }: ClientPortalUploadFormProps) {
  const [clientInfo, setClientInfo] = useState<ClientInfo>(emptyClient);
  const [infoSubmitted, setInfoSubmitted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocCatType>(DocumentCategory.OTHER);
  const [notes, setNotes] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const resolvedAccept =
    getAllowedExtensionsString() +
    ",.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip";

  const updateInfo = (field: keyof ClientInfo, value: string) => {
    setClientInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientInfo.firstName.trim() || !clientInfo.lastName.trim()) return;
    setInfoSubmitted(true);
  };

  const validateAndSetFile = useCallback(
    (newFile: File | null) => {
      if (!newFile) return;
      if (!ALLOWED_MIMES.includes(newFile.type) && !isAllowedExtension(newFile.name)) {
        setUploadState({
          status: "error",
          progress: 0,
          errorMessage: `Unsupported file type: ${newFile.type || "unknown"}`,
        });
        setFile(null);
        return;
      }
      if (newFile.size > MAX_FILE_SIZE) {
        setUploadState({
          status: "error",
          progress: 0,
          errorMessage: `File too large (${formatFileSize(newFile.size)}). Max ${formatFileSize(MAX_FILE_SIZE)}.`,
        });
        setFile(null);
        return;
      }
      if (newFile.size === 0) {
        setUploadState({
          status: "error",
          progress: 0,
          errorMessage: "File is empty",
        });
        setFile(null);
        return;
      }

      const guessed = guessCategoryFromFileName(newFile.name);
      if (guessed) setCategory(guessed);

      setFile(newFile);
      setUploadState({ status: "idle", progress: 0 });
    },
    [],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      if (e.dataTransfer.files.length > 0) {
        validateAndSetFile(e.dataTransfer.files[0]);
      }
    },
    [validateAndSetFile],
  );

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setUploadState({ status: "uploading", progress: 10 });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("token", token);
      formData.append("category", category);
      if (notes.trim()) formData.append("notes", notes.trim());
      formData.append("clientFirstName", clientInfo.firstName.trim());
      formData.append("clientLastName", clientInfo.lastName.trim());
      if (clientInfo.dateOfBirth) formData.append("clientDateOfBirth", clientInfo.dateOfBirth);
      if (clientInfo.passportNumber) formData.append("clientPassportNumber", clientInfo.passportNumber.trim());
      if (clientInfo.addressLine1) formData.append("clientAddressLine1", clientInfo.addressLine1.trim());
      if (clientInfo.city) formData.append("clientCity", clientInfo.city.trim());
      if (clientInfo.province) formData.append("clientProvince", clientInfo.province.trim());
      if (clientInfo.postalCode) formData.append("clientPostalCode", clientInfo.postalCode.trim());
      if (clientInfo.country) formData.append("clientCountry", clientInfo.country.trim());

      const response = await fetch("/api/client-portal/upload", {
        method: "POST",
        body: formData,
      });

      setUploadState((s) => ({ ...s, progress: 70 }));

      if (!response.ok) {
        const body = await response.json();
        throw new Error(
          body?.error?.message ?? `Upload failed (${response.status})`,
        );
      }

      const result = await response.json();

      setUploadState({
        status: "done",
        progress: 100,
        documentName: result.data?.name ?? file.name,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      setUploadState({
        status: "error",
        progress: 0,
        errorMessage: message,
      });
    }
  }, [file, token, category, notes, clientInfo]);

  const handleReset = useCallback(() => {
    setFile(null);
    setCategory(DocumentCategory.OTHER);
    setNotes("");
    setUploadState({ status: "idle", progress: 0 });
  }, []);

  const isIdle = uploadState.status === "idle";
  const isDone = uploadState.status === "done";
  const isError = uploadState.status === "error";
  const isUploading = uploadState.status === "uploading";

  return (
    <div className="space-y-4">
      {/* Client info form — shown once before upload */}
      {!infoSubmitted && (
        <form onSubmit={handleInfoSubmit} className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              <User className="h-4 w-4" />
              Your Information
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={clientInfo.firstName}
                    onChange={(e) => updateInfo("firstName", e.target.value)}
                    required
                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={clientInfo.lastName}
                    onChange={(e) => updateInfo("lastName", e.target.value)}
                    required
                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={clientInfo.dateOfBirth}
                    onChange={(e) => updateInfo("dateOfBirth", e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Passport Number
                  </label>
                  <input
                    type="text"
                    value={clientInfo.passportNumber}
                    onChange={(e) => updateInfo("passportNumber", e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Address
                </label>
                <input
                  type="text"
                  value={clientInfo.addressLine1}
                  onChange={(e) => updateInfo("addressLine1", e.target.value)}
                  placeholder="Street address"
                  className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    City
                  </label>
                  <input
                    type="text"
                    value={clientInfo.city}
                    onChange={(e) => updateInfo("city", e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                  />
                </div>
                <div className="col-span-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Province
                  </label>
                  <input
                    type="text"
                    value={clientInfo.province}
                    onChange={(e) => updateInfo("province", e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                  />
                </div>
                <div className="col-span-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={clientInfo.postalCode}
                    onChange={(e) => updateInfo("postalCode", e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                  />
                </div>
                <div className="col-span-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Country
                  </label>
                  <input
                    type="text"
                    value={clientInfo.country}
                    onChange={(e) => updateInfo("country", e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!clientInfo.firstName.trim() || !clientInfo.lastName.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
          >
            Continue to Upload
          </button>
        </form>
      )}

      {/* Upload section — shown after client info */}
      {infoSubmitted && (
        <>
          {/* Drop zone */}
          {!isDone && (
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
                isDragging
                  ? "border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-800"
                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-900",
                file && "border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900",
              )}
            >
              {file ? (
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-zinc-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {file.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setUploadState({ status: "idle", progress: 0 });
                    }}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="mb-3 h-8 w-8 text-zinc-400" />
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                    Drag & drop your file here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    PDF, images, Word, Excel — up to {formatFileSize(MAX_FILE_SIZE)}
                  </p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={resolvedAccept}
                onChange={(e) => {
                  validateAndSetFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {/* Category + notes */}
          {file && isIdle && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Document Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocCatType)}
                  className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                >
                  {Object.entries(DocumentCategoryLabel).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information about this document…"
                  rows={2}
                  maxLength={1000}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 resize-none"
                />
              </div>
            </div>
          )}

          {/* Progress bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading {file?.name}…
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-zinc-600 transition-all duration-500 dark:bg-zinc-400"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  Upload failed
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {uploadState.errorMessage}
                </p>
              </div>
            </div>
          )}

          {/* Success */}
          {isDone && (
            <div className="flex flex-col items-center rounded-lg border border-green-200 bg-green-50 px-6 py-8 text-center dark:border-green-900 dark:bg-green-950/30">
              <CheckCircle2 className="mb-3 h-10 w-10 text-green-500 dark:text-green-400" />
              <h3 className="text-base font-semibold text-green-700 dark:text-green-300">
                Upload Complete
              </h3>
              <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                {uploadState.documentName ?? file?.name} has been uploaded
                successfully.
              </p>
              <button
                onClick={handleReset}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Another File
              </button>
            </div>
          )}

          {/* Upload button */}
          {file && isIdle && (
            <button
              onClick={handleUpload}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </button>
          )}
        </>
      )}
    </div>
  );
}
