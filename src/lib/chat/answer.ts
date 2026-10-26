export type Passage = {
  id: string;
  title: string;
  text: string;
  href: string;
  sourceTitle?: string;
  sourceUrl?: string;
};

export type CitedPassage = Passage;

export type RegisterAnswer =
  | { status: "missing"; passages: [] }
  | { status: "cited"; passages: CitedPassage[] };

export type ChatState = {
  status: "idle" | "empty" | "missing" | "cited";
  passages: CitedPassage[];
};

export const idleChatState: ChatState = { status: "idle", passages: [] };

const STOP = new Set([
  "a",
  "an",
  "the",
  "of",
  "for",
  "to",
  "in",
  "on",
  "and",
  "or",
  "is",
  "are",
  "was",
  "were",
  "what",
  "who",
  "whom",
  "whose",
  "how",
  "did",
  "does",
  "do",
  "with",
  "about",
  "please",
  "me",
  "my",
  "tell",
  "any",
  "there",
  "this",
  "that",
  "from",
  "by",
  "it",
  "its",
  "be",
  "been",
  "have",
  "has",
  "had",
  "into",
  "over",
  "under",
  "at",
  "as",
  "if",
  "than",
  "then",
  "their",
  "them",
  "they",
  "you",
  "your",
  "can",
  "could",
  "would",
  "should",
  "which",
  "when",
  "where",
  "why",
  "show",
  "say",
  "says",
  "said",
]);

const ADVICE =
  /\b(vote|voting|elect|should i|whom should|who should|best party|best candidate|rank|ranking|support|predict|winner)\b/i;

const AFFIDAVIT_TOTAL = /affidavit/i;
const TOTAL_WORD = /\b(total|totals|sum|summed|combined|aggregate|altogether)\b/i;
const MISSING_FIGURE = /not entered|left out|not compiled|were left/i;
const FIGURE = /(?:₹|\brs\b|\bcrore\b|\blakh\b|\d{2,})/i;

const missing = (): RegisterAnswer => ({ status: "missing", passages: [] });

function tokensOf(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP.has(token));
}

function quote(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  const limit = 460;
  if (clean.length <= limit) return clean;
  const slice = clean.slice(0, limit);
  const stop = slice.lastIndexOf(". ");
  const clipped = stop > 160 ? slice.slice(0, stop + 1) : slice.trimEnd();
  return `${clipped}…`;
}

function compiledAffidavitTotal(passages: Passage[]) {
  return passages.some((passage) => {
    const text = `${passage.title} ${passage.text}`;
    if (!AFFIDAVIT_TOTAL.test(text) || !TOTAL_WORD.test(text)) return false;
    if (MISSING_FIGURE.test(text)) return false;
    return FIGURE.test(text);
  });
}

function weight(token: string) {
  if (token.length >= 6) return 3;
  if (token.length >= 4) return 2;
  return 1;
}

export function answerQuestion(question: string, passages: Passage[]): RegisterAnswer {
  const asked = question.trim().slice(0, 400);
  if (asked.length < 2) return missing();
  if (ADVICE.test(asked)) return missing();
  if (AFFIDAVIT_TOTAL.test(asked) && TOTAL_WORD.test(asked) && !compiledAffidavitTotal(passages)) {
    return missing();
  }

  const tokens = tokensOf(asked);
  if (tokens.length === 0) return missing();

  const ranked = passages
    .map((passage) => {
      const title = `${passage.id} ${passage.title}`.toLowerCase();
      const body = passage.text.toLowerCase();
      let score = 0;
      let titleHits = 0;
      for (const token of tokens) {
        const inTitle = title.includes(token);
        const inBody = body.includes(token);
        if (!inTitle && !inBody) continue;
        score += inTitle ? weight(token) + 2 : weight(token);
        if (inTitle) titleHits += 1;
      }
      return { passage, score, titleHits };
    })
    .filter((hit) => hit.score >= 3)
    .sort((a, b) => b.score - a.score || a.passage.id.localeCompare(b.passage.id));

  const best = ranked[0]?.score ?? 0;
  if (best < 3) return missing();

  let chosen = ranked.filter((hit) => hit.score >= best - 2);
  if (chosen.length > 4) {
    const titled = chosen.filter((hit) => hit.titleHits > 0);
    chosen = titled.length > 0 && titled.length <= 4 ? titled : [];
  }
  if (chosen.length === 0) return missing();

  return {
    status: "cited",
    passages: chosen.slice(0, 3).map((hit) => ({
      ...hit.passage,
      text: quote(hit.passage.text),
    })),
  };
}
