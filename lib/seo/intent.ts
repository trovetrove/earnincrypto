// lib/seo/intent.ts
//
// What kind of page an article is, and what the searcher behind it wants.
//
// Page type used to come only from the blog `category` dropdown, and most
// crypto articles sit in `guide` or `airdrop` — so "5 Binance Alternatives",
// "Best Solana Wallets" and "Bybit vs OKX" were all treated as LEARN-stage
// guides, and the engine sent a reader who is one click from signing up back to
// beginner material. The title and slug say far more about intent than the
// dropdown does, so they are read first; an explicit page_type set in the
// admin (sidehustletools manage panel) still wins over everything.
//
// Ported from the sidehustletools engine with crypto phrasing: "is X safe?" is
// a legit check, and APY/APR and "how much is the airdrop worth" pages are the
// crypto equivalent of a payout page.

import {
  defaultsForCategory,
  VALID_PAGE_TYPES,
  type IntentStage,
  type PageType,
} from "./clusters";

export type SearchIntent =
  | "informational"
  | "commercial"
  | "comparison"
  | "alternatives"
  | "entity";

type InferInput = {
  slug: string;
  title: string;
  category?: string;
  targetKeyword?: string;
};

const has = (re: RegExp, ...fields: string[]) => fields.some((f) => re.test(f));

/**
 * Best guess from the words on the page. Returns null when nothing is
 * conclusive, so the caller can fall back to the category default.
 */
export function inferPageType(input: InferInput): PageType | null {
  const slug = input.slug.toLowerCase();
  const title = input.title.toLowerCase();
  const kw = (input.targetKeyword ?? "").toLowerCase();

  if (has(/(^|-)vs(-|$)/, slug) || has(/\bvs\.?\b|\bversus\b/, title, kw)) return "BLOG_COMPARISON";
  if (has(/alternative/, slug, title, kw)) return "BLOG_ALTERNATIVES";
  if (
    // "Scam" alone is usually a security guide ("drainer scams to avoid"); it
    // only signals a verdict page in the "is X a scam" / "scam or legit" forms.
    has(/\blegit\b|\breview\b|^is .+ (safe|a scam)\b|\bscam or legit\b|\bsafe to use\b/, title, kw) ||
    has(/(^|-)(legit|review)(-|$)|^is-.+-(safe|a-scam)(-|$)/, slug)
  ) {
    return "BLOG_LEGIT_CHECK";
  }
  if (has(/^(the\s+)?(\d+\s+)?(best|top)\b/, title) || has(/^(best|top)-/, slug) || has(/^(best|top)\b/, kw)) {
    return "BLOG_ROUNDUP";
  }
  if (
    has(
      /\bhow much\b|\bpayouts?\b|\bearnings?\b|\bpay rates?\b|\bdoes .+ pay\b|\bapy\b|\bapr\b|\bairdrop (value|worth)\b/,
      title,
      kw
    )
  ) {
    return "BLOG_PAYOUT";
  }
  if (has(/^how to\b|^what is\b|^what are\b|\bguide\b|\bbeginner|\bexplained\b/, title, kw)) return "BLOG_GUIDE";
  return null;
}

/**
 * Funnel stage implied by the page type. A payout or review page about one
 * project is read by someone about to act; a general "how much can you earn
 * staking" piece is still research.
 */
export function stageForPageType(pageType: PageType, hasSubjectEntity: boolean): IntentStage {
  switch (pageType) {
    case "PILLAR":
    case "BLOG_ROUNDUP":
    case "BLOG_ALTERNATIVES":
      return "COMPARE";
    case "BLOG_COMPARISON":
      return "DECIDE";
    case "BLOG_LEGIT_CHECK":
      return "ACT";
    case "BLOG_PAYOUT":
      return hasSubjectEntity ? "ACT" : "LEARN";
    default:
      return "LEARN";
  }
}

export function searchIntentFor(pageType: PageType, hasSubjectEntity: boolean): SearchIntent {
  switch (pageType) {
    case "PILLAR":
    case "BLOG_ROUNDUP":
      return "commercial";
    case "BLOG_COMPARISON":
      return "comparison";
    case "BLOG_ALTERNATIVES":
      return "alternatives";
    case "BLOG_LEGIT_CHECK":
      return "entity";
    case "BLOG_PAYOUT":
      return hasSubjectEntity ? "entity" : "informational";
    default:
      return "informational";
  }
}

export type ResolvedIntent = {
  pageType: PageType;
  stage: IntentStage;
  searchIntent: SearchIntent;
  /** "explicit" = set by an editor; "inferred" = read from title/slug; "default" = category fallback. */
  source: "explicit" | "inferred" | "default";
};

const VALID_STAGES = new Set<string>(["DISCOVER", "LEARN", "COMPARE", "DECIDE", "ACT"]);

export function resolveIntent(
  row: InferInput & { pageType?: string | null; intentStage?: string | null },
  hasSubjectEntity: boolean
): ResolvedIntent {
  const explicitType =
    row.pageType && VALID_PAGE_TYPES.has(row.pageType) ? (row.pageType as PageType) : null;
  const inferred = explicitType ? null : inferPageType(row);
  const categoryDefault = defaultsForCategory(row.category ?? "");
  const pageType = explicitType ?? inferred ?? categoryDefault.pageType;

  const explicitStage =
    row.intentStage && VALID_STAGES.has(row.intentStage) ? (row.intentStage as IntentStage) : null;
  // The category default is only trusted when nothing more specific is known:
  // "news" → DISCOVER and "airdrop" → ACT are meaningful, "guide" → LEARN is
  // just the dropdown default.
  const stage =
    explicitStage ??
    (explicitType || inferred ? stageForPageType(pageType, hasSubjectEntity) : categoryDefault.stage);

  return {
    pageType,
    stage,
    searchIntent: searchIntentFor(pageType, hasSubjectEntity),
    source: explicitType ? "explicit" : inferred ? "inferred" : "default",
  };
}

// ── Keyword similarity (near-duplicates, pillar breadth) ─────────────

/**
 * Phrases that mean the same thing to a searcher. "earn free crypto" and
 * "get paid in crypto" are one query in two phrasings; without folding them
 * together, token overlap misses it.
 */
const PHRASE_SYNONYMS: [RegExp, string][] = [
  [/\bmake money\b|\bearn money\b|\bget paid\b|\bpays? you\b|\bthat pay\b|\bfree crypto\b|\bpassive income\b/g, " earn "],
  [/\bcentrali[sz]ed exchanges?\b|\bcrypto exchanges?\b|\btrading platforms?\b|\bcex(es)?\b/g, " exchange "],
  [/\bdecentrali[sz]ed exchanges?\b|\bdex(es)?\b/g, " dex "],
  [/\bcold wallets?\b|\bhardware wallets?\b/g, " hardware wallet "],
  [/\bhot wallets?\b|\bsoftware wallets?\b|\bweb3 wallets?\b|\bcrypto wallets?\b/g, " wallet "],
  [/\bliquid staking\b|\bstaking rewards?\b/g, " stake "],
  [/\byield farming\b|\bliquidity mining\b/g, " farm "],
  [/\bsign ?up bonus(es)?\b|\breferral bonus(es)?\b|\bwelcome bonus(es)?\b/g, " bonus "],
  [/\blearn (and|&) earn\b|\blearn to earn\b/g, " learnearn "],
  [/\btoken sales?\b|\bidos?\b|\bicos?\b|\bieos?\b/g, " launch "],
];

const TOKEN_SYNONYMS: Record<string, string> = {
  exchanges: "exchange", wallets: "wallet", airdrops: "airdrop", tokens: "token", coins: "coin",
  staking: "stake", staked: "stake", stakes: "stake",
  yields: "yield", apy: "yield", apr: "yield", interest: "yield",
  rewards: "reward", bonuses: "bonus",
  bitcoin: "btc", ethereum: "eth", solana: "sol",
  farming: "farm", testnets: "testnet", quests: "quest",
  launchpads: "launchpad",
  apps: "app", platforms: "platform", sites: "platform", site: "platform",
  earning: "earn", earnings: "earn", pay: "earn", paying: "earn", money: "earn", income: "earn",
  alternatives: "alternative",
  referrals: "referral",
};

const STOP = new Set([
  "a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "at", "by", "with", "from",
  "that", "you", "your", "how", "what", "which", "is", "are", "can", "do", "does", "it",
  "best", "top", "ranked", "real", "really", "actually", "legit", "ways", "way", "list",
  "guide", "new", "free", "online", "instantly", "fast", "easy",
  // Every page on this site is about crypto; the word distinguishes nothing.
  "crypto", "cryptocurrency", "cryptocurrencies", "web3",
]);

export function keywordTokens(keyword: string): Set<string> {
  let s = ` ${keyword.toLowerCase()} `
    .replace(/\b20\d\d\b/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ");
  for (const [re, rep] of PHRASE_SYNONYMS) s = s.replace(re, rep);
  const out = new Set<string>();
  for (const raw of s.split(/\s+/)) {
    if (!raw || STOP.has(raw) || /^\d+$/.test(raw)) continue;
    let t = TOKEN_SYNONYMS[raw] ?? raw;
    if (t.length > 4 && t.endsWith("s") && !t.endsWith("ss")) t = t.slice(0, -1);
    out.add(TOKEN_SYNONYMS[t] ?? t);
  }
  return out;
}

export function keywordSimilarity(a: string, b: string): number {
  const ta = keywordTokens(a);
  const tb = keywordTokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

/** Intents that answer the same query closely enough to compete for it. */
export function intentsCompete(a: SearchIntent, b: SearchIntent): boolean {
  if (a === b) return true;
  const commercialFamily = new Set<SearchIntent>(["commercial", "alternatives"]);
  if (commercialFamily.has(a) && commercialFamily.has(b)) return true;
  // "How to earn yield on stablecoins" vs "best stablecoin yields": a
  // list-style guide and a roundup satisfy the same searcher.
  const listy = new Set<SearchIntent>(["informational", "commercial"]);
  return listy.has(a) && listy.has(b);
}
