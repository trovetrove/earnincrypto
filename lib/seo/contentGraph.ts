// lib/seo/contentGraph.ts
//
// The whole site as one graph, built once per render.
//
// Until now every block on every page asked its own narrow question — "which
// listings look like this article?", "which posts share this category?" — and
// nobody could see the whole picture. That is how orphans and link sinks
// happen: twenty articles each independently decide the same three listings
// are best, and the new post nobody picked stays invisible.
//
// This module answers the questions globally instead:
//
//   * which cluster, page type, search intent and subject project every
//     article has (explicit admin labels first, then inference from the
//     title/slug, then category defaults);
//   * which article is each cluster's pillar, so every supporting article can
//     link up to it and the pillar can link down to all of them;
//   * the related-article, similar-listing and guides-for-listing blocks for
//     every page at once, followed by a repair pass that guarantees every
//     relevant page receives links from somewhere;
//   * how many authored contextual links point at each page (the census the
//     authority-need component reads).
//
// It is pure computation over two cached table reads, so a page render costs
// the same two queries no matter how many blocks it shows. Content is written
// by the sidehustletools manage panel; a newly published article is placed
// into this graph on the next ISR render of any page here — no editor has to
// go back and add links to old articles by hand.
//
// Ported from the sidehustletools engine. Crypto-specific differences:
//
//   * The fallback cluster (airdrops) is a real topic, so a post is only
//     re-homed by the projects it mentions when inference found no evidence
//     at all — never when it genuinely matched airdrop hints.
//   * Project names are matched on their brand core too ("Phantom Wallet" →
//     "Phantom"), and all-caps three-letter brands (OKX, GMX) count.
//   * Chain is a relevance signal in every pairwise score (see linkGraph.ts).

import { cache } from "react";
import {
  clusterAffinity,
  clusterSetFor,
  inferClusterDetailed,
  type ClusterSet,
  type PageType,
} from "./clusters";
import {
  extractInternalLinks,
  getRawEntryRows,
  getRawPublishedPostRows,
  normaliseEntry,
  toPlainText,
  type RawEntry,
  type RawPost,
  type Site,
} from "./graphData";
import { keywordTokens, resolveIntent, type SearchIntent } from "./intent";
import {
  coreName,
  linkBudget,
  rankRelatedPosts,
  repairInbound,
  scoreEntryPair,
  scoreGuideForEntry,
  scoreRelatedPost,
  RELATED_POST_FLOOR,
  SIMILAR_ENTRY_FLOOR,
  type Assignment,
  type GraphEntry,
  type GraphPost,
  type GuideReason,
} from "./linkGraph";
import { selectLinkableEntities } from "./entityLinker";
import { cryptoCategories } from "@/lib/crypto/data-static";

export type { Site } from "./graphData";

export type GraphPostNode = GraphPost & {
  subtitle: string;
  subjectEntitySlugs: string[];
  mentionedEntitySlugs: string[];
  searchIntent: SearchIntent;
  intentSource: "explicit" | "inferred" | "default";
  /**
   * How the cluster was decided. "fallback" means nothing placed the article —
   * it sits in the fallback cluster for want of evidence, so it can never be
   * that cluster's pillar.
   */
  clusterSource: "explicit" | "subject" | "inferred" | "mentions" | "fallback";
  wordCount: number;
  isPillar: boolean;
  relatedEntrySlugs: string[];
  relatedPostSlugs: string[];
  inboundLinks: number;
  /** Authored internal links in the body plus pins — what the author wrote. */
  authoredOutbound: number;
};

export type RelatedPostLink = { post: GraphPostNode; score: number; reason: string };
export type SimilarEntryLink = { entry: GraphEntry; score: number; reason: string };
export type GuideLink = { post: GraphPostNode; score: number; reason: GuideReason };

export type ContentGraph = {
  site: Site;
  set: ClusterSet;
  entries: GraphEntry[];
  posts: GraphPostNode[];
  entryBySlug: Map<string, GraphEntry>;
  entryById: Map<string, GraphEntry>;
  postBySlug: Map<string, GraphPostNode>;
  postById: Map<string, GraphPostNode>;
  rawEntryById: Map<string, RawEntry>;
  rawPostById: Map<string, RawPost>;
  pillarByCluster: Map<string, GraphPostNode>;
  postsByCluster: Map<string, GraphPostNode[]>;
  entriesByCluster: Map<string, GraphEntry[]>;
  /** Supporting articles a pillar links down to, in reading order. */
  seriesByPillar: Map<string, GraphPostNode[]>;
  relatedPosts: Map<string, RelatedPostLink[]>;
  similarEntries: Map<string, SimilarEntryLink[]>;
  guidesByEntry: Map<string, GuideLink[]>;
  /** Authored contextual links into each listing / article, keyed by slug. */
  entryInbound: Map<string, number>;
  postInbound: Map<string, number>;
  /**
   * Editorial "A vs B" articles keyed by the canonical /compare/a-vs-b path of
   * the two listings they're about. When one exists, the templated compare
   * page for the same pair defers to it instead of competing for the query.
   */
  editorialComparisons: Map<string, GraphPostNode>;
};

// ── Tunables ─────────────────────────────────────────────────────────

/** Every article and listing should be linked from at least this many peers. */
const MIN_INBOUND = 2;
const SIMILAR_ENTRY_LIMIT = 4;
/** No article takes more generated related-article slots than this. */
const MAX_RELATED_INBOUND = 5;
/**
 * No listing appears in more "alternatives" blocks than this. Without it a
 * brand-new listing (maximum authority need) topped every peer's block.
 */
const MAX_SIMILAR_INBOUND = 8;
const GUIDE_LIMIT = 4;
/** How many supporting articles a pillar lists before deferring to the hub. */
export const SERIES_LIMIT = 8;

// ── Entity matching ──────────────────────────────────────────────────

type EntityMatcher = {
  slug: string;
  /** Names that make a listing an article's *subject* when they appear in its title. */
  titleRes: RegExp[];
  /** Names that count as a mention anywhere in the body. */
  bodyRes: RegExp[];
  slugCores: string[];
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const boundary = (n: string) => new RegExp(`(^|[^a-z0-9])${escapeRe(n)}($|[^a-z0-9])`);

const SLUG_SUFFIX = /-(review|airdrop|airdrops|wallet|exchange|protocol|app|finance|network|points|testnet|launchpad)$/;

function buildMatchers(rows: RawEntry[]): EntityMatcher[] {
  return rows.map((row) => {
    const title = row.title.trim();
    // "OKX", "GMX": short, but unambiguous brand tokens in capitals.
    const shortBrand = /^[A-Z0-9]{3}$/.test(title) ? [title.toLowerCase()] : [];
    const explicit = [title, ...(row.entity_aliases ?? [])].map((n) => n.toLowerCase().trim());
    const core = coreName(title);

    const uniq = (list: string[]) => list.filter((n, i, all) => n && all.indexOf(n) === i);
    const titleNames = uniq([
      ...explicit.filter((n) => n.length >= 4),
      ...shortBrand,
      ...(core && core.length >= 4 ? [core] : []),
    ]);
    // A derived core has to be longer to count in prose: "base" or "gate"
    // mean something else in a sentence far more often than in a headline.
    const bodyNames = uniq([
      ...explicit.filter((n) => n.length >= 4),
      ...shortBrand,
      ...(core && core.length >= 5 ? [core] : []),
    ]);

    const slug = row.slug.toLowerCase();
    const stripped = slug.replace(SLUG_SUFFIX, "");
    return {
      slug: row.slug,
      titleRes: titleNames.map(boundary),
      bodyRes: bodyNames.map(boundary),
      slugCores: uniq([slug, stripped]).filter((c) => c.length >= 4),
    };
  });
}

function isSubject(m: EntityMatcher, titleLower: string, postSlug: string): boolean {
  if (m.titleRes.some((re) => re.test(titleLower))) return true;
  return m.slugCores.some((core) => `-${postSlug}-`.includes(`-${core}-`));
}

// ── Build ────────────────────────────────────────────────────────────

function dominantCluster(slugs: string[], clusterBySlug: Map<string, string>): string | null {
  if (slugs.length < 2) return null;
  const counts = new Map<string, number>();
  for (const s of slugs) {
    const c = clusterBySlug.get(s);
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return top && top[1] >= 2 && top[1] / slugs.length >= 0.6 ? top[0] : null;
}

function buildPosts(
  rows: RawPost[],
  set: ClusterSet,
  matchers: EntityMatcher[],
  entryClusterBySlug: Map<string, string>
): GraphPostNode[] {
  return rows.map((row) => {
    const text = toPlainText(row.content ?? "");
    const titleLower = row.title.toLowerCase();
    const postSlug = row.slug.toLowerCase();

    const subjects = matchers.filter((m) => isSubject(m, titleLower, postSlug)).map((m) => m.slug);
    const mentions = matchers
      .filter((m) => subjects.includes(m.slug) || m.bodyRes.some((re) => re.test(text)))
      .map((m) => m.slug);

    // An article about one project belongs to that project's cluster. This is
    // what lets a post about a brand-new listing land in the right cluster
    // without anyone adding the brand to the hint lists in clusters.ts.
    const subjectClusters = [...new Set(subjects.map((s) => entryClusterBySlug.get(s)).filter(Boolean))];
    const explicitCluster = row.cluster && set.byId.has(row.cluster) ? row.cluster : null;
    let cluster: string;
    let clusterSource: GraphPostNode["clusterSource"];
    if (explicitCluster) {
      cluster = explicitCluster;
      clusterSource = "explicit";
    } else if (subjectClusters.length === 1) {
      cluster = subjectClusters[0] as string;
      clusterSource = "subject";
    } else {
      const inferred = inferClusterDetailed(
        {
          slug: row.slug,
          category: row.category,
          tags: row.tags ?? [],
          title: row.title,
          keywords: [row.target_keyword ?? "", ...(row.secondary_keywords ?? [])],
        },
        set
      );
      cluster = inferred.cluster;
      clusterSource = inferred.confident ? "inferred" : "fallback";
      // When tags and slug were too thin to place the article, the projects it
      // discusses usually aren't: a post that only names Aave, Lido and
      // Pendle is a DeFi post whatever its tags say. A broad guide naming
      // projects from five clusters has no majority and stays where it fell.
      if (!inferred.confident) {
        const dominant = dominantCluster(mentions, entryClusterBySlug);
        if (dominant) {
          cluster = dominant;
          clusterSource = "mentions";
        }
      }
    }

    const intent = resolveIntent(
      {
        slug: row.slug,
        title: row.title,
        category: row.category,
        targetKeyword: row.target_keyword ?? "",
        pageType: row.page_type,
        intentStage: row.intent_stage,
      },
      subjects.length > 0
    );

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: (row.subtitle as string | null) ?? "",
      category: row.category,
      cluster,
      tags: row.tags ?? [],
      targetKeyword: row.target_keyword ?? "",
      secondaryKeywords: row.secondary_keywords ?? [],
      intentStage: intent.stage,
      pageType: intent.pageType,
      searchIntent: intent.searchIntent,
      intentSource: intent.source,
      clusterSource,
      text,
      primaryEntrySlug: row.primary_entry_slug ?? undefined,
      publishedAt: row.published_at ?? undefined,
      updatedAt: row.updated_at,
      chain: row.chain ?? undefined,
      subjectEntitySlugs: subjects,
      mentionedEntitySlugs: mentions,
      wordCount: text ? text.split(/\s+/).length : 0,
      isPillar: false,
      relatedEntrySlugs: row.related_entry_slugs ?? [],
      relatedPostSlugs: row.related_post_slugs ?? [],
      inboundLinks: 0,
      authoredOutbound: 0,
    };
  });
}

/**
 * Authored contextual links into every page.
 *
 * Counts body hrefs, pinned slugs, the primary destination, and the in-prose
 * entity links the article page will render (they follow deterministically
 * from the text, so counting them doesn't create a feedback loop). Generated
 * recommendation blocks are deliberately excluded: counting its own output
 * would make the authority-need component chase its tail.
 */
function census(
  entryRows: RawEntry[],
  posts: GraphPostNode[],
  entries: GraphEntry[],
  rawPostById: Map<string, RawPost>
): { entryInbound: Map<string, number>; postInbound: Map<string, number>; outbound: Map<string, number> } {
  const entryInbound = new Map<string, number>();
  const postInbound = new Map<string, number>();
  const outbound = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  const entrySlugs = new Set(entries.map((e) => e.slug));
  const postSlugs = new Set(posts.map((p) => p.slug));
  const linkIndex = entries.map((e) => ({
    slug: e.slug,
    title: e.title,
    category: e.category,
    aliases: e.aliases,
    revenuePriority: e.revenuePriority,
  }));

  for (const post of posts) {
    const toEntries = new Set<string>();
    const toPosts = new Set<string>();
    for (const s of post.relatedEntrySlugs) toEntries.add(s);
    if (post.primaryEntrySlug) toEntries.add(post.primaryEntrySlug);
    for (const s of post.relatedPostSlugs) toPosts.add(s);

    const authored = extractInternalLinks(rawPostById.get(post.id)?.content ?? "");
    for (const s of authored.entries) toEntries.add(s);
    for (const s of authored.posts) toPosts.add(s);
    toPosts.delete(post.slug);
    const authoredCount = new Set([...toEntries, ...toPosts]).size;

    const budget = linkBudget(post.wordCount).contextual;
    for (const e of selectLinkableEntities(post.text, linkIndex, budget)) {
      toEntries.add(e.href.split("/").pop() ?? "");
    }

    for (const s of toEntries) if (entrySlugs.has(s)) bump(entryInbound, s);
    for (const s of toPosts) if (postSlugs.has(s)) bump(postInbound, s);
    outbound.set(post.slug, authoredCount);
  }

  // Links written into listing descriptions count too.
  for (const row of entryRows) {
    const html = `${row.description ?? ""} ${row.realistic_value ?? ""}`;
    if (!html.includes("href")) continue;
    const links = extractInternalLinks(html);
    for (const s of links.entries) if (s !== row.slug && entrySlugs.has(s)) bump(entryInbound, s);
    for (const s of links.posts) if (postSlugs.has(s)) bump(postInbound, s);
  }

  return { entryInbound, postInbound, outbound };
}

const PILLAR_TYPE_RANK: Partial<Record<PageType, number>> = {
  PILLAR: -1,
  BLOG_ROUNDUP: 0,
  BLOG_GUIDE: 1,
};

/**
 * Each cluster's pillar: the article every other article in the cluster rolls
 * up to. An editor can pin one by setting page type "Pillar"; otherwise it is
 * the broadest non-project-specific roundup (or guide) in the cluster — the
 * one whose target keyword has the fewest distinguishing words, so "best
 * crypto wallets" wins over "best Solana wallets for NFTs". A cluster with a
 * single article has no pillar; there is nothing for it to hold together.
 */
function resolvePillars(byCluster: Map<string, GraphPostNode[]>): Map<string, GraphPostNode> {
  const out = new Map<string, GraphPostNode>();
  for (const [cluster, list] of byCluster) {
    if (list.length < 2) continue;
    // News is dated by definition, and an article that only landed here for
    // want of evidence isn't about this topic — neither can hold a cluster up.
    const candidates = list.filter(
      (p) =>
        p.pageType === "PILLAR" ||
        (!p.subjectEntitySlugs.length &&
          PILLAR_TYPE_RANK[p.pageType] !== undefined &&
          p.clusterSource !== "fallback" &&
          p.category !== "news")
    );
    if (!candidates.length) continue;

    const breadth = (p: GraphPostNode) => keywordTokens(p.targetKeyword || p.title).size || 99;
    // Breadth outranks format: "how to earn crypto yield" is the pillar over
    // "best stablecoin yields on Arbitrum", even though the latter is a roundup.
    candidates.sort(
      (a, b) =>
        Number(b.pageType === "PILLAR") - Number(a.pageType === "PILLAR") ||
        breadth(a) - breadth(b) ||
        (PILLAR_TYPE_RANK[a.pageType] ?? 9) - (PILLAR_TYPE_RANK[b.pageType] ?? 9) ||
        b.wordCount - a.wordCount ||
        (a.publishedAt ?? "").localeCompare(b.publishedAt ?? "") ||
        a.slug.localeCompare(b.slug)
    );
    const pillar = candidates[0];
    pillar.isPillar = true;
    out.set(cluster, pillar);
  }
  return out;
}

/** Reading order for a hub or a pillar's series list. */
export const HUB_SECTIONS: { id: string; label: string; types: PageType[] }[] = [
  { id: "roundups", label: "Best-of lists & roundups", types: ["PILLAR", "BLOG_ROUNDUP"] },
  { id: "compare", label: "Comparisons & alternatives", types: ["BLOG_COMPARISON", "BLOG_ALTERNATIVES"] },
  { id: "reviews", label: "Reviews & safety checks", types: ["BLOG_LEGIT_CHECK"] },
  { id: "earnings", label: "Rewards, yields & payouts", types: ["BLOG_PAYOUT"] },
  { id: "guides", label: "Guides & how-tos", types: ["BLOG_GUIDE", "PLAYBOOK", "HUB"] },
];

export function sectionFor(pageType: PageType): string {
  return HUB_SECTIONS.find((s) => s.types.includes(pageType))?.id ?? "guides";
}

export function pageTypeLabel(pageType: PageType): string {
  switch (pageType) {
    case "PILLAR":
      return "Complete guide";
    case "BLOG_ROUNDUP":
      return "Best-of";
    case "BLOG_COMPARISON":
      return "Comparison";
    case "BLOG_ALTERNATIVES":
      return "Alternatives";
    case "BLOG_LEGIT_CHECK":
      return "Review";
    case "BLOG_PAYOUT":
      return "Rewards";
    default:
      return "Guide";
  }
}

export function comparisonPath(slugA: string, slugB: string): string {
  return `/compare/${[slugA, slugB].sort().join("-vs-")}`;
}

export function buildContentGraph(entryRows: RawEntry[], postRows: RawPost[], site: Site): ContentGraph {
  const set = clusterSetFor(site);

  // 1. Listings, with clusters resolved (inbound filled in after the census).
  const entries = entryRows.map((row) => normaliseEntry(row, set, new Map()));
  const entryBySlug = new Map(entries.map((e) => [e.slug, e]));
  const entryById = new Map(entries.map((e) => [e.id, e]));
  const entryClusterBySlug = new Map(entries.map((e) => [e.slug, e.cluster]));

  // 2. Articles, with subject projects, cluster and intent.
  const matchers = buildMatchers(entryRows);
  const posts = buildPosts(postRows, set, matchers, entryClusterBySlug);
  const rawPostById = new Map(postRows.map((r) => [r.id, r]));
  const postBySlug = new Map(posts.map((p) => [p.slug, p]));
  const postById = new Map(posts.map((p) => [p.id, p]));

  // 3. Authored-link census.
  const { entryInbound, postInbound, outbound } = census(entryRows, posts, entries, rawPostById);
  for (const e of entries) e.inboundLinks = entryInbound.get(e.slug) ?? 0;
  for (const p of posts) {
    p.inboundLinks = postInbound.get(p.slug) ?? 0;
    p.authoredOutbound = outbound.get(p.slug) ?? 0;
  }

  // 4. Cluster membership and pillars.
  const postsByCluster = new Map<string, GraphPostNode[]>();
  for (const p of posts) {
    const list = postsByCluster.get(p.cluster) ?? [];
    list.push(p);
    postsByCluster.set(p.cluster, list);
  }
  const pillarByCluster = resolvePillars(postsByCluster);

  const entriesByCluster = new Map<string, GraphEntry[]>();
  for (const e of entries) {
    const list = entriesByCluster.get(e.cluster) ?? [];
    list.push(e);
    entriesByCluster.set(e.cluster, list);
  }
  for (const list of entriesByCluster.values()) {
    list.sort(
      (a, b) =>
        Number(b.isFeatured) - Number(a.isFeatured) ||
        (b.rating ?? 0) - (a.rating ?? 0) ||
        b.revenuePriority - a.revenuePriority ||
        a.title.localeCompare(b.title)
    );
  }

  // 5. Pillar series: every supporting article links up (rendered as the
  //    "part of" link) and the pillar links down to up to SERIES_LIMIT of them.
  const seriesByPillar = new Map<string, GraphPostNode[]>();
  const structuralInbound = new Map<string, number>();
  const bumpStructural = (id: string) => structuralInbound.set(id, (structuralInbound.get(id) ?? 0) + 1);
  for (const [cluster, pillar] of pillarByCluster) {
    const supporting = (postsByCluster.get(cluster) ?? [])
      .filter((p) => p.id !== pillar.id)
      .sort(
        (a, b) =>
          HUB_SECTIONS.findIndex((s) => s.id === sectionFor(a.pageType)) -
            HUB_SECTIONS.findIndex((s) => s.id === sectionFor(b.pageType)) ||
          scoreRelatedPost(pillar, b, set) - scoreRelatedPost(pillar, a, set) ||
          a.slug.localeCompare(b.slug)
      );
    const series = supporting.slice(0, SERIES_LIMIT);
    seriesByPillar.set(pillar.id, series);
    structuralInbound.set(pillar.id, (structuralInbound.get(pillar.id) ?? 0) + supporting.length);
    for (const p of series) bumpStructural(p.id);
  }

  // 6. Related articles for every article, then orphan repair.
  const relatedPicks = new Map<string, Assignment<GraphPostNode>[]>();
  const relatedLimits = new Map<string, number>();
  const pillarIdOf = (p: GraphPostNode) => {
    const pillar = pillarByCluster.get(p.cluster);
    return pillar && pillar.id !== p.id ? pillar.id : undefined;
  };

  // Candidate lists first, then allocation. Allocating page by page with no
  // memory is how link sinks form: one ACT-stage review scores well from every
  // COMPARE-stage page and ends up in eight related blocks while its siblings
  // get none. Each target is capped, and pages with the fewest eligible
  // candidates choose first so the cap never strands them.
  const candidateLists = new Map<string, { post: GraphPostNode; score: number }[]>();
  const pinnedLists = new Map<string, Assignment<GraphPostNode>[]>();
  for (const p of posts) {
    const limit = linkBudget(p.wordCount).relatedArticles;
    relatedLimits.set(p.id, limit);
    const upId = pillarIdOf(p);
    const seriesIds = new Set((seriesByPillar.get(p.id) ?? []).map((s) => s.id));

    const pinned: Assignment<GraphPostNode>[] = p.relatedPostSlugs
      .map((slug) => postBySlug.get(slug))
      .filter((x): x is GraphPostNode => Boolean(x) && x!.id !== p.id && x!.id !== upId)
      .slice(0, limit)
      .map((item) => ({ item, score: 1000, reason: "pinned", locked: true }));
    pinnedLists.set(p.id, pinned);

    const taken = new Set(pinned.map((a) => a.item.id));
    const pool = posts.filter(
      (c) => c.id !== p.id && c.id !== upId && !seriesIds.has(c.id) && !taken.has(c.id)
    );
    candidateLists.set(p.id, rankRelatedPosts(p, pool, set) as { post: GraphPostNode; score: number }[]);
  }

  const engineInbound = new Map<string, number>();
  const allocationOrder = [...posts].sort(
    (a, b) =>
      (candidateLists.get(a.id)?.length ?? 0) - (candidateLists.get(b.id)?.length ?? 0) ||
      a.slug.localeCompare(b.slug)
  );
  for (const p of allocationOrder) {
    const limit = relatedLimits.get(p.id) ?? 3;
    const picks = [...(pinnedLists.get(p.id) ?? [])];
    for (const r of candidateLists.get(p.id) ?? []) {
      if (picks.length >= limit) break;
      if ((engineInbound.get(r.post.id) ?? 0) >= MAX_RELATED_INBOUND) continue;
      picks.push({ item: r.post, score: r.score, reason: "relevance" });
      engineInbound.set(r.post.id, (engineInbound.get(r.post.id) ?? 0) + 1);
    }
    relatedPicks.set(p.id, picks);
  }

  const postExtraInbound = new Map<string, number>();
  for (const p of posts) {
    postExtraInbound.set(p.id, p.inboundLinks + (structuralInbound.get(p.id) ?? 0));
  }
  repairInbound(
    posts,
    relatedPicks,
    relatedLimits,
    (source, target) => {
      if (pillarIdOf(source) === target.id) return null;
      if ((seriesByPillar.get(source.id) ?? []).some((s) => s.id === target.id)) return null;
      if (clusterAffinity(source.cluster, target.cluster, set) === 0) return null;
      const score = scoreRelatedPost(source, target, set);
      return score >= RELATED_POST_FLOOR ? score : null;
    },
    { minInbound: MIN_INBOUND, extraInbound: postExtraInbound, maxDonations: 2 }
  );

  const relatedPosts = new Map<string, RelatedPostLink[]>();
  for (const [id, list] of relatedPicks) {
    relatedPosts.set(
      id,
      list.map((a) => ({ post: a.item, score: a.score, reason: a.reason }))
    );
  }

  // 7. Similar listings for every listing, then orphan repair. No rotation:
  //    the same content always produces the same alternatives.
  //    Allocated like related articles: candidate lists first, listings
  //    with the fewest candidates choose first, and each target is capped.
  const similarPicks = new Map<string, Assignment<GraphEntry>[]>();
  const similarLimits = new Map<string, number>();
  const similarCandidates = new Map<string, { b: GraphEntry; total: number }[]>();
  for (const a of entries) {
    similarLimits.set(a.id, SIMILAR_ENTRY_LIMIT);
    similarCandidates.set(
      a.id,
      entries
        .filter((b) => b.id !== a.id)
        .map((b) => ({ b, s: scoreEntryPair(a, b, set) }))
        .filter((x) => x.s.relevance >= SIMILAR_ENTRY_FLOOR)
        .sort((x, y) => y.s.total - x.s.total || x.b.slug.localeCompare(y.b.slug))
        .map((x) => ({ b: x.b, total: x.s.total }))
    );
  }
  const similarInbound = new Map<string, number>();
  const similarOrder = [...entries].sort(
    (a, b) =>
      (similarCandidates.get(a.id)?.length ?? 0) - (similarCandidates.get(b.id)?.length ?? 0) ||
      a.slug.localeCompare(b.slug)
  );
  for (const a of similarOrder) {
    const picks: Assignment<GraphEntry>[] = [];
    for (const c of similarCandidates.get(a.id) ?? []) {
      if (picks.length >= SIMILAR_ENTRY_LIMIT) break;
      if ((similarInbound.get(c.b.id) ?? 0) >= MAX_SIMILAR_INBOUND) continue;
      picks.push({ item: c.b, score: c.total, reason: "relevance" });
      similarInbound.set(c.b.id, (similarInbound.get(c.b.id) ?? 0) + 1);
    }
    similarPicks.set(a.id, picks);
  }
  repairInbound(
    entries,
    similarPicks,
    similarLimits,
    (source, target) => {
      const s = scoreEntryPair(source, target, set);
      return s.relevance >= SIMILAR_ENTRY_FLOOR ? s.total : null;
    },
    { minInbound: MIN_INBOUND, maxDonations: 2 }
  );
  const similarEntries = new Map<string, SimilarEntryLink[]>();
  for (const [id, list] of similarPicks) {
    similarEntries.set(
      id,
      list.map((a) => ({ entry: a.item, score: a.score, reason: a.reason }))
    );
  }

  // 8. Articles for every listing page: subject posts, then pinned, pillar,
  //    mentions, then same cluster (see scoreGuideForEntry).
  const guidesByEntry = new Map<string, GuideLink[]>();
  for (const e of entries) {
    const pillarId = pillarByCluster.get(e.cluster)?.id;
    const scored: GuideLink[] = [];
    for (const p of posts) {
      const s = scoreGuideForEntry(e, p, set, pillarId);
      if (s) scored.push({ post: p, score: s.score, reason: s.reason });
    }
    scored.sort((a, b) => b.score - a.score || a.post.slug.localeCompare(b.post.slug));
    guidesByEntry.set(e.slug, scored.slice(0, GUIDE_LIMIT));
  }

  // 9. Editorial comparisons that shadow a templated /compare page.
  const editorialComparisons = new Map<string, GraphPostNode>();
  for (const p of posts) {
    if (p.pageType !== "BLOG_COMPARISON" || p.subjectEntitySlugs.length !== 2) continue;
    const key = comparisonPath(p.subjectEntitySlugs[0], p.subjectEntitySlugs[1]);
    const existing = editorialComparisons.get(key);
    if (!existing || p.wordCount > existing.wordCount) editorialComparisons.set(key, p);
  }

  return {
    site,
    set,
    entries,
    posts,
    entryBySlug,
    entryById,
    postBySlug,
    postById,
    rawEntryById: new Map(entryRows.map((r) => [r.id, r])),
    rawPostById,
    pillarByCluster,
    postsByCluster,
    entriesByCluster,
    seriesByPillar,
    relatedPosts,
    similarEntries,
    guidesByEntry,
    entryInbound,
    postInbound,
    editorialComparisons,
  };
}

const LIVE_CATEGORIES = new Set(cryptoCategories.map((c) => c.slug));

/**
 * Listings whose category the site still has. A row left in a retired
 * category has no page to link to, so it must not enter any block.
 */
export function liveEntryRows(rows: RawEntry[]): RawEntry[] {
  return rows.filter((r) => LIVE_CATEGORIES.has(r.category));
}

const buildCachedGraph = cache(async (site: Site): Promise<ContentGraph> => {
  const [entryRows, postRows] = await Promise.all([
    getRawEntryRows(site),
    getRawPublishedPostRows(site),
  ]);
  return buildContentGraph(liveEntryRows(entryRows), postRows, site);
});

/**
 * The graph for this render. The default is resolved before the cached call —
 * `cache` keys on the arguments as passed, so getContentGraph() and
 * getContentGraph("crypto") would otherwise build it twice.
 */
export function getContentGraph(site: Site = "crypto"): Promise<ContentGraph> {
  return buildCachedGraph(site);
}

export function hubPath(clusterId: string): string {
  return `/topics/${clusterId}`;
}
