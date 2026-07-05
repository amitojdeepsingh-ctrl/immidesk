"use client";

import { useState } from "react";
import { CheckCircle2, PenLine, LayoutDashboard, FileText, MessageSquare, CreditCard, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalTabOverview } from "./portal-tab-overview";
import { PortalTabDocs } from "./portal-tab-docs";
import { PortalTabMessages } from "./portal-tab-messages";
import { PortalTabPayments } from "./portal-tab-payments";
import { PortalTabFaq } from "./portal-tab-faq";

export interface ExistingDoc {
  id: string;
  name: string;
  category: string;
  sizeBytes: number;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  receiptNumber: string | null;
  notes: string | null;
}

export interface MessageRecord {
  id: string;
  content: string;
  sentByClient: boolean;
  senderName: string | null;
  createdAt: string;
}

interface ClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

interface PortalViewProps {
  token: string;
  caseId: string;
  caseType: string;
  caseLabel: string;
  caseStatus: string;
  orgName: string;
  client: ClientInfo;
  checklist: string[];
  docsUploaded: number;
  existingDocs: ExistingDoc[];
  agreementStatus: string | null;
  agreementSignedAt: string | null;
  payments: PaymentRecord[];
  messages: MessageRecord[];
}

type Tab = "overview" | "documents" | "messages" | "payments" | "faq";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

export function PortalView({
  token,
  caseId,
  caseType,
  caseLabel,
  caseStatus,
  orgName,
  client,
  checklist,
  docsUploaded,
  existingDocs,
  agreementStatus,
  agreementSignedAt,
  payments,
  messages,
}: PortalViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{orgName}</p>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{caseLabel}</h1>
          <p className="text-sm text-zinc-500">Welcome, {client.firstName} {client.lastName}</p>
        </div>
      </div>

      {/* Agreement status banner */}
      {agreementStatus && (
        <div className={cn(
          "border-b px-4 py-3",
          agreementStatus === "SIGNED"
            ? "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20"
            : "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"
        )}>
          <div className="mx-auto max-w-3xl flex items-center gap-2 text-sm">
            {agreementStatus === "SIGNED" ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                <span className="font-medium text-green-800 dark:text-green-300">Service agreement signed</span>
                {agreementSignedAt && (
                  <span className="text-green-600 dark:text-green-500">
                    — {new Date(agreementSignedAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                )}
              </>
            ) : (
              <>
                <PenLine className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-amber-800 dark:text-amber-300">Service agreement not yet signed</span>
                <span className="text-amber-600 dark:text-amber-500">— check your email for the signing link</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab nav */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl">
          <nav className="flex overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === id
                    ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="mx-auto max-w-3xl px-4 py-8">
        {activeTab === "overview" && (
          <PortalTabOverview
            caseStatus={caseStatus}
            caseLabel={caseLabel}
            checklist={checklist}
            docsUploaded={docsUploaded}
            existingDocs={existingDocs}
            agreementStatus={agreementStatus}
            agreementSignedAt={agreementSignedAt}
            clientEmail={client.email}
          />
        )}
        {activeTab === "documents" && (
          <PortalTabDocs
            token={token}
            caseId={caseId}
            caseType={caseType}
            caseLabel={caseLabel}
            client={client}
            checklist={checklist}
            existingDocs={existingDocs}
            docsUploaded={docsUploaded}
          />
        )}
        {activeTab === "messages" && (
          <PortalTabMessages
            token={token}
            caseId={caseId}
            client={{ firstName: client.firstName, lastName: client.lastName }}
            initialMessages={messages}
          />
        )}
        {activeTab === "payments" && (
          <PortalTabPayments
            payments={payments}
            agreementStatus={agreementStatus}
            agreementSignedAt={agreementSignedAt}
          />
        )}
        {activeTab === "faq" && (
          <PortalTabFaq caseType={caseType} caseLabel={caseLabel} />
        )}
      </div>
    </div>
  );
}
