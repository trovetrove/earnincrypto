// app/[category]/[slug]/page.tsx
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getAllCryptoEntries, getEntryFromGraph } from "@/lib/crypto/queries";
import { getCryptoCategoryBySlug } from "@/lib/crypto/data-static";
import { buildMetadata } from "@/lib/seo/metadata";
import { entryMetaDescription, entryMetaTitle } from "@/lib/seo/entryMeta";
import { CryptoDetailPage } from "./_layouts/CryptoDetailPage";

// Listing pages used to render on every request (force-dynamic) with four
// queries each. They are now ISR: served from cache and rebuilt at most hourly,
// which is how edits made in the sidehustletools admin — and newly published
// articles that belong in a listing's "Guides" block — reach this site.
export const revalidate = 3600;
export const dynamicParams = true;

interface Props {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: categorySlug, slug } = await params;
  const entry = await getEntryFromGraph(slug);
  const category = getCryptoCategoryBySlug(categorySlug);
  if (!entry || !category || entry.category !== categorySlug) {
    return { title: "Not Found", robots: { index: false, follow: true } };
  }

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
