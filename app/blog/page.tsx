import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/blog/queries";
import { cryptoBlogCategories } from "@/lib/blog/categories";
import { BannerAd } from "@/components/ad-slots";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getContentGraph, hubPath, pageTypeLabel } from "@/lib/seo/contentGraph";
import { buildMetadata, formatDate } from "@/lib/seo/metadata";
import { BlogList, type BlogListItem } from "./blog-list";

// ISR window: a week, not an hour. Nothing here changes on its own — it changes
// when an editor publishes, and publishing calls /api/revalidate, which clears
// these pages and the row cache behind them. The window is the backstop for a
// webhook that never arrived, so it costs a render a week per URL instead of
// one an hour whether or not anything changed.
export const revalidate = 604800;

/**
 * The blog index is one indexable page. `?category=` filters are slices of the
 * same list, applied in the browser (./blog-list.tsx): they canonicalise to
 * /blog and middleware.ts sends them `X-Robots-Tag: noindex, follow`, the same
 * way /directory handles its filters. Reading the query string here instead
 * would make the route dynamic and re-render the whole list on every hit.
 *
 * Topic hubs used to live here as `?cluster=` views; they are now real pages
 * under /topics and the old URLs 301 there (see middleware.ts).
 */
export const metadata: Metadata = buildMetadata({
  title: "Crypto Blog: Airdrop Guides, Reviews & Comparisons",
  description:
    "Research-driven guides on crypto airdrops, wallets, DeFi yield, exchanges and trading tools — reviews, head-to-heads and safety checks. No hype, no fake claims.",
  path: "/blog",
});

export default async function BlogIndexPage() {
  const [allPosts, graph] = await Promise.all([getPublishedPosts(), getContentGraph("crypto")]);

  const items: BlogListItem[] = allPosts.map((post) => {
    const node = graph.postById.get(post.id);
    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      subtitle: post.subtitle,
      category: post.category,
      publishedLabel: formatDate(post.publishedAt, "short"),
      isFeatured: post.isFeatured,
      typeLabel: node ? pageTypeLabel(node.pageType) : null,
    };
  });

  // Only offer filters that actually have posts behind them.
  const activeCategories = cryptoBlogCategories.filter((c) =>
    allPosts.some((p) => p.category === c.value)
  );

  // Topic hubs, largest first — an empty cluster is a content gap, not a link.
  const topics = graph.set.clusters
    .map((c) => ({ def: c, count: graph.postsByCluster.get(c.id)?.length ?? 0 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen">
      <section className="border-b border-white/[0.06]">
        <div className="container mx-auto px-4 py-12">
          <Breadcrumbs className="mb-6" items={[{ label: "Home", href: "/" }, { label: "Blog" }]} />
          <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-6xl">
            Crypto <span className="text-[#B39DFF]">Research</span>
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-white/60">
            Airdrop breakdowns, protocol guides and honest reviews — written to answer the question, not to hype a token.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10">
        {/* Topic hubs — the cluster architecture, made navigable */}
        {topics.length > 0 && (
          <nav aria-label="Topics" className="mb-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/50">Topics</p>
            <div className="flex flex-wrap gap-2">
              {topics.map(({ def, count }) => (
                <Link
                  key={def.id}
                  href={hubPath(def.id)}
                  className="border border-white/[0.1] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/60 transition-colors hover:text-white"
                >
                  {def.label}
                  <span className="ml-1.5 opacity-60">{count}</span>
                </Link>
              ))}
            </div>
          </nav>
        )}

        {/* useSearchParams needs a boundary for the page to prerender. */}
        <Suspense fallback={<div className="py-16" />}>
          <BlogList
            posts={items}
            categories={activeCategories}
            banner={<BannerAd id="blog-index" />}
          />
        </Suspense>
      </div>
    </div>
  );
}
