// ============================================================================
// Seed IMM Form Templates into Supabase
// ============================================================================
// Usage: npx tsx scripts/seed-forms.ts
// This seeds IRCC IMM form templates with their field schemas.
// Templates are upserted by formCode so it's safe to re-run.
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@supabase/supabase-js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeCrypto = require("crypto");

const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface FormField {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "boolean";
  options?: string[];
  required: boolean;
  description?: string;
}

interface FormTemplateSeed {
  formCode: string;
  formName: string;
  version: string;
  irccLastUpdated: string;
  fields: FormField[];
}

const templates: FormTemplateSeed[] = [
  {
    formCode: "IMM_5669",
    formName: "Schedule A – Background/Declaration",
    version: "10-2024",
    irccLastUpdated: "2024-10-01",
    fields: [
      { key: "givenName", label: "Given Name(s)", type: "text", required: true },
      { key: "lastName", label: "Last Name (Family Name)", type: "text", required: true },
      { key: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
      { key: "placeOfBirth", label: "Place of Birth", type: "text", required: true },
      { key: "citizenship", label: "Citizenship", type: "select", required: true, options: ["Canada", "USA", "India", "China", "Philippines", "UK", "Australia", "Pakistan", "Nigeria", "Brazil", "Other"] },
      { key: "maritalStatus", label: "Marital Status", type: "select", required: true, options: ["Married", "Common-Law", "Single", "Separated", "Divorced", "Widowed"] },
      { key: "passportNumber", label: "Passport Number", type: "text", required: true },
      { key: "currentAddress", label: "Current Address", type: "text", required: true },
      { key: "previousAddresses", label: "Previous Addresses (last 10 years)", type: "text", required: false, description: "List all addresses where you lived for 6+ months" },
      { key: "educationHistory", label: "Education History", type: "text", required: false, description: "Post-secondary education details" },
      { key: "employmentHistory", label: "Personal History (last 10 years)", type: "text", required: false, description: "Activities and employment since age 18" },
      { key: "memberships", label: "Memberships in Organizations", type: "text", required: false },
      { key: "governmentPositions", label: "Government Positions Held", type: "text", required: false },
      { key: "militaryService", label: "Military Service", type: "boolean", required: false },
      { key: "criminalCharges", label: "Criminal Charges or Convictions", type: "boolean", required: true },
      { key: "refugeeClaims", label: "Previous Refugee Claims", type: "boolean", required: true },
      { key: "immigrationViolations", label: "Immigration Violations", type: "boolean", required: true },
      { key: "deportationOrder", label: "Deportation or Removal Order", type: "boolean", required: true },
      { key: "signature", label: "Applicant Signature", type: "text", required: true },
      { key: "dateSigned", label: "Date Signed", type: "date", required: true },
    ],
  },
  {
    formCode: "IMM_5257",
    formName: "Application for Temporary Resident Visa (TRV)",
    version: "09-2024",
    irccLastUpdated: "2024-09-15",
    fields: [
      { key: "givenName", label: "Given Name(s)", type: "text", required: true },
      { key: "lastName", label: "Last Name (Family Name)", type: "text", required: true },
      { key: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
      { key: "placeOfBirth", label: "Place of Birth", type: "text", required: true },
      { key: "citizenship", label: "Citizenship", type: "select", required: true, options: ["Canada", "USA", "India", "China", "Philippines", "UK", "Australia", "Pakistan", "Nigeria", "Brazil", "Other"] },
      { key: "countryOfResidence", label: "Current Country of Residence", type: "text", required: true },
      { key: "maritalStatus", label: "Marital Status", type: "select", required: true, options: ["Married", "Common-Law", "Single", "Separated", "Divorced", "Widowed"] },
      { key: "passportNumber", label: "Passport Number", type: "text", required: true },
      { key: "passportExpiry", label: "Passport Expiry Date", type: "date", required: true },
      { key: "purposeOfVisit", label: "Purpose of Visit", type: "text", required: true, description: "Briefly describe why you are visiting Canada" },
      { key: "lengthOfStay", label: "Length of Stay in Canada", type: "text", required: true },
      { key: "fundsAvailable", label: "Funds Available for Visit (CAD)", type: "text", required: true },
      { key: "employmentStatus", label: "Employment Status", type: "select", required: true, options: ["Employed", "Self-Employed", "Unemployed", "Student", "Retired"] },
      { key: "employerName", label: "Employer Name", type: "text", required: false },
      { key: "employerAddress", label: "Employer Address", type: "text", required: false },
      { key: "previousCanadaVisits", label: "Previous Visits to Canada", type: "boolean", required: false },
      { key: "familyInCanada", label: "Family Member in Canada", type: "boolean", required: false },
      { key: "spouseGivenName", label: "Spouse's Given Name", type: "text", required: false },
      { key: "spouseLastName", label: "Spouse's Last Name", type: "text", required: false },
      { key: "childrenIncluded", label: "Children Included in Application", type: "boolean", required: false },
      { key: "immigrationStatus", label: "Previous Immigration Status", type: "text", required: false, description: "Have you ever been refused a visa or entry to Canada?" },
      { key: "signature", label: "Applicant Signature", type: "text", required: true },
      { key: "dateSigned", label: "Date Signed", type: "date", required: true },
    ],
  },
  {
    formCode: "IMM_0008",
    formName: "Generic Application Form for Canada (PR)",
    version: "10-2024",
    irccLastUpdated: "2024-10-01",
    fields: [
      { key: "givenName", label: "Given Name(s)", type: "text", required: true },
      { key: "lastName", label: "Last Name (Family Name)", type: "text", required: true },
      { key: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
      { key: "placeOfBirth", label: "Place of Birth", type: "text", required: true },
      { key: "citizenship", label: "Citizenship(s)", type: "text", required: true },
      { key: "maritalStatus", label: "Marital Status", type: "select", required: true, options: ["Married", "Common-Law", "Single", "Separated", "Divorced", "Widowed"] },
      { key: "uciNumber", label: "UCI Number (if previously applied)", type: "text", required: false },
      { key: "passportNumber", label: "Passport Number", type: "text", required: true },
      { key: "passportExpiry", label: "Passport Expiry Date", type: "date", required: true },
      { key: "passportIssueCountry", label: "Country of Issue", type: "text", required: true },
      { key: "countryOfResidence", label: "Current Country of Residence", type: "select", required: true, options: ["Canada", "USA", "India", "China", "Philippines", "UK", "Australia", "Pakistan", "Nigeria", "Brazil", "Other"] },
      { key: "previousCountryOfResidence", label: "Previous Country of Residence (if different)", type: "text", required: false },
      { key: "intendedOccupation", label: "Intended Occupation in Canada", type: "text", required: true },
      { key: "educationLevel", label: "Highest Level of Education", type: "select", required: true, options: ["None", "Secondary", "Bachelor's", "Master's", "PhD", "Trade/Apprenticeship", "Other"] },
      { key: "languageEnglish", label: "English Language Proficiency", type: "select", required: true, options: ["Native", "Fluent", "Intermediate", "Basic", "None"] },
      { key: "languageFrench", label: "French Language Proficiency", type: "select", required: true, options: ["Native", "Fluent", "Intermediate", "Basic", "None"] },
      { key: "spouseGivenName", label: "Spouse/Partner Given Name", type: "text", required: false },
      { key: "spouseLastName", label: "Spouse/Partner Last Name", type: "text", required: false },
      { key: "spouseDateOfBirth", label: "Spouse/Partner Date of Birth", type: "date", required: false },
      { key: "spouseCitizenship", label: "Spouse/Partner Citizenship", type: "text", required: false },
      { key: "dependentChildren", label: "Number of Dependent Children", type: "text", required: false },
      { key: "previousPrApplication", label: "Previous PR Application", type: "boolean", required: true },
      { key: "signature", label: "Applicant Signature", type: "text", required: true },
      { key: "dateSigned", label: "Date Signed", type: "date", required: true },
    ],
  },
  {
    formCode: "IMM_5406",
    formName: "Additional Family Information",
    version: "10-2024",
    irccLastUpdated: "2024-10-01",
    fields: [
      { key: "givenName", label: "Your Given Name(s)", type: "text", required: true },
      { key: "lastName", label: "Your Last Name", type: "text", required: true },
      { key: "dateOfBirth", label: "Your Date of Birth", type: "date", required: true },
      { key: "placeOfBirth", label: "Your Place of Birth", type: "text", required: true },
      { key: "fatherGivenName", label: "Father's Given Name", type: "text", required: true },
      { key: "fatherLastName", label: "Father's Last Name", type: "text", required: true },
      { key: "fatherDateOfBirth", label: "Father's Date of Birth", type: "date", required: false },
      { key: "fatherPlaceOfBirth", label: "Father's Place of Birth", type: "text", required: false },
      { key: "motherGivenName", label: "Mother's Given Name", type: "text", required: true },
      { key: "motherLastName", label: "Mother's Last Name", type: "text", required: true },
      { key: "motherDateOfBirth", label: "Mother's Date of Birth", type: "date", required: false },
      { key: "motherPlaceOfBirth", label: "Mother's Place of Birth", type: "text", required: false },
      { key: "spouseGivenName", label: "Spouse/Partner Given Name", type: "text", required: false },
      { key: "spouseLastName", label: "Spouse/Partner Last Name", type: "text", required: false },
      { key: "spouseDateOfBirth", label: "Spouse/Partner Date of Birth", type: "date", required: false },
      { key: "spousePlaceOfBirth", label: "Spouse/Partner Place of Birth", type: "text", required: false },
      { key: "childrenInfo", label: "Children (names, DOB, relationship)", type: "text", required: false, description: "List all children including adopted and step-children" },
      { key: "siblingsInfo", label: "Siblings (names, DOB, relationship)", type: "text", required: false, description: "List all brothers and sisters" },
      { key: "signature", label: "Applicant Signature", type: "text", required: true },
      { key: "dateSigned", label: "Date Signed", type: "date", required: true },
    ],
  },
  {
    formCode: "IMM_5476",
    formName: "Use of a Representative",
    version: "09-2024",
    irccLastUpdated: "2024-09-01",
    fields: [
      { key: "applicantGivenName", label: "Applicant Given Name(s)", type: "text", required: true },
      { key: "applicantLastName", label: "Applicant Last Name", type: "text", required: true },
      { key: "applicantDateOfBirth", label: "Applicant Date of Birth", type: "date", required: true },
      { key: "representativeGivenName", label: "Representative Given Name(s)", type: "text", required: true },
      { key: "representativeLastName", label: "Representative Last Name", type: "text", required: true },
      { key: "representativeCompany", label: "Representative Company Name", type: "text", required: true },
      { key: "representativeMembership", label: "Representative Membership/CICC Number", type: "text", required: true },
      { key: "representativePhone", label: "Representative Phone Number", type: "text", required: true },
      { key: "representativeEmail", label: "Representative Email", type: "text", required: true },
      { key: "representativeAddress", label: "Representative Address", type: "text", required: true },
      { key: "authorizationScope", label: "Scope of Authorization", type: "select", required: true, options: ["Full representation", "Only provide advice", "Only submit application"] },
      { key: "applicantSignature", label: "Applicant Signature", type: "text", required: true },
      { key: "applicantDateSigned", label: "Applicant Date Signed", type: "date", required: true },
      { key: "representativeSignature", label: "Representative Signature", type: "text", required: true },
      { key: "representativeDateSigned", label: "Representative Date Signed", type: "date", required: true },
    ],
  },
  {
    formCode: "IMM_5707",
    formName: "Family Information (SP/OWP)",
    version: "08-2024",
    irccLastUpdated: "2024-08-15",
    fields: [
      { key: "givenName", label: "Given Name(s)", type: "text", required: true },
      { key: "lastName", label: "Last Name", type: "text", required: true },
      { key: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
      { key: "placeOfBirth", label: "Place of Birth", type: "text", required: true },
      { key: "maritalStatus", label: "Marital Status", type: "select", required: true, options: ["Married", "Common-Law", "Single", "Separated", "Divorced", "Widowed"] },
      { key: "spouseGivenName", label: "Spouse Given Name(s)", type: "text", required: false },
      { key: "spouseLastName", label: "Spouse Last Name", type: "text", required: false },
      { key: "spouseDateOfBirth", label: "Spouse Date of Birth", type: "date", required: false },
      { key: "spouseCitizenship", label: "Spouse Citizenship", type: "text", required: false },
      { key: "childrenNames", label: "Children (names and DOB)", type: "text", required: false },
      { key: "fatherGivenName", label: "Father's Given Name", type: "text", required: true },
      { key: "fatherLastName", label: "Father's Last Name", type: "text", required: true },
      { key: "motherGivenName", label: "Mother's Given Name", type: "text", required: true },
      { key: "motherLastName", label: "Mother's Last Name", type: "text", required: true },
      { key: "siblingsInfo", label: "Siblings (names, DOB, country)", type: "text", required: false },
      { key: "signature", label: "Applicant Signature", type: "text", required: true },
      { key: "dateSigned", label: "Date Signed", type: "date", required: true },
    ],
  },
  {
    formCode: "IMM_5645",
    formName: "Family Information (Visitor)",
    version: "08-2024",
    irccLastUpdated: "2024-08-15",
    fields: [
      { key: "givenName", label: "Given Name(s)", type: "text", required: true },
      { key: "lastName", label: "Last Name", type: "text", required: true },
      { key: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
      { key: "maritalStatus", label: "Marital Status", type: "select", required: true, options: ["Married", "Common-Law", "Single", "Separated", "Divorced", "Widowed"] },
      { key: "spouseGivenName", label: "Spouse Given Name(s)", type: "text", required: false },
      { key: "spouseLastName", label: "Spouse Last Name", type: "text", required: false },
      { key: "spouseDateOfBirth", label: "Spouse Date of Birth", type: "date", required: false },
      { key: "fatherGivenName", label: "Father's Given Name", type: "text", required: true },
      { key: "fatherLastName", label: "Father's Last Name", type: "text", required: true },
      { key: "motherGivenName", label: "Mother's Given Name", type: "text", required: true },
      { key: "motherLastName", label: "Mother's Last Name", type: "text", required: true },
      { key: "childrenInfo", label: "Children", type: "text", required: false, description: "Name, relationship, DOB, and country of residence" },
      { key: "signature", label: "Applicant Signature", type: "text", required: true },
      { key: "dateSigned", label: "Date Signed", type: "date", required: true },
    ],
  },
  {
    formCode: "IMM_5257_SCHEDULE1",
    formName: "Schedule 1 – TRV Past Activities",
    version: "09-2024",
    irccLastUpdated: "2024-09-15",
    fields: [
      { key: "givenName", label: "Given Name(s)", type: "text", required: true },
      { key: "lastName", label: "Last Name", type: "text", required: true },
      { key: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
      { key: "employmentHistory", label: "Employment History (last 10 years)", type: "text", required: false },
      { key: "travelHistory", label: "Travel History (last 5 years)", type: "text", required: false, description: "List all countries visited in the last 5 years" },
      { key: "previousRefusals", label: "Previous Visa/Entry Refusals", type: "boolean", required: true },
      { key: "previousDeportation", label: "Previous Deportation or Removal", type: "boolean", required: true },
      { key: "criminalRecord", label: "Criminal Record", type: "boolean", required: true },
      { key: "militaryService", label: "Military Service", type: "boolean", required: false },
      { key: "signature", label: "Applicant Signature", type: "text", required: true },
      { key: "dateSigned", label: "Date Signed", type: "date", required: true },
    ],
  },
];

async function seed() {
  console.log(`Seeding ${templates.length} form templates...`);

  for (const t of templates) {
    const id = nodeCrypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabase.from("IMMFormTemplate").upsert(
      {
        id,
        formCode: t.formCode,
        formName: t.formName,
        version: t.version,
        irccLastUpdated: t.irccLastUpdated,
        fieldSchema: { fields: t.fields },
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      { onConflict: "formCode" },
    );

    if (error) {
      console.error(`  ✗ ${t.formCode}: ${error.message}`);
    } else {
      console.log(`  ✓ ${t.formCode} — ${t.formName}`);
    }
  }

  console.log("\nDone!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
