// app/sitemap.ts
import type { MetadataRoute } from "next";
import { getSupabaseServer } from "@/lib/supabase/server";
import { cryptoCategories } from "@/lib/crypto/data-static";
import { clusterSetFor, resolveCluster } from "@/lib/seo/clusters";

export const revalidate = 43200; // 12 hours

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://earnincrypto.io";

type SitemapEntry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = getSupabaseServer();
  const urls: SitemapEntry[] = [];

  // ── Static pages ────────────────────────────────────────────────────
  urls.push(
    // One entry for the homepage. There were two — `BASE` and `${BASE}` are the
    // same string, so the sitemap was submitting the root URL twice with
    // conflicting priorities.
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/directory`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
  );

  // ── Blog posts (published only — drafts must never be submitted) ────
  const { data: posts } = await sb
    .from("crypto_blog_posts")
    .select("slug, title, category, tags, target_keyword, secondary_keywords, cluster, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  for (const post of posts ?? []) {
    urls.push({
      url: `${BASE}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // ── Topic hubs ──────────────────────────────────────────────────────
  // Only clusters with published articles behind them, and lastmod taken from
  // the newest article in the hub rather than "now" — Google reads lastmod as a
  // claim that something meaningfully changed, and a sitemap that says every
  // URL changed on every crawl gets the field ignored.
  const set = clusterSetFor("crypto");
  const hubLastMod = new Map<string, Date>();

  for (const post of posts ?? []) {
    const id = resolveCluster(
      (post as { cluster?: string | null }).cluster,
      {
        slug: post.slug,
        category: post.category,
        tags: (post.tags as string[]) ?? [],
        title: post.title,
        keywords: [
          (post.target_keyword as string) ?? "",
          ...(((post.secondary_keywords as string[]) ?? [])),
        ],
      },
      set
    );
    const updated = new Date(post.updated_at);
    const current = hubLastMod.get(id);
    if (!current || updated > current) hubLastMod.set(id, updated);
  }

  for (const [id, lastModified] of hubLastMod) {
    urls.push({
      url: `${BASE}/blog?cluster=${id}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  // ── Category pages ──────────────────────────────────────────────────
  for (const cat of cryptoCategories) {
    urls.push({
      url: `${BASE}/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    });
  }

  // ── Entry pages ─────────────────────────────────────────────────────
  const { data: entries } = await sb
    .from("crypto_entries")
    .select("slug, category, updated_at")
    .order("updated_at", { ascending: false });

  for (const entry of entries ?? []) {
    urls.push({
      url: `${BASE}/${entry.category}/${entry.slug}`,
      lastModified: new Date(entry.updated_at),
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  return urls;
}
