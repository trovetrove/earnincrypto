// lib/seo/linkGraph.ts
//
// The internal-linking engine.
//
// The old scorer asked "which pages look similar?". This one asks the question
// that actually moves revenue: "which page reinforces this topic, answers the
// reader's next question, and sends authority somewhere it's needed?"
//
// Everything here is a pure function over plain objects. The Supabase reads
// live in lib/seo/graphData.ts and the per-site wiring in lib/blog/
// recommendations.ts, so this file can be reasoned about — and unit-tested —
// without a database.
//
// The scoring formula is the one from the growth plan, normalised so every
// component lands in 0-100 before weighting:
//
//     topical_relevance * 35
//   + intent_match      * 20
//   + monetization      * 15
//   + authority_need    * 10
//   + entity_overlap    * 10
//   + next_step         * 5
//   + freshness         * 5
//
// One rule overrides all of it: a candidate below the relevance floor is
// dropped, however much it pays. Monetisation reorders relevant candidates; it
// never buys its way into an unrelated article.

import {
  clusterAffinity,
  stageDistance,
  type ClusterSet,
  type IntentStage,
  type PageType,
} from "./clusters";
import { intentsCompete, keywordSimilarity, type SearchIntent } from "./intent";

// ── Shapes the engine works on ───────────────────────────────────────

export type GraphEntry = {
  id: string;
  slug: string;
  title: string;
  category: string;
  /** Already resolved — explicit label or inferred. */
  cluster: string;
  tags: string[];
  /** Alternate names a writer might use in prose ("Pawns.app", "Pawns"). */
  aliases: string[];
  shortDescription: string;
  /** 0-100, resolved from the row or the cluster default. */
  revenuePriority: number;
  hasReferral: boolean;
  updatedAt: string;
  /** Contextual internal links already pointing here. Drives authority need. */
  inboundLinks: number;
  /** EarnInCrypto only — a listing's chain. Undefined on SideHustleTools. */
  chain?: string;
  /** 0-5 editorial rating. */
  rating?: number;
  /** Editor-entered alternatives — slugs or display names. */
  alternatives?: string[];
  /** Slugs this listing has a declared head-to-head comparison with. */
  comparisonSlugs?: string[];
  isFeatured?: boolean;
};

export type GraphPost = {
  id: string;
  slug: string;
  title: string;
  category: string;
  cluster: string;
  tags: string[];
  targetKeyword: string;
  secondaryKeywords: string[];
  intentStage: IntentStage;
  pageType: PageType;
  /** Plain text, lowercased — used for entity detection. */
  text: string;
  /** The one destination the author wants this article to funnel into. */
  primaryEntrySlug?: string;
  publishedAt?: string;
  updatedAt: string;
  /** EarnInCrypto only — the chain this article targets. */
  chain?: string;
  // ── Filled in by lib/seo/contentGraph.ts ──
  /** Listings the article is *about* — named in its title or slug. */
  subjectEntitySlugs?: string[];
  /** Listings named anywhere in the article. */
  mentionedEntitySlugs?: string[];
  searchIntent?: SearchIntent;
  /** Authored contextual links pointing at this article. */
  inboundLinks?: number;
  wordCount?: number;
  isPillar?: boolean;
};

export type ScoreBreakdown = {
  topicalRelevance: number;
  intentMatch: number;
  monetization: number;
  authorityNeed: number;
  entityOverlap: number;
  nextStep: number;
  freshness: number;
  total: number;
};

export type ScoredEntry = { entry: GraphEntry; score: ScoreBreakdown };

const WEIGHTS = {
  topicalRelevance: 0.35,
  intentMatch: 0.2,
  monetization: 0.15,
  authorityNeed: 0.1,
  entityOverlap: 0.1,
  nextStep: 0.05,
  freshness: 0.05,
} as const;

/**
 * A candidate must clear this to appear in a tightly-relevant block. Set at 45
 * so same-cluster (100) and adjacent-cluster-with-shared-tags candidates pass,
 * while an unrelated listing cannot.
 */
export const RELEVANCE_FLOOR = 45;

/**
 * The floor for the looser discovery block further down the article. Adjacency
 * alone (55 affinity → ~30 relevance) clears it; an unrelated cluster does not.
 * This is what keeps "Explore More" from becoming a random directory dump.
 */
export const DISCOVERY_FLOOR = 20;

const FRESHNESS_HORIZON_DAYS = 180;

// ── Derived values, computed once per object ─────────────────────────
//
// The scorers below are called O(n²) times per graph build — every listing
// against every other, every article against every listing — and each one used
// to re-derive the same strings and sets from the same rows on every call:
// lowercasing a title, splitting a chain field, building a tag set. The totals
// are unchanged; the work is just hoisted into a WeakMap keyed on the object it
// belongs to, which the graph holds for as long as it is cached.

const tagSetCache = new WeakMap<string[], Set<string>>();

/** Lowercased, trimmed, de-duplicated — the shape jaccard() compares. */
function tagSet(list: string[]): Set<string> {
  let hit = tagSetCache.get(list);
  if (!hit) {
    hit = new Set(list.map((x) => x.toLowerCase().trim()).filter(Boolean));
    tagSetCache.set(list, hit);
  }
  return hit;
}

const chainSetCache = new Map<string, Set<string>>();
/** Chain fields repeat across the whole directory, so this is keyed by value. */
const CHAIN_CACHE_MAX = 512;

const postKeywordCache = new WeakMap<GraphPost, string[]>();

/** An article's target plus secondary keywords, lowercased, blanks dropped. */
function postKeywords(post: GraphPost): string[] {
  let hit = postKeywordCache.get(post);
  if (!hit) {
    hit = [post.targetKeyword, ...post.secondaryKeywords]
      .map((k) => k.toLowerCase().trim())
      .filter(Boolean);
    postKeywordCache.set(post, hit);
  }
  return hit;
}

const entryNameCache = new WeakMap<GraphEntry, string[]>();

/** A listing's title and aliases, lowercased; names under 3 chars dropped. */
function entryNames(entry: GraphEntry): string[] {
  let hit = entryNameCache.get(entry);
  if (!hit) {
    hit = [entry.title, ...entry.aliases]
      .map((n) => n.toLowerCase().trim())
      .filter((n) => n.length >= 3);
    entryNameCache.set(entry, hit);
  }
  return hit;
}

const entryTextCache = new WeakMap<GraphEntry, string>();

/** Everything about a listing a keyword could match, as one lowercased string. */
function entryText(entry: GraphEntry): string {
  let hit = entryTextCache.get(entry);
  if (hit === undefined) {
    hit = `${entry.title} ${entry.shortDescription} ${entry.tags.join(" ")}`.toLowerCase();
    entryTextCache.set(entry, hit);
  }
  return hit;
}

// ── Sub-scores ───────────────────────────────────────────────────────

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = tagSet(a);
  const sb = tagSet(b);
  if (!sa.size || !sb.size) return 0;
  // Walk the smaller set: the result is symmetric, the cost isn't.
  const [small, large] = sa.size <= sb.size ? [sa, sb] : [sb, sa];
  let inter = 0;
  for (const v of small) if (large.has(v)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/**
 * How strongly the destination belongs to this article's topic.
 *
 * Cluster affinity dominates deliberately. Tag overlap is a useful signal but a
 * noisy one — two pages can share "PayPal" and have nothing to do with each
 * other — so it can lift a candidate within its cluster band but never carry an
 * unrelated one over the floor on its own.
 */
export function topicalRelevance(
  post: GraphPost,
  entry: GraphEntry,
  set: ClusterSet
): number {
  const affinity = clusterAffinity(post.cluster, entry.cluster, set);
  const categoryMatch = post.category === entry.category ? 100 : 0;
  const tagOverlap = jaccard(post.tags, entry.tags) * 100;

  const haystack = entryText(entry);
  const keywordHit = postKeywords(post).some((k) => haystack.includes(k)) ? 100 : 0;

  const base =
    affinity * 0.55 + categoryMatch * 0.15 + tagOverlap * 0.2 + keywordHit * 0.1;

  // Chain is a strong same-topic signal on EarnInCrypto — a Solana article and a
  // Solana listing are related in a way the cluster alone doesn't capture.
  // Added as a capped bonus rather than folded into the weights so the
  // chain-less site's scores, and therefore the floors, are unchanged.
  return Math.min(100, base + (chainsMatch(post.chain, entry.chain) ? CHAIN_BONUS : 0));
}

// ── Chain ────────────────────────────────────────────────────────────

/** Relevance bonus for a shared chain. Enough to reorder, never enough to qualify alone. */
export const CHAIN_BONUS = 12;

/** Values that say "not tied to one chain", so they never count as a match. */
const CHAINLESS = new Set([
  "multi-chain", "multichain", "multi chain", "cross-chain", "crosschain", "cross chain",
  "various", "n/a", "na", "none", "all", "any", "evm chains", "multiple",
]);

const CHAIN_ALIASES: Record<string, string> = {
  eth: "ethereum", "ethereum mainnet": "ethereum", mainnet: "ethereum",
  sol: "solana", btc: "bitcoin", bnb: "bnb chain", bsc: "bnb chain", "bnb smart chain": "bnb chain",
  "binance smart chain": "bnb chain", matic: "polygon", "polygon pos": "polygon",
  arb: "arbitrum", "arbitrum one": "arbitrum", op: "optimism", avax: "avalanche",
  "avalanche c-chain": "avalanche", zksync: "zksync era", "zksync era": "zksync era",
};

/** "Ethereum, Arbitrum / Base" → {"ethereum", "arbitrum", "base"}. */
export function chainSet(chain?: string | null): Set<string> {
  if (!chain) return new Set<string>();

  const cached = chainSetCache.get(chain);
  if (cached) return cached;

  const out = new Set<string>();
  for (const raw of chain.toLowerCase().split(/[,/|+&;]|\band\b/)) {
    const c = raw.replace(/\s+/g, " ").trim();
    if (!c || CHAINLESS.has(c)) continue;
    out.add(CHAIN_ALIASES[c] ?? c);
  }

  // Bounded, because the key is a row value and a bad import could hold a lot
  // of distinct ones. Oldest first — insertion order on a Map.
  if (chainSetCache.size >= CHAIN_CACHE_MAX) {
    const oldest = chainSetCache.keys().next().value;
    if (oldest !== undefined) chainSetCache.delete(oldest);
  }
  chainSetCache.set(chain, out);
  return out;
}

/** True when two chain fields name at least one chain in common. */
export function chainsMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const sa = chainSet(a);
  if (!sa.size) return false;
  for (const c of chainSet(b)) if (sa.has(c)) return true;
  return false;
}

/**
 * How ready this reader is to land on a directory page.
 *
 * A reader three paragraphs into "how to make money online" is not ready to be
 * pushed at a signup form; a reader on "Freecash vs Mistplay" is. Same link,
 * very different value.
 */
export function intentMatchForEntry(stage: IntentStage): number {
  switch (stage) {
    case "DISCOVER":
      return 40;
    case "LEARN":
      return 60;
    case "COMPARE":
      return 85;
    case "DECIDE":
      return 95;
    case "ACT":
      return 100;
  }
}

/** Referral-carrying listings edge ahead of otherwise equal ones. */
export function monetizationScore(entry: GraphEntry): number {
  return Math.min(100, entry.revenuePriority + (entry.hasReferral ? 10 : 0));
}

/**
 * Deliberately steers links toward pages that need them.
 *
 * The plan's target is 5-15 contextual inbound links on an important money
 * page, so the curve is steep below 5 and flat above it — once a page is
 * well-linked, this component stops arguing for more.
 */
export function authorityNeed(inboundLinks: number): number {
  if (inboundLinks <= 0) return 100;
  if (inboundLinks === 1) return 78;
  if (inboundLinks === 2) return 58;
  if (inboundLinks === 3) return 42;
  if (inboundLinks === 4) return 30;
  return Math.max(0, 22 - (inboundLinks - 5) * 4);
}

const postTitleCache = new WeakMap<GraphPost, { title: string; keywords: string }>();

function postMatchText(post: GraphPost): { title: string; keywords: string } {
  let hit = postTitleCache.get(post);
  if (!hit) {
    hit = {
      title: post.title.toLowerCase(),
      keywords: [post.targetKeyword, ...post.secondaryKeywords].join(" ").toLowerCase(),
    };
    postTitleCache.set(post, hit);
  }
  return hit;
}

/** Does the article actually talk about this platform? */
export function entityOverlap(post: GraphPost, entry: GraphEntry): number {
  const names = entryNames(entry);
  if (!names.length) return 0;

  const { title, keywords } = postMatchText(post);

  if (names.some((n) => title.includes(n))) return 100;
  if (names.some((n) => keywords.includes(n))) return 85;
  // post.text is the whole article, so this is the expensive test — last, and
  // only reached when the cheap ones missed.
  if (names.some((n) => post.text.includes(n))) return 70;
  return 0;
}

export function nextStepScore(post: GraphPost, entry: GraphEntry): number {
  return post.primaryEntrySlug && post.primaryEntrySlug === entry.slug ? 100 : 0;
}

export function freshness(updatedAt: string): number {
  const ts = new Date(updatedAt).getTime();
  if (!Number.isFinite(ts)) return 0;
  const days = (Date.now() - ts) / 86_400_000;
  if (days <= 0) return 100;
  return Math.max(0, 100 * (1 - days / FRESHNESS_HORIZON_DAYS));
}

// ── Composite ────────────────────────────────────────────────────────

export function scoreEntry(
  post: GraphPost,
  entry: GraphEntry,
  set: ClusterSet
): ScoreBreakdown {
  const parts = {
    topicalRelevance: topicalRelevance(post, entry, set),
    intentMatch: intentMatchForEntry(post.intentStage),
    monetization: monetizationScore(entry),
    authorityNeed: authorityNeed(entry.inboundLinks),
    entityOverlap: entityOverlap(post, entry),
    nextStep: nextStepScore(post, entry),
    freshness: freshness(entry.updatedAt),
  };

  const total =
    parts.topicalRelevance * WEIGHTS.topicalRelevance +
    parts.intentMatch * WEIGHTS.intentMatch +
    parts.monetization * WEIGHTS.monetization +
    parts.authorityNeed * WEIGHTS.authorityNeed +
    parts.entityOverlap * WEIGHTS.entityOverlap +
    parts.nextStep * WEIGHTS.nextStep +
    parts.freshness * WEIGHTS.freshness;

  return { ...parts, total };
}

export function rankEntries(
  post: GraphPost,
  pool: GraphEntry[],
  set: ClusterSet
): ScoredEntry[] {
  return pool
    .map((entry) => ({ entry, score: scoreEntry(post, entry, set) }))
    .sort((a, b) => b.score.total - a.score.total);
}

// ── Selection ────────────────────────────────────────────────────────

export type SelectMode =
  /** Default: concentrate on the article's own cluster. */
  | "focused"
  /**
   * Distribution mode for broad top-of-funnel articles. Caps how many picks any
   * one cluster may take, so "Easy Ways to Make Extra Money" hands the reader a
   * survey site, a gaming app, a testing platform and a passive-income app
   * rather than five near-identical listings.
   */
  | "spread";

export type SelectOptions = {
  limit: number;
  /** Minimum topical relevance a candidate must clear. */
  floor: number;
  /**
   * Fraction of slots reserved for adjacent clusters, so a cluster's articles
   * don't only ever point at their own eight listings. Adjacent — never
   * unrelated: these slots still sit above the floor.
   */
  crossClusterRatio?: number;
  /** Already-used entry ids (other blocks on the same page). */
  exclude?: Set<string>;
  mode?: SelectMode;
  /** Only meaningful in spread mode. Defaults to 1. */
  maxPerCluster?: number;
};

/**
 * Broad articles are the site's biggest traffic sources and its worst
 * converters, because a reader who landed on "how to make money online" has no
 * specific intent yet. Spreading their links across clusters is what turns them
 * into feeders for the whole directory instead of dead ends.
 */
export function shouldSpread(post: GraphPost, fallbackCluster: string): boolean {
  return post.intentStage === "DISCOVER" || post.cluster === fallbackCluster;
}

/** Stable 32-bit hash — same input, same output, for the life of the site. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Candidates within this many points of each other are treated as equally good.
 *
 * Broad articles share almost all their signals, so without a tiebreak every
 * one of them picks the same handful of listings — nine links land on three
 * pages in a single build and the rest of the directory stays orphaned. Within
 * a tie band the choice is rotated by a hash of the article's slug: different
 * articles spread across different destinations, but any given article makes
 * the same choice on every build, so the links don't wander.
 */
const TIE_BAND = 6;

function rotateWithinTies(
  candidates: ScoredEntry[],
  seed: number
): ScoredEntry[] {
  if (candidates.length < 2) return candidates;

  const out: ScoredEntry[] = [];
  let i = 0;
  while (i < candidates.length) {
    let j = i + 1;
    while (
      j < candidates.length &&
      candidates[i].score.total - candidates[j].score.total <= TIE_BAND
    ) {
      j++;
    }
    const band = candidates.slice(i, j);
    const offset = seed % band.length;
    out.push(...band.slice(offset), ...band.slice(0, offset));
    i = j;
  }
  return out;
}

function selectSpread(
  ranked: ScoredEntry[],
  opts: SelectOptions,
  exclude: Set<string>,
  seed: number
): ScoredEntry[] {
  const maxPerCluster = opts.maxPerCluster ?? 1;
  const perCluster = new Map<string, number>();
  const picked: ScoredEntry[] = [];

  const ordered = rotateWithinTies(
    ranked.filter((r) => !exclude.has(r.entry.id) && r.score.topicalRelevance >= opts.floor),
    seed
  );

  // Ranked order already encodes relevance and money-page value, so walking it
  // once and skipping over-represented clusters keeps the best candidate from
  // each cluster rather than the best overall.
  for (const r of ordered) {
    if (picked.length >= opts.limit) break;
    const used = perCluster.get(r.entry.cluster) ?? 0;
    if (used >= maxPerCluster) continue;
    perCluster.set(r.entry.cluster, used + 1);
    picked.push(r);
  }

  // If the cap left slots empty (a small directory, or a narrow floor), fill
  // them rather than rendering a half-empty block.
  if (picked.length < opts.limit) {
    const seen = new Set(picked.map((p) => p.entry.id));
    for (const r of ordered) {
      if (picked.length >= opts.limit) break;
      if (seen.has(r.entry.id)) continue;
      seen.add(r.entry.id);
      picked.push(r);
    }
  }

  return picked;
}

/**
 * Picks the final set for one block.
 *
 * Note there is no random shuffle. The previous engine rotated picks on a daily
 * seed to spread exposure, but that actively fought the thing internal links
 * are for: a link that moves every day teaches Google nothing about which page
 * matters. Exposure is spread by the authority-need component instead, which is
 * stable — an under-linked page keeps winning slots until it isn't under-linked
 * any more, then yields them.
 */
export function selectEntries(
  post: GraphPost,
  ranked: ScoredEntry[],
  set: ClusterSet,
  opts: SelectOptions
): ScoredEntry[] {
  const exclude = opts.exclude ?? new Set<string>();

  const seed = hashString(post.slug);
  if (opts.mode === "spread") return selectSpread(ranked, opts, exclude, seed);

  const eligible = ranked.filter(
    (r) => !exclude.has(r.entry.id) && r.score.topicalRelevance >= opts.floor
  );
  if (!eligible.length) return [];

  const crossRatio = opts.crossClusterRatio ?? 0;
  const crossTarget = Math.min(
    Math.round(opts.limit * crossRatio),
    Math.max(0, opts.limit - 1) // never let cross-links crowd out the core
  );

  const rotated = rotateWithinTies(eligible, seed);
  const sameCluster = rotated.filter((r) => r.entry.cluster === post.cluster);
  const otherCluster = rotated.filter((r) => r.entry.cluster !== post.cluster);

  const picked: ScoredEntry[] = [];
  const seen = new Set<string>();
  const push = (r: ScoredEntry) => {
    if (seen.has(r.entry.id) || picked.length >= opts.limit) return;
    seen.add(r.entry.id);
    picked.push(r);
  };

  const coreTarget = opts.limit - crossTarget;
  for (const r of sameCluster) {
    if (picked.length >= coreTarget) break;
    push(r);
  }
  for (const r of otherCluster) {
    if (picked.length >= opts.limit) break;
    push(r);
  }
  // Backfill from whatever is left if one side ran dry.
  for (const r of rotated) push(r);

  return picked;
}

// ── Article → article ────────────────────────────────────────────────

/**
 * Related-article scoring is a different job from directory scoring: the point
 * is to walk the reader one step further down the funnel, not to monetise.
 *
 * A DISCOVER article should hand off to LEARN and COMPARE pages. An ACT article
 * should offer a sideways comparison, not drag the reader back to a beginner
 * guide. `stageDistance` of exactly +1 is the sweet spot.
 */
export function scoreRelatedPost(
  post: GraphPost,
  candidate: GraphPost,
  set: ClusterSet
): number {
  if (candidate.id === post.id) return -1;

  // Relevance gates everything else, exactly as it does for directory links:
  // funnel progression and authority need reorder related articles, they must
  // never carry an unrelated one ("Best Hardware Wallets" → "Bybit vs OKX")
  // into the block on their own.
  const relevance = relatedRelevance(post, candidate, set);
  if (relevance < RELATED_RELEVANCE_GATE) return -1;

  const delta = stageDistance(post.intentStage, candidate.intentStage);
  let progression: number;
  if (delta === 1) progression = 100;
  else if (delta === 2) progression = 75;
  else if (delta === 0) progression = 45;
  else if (delta > 2) progression = 40;
  else progression = 15; // sending a ready-to-act reader backwards

  const recency = freshness(candidate.updatedAt);
  // Newly published and under-linked articles edge ahead of equally relevant
  // established ones — this is what folds a new post into the graph.
  const need = authorityNeed(candidate.inboundLinks ?? 0);

  let score = relevance * 0.5 + progression * 0.3 + recency * 0.08 + need * 0.12;

  // Two articles chasing the same query with the same intent: the reader of
  // one gains little from the other, so it shouldn't take a related slot from
  // something that moves them forward.
  if (isNearDuplicate(post, candidate)) score -= 15;

  return score;
}

/**
 * Topical relevance between two articles. Shared projects are the strongest
 * "these belong together" signal the data has: "Binance Alternatives" and
 * "Best Crypto Exchanges" both discuss Binance, whatever their tags say.
 * Generic tags ("crypto", "earn crypto") sit on almost every post, so tags
 * alone can never clear the gate. A shared chain adds a capped bonus: a Solana
 * staking guide and a Solana wallet roundup are closer than their clusters say.
 */
export function relatedRelevance(post: GraphPost, candidate: GraphPost, set: ClusterSet): number {
  let affinity = clusterAffinity(post.cluster, candidate.cluster, set);
  const tagOverlap = jaccard(post.tags, candidate.tags) * 100;
  const categoryMatch = post.category === candidate.category ? 100 : 0;
  const entities = entityAffinity(post, candidate);
  const sameChain = chainsMatch(post.chain, candidate.chain);
  // Crypto clusters are densely connected (wallets neighbour airdrops,
  // exchanges and security), so adjacency by itself linked "Best Solana
  // Wallets" to "Alchemy vs Infura". A neighbouring cluster counts in full
  // only with something concrete in common — a project, a chain or a tag.
  if (affinity > 0 && affinity < 100 && !entities && !tagOverlap && !sameChain) affinity /= 2;
  const base = affinity * 0.5 + entities * 0.3 + tagOverlap * 0.15 + categoryMatch * 0.05;
  return Math.min(100, base + (sameChain ? CHAIN_BONUS : 0));
}

/**
 * Same cluster (50), a corroborated adjacent cluster (27.5+) or a shared
 * project (25.5+) clears it; shared tags alone don't.
 */
export const RELATED_RELEVANCE_GATE = 25;

/** 100 when one article is about a project the other discusses; partial for shared mentions. */
export function entityAffinity(a: GraphPost, b: GraphPost): number {
  const aSubjects = a.subjectEntitySlugs ?? [];
  const bSubjects = b.subjectEntitySlugs ?? [];
  const aMentions = new Set(a.mentionedEntitySlugs ?? []);
  const bMentions = new Set(b.mentionedEntitySlugs ?? []);

  if (aSubjects.some((s) => bSubjects.includes(s))) return 100;
  if (bSubjects.some((s) => aMentions.has(s)) || aSubjects.some((s) => bMentions.has(s))) return 85;
  if (!aMentions.size || !bMentions.size) return 0;
  return jaccard([...aMentions], [...bMentions]) * 100;
}

export function isNearDuplicate(a: GraphPost, b: GraphPost): boolean {
  if (!a.targetKeyword || !b.targetKeyword) return false;
  if (a.searchIntent && b.searchIntent && !intentsCompete(a.searchIntent, b.searchIntent)) return false;
  return keywordSimilarity(a.targetKeyword, b.targetKeyword) >= 0.6;
}

export function rankRelatedPosts(
  post: GraphPost,
  pool: GraphPost[],
  set: ClusterSet
): { post: GraphPost; score: number }[] {
  return pool
    .map((candidate) => ({ post: candidate, score: scoreRelatedPost(post, candidate, set) }))
    // Same floor logic as entries: a related-article slot is worthless if the
    // article isn't actually related.
    .filter((r) => r.score >= RELATED_POST_FLOOR)
    .sort((a, b) => b.score - a.score || a.post.slug.localeCompare(b.post.slug));
}

export const RELATED_POST_FLOOR = 30;

// ── Listing → listing ────────────────────────────────────────────────

/**
 * How interchangeable two listings are for a reader — the "alternatives to X"
 * question. Cluster decides whether they compete at all; category decides
 * whether they are the same *kind* of thing (an exchange next to other
 * exchanges, not next to an RPC provider that happens to share a cluster).
 * A shared chain nudges same-ecosystem options up.
 */
export function entryPairRelevance(a: GraphEntry, b: GraphEntry, set: ClusterSet): number {
  if (a.id === b.id) return -1;
  const affinity = clusterAffinity(a.cluster, b.cluster, set);
  const sameCategory = a.category === b.category ? 100 : 0;
  const tags = jaccard(a.tags, b.tags) * 100;
  let relevance = affinity * 0.55 + sameCategory * 0.25 + tags * 0.2;
  if (chainsMatch(a.chain, b.chain)) relevance += CHAIN_BONUS * 0.75;
  // An editor-declared alternative counts only when the two are plausibly the
  // same kind of thing — a stray entry pairing a wallet with a launchpad
  // shouldn't put one in the other's "alternatives" block.
  const plausible = affinity > 0 || sameCategory > 0;
  if (plausible && (isDeclaredAlternative(a, b) || isDeclaredAlternative(b, a))) {
    relevance = Math.max(relevance, 85);
  }
  return Math.min(100, relevance);
}

/**
 * Words crypto listings carry after the brand: "Phantom Wallet", "LayerZero
 * Airdrop", "Aave Protocol". An editor writing "Phantom" as an alternative, or
 * a post titled "Phantom vs MetaMask", means the same listing.
 */
const GENERIC_NAME_SUFFIX =
  /\s+(airdrop|airdrops|wallet|exchange|protocol|app|finance|network|labs|launchpad|points|testnet|campaign|program|programme|review)$/i;

/** "Phantom Wallet" → "phantom"; null when nothing generic was stripped. */
export function coreName(title: string): string | null {
  const t = title.trim();
  const core = t.replace(GENERIC_NAME_SUFFIX, "").trim();
  return core && core !== t ? core.toLowerCase() : null;
}

const alternativeNameCache = new WeakMap<GraphEntry, Set<string>>();

/** Every spelling of `entry` an editor might have typed into another row. */
function alternativeNames(entry: GraphEntry): Set<string> {
  let hit = alternativeNameCache.get(entry);
  if (!hit) {
    const core = coreName(entry.title);
    hit = new Set(
      [
        entry.slug,
        entry.title,
        ...entry.aliases,
        ...(core && core.length >= 4 ? [core] : []),
      ].map((n) => n.toLowerCase().trim())
    );
    alternativeNameCache.set(entry, hit);
  }
  return hit;
}

/** True when `a` names `b` as an alternative or declared comparison. */
export function isDeclaredAlternative(a: GraphEntry, b: GraphEntry): boolean {
  if (a.comparisonSlugs?.includes(b.slug)) return true;
  // Cheapest exit by far: most listings declare no alternatives at all, and
  // this runs once per ordered pair in the directory.
  const alternatives = a.alternatives;
  if (!alternatives?.length) return false;

  const names = alternativeNames(b);
  return alternatives.some((alt) => {
    const v = alt.toLowerCase().trim();
    return names.has(v) || names.has(v.replace(/\s+/g, "-"));
  });
}

export const SIMILAR_ENTRY_FLOOR = 40;

export function scoreEntryPair(a: GraphEntry, b: GraphEntry, set: ClusterSet): {
  relevance: number;
  total: number;
} {
  const relevance = entryPairRelevance(a, b, set);
  const rating = Math.max(0, Math.min(100, ((b.rating ?? 0) / 5) * 100));
  const total =
    relevance * 0.6 +
    authorityNeed(b.inboundLinks) * 0.15 +
    monetizationScore(b) * 0.1 +
    rating * 0.1 +
    freshness(b.updatedAt) * 0.05;
  return { relevance, total };
}

// ── Listing → article ("guides about this project") ──────────────────

export type GuideReason = "subject" | "pinned" | "mention" | "pillar" | "cluster";

/**
 * Which articles belong on a listing page. An article *about* the project (its
 * review, its alternatives, a comparison it is half of) beats one that merely
 * mentions it, which beats a same-cluster article that doesn't. Adjacent-
 * cluster articles never qualify on their own — "related" has to mean it. A
 * shared chain orders same-cluster articles but never qualifies one.
 */
export function scoreGuideForEntry(
  entry: GraphEntry,
  post: GraphPost & { relatedEntrySlugs?: string[] },
  set: ClusterSet,
  pillarId?: string
): { score: number; reason: GuideReason } | null {
  const subject = post.subjectEntitySlugs?.includes(entry.slug) ?? false;
  const pinned =
    post.primaryEntrySlug === entry.slug || (post.relatedEntrySlugs ?? []).includes(entry.slug);
  const mention = post.mentionedEntitySlugs?.includes(entry.slug) ?? false;
  const affinity = clusterAffinity(entry.cluster, post.cluster, set);
  const isPillar = pillarId === post.id && affinity === 100;

  if (!subject && !pinned && !mention && affinity < 100) return null;

  let score = affinity * 0.3 + freshness(post.updatedAt) * 0.05;
  if (subject) score += 100;
  if (pinned) score += 70;
  if (mention) score += 45;
  if (isPillar) score += 40;
  if (chainsMatch(entry.chain, post.chain)) score += 8;
  if (
    subject &&
    ["BLOG_LEGIT_CHECK", "BLOG_ALTERNATIVES", "BLOG_COMPARISON", "BLOG_PAYOUT"].includes(post.pageType)
  ) {
    score += 10;
  }

  const reason: GuideReason = subject
    ? "subject"
    : pinned
      ? "pinned"
      : isPillar
        ? "pillar"
        : mention
          ? "mention"
          : "cluster";
  return { score, reason };
}

// ── Inbound repair ───────────────────────────────────────────────────

export type Assignment<T> = { item: T; score: number; reason: string; locked?: boolean };

/**
 * Makes sure nothing relevant is left unlinked.
 *
 * Every page picks its own best links independently, which is exactly how
 * orphans happen: twenty articles can each have a better use for their slots
 * than the one new post, so it never appears anywhere. This pass walks the
 * least-linked nodes first and, for each one still below `minInbound`, finds
 * the most relevant page that can give up a slot — appending when a block has
 * room, otherwise swapping out that block's weakest pick, but only if doing so
 * doesn't push *that* node below the minimum.
 *
 * Sources give up one slot per round, for up to `maxDonations` rounds, so no
 * page ends up dominated by repair links. A second round matters in small
 * clusters: a two-article topic may have a single outside peer relevant
 * enough to link in, and one donation can't lift both articles to the floor.
 * Every repair link still has to clear `candidateScore`, i.e. the same
 * relevance gate as any other pick.
 *
 * Fully deterministic: inputs are sorted by id and score, so the same content
 * always produces the same links.
 */
export function repairInbound<T extends { id: string }>(
  nodes: T[],
  picks: Map<string, Assignment<T>[]>,
  limits: Map<string, number>,
  candidateScore: (source: T, target: T) => number | null,
  opts: { minInbound: number; extraInbound?: Map<string, number>; maxDonations?: number }
): void {
  const inbound = new Map<string, number>();
  const bump = (id: string, d: number) => inbound.set(id, (inbound.get(id) ?? 0) + d);
  for (const n of nodes) inbound.set(n.id, opts.extraInbound?.get(n.id) ?? 0);
  for (const list of picks.values()) for (const a of list) bump(a.item.id, 1);

  const donations = new Map<string, number>();
  const rounds = Math.max(1, opts.maxDonations ?? 1);

  for (let round = 1; round <= rounds; round++) {
    const ordered = [...nodes].sort(
      (a, b) => (inbound.get(a.id) ?? 0) - (inbound.get(b.id) ?? 0) || a.id.localeCompare(b.id)
    );

    for (const target of ordered) {
      if ((inbound.get(target.id) ?? 0) >= opts.minInbound) continue;

      const sources = nodes
        .filter((s) => s.id !== target.id && (donations.get(s.id) ?? 0) < round)
        .filter((s) => !(picks.get(s.id) ?? []).some((a) => a.item.id === target.id))
        .map((s) => ({ s, score: candidateScore(s, target) }))
        .filter((x): x is { s: T; score: number } => x.score !== null)
        .sort((a, b) => b.score - a.score || a.s.id.localeCompare(b.s.id));

      for (const { s, score } of sources) {
        if ((inbound.get(target.id) ?? 0) >= opts.minInbound) break;
        const list = picks.get(s.id) ?? [];
        const limit = limits.get(s.id) ?? list.length;

        if (list.length < limit) {
          list.push({ item: target, score, reason: "repair" });
          picks.set(s.id, list);
          bump(target.id, 1);
          donations.set(s.id, (donations.get(s.id) ?? 0) + 1);
          continue;
        }

        // Weakest unlocked, non-repair pick whose own target can afford to
        // lose a link.
        let weakest = -1;
        for (let i = list.length - 1; i >= 0; i--) {
          const a = list[i];
          if (a.locked || a.reason === "repair") continue;
          if ((inbound.get(a.item.id) ?? 0) <= opts.minInbound) continue;
          if (weakest === -1 || a.score < list[weakest].score) weakest = i;
        }
        if (weakest === -1) continue;

        bump(list[weakest].item.id, -1);
        list[weakest] = { item: target, score, reason: "repair" };
        bump(target.id, 1);
        donations.set(s.id, (donations.get(s.id) ?? 0) + 1);
      }
    }
  }
}

// ── Link budget ──────────────────────────────────────────────────────

/**
 * How many links an article of a given length should carry, from the plan's
 * ranges. Returned as a budget rather than a fixed number so a 600-word post
 * doesn't get the same treatment as a 3,000-word one.
 */
export function linkBudget(wordCount: number): {
  contextual: number;
  directory: number;
  relatedArticles: number;
  ctas: number;
} {
  if (wordCount >= 2000) {
    return { contextual: 12, directory: 6, relatedArticles: 4, ctas: 2 };
  }
  if (wordCount >= 1200) {
    return { contextual: 8, directory: 4, relatedArticles: 3, ctas: 1 };
  }
  if (wordCount >= 600) {
    return { contextual: 5, directory: 3, relatedArticles: 3, ctas: 1 };
  }
  return { contextual: 3, directory: 2, relatedArticles: 2, ctas: 1 };
}
