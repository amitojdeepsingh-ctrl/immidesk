import { describe, expect, it } from "vitest";
import { buildAgreementSections, type AgreementTemplateData } from "../agreement-template";

function buildData(): AgreementTemplateData {
  return {
    firm: { name: "ADS Immigration Services", ciccNumber: "R706757", rcicName: "Amitojdeep Singh" },
    client: { fullName: "Test Client", email: "client@example.com" },
    agreement: {
      title: "Retainer",
      serviceType: "full_service",
      feeAmount: 5000,
      feeCurrency: "CAD",
      feeStructure: "flat",
      paymentSchedule: "upfront",
      terms: {
        scopeOfWork: "",
        feesAndPayment: "",
        clientResponsibilities: "",
        confidentiality: "",
        termination: "",
        governingLaw: "",
      },
    },
    meta: { agreementNumber: "SA-TEST", generatedAt: "2026-10-24T00:00:00.000Z", version: "2.0" },
  };
}

describe("retainer agreement template", () => {
  const sections = buildAgreementSections(buildData());
  const headings = sections.map((s) => s.heading);

  it("starts with the cover and ends with signatures", () => {
    expect(headings[0]).toBe("RETAINER AGREEMENT");
    expect(headings.at(-1)).toBe("SIGNATURES");
  });

  it("numbers every clause A through S in order", () => {
    const lettered = headings.filter((h) => /^[A-S]\. /.test(h));
    expect(lettered).toHaveLength(19);
    lettered.forEach((heading, i) => {
      expect(heading.startsWith(`${String.fromCharCode(65 + i)}. `)).toBe(true);
    });
  });

  it("includes the addendum clauses", () => {
    expect(headings).toContain("E. FINANCIAL DOCUMENTS AND CLIENT CONFIRMATION");
    expect(headings).toContain("F. CLIENT REVIEW BEFORE SUBMISSION");
    expect(headings).toContain("G. SCOPE OF DOCUMENT REVIEW");
    expect(headings).toContain("H. CONCERNS AND UNRESOLVED INCONSISTENCIES");
    expect(headings).toContain("I. NO GUARANTEE OF OUTCOME");
    expect(headings).toContain("J. PROFESSIONAL OBLIGATIONS PRESERVED");
  });

  it("names the current regulator and carries the version", () => {
    const text = sections.map((s) => s.body).join("\n");
    expect(text).toContain("College of Immigration and Citizenship Consultants");
    expect(text).not.toContain("ICCRC");
    expect(sections[0].body).toContain("Retainer version 2.0");
  });

  it("does not claim the review authenticates documents", () => {
    const scope = sections.find((s) => s.heading.startsWith("G."))!;
    expect(scope.body).toContain("not a bank confirmation, forensic examination, audit, valuation");
  });
});
