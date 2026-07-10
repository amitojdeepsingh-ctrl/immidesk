import { describe, it, expect } from "vitest";
import { calculateCRS } from "../scoring";

function baseCandidate(overrides: Record<string, unknown> = {}) {
  return {
    age: 28,
    levelOfEducation: "bachelors" as const,
    canadianWorkExperience: 3,
    firstLanguage: { speaking: 7, listening: 7, reading: 7, writing: 7 },
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
      firstLanguage: { speaking: 1, listening: 1, reading: 1, writing: 1 },
    });
    expect(r.total).toBe(0);
  });

  it("awards 600 PNP points when nominated", () => {
    const r = calculateCRS(baseCandidate({ provincialNomination: true }));
    expect(r.additional.provincialNomination).toBe(600);
    expect(r.total).toBeGreaterThanOrEqual(600);
  });

  it("awards 200 points for NOC 00 job offer", () => {
    const r = calculateCRS(baseCandidate({ canadianJobOffer: "noc00" }));
    expect(r.additional.jobOffer).toBe(200);
  });

  it("awards 50 points for other job offer", () => {
    const r = calculateCRS(baseCandidate({ canadianJobOffer: "other" }));
    expect(r.additional.jobOffer).toBe(50);
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
    expect(r35.core.age).toBe(85);
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
      spouseFirstLanguage: { speaking: 7, listening: 7, reading: 7, writing: 7 },
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
      firstLanguage: { speaking: 9, listening: 9, reading: 9, writing: 9 },
    });
    expect(r.skillTransferability.total).toBeLessThanOrEqual(100);
  });

  it("french bonus awards 50 points with CLB 7+ french and CLB 5+ english", () => {
    const r = calculateCRS(baseCandidate({
      frenchProficiency: true,
      secondLanguage: { speaking: 7, listening: 7, reading: 7, writing: 7 },
    }));
    expect(r.additional.french).toBe(50);
  });

  it("french bonus gives 0 if french is false", () => {
    const r = calculateCRS(baseCandidate({ frenchProficiency: false }));
    expect(r.additional.french).toBe(0);
  });

  it("Second language points for CLB 5+", () => {
    const r = calculateCRS(baseCandidate({
      secondLanguage: { speaking: 5, listening: 5, reading: 5, writing: 5 },
    }));
    expect(r.additional.secondLanguage).toBeGreaterThan(0);
  });

  it("highly competitive candidate scores 1200+ (with PNP + job offer)", () => {
    const r = calculateCRS({
      age: 28,
      levelOfEducation: "phd",
      canadianWorkExperience: 4,
      firstLanguage: { speaking: 9, listening: 9, reading: 9, writing: 9 },
      hasSpouse: false,
      canadianEducation: "phd",
      canadianJobOffer: "noc00",
      provincialNomination: true,
      siblingInCanada: true,
    });
    expect(r.total).toBeGreaterThanOrEqual(1200);
  });

  it("single with no work experience scores minimally", () => {
    const r = calculateCRS({
      age: 22,
      levelOfEducation: "oneYearDegree",
      canadianWorkExperience: 0,
      firstLanguage: { speaking: 4, listening: 4, reading: 5, writing: 5 },
    });
    expect(r.total).toBeGreaterThan(0);
    expect(r.total).toBeLessThan(300);
  });
});
