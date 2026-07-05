"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Circle, Search, ChevronDown, ChevronUp } from "lucide-react";

export interface FormField {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "boolean";
  options?: string[];
  required: boolean;
  description?: string;
}

export interface PrefillData {
  [key: string]: string | number | boolean | null | undefined;
}

interface FormFillerFieldListProps {
  fields: FormField[];
  prefilledData: PrefillData;
  onFieldUpdate: (key: string, value: string | number | boolean | null) => void;
}

type FieldGroup = "all" | "filled" | "unfilled" | "required";

const GROUP_LABELS: Record<FieldGroup, string> = {
  all: "All Fields",
  filled: "Auto-Filled",
  unfilled: "Needs Input",
  required: "Required Only",
};

export function FormFillerFieldList({ fields, prefilledData, onFieldUpdate }: FormFillerFieldListProps) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<FieldGroup>("all");
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const fieldStatus = useMemo(() => {
    const status: Record<string, { isFilled: boolean; value: unknown }> = {};
    for (const f of fields) {
      const val = prefilledData[f.key];
      status[f.key] = {
        isFilled: val !== null && val !== undefined && val !== "",
        value: val ?? "",
      };
    }
    return status;
  }, [fields, prefilledData]);

  const filteredFields = useMemo(() => {
    let result = [...fields];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) => f.key.toLowerCase().includes(q) || f.label.toLowerCase().includes(q),
      );
    }

    if (group === "filled") {
      result = result.filter((f) => fieldStatus[f.key]?.isFilled);
    } else if (group === "unfilled") {
      result = result.filter((f) => !fieldStatus[f.key]?.isFilled);
    } else if (group === "required") {
      result = result.filter((f) => f.required);
    }

    return result;
  }, [fields, search, group, fieldStatus]);

  const toggleExpand = (key: string) => {
    const next = new Set(expandedFields);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedFields(next);
  };

  const filledCount = fields.filter((f) => fieldStatus[f.key]?.isFilled).length;
  const totalRequired = fields.filter((f) => f.required).length;
  const filledRequired = fields.filter((f) => f.required && fieldStatus[f.key]?.isFilled).length;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Form Fields
        </h2>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-md bg-green-50 px-3 py-2 text-center dark:bg-green-900/20">
            <p className="text-lg font-semibold text-green-700 dark:text-green-400">{filledCount}</p>
            <p className="text-[10px] text-green-600 dark:text-green-500">Auto-Filled</p>
          </div>
          <div className="rounded-md bg-amber-50 px-3 py-2 text-center dark:bg-amber-900/20">
            <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">
              {fields.length - filledCount}
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-500">Needs Input</p>
          </div>
          <div className="rounded-md bg-blue-50 px-3 py-2 text-center dark:bg-blue-900/20">
            <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
              {filledRequired}/{totalRequired}
            </p>
            <p className="text-[10px] text-blue-600 dark:text-blue-500">Required</p>
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search fields..."
            className="w-full rounded-md border border-zinc-200 py-1.5 pl-8 pr-3 text-xs focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mt-2 flex gap-1">
          {(["all", "filled", "unfilled", "required"] as FieldGroup[]).map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                group === g
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
              )}
            >
              {GROUP_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredFields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-zinc-400">
            <p>No fields match your filter</p>
          </div>
        ) : (
          filteredFields.map((field) => {
            const status = fieldStatus[field.key];
            const isExpanded = expandedFields.has(field.key);
            const Icon = status?.isFilled ? CheckCircle2 : field.required ? AlertCircle : Circle;

            return (
              <div
                key={field.key}
                className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
              >
                <button
                  onClick={() => toggleExpand(field.key)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      status?.isFilled
                        ? "text-green-500"
                        : field.required
                          ? "text-amber-500"
                          : "text-zinc-300 dark:text-zinc-600",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {field.label}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {field.key}
                      {field.required && <span className="ml-1.5 text-amber-500">*required</span>}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                    {field.description && (
                      <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{field.description}</p>
                    )}

                    {field.type === "boolean" ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            onFieldUpdate(field.key, prefilledData[field.key] === true ? false : true)
                          }
                          className={cn(
                            "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
                            prefilledData[field.key] === true
                              ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400",
                          )}
                        >
                          {prefilledData[field.key] === true ? "Yes" : "No"}
                        </button>
                      </div>
                    ) : field.type === "select" && field.options ? (
                      <select
                        value={String(prefilledData[field.key] ?? "")}
                        onChange={(e) => onFieldUpdate(field.key, e.target.value)}
                        className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        <option value="">Select...</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === "date" ? "date" : "text"}
                        value={String(prefilledData[field.key] ?? "")}
                        onChange={(e) => onFieldUpdate(field.key, e.target.value)}
                        className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
