export type CRSInput = {
  age: number;
  levelOfEducation: "secondary" | "oneYearDegree" | "twoYearDegree" | "bachelors" | "masters" | "phd";
  canadianWorkExperience: number;
  firstLanguage: { speaking: number; listening: number; reading: number; writing: number };
  secondLanguage?: { speaking: number; listening: number; reading: number; writing: number };
  hasSpouse?: boolean;
  spouseLevelOfEducation?: "secondary" | "oneYearDegree" | "twoYearDegree" | "bachelors" | "masters" | "phd";
  spouseFirstLanguage?: { speaking: number; listening: number; reading: number; writing: number };
  spouseCanadianWorkExperience?: number;
  canadianEducation?: "none" | "oneYear" | "twoYear" | "phd";
  canadianJobOffer?: "none" | "noc00" | "other";
  provincialNomination?: boolean;
  frenchProficiency?: boolean;
  siblingInCanada?: boolean;
};

export type CRSBreakdown = {
  core: { age: number; education: number; language: number; canadianWork: number; total: number };
  spouse: { education: number; language: number; work: number };
  skillTransferability: { educationAndWork: number; foreignEducation: number; languageAndEducation: number; total: number };
  additional: { canadianEducation: number; jobOffer: number; provincialNomination: number; french: number; secondLanguage: number; sibling: number; total: number };
  total: number;
};

function clbToPoints(clb: number): number {
  if (clb >= 10) return 32;
  if (clb === 9) return 31;
  if (clb === 8) return 29;
  if (clb === 7) return 25;
  if (clb === 6) return 21;
  if (clb === 5) return 17;
  if (clb === 4) return 12;
  return 0;
}

function agePoints(age: number, hasSpouse: boolean): number {
  const points: Record<string, [number, number]> = {
    "17": [0,0],"18": [90,90],"19": [105,105],"20": [110,110],"21": [110,110],
    "22": [110,110],"23": [110,110],"24": [110,110],"25": [110,110],
    "26": [110,110],"27": [110,110],"28": [110,110],"29": [110,110],"30": [110,110],
    "31": [105,105],"32": [100,100],"33": [95,95],"34": [90,90],"35": [85,85],
    "36": [80,80],"37": [75,75],"38": [70,70],"39": [65,65],"40": [60,60],
    "41": [50,50],"42": [40,40],"43": [30,30],"44": [20,20],"45": [10,10],
  };
  return (points[String(age)] ?? [0, 0])[hasSpouse ? 0 : 1];
}

function educationPoints(level: string, hasSpouse: boolean): number {
  const pts: Record<string, [number, number]> = {
    secondary: [28, 30],
    oneYearDegree: [84, 90],
    twoYearDegree: [91, 98],
    bachelors: [112, 120],
    masters: [126, 135],
    phd: [140, 150],
  };
  return (pts[level] ?? [0, 0])[hasSpouse ? 0 : 1];
}

function spouseEducationPoints(level: string | undefined): number {
  if (!level) return 0;
  const pts: Record<string, number> = {
    secondary: 2, oneYearDegree: 6, twoYearDegree: 7, bachelors: 8, masters: 9, phd: 10,
  };
  return pts[level] ?? 0;
}

function canadianWorkPoints(years: number, hasSpouse: boolean): number {
  const pts: Record<string, [number, number]> = {
    "0": [0,0],"1": [35,40],"2": [46,53],"3": [56,64],"4": [56,64],"5": [56,64],
  };
  const key = String(Math.min(Math.max(0, Math.floor(years)), 5));
  return (pts[key] ?? [0,0])[hasSpouse ? 0 : 1];
}

function spouseLanguagePoints(lang: { speaking: number; listening: number; reading: number; writing: number } | undefined): number {
  if (!lang) return 0;
  const avg = (clbToPoints(lang.speaking) + clbToPoints(lang.listening) + clbToPoints(lang.reading) + clbToPoints(lang.writing)) / 4;
  if (avg >= 28) return 10;
  if (avg >= 24) return 8;
  if (avg >= 20) return 6;
  if (avg >= 16) return 4;
  return 0;
}

function spouseCanadianWorkPoints(years: number | undefined): number {
  if (!years || years < 1) return 0;
  return Math.min(Math.floor(years), 5) + 5;
}

function skillTransferabilityEducation(education: string, years: number): number {
  if (years < 1) return 0;
  if (years >= 3) {
    if (education === "phd") return 50;
    if (["masters","bachelors","twoYearDegree"].includes(education)) return 50;
    if (education === "oneYearDegree") return 25;
    return 13;
  }
  if (years >= 2) {
    if (["phd","masters","bachelors","twoYearDegree"].includes(education)) return 25;
    if (education === "oneYearDegree") return 13;
    return 0;
  }
  if (years >= 1) {
    if (["phd","masters","bachelors","twoYearDegree"].includes(education)) return 13;
    return 0;
  }
  return 0;
}

function skillTransferabilityForeignEducation(education: string): number {
  const pts: Record<string, number> = {
    "secondary": 0, "oneYearDegree": 0, "twoYearDegree": 0,
    "bachelors": 25, "masters": 25, "phd": 25,
  };
  return pts[education] ?? 0;
}

function skillTransferabilityLanguageWithEducation(education: string, lang: { speaking: number; listening: number; reading: number; writing: number }): number {
  const avgClb = (lang.speaking + lang.listening + lang.reading + lang.writing) / 4;
  if (avgClb < 7) return 0;
  if (avgClb >= 9) {
    if (["phd","masters","bachelors","twoYearDegree"].includes(education)) return 50;
    if (education === "oneYearDegree") return 25;
  }
  if (avgClb >= 7) {
    if (["phd","masters","bachelors","twoYearDegree"].includes(education)) return 25;
    if (education === "oneYearDegree") return 13;
  }
  return 0;
}

function canadianEducationPoints(edu: string): number {
  const pts: Record<string, number> = { none: 0, oneYear: 15, twoYear: 30, phd: 30 };
  return pts[edu] ?? 0;
}

function jobOfferPoints(offer: string): number {
  const pts: Record<string, number> = { none: 0, noc00: 200, other: 50 };
  return pts[offer] ?? 0;
}

function firstLanguagePoints(lang: { speaking: number; listening: number; reading: number; writing: number }, hasSpouse: boolean): number {
  const perBand = [lang.speaking, lang.listening, lang.reading, lang.writing];
  if (!hasSpouse) {
    const clb4_6 = perBand.filter(c => c >= 4 && c <= 6).length * 4;
    const clb7plus = perBand.filter(c => c >= 7).reduce((s, c) => s + (c >= 9 ? 6 : c >= 8 ? 5 : 4), 0);
    return clb4_6 + clb7plus;
  } else {
    const clb4_6 = perBand.filter(c => c >= 4 && c <= 6).length * 3;
    const clb7plus = perBand.filter(c => c >= 7).reduce((s, c) => s + (c >= 9 ? 5 : c >= 8 ? 4 : 3), 0);
    return clb4_6 + clb7plus;
  }
}

function secondLanguagePoints(lang: { speaking: number; listening: number; reading: number; writing: number } | undefined): number {
  if (!lang) return 0;
  return [lang.speaking, lang.listening, lang.reading, lang.writing]
    .filter(c => c >= 5)
    .reduce((s, c) => s + (c >= 7 ? 3 : 2), 0);
}

function provincialNominationPoints(nominated: boolean): number {
  return nominated ? 600 : 0;
}

function frenchBonus(french: boolean, firstLang: { speaking: number; listening: number; reading: number; writing: number }, secondLang?: { speaking: number; listening: number; reading: number; writing: number }): number {
  if (!french) return 0;
  const reference = secondLang ?? firstLang;
  const avgFrench = (reference.speaking + reference.listening + reference.reading + reference.writing) / 4;
  const englishClb = firstLang.reading;
  if (avgFrench >= 7 && englishClb >= 5) return 50;
  if (avgFrench >= 7 && englishClb >= 4) return 25;
  return 0;
}

function siblingPoints(sibling: boolean): number {
  return sibling ? 15 : 0;
}

export function calculateCRS(input: CRSInput): CRSBreakdown {
  const hasSpouse = input.hasSpouse ?? false;
  const lang1 = input.firstLanguage;
  const lang2 = input.secondLanguage;

  const coreAge = agePoints(input.age, hasSpouse);
  const coreEducation = educationPoints(input.levelOfEducation, hasSpouse);
  const coreLanguage = firstLanguagePoints(lang1, hasSpouse);
  const coreCanadianWork = canadianWorkPoints(input.canadianWorkExperience, hasSpouse);

  const spouseEducation = spouseEducationPoints(hasSpouse ? input.spouseLevelOfEducation : undefined);
  const spouseLanguage = spouseLanguagePoints(hasSpouse ? input.spouseFirstLanguage : undefined);
  const spouseWork = spouseCanadianWorkPoints(hasSpouse ? input.spouseCanadianWorkExperience : undefined);

  const coreTotal = coreAge + coreEducation + coreLanguage + coreCanadianWork + spouseEducation + spouseLanguage + spouseWork;

  const transferEducation = skillTransferabilityEducation(input.levelOfEducation, input.canadianWorkExperience);
  const transferForeign = skillTransferabilityForeignEducation(input.levelOfEducation);
  const transferLangEdu = skillTransferabilityLanguageWithEducation(input.levelOfEducation, lang1);
  const transferTotal = Math.min(100, Math.max(transferEducation, transferForeign, transferLangEdu));

  const additionalCanadianEdu = canadianEducationPoints(input.canadianEducation ?? "none");
  const additionalJobOffer = jobOfferPoints(input.canadianJobOffer ?? "none");
  const additionalPNP = provincialNominationPoints(input.provincialNomination ?? false);
  const additionalFrench = frenchBonus(input.frenchProficiency ?? false, lang1, lang2);
  const additionalSecondLang = secondLanguagePoints(lang2);
  const additionalSibling = siblingPoints(input.siblingInCanada ?? false);
  const additionalTotal = additionalPNP + additionalJobOffer + additionalCanadianEdu + additionalSecondLang + additionalFrench + additionalSibling;

  const total = coreTotal + transferTotal + additionalTotal;

  return {
    core: { age: coreAge, education: coreEducation, language: coreLanguage, canadianWork: coreCanadianWork, total: coreTotal },
    spouse: { education: spouseEducation, language: spouseLanguage, work: spouseWork },
    skillTransferability: { educationAndWork: transferEducation, foreignEducation: transferForeign, languageAndEducation: transferLangEdu, total: transferTotal },
    additional: { canadianEducation: additionalCanadianEdu, jobOffer: additionalJobOffer, provincialNomination: additionalPNP, french: additionalFrench, secondLanguage: additionalSecondLang, sibling: additionalSibling, total: additionalTotal },
    total,
  };
}
