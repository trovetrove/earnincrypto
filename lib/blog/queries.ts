// lib/blog/queries.ts
//
// Reads for crypto_blog_posts. Same conventions as lib/crypto/queries.ts:
// snake_case row → camelCase app type, log and return empty on error so a
// failed query degrades to an empty section rather than a blank page.
//
// Posts are authored in the shared manage panel (sidehustletools-main);
// this app only ever reads them.

import { getSupabaseServerSafe } from "@/lib/supabase/safe";
import { clusterSetFor } from "@/lib/seo/clusters";
import {
  getEntryPoolBySlug,
  getPostPool,
  postToGraphPost,
} from "@/lib/seo/graphData";
import { rankRelatedPosts } from "@/lib/seo/linkGraph";
import type {
  CryptoBlogPostRow,
  FaqItem,
  OpportunityStatus,
  PostStatus,
} from "@/lib/supabase/types";

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  content: string;
  coverImageUrl?: string;
  category: string;
  tags: string[];
  chain?: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogImageUrl?: string;
  relatedEntrySlugs: string[];
  relatedPostSlugs: string[];
  // Topic-graph fields. Blank/undefined means "let the engine infer it" —
  // see lib/seo/clusters.ts.
  cluster?: string;
  intentStage?: string;
  pageType?: string;
  primaryEntrySlug?: string;
  status: PostStatus;
  isFeatured: boolean;
  authorName: string;
  faqItems: FaqItem[];
  opportunityStatus?: OpportunityStatus;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export function mapPostRow(row: CryptoBlogPostRow): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    subtitle: row.subtitle ?? "",
    content: row.content ?? "",
    coverImageUrl: row.cover_image_url ?? undefined,
    category: row.category,
    tags: row.tags ?? [],
    chain: row.chain ?? undefined,
    targetKeyword: row.target_keyword ?? "",
    secondaryKeywords: row.secondary_keywords ?? [],
    metaTitle: row.meta_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
    canonicalUrl: row.canonical_url ?? undefined,
    ogImageUrl: row.og_image_url ?? undefined,
    relatedEntrySlugs: row.related_entry_slugs ?? [],
    relatedPostSlugs: row.related_post_slugs ?? [],
    cluster: row.cluster || undefined,
    intentStage: row.intent_stage || undefined,
    pageType: row.page_type || undefined,
    primaryEntrySlug: row.primary_entry_slug || undefined,
    status: row.status,
    isFeatured: row.is_featured,
    authorName: row.author_name ?? "",
    faqItems: row.faq_items ?? [],
    opportunityStatus: row.opportunity_status ?? undefined,
    publishedAt: row.published_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const sb = getSupabaseServerSafe();
  if (!sb) return [];
  const { data, error } = await sb
    .from("crypto_blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) {
    console.error("[getPublishedPosts]", error.message);
    return [];
  }
  return (data as CryptoBlogPostRow[]).map(mapPostRow);
}

/** Drafts must 404, never render. */
export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  const sb = getSupabaseServerSafe();
  if (!sb) return null;
  const { data, error } = await sb
    .from("crypto_blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  if (error) {
    if (error.code !== "PGRST116") console.error("[getPublishedPostBySlug]", error.message);
    return null;
  }
  return mapPostRow(data as CryptoBlogPostRow);
}

export async function getPostsBySlugs(slugs: string[]): Promise<BlogPost[]> {
  if (!slugs.length) return [];
  const sb = getSupabaseServerSafe();
  if (!sb) return [];
  const { data, error } = await sb
    .from("crypto_blog_posts")
    .select("*")
    .in("slug", slugs)
    .eq("status", "published");
  if (error) {
    console.error("[getPostsBySlugs]", error.message);
    return [];
  }
  return (data as CryptoBlogPostRow[]).map(mapPostRow);
}

/**
 * Sibling posts for the "Related Articles" block.
 *
 * Author pins come first, then the topic graph fills the rest — picking on
 * cluster affinity, chain and *intent progression*, so a guide hands off to a
 * roundup and a roundup hands off to a head-to-head comparison.
 *
 * The previous implementation took the newest posts in the same category, which
 * amounted to "show whatever was published last".
 */
export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  const pinned = await getPostsBySlugs(post.relatedPostSlugs);
  const picked = pinned.filter((p) => p.id !== post.id).slice(0, limit);
  if (picked.length >= limit) return picked;

  const set = clusterSetFor("crypto");
  const [pool, all] = await Promise.all([getPostPool("crypto"), getPublishedPosts()]);
  const byId = new Map(all.map((p) => [p.id, p]));

  const ranked = rankRelatedPosts(postToGraphPost(post, "crypto"), pool, set);

  const seen = new Set(picked.map((p) => p.id));
  for (const { post: candidate } of ranked) {
    if (picked.length >= limit) break;
    if (seen.has(candidate.id)) continue;
    const full = byId.get(candidate.id);
    if (!full) continue;
    seen.add(candidate.id);
    picked.push(full);
  }
  return picked;
}

/**
 * Articles that point at a given directory listing — powers the
 * "Related Guides" block on listing pages, closing the blog ↔ directory loop.
 */
export async function getGuidesForListing(
  entrySlug: string,
  limit = 3
): Promise<BlogPost[]> {
  const sb = getSupabaseServerSafe();
  if (!sb) return [];

  const { data, error } = await sb
    .from("crypto_blog_posts")
    .select("*")
    .eq("status", "published")
    .contains("related_entry_slugs", JSON.stringify([entrySlug]))
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) console.error("[getGuidesForListing]", error.message);

  const pinned = ((data as CryptoBlogPostRow[]) ?? []).map(mapPostRow);
  if (pinned.length >= limit) return pinned;

  // Fall back to the topic graph. Pinning is manual and most listings have
  // never been pinned anywhere, which left their pages with an empty "Related
  // Guides" block and no path back into the blog — a dead end on exactly the
  // pages that are supposed to convert.
  const [pool, entries, all] = await Promise.all([
    getPostPool("crypto"),
    getEntryPoolBySlug("crypto"),
    getPublishedPosts(),
  ]);

  const entry = entries.get(entrySlug);
  if (!entry) return pinned;

  const byId = new Map(all.map((p) => [p.id, p]));
  const seen = new Set(pinned.map((p) => p.id));
  const names = [entry.title, ...entry.aliases]
    .map((n) => n.toLowerCase().trim())
    .filter((n) => n.length >= 3);

  const scored = pool
    .filter((p) => !seen.has(p.id))
    .map((p) => {
      const mentions = names.some(
        (n) => p.title.toLowerCase().includes(n) || p.text.includes(n)
      );
      const sameCluster = p.cluster === entry.cluster;
      if (!mentions && !sameCluster) return null;
      return { post: p, score: (mentions ? 100 : 0) + (sameCluster ? 50 : 0) };
    })
    .filter((x): x is { post: (typeof pool)[number]; score: number } => x !== null)
    .sort((a, b) => b.score - a.score);

  const out = [...pinned];
  for (const { post } of scored) {
    if (out.length >= limit) break;
    const full = byId.get(post.id);
    if (!full) continue;
    out.push(full);
  }
  return out;
}
