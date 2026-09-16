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

// ── Sub-scores ───────────────────────────────────────────────────────

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a.map((x) => x.toLowerCase().trim()).filter(Boolean));
  const sb = new Set(b.map((x) => x.toLowerCase().trim()).filter(Boolean));
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const v of sa) if (sb.has(v)) inter++;
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

  const keywords = [post.targetKeyword, ...post.secondaryKeywords]
    .map((k) => k.toLowerCase().trim())
    .filter(Boolean);
  const entryText = `${entry.title} ${entry.shortDescription} ${entry.tags.join(" ")}`.toLowerCase();
  const keywordHit = keywords.some((k) => entryText.includes(k)) ? 100 : 0;

  const base =
    affinity * 0.55 + categoryMatch * 0.15 + tagOverlap * 0.2 + keywordHit * 0.1;

  // Chain is a strong same-topic signal on EarnInCrypto — a Solana article and a
  // Solana listing are related in a way the cluster alone doesn't capture.
  // Added as a capped bonus rather than folded into the weights so the
  // chain-less site's scores, and therefore the floors, are unchanged.
  const chainMatch =
    post.chain && entry.chain && post.chain.toLowerCase() === entry.chain.toLowerCase();

  return Math.min(100, base + (chainMatch ? 12 : 0));
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

/** Does the article actually talk about this platform? */
export function entityOverlap(post: GraphPost, entry: GraphEntry): number {
  const names = [entry.title, ...entry.aliases]
    .map((n) => n.toLowerCase().trim())
    .filter((n) => n.length >= 3);
  if (!names.length) return 0;

  const title = post.title.toLowerCase();
  const keywords = [post.targetKeyword, ...post.secondaryKeywords]
    .join(" ")
    .toLowerCase();

  if (names.some((n) => title.includes(n))) return 100;
  if (names.some((n) => keywords.includes(n))) return 85;
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

  const affinity = clusterAffinity(post.cluster, candidate.cluster, set);
  const tagOverlap = jaccard(post.tags, candidate.tags) * 100;
  const categoryMatch = post.category === candidate.category ? 100 : 0;

  const relevance = affinity * 0.6 + tagOverlap * 0.25 + categoryMatch * 0.15;

  const delta = stageDistance(post.intentStage, candidate.intentStage);
  let progression: number;
  if (delta === 1) progression = 100;
  else if (delta === 2) progression = 75;
  else if (delta === 0) progression = 45;
  else if (delta > 2) progression = 40;
  else progression = 15; // sending a ready-to-act reader backwards

  const recency = freshness(candidate.updatedAt);

  return relevance * 0.55 + progression * 0.35 + recency * 0.1;
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
    .filter((r) => r.score >= 30)
    .sort((a, b) => b.score - a.score);
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
