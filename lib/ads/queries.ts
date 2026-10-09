// lib/ads/queries.ts
//
// Reads for crypto_ads. Kept entirely separate from the organic
// recommendation queries — paid placement must never be selectable by the
// code that picks editorial recommendations.
//
// Campaigns are managed in the shared manage panel (sidehustletools-main);
// this app only reads them.

import { cache } from "react";
import { getSupabaseServerSafe } from "@/lib/supabase/safe";
import {
  ADS_REVALIDATE_SECONDS,
  cachedRead,
  processCache,
  TAG_ADS,
  TAG_CONTENT,
} from "@/lib/cache/content";
import type { CryptoAdRow, AdPlacement } from "@/lib/supabase/types";

export type AdPlacementRecord = {
  id: string;
  advertiser: string;
  title: string;
  description: string;
  imageUrl?: string;
  destinationUrl: string;
  category: string;
  placement: AdPlacement;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  priority: number;
  sponsoredLabel: string;
};

function mapAdRow(row: CryptoAdRow): AdPlacementRecord {
  return {
    id: row.id,
    advertiser: row.advertiser,
    title: row.title,
    description: row.description ?? "",
    imageUrl: row.image_url ?? undefined,
    destinationUrl: row.destination_url,
    category: row.category ?? "",
    placement: row.placement,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    isActive: row.is_active,
    priority: row.priority,
    sponsoredLabel: row.sponsored_label ?? "Sponsored",
  };
}

/**
 * Every active ad. The serving window used to be a `now` in the query, which
 * made the read uncacheable — a different SQL string every second — so this
 * fetches the active campaigns and applies the window in JS instead. The
 * result is a stable cache key, one hourly query per region at most, and a
 * table small enough that filtering a handful of rows costs nothing.
 */
async function readActiveAds(): Promise<AdPlacementRecord[]> {
  const sb = getSupabaseServerSafe();
  if (!sb) return [];

  const { data, error } = await sb.from("crypto_ads").select("*").eq("is_active", true);

  if (error) throw new Error(error.message);
  return ((data ?? []) as CryptoAdRow[]).map(mapAdRow);
}

const cachedActiveAds = cachedRead(
  readActiveAds,
  ["crypto-ads-active"],
  [TAG_CONTENT, TAG_ADS],
  ADS_REVALIDATE_SECONDS
);

const memoActiveAds = processCache<AdPlacementRecord[]>(() => cachedActiveAds());

function isServing(ad: AdPlacementRecord, nowIso: string): boolean {
  if (ad.startDate && ad.startDate > nowIso) return false;
  if (ad.endDate && ad.endDate < nowIso) return false;
  return true;
}

/**
 * Every ad currently inside its serving window, read once per render. An
 * article page has four slots; they used to issue four identical queries.
 */
const getLiveAds = cache(async (): Promise<AdPlacementRecord[]> => {
  let ads: AdPlacementRecord[];
  try {
    ads = await memoActiveAds("crypto-ads");
  } catch (err) {
    console.error("[getLiveAds]", err instanceof Error ? err.message : err);
    return [];
  }
  const nowIso = new Date().toISOString();
  return ads.filter((a) => isServing(a, nowIso));
});

/**
 * Picks one live ad for a placement.
 *
 * Category-targeted ads outrank untargeted ones, then priority decides.
 * Among everything tied at the top the choice is random per render — ads
 * rotate between revalidations while the organic blocks stay put, so several
 * advertisers can share one slot.
 */
export async function getActiveAd(
  placement: AdPlacement,
  category?: string
): Promise<AdPlacementRecord | null> {
  const ads = (await getLiveAds()).filter((a) => a.placement === placement);
  if (!ads.length) return null;

  const eligible = category ? ads.filter((a) => !a.category || a.category === category) : ads;
  if (!eligible.length) return null;

  const targeted = eligible.filter((a) => a.category === category && category);
  const pool = targeted.length ? targeted : eligible;

  const topPriority = Math.max(...pool.map((a) => a.priority));
  const top = pool.filter((a) => a.priority === topPriority);

  return top[Math.floor(Math.random() * top.length)];
}
