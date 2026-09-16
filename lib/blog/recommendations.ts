// lib/blog/recommendations.ts
//
// Picks directory listings to surface inside blog articles.
//
// This is the per-site wiring around the engine. The scoring itself lives in
// lib/seo/linkGraph.ts and the topic graph in lib/seo/clusters.ts; this file
// loads the pool, decides which selection mode an article warrants, and maps
// the winners back into the `Entry` shape the card components render.
//
// What changed from the previous version, and why it matters:
//
//   * Selection is cluster- and intent-aware rather than category-and-tag
//     similarity. A "Freecash vs Mistplay" reader gets money pages; a "how to
//     make money online" reader gets one good option from each earning cluster.
//   * Under-linked listings are deliberately favoured, so new directory entries
//     stop being invisible.
//   * Picks are stable. The old engine reshuffled daily, which meant no
//     internal link ever persisted long enough to mean anything; variety now
//     comes from a per-article hash instead of from the calendar.
//
// Ads are NOT part of this. Paid placement is selected separately in
// lib/ads/queries.ts so it can never be dressed up as an editorial pick.
//
// Kept in step with the same file in the sidehustletools repo — both sites read
// the same Supabase project and share the engine in lib/seo/.

import {
  clusterSetFor,
  type ClusterSet,
} from "@/lib/seo/clusters";
import {
  getEntryPool,
  getEntryRowsById,
  postToGraphPost,
  type Site,
} from "@/lib/seo/graphData";
import {
  rankEntries,
  selectEntries,
  shouldSpread,
  DISCOVERY_FLOOR,
  RELEVANCE_FLOOR,
  type GraphPost,
  type ScoredEntry,
} from "@/lib/seo/linkGraph";
import type { CryptoEntry } from "@/lib/crypto/types";
import type { BlogPost } from "@/lib/blog/queries";

const SITE: Site = "crypto";

function mapRow(row: any): CryptoEntry {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    description: row.description,
    shortDescription: row.short_description,
    url: row.url,
    referralUrl: row.referral_url ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    priceTier: row.price_tier,
    rating: row.rating,
    potential: row.potential ?? "",
    effortLevel: row.effort_level,
    chain: row.chain ?? undefined,
    token: row.token ?? undefined,
    riskLevel: row.risk_level,
    audience: row.audience ?? [],
    tags: row.tags ?? [],
    pros: row.pros ?? [],
    cons: row.cons ?? [],
    howToUse: row.how_to_use ?? [],
    alternatives: row.alternatives ?? [],
    freeTierDetails: row.free_tier_details ?? undefined,
    realisticValue: row.realistic_value ?? "",
    isMobileFriendly: row.is_mobile_friendly,
    isFeatured: row.is_featured,
    isVerified: row.is_verified,
    metaTitle: row.meta_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
    bestFor: row.best_for ?? undefined,
    faqItems: row.faq_items ?? [],
    tasks: row.tasks ?? [],
    rewards: row.rewards ?? [],
    requirements: row.requirements ?? [],
    importantDates: row.important_dates ?? [],
    feeTiers: row.fee_tiers ?? [],
    yieldTiers: row.yield_tiers ?? [],
    statsBar: row.stats_bar ?? [],
    socialLinks: row.social_links ?? [],
    supportedAssets: row.supported_assets ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function toEntries(scored: ScoredEntry[]): Promise<CryptoEntry[]> {
  const rows = await getEntryRowsById(SITE);
  return scored
    .map((s) => rows.get(s.entry.id))
    .filter(Boolean)
    .map((row) => mapRow(row));
}

type Prepared = {
  graphPost: GraphPost;
  ranked: ScoredEntry[];
  set: ClusterSet;
  pinnedIds: string[];
};

/**
 * Loads and ranks once per article render. Both blocks call this; React's
 * `cache` on the underlying reads means the database is hit once regardless.
 */
async function prepare(post: BlogPost): Promise<Prepared> {
  const set = clusterSetFor(SITE);
  const graphPost = postToGraphPost(
    {
      ...post,
      cluster: post.cluster,
      intentStage: post.intentStage,
      pageType: post.pageType,
      primaryEntrySlug: post.primaryEntrySlug,
    },
    SITE
  );

  const pool = await getEntryPool(SITE);
  const bySlug = new Map(pool.map((e) => [e.slug, e]));

  // Author pins are resolved here rather than with a separate query: the pool
  // is already loaded, and this keeps the author's ordering intact.
  const pinnedIds = post.relatedEntrySlugs
    .map((slug) => bySlug.get(slug)?.id)
    .filter((id): id is string => Boolean(id));

  return { graphPost, ranked: rankEntries(graphPost, pool, set), set, pinnedIds };
}

function pinnedFirst(
  prepared: Prepared,
  chosen: ScoredEntry[],
  limit: number
): ScoredEntry[] {
  if (!prepared.pinnedIds.length) return chosen.slice(0, limit);

  const byId = new Map(prepared.ranked.map((r) => [r.entry.id, r]));
  const pinned = prepared.pinnedIds
    .map((id) => byId.get(id))
    .filter((r): r is ScoredEntry => Boolean(r));

  const seen = new Set(pinned.map((p) => p.entry.id));
  return [...pinned, ...chosen.filter((c) => !seen.has(c.entry.id))].slice(0, limit);
}

/**
 * Tight, highly-relevant block placed mid-article — the one that carries the
 * commercial weight.
 *
 * Broad top-of-funnel articles switch to spread mode here: they are the site's
 * largest traffic source and its weakest converter, so handing the reader one
 * strong option per earning cluster beats five variations of the same thing.
 */
export async function getWhileYoureHereListings(
  post: BlogPost,
  limit = 3
): Promise<CryptoEntry[]> {
  const prepared = await prepare(post);
  const spread = shouldSpread(prepared.graphPost, prepared.set.fallback);

  const chosen = selectEntries(
    prepared.graphPost,
    prepared.ranked,
    prepared.set,
    spread
      ? { limit, floor: DISCOVERY_FLOOR, mode: "spread", maxPerCluster: 1 }
      : { limit, floor: RELEVANCE_FLOOR }
  );

  return toEntries(pinnedFirst(prepared, chosen, limit));
}

/**
 * Broader discovery block, placed later in the article.
 *
 * Pass the entries already shown by getWhileYoureHereEntries so the same
 * listing never appears twice on one page.
 */
export async function getExploreMoreListings(
  post: BlogPost,
  limit = 4,
  exclude: CryptoEntry[] = []
): Promise<CryptoEntry[]> {
  const prepared = await prepare(post);
  const spread = shouldSpread(prepared.graphPost, prepared.set.fallback);

  const chosen = selectEntries(prepared.graphPost, prepared.ranked, prepared.set, {
    limit,
    floor: DISCOVERY_FLOOR,
    crossClusterRatio: 0.25,
    mode: spread ? "spread" : "focused",
    maxPerCluster: 2,
    exclude: new Set(exclude.map((e) => e.id)),
  });

  // Pins belong in the tight block, not repeated down here.
  return toEntries(chosen.slice(0, limit));
}

/**
 * The single best next destination for this article — the funnel CTA.
 *
 * Prefers the author's explicit `primaryEntrySlug`, then the top-scoring
 * candidate that clears the strict floor. Returns null rather than forcing a
 * weak CTA onto an article with no good destination.
 */
export async function getPrimaryDestination(post: BlogPost): Promise<CryptoEntry | null> {
  const prepared = await prepare(post);

  if (post.primaryEntrySlug) {
    const match = prepared.ranked.find((r) => r.entry.slug === post.primaryEntrySlug);
    if (match) return (await toEntries([match]))[0] ?? null;
  }

  const best = prepared.ranked.find(
    (r) => r.score.topicalRelevance >= RELEVANCE_FLOOR && r.entry.revenuePriority >= 50
  );
  if (!best) return null;

  return (await toEntries([best]))[0] ?? null;
}

/**
 * The entity index for in-prose auto-linking: every listing, with the names and
 * aliases the linker matches on.
 *
 * Returns the whole directory rather than pre-filtering to what the article
 * mentions, because matching has to happen against the rendered HTML, not the
 * stored content — selectLinkableEntities() in lib/seo/entityLinker.ts does the
 * filtering and only ever links platforms the author already named.
 */
export async function getEntityLinkIndex(_post: BlogPost): Promise<
  { slug: string; title: string; category: string; aliases: string[]; revenuePriority: number }[]
> {
  const pool = await getEntryPool(SITE);
  return pool.map((e) => ({
    slug: e.slug,
    title: e.title,
    category: e.category,
    aliases: e.aliases,
    revenuePriority: e.revenuePriority,
  }));
}
