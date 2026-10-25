export const promiseStatuses = [
  "delivered",
  "partial",
  "progress",
  "notStarted",
  "dropped",
  "unverified",
] as const;

export type PromiseStatus = (typeof promiseStatuses)[number];

export type SourceKind = "official" | "media" | "claim" | "analysis";

export type Citation = {
  title: string;
  publisher: string;
  date: string;
  url: string;
  kind: SourceKind;
};

export type StatusEvent = {
  status: PromiseStatus;
  asOf: string;
  detail: string;
  source: Citation | null;
};

export type ManifestoPromise = {
  slug: string;
  title: string;
  quote: string | null;
  quotePage: number | null;
  quoteUrl: string | null;
  measure: string;
  target: string;
  deadline: string | null;
  responsibility: "state" | "union";
  achieved: string | null;
  achievedAsOf: string | null;
  achievedSources: Citation[];
  context: string | null;
  gap: string | null;
  status: PromiseStatus;
  history: StatusEvent[];
};

export type Manifesto = {
  slug: string;
  title: string;
  party: string;
  inGovernment: boolean;
  government: "state" | "union";
  listFrozen: boolean;
  freezeDate: string | null;
  swornInLabel: string | null;
  promises: ManifestoPromise[];
};

type DateParts = { year: number; month: number; day: number };

/** Fixed reading date for this edition. Do not replace with Date.now(). */
export const scorecardAsOf: DateParts = { year: 2026, month: 10, day: 25 };
export const scorecardAsOfLabel = "25 Oct 2026";

export const congressSwornIn: DateParts = { year: 2023, month: 12, day: 7 };
export const termLength = 60;

/**
 * Month 1 starts on the swearing-in day. Each later month starts on that same
 * day. The result is the month that contains `asOf`, capped at the term length.
 */
export function termMonth(swornIn: DateParts, asOf: DateParts, length = termLength) {
  let completed = (asOf.year - swornIn.year) * 12 + (asOf.month - swornIn.month);
  if (asOf.day < swornIn.day) completed -= 1;
  const current = completed + 1;
  if (current < 1) return 1;
  if (current > length) return length;
  return current;
}

export const congressTermMonth = termMonth(congressSwornIn, scorecardAsOf);

const outlook: Citation = {
  title: "Socio-Economic Outlook 2026",
  publisher: "Government of Telangana",
  date: "2026",
  url: "https://www.telangana.gov.in/wp-content/uploads/2026/08/Socio-Economic-Outlook-2026.pdf",
  kind: "official",
};

const thePrint: Citation = {
  title: "Telangana’s road to 2028: top challenges for Revanth Reddy",
  publisher: "ThePrint",
  date: "2026",
  url: "https://theprint.in/politics/telanganas-road-to-2028-top-challenges-that-lie-ahead-for-revanth-reddy-as-his-govt-hits-halfway-mark/2948725/",
  kind: "media",
};

const deccan: Citation = {
  title: "Telangana: Rythu Bharosa covered farmers up to 2 acres in 2 phases",
  publisher: "Deccan Chronicle",
  date: "23 Apr 2026",
  url: "https://www.deccanchronicle.com/southern-states/telangana/telangana-rythu-bharosa-covered-farmers-up-to-2-acres-in-2-phases-1952345",
  kind: "media",
};

const prs: Citation = {
  title: "Telangana Budget Analysis 2026–27",
  publisher: "PRS Legislative Research",
  date: "2026",
  url: "https://prsindia.org/budgets/states/telangana-budget-analysis-2026-27",
  kind: "analysis",
};

const nie: Citation = {
  title: "Telangana BJP releases ‘1000 Days of Betrayal’ chargesheet against Congress government",
  publisher: "The New Indian Express",
  date: "2 Sep 2026",
  url: "https://www.newindianexpress.com/states/telangana/2026/Sep/02/telangana-bjp-releases-1000-days-of-betrayal-chargesheet-against-congress-government",
  kind: "claim",
};

const warangal: Citation = {
  title: "Cheyutha Scheme, Warangal district",
  publisher: "Government of Telangana",
  date: "23 Dec 2023",
  url: "https://warangal.telangana.gov.in/scheme/cheyutha-scheme/",
  kind: "official",
};

const checked = scorecardAsOfLabel;

function event(
  status: PromiseStatus,
  asOf: string,
  detail: string,
  source: Citation | null,
): StatusEvent {
  return { status, asOf, detail, source };
}

const congressPromises: ManifestoPromise[] = [
  {
    slug: "mahalakshmi-bus",
    title: "Mahalakshmi: free bus travel for women",
    quote: null,
    quotePage: null,
    quoteUrl: null,
    measure: "Bus travel for women",
    target: "Free bus travel for women",
    deadline: null,
    responsibility: "state",
    achieved:
      "Free travel for girls, women, and transgender persons in 81% of TGRTC buses. As of Jan 2026, women had taken about 269.68 crore trips since the scheme began. ₹9,222 cr is the fare to be reimbursed to the corporation. The outlook does not describe free travel on every bus.",
    achievedAsOf: "Jan 2026",
    achievedSources: [outlook],
    context: null,
    gap: null,
    status: "partial",
    history: [
      event(
        "partial",
        checked,
        "The Socio-Economic Outlook 2026 describes free travel in 81% of TGRTC buses, about 269.68 crore trips as of Jan 2026, and ₹9,222 cr in fare to be reimbursed. Coverage of buses is narrower than free travel on the service, so this is not recorded as delivered as promised.",
        outlook,
      ),
    ],
  },
  {
    slug: "mahalakshmi-gas",
    title: "Mahalakshmi: ₹500 gas cylinder",
    quote: null,
    quotePage: null,
    quoteUrl: null,
    measure: "Price of a cooking-gas refill",
    target: "₹500 gas cylinder",
    deadline: null,
    responsibility: "state",
    achieved:
      "Cooking-gas refills at ₹500 for ration-card holders with an active connection. 42.90 lakh people were receiving the gas subsidy as of 15 Dec 2025. ThePrint reported in 2026 that ministers were hearing of districts where the state’s share of the subsidy was late, so people paid the full cylinder price first.",
    achievedAsOf: "15 Dec 2025",
    achievedSources: [outlook, thePrint],
    context: null,
    gap: null,
    status: "partial",
    history: [
      event(
        "partial",
        checked,
        "The outlook describes refills at ₹500 for ration-card holders with an active connection, and 42.90 lakh people receiving the subsidy as of 15 Dec 2025. ThePrint reported a delay in the state’s share in some districts. A delay is later than a refill at ₹500 at the counter, so this is delivered in part.",
        outlook,
      ),
      event(
        "unverified",
        "2 Sep 2026",
        "The New Indian Express reported that a BJP document said the Mahalakshmi gas cylinder at ₹500 had not been implemented. That is a rival-party claim, as reported. It is not the government’s account, and it is not used here as the achieved figure.",
        nie,
      ),
    ],
  },
  {
    slug: "mahalakshmi-cash",
    title: "Mahalakshmi: ₹2,500 a month to women",
    quote: null,
    quotePage: null,
    quoteUrl: null,
    measure: "Rupees a month to women",
    target: "₹2,500 a month",
    deadline: null,
    responsibility: "state",
    achieved: null,
    achievedAsOf: null,
    achievedSources: [],
    context:
      "The Socio-Economic Outlook 2026 says women can convert recurring monthly payments into a lump sum of up to ₹2 lakh for an enterprise. It does not say how many have done so, and it does not state that ₹2,500 a month was paid.",
    gap: null,
    status: "unverified",
    history: [
      event(
        "unverified",
        checked,
        "No official account opened for this edition states that ₹2,500 a month was paid. The achieved figure is not compiled yet.",
        outlook,
      ),
      event(
        "unverified",
        "2 Sep 2026",
        "The New Indian Express reported that a BJP document said the ₹2,500 a month under Mahalakshmi had not been implemented, and that this failure, together with the gas cylinder, had deprived every eligible woman of ₹83,000. That is a rival-party claim, as reported. ₹83,000 is the document’s figure. It is not recorded here as money paid or unpaid.",
        nie,
      ),
    ],
  },
  {
    slug: "rythu-bharosa-acre",
    title: "Rythu Bharosa: ₹15,000 per acre a year",
    quote: null,
    quotePage: null,
    quoteUrl: null,
    measure: "Rupees per acre a year to farmers and tenant farmers",
    target: "₹15,000 per acre a year",
    deadline: null,
    responsibility: "state",
    achieved: null,
    achievedAsOf: null,
    achievedSources: [],
    context:
      "The Socio-Economic Outlook 2026 says ₹8,744.13 cr was paid to 69.40 lakh pattadars from 16 to 24 Jun 2025 for the 2025–26 vanakalam season. Deccan Chronicle reported on 23 Apr 2026 that, for yasangi, 71.05 lakh farmers holding up to 2 acres had received ₹5,653 cr, and that a further ₹3,446 cr was still needed to cover every eligible farmer with no cap on land size. Those are season totals. They do not state the rupees paid per acre. This edition has no later document confirming that third phase.",
    gap: null,
    status: "unverified",
    history: [
      event(
        "unverified",
        checked,
        "The opened government and newspaper accounts state rupees in crore and counts of farmers. They do not state the rupees paid per acre, so the ₹15,000 target cannot be checked from them.",
        outlook,
      ),
      event(
        "unverified",
        "23 Apr 2026",
        "Deccan Chronicle reported the yasangi payments above, and a further ₹3,446 cr still to be released. The report does not state a per-acre rate.",
        deccan,
      ),
      event(
        "unverified",
        "2 Sep 2026",
        "The New Indian Express reported that a BJP document said a hike of Rythu Bharosa from ₹10,000 to ₹15,000 per acre did not materialise. That is a rival-party claim. It does not state the rate that was paid.",
        nie,
      ),
    ],
  },
  {
    slug: "rythu-bharosa-labour",
    title: "Rythu Bharosa: ₹12,000 a year to farm labourers",
    quote: null,
    quotePage: null,
    quoteUrl: null,
    measure: "Rupees a year to farm labourers",
    target: "₹12,000 a year",
    deadline: null,
    responsibility: "state",
    achieved: null,
    achievedAsOf: null,
    achievedSources: [],
    context: null,
    gap: null,
    status: "unverified",
    history: [
      event(
        "unverified",
        checked,
        "No official account opened for this edition states the rupees paid to farm labourers.",
        null,
      ),
      event(
        "unverified",
        "2 Sep 2026",
        "The New Indian Express reported that a BJP document said ₹12,000 for landless agricultural workers had not been identified and paid. That is a rival-party claim, as reported. It is not recorded here as the outcome.",
        nie,
      ),
    ],
  },
  {
    slug: "rythu-bharosa-paddy",
    title: "Rythu Bharosa: ₹500 per quintal paddy bonus",
    quote: null,
    quotePage: null,
    quoteUrl: null,
    measure: "Bonus per quintal of paddy",
    target: "₹500 per quintal",
    deadline: null,
    responsibility: "state",
    achieved: null,
    achievedAsOf: null,
    achievedSources: [],
    context: null,
    gap: null,
    status: "unverified",
    history: [
      event(
        "unverified",
        checked,
        "No official account opened for this edition states the paddy bonus paid per quintal.",
        null,
      ),
      event(
        "unverified",
        "2 Sep 2026",
        "The New Indian Express reported that a BJP document said the ₹500 bonus was restricted to fine rice varieties. That is a rival-party claim, as reported. It is not recorded here as the bonus that was paid.",
        nie,
      ),
    ],
  },
  {
    slug: "crop-loan-waiver",
    title: "Crop-loan waiver up to ₹2 lakh",
    quote: null,
    quotePage: null,
    quoteUrl: null,
    measure: "Crop loan waived",
    target: "Waiver up to ₹2 lakh",
    deadline: null,
    responsibility: "state",
    achieved: null,
    achievedAsOf: null,
    achievedSources: [],
    context: null,
    gap: null,
    status: "unverified",
    history: [
      event(
        "unverified",
        checked,
        "No official account opened for this edition states how much crop loan was waived.",
        null,
      ),
      event(
        "unverified",
        "2 Sep 2026",
        "The New Indian Express reported that a BJP document said ₹18,000 cr was waived against an agricultural debt of ₹39,500 cr, and that the waiver excluded more than 22 lakh farming families. Those are the document’s figures. They are a rival-party claim, as reported, and they are not recorded here as the achieved figure.",
        nie,
      ),
    ],
  },
  {
    slug: "gruha-jyothi",
    title: "Gruha Jyothi: 200 units free power",
    quote: null,
    quotePage: null,
    quoteUrl: null,
    measure: "Free electricity units a month",
    target: "200 units",
    deadline: null,
    responsibility: "state",
    achieved:
      "Up to 200 units a month for eligible households. 53.09 lakh families are covered. Expenditure incurred is ₹3,901 cr. The outlook does not define eligible.",
    achievedAsOf: "2026",
    achievedSources: [outlook],
    context: null,
    gap: null,
    status: "partial",
    history: [
      event(
        "partial",
        checked,
        "The outlook says eligible households get free electricity up to 200 units a month, that 53.09 lakh families are covered, and that expenditure incurred is ₹3,901 cr. It does not define eligible. That is not recorded as delivered as promised.",
        outlook,
      ),
      event(
        "unverified",
        "2 Sep 2026",
        "The New Indian Express reported that a BJP document said many households were excluded from 200 units of free electricity. That is a rival-party claim, as reported.",
        nie,
      ),
    ],
  },
  {
    slug: "indiramma-indlu",
    title: "Indiramma Indlu: house site and ₹5 lakh",
    quote: null,
    quotePage: null,
    quoteUrl: null,
    measure: "Houses for houseless families",
    target: "A house site and ₹5 lakh",
    deadline: null,
    responsibility: "state",
    achieved:
      "3,24,536 houses have been sanctioned against a programme target of 4,50,000, and 2,62,449 are under construction. The subsidy is described as ₹5 lakh a house. The outlook does not say how many families have moved in.",
    achievedAsOf: "2026",
    achievedSources: [outlook],
    context: null,
    gap: "3,24,536 houses sanctioned against a target of 4,50,000.",
    status: "progress",
    history: [
      event(
        "progress",
        checked,
        "The outlook says 2,62,449 of the sanctioned houses are under construction, and that the programme target is 4,50,000. The work is underway and the target is not met. Occupancy is not stated.",
        outlook,
      ),
      event(
        "unverified",
        "2 Sep 2026",
        "The New Indian Express reported that a BJP document stated a different pair of housing figures: 34,985 houses constructed of a 7,73,581 target for 2024–25 and 2025–26. That is a rival-party claim. The achieved line uses the Socio-Economic Outlook, not those figures.",
        nie,
      ),
    ],
  },
  {
    slug: "yuva-vikasam-card",
    title: "Yuva Vikasam: ₹5 lakh Vidya Bharosa card",
    quote: null,
    quotePage: null,
    quoteUrl: null,
    measure: "Value of a Vidya Bharosa card",
    target: "₹5 lakh card",
    deadline: null,
    responsibility: "state",
    achieved: null,
    achievedAsOf: null,
    achievedSources: [],
    context:
      "PRS Legislative Research names Yuva Vikasam among the six guarantees in the 2026–27 budget discussion. The outlook passages and that analysis do not give a beneficiary count.",
    gap: null,
    status: "unverified",
    history: [
      event(
        "unverified",
        checked,
        "No beneficiary count for the ₹5 lakh card was in the outlook passages or the PRS analysis opened for this edition.",
        prs,
      ),
      event(
        "unverified",
        "2 Sep 2026",
        "The New Indian Express reported that a BJP document said a proposal for ₹5 lakh collateral-free cards for students had not started. That is a rival-party claim, as reported.",
        nie,
      ),
    ],
  },
  {
    slug: "yuva-vikasam-schools",
    title: "Yuva Vikasam: Telangana international schools",
    quote: null,
    quotePage: null,
    quoteUrl: null,
    measure: "Telangana international schools",
    target: "Telangana international schools",
    deadline: null,
    responsibility: "state",
    achieved: null,
    achievedAsOf: null,
    achievedSources: [],
    context: null,
    gap: null,
    status: "unverified",
    history: [
      event(
        "unverified",
        checked,
        "No document opened for this edition states how many Telangana international schools have been set up.",
        null,
      ),
    ],
  },
  {
    slug: "cheyutha-pension",
    title: "Cheyutha: ₹4,000 monthly pension",
    quote: null,
    quotePage: null,
    quoteUrl: null,
    measure: "Rupees a month in pension",
    target: "₹4,000 a month",
    deadline: null,
    responsibility: "state",
    achieved: null,
    achievedAsOf: null,
    achievedSources: [],
    context:
      "The Socio-Economic Outlook 2026 says ₹10,678.30 cr was paid to 42.23 lakh people from Apr 2025 to Feb 2026, and that ₹25,655.59 cr was paid over the two years to Feb 2026. Those are amounts paid, not the rupees per person per month. The current monthly amount is not compiled yet.",
    gap: null,
    status: "unverified",
    history: [
      event(
        "unverified",
        checked,
        "The outlook states the rupees paid and the number of people. It does not state the monthly amount. The 2026 amount stays not compiled yet.",
        outlook,
      ),
      event(
        "unverified",
        "23 Dec 2023",
        "A Warangal district page states ₹4,000 a month for the categories it lists. The page is dated 23 Dec 2023. It is not used as the amount paid in 2026.",
        warangal,
      ),
      event(
        "unverified",
        "2 Sep 2026",
        "The New Indian Express reported that a BJP document said the promise to raise Cheyutha pensions to ₹4,000 a month had not been carried out. That is a rival-party claim, as reported. It is not used as the current amount.",
        nie,
      ),
    ],
  },
  {
    slug: "cheyutha-aarogyasri",
    title: "Cheyutha: Aarogyasri cover of ₹10 lakh",
    quote: null,
    quotePage: null,
    quoteUrl: null,
    measure: "Aarogyasri cover",
    target: "₹10 lakh",
    deadline: null,
    responsibility: "state",
    achieved: null,
    achievedAsOf: null,
    achievedSources: [],
    context: null,
    gap: null,
    status: "unverified",
    history: [
      event(
        "unverified",
        checked,
        "No document opened for this edition states the Aarogyasri cover now in force.",
        null,
      ),
    ],
  },
  {
    slug: "government-jobs",
    title: "2 lakh government jobs",
    quote: null,
    quotePage: null,
    quoteUrl: null,
    measure: "Government jobs",
    target: "2 lakh government jobs",
    deadline: null,
    responsibility: "state",
    achieved: null,
    achievedAsOf: null,
    achievedSources: [],
    context: null,
    gap: null,
    status: "unverified",
    history: [
      event(
        "unverified",
        checked,
        "No official account opened for this edition states how many government jobs were filled.",
        null,
      ),
      event(
        "unverified",
        "2 Sep 2026",
        "The New Indian Express reported that a BJP document said a job calendar had not been implemented. That is a rival-party claim, as reported. It does not state a count of jobs filled.",
        nie,
      ),
    ],
  },
];

export const manifestos: Manifesto[] = [
  {
    slug: "congress-2023",
    title: "Congress 2023",
    party: "Congress",
    inGovernment: true,
    government: "state",
    listFrozen: true,
    freezeDate: "25 Oct 2026",
    swornInLabel: "7 Dec 2023",
    promises: congressPromises,
  },
  {
    slug: "brs-2014",
    title: "BRS 2014",
    party: "BRS",
    inGovernment: true,
    government: "state",
    listFrozen: false,
    freezeDate: null,
    swornInLabel: null,
    promises: [],
  },
  {
    slug: "brs-2018",
    title: "BRS 2018",
    party: "BRS",
    inGovernment: true,
    government: "state",
    listFrozen: false,
    freezeDate: null,
    swornInLabel: null,
    promises: [],
  },
  {
    slug: "bjp-union",
    title: "BJP promises for Telangana",
    party: "BJP",
    inGovernment: true,
    government: "union",
    listFrozen: false,
    freezeDate: null,
    swornInLabel: null,
    promises: [],
  },
  {
    slug: "brs-2023",
    title: "BRS 2023",
    party: "BRS",
    inGovernment: false,
    government: "state",
    listFrozen: false,
    freezeDate: null,
    swornInLabel: null,
    promises: [],
  },
  {
    slug: "bjp-2023",
    title: "BJP 2023",
    party: "BJP",
    inGovernment: false,
    government: "state",
    listFrozen: false,
    freezeDate: null,
    swornInLabel: null,
    promises: [],
  },
];

const leaderPromiseSlugs: Record<string, readonly string[]> = {
  "revanth-reddy": [
    "mahalakshmi-bus",
    "mahalakshmi-gas",
    "mahalakshmi-cash",
    "rythu-bharosa-acre",
    "cheyutha-pension",
  ],
  "bhatti-vikramarka-mallu": [
    "mahalakshmi-bus",
    "mahalakshmi-gas",
    "mahalakshmi-cash",
    "rythu-bharosa-acre",
    "rythu-bharosa-labour",
    "rythu-bharosa-paddy",
    "indiramma-indlu",
    "cheyutha-pension",
  ],
};

export function showsScorecard(manifesto: Manifesto) {
  return manifesto.inGovernment && manifesto.listFrozen && manifesto.promises.length > 0;
}

export function tallyOf(promises: ManifestoPromise[]) {
  const counts: Record<PromiseStatus, number> = {
    delivered: 0,
    partial: 0,
    progress: 0,
    notStarted: 0,
    dropped: 0,
    unverified: 0,
  };
  for (const promise of promises) counts[promise.status] += 1;
  return { counts, total: promises.length };
}

export function getManifesto(slug: string) {
  return manifestos.find((manifesto) => manifesto.slug === slug);
}

export function getPromise(manifestoSlug: string, promiseSlug: string) {
  const manifesto = getManifesto(manifestoSlug);
  const promise = manifesto?.promises.find((item) => item.slug === promiseSlug);
  if (!manifesto || !promise) return undefined;
  return { manifesto, promise };
}

export function promisesForLeader(leaderSlug: string) {
  const slugs = leaderPromiseSlugs[leaderSlug] ?? [];
  const congress = getManifesto("congress-2023");
  if (!congress) return [];
  return slugs
    .map((slug) => congress.promises.find((promise) => promise.slug === slug))
    .filter((promise): promise is ManifestoPromise => Boolean(promise));
}

export const compiledPromiseCount =
  manifestos.find((manifesto) => manifesto.slug === "congress-2023")?.promises.length ?? 0;
