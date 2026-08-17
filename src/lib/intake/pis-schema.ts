// ============================================================================
// PIS — Personal Information Sheet schema
// Mirrors the IRCC-style "Personal Information Sheet" used by the firm
// (source: Personal Information Sheet12.docx). Single source of truth for:
//   - the client-portal intake form (multi-applicant rebuild)
//   - optional seeding of an IMMFormTemplate(fieldSchema) later
// ============================================================================

export type PisFieldType = "text" | "select" | "date" | "boolean";

export interface PisField {
  key: string;
  label: string;
  type: PisFieldType;
  options?: string[];
  required?: boolean;
  helper?: string;
}

export interface PisSection {
  key: string;
  title: string;
  hint?: string;
  /** render as two-column grid when true (default single column) */
  wide?: boolean;
  fields: PisField[];
}

// --- Details of Application (program selection) -----------------------------

export const PIS_PROGRAMS: Array<{ value: string; label: string }> = [
  { value: "EXPRESS_ENTRY", label: "Express Entry" },
  { value: "PNP", label: "Provincial Nominee Program (PNP)" },
  { value: "STUDY_PERMIT", label: "Study Permit" },
  { value: "WORK_PERMIT", label: "Work Permit" },
  { value: "VISITOR_VISA", label: "Visitor Visa" },
  { value: "SUPER_VISA", label: "Super Visa" },
  { value: "HC", label: "Humanitarian & Compassionate (H&C)" },
  { value: "SPOUSAL_SPONSORSHIP", label: "Spousal Sponsorship" },
  { value: "FAMILY_SPONSORSHIP", label: "Parents / Grandparents Program" },
  { value: "OTHER", label: "Other" },
];

// --- Sections ---------------------------------------------------------------

export const PIS_SECTIONS: PisSection[] = [
  {
    key: "personal",
    title: "Personal Information",
    wide: true,
    fields: [
      { key: "givenNames", label: "First Name (Given Name)", type: "text", required: true },
      { key: "middleNames", label: "Middle Name(s)", type: "text" },
      { key: "surname", label: "Last Name (Surname)", type: "text", required: true },
      { key: "dateOfBirth", label: "Date of Birth (day/month/year)", type: "date", required: true },
      { key: "sex", label: "Sex", type: "select", options: ["Male", "Female"] },
      { key: "birthCity", label: "City of Birth", type: "text" },
      { key: "birthCountry", label: "Country of Birth", type: "text" },
      { key: "countryOfResidence", label: "Country of Residence (if different from country of birth)", type: "text" },
      { key: "passportNumber", label: "Passport Number", type: "text", required: true },
      { key: "passportCountryOfIssue", label: "Country of Issue", type: "text" },
      { key: "passportIssueDate", label: "Date of Issue", type: "date" },
      { key: "passportExpiryDate", label: "Date of Expiry", type: "date" },
      { key: "height", label: "Your Height", type: "text", helper: "e.g. 5ft 8in or 172cm" },
      { key: "eyeColour", label: "Eye Colour", type: "text" },
      { key: "fatherFamilyName", label: "Father's Family Name", type: "text" },
      { key: "fatherBirthCity", label: "Father's Town or City of Birth", type: "text" },
      { key: "motherMaidenName", label: "Mother's Family Name at Birth", type: "text" },
      { key: "motherBirthCity", label: "Mother's Town or City of Birth", type: "text" },
      { key: "motherDateOfBirth", label: "Date of Birth of Mother", type: "date" },
      { key: "fatherDateOfBirth", label: "Date of Birth of Father", type: "date" },
      { key: "fatherDateOfDeath", label: "Date of Death, if Father Deceased", type: "date" },
      { key: "motherDateOfDeath", label: "Date of Death, if Mother Deceased", type: "date" },
    ],
  },
  {
    key: "residency",
    title: "Canada Residency & Language",
    wide: true,
    fields: [
      { key: "canadaEntryDate", label: "Date of recent entry to Canada (if resident of Canada)", type: "date" },
      { key: "canadaEntryPlace", label: "Place of recent entry to Canada (if resident of Canada)", type: "text" },
      { key: "nativeLanguage", label: "What is your native language or mother tongue?", type: "text" },
      { key: "languageAbility", label: "Are you able to communicate in English or French? Or both?", type: "select", options: ["English", "French", "Both"] },
    ],
  },
  {
    key: "contact",
    title: "Address & Contact",
    wide: true,
    fields: [
      { key: "homeCountryAddress", label: "Address in Home Country (Street, City, Province, Postal Code, Country)", type: "text" },
      { key: "currentAddress", label: "Current Address (Street, City, Province, Postal Code, Country)", type: "text" },
      { key: "cellPhone", label: "Cell Phone (including area code)", type: "text" },
      { key: "homePhone", label: "Home Phone (including area code)", type: "text" },
      { key: "email", label: "Email Address", type: "text" },
    ],
  },
  {
    key: "family",
    title: "Spouse / Partner & Family Information",
    hint: "Tell us about your current spouse or common-law partner.",
    wide: true,
    fields: [
      { key: "maritalStatus", label: "Marital Status", type: "select", options: ["Single", "Married", "Common-law", "Divorced", "Widowed"], required: true },
      { key: "marriageDate", label: "If married, date you were married", type: "date" },
      { key: "commonLawDate", label: "If common-law, date you started living together", type: "date" },
      { key: "partnerApplying", label: "Is your partner immigrating to Canada with you?", type: "select", options: ["Yes", "No"] },
      { key: "spouseFirstName", label: "Spouse First Name (Given Name)", type: "text" },
      { key: "spouseLastName", label: "Spouse Last Name (Family Name)", type: "text" },
      { key: "spouseDOB", label: "Spouse Date of Birth", type: "date" },
      { key: "spouseBirthPlace", label: "Spouse Place of Birth", type: "text" },
      { key: "spouseOccupation", label: "Spouse Occupation", type: "text" },
      { key: "spouseCurrentAddress", label: "Spouse Current Address", type: "text" },
    ],
  },
  {
    key: "previousMarriage",
    title: "Previously Married",
    wide: true,
    fields: [
      { key: "prevMarriageDate", label: "Date of Marriage", type: "date" },
      { key: "prevMarriageEndDate", label: "End Date of Marriage", type: "date" },
      { key: "prevSpouseDOB", label: "Previous Spouse Date of Birth", type: "date" },
      { key: "prevSpouseFirstName", label: "Previous Spouse First Name", type: "text" },
      { key: "prevSpouseLastName", label: "Previous Spouse Last Name", type: "text" },
    ],
  },
  {
    key: "canadaHistory",
    title: "Canada History",
    wide: true,
    fields: [
      { key: "canadaExperience", label: "Indicate whether you have: worked in / studied in / visited / never been to Canada", type: "select", options: ["Worked in Canada", "Studied in Canada", "Visited Canada", "Never been to Canada"] },
      { key: "hadWorkStudyPermit", label: "Have you ever had a work or study permit to Canada?", type: "select", options: ["Yes", "No"] },
      { key: "canadaStayDates", label: "If you lived in Canada before, what were the dates?", type: "text" },
    ],
  },
  {
    key: "funds",
    title: "Settlement Funds & Family in Canada",
    hint: "Do NOT include equity in real estate.",
    wide: true,
    fields: [
      { key: "settlementFunds", label: "Total amount of funds you have that are legal and transferrable (CAD)", type: "text" },
      { key: "familyInCanada", label: "Do you or your partner have close family members who are permanent residents or citizens of Canada and live in Canada now?", type: "select", options: ["Yes", "No"] },
      { key: "familyInCanadaDetails", label: "If YES — relationship and city in Canada where they reside", type: "text" },
    ],
  },
  {
    key: "languageTest",
    title: "English Language Test",
    hint: "If you have taken an IELTS or CELPIP English language test, please complete the following.",
    wide: true,
    fields: [
      { key: "languageTestType", label: "IELTS or CELPIP?", type: "select", options: ["IELTS", "CELPIP"] },
      { key: "languageTestDate", label: "Date of Test", type: "date" },
      { key: "languageTestMode", label: "General or Academic?", type: "select", options: ["General", "Academic"] },
      { key: "languageReading", label: "Reading", type: "text" },
      { key: "languageWriting", label: "Writing", type: "text" },
      { key: "languageSpeaking", label: "Speaking", type: "text" },
      { key: "languageListening", label: "Listening", type: "text" },
    ],
  },
  {
    key: "additionalInfo",
    title: "Additional Information",
    fields: [
      { key: "additionalInfo", label: "Is there any other information that you feel is important to share as part of your preliminary assessment or application?", type: "text" },
      { key: "signedName", label: "Name (print your full name)", type: "text" },
      { key: "signedDate", label: "Date", type: "date" },
    ],
  },
];

// --- Statutory questions (1–18) --------------------------------------------

export interface StatutoryQuestion {
  number: number;
  text: string;
}

export const STATUTORY_QUESTIONS: StatutoryQuestion[] = [
  { number: 1, text: "Been convicted of, or currently subject to any criminal proceeding in any country?" },
  { number: 2, text: "Previously sought refugee status in Canada or applied for a Canadian immigrant or permanent resident visa OR any other type of visa (e.g., temporary resident or visitor)?" },
  { number: 3, text: "Been refused a Visa or permit, denied entry or ordered to leave Canada or any other country or territory?" },
  { number: 4, text: "Ever remained beyond the validity of your status?" },
  { number: 5, text: "Been involved in an act of genocide, a war crime, a crime against humanity, or the desecration of religious property?" },
  { number: 6, text: "Used, use or plan to use violence as an end to achieve political, social or religious objectives?" },
  { number: 7, text: "Been a member of a group that is or was involved with organized crime?" },
  { number: 8, text: "Had any serious diseases or physical or mental disorders?" },
  { number: 9, text: "Held any government positions such as civil servant, police officer, judge, mayor or member of parliament?" },
  { number: 10, text: "Had a medical exam performed by an IRCC authorized panel physician (doctor) within the last 12 months?" },
  { number: 11, text: "Have you given your biometrics (fingerprints with photo) within the past 10 years?" },
  { number: 12, text: "Are you a lawful permanent resident of the United States with a valid Green Card?" },
  { number: 13, text: "Do you have a Visitor Visa of US?" },
  { number: 14, text: "Have you ever applied or been refused for a US Visa/Permit?" },
  { number: 15, text: "Do you have a family member who is a Canadian Citizen or permanent resident?" },
  { number: 16, text: "Made previous claims for refugee protection in Canada or at a Canadian visa office abroad, in any other country(ies) or territory(ies), or with the United Nations High Commissioner for Refugees (UNHCR)?" },
  { number: 17, text: "Been detained, incarcerated or put in jail?" },
  { number: 18, text: "Been associated with a group that used, uses, or advocated or advocates the use of armed struggle or violence to reach political, religious or social objectives?" },
];

// --- Repeater row types ------------------------------------------------------

export interface PisRepeaterRow {
  id: string;
}

export interface EducationRow extends PisRepeaterRow {
  from?: string;
  to?: string;
  schoolName?: string;
  cityCountry?: string;
  certificate?: string;
  areaOfStudy?: string;
}

export interface EmploymentRow extends PisRepeaterRow {
  from?: string;
  to?: string;
  jobTitle?: string;
  cityCountry?: string;
  employer?: string;
  canadianEmployerAddress?: string;
}

export interface TravelRow extends PisRepeaterRow {
  cityCountry?: string;
  purpose?: string;
  from?: string;
  to?: string;
  visaIssued?: string;
}

export interface AddressHistoryRow extends PisRepeaterRow {
  from?: string;
  to?: string;
  street?: string;
  cityProvince?: string;
  postalCode?: string;
  country?: string;
}

export interface ChildDraft extends PisRepeaterRow {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  nationality?: string;
  /** Does this child intend to apply with you? */
  willApply: boolean;
}

// --- Applicants --------------------------------------------------------------

export type ApplicantRole = "PRIMARY" | "SPOUSE" | "CHILD";

export interface ApplicantDraft {
  role: ApplicantRole;
  /** e.g. "SPOUSE", "CHILD#1" — becomes IMMFormSubmission.applicantLabel */
  applicantLabel: string;
  firstName: string;
  lastName: string;
  willApply: boolean;
  /** dependantRelation: e.g. "Spouse", "Dependent child (under 19)" */
  relationLabel?: string;
  /** flattened PIS field values (keys from PIS_SECTIONS + statutory_*) */
  pis: Record<string, string>;
  education: EducationRow[];
  employment: EmploymentRow[];
  travel: TravelRow[];
  addressHistory: AddressHistoryRow[];
  statutory: Record<string, { answer?: "Yes" | "No"; explanation?: string }>;
}

// --- Form blueprint helpers ---------------------------------------------------

export const PIS_SECTION_BY_KEY = Object.fromEntries(PIS_SECTIONS.map((s) => [s.key, s]));

export const PIS_SCHOOL_LEVELS = [
  "Primary School",
  "Secondary School",
  "College",
  "University",
];

/** PIS sections rendered for a full applicant (statutory + repeaters excluded —
 *  those are rendered by dedicated blocks). */
export const PIS_APPLICANT_SECTIONS = PIS_SECTIONS.filter(
  (s) => !["languageTest", "additionalInfo", "canadaHistory", "funds"].includes(s.key),
);

/** Applicant-agnostic full-PIS section keys (used for the primary applicant). */
export const PIS_PRIMARY_EXTRA_SECTIONS = PIS_SECTIONS.filter((s) =>
  ["languageTest", "canadaHistory", "funds", "additionalInfo"].includes(s.key),
);