"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  GitBranch,
  Settings,
  LogOut,
  Send,
  Target,
  Receipt,
  ClipboardList,
  FilePen,
  CreditCard,
  Briefcase,
  Calendar,
  Calculator,
  Inbox,
  Video,
  BarChart3,
  Settings2,
  Brain,
  Wallet,
  ListChecks,
} from "lucide-react";
import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Cases", href: "/cases", icon: Briefcase },
  { label: "Tasks", href: "/tasks", icon: Calendar },
  { label: "Consultations", href: "/consultations", icon: Video },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Configuration", href: "/configuration", icon: Settings2 },
  { label: "Audit Log", href: "/audit-log", icon: ClipboardList },
  { label: "Agreements", href: "/agreements", icon: FilePen },
  { label: "Payments", href: "/payments", icon: Wallet },
  { label: "LMIA", href: "/lmia", icon: ClipboardList },
  { label: "Newsletter", href: "/newsletter", icon: Send },
  { label: "Prospects", href: "/prospects", icon: ListChecks },
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "CRS Calculator", href: "/crs", icon: Calculator },
  { label: "Forms", href: "/forms", icon: FileSpreadsheet },
  { label: "News & Draws", href: "/draws", icon: GitBranch },
  { label: "Submissions", href: "/submissions", icon: Inbox },
  { label: "AI Features", href: "/ai", icon: Brain },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({
  organizationName,
  userName,
  userEmail,
}: {
  organizationName: string;
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <Link href="/dashboard" className="flex h-16 items-center justify-center border-b border-zinc-200 px-4 hover:bg-zinc-50 transition-colors dark:border-zinc-800 dark:hover:bg-zinc-800/50">
        <Image src="/ads-logo.svg" alt="ADS Immigration Services" width={160} height={48} priority />
      </Link>

      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href.length > 1 && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            {userName
              .split(" ")
              .map((p: string) => p[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-50">
              {userName}
            </p>
            <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              {userEmail}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
