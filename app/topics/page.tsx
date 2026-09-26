// app/topics/page.tsx
//
// Index of every topic hub — the top of the cluster architecture, linked from
// the site-wide navigation so every hub (and through it every article and
// listing) is at most two clicks from the homepage.

import type { Metadata } from "next";
import Link from "next/link";
import { getContentGraph, hubPath } from "@/lib/seo/contentGraph";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { itemListJsonLd } from "@/lib/seo/structuredData";
import { safeJsonLd } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Crypto Topics: Airdrops, Exchanges, DeFi, Wallets & More",
  description:
    "Browse our research by topic — airdrops, exchanges, DeFi yield, wallets, learn-and-earn, security, infrastructure and launchpads. Each hub collects the guides, comparisons and projects we've reviewed.",
  path: "/topics",
});

export default async function TopicsIndexPage() {
  const graph = await getContentGraph("crypto");
  const topics = graph.set.clusters
    .map((c) => ({
      def: c,
      posts: graph.postsByCluster.get(c.id)?.length ?? 0,
      entries: graph.entriesByCluster.get(c.id)?.length ?? 0,
      pillar: graph.pillarByCluster.get(c.id),
    }))
    .filter((t) => t.posts > 0 || t.entries > 0)
    .sort((a, b) => b.posts - a.posts || b.entries - a.entries);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Topics",
    url: absoluteUrl("/topics"),
    mainEntity: itemListJsonLd(
      "Topic hubs",
      topics.map((t) => ({ name: t.def.label, path: hubPath(t.def.id) }))
    ),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <div className="min-h-screen">
        <section className="border-b border-white/[0.06]">
          <div className="container mx-auto px-4 py-10">
            <Breadcrumbs className="mb-6" items={[{ label: "Home", href: "/" }, { label: "Topics" }]} />
            <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight text-white md:text-6xl">
              Browse by topic
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/60">
              Every topic hub collects our guides, head-to-head comparisons and the projects we&apos;ve
              reviewed, so you can go from &ldquo;what is this?&rdquo; to &ldquo;which one should I
              use?&rdquo; in one place.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-10">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map(({ def, posts, entries, pillar }) => (
              <Link
                key={def.id}
                href={hubPath(def.id)}
                className="group flex flex-col gap-3 border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/20 hover:bg-white/[0.05]"
              >
                <h2 className="font-display text-xl font-bold leading-tight text-white transition-colors group-hover:text-[#B39DFF]">
                  {def.label}
                </h2>
                <p className="flex-1 text-sm leading-relaxed text-white/55">{def.blurb}</p>
                {pillar && (
                  <p className="text-xs text-white/55">
                    Start with: <span className="font-semibold text-white/85">{pillar.title}</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-3 text-[10px] font-bold uppercase tracking-wide">
                  {posts > 0 && <span className="bg-[#F5C842] px-2 py-0.5 text-[#0a0a0a]">{posts} guides</span>}
                  {entries > 0 && <span className="border border-white/15 px-2 py-0.5 text-white/70">{entries} projects</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
