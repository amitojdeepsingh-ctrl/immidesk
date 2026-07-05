import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  Shield,
  FileText,
  Clock,
  Users,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Client Management",
    description:
      "Centralized client profiles with document storage, communication logs, and intake forms.",
  },
  {
    icon: FileText,
    title: "Form Generation",
    description:
      "Auto-fill IMM forms with client data. Generate complete application packages in minutes.",
  },
  {
    icon: Clock,
    title: "Deadline Tracking",
    description:
      "Automated deadline alerts, status tracking, and compliance calendars for every case.",
  },
  {
    icon: Shield,
    title: "Compliance & Audits",
    description:
      "Full audit trails, retainer agreements, and data retention workflows to meet ICCRC rules.",
  },
];

export default async function HomePage() {
  let isLoggedIn = false;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      },
    );
    const { data } = await supabase.auth.getUser();
    isLoggedIn = !!data?.user;
  } catch {}

  return (
    <div className="flex flex-1 flex-col">
      {/* Nav */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
        <span className="text-sm font-semibold text-zinc-50">ImmigDesk</span>
        <nav className="flex items-center gap-4">
          {isLoggedIn ? (
            <Link
              href="/clients"
              className="flex items-center gap-1.5 rounded-md bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
            >
              Dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-zinc-400 transition-colors hover:text-zinc-50"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
            Immigration Case Management Software
          </h1>
          <p className="mt-4 text-lg text-zinc-400">
            Built for Canadian immigration professionals. Track every case from
            intake to approval, automate form filling, and stay compliant.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-zinc-50 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-800 bg-zinc-900 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-zinc-50">
            Everything you need to manage immigration cases
          </h2>
          <p className="mt-2 text-center text-zinc-400">
            Purpose-built for Canadian immigration consultants and lawyers.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-zinc-700 bg-zinc-950 p-6 transition-colors hover:border-zinc-600"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-800">
                  <feature.icon className="h-5 w-5 text-zinc-300" />
                </div>
                <h3 className="mt-4 font-semibold text-zinc-50">
                  {feature.title}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800 bg-zinc-950 px-6 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-semibold text-zinc-50">
            Ready to streamline your practice?
          </h2>
          <p className="mt-2 text-zinc-400">
            Start your free trial. No credit card required.
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-zinc-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" />
              No setup fees
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Cancel anytime
            </span>
          </div>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-zinc-50 px-6 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 px-6 py-6">
        <p className="text-center text-xs text-zinc-600">
          &copy; {new Date().getFullYear()} ImmigDesk. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
