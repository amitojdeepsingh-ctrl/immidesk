export interface KbEntry {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
  citations: { section: string; url?: string }[];
}

const entries: KbEntry[] = [
  {
    id: "ee-overview",
    title: "Express Entry Overview",
    category: "express-entry",
    keywords: ["express entry", "ee", "pr", "permanent residence", "quick entry", "federal"],
    content: "Express Entry is Canada's flagship economic immigration system launched in 2015, managed under IRPA ss. 10.1-10.6 and IRPR ss. 75-116. It manages applications for three federal programs: the Federal Skilled Worker Program (FSW), the Canadian Experience Class (CEC), and the Federal Skilled Trades Program (FST). Candidates create an online profile and are ranked using the Comprehensive Ranking System (CRS). The highest-ranked candidates receive an Invitation to Apply (ITA) through periodic draws. Once invited, candidates have 60 days to submit a complete application. IRCC targets processing 80% of applications within 6 months.",
    citations: [
      { section: "IRPR ss. 75-116", url: "https://laws-lois.justice.gc.ca/eng/regulations/SOR-2002-227/" },
      { section: "IRPA ss. 10.1-10.6" },
    ],
  },
  {
    id: "ee-fsw",
    title: "Federal Skilled Worker Program (FSW)",
    category: "express-entry",
    keywords: ["fsw", "federal skilled worker", "skilled worker", "67 points", "six selection factors"],
    content: "The Federal Skilled Worker Program (FSW) is for skilled professionals with foreign work experience. Eligibility requires at least 67 points out of 100 on six selection factors: education (max 25), language ability (max 28), work experience (max 15), age (max 12), arranged employment (max 10), and adaptability (max 10). Applicants must have at least 1 year of continuous full-time skilled work experience (or equivalent part-time) in NOC TEER 0, 1, 2, or 3 within the last 10 years. Minimum CLB 7 in English or French is required. Proof of funds is required unless the applicant has a valid job offer or is already working in Canada.",
    citations: [
      { section: "IRPR ss. 75-83" },
      { section: "IRPR s. 76(1) – Selection Criteria" },
    ],
  },
  {
    id: "ee-cec",
    title: "Canadian Experience Class (CEC)",
    category: "express-entry",
    keywords: ["cec", "canadian experience", "canadian work experience", "express entry work"],
    content: "The Canadian Experience Class (CEC) is for individuals who have gained at least 1 year of skilled work experience in Canada within the 3 years before applying. Work must be in NOC TEER 0, 1, 2, or 3. For TEER 0 or 1, minimum CLB 7 is required. For TEER 2 or 3, minimum CLB 5 is required. Education is not a eligibility requirement for CEC, though points are awarded for education under CRS. No proof of funds is required. The work experience must have been obtained with proper temporary resident status and authorization.",
    citations: [
      { section: "IRPR ss. 87.1-91" },
      { section: "IRPR s. 87.1(2) – CEC Requirements" },
    ],
  },
  {
    id: "ee-fst",
    title: "Federal Skilled Trades Program (FST)",
    category: "express-entry",
    keywords: ["fst", "skilled trades", "tradesperson", "trades", "blue collar"],
    content: "The Federal Skilled Trades Program (FST) is for qualified skilled tradespersons. Eligibility requires at least 2 years of full-time work experience (or equivalent part-time) in a skilled trade within the 5 years before applying. The trades are organized under NOC TEER 2 and 3 major groups: Industrial, electrical and construction trades; Maintenance and equipment operation trades; Supervisors and technical occupations in natural resources and agriculture; Processing, manufacturing and utility supervisors and central control operators; Chefs and cooks; Butchers and bakers. Applicants must meet the job requirements for that trade as set out in the NOC, have a valid job offer of at least 1 year or a certificate of qualification from a provincial or territorial authority, and meet minimum CLB 5 for speaking/listening and CLB 4 for reading/writing.",
    citations: [
      { section: "IRPR ss. 92-101" },
      { section: "IRPR s. 93 – FST Requirements" },
    ],
  },
  {
    id: "crs-scoring",
    title: "Comprehensive Ranking System (CRS)",
    category: "express-entry",
    keywords: ["crs", "comprehensive ranking system", "score", "points", "ranking", "ita"],
    content: "The Comprehensive Ranking System (CRS) ranks Express Entry candidates out of a maximum of 1,200 points. Core/human capital factors (age, education, language, Canadian work experience) = max 500 points. Spouse factors (education, language, Canadian work experience) = max 40 points. Skill transferability (education + language, education + foreign work, foreign work + language, Canadian work + language) = max 100 points. Additional points: provincial nomination = 600, qualifying job offer = 50 or 200, Canadian education = 15 or 30, French language proficiency = 50, sibling in Canada = 15. Candidates with the highest CRS scores receive ITAs in periodic draws.",
    citations: [
      { section: "IRPR ss. 102-116" },
      { section: "IRPR s. 104 – CRS Point Grid" },
    ],
  },
  {
    id: "pnp-overview",
    title: "Provincial Nominee Programs (PNP)",
    category: "pnp",
    keywords: ["pnp", "provincial nominee", "nomination", "province", "territory", "pn"],
    content: "The Provincial Nominee Program (PNP) allows Canadian provinces and territories to nominate individuals for permanent residence who meet local economic needs. Each province operates its own streams: Ontario (OINP), British Columbia (BC PNP), Alberta (AAIP), Manitoba (MPNP), Saskatchewan (SINP), Nova Scotia (NSNP), New Brunswick (NBPNP), Newfoundland and Labrador (NLPNP), Prince Edward Island (PEI PNP), Yukon (YNP), Northwest Territories (NTNP). PNP has two pathways: Base (paper-based, processed outside Express Entry, takes 18-24 months) and Enhanced (linked to Express Entry, 600 CRS points added, processed within 6 months). Each stream has unique eligibility criteria.",
    citations: [
      { section: "IRPR ss. 61-73 – Provincial Nominees" },
      { section: "IRPA s. 87 – Provincial Nomination" },
    ],
  },
  {
    id: "pnp-oinp",
    title: "Ontario Immigrant Nominee Program (OINP)",
    category: "pnp",
    keywords: ["oinp", "ontario", "ontario pnp", "ontario nominee", "ontario immigrant"],
    content: "The Ontario Immigrant Nominee Program (OINP) operates several streams: Human Capital Priorities (HCP) – searches Express Entry for candidates in targeted occupations, requires CRS 350+ and CLB 7; French-Speaking Skilled Worker – requires CLB 7 French and CLB 6 English; Skilled Trades – for Express Entry candidates with 1+ year Ontario skilled trades experience; Master's Graduate – for recent Ontario master's graduates, no job offer needed; PhD Graduate – for Ontario PhD graduates; Employer Job Offer streams (Foreign Worker, International Student, In-Demand Skills). Ontario regularly issues targeted Notifications of Interest (NOIs) to Express Entry candidates.",
    citations: [
      { section: "OINP Guidelines – O. Reg. 422/17" },
    ],
  },
  {
    id: "pnp-bcpnp",
    title: "British Columbia PNP (BC PNP)",
    category: "pnp",
    keywords: ["bc pnp", "british columbia", "bc nominee", "bc immigration"],
    content: "British Columbia's Provincial Nominee Program (BC PNP) operates through the Skills Immigration and Express Entry BC streams. Key streams: Skilled Worker – requires a valid job offer in BC in a skilled occupation; Health Authority – for physicians, nurses, and allied health professionals; International Graduate – for recent graduates of Canadian or foreign institutions with a BC job offer; International Post-Graduate – for graduates of BC master's/PhD programs in natural, applied, or health sciences (no job offer needed); Entry Level and Semi-Skilled – for workers in tourism/hospitality, food processing, and long-haul trucking. The BC PNP uses a points-based registration system (Skills Immigration Registration System or SIRS) with regular draws.",
    citations: [
      { section: "BC PNP Program Guide" },
    ],
  },
  {
    id: "study-permit",
    title: "Study Permits",
    category: "study-permit",
    keywords: ["study permit", "student", "international student", "dli", "designated learning", "college", "university"],
    content: "A study permit is required for programs longer than 6 months at a Designated Learning Institution (DLI). Requirements: acceptance letter from a DLI, proof of sufficient funds (tuition + $20,635 living costs + return transportation for 2024), no criminal or immigration record, medical exam if required, and intent to leave Canada after studies. Study permits are typically valid for the duration of the program plus 90 days. Off-campus work: up to 24 hours/week during academic sessions, full-time during breaks (IRPR s. 186(v)). Full-time students at DLIs may work off-campus without a separate work permit. Spouses of full-time students may be eligible for open work permits. PGWP eligibility requires continuous full-time enrollment in a program of at least 8 months at a DLI.",
    citations: [
      { section: "IRPR ss. 210-230 – Study Permits" },
      { section: "IRPR s. 186(v) – Off-Campus Work" },
      { section: "IRPR s. 205(c)(ii) – Off-Campus Work" },
    ],
  },
  {
    id: "pgwp",
    title: "Post-Graduation Work Permit (PGWP)",
    category: "study-permit",
    keywords: ["pgwp", "post graduation", "post-graduation", "graduate work permit", "graduation", "work after study"],
    content: "The Post-Graduation Work Permit (PGWP) allows graduates of eligible Canadian DLIs to work in Canada after graduation. Eligibility: completed a program of at least 8 months at a DLI leading to a degree, diploma, or certificate, maintained continuous full-time enrollment (except final academic session), and applied within 180 days of receiving final marks or completion letter. PGWP length: programs 8 months to under 2 years = permit valid for same length as program; programs 2 years or more = 3-year PGWP. PGWP is an open work permit (no LMIA needed). PGWP holders can gain Canadian work experience eligible for CEC. PGWP can only be issued once per lifetime.",
    citations: [
      { section: "IRPR ss. 201-206 – Work Permits for Graduates" },
      { section: "IRPR s. 205(c)(ii) – Significant Benefit" },
    ],
  },
  {
    id: "work-permit-lmia",
    title: "LMIA-Based Work Permits",
    category: "work-permit",
    keywords: ["lmia", "labour market impact assessment", "employer specific", "closed work permit", "job offer"],
    content: "A Labour Market Impact Assessment (LMIA) is a document from Employment and Social Development Canada (ESDC) that confirms hiring a foreign worker will have a positive or neutral impact on the Canadian labour market. Employer-specific (closed) work permits require a positive LMIA, unless LMIA-exempt. LMIA processing: Global Talent Stream = 10 business days; High-Wage and Low-Wage streams = approximately 60 business days. The employer must pay the LMIA processing fee ($1,000 per position for most streams). Employer compliance: employers must maintain records, comply with wages/conditions, and may be subject to inspections. Dual intent: temporary and permanent residence can be pursued simultaneously.",
    citations: [
      { section: "IRPR ss. 200-209 – Work Permits" },
      { section: "IRPR ss. 203(1) – LMIA Requirement" },
      { section: "Immigration and Refugee Protection Regulations, Division 7" },
    ],
  },
  {
    id: "work-permit-lmia-exempt",
    title: "LMIA-Exempt Work Permits",
    category: "work-permit",
    keywords: ["lmia exempt", "open work permit", "international mobility", "c", "free trade", "intra-company", "ict"],
    content: "LMIA-exempt work permits fall under the International Mobility Program (IMP). Categories: C10 – significant benefit to Canada (e.g., intra-company transferees, entrepreneurs); C11 – reciprocal employment; C12 – spouses of skilled workers/students; C16 – USMCA/CUSMA professionals (NAFTA replacement); C20 – researchers, lecturers; C21 – post-graduation work permit holders; C41 – spouses of full-time international students; C42 – spouses of PGWP holders working in TEER 0/1/2/3; C43 – refugee claimants with positive eligibility; C47 – youth exchange programs (IEC). Open work permits are not tied to a specific employer. Employer-specific LMIA-exempt permits require an employer-specific exemption code and compliance fee ($230). Processing: IMP applications are typically processed within 60-120 days.",
    citations: [
      { section: "IRPR s. 205 – LMIA Exemptions" },
      { section: "IRPR ss. 204-207" },
      { section: "USMCA/CUSMA Chapter 16" },
    ],
  },
  {
    id: "spousal-owp",
    title: "Spousal Open Work Permit (SOWP)",
    category: "work-permit",
    keywords: ["sowp", "spousal", "spouse", "open work permit spouse", "spousal work permit"],
    content: "The Spousal Open Work Permit (SOWP) allows spouses of work permit holders and international students to work in Canada. For spouses of work permit holders: the work permit holder must be employed in TEER 0, 1, 2, or 3 and have at least 6 months remaining on their permit. For spouses of international students: the student must hold a valid study permit and be enrolled full-time at a DLI in a program leading to a degree or diploma at a university or college. As of 2024, spouses of international students in bachelor's, master's, and doctoral programs remain eligible. Spouses of students in other programs have restricted eligibility. The SOWP is generally valid for the same duration as the principal applicant's status and allows work for any employer.",
    citations: [
      { section: "IRPR s. 205(c)(ii) – Significant Benefit" },
      { section: "IRPR s. 205(c)(iii) – Significant Benefit (Spouses)" },
    ],
  },
  {
    id: "visitor-visa-trv",
    title: "Visitor Visa / Temporary Resident Visa (TRV)",
    category: "visitor",
    keywords: ["visitor visa", "trv", "temporary resident", "tourist", "visit canada", "visitor record"],
    content: "A Temporary Resident Visa (TRV) or eTA is required for foreign nationals visiting Canada, unless visa-exempt. Visa-required countries must apply for a TRV. Visa-exempt nationals need an eTA (Electronic Travel Authorization) when flying to Canada. TRV application requirements: valid passport, proof of sufficient funds for stay, ties to home country (employment, property, family), travel history, purpose of visit, and intent to leave Canada at end of authorized stay. Visitor Record: issued at entry or by application, allows stays of up to 6 months. Extensions can be applied for from within Canada before status expires. Super Visa: multi-entry visa for parents/grandparents of Canadian citizens/PRs, valid for up to 10 years, allowing stays of up to 5 years per entry. Requires proof of minimum income (LICO + 30%), Canadian insurance coverage ($100,000 minimum), and a signed invitation letter.",
    citations: [
      { section: "IRPR ss. 179-194 – Temporary Resident Visas" },
      { section: "IRPR s. 183 – Required Documentation" },
      { section: "IRPR s. 186 – Authorized Stays" },
    ],
  },
  {
    id: "sponsorship-spouse",
    title: "Spousal Sponsorship (Inland & Outland)",
    category: "family-sponsorship",
    keywords: ["spouse sponsorship", "spousal", "inland", "outland", "sponsor", "common law", "conjugal"],
    content: "Canadian citizens and permanent residents can sponsor their spouse, common-law partner, or conjugal partner for permanent residence. Eligibility: sponsor must be 18+, Canadian citizen or PR, not receiving social assistance (except disability), and able to demonstrate sufficient income to support the sponsored person (unless the sponsorship is for a spouse/partner without dependent children). Sponsored person: must be 18+ for spouse partner. Inland sponsorship: both sponsor and applicant live together in Canada; includes open work permit for applicant; processing time ~12-15 months. Outland sponsorship: applicant lives outside Canada (or can be inside); processing time ~10-12 months. Common-law partner: must have continuously cohabited for at least 12 months. Conjugal partner: for exceptional circumstances where cohabitation or marriage is not possible. The undertaking period is 3 years from the date the sponsored person becomes a PR.",
    citations: [
      { section: "IRPR ss. 116-145 – Family Class" },
      { section: "IRPR s. 130 – Sponsorship Requirements" },
      { section: "IRPR s. 132(1) – Undertaking Period" },
    ],
  },
  {
    id: "sponsorship-parent",
    title: "Parent and Grandparent Sponsorship (PGP)",
    category: "family-sponsorship",
    keywords: ["parent", "grandparent", "pgp", "sponsor parent", "parent sponsorship", "sponsorship parents"],
    content: "The Parents and Grandparents Program (PGP) allows Canadian citizens and PRs to sponsor their parents and grandparents for permanent residence. The program operates on a lottery/interest to sponsor system. IRCC issues invitations to apply to randomly selected sponsors from the pool of interest forms submitted during the annual intake window. Sponsor requirements: minimum income threshold (LICO + 30% for the 3 consecutive tax years before applying), must continue to meet LICO during processing. Undertaking period: 20 years (from Quebec: 10 years). As an alternative, the Super Visa allows parents and grandparents to visit for up to 5 years at a time and is valid for up to 10 years.",
    citations: [
      { section: "IRPR ss. 116-145 – Family Class" },
      { section: "IRPR s. 133(1)(j) – PGP Income Requirement" },
    ],
  },
  {
    id: "proof-of-funds",
    title: "Proof of Funds Requirements",
    category: "general",
    keywords: ["proof of funds", "funds", "financial", "settlement funds", "minimum funds", "pof"],
    content: "Proof of funds (POF) is required for FSW and FST programs in Express Entry (exempt for CEC and those with a valid job offer or authorized to work in Canada). POF amounts are updated annually by IRCC based on 50% of LICO (Low Income Cut-Off). As of 2024: 1 person = $14,690; 2 persons = $18,288; 3 persons = $22,483; 4 persons = $27,297; 5 persons = $30,690; 6 persons = $34,597; 7+ persons = $38,506. Funds must be readily available (cash, bank accounts, investments, not real estate) and unencumbered by debts. Funds can be in Canada or abroad. The applicant must be able to use the funds upon arrival. The 3-month average balance is commonly reviewed. Funds for spouses and dependent children are included.",
    citations: [
      { section: "IRPR s. 76(1)(b) – Financial Requirements" },
      { section: "IRPR s. 76(3) – Exemptions" },
    ],
  },
  {
    id: "biometrics",
    title: "Biometrics Requirements",
    category: "general",
    keywords: ["biometrics", "fingerprints", "photo", "bometric", "vfs", "service canada"],
    content: "Biometrics (fingerprints and photograph) are required for most immigration applications. Validity: 10 years from the date of enrolment. Applicants must give biometrics at a designated VAC (Visa Application Centre), Service Canada location, or US Application Support Center (for applicants in the US). Exemptions: citizens of visa-exempt countries applying for a study/work permit (unless TRV also required), children under 14, and applicants over 79. Biometrics fee: CAD $85 per person or $170 for a family of 2+ persons. Biometrics must be provided within 30 days of the biometric instruction letter (BIL).",
    citations: [
      { section: "IRPR ss. 12.1-12.8 – Biometrics" },
      { section: "IRPA s. 32(1) – Biometrics Regulations" },
    ],
  },
  {
    id: "language-requirements",
    title: "Language Requirements (IELTS, CELPIP, TEF)",
    category: "general",
    keywords: ["language", "ielts", "celpip", "tef", "clb", "nclc", "english", "french", "test score"],
    content: "Language proficiency is a core requirement for most economic immigration programs. Approved tests: IELTS General (English), CELPIP General (English), TEF Canada (French), TCF Canada (French). CLB (Canadian Language Benchmarks) equivalencies: CLB 4 = IELTS 4.0/4.5; CLB 5 = IELTS 5.0; CLB 6 = IELTS 5.5; CLB 7 = IELTS 6.0 (minimum for FSW, CEC TEER 0/1); CLB 8 = IELTS 6.5; CLB 9 = IELTS 7.0; CLB 10 = IELTS 7.5-8.0. Test results are valid for 2 years from the test date. For French: NCLC is the equivalent scale (Niveau de compétence linguistique canadien). Bilingual candidates can earn up to 50 additional CRS points for strong French ability (CLB 7+) combined with English (CLB 5+).",
    citations: [
      { section: "IRPR s. 78 – Language Proficiency" },
      { section: "IRPR s. 80 – Language Test Requirements" },
    ],
  },
  {
    id: "eca",
    title: "Educational Credential Assessment (ECA)",
    category: "general",
    keywords: ["eca", "education", "credential assessment", "degree evaluation", "wes", "ices", "comparative"],
    content: "An Educational Credential Assessment (ECA) is required for FSW program points for foreign education and for CRS points for education obtained outside Canada. Designated ECA organizations: WES (World Education Services), ICES (International Credential Evaluation Service), IQAS (International Qualifications Assessment Service), and several others. ECA processing time varies by organization (WES = approximately 30-35 business days). ECAs are valid for 5 years from the date of issue. The ECA report indicates the Canadian equivalency: secondary school, one-year program credential, two-year program credential, bachelor's degree, or master's/PhD.",
    citations: [
      { section: "IRPR s. 73(1) – Educational Requirements" },
      { section: "IRPR s. 75(2)(c) – ECA Requirement" },
    ],
  },
  {
    id: "citizenship",
    title: "Canadian Citizenship",
    category: "citizenship",
    keywords: ["citizenship", "citizen", "naturalization", "passport", "grant", "oath"],
    content: "Canadian citizenship can be obtained by grant (naturalization) or by birth. Grant requirements: permanent resident status with no unfulfilled conditions, physically present in Canada for at least 1,095 days (3 years) in the 5 years before application, filed income tax for at least 3 years within the 5-year period, pass a knowledge test (for ages 18-54), demonstrate language proficiency in English/French at CLB 4 or higher (for ages 18-54). Minors do not need to meet the physical presence requirement but must be PRs. Citizenship applications are processed in approximately 12-18 months. Dual citizenship is permitted in Canada. The citizenship ceremony involves taking the Oath of Citizenship. Processing fee: adults $630, minors $100 (includes right of citizenship fee).",
    citations: [
      { section: "Citizenship Act s. 5(1) – Grant of Citizenship" },
      { section: "Citizenship Act s. 5(1)(c) – Physical Presence" },
    ],
  },
  {
    id: "inland-processing",
    title: "Inland vs Outland Processing",
    category: "general",
    keywords: ["inland", "outland", "processing office", "visa office", "application processing", "cpco"],
    content: "Inland processing: applications submitted by applicants physically inside Canada are processed by IRCC's Case Processing Centre (CPC) in Canada (e.g., CPC-Ottawa, Edmonton). Outland processing: applications submitted by applicants outside Canada (or those who IRCC directs to a foreign visa office) are processed by visa offices abroad (e.g., London, Manila, New Delhi, Sydney, Paris). Processing times often differ significantly between inland and outland offices. Some programs restrict where you can apply. Spousal sponsorship offers both inland and outland pathways. Inland spousal applicants may apply for an open work permit. Outland processing may be faster in some cases and allows the applicant to travel during processing (though not recommended for inland applications).",
    citations: [
      { section: "IRPR ss. 69-73 – Application Processing" },
    ],
  },
  {
    id: "super-visa",
    title: "Super Visa (Parents and Grandparents)",
    category: "visitor",
    keywords: ["super visa", "supervisa", "parent", "grandparent", "10 year", "parent super visa"],
    content: "The Super Visa is a multi-entry visa for parents and grandparents of Canadian citizens or permanent residents. It allows stays of up to 5 years per entry (renewable without leaving Canada). Validity: up to 10 years. Requirements: child must meet minimum income threshold (LICO + 30% for the previous year), parent/grandparent must purchase private medical insurance from a Canadian insurer for at least $100,000 coverage for 1 year, proof of relationship (birth certificate, etc.), and signed invitation letter from the child in Canada. Letter of undertaking to provide financial support from the child is also required. The Super Visa is processed through regular TRV application channels with additional documentation.",
    citations: [
      { section: "IRPR s. 179 – TRV Provisions" },
      { section: "IRCC Policy – Super Visa Guidelines" },
    ],
  },
  {
    id: "maintained-status",
    title: "Maintained Status (Formerly Implied Status)",
    category: "general",
    keywords: ["maintained status", "implied status", "implied", "maintained", "overstay", "status restoration"],
    content: "Maintained status (formerly known as implied status) allows temporary residents to continue their authorized stay under the same conditions while IRCC processes their extension application, provided they applied BEFORE their status expired. Maintained status applies to: study permit extensions, work permit extensions, visitor record extensions. Condition: the applicant must have submitted a complete application before the expiry of their current status. It does NOT apply to: applications for a change in status (e.g., visitor to worker, visitor to student) unless authorized by policy, restoration applications, or applications submitted after status expiry. Restoration: available within 90 days of losing status for visitors, workers, and students (study permit restoration only within 90 days).",
    citations: [
      { section: "IRPR s. 186(1) – Maintained Status" },
      { section: "IRPR ss. 181-185 – Restoration" },
    ],
  },
  {
    id: "medical-exam",
    title: "Medical Exam Requirements",
    category: "general",
    keywords: ["medical", "exam", "medical exam", "doctor", "panel physician", "ime", "inadmissible", "health"],
    content: "Medical exams are required for most permanent residence applications and some temporary residence applications (study/work permits for programs over 6 months, or if coming from designated countries). Panel physicians are IRCC-approved doctors who perform immigration medical exams (IMEs). An IME includes: physical examination, chest X-ray (for ages 11+), blood tests (syphilis, HIV for ages 15+), and urinalysis (for ages 5+). Medical validity: 12 months from the date of exam. Medical inadmissibility: a foreign national may be inadmissible on health grounds if their condition would cause excessive demand (exceeding the cost threshold of approximately $24,057 CAD per year in 2024, updated annually) on health or social services (IRPA s. 38(1)(c)). Exemptions exist for refugees, protected persons, dependents, and certain sponsorship cases.",
    citations: [
      { section: "IRPA s. 38 – Medical Inadmissibility" },
      { section: "IRPR s. 30 – Medical Examination" },
    ],
  },
  {
    id: "police-certificate",
    title: "Police Certificates / Criminal Record Checks",
    category: "general",
    keywords: ["police certificate", "police clearance", "criminal record", "pcc", "background check", "rcmp"],
    content: "Police certificates are required for all permanent residence applicants aged 18+ and for certain temporary residence applications. Requirements: certificates from every country where the applicant has lived for 6+ months since age 18. Canadian police certificate: RCMP criminal record check (fingerprint-based) is typically not required upfront but may be requested during processing. Processing times vary by country (2 weeks to 6+ months). Criminal inadmissibility (IRPA s. 36): foreign nationals may be inadmissible for serious criminality (maximum sentence of 10+ years) or criminality (indictable offenses). Deemed rehabilitation automatic after 10 years for non-serious offenses. Individual rehabilitation applications can be submitted after 5-10 years depending on the offense. Temporary Resident Permits (TRPs) may be available for those who need to enter Canada despite inadmissibility.",
    citations: [
      { section: "IRPA s. 36 – Criminal Inadmissibility" },
      { section: "IRPR ss. 15-21 – Police Certificates" },
    ],
  },
];

export default entries;
