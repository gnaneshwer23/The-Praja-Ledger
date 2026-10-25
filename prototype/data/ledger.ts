export const checkedOn = "25 October 2026";

export type Tone = "pending" | "plain" | "gap";

export type Source = {
  title: string;
  publisher: string;
  date: string;
  url: string;
};

export type Entry = {
  id: string;
  section: "cases" | "promises" | "finances" | "elections" | "changes";
  title: string;
  body: string;
  status: string;
  tone: Tone;
  sources: Source[];
};

export type Leader = {
  slug: string;
  name: string;
  nameTe: string;
  party: string;
  office: string;
  summary: string;
  recordIds: string[];
  sources: Source[];
};

export const sections = [
  { href: "/", label: "Overview", folio: "01" },
  { href: "/leaders", label: "Leaders", folio: "02" },
  { href: "/cases", label: "Legal cases", folio: "03" },
  { href: "/promises", label: "Promises", folio: "04" },
  { href: "/finances", label: "State finances", folio: "05" },
  { href: "/elections", label: "Elections", folio: "06" },
  { href: "/changes", label: "Change log", folio: "07" },
  { href: "/corrections", label: "Corrections", folio: "08" },
  { href: "/method", label: "How we record", folio: "09" },
] as const;

export const entries: Entry[] = [
  {
    id: "PL-C-01",
    section: "cases",
    title: "Formula E payments case against K. T. Rama Rao",
    status: "Pending. Discharge petition listed for 30 October 2026.",
    tone: "pending",
    body: "The Telangana Anti-Corruption Bureau registered a case in December 2024 over payments made for the Hyderabad Formula E race. The Times of India reported on 12 October 2026 that the allegation is that Rs 55 crore was diverted to the UK-based Formula E organisation in violation of prescribed procedure. The paper said a chargesheet was filed in March 2026 against K. T. Rama Rao, former municipal administration special chief secretary Arvind Kumar, former HMDA chief engineer B. L. N. Reddy, Ace Nxt Gen executive G. Kiran Malleswara Rao, and Formula E representative Alberto Longo. Press Trust of India reported that the case uses the Prevention of Corruption Act and the Indian Penal Code, including criminal misappropriation and conspiracy. Rao’s lawyer told The Times of India that a discharge petition was filed on 29 September 2026 under section 262(1) of the Bharatiya Nagarik Suraksha Sanhita, and that the court posted the hearing to 30 October 2026. An ACB official told the paper the bureau would oppose it. The Hindu reported that Rao appeared at the Nampally court on 18 September 2026, said he had done nothing wrong, and that the hearing that day was adjourned to 30 October because two accused companies were not represented. These reports do not contain a judgment.",
    sources: [
      {
        title: "KTR files discharge petition in Formula-E case",
        publisher: "The Times of India",
        date: "12 October 2026",
        url: "https://timesofindia.indiatimes.com/city/hyderabad/ktr-files-discharge-petition-in-formula-e-case/articleshow/134894352.cms",
      },
      {
        title: "KTR files discharge petition in Formula E race case",
        publisher: "Press Trust of India, via Siasat",
        date: "12 October 2026",
        url: "https://www.siasat.com/ktr-files-discharge-petition-in-formula-e-race-case-3556895/",
      },
      {
        title: "Formula E case: KTR appears in court, next hearing adjourned to October 30",
        publisher: "The Hindu",
        date: "18 September 2026",
        url: "https://www.thehindu.com/news/national/telangana/formula-e-case-ktr-appears-in-court-next-hearing-adjourned-to-october-30/article71481406.ece",
      },
    ],
  },
  {
    id: "PL-C-02",
    section: "cases",
    title: "Delhi excise-policy case against K. Kavitha",
    status: "Exonerated, as reported. The court order is not linked in this edition.",
    tone: "plain",
    body: "The Indian Express reported on 27 February 2026 that a Delhi court had exonerated former BRS MLC K. Kavitha in the Delhi excise-policy case. The paper said she had been accused of taking part in a “South Group” that arranged payments of Rs 100 crore to the Aam Aadmi Party in exchange for liquor licences, and that she spent a little over five months in prison before she was granted bail. After the order she described the case as politically motivated. This line follows the news report. It does not quote the order.",
    sources: [
      {
        title: "Exoneration in Delhi excise case, new party, no truce with family: What next for K Kavitha?",
        publisher: "The Indian Express",
        date: "27 February 2026",
        url: "https://indianexpress.com/article/political-pulse/clean-chit-in-delhi-excise-case-new-party-and-no-truce-what-next-for-k-kavitha-10555614/",
      },
    ],
  },
  {
    id: "PL-P-01",
    section: "promises",
    title: "Mahalakshmi",
    status: "Operating on the government’s figures, with a reported delay in LPG credits.",
    tone: "plain",
    body: "The Socio-Economic Outlook 2026 describes Mahalakshmi as free travel for girls, women, and transgender persons in 81% of TGRTC buses, and cooking-gas refills at Rs 500 for ration-card holders with an active connection. It says that, as of January 2026, women had taken about 269.68 crore trips since the scheme began, that their share of passengers rose from about 40% to 67.39%, and that Rs 9,222 crore in fare is to be reimbursed to the corporation. It says 42.90 lakh people were receiving the gas subsidy as of 15 December 2025. The same outlook says women can convert recurring monthly payments into a lump sum of up to Rs 2 lakh for an enterprise. It does not say how many have done so. ThePrint, writing as the government reached two and a half years, reported that ministers were hearing of districts where the state’s share of the gas subsidy was late, so people paid the full cylinder price first.",
    sources: [
      {
        title: "Socio-Economic Outlook 2026",
        publisher: "Government of Telangana",
        date: "2026",
        url: "https://www.telangana.gov.in/wp-content/uploads/2026/08/Socio-Economic-Outlook-2026.pdf",
      },
      {
        title: "Telangana’s road to 2028: top challenges for Revanth Reddy",
        publisher: "ThePrint",
        date: "2026",
        url: "https://theprint.in/politics/telanganas-road-to-2028-top-challenges-that-lie-ahead-for-revanth-reddy-as-his-govt-hits-halfway-mark/2948725/",
      },
    ],
  },
  {
    id: "PL-P-02",
    section: "promises",
    title: "Rythu Bharosa",
    status: "Partial. A further payment was still described as outstanding in April 2026.",
    tone: "pending",
    body: "The Socio-Economic Outlook 2026 says that in the 2025–26 vanakalam season the state paid Rs 8,744.13 crore to 69.40 lakh pattadars between 16 and 24 June 2025. Deccan Chronicle reported on 23 April 2026 that, for the yasangi season, 71.05 lakh farmers holding up to 2 acres had received Rs 5,653 crore in two tranches, released on 22 March and 20 April. The paper said agriculture department figures put a further Rs 3,446 crore as the amount needed to cover every eligible farmer with no cap on land size, and that the Chief Minister said the rest would be released in a third phase the following month. This edition has no later document confirming that third phase.",
    sources: [
      {
        title: "Socio-Economic Outlook 2026",
        publisher: "Government of Telangana",
        date: "2026",
        url: "https://www.telangana.gov.in/wp-content/uploads/2026/08/Socio-Economic-Outlook-2026.pdf",
      },
      {
        title: "Telangana: Rythu Bharosa covered farmers up to 2 acres in 2 phases",
        publisher: "Deccan Chronicle",
        date: "23 April 2026",
        url: "https://www.deccanchronicle.com/southern-states/telangana/telangana-rythu-bharosa-covered-farmers-up-to-2-acres-in-2-phases-1952345",
      },
    ],
  },
  {
    id: "PL-P-03",
    section: "promises",
    title: "Gruha Jyothi",
    status: "Operating, on the government’s figures.",
    tone: "plain",
    body: "The Socio-Economic Outlook 2026 says Gruha Jyothi gives eligible households free electricity up to 200 units a month. It says 53.09 lakh families are covered, zero bills have been issued, and the expenditure incurred is Rs 3,901 crore. The outlook does not define “eligible” in the passage used here, so this line does not say that every household receives the waiver.",
    sources: [
      {
        title: "Socio-Economic Outlook 2026",
        publisher: "Government of Telangana",
        date: "2026",
        url: "https://www.telangana.gov.in/wp-content/uploads/2026/08/Socio-Economic-Outlook-2026.pdf",
      },
    ],
  },
  {
    id: "PL-P-04",
    section: "promises",
    title: "Indiramma Indlu",
    status: "Partial against the target stated by the government.",
    tone: "pending",
    body: "The Socio-Economic Outlook 2026 says the programme is to build 4,50,000 houses, 3,500 in each assembly constituency, with a subsidy of Rs 5 lakh a house. Each house is described as two rooms, a kitchen, and a toilet, with a plinth of at least 400 square feet. The outlook says 3,24,536 houses have been sanctioned, of which 2,62,449 are under construction. It does not say how many families have moved in.",
    sources: [
      {
        title: "Socio-Economic Outlook 2026",
        publisher: "Government of Telangana",
        date: "2026",
        url: "https://www.telangana.gov.in/wp-content/uploads/2026/08/Socio-Economic-Outlook-2026.pdf",
      },
    ],
  },
  {
    id: "PL-P-05",
    section: "promises",
    title: "Cheyutha",
    status: "Operating, on the government’s account. The monthly amount per person is not in this passage.",
    tone: "plain",
    body: "The Socio-Economic Outlook 2026 says Cheyutha pays a monthly pension to senior citizens, widows, single women, persons with disabilities, and named categories of workers. From April 2025 to February 2026 it says Rs 10,678.30 crore was paid to 42.23 lakh people across 11 categories. It says Rs 25,655.59 crore was paid over the two years to February 2026, and that the programme has full coverage and pays every month. Those coverage words are the government’s. The passage does not state the rupee amount of the monthly pension.",
    sources: [
      {
        title: "Socio-Economic Outlook 2026",
        publisher: "Government of Telangana",
        date: "2026",
        url: "https://www.telangana.gov.in/wp-content/uploads/2026/08/Socio-Economic-Outlook-2026.pdf",
      },
    ],
  },
  {
    id: "PL-P-06",
    section: "promises",
    title: "Yuva Vikasam",
    status: "Not counted in this edition.",
    tone: "gap",
    body: "Yuva Vikasam is one of the six guarantees named in the state’s budget discussion. The Socio-Economic Outlook passages and the PRS budget analysis opened for this edition give beneficiary counts for the other five schemes, and they do not give one for Yuva Vikasam. No count is invented here.",
    sources: [
      {
        title: "Telangana Budget Analysis 2026–27",
        publisher: "PRS Legislative Research",
        date: "2026",
        url: "https://prsindia.org/budgets/states/telangana-budget-analysis-2026-27",
      },
    ],
  },
  {
    id: "PL-P-07",
    section: "promises",
    title: "What the six guarantees cost in the 2026–27 budget",
    status: "Budget estimate, not money already spent.",
    tone: "plain",
    body: "PRS Legislative Research says the state estimates spending Rs 50,713 crore on the six guarantees in 2026–27, equal to 21% of revenue receipts. In the revised estimates for 2025–26 the share was 24%. Of the 2026–27 sum, PRS says about 85% is Rythu Bharosa (Rs 18,000 crore), Cheyutha pension (Rs 14,861 crore), Indiramma houses (Rs 5,500 crore), and Mahalakshmi (Rs 4,305 crore; PRS spells it Mahalaxmi).",
    sources: [
      {
        title: "Telangana Budget Analysis 2026–27",
        publisher: "PRS Legislative Research",
        date: "2026",
        url: "https://prsindia.org/budgets/states/telangana-budget-analysis-2026-27",
      },
    ],
  },
  {
    id: "PL-F-01",
    section: "finances",
    title: "Budget estimates for 2026–27",
    status: "Estimates presented on 20 March 2026. They are not audited accounts.",
    tone: "plain",
    body: "PRS Legislative Research says Deputy Chief Minister Bhatti Vikramarka Mallu presented the budget on 20 March 2026. For 2026–27 the analysis records a GSDP of Rs 19,61,701 crore, expenditure excluding debt repayment of Rs 3,01,209 crore, debt repayment of Rs 23,025 crore, and receipts excluding borrowings of Rs 2,42,750 crore. The fiscal deficit is estimated at Rs 58,459 crore, 3% of GSDP. The revenue surplus is estimated at Rs 6,858 crore, 0.3% of GSDP. PRS notes that the 2025–26 revenue surplus was revised down to Rs 591 crore, 78% below the Rs 2,738 crore originally budgeted. The comparison table on the finances page includes 2024–25, when borrowings and repayments were swollen by Rs 1,29,376 crore of short-term advances from the RBI and their repayment.",
    sources: [
      {
        title: "Telangana Budget Analysis 2026–27",
        publisher: "PRS Legislative Research",
        date: "20 March 2026",
        url: "https://prsindia.org/budgets/states/telangana-budget-analysis-2026-27",
      },
    ],
  },
  {
    id: "PL-F-02",
    section: "finances",
    title: "Outstanding liabilities",
    status: "Estimate for the end of 2026–27. A different measure from the debt stock below.",
    tone: "plain",
    body: "PRS says outstanding liabilities are total borrowings at the end of a year, including public-account liabilities such as provident funds. At the end of 2026–27 they are estimated at 28.7% of GSDP, compared with a revised estimate of 28.3% for 2025–26. PRS states the percentage and does not state a rupee stock for this measure. This edition does not multiply the percentage by GSDP.",
    sources: [
      {
        title: "Telangana Budget Analysis 2026–27",
        publisher: "PRS Legislative Research",
        date: "2026",
        url: "https://prsindia.org/budgets/states/telangana-budget-analysis-2026-27",
      },
    ],
  },
  {
    id: "PL-F-03",
    section: "finances",
    title: "Public debt as on 31 March 2025",
    status: "Figure from the budget annexure. It is not the 2026–27 liability estimate.",
    tone: "plain",
    body: "The annexure to the 2026–27 budget states public debt as on 31 March 2025 at Rs 3,91,881.04 crore. The same page splits it into open-market loans of Rs 3,57,637.07 crore, loans from the central government of Rs 13,296.23 crore, loans from autonomous bodies of Rs 11,209.93 crore, ways and means advances including overdraft of Rs 5,841.95 crore, and special securities issued to the National Small Savings Fund of Rs 3,895.86 crore. Loans from the Centre include Rs 1,940.09 crore in lieu of GST compensation. Loans from autonomous bodies include Rs 6,246.06 crore of UDAY bonds.",
    sources: [
      {
        title: "Government guarantees, debt position, and securities lent",
        publisher: "Government of Telangana, annexure to the 2026–27 budget",
        date: "2026",
        url: "https://www.telangana.gov.in/wp-content/uploads/2026/05/Government-Guarantees-Debt-position-and-Securities-lent-to-Companies-and-other-Undertakings.pdf",
      },
    ],
  },
  {
    id: "PL-F-04",
    section: "finances",
    title: "Government guarantees",
    status: "Contingent. Not counted inside outstanding liabilities.",
    tone: "plain",
    body: "PRS says outstanding liabilities do not include guarantees the state has given on borrowings by its enterprises. As of 28 February 2026, PRS puts those outstanding guarantees at Rs 2,41,743 crore, 14% of GSDP. A guarantee becomes a payment only if the borrower does not pay.",
    sources: [
      {
        title: "Telangana Budget Analysis 2026–27",
        publisher: "PRS Legislative Research",
        date: "2026",
        url: "https://prsindia.org/budgets/states/telangana-budget-analysis-2026-27",
      },
    ],
  },
  {
    id: "PL-E-01",
    section: "elections",
    title: "Legislative Assembly, 2023",
    status: "Final statistical report of the Election Commission.",
    tone: "plain",
    body: "The Election Commission’s statistical report on the 2023 Telangana Legislative Assembly election records 119 seats. Indian National Congress won 64, Bharat Rashtra Samithi (written BHRS in the report) won 39, Bharatiya Janata Party won 8, All India Majlis-e-Ittehadul Muslimeen won 7, and the Communist Party of India won 1. Vote share of valid votes was 39.69% for Congress, 37.62% for BRS, 14% for the BJP, 2.23% for AIMIM, and 0.35% for CPI. Of the 119 successful candidates, 10 were women. Polling was on 30 November 2023 and counting on 3 December 2023, as reported by The Hindu before the count. A majority in a house of 119 is 60 seats. Congress crossed it.",
    sources: [
      {
        title: "List of successful candidates, Telangana Legislative Assembly election 2023",
        publisher: "Election Commission of India",
        date: "2023",
        url: "https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports/telangana/2023/List_of_Successful_Candidates.pdf",
      },
      {
        title: "Performance of political parties, Telangana Legislative Assembly election 2023",
        publisher: "Election Commission of India",
        date: "2023",
        url: "https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports/telangana/2023/Performance_of_Political_Parties.pdf",
      },
      {
        title: "CM KCR convenes cabinet meeting on Dec 4, a day after counting",
        publisher: "The Hindu",
        date: "December 2023",
        url: "https://www.thehindu.com/elections/telangana-assembly/cm-kcr-convenes-cabinet-meeting-on-dec-4-a-day-after-counting/article67594347.ece",
      },
    ],
  },
  {
    id: "PL-E-02",
    section: "elections",
    title: "Lok Sabha, 2024",
    status: "Seat totals published by the Election Commission.",
    tone: "plain",
    body: "The Election Commission’s party-wise result for Telangana in the 2024 Lok Sabha election shows 17 seats: Bharatiya Janata Party 8, Indian National Congress 8, All India Majlis-e-Ittehadul Muslimeen 1. BRS, which had won 9 seats in 2019, won none. G. Kishan Reddy won Secunderabad for the BJP with 4,73,012 votes and a margin of 49,944. Asaduddin Owaisi won Hyderabad for AIMIM. The Commission’s constituency page shows that result as declared, with a margin of 3,38,087 over Madhavi Latha Kompella of the BJP. This edition does not reprint his vote total, because the page opened here states the margin and not the total.",
    sources: [
      {
        title: "Party-wise result, Telangana, Lok Sabha election 2024",
        publisher: "Election Commission of India",
        date: "June 2024",
        url: "https://results.eci.gov.in/PcResultGenJune2024/partywiseresult-S29.htm",
      },
      {
        title: "Winning candidates, Bharatiya Janata Party, Telangana",
        publisher: "Election Commission of India",
        date: "June 2024",
        url: "https://results.eci.gov.in/PcResultGenJune2024/partywisewinresult-369S29.htm",
      },
      {
        title: "Constituency trends, Telangana, Lok Sabha election 2024",
        publisher: "Election Commission of India",
        date: "June 2024",
        url: "https://results.eci.gov.in/PcResultGenJune2024/statewiseS291.htm",
      },
    ],
  },
  {
    id: "PL-E-03",
    section: "elections",
    title: "K. Chandrashekar Rao left the Chief Minister’s office",
    status: "Resignation accepted on 3 December 2023.",
    tone: "plain",
    body: "Press Trust of India reported on 3 December 2023 that K. Chandrashekar Rao resigned as Chief Minister after his party’s defeat, that Governor Tamilisai Soundararajan accepted the resignation, and that she asked him to continue until a new government was formed. A communique from Raj Bhavan was the source named in that report. The state legislature’s current member list records him as the BRS MLA for Gajwel.",
    sources: [
      {
        title: "Telangana CM KCR resigns following party’s defeat in assembly polls",
        publisher: "Press Trust of India, via ThePrint",
        date: "3 December 2023",
        url: "https://theprint.in/india/telangana-cm-kcr-resigns-following-partys-defeat-in-assembly-polls/1870225/",
      },
      {
        title: "Members of the Legislative Assembly",
        publisher: "Government of Telangana",
        date: "Read 25 October 2026",
        url: "https://www.telangana.gov.in/legislature/members-of-legislative-assembly/",
      },
    ],
  },
  {
    id: "PL-H-01",
    section: "changes",
    title: "First edition",
    status: "Opened 25 October 2026.",
    tone: "plain",
    body: "Opened the nine sections in the outline: overview, leaders, legal cases, promises, state finances, elections, change log, corrections, and how we record. Entered seven leaders, two court matters, six guarantee lines, the 2026–27 budget, and the 2023 assembly and 2024 Lok Sabha results. No correction has been entered. Lines that could not be tied to a document were left out, including a beneficiary count for Yuva Vikasam.",
    sources: [],
  },
];

export const leaders: Leader[] = [
  {
    slug: "revanth-reddy",
    name: "A. Revanth Reddy",
    nameTe: "ఎ. రేవంత్ రెడ్డి",
    party: "Congress",
    office: "Chief Minister, MLA for Kodangal",
    summary:
      "The council of ministers lists Anumula Revanth Reddy as Chief Minister, with municipal administration and urban development, general administration, law and order, and every portfolio not allotted to another minister. The Hindu was still describing him as Chief Minister on 24 October 2026. He is the Congress MLA for Kodangal.",
    recordIds: ["PL-E-01", "PL-P-01", "PL-P-02", "PL-P-07", "PL-F-01"],
    sources: [
      {
        title: "Council of Ministers",
        publisher: "Government of Telangana",
        date: "Read 25 October 2026",
        url: "https://www.telangana.gov.in/government/council-of-ministers/",
      },
      {
        title: "Members of the Legislative Assembly",
        publisher: "Government of Telangana",
        date: "Read 25 October 2026",
        url: "https://www.telangana.gov.in/legislature/members-of-legislative-assembly/",
      },
      {
        title: "El Nino-induced water and power crisis likely to persist until July 2027",
        publisher: "The Hindu",
        date: "24 October 2026",
        url: "https://www.thehindu.com/news/national/telangana/el-nino-induced-water-and-power-crisis-likely-to-persist-until-july-revanth/article71617402.ece",
      },
    ],
  },
  {
    slug: "bhatti-vikramarka-mallu",
    name: "Bhatti Vikramarka Mallu",
    nameTe: "భట్టి విక్రమార్క మల్లు",
    party: "Congress",
    office: "Deputy Chief Minister, MLA for Madhira",
    summary:
      "The council of ministers lists him as Deputy Chief Minister, with finance and planning, and energy. His constituency is Madhira, reserved for Scheduled Castes. PRS records that he presented the 2026–27 budget.",
    recordIds: ["PL-F-01", "PL-F-02", "PL-F-04", "PL-P-07"],
    sources: [
      {
        title: "Council of Ministers",
        publisher: "Government of Telangana",
        date: "Read 25 October 2026",
        url: "https://www.telangana.gov.in/government/council-of-ministers/",
      },
    ],
  },
  {
    slug: "k-chandrashekar-rao",
    name: "K. Chandrashekar Rao",
    nameTe: "కె. చంద్రశేఖర్ రావు",
    party: "BRS",
    office: "MLA for Gajwel",
    summary:
      "The assembly member list records Kalvakuntla Chandrashekar Rao as the BRS MLA for Gajwel. He resigned as Chief Minister on 3 December 2023, after Congress won a majority. No court proceeding against him is entered in this edition.",
    recordIds: ["PL-E-01", "PL-E-03"],
    sources: [],
  },
  {
    slug: "k-t-rama-rao",
    name: "K. T. Rama Rao",
    nameTe: "కె. టి. రామారావు",
    party: "BRS",
    office: "MLA for Sircilla, BRS working president",
    summary:
      "The assembly member list records him as the BRS MLA for Sircilla. The Times of India, on 12 October 2026, described him as BRS working president. He is the prime accused named in the Formula E chargesheet. He denies wrongdoing. The case is pending.",
    recordIds: ["PL-C-01", "PL-E-01"],
    sources: [
      {
        title: "Members of the Legislative Assembly",
        publisher: "Government of Telangana",
        date: "Read 25 October 2026",
        url: "https://www.telangana.gov.in/legislature/members-of-legislative-assembly/",
      },
    ],
  },
  {
    slug: "k-kavitha",
    name: "K. Kavitha",
    nameTe: "కె. కవిత",
    party: "None recorded",
    office: "Former MLC, no current assembly seat",
    summary:
      "The Indian Express describes her as a former BRS member of the legislative council and the daughter of K. Chandrashekar Rao. The paper reported that she resigned from the party after a show-cause notice and has said she intends to launch her own party. She does not appear in the current assembly member list used here. A Delhi court exonerated her in the excise-policy case, the paper reported.",
    recordIds: ["PL-C-02"],
    sources: [],
  },
  {
    slug: "g-kishan-reddy",
    name: "G. Kishan Reddy",
    nameTe: "జి. కిషన్ రెడ్డి",
    party: "BJP",
    office: "MP for Secunderabad",
    summary:
      "The Election Commission records that G. Kishan Reddy won Secunderabad for the BJP in 2024, with 4,73,012 votes and a margin of 49,944. This edition does not record a ministerial portfolio for him.",
    recordIds: ["PL-E-02"],
    sources: [],
  },
  {
    slug: "asaduddin-owaisi",
    name: "Asaduddin Owaisi",
    nameTe: "అసదుద్దీన్ ఒవైసీ",
    party: "AIMIM",
    office: "MP for Hyderabad",
    summary:
      "The Election Commission records that Asaduddin Owaisi won Hyderabad for AIMIM in 2024. The constituency page shows the result as declared, by a margin of 3,38,087. AIMIM also won 7 assembly seats in 2023.",
    recordIds: ["PL-E-02", "PL-E-01"],
    sources: [],
  },
];

export function entriesBySection(section: Entry["section"]) {
  return entries.filter((entry) => entry.section === section);
}

export function entriesByIds(ids: string[]) {
  return ids
    .map((id) => entries.find((entry) => entry.id === id))
    .filter((entry): entry is Entry => Boolean(entry));
}

export function getLeader(slug: string) {
  return leaders.find((leader) => leader.slug === slug);
}

export function folioFor(path: string) {
  if (path.startsWith("/leaders")) return "02";
  const match = sections.find(
    (section) => section.href !== "/" && path.startsWith(section.href),
  );
  return match?.folio ?? "01";
}
