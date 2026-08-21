// lib/ads/queries.ts
//
// Reads for crypto_ads. Kept entirely separate from the organic
// recommendation queries — paid placement must never be selectable by the
// code that picks editorial recommendations.
//
// Campaigns are managed in the shared manage panel (sidehustletools-main);
// this app only reads them.

import { getSupabaseServerSafe } from "@/lib/supabase/safe";
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
 * Picks one live ad for a placement.
 *
 * Category-targeted ads outrank untargeted ones, then priority decides.
 * Among everything tied at the top the choice is random per request — ads
 * should rotate far more often than the daily-seeded organic blocks, so
 * several advertisers can share one slot.
 */
export async function getActiveAd(
  placement: AdPlacement,
  category?: string
): Promise<AdPlacementRecord | null> {
  const sb = getSupabaseServerSafe();
  if (!sb) return null;
  const nowIso = new Date().toISOString();

  const { data, error } = await sb
    .from("crypto_ads")
    .select("*")
    .eq("is_active", true)
    .eq("placement", placement)
    .or(`start_date.is.null,start_date.lte.${nowIso}`)
    .or(`end_date.is.null,end_date.gte.${nowIso}`);

  if (error || !data?.length) {
    if (error) console.error("[getActiveAd]", error.message);
    return null;
  }

  const ads = (data as CryptoAdRow[]).map(mapAdRow);
  const eligible = category ? ads.filter((a) => !a.category || a.category === category) : ads;
  if (!eligible.length) return null;

  const targeted = eligible.filter((a) => a.category === category && category);
  const pool = targeted.length ? targeted : eligible;

  const topPriority = Math.max(...pool.map((a) => a.priority));
  const top = pool.filter((a) => a.priority === topPriority);

  return top[Math.floor(Math.random() * top.length)];
}
