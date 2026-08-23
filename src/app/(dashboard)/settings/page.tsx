import { requireAuth } from "@/lib/auth";
import ConsultationSettings from "./ConsultationSettings";
import NotificationPreferences from "./NotificationPreferences";
import { CompanyProfileForm } from "./CompanyProfileForm";
import { EmailDomainCard } from "./EmailDomainCard";

export default async function SettingsPage() {
  const { prismaUser, organization } = await requireAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your organization and account settings
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Company Profile
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Shown on agreements, documents, and client emails
          </p>
        </div>
        <CompanyProfileForm
          profile={{
            name: organization.name,
            email: (organization as unknown as { email?: string | null }).email ?? null,
            phone: organization.phone,
            website: (organization as unknown as { website?: string | null }).website ?? null,
            ciccRegistrationNumber: organization.ciccRegistrationNumber,
            addressLine1: organization.addressLine1,
            addressLine2: organization.addressLine2,
            city: organization.city,
            province: organization.province,
            postalCode: organization.postalCode,
            country: organization.country,
            logoUrl: organization.logoUrl,
          }}
          canEdit={["OWNER", "ADMIN"].includes(prismaUser.role)}
        />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Profile
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Your account details
          </p>
        </div>
        <div className="space-y-4 px-6 py-5">
          <Field label="Name" value={prismaUser.name} />
          <Field label="Email" value={prismaUser.email} />
          <Field label="Role" value={prismaUser.role} />
          <Field label="Phone" value={prismaUser.phone ?? "—"} />
        </div>
      </section>

      <EmailDomainCard />

      <ConsultationSettings />

      <NotificationPreferences />
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </label>
      <p
        className={`mt-1 text-sm text-zinc-900 dark:text-zinc-50 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
