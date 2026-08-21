// lib/blog/recommendations.ts
//
// Picks directory listings to surface inside blog articles — the mechanism
// that turns a search visitor on one speculative article into someone
// browsing several parts of the directory.
//
// Scoring is deliberately simple and explainable. On top of the raw ranking
// a minority of slots are reserved for cross-category picks, so an airdrop
// article mostly recommends airdrops but still opens a door to wallets,
// DeFi or security tooling.
//
// Ads are NOT part of this. Paid placement is selected separately in
// lib/ads/queries.ts so it can never be dressed up as an editorial pick.

import { getSupabaseServer } from "@/lib/supabase/server";
import type { CryptoEntry } from "@/lib/crypto/types";
import type { BlogPost } from "@/lib/blog/queries";

const SCORE = {
  categoryMatch: 30,
  tagMatch: 20,
  chainMatch: 15,
  keywordMatch: 15,
  recentlyUpdated: 5,
  featured: 5,
} as const;

/** Share of slots reserved for deliberate cross-category discovery. */
const CROSS_CATEGORY_RATIO = 0.25;

const RECENTLY_UPDATED_DAYS = 45;

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

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Rotates picks daily rather than per request, so two readers on the same
 * article the same day see the same thing and SSR caching stays meaningful.
 * The variety comes across days, not across reloads.
 */
function dailySeed(salt = 0): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + salt;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

function scoreEntry(entry: CryptoEntry, post: BlogPost): number {
  let score = 0;

  if (entry.category === post.category) score += SCORE.categoryMatch;

  const postTags = new Set(post.tags.map((t) => t.toLowerCase()));
  if (entry.tags.some((t) => postTags.has(t.toLowerCase()))) score += SCORE.tagMatch;

  if (post.chain && entry.chain && entry.chain.toLowerCase() === post.chain.toLowerCase()) {
    score += SCORE.chainMatch;
  }

  const keywords = [post.targetKeyword, ...post.secondaryKeywords]
    .filter(Boolean)
    .map((k) => k.toLowerCase());
  const haystack =
    `${entry.title} ${entry.shortDescription} ${entry.tags.join(" ")} ${entry.chain ?? ""}`.toLowerCase();
  if (keywords.some((k) => k && haystack.includes(k))) score += SCORE.keywordMatch;

  const ageDays = (Date.now() - new Date(entry.updatedAt).getTime()) / 86_400_000;
  if (ageDays <= RECENTLY_UPDATED_DAYS) score += SCORE.recentlyUpdated;

  if (entry.isFeatured) score += SCORE.featured;

  return score;
}

async function fetchPool(): Promise<CryptoEntry[]> {
  const sb = getSupabaseServer();
  // Bounded pool — enough breadth to rank meaningfully without reading the
  // whole table on every article render.
  const { data, error } = await sb
    .from("crypto_entries")
    .select("*")
    .order("rating", { ascending: false })
    .limit(300);
  if (error || !data) {
    if (error) console.error("[recommendations:fetchPool]", error.message);
    return [];
  }
  return (data as any[]).map(mapRow);
}

/** Listings explicitly pinned on the post — an editor's judgement beats the scorer. */
async function fetchPinned(slugs: string[]): Promise<CryptoEntry[]> {
  if (!slugs.length) return [];
  const sb = getSupabaseServer();
  const { data, error } = await sb.from("crypto_entries").select("*").in("slug", slugs);
  if (error || !data) return [];
  const bySlug = new Map((data as any[]).map((r) => [r.slug, mapRow(r)]));
  return slugs.map((s) => bySlug.get(s)).filter((e): e is CryptoEntry => Boolean(e));
}

async function recommend(
  post: BlogPost,
  limit: number,
  salt: number,
  excludeIds: Set<string>
): Promise<CryptoEntry[]> {
  const pinned = (await fetchPinned(post.relatedEntrySlugs)).filter(
    (e) => !excludeIds.has(e.id)
  );
  if (pinned.length >= limit) return pinned.slice(0, limit);

  const pool = (await fetchPool()).filter(
    (e) => !excludeIds.has(e.id) && !pinned.some((p) => p.id === e.id)
  );
  if (!pool.length) return pinned;

  const scored = pool
    .map((entry) => ({ entry, score: scoreEntry(entry, post) }))
    .sort((a, b) => b.score - a.score);

  const remaining = limit - pinned.length;
  const crossCount = Math.min(
    Math.round(remaining * CROSS_CATEGORY_RATIO),
    Math.max(0, remaining - 1)
  );
  const relevantCount = remaining - crossCount;

  // Shuffle within the top band rather than always taking the literal top N,
  // so a handful of high scorers don't monopolise every article.
  const seed = dailySeed(salt) + hashString(post.slug);
  const relevantBand = scored.slice(0, Math.max(relevantCount * 3, relevantCount));
  const relevant = seededShuffle(relevantBand, seed)
    .slice(0, relevantCount)
    .map((s) => s.entry);

  const chosen = new Set(relevant.map((e) => e.id));
  const crossPool = scored
    .filter((s) => s.entry.category !== post.category && !chosen.has(s.entry.id))
    .map((s) => s.entry);
  const cross = seededShuffle(crossPool, seed + 7).slice(0, crossCount);

  return [...pinned, ...relevant, ...cross];
}

/**
 * Broad discovery block — mixed relevance, placed later in the article.
 * Pass the ids already shown by getWhileYoureHereListings so the same listing
 * doesn't appear twice on one page.
 */
export function getExploreMoreListings(
  post: BlogPost,
  limit = 4,
  exclude: CryptoEntry[] = []
): Promise<CryptoEntry[]> {
  return recommend(post, limit, 0, new Set(exclude.map((e) => e.id)));
}

/** Tight, highly-relevant block placed mid-article. */
export async function getWhileYoureHereListings(
  post: BlogPost,
  limit = 3
): Promise<CryptoEntry[]> {
  const pinned = await fetchPinned(post.relatedEntrySlugs);
  if (pinned.length >= limit) return pinned.slice(0, limit);

  const pool = (await fetchPool()).filter((e) => !pinned.some((p) => p.id === e.id));
  const scored = pool
    .map((entry) => ({ entry, score: scoreEntry(entry, post) }))
    .filter((s) => s.score >= SCORE.categoryMatch)
    .sort((a, b) => b.score - a.score);

  const seed = dailySeed(3) + hashString(post.slug);
  const band = scored.slice(0, Math.max((limit - pinned.length) * 3, limit));
  return [
    ...pinned,
    ...seededShuffle(band, seed).slice(0, limit - pinned.length).map((s) => s.entry),
  ];
}
