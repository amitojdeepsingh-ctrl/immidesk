"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalTabFaqProps {
  caseType: string;
  caseLabel: string;
}

interface FaqItem {
  q: string;
  a: string;
}

interface FaqGroup {
  title: string;
  items: FaqItem[];
}

const PROCESSING_TIMES: Record<string, string> = {
  WORK_PERMIT: "roughly 2–8 weeks",
  LMIA_BASED_WORK_PERMIT: "roughly 2–8 weeks (plus LMIA processing time)",
  LMIA_EXEMPT_WORK_PERMIT: "roughly 2–8 weeks",
  STUDY_PERMIT: "roughly 4–16 weeks",
  EXPRESS_ENTRY: "roughly 6 months after an Invitation to Apply",
  PNP: "roughly 6–18 months depending on stream and province",
  VISITOR_VISA: "roughly 2–4 weeks",
  FAMILY_SPONSORSHIP: "roughly 12–24 months",
  SPOUSAL_SPONSORSHIP: "roughly 12–24 months",
};

function getTimeline(caseType: string): string {
  return PROCESSING_TIMES[caseType] ?? "variable — your consultant will keep you updated";
}

const ALWAYS_SHOWN: FaqItem[] = [
  {
    q: "What happens after I submit my documents?",
    a: "Your consultant will review everything, prepare your application, and notify you before submission. You will receive updates at each major milestone.",
  },
  {
    q: "Can I check my application status myself?",
    a: "Yes — once submitted, you can check at ircc.canada.ca/en/immigration-refugees-citizenship/services/application/check-status.html",
  },
  {
    q: "What if I need to make changes?",
    a: "Contact your consultant immediately if anything changes — address, marital status, employment, travel history. Changes mid-application can be critical.",
  },
  {
    q: "How do I pay for government fees?",
    a: "Government processing fees are paid directly to IRCC and are separate from your consultant's fee. Your consultant will guide you on when and how to pay.",
  },
];

const WORK_PERMIT_FAQS: FaqItem[] = [
  {
    q: "Do I need a medical exam?",
    a: "Certain occupations (healthcare, childcare, food handling) require a medical exam. Your consultant will advise if one is needed.",
  },
  {
    q: "Can my family come with me?",
    a: "Depending on your work permit type, your spouse may qualify for an open work permit and your children for a study permit. Discuss this with your consultant.",
  },
];

const EXPRESS_ENTRY_FAQS: FaqItem[] = [
  {
    q: "What is a CRS score?",
    a: "The Comprehensive Ranking System (CRS) scores candidates based on age, education, language, and work experience. Higher scores receive Invitations to Apply (ITAs) in draws.",
  },
  {
    q: "How often does IRCC run Express Entry draws?",
    a: "IRCC typically runs draws every 2 weeks, though timing varies. Your consultant monitors draws and will notify you when relevant ones occur.",
  },
];

const STUDY_PERMIT_FAQS: FaqItem[] = [
  {
    q: "Can I work while studying?",
    a: "Most full-time students at designated learning institutions (DLIs) can work up to 20 hours/week during semesters and full-time during scheduled breaks.",
  },
  {
    q: "What is a DLI?",
    a: "A Designated Learning Institution is a school approved by the provincial government to host international students. Your school must be a DLI for your study permit.",
  },
];

const FAMILY_SPONSORSHIP_FAQS: FaqItem[] = [
  {
    q: "Can the sponsored person work while waiting?",
    a: "If sponsoring a spouse or partner, they may apply for an open work permit (OWP) while the sponsorship is processing. Discuss eligibility with your consultant.",
  },
];

function buildGroups(caseType: string, caseLabel: string): FaqGroup[] {
  const timeline = getTimeline(caseType);
  const alwaysShown: FaqItem[] = [
    {
      q: "How long will my application take?",
      a: `For a ${caseLabel} application, processing typically takes ${timeline}. These are general estimates — actual times vary by individual circumstances, IRCC volumes, and completeness of your application.`,
    },
    ...ALWAYS_SHOWN,
  ];

  const groups: FaqGroup[] = [{ title: "General", items: alwaysShown }];

  const isWorkPermit = ["WORK_PERMIT", "LMIA_BASED_WORK_PERMIT", "LMIA_EXEMPT_WORK_PERMIT"].includes(caseType);
  const isExpressEntry = ["EXPRESS_ENTRY", "PNP"].includes(caseType);
  const isStudyPermit = caseType === "STUDY_PERMIT";
  const isFamily = ["FAMILY_SPONSORSHIP", "SPOUSAL_SPONSORSHIP"].includes(caseType);

  if (isWorkPermit) {
    groups.push({ title: "Work Permits", items: WORK_PERMIT_FAQS });
  }
  if (isExpressEntry) {
    groups.push({ title: "Express Entry & PNP", items: EXPRESS_ENTRY_FAQS });
  }
  if (isStudyPermit) {
    groups.push({ title: "Study Permits", items: STUDY_PERMIT_FAQS });
  }
  if (isFamily) {
    groups.push({ title: "Family Sponsorship", items: FAMILY_SPONSORSHIP_FAQS });
  }

  return groups;
}

function FaqAccordionItem({ item, index, openIndex, onToggle }: {
  item: FaqItem;
  index: number;
  openIndex: number | null;
  onToggle: (i: number) => void;
}) {
  const isOpen = openIndex === index;
  return (
    <div className={cn("border-b border-zinc-100 last:border-0 dark:border-zinc-800")}>
      <button
        onClick={() => onToggle(index)}
        className="flex w-full items-start justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{item.q}</span>
        {isOpen
          ? <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0">
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{item.a}</p>
        </div>
      )}
    </div>
  );
}

export function PortalTabFaq({ caseType, caseLabel }: PortalTabFaqProps) {
  const groups = buildGroups(caseType, caseLabel);
  // Track open item globally across all groups using a composite key "groupIdx-itemIdx"
  const [openKey, setOpenKey] = useState<string | null>(null);

  function toggle(key: string) {
    setOpenKey(prev => (prev === key ? null : key));
  }

  return (
    <div className="px-4 py-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Frequently Asked Questions</h2>
        <p className="mt-1 text-sm text-zinc-500">Common questions about your {caseLabel} application.</p>
      </div>

      {groups.map((group, gi) => (
        <div key={gi} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          {groups.length > 1 && (
            <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{group.title}</p>
            </div>
          )}
          {group.items.map((item, ii) => {
            const key = `${gi}-${ii}`;
            return (
              <FaqAccordionItem
                key={key}
                item={item}
                index={ii}
                openIndex={openKey === key ? ii : null}
                onToggle={() => toggle(key)}
              />
            );
          })}
        </div>
      ))}

      <p className="text-xs text-zinc-400 text-center">
        Have a question not listed here? Send a message to your consultant through the Messages tab.
      </p>
    </div>
  );
}
