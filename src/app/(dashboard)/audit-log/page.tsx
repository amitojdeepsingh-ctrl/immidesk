"use client";

import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import Link from "next/link";

type ActivityLog = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  timestamp: string;
};

type OrgUser = {
  id: string;
  name: string;
};

const ENTITY_TYPES = [
  "Case", "Client", "Document", "Task", "Invoice", "Consultation",
  "Agreement", "Payment", "Lead", "Prospect", "User", "Setting",
];

const PER_PAGE = 20;

export default function AuditLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  function buildParams(p: number) {
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("perPage", String(PER_PAGE));
    if (filterUser) params.set("userId", filterUser);
    if (filterAction) params.set("action", filterAction);
    if (filterEntityType) params.set("entityType", filterEntityType);
    if (filterDateFrom) params.set("dateFrom", filterDateFrom);
    if (filterDateTo) params.set("dateTo", filterDateTo);
    return params;
  }

  useEffect(() => {
    setLoading(true);
    fetch(`/api/activity?${buildParams(page)}`)
      .then(r => r.json())
      .then(j => {
        if (j.data) {
          setLogs(j.data.logs ?? []);
          setUsers(j.data.users ?? []);
          if (j.meta) {
            setTotalPages(j.meta.totalPages);
            setTotalCount(j.meta.totalCount);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [page]);

  function handleFilter() {
    setPage(1);
    setLoading(true);
    fetch(`/api/activity?${buildParams(1)}`)
      .then(r => r.json())
      .then(j => {
        if (j.data) {
          setLogs(j.data.logs ?? []);
          setUsers(j.data.users ?? []);
          if (j.meta) {
            setTotalPages(j.meta.totalPages);
            setTotalCount(j.meta.totalCount);
          }
        }
      })
      .finally(() => setLoading(false));
  }

  function getEntityLink(log: ActivityLog): { href: string; label: string } | null {
    const id = log.entityId;
    const type = log.entityType.toLowerCase();
    if (type === "case") return { href: `/cases/${id}`, label: id.slice(0, 8) + "…" };
    if (type === "client") return { href: `/clients/${id}`, label: id.slice(0, 8) + "…" };
    if (type === "task") return { href: `/tasks/${id}`, label: id.slice(0, 8) + "…" };
    if (type === "consultation") return { href: `/consultations/${id}`, label: id.slice(0, 8) + "…" };
    if (type === "invoice") return { href: `/invoices/${id}`, label: id.slice(0, 8) + "…" };
    return null;
  }

  function metadataSummary(meta: Record<string, unknown>): string {
    if (!meta || Object.keys(meta).length === 0) return "—";
    const entries = Object.entries(meta).slice(0, 3);
    return entries.map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`).join(", ");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Audit Log</h1>
        <p className="text-sm text-zinc-500">Track all activity across your organization</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1" style={{ maxWidth: 180 }}>
            <label className="mb-1 block text-[10px] font-medium text-zinc-500 uppercase tracking-wider">User</label>
            <select
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-1" style={{ maxWidth: 180 }}>
            <label className="mb-1 block text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Action</label>
            <input
              type="text"
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              placeholder="Search action..."
              className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          <div className="min-w-0 flex-1" style={{ maxWidth: 160 }}>
            <label className="mb-1 block text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Entity Type</label>
            <select
              value={filterEntityType}
              onChange={e => setFilterEntityType(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">All Types</option>
              {ENTITY_TYPES.map(et => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-zinc-500 uppercase tracking-wider">From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-zinc-500 uppercase tracking-wider">To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          <button
            onClick={handleFilter}
            className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Search className="h-3.5 w-3.5" /> Filter
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {loading ? (
          <p className="py-12 text-center text-sm text-zinc-400">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400">No activity found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 py-3 font-medium text-zinc-500">Timestamp</th>
                  <th className="px-4 py-3 font-medium text-zinc-500">User</th>
                  <th className="px-4 py-3 font-medium text-zinc-500">Action</th>
                  <th className="px-4 py-3 font-medium text-zinc-500">Entity Type</th>
                  <th className="px-4 py-3 font-medium text-zinc-500">Entity ID</th>
                  <th className="px-4 py-3 font-medium text-zinc-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {logs.map(log => {
                  const link = getEntityLink(log);
                  return (
                    <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-zinc-900 dark:text-zinc-50">
                        {log.userName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                        {log.entityType}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {link ? (
                          <Link href={link.href} className="font-mono text-blue-600 hover:underline dark:text-blue-400">
                            {link.label}
                          </Link>
                        ) : (
                          <span className="font-mono text-zinc-500">{log.entityId.slice(0, 8)}…</span>
                        )}
                      </td>
                      <td className="max-w-[250px] truncate px-4 py-2.5 text-zinc-500">
                        {metadataSummary(log.metadata)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">
              Page {page} of {totalPages} ({totalCount} total)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
