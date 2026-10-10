// lib/crypto/queries.ts
//
// Listing reads. Pages are served from the content graph (lib/seo/
// contentGraph.ts), which reads crypto_entries once per render; the helpers
// here map its rows into the app's CryptoEntry shape. The OG-image helpers at
// the bottom skip the graph and read the cached raw rows directly.
//
// Rows are written by the sidehustletools manage panel; this app only reads.

import { cache } from "react";
import { getContentGraph, liveEntryRows } from "@/lib/seo/contentGraph";
import { getRawEntryRows } from "@/lib/seo/graphData";
import type { CryptoEntry } from "./types";
import { cryptoCategories } from "./data-static";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapCryptoRow(row: any): CryptoEntry {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    description: row.description ?? "",
    shortDescription: row.short_description ?? "",
    url: row.url,
    referralUrl: row.referral_url ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    priceTier: row.price_tier,
    rating: Number(row.rating) || 0,
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
    isMobileFriendly: Boolean(row.is_mobile_friendly),
    isFeatured: Boolean(row.is_featured),
    isVerified: Boolean(row.is_verified),
    metaTitle: row.meta_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
    bestFor: row.best_for ?? undefined,
    faqItems: row.faq_items ?? [],
    // v2 structured fields
    tasks: row.tasks ?? [],
    rewards: row.rewards ?? [],
    requirements: row.requirements ?? [],
    importantDates: row.important_dates ?? [],
    feeTiers: row.fee_tiers ?? [],
    yieldTiers: row.yield_tiers ?? [],
    statsBar: row.stats_bar ?? [],
    socialLinks: row.social_links ?? [],
    supportedAssets: row.supported_assets ?? "",
    cluster: row.cluster || undefined,
    revenuePriority: row.revenue_priority ?? undefined,
    entityAliases: row.entity_aliases ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Graph entries (in whatever order the caller chose) back to full listings. */
export async function entriesFromGraph(ids: string[]): Promise<CryptoEntry[]> {
  const graph = await getContentGraph("crypto");
  return ids
    .map((id) => graph.rawEntryById.get(id))
    .filter(Boolean)
    .map((row) => mapCryptoRow(row));
}

/** A listing, served from the same cached read the link graph uses. */
export const getEntryFromGraph = cache(async (slug: string): Promise<CryptoEntry | null> => {
  const graph = await getContentGraph("crypto");
  const node = graph.entryBySlug.get(slug);
  const row = node ? graph.rawEntryById.get(node.id) : undefined;
  return row ? mapCryptoRow(row) : null;
});

/** Featured first, then rating, then title — the order every list page uses. */
function listingOrder(a: CryptoEntry, b: CryptoEntry): number {
  return Number(b.isFeatured) - Number(a.isFeatured) || b.rating - a.rating || a.title.localeCompare(b.title);
}

export async function getAllCryptoEntries(): Promise<CryptoEntry[]> {
  const graph = await getContentGraph("crypto");
  return graph.entries.map((e) => mapCryptoRow(graph.rawEntryById.get(e.id))).sort(listingOrder);
}

export async function getCryptoEntriesByCategory(categorySlug: string): Promise<CryptoEntry[]> {
  const graph = await getContentGraph("crypto");
  return graph.entries
    .filter((e) => e.category === categorySlug)
    .map((e) => mapCryptoRow(graph.rawEntryById.get(e.id)))
    .sort(listingOrder);
}

export async function getFeaturedCryptoEntries(limit = 8): Promise<CryptoEntry[]> {
  return (await getAllCryptoEntries()).filter((e) => e.isFeatured).slice(0, limit);
}

export async function getCryptoStats() {
  const graph = await getContentGraph("crypto");
  return {
    totalTools: graph.entries.length,
    featuredCount: graph.entries.filter((e) => e.isFeatured).length,
    airdropCount: graph.entries.filter((e) => e.category === "airdrops").length,
    totalCategories: cryptoCategories.filter((c) => graph.entries.some((e) => e.category === c.slug)).length,
  };
}

// ── Edge-runtime reads (OG images) ───────────────────────────────────
//
// OG images render outside the page's React tree, but they read the same
// cached raw rows the pages do (lib/seo/graphData.ts) — one table read shared
// by every card — rather than building the link graph, which a card has no use
// for. A per-slug query would put one data-cache entry, and after a purge one
// Supabase round trip, behind every card a crawler asks for.

const SLUG_SHAPE = /^[a-z0-9][a-z0-9-]{0,80}$/;

export async function getCryptoEntryBySlug(slug: string): Promise<CryptoEntry | null> {
  // A junk slug can't match a row, so don't spend a read finding that out.
  if (!SLUG_SHAPE.test(slug)) return null;

  const row = liveEntryRows(await getRawEntryRows("crypto")).find((r) => r.slug === slug);
  return row ? mapCryptoRow(row) : null;
}

export async function getCryptoCountsDirect() {
  const rows = liveEntryRows(await getRawEntryRows("crypto"));
  return {
    totalTools: rows.length,
    featuredCount: rows.filter((r) => r.is_featured).length,
    airdropCount: rows.filter((r) => r.category === "airdrops").length,
  };
}
