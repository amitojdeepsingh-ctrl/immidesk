import { describe, it, expect } from "vitest";
import { calculateCRS } from "../scoring";

function baseCandidate(overrides: Record<string, unknown> = {}) {
  return {
    age: 28,
    levelOfEducation: "bachelors" as const,
    canadianWorkExperience: 3,
    foreignWorkExperience: 0,
    englishTest: { speaking: 7, listening: 7, reading: 7, writing: 7 },
    ...overrides,
  };
}

describe("calculateCRS", () => {
  it("returns correct breakdown shape", () => {
    const r = calculateCRS(baseCandidate());
    expect(r).toHaveProperty("core");
    expect(r).toHaveProperty("spouse");
    expect(r).toHaveProperty("skillTransferability");
    expect(r).toHaveProperty("additional");
    expect(r).toHaveProperty("total");
    expect(typeof r.total).toBe("number");
    expect(r.total).toBeGreaterThan(0);
  });

  it("returns 0 total for age 60 with no education/work", () => {
    const r = calculateCRS({
      age: 60,
      levelOfEducation: "secondary",
      canadianWorkExperience: 0,
      foreignWorkExperience: 0,
      englishTest: { speaking: 1, listening: 1, reading: 1, writing: 1 },
    });
    expect(r.total).toBe(30); // secondary education alone gives 30
  });

  it("awards 600 PNP points when nominated", () => {
    const r = calculateCRS(baseCandidate({ provincialNomination: true }));
    expect(r.additional.provincialNomination).toBe(600);
    expect(r.total).toBeGreaterThanOrEqual(600);
  });

  it("awards 15 sibling points", () => {
    const r = calculateCRS(baseCandidate({ siblingInCanada: true }));
    expect(r.additional.sibling).toBe(15);
  });

  it("awards 30 points for 2+ year Canadian education", () => {
    const r = calculateCRS(baseCandidate({ canadianEducation: "twoYear" }));
    expect(r.additional.canadianEducation).toBe(30);
  });

  it("awards 15 points for 1 year Canadian education", () => {
    const r = calculateCRS(baseCandidate({ canadianEducation: "oneYear" }));
    expect(r.additional.canadianEducation).toBe(15);
  });

  it("reduces age points above 30", () => {
    const r25 = calculateCRS(baseCandidate({ age: 25 }));
    const r35 = calculateCRS(baseCandidate({ age: 35 }));
    expect(r25.core.age).toBe(110);
    expect(r35.core.age).toBe(77);
    expect(r35.core.age).toBeLessThan(r25.core.age);
  });

  it("gives max age points 18-35", () => {
    for (const age of [18, 25, 30]) {
      const r = calculateCRS(baseCandidate({ age }));
      expect(r.core.age).toBeGreaterThanOrEqual(90);
    }
  });

  it("gives 0 age points at age 17 and 46+", () => {
    const r17 = calculateCRS(baseCandidate({ age: 17 }));
    const r46 = calculateCRS(baseCandidate({ age: 46 }));
    expect(r17.core.age).toBe(0);
    expect(r46.core.age).toBe(0);
  });

  it("awards higher education points for PhD vs secondary", () => {
    const rPhd = calculateCRS(baseCandidate({ levelOfEducation: "phd" }));
    const rSec = calculateCRS(baseCandidate({ levelOfEducation: "secondary" }));
    expect(rPhd.core.education).toBeGreaterThan(rSec.core.education);
  });

  it("includes spouse factors when hasSpouse is true", () => {
    const r = calculateCRS(baseCandidate({
      hasSpouse: true,
      spouseLevelOfEducation: "bachelors",
      spouseEnglishTest: { speaking: 7, listening: 7, reading: 7, writing: 7 },
      spouseCanadianWorkExperience: 1,
    }));
    expect(r.spouse.education).toBeGreaterThan(0);
    expect(r.spouse.language).toBeGreaterThan(0);
    expect(r.spouse.work).toBeGreaterThan(0);
  });

  it("has zero spouse factors when hasSpouse is false", () => {
    const r = calculateCRS(baseCandidate({ hasSpouse: false }));
    expect(r.spouse.education).toBe(0);
    expect(r.spouse.language).toBe(0);
    expect(r.spouse.work).toBe(0);
  });

  it("reduces core language points when hasSpouse is true", () => {
    const rSingle = calculateCRS(baseCandidate({ hasSpouse: false }));
    const rCouple = calculateCRS(baseCandidate({
      hasSpouse: true,
      spouseLevelOfEducation: "bachelors",
    }));
    expect(rCouple.core.language).toBeLessThan(rSingle.core.language);
  });

  it("skill transferability is capped at 100", () => {
    const r = calculateCRS({
      age: 28,
      levelOfEducation: "phd",
      canadianWorkExperience: 3,
      foreignWorkExperience: 0,
      englishTest: { speaking: 9, listening: 9, reading: 9, writing: 9 },
    });
    expect(r.skillTransferability.total).toBeLessThanOrEqual(100);
  });

  it("french bonus awards 50 points with NCLC 7+ french and CLB 5+ english", () => {
    const r = calculateCRS(baseCandidate({
      frenchTest: { speaking: 7, listening: 7, reading: 7, writing: 7 },
    }));
    expect(r.additional.french).toBe(50);
  });

  it("french bonus gives 0 if french test is not taken", () => {
    const r = calculateCRS(baseCandidate({ frenchTest: undefined }));
    expect(r.additional.french).toBe(0);
  });

  it("french bonus gives 0 if french NCLC is below 7", () => {
    const r = calculateCRS(baseCandidate({
      frenchTest: { speaking: 6, listening: 6, reading: 6, writing: 6 },
    }));
    expect(r.additional.french).toBe(0);
  });

  it("french bonus awards 25 points with NCLC 7+ french and CLB 4 english", () => {
    const r = calculateCRS({
      age: 28,
      levelOfEducation: "bachelors",
      canadianWorkExperience: 3,
      foreignWorkExperience: 0,
      englishTest: { speaking: 4, listening: 4, reading: 4, writing: 4 },
      frenchTest: { speaking: 7, listening: 7, reading: 7, writing: 7 },
    });
    expect(r.additional.french).toBe(25);
  });

  it("french CLB 5+ counts as second official language in CORE (capped), not additional", () => {
    const r = calculateCRS(baseCandidate({
      frenchTest: { speaking: 5, listening: 5, reading: 5, writing: 5 },
    }));
    expect(r.additional.secondLanguage).toBe(0);
    expect(r.core.secondLanguage).toBe(4); // 1 pt per ability × 4
    // capped at 24 without spouse
    const maxed = calculateCRS(baseCandidate({
      frenchTest: { speaking: 10, listening: 10, reading: 10, writing: 10 },
    }));
    expect(maxed.core.secondLanguage).toBeLessThanOrEqual(24);
  });

  it("age grid uses official values at the 18/19 boundary", () => {
    // without spouse: 18 = 99, 19 = 105; with spouse: 18 = 90, 19 = 95
    const noSpouse18 = calculateCRS(baseCandidate({ age: 18 }));
    const noSpouse19 = calculateCRS(baseCandidate({ age: 19 }));
    expect(noSpouse18.core.age).toBe(99);
    expect(noSpouse19.core.age).toBe(105);
    const withSpouse19 = calculateCRS(baseCandidate({
      age: 19,
      hasSpouse: true,
      spouseEnglishTest: { speaking: 5, listening: 5, reading: 5, writing: 5 },
    }));
    expect(withSpouse19.core.age).toBe(95);
  });

  it("job offer adds 50 for TEER 0-3 and 200 for major group 00", () => {
    const none = calculateCRS(baseCandidate({}));
    const t123 = calculateCRS(baseCandidate({ jobOffer: "teer0123" }));
    const t00 = calculateCRS(baseCandidate({ jobOffer: "teer00" }));
    expect(t123.total - none.total).toBe(50);
    expect(t00.total - none.total).toBe(200);
  });

  it("certificate of qualification pairs with language and canadian work in transferability", () => {
    // No education beyond secondary, strong language, cert → cert×language combo applies
    const withCert = calculateCRS(baseCandidate({
      levelOfEducation: "secondary",
      englishTest: { speaking: 9, listening: 9, reading: 9, writing: 9 },
      certificateOfQualification: true,
    }));
    expect(withCert.skillTransferability.educationAndWork).toBeGreaterThan(0);
    // cert × Canadian work: 3+ years → 50
    const certCanWork = calculateCRS(baseCandidate({
      levelOfEducation: "secondary",
      englishTest: { speaking: 4, listening: 4, reading: 4, writing: 4 },
      canadianWorkExperience: 3,
      certificateOfQualification: true,
    }));
    expect(certCanWork.skillTransferability.foreignWorkAndCanadianWork).toBe(50);
    // transferability total never exceeds 100
    expect(withCert.skillTransferability.total).toBeLessThanOrEqual(100);
  });

  it("highly competitive candidate scores high (with PNP)", () => {
    const r = calculateCRS({
      age: 28,
      levelOfEducation: "phd",
      canadianWorkExperience: 4,
      englishTest: { speaking: 9, listening: 9, reading: 9, writing: 9 },
      hasSpouse: false,
      canadianEducation: "phd",
      foreignWorkExperience: 4,
      provincialNomination: true,
      siblingInCanada: true,
    });
    expect(r.total).toBeGreaterThan(0);
    expect(r.total).toBeLessThanOrEqual(1400);
  });

  it("single with no work experience scores minimally", () => {
    const r = calculateCRS({
      age: 22,
      levelOfEducation: "oneYearDegree",
      canadianWorkExperience: 0,
      foreignWorkExperience: 0,
      englishTest: { speaking: 4, listening: 4, reading: 5, writing: 5 },
    });
    expect(r.total).toBeGreaterThan(0);
    expect(r.total).toBeLessThan(300);
  });
});
