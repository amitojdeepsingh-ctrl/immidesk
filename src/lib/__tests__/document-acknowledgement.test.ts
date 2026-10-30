import { describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import { buildAcknowledgementClauses, buildAcknowledgementTitle } from "../document-acknowledgement";

describe("document acknowledgement statement", () => {
  const clauses = buildAcknowledgementClauses({
    clientName: "Krishan Sharma",
    applicationLabel: "BUSINESS_INVESTMENT",
  });
  const text = clauses.map((c) => c.text).join(" ");

  it("names the client and the application", () => {
    expect(text).toContain("I, Krishan Sharma, provided the documents listed below");
    expect(text).toContain("BUSINESS_INVESTMENT application");
  });

  it("covers source, accuracy, alteration, disclosure and review scope", () => {
    expect(text).toContain("or I received them from the person or organization identified in each document");
    expect(text).toContain("genuine, complete, accurate, and current");
    expect(text).toContain("I have not altered");
    expect(text).toContain("I have disclosed any missing page");
    expect(text).toContain("not a bank verification, audit, forensic examination, valuation, or independent authentication");
  });

  it("warns about consequences and refuses to guarantee an outcome", () => {
    expect(text).toContain("misrepresentation under the Immigration and Refugee Protection Act");
    expect(text).toContain("does not guarantee approval");
  });

  it("numbers the clauses consecutively from one", () => {
    expect(clauses.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("omits the application label when there is no case", () => {
    const bare = buildAcknowledgementClauses({ clientName: "Test Client", applicationLabel: null });
    expect(bare[0].text).toBe(
      "I, Test Client, provided the documents listed below to the firm, or I received them from the person or organization identified in each document.",
    );
  });

  it("titles the document by application when known", () => {
    expect(buildAcknowledgementTitle("STUDY_PERMIT")).toBe("Document Acknowledgement — STUDY_PERMIT");
    expect(buildAcknowledgementTitle(null)).toBe("Document Acknowledgement");
  });
});

describe("acknowledgement token", () => {
  const SECRET = "test-service-role-key";

  function sign(payload: object) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${encoded}.${createHmac("sha256", SECRET).update(encoded).digest("base64url")}`;
  }

  it("is tamper evident", () => {
    const token = sign({ acknowledgementId: "ack-1", clientId: "c-1", organizationId: "o-1", expiresAt: 9999999999 });
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ acknowledgementId: "ack-2", clientId: "c-1", organizationId: "o-1", expiresAt: 9999999999 })).toString("base64url");
    const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");
    expect(expected).toBe(sig);
    expect(expected).not.toBe(createHmac("sha256", SECRET).update(forged).digest("base64url"));
  });
});
