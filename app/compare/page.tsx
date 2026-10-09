// app/compare/page.tsx
//
// Every head-to-head worth reading: editorial "A vs B" articles first, then
// the declared pairs that have no article yet. Undeclared pairs render if
// someone types the URL but are never listed or indexed (see
// lib/seo/comparisons.ts).

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getContentGraph } from "@/lib/seo/contentGraph";
import { declaredPairs } from "@/lib/seo/comparisons";
import { cryptoCategories } from "@/lib/crypto/data-static";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { absoluteUrl, buildMetadata } from "@/lib/seo/metadata";
import { itemListJsonLd } from "@/lib/seo/structuredData";
import { safeJsonLd } from "@/lib/utils";

// ISR window: a day, not an hour. Nothing here changes on its own — it changes
// when an editor publishes, and publishing calls /api/revalidate, which clears
// these pages and the row cache behind them. The window is the backstop for a
// webhook that never arrived, so it costs a render a day per URL instead of
// one an hour whether or not anything changed.
export const revalidate = 86400;

async function load() {
  const graph = await getContentGraph("crypto");
  const editorial = [...graph.editorialComparisons.values()];
  const templated = [...declaredPairs(graph)].filter(([path]) => !graph.editorialComparisons.has(path));
  return { editorial, templated };
}

export async function generateMetadata(): Promise<Metadata> {
  const { editorial, templated } = await load();
  return buildMetadata({
    title: "Crypto Comparisons: Exchanges, Wallets & DeFi Head to Head",
    description:
      "Head-to-head comparisons of crypto exchanges, wallets, DeFi protocols and launchpads — fees, risk, chains, pros and cons, and which one suits which goal.",
    path: "/compare",
    noindex: editorial.length + templated.length === 0,
  });
}

export default async function CompareIndexPage() {
  const { editorial, templated } = await load();
  const byCategory = cryptoCategories
    .map((c) => ({ category: c, pairs: templated.filter(([, p]) => p.a.category === c.slug) }))
    .filter((g) => g.pairs.length);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Crypto comparisons",
    url: absoluteUrl("/compare"),
    mainEntity: itemListJsonLd("Comparisons", [
      ...editorial.map((p) => ({ name: p.title, path: `/blog/${p.slug}` })),
      ...templated.map(([path, p]) => ({ name: `${p.a.title} vs ${p.b.title}`, path })),
    ]),
  };

  const label = "mb-4 font-display text-sm font-bold uppercase tracking-widest text-white/60";
  const chip =
    "inline-flex items-center gap-1.5 border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:border-[#7C4DFF]/50 hover:text-white";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <div className="min-h-screen">
        <section className="border-b border-white/[0.06]">
          <div className="container mx-auto px-4 py-10">
            <Breadcrumbs className="mb-6" items={[{ label: "Home", href: "/" }, { label: "Compare" }]} />
            <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight text-white md:text-6xl">
              Compare crypto platforms
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/60">
              Head-to-heads on fees, risk, chains and what each one is actually good for.
            </p>
          </div>
        </section>

        <div className="container mx-auto space-y-10 px-4 py-10">
          {editorial.length > 0 && (
            <section aria-labelledby="in-depth">
              <h2 id="in-depth" className={label}>In-depth comparisons</h2>
              <div className="flex flex-wrap gap-2">
                {editorial.map((p) => (
                  <Link key={p.id} href={`/blog/${p.slug}`} className={chip}>
                    {p.title} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {byCategory.map(({ category, pairs }) => (
            <section key={category.slug} aria-labelledby={`cmp-${category.slug}`}>
              <h2 id={`cmp-${category.slug}`} className={label}>{category.name}</h2>
              <div className="flex flex-wrap gap-2">
                {pairs.map(([path, p]) => (
                  <Link key={path} href={path} className={chip}>
                    {p.a.title} vs {p.b.title} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          ))}

          {editorial.length + templated.length === 0 && (
            <p className="text-white/60">No comparisons published yet.</p>
          )}
        </div>
      </div>
    </>
  );
}
