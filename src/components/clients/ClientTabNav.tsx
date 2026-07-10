"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, FileText, FilePen, Bell, CreditCard, MessageSquare, Activity } from "lucide-react";

const tabs = [
  { label: "Overview",   href: "",           icon: User },
  { label: "Timeline",   href: "/timeline",  icon: Activity },
  { label: "Documents",  href: "/documents", icon: FileText },
  { label: "Agreement",  href: "/agreement", icon: FilePen },
  { label: "Updates",    href: "/updates",   icon: Bell },
  { label: "Messages",   href: "/messages",  icon: MessageSquare },
  { label: "Payments",   href: "/payments",  icon: CreditCard },
];

export function ClientTabNav({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/clients/${clientId}`;

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800">
      <nav className="-mb-px flex gap-0">
        {tabs.map(({ label, href, icon: Icon }) => {
          const fullHref = `${base}${href}`;
          const isActive = href === ""
            ? pathname === base
            : pathname.startsWith(fullHref);

          return (
            <Link
              key={label}
              href={fullHref}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                  : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
