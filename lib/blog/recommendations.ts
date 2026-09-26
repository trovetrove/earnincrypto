// lib/blog/recommendations.ts
//
// Picks directory listings to surface inside blog articles.
//
// This is the per-site wiring around the engine. The scoring itself lives in
// lib/seo/linkGraph.ts, the topic graph in lib/seo/clusters.ts and the
// page-level graph (intent, subject projects, pillars) in
// lib/seo/contentGraph.ts; this file decides which selection mode an article
// warrants and maps the winners back into the `CryptoEntry` shape the cards
// render.
//
//   * Selection is cluster-, chain- and intent-aware. Intent comes from the
//     article's title and slug as well as the admin fields, so "5 Binance
//     Alternatives" is treated as a comparison-stage page, not a beginner guide.
//   * Under-linked listings are deliberately favoured, so new directory entries
//     stop being invisible.
//   * Picks are stable: variety comes from a per-article hash, never the
//     calendar, so an internal link persists long enough to mean something.
//   * The blocks on one page never repeat a listing: the next-step CTA, the
//     mid-article block and the discovery block are chosen as one set.
//
// Ads are NOT part of this. Paid placement is selected separately in
// lib/ads/queries.ts so it can never be dressed up as an editorial pick.

import { getContentGraph, type ContentGraph } from "@/lib/seo/contentGraph";
import {
  rankEntries,
  selectEntries,
  shouldSpread,
  DISCOVERY_FLOOR,
  RELEVANCE_FLOOR,
  type ScoredEntry,
} from "@/lib/seo/linkGraph";
import { entriesFromGraph } from "@/lib/crypto/queries";
import type { CryptoEntry } from "@/lib/crypto/types";
import type { BlogPost } from "@/lib/blog/queries";

export type ArticlePicks = {
  primary: ScoredEntry | null;
  whileHere: ScoredEntry[];
  exploreMore: ScoredEntry[];
};

export type ArticleRecommendations = {
  primary: CryptoEntry | null;
  whileHere: CryptoEntry[];
  exploreMore: CryptoEntry[];
};

/**
 * Every directory block for one article, chosen together so no listing appears
 * twice on the page. Pure — the graph harness calls it directly.
 *
 *   primary     — the single funnel CTA: the author's primaryEntrySlug, else the
 *                 top money page that clears the strict relevance floor, else
 *                 nothing (a weak CTA is worse than none).
 *   whileHere   — the tight, commercially weighted block after the first
 *                 section. Broad top-of-funnel articles switch to spread mode:
 *                 one strong option per cluster beats five variations of one.
 *   exploreMore — the looser discovery block, with a minority of slots for
 *                 adjacent clusters.
 */
export function pickArticleListings(
  graph: ContentGraph,
  postId: string,
  sizes: { whileHere: number; exploreMore: number }
): ArticlePicks {
  const graphPost = graph.postById.get(postId);
  if (!graphPost) return { primary: null, whileHere: [], exploreMore: [] };
  const set = graph.set;

  // A reader of "Binance Alternatives" is looking to leave Binance. The
  // exchange stays linked where the author names it in the prose, but no
  // recommendation block or next-step CTA offers it back — not even when the
  // admin pinned it, which older alternatives posts routinely did.
  const excludedSubjects =
    graphPost.pageType === "BLOG_ALTERNATIVES"
      ? new Set(
          graphPost.subjectEntitySlugs
            .map((s) => graph.entryBySlug.get(s)?.id)
            .filter((id): id is string => Boolean(id))
        )
      : new Set<string>();
  const ranked = rankEntries(graphPost, graph.entries, set).filter(
    (r) => !excludedSubjects.has(r.entry.id)
  );
  const byId = new Map(ranked.map((r) => [r.entry.id, r]));

  const used = new Set<string>();

  let primary: ScoredEntry | undefined;
  if (graphPost.primaryEntrySlug) {
    primary = ranked.find((r) => r.entry.slug === graphPost.primaryEntrySlug);
  }
  primary ??= ranked.find(
    (r) => r.score.topicalRelevance >= RELEVANCE_FLOOR && r.entry.revenuePriority >= 50
  );
  if (primary) used.add(primary.entry.id);

  const spread = shouldSpread(graphPost, set.fallback);
  const whileChosen = selectEntries(
    graphPost,
    ranked,
    set,
    spread
      ? { limit: sizes.whileHere, floor: DISCOVERY_FLOOR, mode: "spread", maxPerCluster: 1, exclude: used }
      : { limit: sizes.whileHere, floor: RELEVANCE_FLOOR, exclude: used }
  );

  // Author pins lead the tight block, in the author's order.
  const pinned = graphPost.relatedEntrySlugs
    .map((slug) => graph.entryBySlug.get(slug)?.id)
    .filter((id): id is string => Boolean(id) && !used.has(id!))
    .map((id) => byId.get(id))
    .filter((r): r is ScoredEntry => Boolean(r));
  const pinnedIds = new Set(pinned.map((p) => p.entry.id));
  const whileHere = [...pinned, ...whileChosen.filter((c) => !pinnedIds.has(c.entry.id))].slice(
    0,
    sizes.whileHere
  );
  for (const p of whileHere) used.add(p.entry.id);

  const exploreMore = selectEntries(graphPost, ranked, set, {
    limit: sizes.exploreMore,
    floor: DISCOVERY_FLOOR,
    crossClusterRatio: 0.25,
    mode: spread ? "spread" : "focused",
    maxPerCluster: 2,
    exclude: used,
  }).slice(0, sizes.exploreMore);

  return { primary: primary ?? null, whileHere, exploreMore };
}

export async function getArticleRecommendations(
  post: BlogPost,
  sizes: { whileHere: number; exploreMore: number }
): Promise<ArticleRecommendations> {
  const graph = await getContentGraph("crypto");
  const picks = pickArticleListings(graph, post.id, sizes);
  const [primary, whileHere, exploreMore] = await Promise.all([
    picks.primary ? entriesFromGraph([picks.primary.entry.id]).then((e) => e[0] ?? null) : null,
    entriesFromGraph(picks.whileHere.map((p) => p.entry.id)),
    entriesFromGraph(picks.exploreMore.map((p) => p.entry.id)),
  ]);
  return { primary, whileHere, exploreMore };
}

/**
 * The entity index for in-prose auto-linking: every listing, with the names and
 * aliases the linker matches on. selectLinkableEntities() in
 * lib/seo/entityLinker.ts filters this down to projects the author named.
 */
export async function getEntityLinkIndex(): Promise<
  { slug: string; title: string; category: string; aliases: string[]; revenuePriority: number }[]
> {
  const graph = await getContentGraph("crypto");
  return graph.entries.map((e) => ({
    slug: e.slug,
    title: e.title,
    category: e.category,
    aliases: e.aliases,
    revenuePriority: e.revenuePriority,
  }));
}
