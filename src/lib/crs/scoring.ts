export type EducationLevel = "secondary" | "oneYearDegree" | "twoYearDegree" | "bachelors" | "twoOrMorePrograms" | "masters" | "phd";

export type CRSInput = {
  age: number;
  levelOfEducation: EducationLevel;
  canadianWorkExperience: number;
  foreignWorkExperience: number;
  firstLanguage: { speaking: number; listening: number; reading: number; writing: number };
  secondLanguage?: { speaking: number; listening: number; reading: number; writing: number };
  hasSpouse?: boolean;
  spouseLevelOfEducation?: EducationLevel;
  spouseFirstLanguage?: { speaking: number; listening: number; reading: number; writing: number };
  spouseCanadianWorkExperience?: number;
  canadianEducation?: "none" | "oneYear" | "twoYear" | "phd";
  provincialNomination?: boolean;
  frenchProficiency?: boolean;
  siblingInCanada?: boolean;
};

export type CRSBreakdown = {
  core: { age: number; education: number; language: number; canadianWork: number; total: number };
  spouse: { education: number; language: number; work: number };
  skillTransferability: { educationAndWork: number; languageAndEducation: number; foreignWorkAndLanguage: number; foreignWorkAndCanadianWork: number; total: number };
  additional: { canadianEducation: number; provincialNomination: number; french: number; secondLanguage: number; sibling: number; total: number };
  total: number;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const EDU_ORDER: EducationLevel[] = ["secondary", "oneYearDegree", "twoYearDegree", "bachelors", "twoOrMorePrograms", "masters", "phd"];
function eduIndex(level: string): number {
  const i = EDU_ORDER.indexOf(level as EducationLevel);
  return i < 0 ? 0 : i;
}

// ─── Core / Human Capital ──────────────────────────────────────────────────

function agePoints(age: number, hasSpouse: boolean): number {
  const pts: Record<string, [number, number]> = {
    "17": [0,0], "18": [90,90], "19": [105,105],
    "20": [100,110], "21": [100,110], "22": [100,110], "23": [100,110],
    "24": [100,110], "25": [100,110], "26": [100,110], "27": [100,110],
    "28": [100,110], "29": [100,110],
    "30": [95,105], "31": [90,99], "32": [85,94], "33": [80,88],
    "34": [75,83], "35": [70,77], "36": [65,72], "37": [60,66],
    "38": [55,61], "39": [50,55], "40": [45,50], "41": [35,39],
    "42": [25,28], "43": [15,17], "44": [5,6], "45": [0,0],
  };
  return (pts[String(age)] ?? [0, 0])[hasSpouse ? 0 : 1];
}

function educationPoints(level: string, hasSpouse: boolean): number {
  const pts: Record<string, [number, number]> = {
    secondary: [28, 30],
    oneYearDegree: [84, 90],
    twoYearDegree: [91, 98],
    bachelors: [112, 120],
    twoOrMorePrograms: [119, 128],
    masters: [126, 135],
    phd: [140, 150],
  };
  return (pts[level] ?? [0, 0])[hasSpouse ? 0 : 1];
}

function languagePoints(lang: { speaking: number; listening: number; reading: number; writing: number }, hasSpouse: boolean): number {
  const perBand = [lang.speaking, lang.listening, lang.reading, lang.writing];
  // Per-ability points table: CLB 4/5→6, 6→8/9, 7→16/17, 8→22/23, 9→29/31, 10+→32/34
  const p = (clb: number, spouse: boolean): number => {
    if (clb >= 10) return spouse ? 32 : 34;
    if (clb === 9) return spouse ? 29 : 31;
    if (clb === 8) return spouse ? 22 : 23;
    if (clb === 7) return spouse ? 16 : 17;
    if (clb === 6) return spouse ? 8 : 9;
    if (clb >= 4) return spouse ? 6 : 6;
    return 0;
  };
  return perBand.reduce((s, c) => s + p(c, hasSpouse), 0);
}

function canadianWorkPoints(years: number, hasSpouse: boolean): number {
  const pts: Record<number, [number, number]> = {
    0: [0,0], 1: [35,40], 2: [46,53], 3: [56,64], 4: [63,72],
  };
  const y = Math.min(Math.max(0, Math.floor(years)), 5);
  const p = pts[y];
  if (p) return p[hasSpouse ? 0 : 1];
  return hasSpouse ? 70 : 80; // 5+ years
}

// ─── Spouse Factors ────────────────────────────────────────────────────────

function spouseEducationPoints(level: string | undefined): number {
  if (!level) return 0;
  const pts: Record<string, number> = {
    secondary: 2, oneYearDegree: 6, twoYearDegree: 7, bachelors: 8,
    twoOrMorePrograms: 9, masters: 9, phd: 10,
  };
  return pts[level] ?? 0;
}

function spouseLanguagePoints(lang: { speaking: number; listening: number; reading: number; writing: number } | undefined): number {
  if (!lang) return 0;
  const perBand = [lang.speaking, lang.listening, lang.reading, lang.writing];
  const p = (clb: number): number => {
    if (clb >= 9) return 5;
    if (clb >= 7) return 3;
    if (clb >= 5) return 1;
    return 0;
  };
  return perBand.reduce((s, c) => s + p(c), 0);
}

function spouseCanadianWorkPoints(years: number | undefined): number {
  if (!years || years < 1) return 0;
  const y = Math.min(Math.floor(years), 5);
  return [0, 5, 7, 8, 9, 10][y] ?? 0;
}

// ─── Skill Transferability ─────────────────────────────────────────────────

function tEduCanWork(eduIndex: number, canYears: number): number {
  if (eduIndex < 2) return 0; // secondary or one-year: 0
  if (eduIndex === 2) { // two-year
    if (canYears >= 3) return 25;
    if (canYears >= 2) return 13;
    if (canYears >= 1) return 13;
    return 0;
  }
  // bachelors, twoOrMore, masters, phd
  if (canYears >= 3) return 50;
  if (canYears >= 2) return 25;
  if (canYears >= 1) return 13;
  return 0;
}

function tEduLang(eduIndex: number, lang: { speaking: number; listening: number; reading: number; writing: number }): number {
  const avg = (lang.speaking + lang.listening + lang.reading + lang.writing) / 4;
  if (avg < 7) return 0;
  const high = avg >= 9;
  if (eduIndex <= 1) return 0; // secondary or less
  if (eduIndex === 2) return high ? 25 : 13; // two-year
  return high ? 50 : 25; // bachelors+
}

function tForeignWorkLang(forYears: number, lang: { speaking: number; listening: number; reading: number; writing: number }): number {
  const avg = (lang.speaking + lang.listening + lang.reading + lang.writing) / 4;
  if (avg < 7 || forYears < 1) return 0;
  const high = avg >= 9;
  if (forYears >= 3) return high ? 50 : 25;
  return high ? 25 : 13; // 1-2 years
}

function tForeignWorkCanWork(forYears: number, canYears: number): number {
  if (forYears < 1 || canYears < 1) return 0;
  if (forYears >= 3) return canYears >= 2 ? 50 : 25;
  return canYears >= 2 ? 25 : 13; // 1-2 years foreign
}

// ─── Additional Points ─────────────────────────────────────────────────────

function canadianEducationPoints(edu: string): number {
  return { none: 0, oneYear: 15, twoYear: 30, phd: 30 }[edu] ?? 0;
}

function provincialNominationPoints(nominated: boolean): number {
  return nominated ? 600 : 0;
}

function frenchBonus(french: boolean, firstLang: { speaking: number; listening: number; reading: number; writing: number }): number {
  if (!french) return 0;
  const avgFrench = (firstLang.speaking + firstLang.listening + firstLang.reading + firstLang.writing) / 4;
  if (avgFrench < 7) return 0;
  const englishClb = firstLang.reading;
  if (englishClb >= 5) return 50;
  if (englishClb >= 4) return 25;
  return 0;
}

function secondLanguagePoints(lang: { speaking: number; listening: number; reading: number; writing: number } | undefined): number {
  if (!lang) return 0;
  return [lang.speaking, lang.listening, lang.reading, lang.writing]
    .filter(c => c >= 5)
    .reduce((s, c) => s + (c >= 9 ? 6 : c >= 7 ? 3 : 1), 0);
}

function siblingPoints(sibling: boolean): number {
  return sibling ? 15 : 0;
}

// ─── Main Calculator ───────────────────────────────────────────────────────

export function calculateCRS(input: CRSInput): CRSBreakdown {
  const hasSpouse = input.hasSpouse ?? false;
  const lang1 = input.firstLanguage;
  const lang2 = input.secondLanguage;

  const coreAge = agePoints(input.age, hasSpouse);
  const coreEducation = educationPoints(input.levelOfEducation, hasSpouse);
  const coreLanguage = languagePoints(lang1, hasSpouse);
  const coreCanadianWork = canadianWorkPoints(input.canadianWorkExperience, hasSpouse);

  const spouseEdu = spouseEducationPoints(hasSpouse ? input.spouseLevelOfEducation : undefined);
  const spouseLang = spouseLanguagePoints(hasSpouse ? input.spouseFirstLanguage : undefined);
  const spouseWork = spouseCanadianWorkPoints(hasSpouse ? input.spouseCanadianWorkExperience : undefined);

  const coreTotal = coreAge + coreEducation + coreLanguage + coreCanadianWork;

  // Skill transferability — two groups, each max 50, added together
  const ei = eduIndex(input.levelOfEducation);
  const group1 = Math.max(tEduCanWork(ei, input.canadianWorkExperience), tEduLang(ei, lang1));
  const group2 = Math.max(tForeignWorkLang(input.foreignWorkExperience, lang1), tForeignWorkCanWork(input.foreignWorkExperience, input.canadianWorkExperience));
  const transferTotal = Math.min(100, group1 + group2);

  const additionalCanadianEdu = canadianEducationPoints(input.canadianEducation ?? "none");
  const additionalPNP = provincialNominationPoints(input.provincialNomination ?? false);
  const additionalFrench = frenchBonus(input.frenchProficiency ?? false, lang1);
  const additionalSecondLang = secondLanguagePoints(lang2);
  const additionalSibling = siblingPoints(input.siblingInCanada ?? false);
  const additionalTotal = additionalPNP + additionalCanadianEdu + additionalSecondLang + additionalFrench + additionalSibling;

  const total = coreTotal + spouseEdu + spouseLang + spouseWork + transferTotal + additionalTotal;

  return {
    core: { age: coreAge, education: coreEducation, language: coreLanguage, canadianWork: coreCanadianWork, total: coreTotal },
    spouse: { education: spouseEdu, language: spouseLang, work: spouseWork },
    skillTransferability: {
      educationAndWork: group1,
      languageAndEducation: tEduLang(ei, lang1),
      foreignWorkAndLanguage: group2,
      foreignWorkAndCanadianWork: tForeignWorkCanWork(input.foreignWorkExperience, input.canadianWorkExperience),
      total: transferTotal,
    },
    additional: {
      canadianEducation: additionalCanadianEdu,
      provincialNomination: additionalPNP,
      french: additionalFrench,
      secondLanguage: additionalSecondLang,
      sibling: additionalSibling,
      total: additionalTotal,
    },
    total,
  };
}
