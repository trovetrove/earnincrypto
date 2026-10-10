// app/[category]/[slug]/page.tsx
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getAllCryptoEntries, getEntryFromGraph } from "@/lib/crypto/queries";
import { getCryptoCategoryBySlug } from "@/lib/crypto/data-static";
import { buildMetadata } from "@/lib/seo/metadata";
import { entryMetaDescription, entryMetaTitle } from "@/lib/seo/entryMeta";
import { isSlugLike } from "@/lib/seo/paths";
import { CryptoDetailPage } from "./_layouts/CryptoDetailPage";

// Listing pages used to render on every request (force-dynamic) with four
// queries each. They are now ISR: served from cache and rebuilt weekly, or on
// publish via /api/revalidate, which is how edits made in the sidehustletools
// admin — and newly published articles that belong in a listing's "Guides"
// block — reach this site.
export const revalidate = 604800;
// On, because a listing published after the last deploy has to resolve. The
// cost is that this route is where path-probing bots land, which is why both
// entry points below reject an impossible path before touching the graph.
export const dynamicParams = true;

interface Props {
  params: Promise<{ category: string; slug: string }>;
}

/**
 * Could this path name a listing at all? The category list is compiled in, and
 * the slug shape is the one the manage panel enforces, so a miss here is a
 * 404 that costs nothing — no database read, no content graph.
 */
function isPossibleListingPath(categorySlug: string, slug: string): boolean {
  return isSlugLike(slug) && Boolean(getCryptoCategoryBySlug(categorySlug));
}

const NOT_FOUND_METADATA: Metadata = { title: "Not Found", robots: { index: false, follow: true } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: categorySlug, slug } = await params;
  if (!isPossibleListingPath(categorySlug, slug)) return NOT_FOUND_METADATA;

  const entry = await getEntryFromGraph(slug);
  if (!entry || entry.category !== categorySlug) return NOT_FOUND_METADATA;

  return buildMetadata({
    title: entryMetaTitle(entry),
    description: entryMetaDescription(entry),
    path: `/${categorySlug}/${slug}`,
    type: "article",
    // app/[category]/[slug]/opengraph-image.tsx renders a per-listing card.
    fileBasedImage: true,
    modifiedTime: entry.updatedAt,
  });
}

export async function generateStaticParams() {
  try {
    const entries = await getAllCryptoEntries();
    return entries.map((e) => ({ category: e.category, slug: e.slug }));
  } catch (err) {
    console.error("[generateStaticParams] failed, skipping static generation:", err);
    return [];
  }
}

export default async function CryptoDetailPageRoute({ params }: Props) {
  const { category: categorySlug, slug } = await params;
  if (!isSlugLike(slug)) notFound();

  const entry = await getEntryFromGraph(slug);
  if (!entry) notFound();

  // A listing reached under the wrong category — typically because an editor
  // moved it — is the same page at a new URL. Redirect permanently rather than
  // 404ing (or, as before, rendering a duplicate under both paths), so links
  // and rankings pointing at the old path carry over.
  if (entry.category !== categorySlug) permanentRedirect(`/${entry.category}/${entry.slug}`);

  const category = getCryptoCategoryBySlug(categorySlug);
  if (!category) notFound();

  return <CryptoDetailPage entry={entry} category={category} />;
}
