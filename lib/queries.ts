// lib/crypto/queries.ts
//
// All crypto data fetching — mirrors lib/db/queries.ts pattern.

import { getSupabaseServer } from "@/lib/supabase/server";
import type { CryptoEntryRow, FaqItem } from "@/lib/supabase/types";
import type { CryptoEntry } from "./types";
import { cryptoCategories } from "./data-static";

// ── Row → CryptoEntry mapper ─────────────────────────────────────────
function mapRow(row: CryptoEntryRow): CryptoEntry {
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── All crypto entries ────────────────────────────────────────────────
export async function getAllCryptoEntries(): Promise<CryptoEntry[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("crypto_entries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAllCryptoEntries]", error.message);
    return [];
  }
  return (data as CryptoEntryRow[]).map(mapRow);
}

// ── Single entry by slug ──────────────────────────────────────────────
export async function getCryptoEntryBySlug(slug: string): Promise<CryptoEntry | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("crypto_entries")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[getCryptoEntryBySlug]", error.message);
    }
    return null;
  }
  return mapRow(data as CryptoEntryRow);
}

// ── Entries by category ───────────────────────────────────────────────
export async function getCryptoEntriesByCategory(categorySlug: string): Promise<CryptoEntry[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("crypto_entries")
    .select("*")
    .eq("category", categorySlug)
    .order("is_featured", { ascending: false })
    .order("rating", { ascending: false });

  if (error) {
    console.error("[getCryptoEntriesByCategory]", error.message);
    return [];
  }
  return (data as CryptoEntryRow[]).map(mapRow);
}

// ── Featured entries ──────────────────────────────────────────────────
export async function getFeaturedCryptoEntries(limit = 8): Promise<CryptoEntry[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("crypto_entries")
    .select("*")
    .eq("is_featured", true)
    .order("rating", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getFeaturedCryptoEntries]", error.message);
    return [];
  }
  return (data as CryptoEntryRow[]).map(mapRow);
}

// ── Related entries (same category, exclude current) ──────────────────
export async function getRelatedCryptoEntries(
  categorySlug: string,
  excludeId: string,
  limit = 4
): Promise<CryptoEntry[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("crypto_entries")
    .select("*")
    .eq("category", categorySlug)
    .neq("id", excludeId)
    .order("rating", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getRelatedCryptoEntries]", error.message);
    return [];
  }
  return (data as CryptoEntryRow[]).map(mapRow);
}

// ── Global random picks ───────────────────────────────────────────────
export async function getGlobalRandomCrypto(excludeId: string, limit = 6): Promise<CryptoEntry[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("crypto_entries")
    .select("*")
    .neq("id", excludeId)
    .order("rating", { ascending: false })
    .limit(30);

  if (error || !data) return [];

  // Seeded shuffle for daily rotation
  const d = new Date();
  let seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const arr = [...(data as CryptoEntryRow[])];
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(seed) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, limit).map(mapRow);
}

// ── Stats for homepage ────────────────────────────────────────────────
export async function getCryptoStats() {
  const sb = getSupabaseServer();
  const { count: totalTools } = await sb
    .from("crypto_entries")
    .select("*", { count: "exact", head: true });

  const { count: featuredCount } = await sb
    .from("crypto_entries")
    .select("*", { count: "exact", head: true })
    .eq("is_featured", true);

  const { count: airdropCount } = await sb
    .from("crypto_entries")
    .select("*", { count: "exact", head: true })
    .eq("category", "airdrops");

  return {
    totalTools: totalTools ?? 0,
    featuredCount: featuredCount ?? 0,
    airdropCount: airdropCount ?? 0,
    totalCategories: cryptoCategories.length,
  };
}
