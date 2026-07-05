import { requireAuth } from "@/lib/auth";

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
            Organization
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {organization.name}
          </p>
        </div>
        <div className="space-y-4 px-6 py-5">
          <Field label="Organization Name" value={organization.name} />
          <Field label="Slug" value={organization.slug} />
          <Field
            label="CICC Registration Number"
            value={organization.ciccRegistrationNumber ?? "—"}
          />
          <Field label="Address Line 1" value={organization.addressLine1 ?? "—"} />
          <Field label="Address Line 2" value={organization.addressLine2 ?? "—"} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" value={organization.city ?? "—"} />
            <Field label="Province" value={organization.province ?? "—"} />
            <Field label="Postal Code" value={organization.postalCode ?? "—"} />
          </div>
          <Field label="Country" value={organization.country} />
          <Field label="Phone" value={organization.phone ?? "—"} />
          <Field
            label="Logo URL"
            value={organization.logoUrl ?? "—"}
            mono
          />
        </div>
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
