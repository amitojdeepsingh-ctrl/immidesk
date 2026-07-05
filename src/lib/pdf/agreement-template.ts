// ---------------------------------------------------------------------------
// Agreement Template — ADS Immigration Services Retainer Agreement
// ---------------------------------------------------------------------------
// Mirrors the official retainer agreement used by ADS Immigration Services.
// Dynamic fields: client name/address, service type, fee, dates, signature.
// All standard clauses (RCIC responsibilities, termination, ICCRC, etc.)
// are fixed and match the official template.
// ---------------------------------------------------------------------------

import type { AgreementFormData } from "@/types";

// --- Types -----------------------------------------------------------------

export interface AgreementTemplateData {
  firm: {
    name: string;
    address?: string;
    ciccNumber?: string;
    phone?: string;
    email?: string;
    rcicName?: string;
  };
  client: {
    fullName: string;
    email: string;
    phone?: string;
    address?: string;
    nationality?: string;
  };
  agreement: AgreementFormData;
  signatureImage?: { dataUrl: string; width: number; height: number };
  meta: {
    agreementNumber: string;
    generatedAt: string;
    version: string;
  };
}

export interface AgreementSection {
  heading: string;
  body: string;
  image?: { dataUrl: string; width: number; height: number };
}

// --- Template Builder ------------------------------------------------------

export function buildAgreementSections(data: AgreementTemplateData): AgreementSection[] {
  const { firm, client, agreement, meta } = data;

  const signatureImage = data.signatureImage ??
    (agreement.signatureDataUrl ? { dataUrl: agreement.signatureDataUrl, width: 400, height: 100 } : undefined);

  const fmtFee = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: agreement.feeCurrency ?? "CAD",
  }).format(agreement.feeAmount);

  const serviceLabel = formatServiceType(agreement.serviceType);
  const rcicName = firm.rcicName ?? firm.name;
  const firmAddress = firm.address ?? "#66-10772 Guildford Drive, Surrey, BC, Canada, V3R1W6";
  const ciccNum = firm.ciccNumber ?? "";
  const signedDate = meta.generatedAt;

  return [
    // ── Cover ──────────────────────────────────────────────────────────────
    {
      heading: "RETAINER AGREEMENT",
      body: [
        ciccNum ? `RCIC Membership Number: ${ciccNum}` : "",
        "",
        `${client.fullName}${client.address ? ` of ${client.address}` : ""} (Hereafter "Applicant") and, ${rcicName} (Hereafter "Consultant"), a Regulated Canadian Immigration Consultant, Member of the Immigration Consultants of Canada Regulatory Council (ICCRC), Membership No ${ciccNum} carrying on the practice of Immigration Consulting at ${firm.name} at ${firmAddress}`,
      ].filter(Boolean).join("\n"),
    },

    // ── A. RCIC Responsibilities ────────────────────────────────────────────
    {
      heading: "A. RCIC RESPONSIBILITIES & COMMITMENT",
      body: `The Consultant (RCIC) agrees to act for the "Applicant" & provide services as listed below to the Applicant with respect to ${serviceLabel}.

1. To advise Applicant on the Canadian Immigration Act and Regulations and procedures relating to the application.
2. To conduct an assessment on the Applicant's background and qualifications.
3. To prepare and advise the Applicant in writing of options that offers the best chance of a successful application. The decision on how to proceed rests with the Applicant.
4. To provide the Applicant with the check list of information and documents required in support of the application.
5. To assist in the preparation of Applicant's application and gathering of relevant supporting documents as required.
6. To advise and to assist the submission of applications of accompanying family members to remit processing fees as required (see Section C, part 1).
7. To assist with the preparation, if required, for an interview with CIC or a Visa office in consideration of the application.
8. To represent Applicant and family members in respect of the above application before the Minister, Officer, or the Immigration and Refugee Board as necessary to follow up with the processing office to minimize delays and to comply with any additional documentation requests.
9. To keep Applicant informed by telephone, fax, email or other means of communication as agreed on the current status of the application.
10. To act with due diligence in the above application and to act within the bounds of Canadian Immigration laws and ICCRC's Rules of Conduct to obtain the best result possible for the Applicant.
11. This agreement is considered closed/RCIC's representation of the Applicant ceases at the time of the issuance of COPR and Immigrant Visa.

The Applicant acknowledges that the Consultant will not provide advice regarding the tax laws of any country, employment or business opportunities.`,
    },

    // ── B. Professional Fees ───────────────────────────────────────────────
    {
      heading: "B. PROFESSIONAL FEES",
      body: `1. All Fees are in Canadian Currency.
2. The applicant hereby agrees to pay the Consultant a fee of non-refundable ${fmtFee} for the ${serviceLabel}.

Applicant acknowledges that the above fees paid to the Consultant do not guarantee Applicant's admission to Canada under the category stated above, and that no representation has been made by consultant to the effect that success in the application is guaranteed.

The professional services fee is payable as agreed. Government fees are in Canadian Dollars. Disbursements such as courier fees, police clearance fees, IELTS, Credential Assessments, health insurance fees, and medical fees are to be paid by the client and are subject to change upon mutual agreement of both parties.

APART FROM ABOVE RCIC FEE & OTHER MISCELLANEOUS FEES MENTIONED ABOVE THERE ARE OTHER PAYMENTS THAT ARE TO BE BORNE BY APPLICANT:
Government Application Fee — as applicable.

RCIC FEES TO BE PAID at time of signing of this retainer. The above amount is to be paid by the client and is subject to change upon the mutual agreement of both parties.

**Fee Summary:**
  Service Type: ${serviceLabel}
  Fee Structure: ${formatFeeStructure(agreement.feeStructure)}
  Total Fee: ${fmtFee}
  Payment Schedule: ${formatPaymentSchedule(agreement.paymentSchedule)}

4. **Withdrawal of Representation:**
Should the Applicant wish to withdraw the above application, the Applicant must inform the Consultant in writing. Necessary procedures to withdraw the application will begin when the Consultant receives such notice. The Applicant acknowledges and agrees that there will be no refund of fees paid for services already rendered nor of funds dispersed, nor of processing or other fees paid to the Canadian government, other than those fees specifically acknowledged to be refundable by the Canadian government. If the applicant wishes to withdraw prior to the submission of the formal application, fees for services already rendered shall be charged at a rate of $100 per hour, plus applicable taxes, and subtracted from the initial retainer which will then be refunded to the Applicant.

5. **Refund Policy:**
The Client(s) acknowledge that the granting of a visa or status and the time required for processing this application is at the sole discretion of the government and not the RCIC. The Professional fees paid to us are non-refundable in the event of an application refusal. However, if the application is denied because of an error or omission on the part of the RCIC or professional staff, the RCIC will refund all professional fees collected. The Client(s) agree that the fees paid are for services indicated above, and any refund is strictly limited to the amount of fees paid.`,
    },

    // ── C. Other Fees ──────────────────────────────────────────────────────
    {
      heading: "C. OTHER FEES AND DISBURSEMENTS",
      body: `The Applicant acknowledges and agrees that:

1. The government of Canada (CIC) imposes non-refundable processing cost recovery fees for the application. The Applicant is responsible for paying all required processing fees e.g., Federal, Provincial, Department of Human Resources, or other government departments, incurred in order to process the application.
2. The Applicant will be responsible for all costs related to medical examinations, police certificates, language assessments and other required expenditures.
3. All aforementioned costs are in addition to the Consultant's fees, as stated in Section B.`,
    },

    // ── D. Applicant Responsibilities ──────────────────────────────────────
    {
      heading: "D. APPLICANT RESPONSIBILITIES",
      body: `1. Applicant hereby agrees to provide genuine, complete, truthful and accurate documents and information and to provide such information as promptly as possible.
2. Applicant also acknowledges that any inaccuracies or omissions and misrepresentation of information or documentation may seriously affect the application and may lead to possible prosecution by Immigration Canada.
3. The Applicant agrees to keep the Consultant informed in relation to any changes or updated information regarding residential address, contact number, employment status, marital status.
4. The applicant acknowledges that if the Applicant fails or neglects to contact the Consultant as requested, or ignores or fails to respond to requests for required information or documentation within 60 days, the Consultant may terminate this agreement and all fees paid will be forfeited.`,
    },

    // ── E. Interview ───────────────────────────────────────────────────────
    {
      heading: "E. INTERVIEW",
      body: `The Applicant acknowledges and agrees that:

1. An Officer may require an appearance at an interview.
2. Any travel expenses and other costs incurred relating to the interview will be the sole responsibility of the Applicant.`,
    },

    // ── F. Termination ─────────────────────────────────────────────────────
    {
      heading: "F. TERMINATION",
      body: `The Applicant acknowledges and agrees that:

1. This Agreement is considered terminated upon completion of tasks identified under section A (1-10) of this agreement.
2. This Agreement is considered terminated if material changes occur to the Client(s) application or eligibility, which make it impossible to proceed with services detailed in section A (1-10) of this Agreement.
3. **Obligatory withdrawal** — An Immigration Consultant shall sever the consultant-client relationship or withdraw as representative if:
   a. discharged by the Client;
   b. instructed by the Client to do something illegal or in contravention to any rules;
   c. the Immigration Consultant's continued involvement will place the Immigration Consultant in a conflict of interest; or
   d. the Immigration Consultant is not competent to handle the matter.
4. **Optional Withdrawal** — An Immigration Consultant may sever the consultant-client relationship if there has been a serious loss of confidence, such as where the Client has deceived the Consultant, refused to give adequate instructions, or refused to accept the Consultant's advice on a significant point.
5. **Withdrawal for Non-Payment of Fees** — After reasonable notice, if the Applicant fails to provide funds on account for disbursements or fees, the Consultant may withdraw unless serious prejudice to the Applicant would result.
6. Should the Applicant wish to withdraw the application, notice must be provided to the Consultant in writing, and all fees paid to the Consultant for services already rendered will be forfeited.`,
    },

    // ── G. Confidentiality ─────────────────────────────────────────────────
    {
      heading: "G. CONFIDENTIALITY",
      body: `All information and documentation reviewed by the RCIC, required by CIC and all other governing bodies, and used for the preparation of the application will not be divulged to any third party, other than agents and employees, without prior consent, except as demanded by law. The RCIC, and all agents and employees of the RCIC, are also bound by the confidentiality requirements of Article 8.1 and 8.5 of the Code of Professional Ethics.

The Client(s) agree to the use of electronic communication and storage of confidential information. The RCIC will use his/her best efforts to maintain a high degree of security for electronic communication and information storage.

The Applicant acknowledges and agrees that the Consultant may consult about the Applicant's case with other members of the Co-op, or other Immigration consultants or persons with specific expertise in immigration law or government affairs, in order to maximise the quality of advice available to the Applicant.`,
    },

    // ── H. Force Majeure ───────────────────────────────────────────────────
    {
      heading: "H. CIRCUMSTANCES BEYOND THE CONTROL OF THE CONSULTANT",
      body: `The Consultant will not be responsible for retroactive changes to any Immigration Act or Regulation, delays by authorities, closure of Visa offices / Consulates / High Commissions / Embassies, change of Federal or Provincial Immigration Regulations, Acts of God and any acts beyond the Consultant's control.`,
    },

    // ── I. Complaints ──────────────────────────────────────────────────────
    {
      heading: "I. COMPLAINTS/DISPUTES",
      body: `The RCIC is a member in good standing of the Immigration Consultants of Canada Regulatory Council (ICCRC), and as such, is bound by its By-laws, Code of Professional Ethics, and associated Regulations.

Any complaints the Applicant has with respect to services provided by the Consultant shall be addressed as follows:
1. The Applicant shall make a complaint in writing to the Consultant.
2. The Consultant shall respond to the substance of the complaint within 30 days.

ICCRC Contact Information:
Immigration Consultants of Canada Regulatory Council (ICCRC)
5500 North Service Rd., Suite 1002, Burlington, ON, L7L 6W6
Toll free: 1-877-836-7543
Website: http://www.iccrc-crcic.ca`,
    },

    // ── J. Force Majeure ───────────────────────────────────────────────────
    {
      heading: "J. FORCE MAJEURE",
      body: `The RCIC's failure to perform any term of this Retainer Agreement, as a result of conditions beyond his/her control such as, but not limited to, governmental restrictions or subsequent legislation, war, strikes, or acts of God, shall not be deemed a breach of this Agreement.`,
    },

    // ── K. Change Policy ───────────────────────────────────────────────────
    {
      heading: "K. CHANGE POLICY",
      body: `The Client(s) acknowledges that if the RCIC is asked to act on the Client(s) behalf on matters other than those outlined above in this Agreement, or because of a material change in the Client(s) circumstances, or because of material facts not disclosed at the outset of the application, or because of a change in government legislation regarding the processing of immigration-related applications, the Agreement can be modified accordingly upon mutual agreement.`,
    },

    // ── L. Other ───────────────────────────────────────────────────────────
    {
      heading: "L. OTHER",
      body: `12.1 In the event Citizenship and Immigration Canada (CIC) or Human Resources Skills and Development Canada (HRSDC) or PNP should contact the Client(s) directly, the Client(s) are instructed to notify the RCIC immediately.
12.2 The Client(s) are to immediately advise the RCIC of any change in the marital, family, or civil status or change of physical address or contact information for any person included in the application.
12.3 The Client(s) understand(s) that they must be accurate and honest in the information they provide and that any inaccuracies may void this Agreement, or seriously affect the outcome of the application or the retention of any status they may obtain.
12.4 In the event of a joint retainer agreement, the Client(s) understand that no information received in connection with the matter from one Client can be treated as confidential so far as any of the other Clients are concerned, and that if a conflict develops that cannot be resolved, the RCIC cannot continue to act for both or all of the Clients and may have to withdraw completely.`,
    },

    // ── M. Governing Law ───────────────────────────────────────────────────
    {
      heading: "M. GOVERNING LAW",
      body: `1. This agreement is governed by the law of British Columbia in relation to any necessary arbitration.
2. The interpretation of this agreement will be based on the language of English.`,
    },

    // ── Signatures ─────────────────────────────────────────────────────────
    {
      heading: "SIGNATURES",
      body: [
        "This agreement is agreed and signed:",
        "",
        "_________________________________",
        `${rcicName} (RCIC)`,
        `DATED: ${signedDate}`,
        "",
        "",
        signatureImage
          ? `${client.fullName} (CLIENT) — Signed Electronically`
          : "_________________________________",
        `${client.fullName} (CLIENT)`,
        signatureImage
          ? `DATED: ${signedDate}`
          : "DATED: ___________________________",
      ].join("\n"),
      image: signatureImage,
    },
  ];
}

// --- Formatting Helpers ----------------------------------------------------

function formatServiceType(type: string): string {
  const labels: Record<string, string> = {
    WORK_PERMIT: "Work Permit Application",
    STUDY_PERMIT: "Study Permit Application",
    VISITOR_VISA: "Visitor Visa Application",
    PERMANENT_RESIDENCE: "Permanent Residence Application",
    EXPRESS_ENTRY: "Express Entry Application",
    FAMILY_SPONSORSHIP: "Family Sponsorship Application",
    CITIZENSHIP: "Citizenship Application",
    RESTORATION_VISITOR: "Restoration of Status – Visitor Application",
    RESTORATION_WORKER: "Restoration of Status – Worker Application",
    RESTORATION_STUDENT: "Restoration of Status – Student Application",
    PRRA: "Pre-Removal Risk Assessment (PRRA)",
    REFUGEE: "Refugee Protection Application",
    HUMANITARIAN: "Humanitarian & Compassionate Application",
    OTHER: "Immigration Services",
    // Legacy
    consultation: "Consultation",
    representation: "Representation",
    document_review: "Document Review",
    form_filing: "Form Filing",
    full_service: "Full Service",
  };
  return labels[type] ?? type.replace(/_/g, " ");
}

function formatFeeStructure(structure: string): string {
  const labels: Record<string, string> = {
    flat: "Flat Fee",
    hourly: "Hourly Rate",
    milestone: "Milestone-Based",
    retainer: "Retainer",
  };
  return labels[structure] ?? structure;
}

function formatPaymentSchedule(schedule: string): string {
  const labels: Record<string, string> = {
    upfront: "Upfront (100%)",
    monthly: "Monthly",
    on_completion: "On Completion",
    milestone: "Per Milestone",
    split: "50/50 Split",
  };
  return labels[schedule] ?? schedule;
}
