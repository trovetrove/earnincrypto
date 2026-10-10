// lib/seo/graphData.ts
//
// Raw reads for the link graph, plus the pure normalisers that turn rows into
// the shapes lib/seo/linkGraph.ts scores. The graph itself is assembled in
// lib/seo/contentGraph.ts.
//
// Each table is read exactly once per render, and in practice far less often
// than that: both reads go through the Next data cache and a per-instance memo
// (lib/cache/content.ts), so Supabase is only touched when content has
// actually changed or a cache entry has expired. An article page used to read
// crypto_blog_posts four separate times (the post, the related-post pool, the
// inbound-link census and getPublishedPosts) and a listing page ran four
// queries for its sidebars; everything now comes out of these two cached reads.
//
// The cache is cleared by tag from app/api/revalidate/route.ts, which the
// manage panel calls when it publishes.
//
// Both tables are written by the sidehustletools manage panel; this app only
// reads them and picks changes up through its own ISR. Newer columns (cluster,
// revenue_priority, entity_aliases, intent_stage, page_type,
// primary_entry_slug, comparisons) are read defensively with `??`. Every query
// here uses `select("*")`, so the code runs correctly against a database where
// a migration has not been applied yet — those pages simply fall back to
// inferred clusters and default priorities.

import { cache } from "react";
import { getSupabaseServerSafe } from "@/lib/supabase/safe";
import {
  cachedRead,
  processCache,
  TAG_CONTENT,
  TAG_ENTRIES,
  TAG_POSTS,
} from "@/lib/cache/content";
import { resolveCluster, type ClusterSet } from "./clusters";
import type { GraphEntry } from "./linkGraph";

export type Site = "main" | "crypto";

type TableSet = { entries: string; posts: string };

export function tablesFor(site: Site): TableSet {
  return site === "crypto"
    ? { entries: "crypto_entries", posts: "crypto_blog_posts" }
    : { entries: "entries", posts: "blog_posts" };
}

/** Strips markup and collapses whitespace so entity matching sees prose. */
export function toPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

// ── Raw rows ─────────────────────────────────────────────────────────

export type RawEntry = {
  id: string;
  slug: string;
  title: string;
  category: string;
  short_description: string | null;
  description?: string | null;
  realistic_value?: string | null;
  tags: string[] | null;
  alternatives?: string[] | null;
  /** Not a crypto_entries column today; honoured if the admin ever adds it. */
  comparisons?: { vsSlug: string; vsTitle?: string }[] | null;
  referral_url: string | null;
  rating?: number | null;
  is_featured?: boolean | null;
  updated_at: string;
  created_at?: string;
  cluster?: string | null;
  revenue_priority?: number | null;
  entity_aliases?: string[] | null;
  chain?: string | null;
  [key: string]: unknown;
};

export type RawPost = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  category: string;
  content: string | null;
  tags: string[] | null;
  target_keyword: string | null;
  secondary_keywords: string[] | null;
  related_entry_slugs?: string[] | null;
  related_post_slugs?: string[] | null;
  published_at: string | null;
  updated_at: string;
  cluster?: string | null;
  intent_stage?: string | null;
  page_type?: string | null;
  primary_entry_slug?: string | null;
  chain?: string | null;
  [key: string]: unknown;
};

/**
 * The uncached reads. Both throw on failure rather than returning [], which is
 * what keeps a transient Supabase error out of the caches below:
 * `unstable_cache` only stores a fulfilled value, and processCache evicts a
 * rejected slot, so the next request retries instead of serving an empty
 * directory for a week. The exported wrappers turn the rejection back into [].
 *
 * The directory is read whole: at a few hundred rows the table is far smaller
 * than the cost of getting the ranking wrong, and a capped read would make
 * exactly the under-linked listings authority balancing exists to help
 * invisible to the scorer.
 */
async function readEntryRows(site: Site): Promise<RawEntry[]> {
  // No credentials is a stable condition, not a transient failure: cache it.
  const sb = getSupabaseServerSafe();
  if (!sb) return [];

  const { entries } = tablesFor(site);
  const { data, error } = await sb.from(entries).select("*");

  if (error) throw new Error(error.message);
  return (data ?? []) as RawEntry[];
}

async function readPublishedPostRows(site: Site): Promise<RawPost[]> {
  const sb = getSupabaseServerSafe();
  if (!sb) return [];

  const { posts } = tablesFor(site);
  const { data, error } = await sb
    .from(posts)
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as RawPost[];
}

/**
 * One data-cache entry per site per table, built at module scope so the key
 * array is fixed.
 */
const SITES: Site[] = ["main", "crypto"];

function bySite<T>(make: (site: Site) => () => Promise<T>): Record<Site, () => Promise<T>> {
  return Object.fromEntries(SITES.map((s) => [s, make(s)])) as Record<Site, () => Promise<T>>;
}

const cachedEntryReads = bySite<RawEntry[]>((site) =>
  cachedRead(() => readEntryRows(site), ["raw-entry-rows", site], [TAG_CONTENT, TAG_ENTRIES])
);

const cachedPostReads = bySite<RawPost[]>((site) =>
  cachedRead(() => readPublishedPostRows(site), ["raw-post-rows", site], [TAG_CONTENT, TAG_POSTS])
);

const memoEntryRows = processCache<RawEntry[]>((site) => cachedEntryReads[site as Site]());
const memoPostRows = processCache<RawPost[]>((site) => cachedPostReads[site as Site]());

export const getRawEntryRows = cache(async (site: Site): Promise<RawEntry[]> => {
  try {
    return await memoEntryRows(site);
  } catch (err) {
    console.error("[getRawEntryRows]", err instanceof Error ? err.message : err);
    return [];
  }
});

/** Every published article, newest first — the one read all blog surfaces share. */
export const getRawPublishedPostRows = cache(async (site: Site): Promise<RawPost[]> => {
  try {
    return await memoPostRows(site);
  } catch (err) {
    console.error("[getRawPublishedPostRows]", err instanceof Error ? err.message : err);
    return [];
  }
});

// ── Normalisers ──────────────────────────────────────────────────────

export function normaliseEntry(
  row: RawEntry,
  set: ClusterSet,
  inbound: Map<string, number>
): GraphEntry {
  const cluster = resolveCluster(
    row.cluster,
    { slug: row.slug, category: row.category, tags: row.tags ?? [], title: row.title },
    set
  );

  const explicitPriority = row.revenue_priority;
  const revenuePriority =
    typeof explicitPriority === "number" && explicitPriority > 0
      ? explicitPriority
      : (set.byId.get(cluster)?.defaultRevenuePriority ?? 50);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    cluster,
    tags: row.tags ?? [],
    aliases: row.entity_aliases ?? [],
    shortDescription: row.short_description ?? "",
    revenuePriority,
    hasReferral: Boolean(row.referral_url),
    updatedAt: row.updated_at,
    inboundLinks: inbound.get(row.slug) ?? 0,
    chain: row.chain ?? undefined,
    rating: typeof row.rating === "number" ? row.rating : Number(row.rating) || 0,
    alternatives: row.alternatives ?? [],
    comparisonSlugs: (Array.isArray(row.comparisons) ? row.comparisons : [])
      .map((c) => c?.vsSlug)
      .filter((s): s is string => Boolean(s)),
    isFeatured: Boolean(row.is_featured),
  };
}

/**
 * href="/exchanges/bybit" → entry "bybit", href="/blog/x" → post "x".
 * Absolute links to this site count too; hubs and compare pages don't.
 */
export function extractInternalLinks(html: string): { entries: Set<string>; posts: Set<string> } {
  const entries = new Set<string>();
  const posts = new Set<string>();
  const re = /href=["'](?:https?:\/\/(?:www\.)?earnincrypto\.io)?\/([a-z0-9-]+)\/([a-z0-9-]+)\/?(?=["'#?])/gi;
  for (const m of html.matchAll(re)) {
    const first = m[1].toLowerCase();
    const second = m[2].toLowerCase();
    if (first === "blog") posts.add(second);
    else if (first !== "compare" && first !== "topics") entries.add(second);
  }
  return { entries, posts };
}
