// lib/blog/queries.ts
//
// Reads for crypto_blog_posts. Same conventions as lib/crypto/queries.ts:
// snake_case row → camelCase app type. Everything is served from the content
// graph's single cached read of published posts (lib/seo/graphData.ts), so an
// article page, its metadata and its related blocks share one query instead
// of issuing four.
//
// Posts are authored in the shared manage panel (sidehustletools-main);
// this app only ever reads them.

import { cache } from "react";
import { getRawPublishedPostRows } from "@/lib/seo/graphData";
import { getContentGraph, pageTypeLabel } from "@/lib/seo/contentGraph";
import type { GuideReason } from "@/lib/seo/linkGraph";
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

/** All published posts, newest first. Drafts never reach this read. */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  const rows = await getRawPublishedPostRows("crypto");
  return rows.map((r) => mapPostRow(r as unknown as CryptoBlogPostRow));
}

/** Public detail page — drafts must 404, never render. */
export const getPublishedPostBySlug = cache(async (slug: string): Promise<BlogPost | null> => {
  const rows = await getRawPublishedPostRows("crypto");
  const row = rows.find((r) => r.slug === slug);
  return row ? mapPostRow(row as unknown as CryptoBlogPostRow) : null;
});

/**
 * Sibling posts for the "Related Guides" block — straight from the content
 * graph, which picks every article's related set at once (author pins first,
 * then cluster, shared projects, chain and funnel progression) and then
 * repairs the graph so no relevant article is left without inbound links.
 * See lib/seo/contentGraph.ts.
 */
export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  const graph = await getContentGraph("crypto");
  const links = graph.relatedPosts.get(post.id) ?? [];
  return links
    .slice(0, limit)
    .map((l) => graph.rawPostById.get(l.post.id))
    .filter(Boolean)
    .map((r) => mapPostRow(r as unknown as CryptoBlogPostRow));
}

export type EntryGuide = { post: BlogPost; label: string; reason: GuideReason };

/**
 * Articles for a directory listing page — its review, its alternatives, the
 * comparisons it appears in, then its cluster's pillar and siblings. Closes the
 * blog ↔ directory loop on every listing, not just the ones an editor happened
 * to pin somewhere.
 */
export async function getGuidesForEntry(entrySlug: string, limit = 4): Promise<EntryGuide[]> {
  const graph = await getContentGraph("crypto");
  const links = graph.guidesByEntry.get(entrySlug) ?? [];
  return links.slice(0, limit).flatMap((l) => {
    const row = graph.rawPostById.get(l.post.id);
    if (!row) return [];
    const label = l.reason === "pillar" ? "Start here" : pageTypeLabel(l.post.pageType);
    return [{ post: mapPostRow(row as unknown as CryptoBlogPostRow), label, reason: l.reason }];
  });
}
