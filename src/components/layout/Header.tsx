"use client";

import { Menu, User, LogOut } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";
import NotificationBell from "./NotificationBell";

export function Header({
  pageTitle,
  onMenuToggle,
  userName,
  userEmail,
}: {
  pageTitle: string;
  onMenuToggle?: () => void;
  userName: string;
  userEmail: string;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 lg:hidden"
            title="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              title="User menu"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                {userName
                  .split(" ")
                  .map((p: string) => p[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <span className="hidden sm:inline">{userName}</span>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className={cn(
                "z-50 min-w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-lg",
                "dark:border-zinc-700 dark:bg-zinc-900",
              )}
            >
              <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {userName}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {userEmail}
                </p>
              </div>

              <DropdownMenu.Item asChild>
                <a
                  href="/settings"
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <User className="h-4 w-4" />
                  Profile & Settings
                </a>
              </DropdownMenu.Item>

              <div className="border-t border-zinc-100 dark:border-zinc-800" />

              <form action={logoutAction}>
                <DropdownMenu.Item asChild>
                  <button
                    type="submit"
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </DropdownMenu.Item>
              </form>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
