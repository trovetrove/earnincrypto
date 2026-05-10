// app/sitemap.ts
import type { MetadataRoute } from "next";
import { getSupabaseServer } from "@/lib/supabase/server";
import { categories } from "@/lib/data-static";
import { cryptoCategories } from "@/lib/crypto/data-static";

export const revalidate = 43200; // 12 hours

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sidehustletools.app";

type SitemapEntry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = getSupabaseServer();
  const urls: SitemapEntry[] = [];


  // ── Crypto static pages ─────────────────────────────────────────────
  urls.push(
    { url: `${BASE}/crypto`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/crypto/directory`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  );

  // ── Crypto category pages ───────────────────────────────────────────
  for (const cat of cryptoCategories) {
    urls.push({
      url: `${BASE}/crypto/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  // ── Crypto entry pages ──────────────────────────────────────────────
  const { data: cryptoEntries } = await sb
    .from("crypto_entries")
    .select("slug, category, updated_at")
    .order("updated_at", { ascending: false });

  for (const entry of cryptoEntries ?? []) {
    urls.push({
      url: `${BASE}/crypto/${entry.category}/${entry.slug}`,
      lastModified: new Date(entry.updated_at),
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  return urls;
}
