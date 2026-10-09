// app/topics/[cluster]/page.tsx
//
// A topic hub: the one page that ties a cluster together — its pillar guide,
// every supporting article grouped by what the reader is trying to do, the
// projects reviewed in the directory, and the neighbouring topics.
//
// This replaces /blog?cluster=<id>, which listed articles only, lived on a
// query-string URL, and never connected the blog to the directory. Old URLs
// are 301-redirected here in middleware.ts.
//
// Hubs are deliberately different from category pages: a category (/wallets)
// is the commercial list of every listing of one kind; a hub is the
// informational entry point to one topic, articles first, with a short list of
// its best projects. A cluster with no articles yet is noindexed — without
// guides it would only duplicate a category page.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CRYPTO_CLUSTERS } from "@/lib/seo/clusters";
import {
  getContentGraph,
  hubPath,
  HUB_SECTIONS,
  pageTypeLabel,
  sectionFor,
} from "@/lib/seo/contentGraph";
import { getCryptoCategoryBySlug } from "@/lib/crypto/data-static";
import { entriesFromGraph } from "@/lib/crypto/queries";
import { CryptoEntryCard } from "@/components/crypto/CryptoEntryCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildMetadata, firstThatFits, absoluteUrl, formatDate, newestDate } from "@/lib/seo/metadata";
import { itemListJsonLd, publisherJsonLd } from "@/lib/seo/structuredData";
import { safeJsonLd } from "@/lib/utils";

// Daily ISR, cleared on publish by /api/revalidate.
export const revalidate = 86400;
// The cluster list is compiled in (lib/seo/clusters.ts) and generateStaticParams
// below returns all of it, so the set of hub URLs is closed: off means the
// router 404s anything else without ever running this module.
export const dynamicParams = false;

const PROJECT_LIMIT = 9;

export function generateStaticParams() {
  return CRYPTO_CLUSTERS.map((c) => ({ cluster: c.id }));
}

async function loadHub(clusterId: string) {
  const graph = await getContentGraph("crypto");
  const def = graph.set.byId.get(clusterId);
  if (!def) return null;
  const posts = graph.postsByCluster.get(clusterId) ?? [];
  const entries = graph.entriesByCluster.get(clusterId) ?? [];
  if (!posts.length && !entries.length) return null;
  return { graph, def, posts, entries };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cluster: string }>;
}): Promise<Metadata> {
  const { cluster } = await params;
  const hub = await loadHub(cluster);
  if (!hub) return { title: "Topic not found", robots: { index: false, follow: true } };
  const { def, posts, entries } = hub;

  const counts = [
    posts.length ? `${posts.length} guide${posts.length === 1 ? "" : "s"}` : "",
    entries.length ? `${entries.length} reviewed project${entries.length === 1 ? "" : "s"}` : "",
  ]
    .filter(Boolean)
    .join(" and ");

  return buildMetadata({
    title: firstThatFits([
      `${def.label}: Crypto Guides, Comparisons & Top Picks`,
      `${def.label}: Guides, Comparisons & Top Picks`,
      `${def.label}: Guides & Top Picks`,
      `${def.label} Guides`,
    ]),
    description: `${def.blurb} ${counts ? `${counts[0].toUpperCase()}${counts.slice(1)}, independently researched.` : ""}`,
    path: hubPath(def.id),
    noindex: posts.length === 0,
  });
}

export default async function TopicHubPage({
  params,
}: {
  params: Promise<{ cluster: string }>;
}) {
  const { cluster } = await params;
  const hub = await loadHub(cluster);
  if (!hub) notFound();
  const { graph, def, posts, entries } = hub;

  const pillar = graph.pillarByCluster.get(def.id);
  const supporting = posts.filter((p) => p.id !== pillar?.id);
  const sections = HUB_SECTIONS.map((s) => ({
    ...s,
    posts: supporting
      .filter((p) => sectionFor(p.pageType) === s.id)
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
  })).filter((s) => s.posts.length);

  const projects = await entriesFromGraph(entries.slice(0, PROJECT_LIMIT).map((e) => e.id));

  // Every category this cluster's listings live in, most listings first — the
  // hub hands off to the full commercial list rather than duplicating it.
  const categoryCounts = new Map<string, number>();
  for (const e of entries) categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1);
  const categoryLinks = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug, count]) => ({ category: getCryptoCategoryBySlug(slug), count }))
    .filter((c): c is { category: NonNullable<typeof c.category>; count: number } => Boolean(c.category));

  const adjacent = def.adjacent
    .map((id) => graph.set.byId.get(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .filter((c) => (graph.postsByCluster.get(c.id)?.length ?? 0) > 0 || (graph.entriesByCluster.get(c.id)?.length ?? 0) > 0);

  const lastUpdated = newestDate([...posts.map((p) => p.updatedAt), ...entries.map((e) => e.updatedAt)])?.toISOString();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: def.label,
    description: def.blurb,
    url: absoluteUrl(hubPath(def.id)),
    publisher: publisherJsonLd(),
    ...(lastUpdated ? { dateModified: lastUpdated } : {}),
    mainEntity: itemListJsonLd(
      `${def.label} guides`,
      [...(pillar ? [pillar] : []), ...supporting].map((p) => ({ name: p.title, path: `/blog/${p.slug}` }))
    ),
  };

  const label = "mb-4 font-display text-sm font-bold uppercase tracking-widest text-white/60";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <div className="min-h-screen">
        <section className="border-b border-white/[0.06]">
          <div className="container mx-auto px-4 py-10">
            <Breadcrumbs
              className="mb-6"
              items={[
                { label: "Home", href: "/" },
                { label: "Topics", href: "/topics" },
                { label: def.label },
              ]}
            />
            <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight text-white md:text-6xl">
              {def.label}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/60">{def.blurb}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide">
              {posts.length > 0 && (
                <span className="bg-[#F5C842] px-2 py-0.5 text-[#0a0a0a]">{posts.length} guides</span>
              )}
              {entries.length > 0 && (
                <span className="border border-white/15 px-2 py-0.5 text-white/70">{entries.length} projects reviewed</span>
              )}
              {lastUpdated && (
                <span className="border border-white/15 px-2 py-0.5 normal-case tracking-normal text-white/70">
                  Updated {formatDate(lastUpdated, "short")}
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-10">
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="min-w-0 space-y-10 lg:col-span-2">
              {pillar && (
                <Link
                  href={`/blog/${pillar.slug}`}
                  className="group block border border-[#7C4DFF]/30 bg-[#7C4DFF]/[0.06] p-6 transition-colors hover:border-[#7C4DFF]/60 sm:p-7"
                >
                  <span className="mb-3 inline-block bg-[#F5C842] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0a0a0a]">
                    Start here
                  </span>
                  <h2 className="font-display text-2xl font-black leading-tight text-white transition-colors group-hover:text-[#B39DFF] md:text-3xl">
                    {pillar.title}
                  </h2>
                  {pillar.subtitle && (
                    <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/60">{pillar.subtitle}</p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/60 group-hover:text-[#B39DFF]">
                    Read the guide <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              )}

              {sections.map((section) => (
                <section key={section.id} aria-labelledby={`sec-${section.id}`}>
                  <h2 id={`sec-${section.id}`} className={label}>
                    {section.label}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {section.posts.map((p) => (
                      <Link
                        key={p.id}
                        href={`/blog/${p.slug}`}
                        className="group flex flex-col gap-2 border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                      >
                        <span className="w-fit border border-white/[0.1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/60">
                          {pageTypeLabel(p.pageType)}
                        </span>
                        <h3 className="font-display text-base font-bold leading-snug text-white transition-colors group-hover:text-[#B39DFF]">
                          {p.title}
                        </h3>
                        {p.subtitle && (
                          <p className="line-clamp-2 text-sm leading-relaxed text-white/55">{p.subtitle}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}

              {posts.length === 0 && (
                <p className="border border-dashed border-white/15 p-6 text-sm text-white/60">
                  We haven&apos;t published guides on {def.label.toLowerCase()} yet — the projects below are
                  the ones we&apos;ve reviewed so far.
                </p>
              )}

              {projects.length > 0 && (
                <section aria-labelledby="projects-heading">
                  <h2 id="projects-heading" className={label}>
                    Top {def.label} picks
                  </h2>
                  <p className="-mt-2 mb-4 text-sm text-white/55">
                    Our highest-rated listings in this topic. Each review covers rewards, requirements and the
                    risks.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {projects.map((e) => (
                      <CryptoEntryCard key={e.id} entry={e} />
                    ))}
                  </div>
                  {categoryLinks.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {categoryLinks.map(({ category, count }) => (
                        <Link
                          key={category.slug}
                          href={`/${category.slug}`}
                          className="inline-flex items-center gap-1.5 border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:border-[#7C4DFF]/50 hover:text-white"
                        >
                          All {category.name} ({count} here) <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>

            <aside className="space-y-5">
              {adjacent.length > 0 && (
                <div className="border border-white/[0.06] bg-white/[0.02] p-5">
                  <h2 className={label}>Related topics</h2>
                  <ul className="space-y-3">
                    {adjacent.map((c) => (
                      <li key={c.id}>
                        <Link href={hubPath(c.id)} className="group block">
                          <span className="font-display text-sm font-bold text-white group-hover:text-[#B39DFF]">
                            {c.label} →
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-white/55">{c.blurb}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="border border-white/[0.06] p-4 text-xs leading-relaxed text-white/50">
                EarnInCrypto is an independent research site — we aren&apos;t affiliated with the projects
                listed here. Some links are referral links; they never change our ratings. Nothing here is
                financial advice.
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
