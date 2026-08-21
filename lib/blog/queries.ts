// lib/blog/queries.ts
//
// Reads for crypto_blog_posts. Same conventions as lib/crypto/queries.ts:
// snake_case row → camelCase app type, log and return empty on error so a
// failed query degrades to an empty section rather than a blank page.
//
// Posts are authored in the shared manage panel (sidehustletools-main);
// this app only ever reads them.

import { getSupabaseServerSafe } from "@/lib/supabase/safe";
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

export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  const sb = getSupabaseServerSafe();
  if (!sb) return [];

  const pinned = await getPostsBySlugs(post.relatedPostSlugs);
  const picked = pinned.filter((p) => p.id !== post.id).slice(0, limit);
  if (picked.length >= limit) return picked;

  const { data } = await sb
    .from("crypto_blog_posts")
    .select("*")
    .eq("status", "published")
    .eq("category", post.category)
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(limit * 2);

  const seen = new Set(picked.map((p) => p.id));
  for (const row of (data as CryptoBlogPostRow[]) ?? []) {
    if (picked.length >= limit) break;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    picked.push(mapPostRow(row));
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
  if (error) {
    console.error("[getGuidesForListing]", error.message);
    return [];
  }
  return (data as CryptoBlogPostRow[]).map(mapPostRow);
}
