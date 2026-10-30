type IssueMessageKey =
  | "employmentTitle" | "learningTitle" | "waterTitle" | "grievancesTitle" | "electoralRollsTitle"
  | "telanganaScope" | "telanganaRuralScope" | "biharCaseScope"
  | "employmentPeriod" | "learningPeriod" | "waterPeriod" | "grievancesPeriod" | "electoralRollsPeriod"
  | "employmentSummary" | "learningSummary" | "waterSummary" | "grievancesSummary" | "electoralRollsSummary"
  | "employmentCaveat" | "learningCaveat" | "waterCaveat" | "grievancesCaveat" | "electoralRollsCaveat"
  | "mospiSource" | "aserSource" | "waterSource" | "grievancesSource" | "eciSource";

export type PublicIssue = {
  id: string;
  titleKey: IssueMessageKey;
  scopeKey: IssueMessageKey;
  periodKey: IssueMessageKey;
  metric: string;
  summaryKey: IssueMessageKey;
  caveatKey: IssueMessageKey;
  sourceLabelKey: IssueMessageKey;
  sourceUrl: string;
  category: "telangana" | "india";
};

/** Dated evidence snapshots. These are not live feeds; each record states its period. */
export const publicIssues: PublicIssue[] = [
  {
    id: "employment",
    titleKey: "employmentTitle",
    scopeKey: "telanganaScope",
    periodKey: "employmentPeriod",
    metric: "5.0%",
    summaryKey: "employmentSummary",
    caveatKey: "employmentCaveat",
    sourceLabelKey: "mospiSource",
    sourceUrl: "https://www.mospi.gov.in/uploads/publications_reports/publications_reports1780040415321_0624fb13-fb47-40bc-b470-7c7e9635c3ef_PLFS_2025_F_REV_29052026.pdf",
    category: "telangana",
  },
  {
    id: "learning",
    titleKey: "learningTitle",
    scopeKey: "telanganaRuralScope",
    periodKey: "learningPeriod",
    metric: "6.8%",
    summaryKey: "learningSummary",
    caveatKey: "learningCaveat",
    sourceLabelKey: "aserSource",
    sourceUrl: "https://asercentre.org/wp-content/uploads/2022/12/Telangana-2.pdf",
    category: "telangana",
  },
  {
    id: "water",
    titleKey: "waterTitle",
    scopeKey: "telanganaRuralScope",
    periodKey: "waterPeriod",
    metric: "83.0%",
    summaryKey: "waterSummary",
    caveatKey: "waterCaveat",
    sourceLabelKey: "waterSource",
    sourceUrl: "https://jaljeevanmission.gov.in/sites/default/files/2025-12/FHTC_Telangana_State%20Report.pdf",
    category: "telangana",
  },
  {
    id: "grievances",
    titleKey: "grievancesTitle",
    scopeKey: "telanganaScope",
    periodKey: "grievancesPeriod",
    metric: "11,376",
    summaryKey: "grievancesSummary",
    caveatKey: "grievancesCaveat",
    sourceLabelKey: "grievancesSource",
    sourceUrl: "https://pgportal.gov.in/darpgdashboard",
    category: "telangana",
  },
  {
    id: "electoral-rolls",
    titleKey: "electoralRollsTitle",
    scopeKey: "biharCaseScope",
    periodKey: "electoralRollsPeriod",
    metric: "65 lakh",
    summaryKey: "electoralRollsSummary",
    caveatKey: "electoralRollsCaveat",
    sourceLabelKey: "eciSource",
    sourceUrl: "https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2173316&lang=2&reg=48",
    category: "india",
  },
];

