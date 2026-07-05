// ═══════════════════════════════════════════════════════════════════════════
// ImmigDesk — Shared Type System
// ═══════════════════════════════════════════════════════════════════════════
// Runtime-safe enum mirrors (usable in Client Components without Prisma),
// API contracts, form state types, navigation types, and utility generics.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Prisma Enum Mirrors (runtime-safe, client-compatible) ─────────────────

export const UserRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const CaseType = {
  EXPRESS_ENTRY: "EXPRESS_ENTRY",
  PNP: "PNP",
  STUDY_PERMIT: "STUDY_PERMIT",
  WORK_PERMIT: "WORK_PERMIT",
  VISITOR_VISA: "VISITOR_VISA",
  FAMILY_SPONSORSHIP: "FAMILY_SPONSORSHIP",
  SPOUSAL_SPONSORSHIP: "SPOUSAL_SPONSORSHIP",
  SPOUSAL_OWP: "SPOUSAL_OWP",
  SUPER_VISA: "SUPER_VISA",
  TRP: "TRP",
  REFUGEE: "REFUGEE",
  VULNERABLE_WORKER: "VULNERABLE_WORKER",
  CITIZENSHIP: "CITIZENSHIP",
  OTHER: "OTHER",
} as const;
export type CaseType = (typeof CaseType)[keyof typeof CaseType];

export const CaseStatus = {
  INTAKE: "INTAKE",
  DOCUMENT_COLLECTION: "DOCUMENT_COLLECTION",
  FORM_FILLING: "FORM_FILLING",
  READY_TO_SUBMIT: "READY_TO_SUBMIT",
  SUBMITTED: "SUBMITTED",
  AOR_RECEIVED: "AOR_RECEIVED",
  IN_PROCESS: "IN_PROCESS",
  ADDITIONAL_DOCS_REQUESTED: "ADDITIONAL_DOCS_REQUESTED",
  DECISION_MADE: "DECISION_MADE",
  APPROVED: "APPROVED",
  REFUSED: "REFUSED",
  CLOSED: "CLOSED",
} as const;
export type CaseStatus = (typeof CaseStatus)[keyof typeof CaseStatus];

export const CasePriority = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type CasePriority = (typeof CasePriority)[keyof typeof CasePriority];

export const PlanTier = {
  SOLO: "SOLO",
  TEAM: "TEAM",
  FIRM: "FIRM",
  ENTERPRISE: "ENTERPRISE",
} as const;
export type PlanTier = (typeof PlanTier)[keyof typeof PlanTier];

export const SubscriptionStatus = {
  TRIALING: "TRIALING",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  CANCELED: "CANCELED",
  UNPAID: "UNPAID",
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const IMMFormStatus = {
  DRAFT: "DRAFT",
  COMPLETE: "COMPLETE",
  SUBMITTED: "SUBMITTED",
} as const;
export type IMMFormStatus = (typeof IMMFormStatus)[keyof typeof IMMFormStatus];

export const DocumentCategory = {
  PASSPORT: "PASSPORT",
  EDUCATION: "EDUCATION",
  LANGUAGE_TEST: "LANGUAGE_TEST",
  WORK_EXPERIENCE: "WORK_EXPERIENCE",
  FINANCIAL: "FINANCIAL",
  MEDICAL: "MEDICAL",
  POLICE_CERTIFICATE: "POLICE_CERTIFICATE",
  PHOTO: "PHOTO",
  MARRIAGE_CERTIFICATE: "MARRIAGE_CERTIFICATE",
  BIRTH_CERTIFICATE: "BIRTH_CERTIFICATE",
  INSURANCE: "INSURANCE",
  INVITATION: "INVITATION",
  IDENTITY: "IDENTITY",
  WORK_PERMIT: "WORK_PERMIT",
  OTHER: "OTHER",
} as const;
export type DocumentCategory = (typeof DocumentCategory)[keyof typeof DocumentCategory];

export const ComplianceEventType = {
  CLIENT_INTAKE: "CLIENT_INTAKE",
  RETAINER_SIGNED: "RETAINER_SIGNED",
  FORM_SUBMITTED: "FORM_SUBMITTED",
  DEADLINE_MISSED: "DEADLINE_MISSED",
  CLIENT_COMMUNICATION: "CLIENT_COMMUNICATION",
  FILE_CLOSED: "FILE_CLOSED",
  DATA_RETENTION_REVIEW: "DATA_RETENTION_REVIEW",
} as const;
export type ComplianceEventType = (typeof ComplianceEventType)[keyof typeof ComplianceEventType];

// ─── Human-readable labels for enums ────────────────────────────────────────

export const CaseTypeLabel: Record<CaseType, string> = {
  EXPRESS_ENTRY: "Express Entry",
  PNP: "Provincial Nominee Program",
  STUDY_PERMIT: "Study Permit",
  WORK_PERMIT: "Work Permit",
  VISITOR_VISA: "Visitor Visa",
  FAMILY_SPONSORSHIP: "Family Sponsorship",
  CITIZENSHIP: "Citizenship",
  SPOUSAL_SPONSORSHIP: "Spousal Sponsorship",
  SPOUSAL_OWP: "Spousal OWP",
  SUPER_VISA: "Super Visa",
  TRP: "TRP",
  REFUGEE: "Refugee",
  VULNERABLE_WORKER: "Vulnerable Worker",
  OTHER: "Other",
};

export const CaseStatusLabel: Record<CaseStatus, string> = {
  INTAKE: "Intake",
  DOCUMENT_COLLECTION: "Document Collection",
  FORM_FILLING: "Form Filling",
  READY_TO_SUBMIT: "Ready to Submit",
  SUBMITTED: "Submitted",
  AOR_RECEIVED: "AOR Received",
  IN_PROCESS: "In Process",
  ADDITIONAL_DOCS_REQUESTED: "Additional Docs Requested",
  DECISION_MADE: "Decision Made",
  APPROVED: "Approved",
  REFUSED: "Refused",
  CLOSED: "Closed",
};

export const CasePriorityLabel: Record<CasePriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const DocumentCategoryLabel: Record<DocumentCategory, string> = {
  PASSPORT: "Passport",
  EDUCATION: "Education",
  LANGUAGE_TEST: "Language Test",
  WORK_EXPERIENCE: "Work Experience",
  FINANCIAL: "Financial",
  MEDICAL: "Medical",
  POLICE_CERTIFICATE: "Police Certificate",
  PHOTO: "Photo",
  MARRIAGE_CERTIFICATE: "Marriage Certificate",
  BIRTH_CERTIFICATE: "Birth Certificate",
  INSURANCE: "Insurance",
  INVITATION: "Invitation",
  IDENTITY: "Identity",
  WORK_PERMIT: "Work Permit",
  OTHER: "Other",
};

export const PlanTierLabel: Record<PlanTier, string> = {
  SOLO: "Solo",
  TEAM: "Team",
  FIRM: "Firm",
  ENTERPRISE: "Enterprise",
};

export const SubscriptionStatusLabel: Record<SubscriptionStatus, string> = {
  TRIALING: "Trialing",
  ACTIVE: "Active",
  PAST_DUE: "Past Due",
  CANCELED: "Canceled",
  UNPAID: "Unpaid",
};

// ─── Status transition map (which statuses can follow which) ────────────────

export const CaseStatusTransitions: Record<CaseStatus, CaseStatus[]> = {
  INTAKE: ["DOCUMENT_COLLECTION", "CLOSED"],
  DOCUMENT_COLLECTION: ["FORM_FILLING", "INTAKE", "CLOSED"],
  FORM_FILLING: ["READY_TO_SUBMIT", "DOCUMENT_COLLECTION", "CLOSED"],
  READY_TO_SUBMIT: ["SUBMITTED", "FORM_FILLING", "CLOSED"],
  SUBMITTED: ["AOR_RECEIVED", "ADDITIONAL_DOCS_REQUESTED", "CLOSED"],
  AOR_RECEIVED: ["IN_PROCESS", "ADDITIONAL_DOCS_REQUESTED", "CLOSED"],
  IN_PROCESS: ["ADDITIONAL_DOCS_REQUESTED", "DECISION_MADE", "CLOSED"],
  ADDITIONAL_DOCS_REQUESTED: ["IN_PROCESS", "DECISION_MADE", "CLOSED"],
  DECISION_MADE: ["APPROVED", "REFUSED", "CLOSED"],
  APPROVED: ["CLOSED"],
  REFUSED: ["CLOSED"],
  CLOSED: [],
};

// ─── API Response Types ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Form State Types ───────────────────────────────────────────────────────

export interface FormState {
  message?: string;
  errors?: Record<string, string[]>;
  success?: boolean;
}

export interface CaseFormData {
  clientId: string;
  caseType: CaseType;
  priority: CasePriority;
  title: string;
  description?: string;
  deadlineDate?: string;
  assignedToId?: string;
}

export interface ClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
  maritalStatus?: string;
  spouseName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  tags?: string[];
}

// ─── Navigation / Sidebar Types ─────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name
  roles?: UserRole[]; // restrict visibility by role
  children?: NavItem[];
}

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

// ─── Dashboard Types ────────────────────────────────────────────────────────

export interface DashboardStats {
  totalCases: number;
  activeCases: number;
  casesByStatus: Record<CaseStatus, number>;
  casesByType: Record<CaseType, number>;
  overdueDeadlines: number;
  upcomingDeadlines: number;
  recentActivity: ActivitySummary[];
}

export interface ActivitySummary {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userName: string;
  timestamp: string;
}

// ─── CRS Score Types ────────────────────────────────────────────────────────

export interface CRSScoreBreakdown {
  coreHumanCapital: number;
  spouseFactor: number;
  skillTransferability: number;
  additionalPoints: number;
  total: number;
}

// ─── IMM Form Types ─────────────────────────────────────────────────────────

export interface IMMFormField {
  key: string;
  label: string;
  type: "text" | "date" | "select" | "checkbox" | "radio" | "textarea";
  required: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    message?: string;
  };
}

export interface IMMFormSchema {
  formCode: string;
  formName: string;
  version: string;
  sections: {
    title: string;
    fields: IMMFormField[];
  }[];
}

// ─── Stripe / Billing Types ────────────────────────────────────────────────

export interface BillingInfo {
  planTier: PlanTier;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface PlanFeature {
  label: string;
  included: boolean;
  limit?: string;
}

// ─── Utility Types ──────────────────────────────────────────────────────────

/** Make all properties in T optional, deeply (recursive). */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/** Require exactly one property from a union of keys. */
export type RequireExactlyOne<
  T,
  Keys extends keyof T = keyof T,
> = Keys extends infer K
  ? K extends keyof T
    ? { [P in K]: Required<Pick<T, P>> } & { [P in Exclude<Keys, K>]?: never }
    : never
  : never;

/** Non-nullable version of a type (strip null | undefined). */
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

/** Extract the success variant from a discriminated union on "status". */
export type SuccessVariant<T extends { status: string }> = Extract<
  T,
  { status: "success" }
>;

// ─── Role-based Access Control ─────────────────────────────────────────────

export interface Permission {
  action: "create" | "read" | "update" | "delete";
  subject: string;
}

export const RolePermissions: Record<UserRole, Permission[]> = {
  OWNER: [
    { action: "create", subject: "all" },
    { action: "read", subject: "all" },
    { action: "update", subject: "all" },
    { action: "delete", subject: "all" },
  ],
  ADMIN: [
    { action: "create", subject: "all" },
    { action: "read", subject: "all" },
    { action: "update", subject: "all" },
    { action: "delete", subject: "case" },
    { action: "delete", subject: "client" },
    { action: "delete", subject: "document" },
  ],
  MEMBER: [
    { action: "create", subject: "case" },
    { action: "create", subject: "client" },
    { action: "create", subject: "document" },
    { action: "read", subject: "all" },
    { action: "update", subject: "case" },
    { action: "update", subject: "client" },
    { action: "update", subject: "document" },
  ],
};

// ─── Service Agreement Types ───────────────────────────────────────────────

export const AgreementStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  SIGNED: "SIGNED",
  EXPIRED: "EXPIRED",
  VOIDED: "VOIDED",
} as const;
export type AgreementStatus = (typeof AgreementStatus)[keyof typeof AgreementStatus];

export const AgreementStatusLabel: Record<AgreementStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  SIGNED: "Signed",
  EXPIRED: "Expired",
  VOIDED: "Voided",
};

export const FeeStructure = {
  FLAT: "flat",
  HOURLY: "hourly",
  MILESTONE: "milestone",
  RETAINER: "retainer",
} as const;
export type FeeStructure = (typeof FeeStructure)[keyof typeof FeeStructure];

export const FeeStructureLabel: Record<FeeStructure, string> = {
  flat: "Flat Fee",
  hourly: "Hourly Rate",
  milestone: "Milestone-Based",
  retainer: "Retainer",
};

export const PaymentSchedule = {
  UPFRONT: "upfront",
  MONTHLY: "monthly",
  ON_COMPLETION: "on_completion",
  MILESTONE: "milestone",
  SPLIT: "split",
} as const;
export type PaymentSchedule = (typeof PaymentSchedule)[keyof typeof PaymentSchedule];

export const PaymentScheduleLabel: Record<PaymentSchedule, string> = {
  upfront: "Upfront (100%)",
  monthly: "Monthly",
  on_completion: "On Completion",
  milestone: "Per Milestone",
  split: "50/50 Split",
};

export const ServiceType = {
  CONSULTATION: "consultation",
  REPRESENTATION: "representation",
  DOCUMENT_REVIEW: "document_review",
  FORM_FILING: "form_filing",
  FULL_SERVICE: "full_service",
  OTHER: "other",
} as const;
export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

export const ServiceTypeLabel: Record<ServiceType, string> = {
  consultation: "Consultation",
  representation: "Representation",
  document_review: "Document Review",
  form_filing: "Form Filing",
  full_service: "Full Service",
  other: "Other",
};

export interface AgreementFormData {
  title: string;
  description?: string;
  serviceType: ServiceType;
  feeAmount: number;
  feeCurrency: string;
  feeStructure: FeeStructure;
  paymentSchedule: PaymentSchedule;
  startDate?: string;
  endDate?: string;
  caseId?: string;
  signatureDataUrl?: string;
  terms: AgreementTerms;
}

export interface AgreementTerms {
  scopeOfWork: string;
  feesAndPayment: string;
  clientResponsibilities: string;
  confidentiality: string;
  termination: string;
  governingLaw: string;
  additionalClauses?: string[];
}

export interface AgreementSummary {
  id: string;
  title: string;
  status: AgreementStatus;
  serviceType: ServiceType;
  feeAmount: number;
  feeCurrency: string;
  clientName: string;
  createdAt: string;
  signedAt: string | null;
}

// ─── Payment Types ───────────────────────────────────────────────────────────

export const PaymentMethod = {
  BANK_TRANSFER: "BANK_TRANSFER",
  CREDIT_CARD: "CREDIT_CARD",
  DEBIT_CARD: "DEBIT_CARD",
  PAYPAL: "PAYPAL",
  WISE: "WISE",
  CASH: "CASH",
  CHEQUE: "CHEQUE",
  OTHER: "OTHER",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentMethodLabel: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CREDIT_CARD: "Credit Card",
  DEBIT_CARD: "Debit Card",
  PAYPAL: "PayPal",
  WISE: "Wise",
  CASH: "Cash",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export interface PaymentSummary {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  receiptNumber: string | null;
  notes: string | null;
  caseId: string | null;
  createdAt: string;
}