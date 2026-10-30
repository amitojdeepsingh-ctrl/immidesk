import { describe, expect, it } from "vitest";
import { acknowledgementStatement } from "../document-acknowledgement";

describe("acknowledgement statement", () => {
  const [confirmation, review, authorization] = acknowledgementStatement("ADS Immigration");

  it("confirms the client provided the attached documents", () => {
    expect(confirmation).toBe(
      "I confirm that I provided the documents listed below and attached to this acknowledgment to ADS Immigration for use in preparing and submitting my visa application.",
    );
  });

  it("confirms the copies reflect what was supplied and requires disclosure", () => {
    expect(review).toContain("I have reviewed the attached copies");
    expect(review).toContain("disclosed any alterations, omissions, or information that requires correction or explanation");
  });

  it("authorizes submission to the immigration authorities", () => {
    expect(authorization).toBe(
      "I authorize ADS Immigration to submit these documents to the relevant immigration authorities in connection with my application.",
    );
  });

  it("names the firm the client is dealing with", () => {
    const other = acknowledgementStatement("Maple Legal");
    expect(other[0]).toContain("Maple Legal");
    expect(other[2]).toContain("Maple Legal");
  });
});
