import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/blog/queries";
import { cryptoBlogCategories } from "@/lib/blog/categories";
import { BannerAd } from "@/components/ad-slots";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getContentGraph, hubPath, pageTypeLabel } from "@/lib/seo/contentGraph";
import { buildMetadata, formatDate } from "@/lib/seo/metadata";

export const revalidate = 600;

/**
 * The blog index is one indexable page. `?category=` filters are slices of the
 * same list: they canonicalise to /blog and are noindexed. Topic hubs used to
 * live here as `?cluster=` views; they are now real pages under /topics and the
 * old URLs 301 there (see middleware.ts).
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}): Promise<Metadata> {
  const { category } = await searchParams;
  return buildMetadata({
    title: "Crypto Blog: Airdrop Guides, Reviews & Comparisons",
    description:
      "Research-driven guides on crypto airdrops, wallets, DeFi yield, exchanges and trading tools — reviews, head-to-heads and safety checks. No hype, no fake claims.",
    path: "/blog",
    noindex: Boolean(category),
  });
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [allPosts, graph] = await Promise.all([getPublishedPosts(), getContentGraph("crypto")]);

  const posts = category ? allPosts.filter((p) => p.category === category) : allPosts;
  const featured = !category ? posts.find((p) => p.isFeatured) : undefined;
  const rest = featured ? posts.filter((p) => p.id !== featured.id) : posts;

  // Only offer filters that actually have posts behind them.
  const activeCategories = cryptoBlogCategories.filter((c) =>
    allPosts.some((p) => p.category === c.value)
  );

  // Topic hubs, largest first — an empty cluster is a content gap, not a link.
  const topics = graph.set.clusters
    .map((c) => ({ def: c, count: graph.postsByCluster.get(c.id)?.length ?? 0 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  const typeOf = (id: string) => {
    const node = graph.postById.get(id);
    return node ? pageTypeLabel(node.pageType) : null;
  };

  const chip = (active: boolean) =>
    `border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
      active
        ? "border-[#7C4DFF] bg-[#7C4DFF]/15 text-[#B39DFF]"
        : "border-white/[0.1] text-white/60 hover:text-white"
    }`;

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
                <Link key={def.id} href={hubPath(def.id)} className={chip(false)}>
                  {def.label}
                  <span className="ml-1.5 opacity-60">{count}</span>
                </Link>
              ))}
            </div>
          </nav>
        )}

        {/* Article-type filter */}
        {activeCategories.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <Link href="/blog" className={chip(!category)}>
              All
            </Link>
            {activeCategories.map((c) => (
              <Link key={c.value} href={`/blog?category=${c.value}`} className={chip(category === c.value)}>
                {c.label}
              </Link>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <p className="py-16 text-center text-white/55">
            {category ? "Nothing published under this filter yet." : "No posts published yet. Check back soon."}
          </p>
        ) : (
          <div className="space-y-8">
            {featured && (
              <Link
                href={`/blog/${featured.slug}`}
                className="group block border border-white/[0.08] bg-white/[0.02] p-7 transition-all hover:border-[#7C4DFF]/40 hover:bg-white/[0.04]"
              >
                <span className="mb-3 inline-block bg-[#F5C842] px-2 py-0.5 text-[10px] font-bold uppercase text-[#0a0a0a]">
                  Featured
                </span>
                <h2 className="font-display text-2xl font-bold leading-tight text-white transition-colors group-hover:text-[#B39DFF] md:text-3xl">
                  {featured.title}
                </h2>
                {featured.subtitle && (
                  <p className="mt-2 max-w-3xl text-white/60">{featured.subtitle}</p>
                )}
                <p className="mt-3 text-xs text-white/50">{formatDate(featured.publishedAt, "short")}</p>
              </Link>
            )}

            <BannerAd id="blog-index" />

            <h2 className="sr-only">{category ? "Filtered articles" : "All articles"}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col gap-2 border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                >
                  {typeOf(post.id) && (
                    <span className="w-fit border border-white/[0.1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/60">
                      {typeOf(post.id)}
                    </span>
                  )}
                  <h3 className="font-display text-base font-bold leading-snug text-white transition-colors group-hover:text-[#B39DFF]">
                    {post.title}
                  </h3>
                  {post.subtitle && (
                    <p className="text-sm leading-relaxed text-white/55 line-clamp-3">{post.subtitle}</p>
                  )}
                  <p className="mt-auto pt-2 text-[11px] text-white/50">{formatDate(post.publishedAt, "short")}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
