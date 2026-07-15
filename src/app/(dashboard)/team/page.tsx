"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Mail,
  Shield,
  MoreHorizontal,
  UserPlus,
  Trash2,
  Loader2,
  Save,
  X,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "CONSULTANT" | "ASSISTANT" | "AUDITOR";
  status: "ACTIVE" | "INVITED" | "DISABLED";
  joinedAt: string;
};

const ROLES = ["OWNER", "ADMIN", "CONSULTANT", "ASSISTANT", "AUDITOR"] as const;

const ROLE_BADGE: Record<string, "info" | "success" | "default" | "warning" | "error"> = {
  OWNER: "error",
  ADMIN: "warning",
  CONSULTANT: "info",
  ASSISTANT: "default",
  AUDITOR: "success",
};

const STATUS_BADGE: Record<string, "success" | "warning" | "default"> = {
  ACTIVE: "success",
  INVITED: "warning",
  DISABLED: "default",
};

const PERMISSION_GROUPS = [
  {
    label: "Cases",
    permissions: [
      { key: "CASES_VIEW", label: "View" },
      { key: "CASES_CREATE", label: "Create" },
      { key: "CASES_EDIT", label: "Edit" },
      { key: "CASES_DELETE", label: "Delete" },
    ],
  },
  {
    label: "Clients",
    permissions: [
      { key: "CLIENTS_VIEW", label: "View" },
      { key: "CLIENTS_CREATE", label: "Create" },
      { key: "CLIENTS_EDIT", label: "Edit" },
      { key: "CLIENTS_DELETE", label: "Delete" },
    ],
  },
  {
    label: "Documents",
    permissions: [
      { key: "DOCUMENTS_VIEW", label: "View" },
      { key: "DOCUMENTS_UPLOAD", label: "Upload" },
      { key: "DOCUMENTS_DELETE", label: "Delete" },
    ],
  },
  {
    label: "Tasks",
    permissions: [
      { key: "TASKS_VIEW", label: "View" },
      { key: "TASKS_CREATE", label: "Create" },
      { key: "TASKS_EDIT", label: "Edit" },
      { key: "TASKS_DELETE", label: "Delete" },
    ],
  },
  {
    label: "Invoices",
    permissions: [
      { key: "INVOICES_VIEW", label: "View" },
      { key: "INVOICES_CREATE", label: "Create" },
      { key: "INVOICES_EDIT", label: "Edit" },
      { key: "INVOICES_DELETE", label: "Delete" },
    ],
  },
  {
    label: "Consultations",
    permissions: [
      { key: "CONSULTATIONS_VIEW", label: "View" },
      { key: "CONSULTATIONS_CREATE", label: "Create" },
      { key: "CONSULTATIONS_EDIT", label: "Edit" },
    ],
  },
  {
    label: "Reports",
    permissions: [
      { key: "REPORTS_VIEW", label: "View" },
      { key: "REPORTS_EXPORT", label: "Export" },
    ],
  },
  {
    label: "Settings",
    permissions: [
      { key: "SETTINGS_VIEW", label: "View" },
      { key: "SETTINGS_EDIT", label: "Edit" },
    ],
  },
  {
    label: "Team",
    permissions: [
      { key: "TEAM_VIEW", label: "View" },
      { key: "TEAM_MANAGE", label: "Manage" },
    ],
  },
  {
    label: "Billing",
    permissions: [
      { key: "BILLING_VIEW", label: "View" },
      { key: "BILLING_MANAGE", label: "Manage" },
    ],
  },
];

type PermissionsData = Record<string, Record<string, boolean>>;

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionsData>({});
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("CONSULTANT");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setMembers(j.data);
      })
      .finally(() => setMembersLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/team/permissions")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setPermissions(j.data);
      })
      .finally(() => setPermissionsLoading(false));
  }, []);

  const changeRole = async (memberId: string, role: string) => {
    const res = await fetch(`/api/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const j = await res.json();
    if (j.data) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: j.data.role } : m)),
      );
    }
    setOpenMemberId(null);
  };

  const removeMember = async (memberId: string) => {
    await fetch(`/api/team/${memberId}`, { method: "DELETE" });
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setOpenMemberId(null);
  };

  const togglePermission = (role: string, perm: string) => {
    if (role === "OWNER") return;
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [perm]: !(prev[role]?.[perm] ?? false),
      },
    }));
  };

  const savePermissions = async () => {
    setPermissionsSaving(true);
    await fetch("/api/team/permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(permissions),
    });
    setPermissionsSaving(false);
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteError("");
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const j = await res.json();
    if (!res.ok) {
      setInviteError(j.error || "Failed to send invite");
      setInviting(false);
      return;
    }
    setInviting(false);
    setShowInvite(false);
    setInviteEmail("");
    setInviteRole("CONSULTANT");
    if (j.data) {
      setMembers((prev) => [...prev, j.data]);
    }
  };

  const allPerms = PERMISSION_GROUPS.flatMap((g) =>
    g.permissions.map((p) => p.key),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Team
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage your team members and their permissions
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite Member
        </button>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Team Members
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {members.length} member{members.length !== 1 ? "s" : ""} across your
            organization
          </p>
        </div>

        {membersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : members.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400">
            No team members yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-6 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          {member.name
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        {member.name}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={ROLE_BADGE[member.role] || "default"}>
                        {member.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={STATUS_BADGE[member.status] || "default"}>
                        {member.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setOpenMemberId(
                              openMemberId === member.id ? null : member.id,
                            )
                          }
                          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {openMemberId === member.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMemberId(null)}
                            />
                            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                              <div className="border-b border-zinc-200 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:border-zinc-700">
                                Change Role
                              </div>
                              {ROLES.filter((r) => r !== member.role).map(
                                (role) => (
                                  <button
                                    key={role}
                                    onClick={() => changeRole(member.id, role)}
                                    className="flex w-full items-center px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                  >
                                    <Shield className="mr-2 h-3 w-3" />
                                    {role}
                                  </button>
                                ),
                              )}
                              <div className="border-t border-zinc-200 dark:border-zinc-700">
                                {member.role !== "OWNER" && (
                                  <button
                                    onClick={() => removeMember(member.id)}
                                    className="flex w-full items-center px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="mr-2 h-3 w-3" />
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Role Permissions
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Configure what each role can access
            </p>
          </div>
          <button
            onClick={savePermissions}
            disabled={permissionsSaving}
            className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {permissionsSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </button>
        </div>

        {permissionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="overflow-x-auto px-6 py-5">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="pb-2 pr-4 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Permission
                  </th>
                  {ROLES.map((role) => (
                    <th
                      key={role}
                      className="pb-2 px-2 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                    >
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {PERMISSION_GROUPS.map((group) => (
                  <>
                    <tr key={group.label}>
                      <td
                        colSpan={ROLES.length + 1}
                        className="pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500"
                      >
                        {group.label}
                      </td>
                    </tr>
                    {group.permissions.map((perm) => (
                      <tr key={perm.key} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                        <td className="py-1.5 pr-4 text-sm text-zinc-700 dark:text-zinc-300">
                          {perm.label}
                        </td>
                        {ROLES.map((role) => {
                          const checked =
                            role === "OWNER"
                              ? true
                              : !!(permissions[role]?.[perm.key] ?? false);
                          return (
                            <td key={role} className="px-2 py-1.5 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={role === "OWNER"}
                                onChange={() =>
                                  togglePermission(role, perm.key)
                                }
                                className={cn(
                                  "h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400",
                                  role === "OWNER" && "opacity-50 cursor-not-allowed",
                                )}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Invite Team Member
              </h3>
              <button
                onClick={() => { setShowInvite(false); setInviteError(""); }}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                >
                  {ROLES.filter((r) => r !== "OWNER").map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {inviteError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {inviteError}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowInvite(false); setInviteError(""); }}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={sendInvite}
                disabled={inviting || !inviteEmail}
                className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
              >
                {inviting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
