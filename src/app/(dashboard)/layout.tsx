import { requireAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { prismaUser, organization } = await requireAuth();

  return (
    <div className="flex h-full min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        organizationName={organization.name}
        userName={prismaUser.name}
        userEmail={prismaUser.email}
      />
      <main className="flex-1 overflow-auto">
        <div className="flex items-center justify-end border-b border-zinc-200 px-6 py-2 dark:border-zinc-800">
          <NotificationBell />
        </div>
        <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
