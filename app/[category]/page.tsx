// app/[category]/page.tsx
//
// The commercial list for one kind of listing. It hands off to the topic hubs
// its listings belong to (/trading-tools sits in the exchanges topic) and to
// their pillar guides, so the directory and the blog link both ways instead of
// the category page being a dead-end grid.

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookOpen } from "lucide-react";
import { getCryptoCategoryBySlug, cryptoCategories } from "@/lib/crypto/data-static";
import { getCryptoEntriesByCategory } from "@/lib/crypto/queries";
import { CryptoEntryCard } from "@/components/crypto/CryptoEntryCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { getContentGraph, hubPath, type GraphPostNode } from "@/lib/seo/contentGraph";
import { clusterAffinity } from "@/lib/seo/clusters";
import { absoluteUrl, buildMetadata } from "@/lib/seo/metadata";
import { itemListJsonLd } from "@/lib/seo/structuredData";
import { BannerAd } from "@/components/ad-slots";
import { safeJsonLd } from "@/lib/utils";

// ISR window: a day, not an hour. Nothing here changes on its own — it changes
// when an editor publishes, and publishing calls /api/revalidate, which clears
// these pages and the row cache behind them. The window is the backstop for a
// webhook that never arrived, so it costs a render a day per URL instead of
// one an hour whether or not anything changed.
export const revalidate = 86400;
// The category list is static and complete, so anything else is a 404 from the
// router without ever reaching this module.
export const dynamicParams = false;

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCryptoCategoryBySlug(slug);
  if (!category) return { title: "Category Not Found", robots: { index: false, follow: true } };
  const entries = await getCryptoEntriesByCategory(slug);

  return buildMetadata({
    title: category.seoTitle,
    description: category.seoDescription,
    path: `/${category.slug}`,
    // An empty category is a placeholder, not a page worth ranking.
    noindex: entries.length === 0,
  });
}

export function generateStaticParams() {
  return cryptoCategories.map((c) => ({ category: c.slug }));
}

export default async function CryptoCategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const category = getCryptoCategoryBySlug(slug);
  if (!category) notFound();

  const [entries, graph] = await Promise.all([getCryptoEntriesByCategory(slug), getContentGraph("crypto")]);
  const nodes = graph.entries.filter((e) => e.category === slug);

  // Topic hubs this category's listings belong to, biggest first.
  const clusterCounts = new Map<string, number>();
  for (const n of nodes) clusterCounts.set(n.cluster, (clusterCounts.get(n.cluster) ?? 0) + 1);
  const topics = [...clusterCounts.entries()]
    .map(([id, count]) => ({
      def: graph.set.byId.get(id),
      count,
      articles: graph.postsByCluster.get(id)?.length ?? 0,
      pillar: graph.pillarByCluster.get(id),
    }))
    .filter((t): t is typeof t & { def: NonNullable<typeof t.def> } => Boolean(t.def))
    .sort((a, b) => b.count - a.count);

  // Guides: each topic's pillar first, then its newest articles, up to six.
  const guides: GraphPostNode[] = [];
  const seen = new Set<string>();
  for (const t of topics) {
    if (t.pillar && !seen.has(t.pillar.id)) {
      seen.add(t.pillar.id);
      guides.push(t.pillar);
    }
  }
  for (const t of topics) {
    for (const p of graph.postsByCluster.get(t.def.id) ?? []) {
      if (guides.length >= 6) break;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      guides.push(p);
    }
  }

  // Related categories: those whose listings share or neighbour these topics.
  const related = cryptoCategories
    .filter((c) => c.slug !== category.slug)
    .map((c) => {
      const theirs = new Set(graph.entries.filter((e) => e.category === c.slug).map((e) => e.cluster));
      let score = 0;
      for (const mine of clusterCounts.keys()) {
        for (const t of theirs) score = Math.max(score, clusterAffinity(mine, t, graph.set));
      }
      return { c, score, size: theirs.size };
    })
    .filter((r) => r.score > 0 && r.size > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((r) => r.c);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.seoDescription,
    url: absoluteUrl(`/${category.slug}`),
    mainEntity: itemListJsonLd(
      category.name,
      entries.slice(0, 30).map((e) => ({ name: e.title, path: `/${e.category}/${e.slug}` }))
    ),
  };

  const label = "mb-4 font-display text-sm font-bold uppercase tracking-widest text-white/60";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <BannerAd id="category-top" className="border-b" />

      <div className="min-h-screen">
        <section className="border-b border-white/[0.06] py-10">
          <div className="container mx-auto px-4">
            <Breadcrumbs
              className="mb-5"
              items={[
                { label: "Home", href: "/" },
                { label: "Directory", href: "/directory" },
                { label: category.name },
              ]}
            />
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">{category.emoji}</span>
              <h1 className="font-display text-3xl font-black text-white md:text-4xl">{category.name}</h1>
            </div>
            <p className="mt-3 max-w-2xl text-white/60">{category.seoDescription}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
              <span className="bg-[#F5C842] px-2 py-0.5 text-[#0a0a0a]">{entries.length} listings</span>
              {topics.slice(0, 5).map((t) =>
                t.articles > 0 ? (
                  <Link
                    key={t.def.id}
                    href={hubPath(t.def.id)}
                    className="border border-white/15 px-2 py-0.5 text-white/70 transition-colors hover:border-[#7C4DFF]/60 hover:text-white"
                  >
                    {t.def.label} guides
                  </Link>
                ) : null
              )}
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="grid gap-8 lg:grid-cols-4">
              <div className="min-w-0 lg:col-span-3">
                <h2 className={label}>All {category.name}</h2>
                {entries.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {entries.map((entry) => (
                      <CryptoEntryCard key={entry.id} entry={entry} />
                    ))}
                  </div>
                ) : (
                  <div className="border border-white/[0.06] bg-white/[0.02] py-16 text-center">
                    <p className="text-white/60">
                      Nothing listed here yet. Meanwhile, browse the{" "}
                      <Link href="/directory" className="font-semibold text-[#B39DFF] underline">
                        full directory
                      </Link>
                      .
                    </p>
                  </div>
                )}
              </div>

              <aside className="space-y-5">
                {guides.length > 0 && (
                  <div className="border border-white/[0.06] bg-white/[0.02] p-5">
                    <h2 className={label}>Guides</h2>
                    <ul className="space-y-3">
                      {guides.map((p) => (
                        <li key={p.id}>
                          <Link href={`/blog/${p.slug}`} className="group flex items-start gap-2 text-sm">
                            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[#7C4DFF]" aria-hidden="true" />
                            <span className="font-semibold leading-snug text-white/85 group-hover:text-[#B39DFF]">
                              {p.title}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {topics.some((t) => t.articles > 0) && (
                  <div className="border border-white/[0.06] bg-white/[0.02] p-5">
                    <h2 className={label}>Topics</h2>
                    <ul className="space-y-2">
                      {topics
                        .filter((t) => t.articles > 0)
                        .map((t) => (
                          <li key={t.def.id}>
                            <Link
                              href={hubPath(t.def.id)}
                              className="flex items-center justify-between gap-2 border border-white/[0.08] px-3 py-2 text-sm font-semibold text-white/80 transition-colors hover:border-[#7C4DFF]/50 hover:text-white"
                            >
                              {t.def.label}
                              <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {related.length > 0 && (
                  <div className="border border-white/[0.06] bg-white/[0.02] p-5">
                    <h2 className={label}>Related categories</h2>
                    <ul className="space-y-2">
                      {related.map((c) => (
                        <li key={c.id}>
                          <Link
                            href={`/${c.slug}`}
                            className="block text-sm font-semibold text-white/80 transition-colors hover:text-[#B39DFF]"
                          >
                            {c.emoji} {c.name} →
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
