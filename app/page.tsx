// app/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { cryptoCategories } from "@/lib/crypto/data-static";
import { getFeaturedCryptoEntries, getCryptoStats } from "@/lib/crypto/queries";
import { getContentGraph, hubPath } from "@/lib/seo/contentGraph";
import { CryptoEntryCard } from "@/components/crypto/CryptoEntryCard";
import { BannerAd } from "@/components/ad-slots";
import { absoluteUrl, buildMetadata, CURRENT_YEAR, formatDate } from "@/lib/seo/metadata";
import { safeJsonLd } from "@/lib/utils";
import { ArrowRight, Zap, Shield, TrendingUp, Sparkles, ExternalLink } from "lucide-react";

// Weekly ISR, cleared on publish by /api/revalidate: new listings and articles
// published from the sidehustletools admin appear here without a deploy, and
// without this page regenerating hourly whether or not anything changed.
export const revalidate = 604800;

export const metadata: Metadata = buildMetadata({
  title: `Crypto Airdrops, Exchanges & DeFi Yield (${CURRENT_YEAR})`,
  description: `Independent research on crypto airdrops, exchanges, DeFi yields, wallets and learn-and-earn programmes — what each pays, what it risks and how to start.`,
  path: "/",
});

export default async function CryptoHomePage() {
  const [featured, stats, graph] = await Promise.all([
    getFeaturedCryptoEntries(8),
    getCryptoStats(),
    getContentGraph("crypto"),
  ]);

  // Topic hubs with articles behind them, biggest first; newest articles.
  const topics = graph.set.clusters
    .map((c) => ({ def: c, count: graph.postsByCluster.get(c.id)?.length ?? 0 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);
  const latest = graph.posts.slice(0, 6);
  const liveCategories = cryptoCategories.filter((c) => graph.entries.some((e) => e.category === c.slug));

  const cryptoListJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Crypto airdrops, exchanges and DeFi yield — EarnInCrypto",
    description: "Independent research on crypto airdrops, exchanges, DeFi yields, wallets and learn-and-earn programmes.",
    url: absoluteUrl("/"),
    // Cross-link relationship
    isPartOf: {
      "@type": "WebSite",
      name: "SideHustleTools",
      url: "https://sidehustletools.app",
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: featured.length,
      itemListElement: featured.map((entry, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: entry.title,
        url: absoluteUrl(`/${entry.category}/${entry.slug}`),
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(cryptoListJsonLd) }} />

      <BannerAd id="home-top" className="border-b" />

      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/[0.06] py-20">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #7C4DFF 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="container relative z-10 mx-auto px-4">
            <div className="flex flex-col items-center text-center">
              {stats.totalTools > 0 && (
                <div className="mb-6 inline-flex items-center gap-2 border border-[#7C4DFF]/30 bg-[#7C4DFF]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#B39DFF]">
                  <Sparkles className="h-3 w-3" aria-hidden="true" /> {stats.totalTools} projects reviewed
                </div>
              )}
              <h1 className="mb-4 font-display text-5xl font-black tracking-tight text-white md:text-7xl">
                Earn Crypto{" "}
                <span className="text-[#7C4DFF]">Smarter</span>
              </h1>
              <p className="mx-auto mb-10 max-w-xl text-lg text-white/60">
                Curated crypto opportunities — airdrops, exchanges, DeFi yields, and tools.
                Every listing independently reviewed.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Link
                  href="/directory"
                  className="flex items-center gap-2 border-2 border-[#7C4DFF] bg-[#7C4DFF] px-6 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-[#7C4DFF]/80"
                  style={{ boxShadow: "4px 4px 0 #7C4DFF50" }}
                >
                  Browse All Tools <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/airdrops"
                  className="flex items-center gap-2 border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/70 transition-colors hover:text-white"
                >
                  Latest Airdrops
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-white/[0.06] py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { icon: Zap,       label: "Total Listings", val: stats.totalTools,      color: "#7C4DFF" },
                { icon: Sparkles,  label: "Featured",       val: stats.featuredCount,    color: "#F5C842" },
                { icon: TrendingUp,label: "Airdrops",       val: stats.airdropCount,     color: "#34D163" },
                { icon: Shield,    label: "Categories",     val: stats.totalCategories,  color: "#0ABFAA" },
              ].map(({ icon: Icon, label, val, color }) => (
                <div key={label} className="border border-white/[0.06] bg-white/[0.02] p-5 text-center">
                  <Icon className="mx-auto mb-2 h-5 w-5" style={{ color }} aria-hidden="true" />
                  <p className="font-display text-2xl font-black text-white">{val}</p>
                  <p className="text-xs text-white/55">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-14">
          <div className="container mx-auto px-4">
            <h2 className="mb-8 font-display text-2xl font-black text-white">
              Browse by Category
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              {liveCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/${cat.slug}`}
                  className="group border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                  style={{ borderLeft: `3px solid ${cat.color}` }}
                >
                  <span className="mb-2 block text-2xl" aria-hidden="true">{cat.emoji}</span>
                  <h3 className="font-display text-sm font-bold text-white group-hover:text-[#B39DFF] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="mt-1 text-[11px] text-white/55 line-clamp-2">{cat.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Topic hubs + latest research */}
        {(topics.length > 0 || latest.length > 0) && (
          <section className="border-t border-white/[0.06] py-14">
            <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-3">
              {topics.length > 0 && (
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-display text-2xl font-black text-white">Browse by Topic</h2>
                    <Link href="/topics" className="flex items-center gap-1 text-sm text-white/55 transition-colors hover:text-[#B39DFF]">
                      All topics <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                  <ul className="space-y-2">
                    {topics.map(({ def, count }) => (
                      <li key={def.id}>
                        <Link
                          href={hubPath(def.id)}
                          className="flex items-center justify-between gap-3 border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white/85 transition-colors hover:border-[#7C4DFF]/50 hover:text-white"
                        >
                          {def.label}
                          <span className="text-xs font-medium text-white/50">{count} guides</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {latest.length > 0 && (
                <div className="lg:col-span-2">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-display text-2xl font-black text-white">Latest Research</h2>
                    <Link href="/blog" className="flex items-center gap-1 text-sm text-white/55 transition-colors hover:text-[#B39DFF]">
                      All articles <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {latest.map((p) => (
                      <Link
                        key={p.id}
                        href={`/blog/${p.slug}`}
                        className="group flex flex-col gap-2 border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                      >
                        <h3 className="font-display text-sm font-bold leading-snug text-white transition-colors group-hover:text-[#B39DFF]">
                          {p.title}
                        </h3>
                        {p.publishedAt && (
                          <p className="mt-auto text-[11px] text-white/50">{formatDate(p.publishedAt, "short")}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <BannerAd id="home-mid" className="border-y" />

        {/* Featured */}
        {featured.length > 0 && (
          <section className="py-14">
            <div className="container mx-auto px-4">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="font-display text-2xl font-black text-white">Featured Tools</h2>
                <Link
                  href="/directory"
                  className="flex items-center gap-1 text-sm text-white/55 hover:text-[#B39DFF] transition-colors"
                >
                  View All <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((entry) => (
                  <CryptoEntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Cross-promo to SideHustleTools */}
        <section className="border-t border-white/[0.06] py-10">
          <div className="container mx-auto px-4">
            <div className="border border-[#F5C842]/20 bg-[#F5C842]/5 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#F5C842]/80">
                  Looking for more than crypto?
                </p>
                <p className="font-display text-lg font-black text-white">
                  Explore SideHustleTools
                </p>
                <p className="mt-1 text-sm text-white/55">
                  Free cloud credits, startup programs, AI tools & side hustles — all independently reviewed.
                </p>
              </div>
              <a
                href="https://sidehustletools.app"
                target="_blank"
                rel="noopener"
                className="flex shrink-0 items-center gap-2 border border-[#F5C842]/30 bg-[#F5C842]/10 px-5 py-2.5 text-sm font-bold text-[#F5C842] hover:bg-[#F5C842]/20 transition-colors"
              >
                Visit SideHustleTools <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="border-t border-white/[0.06] py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-start gap-3 text-xs text-white/50">
              <Shield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Crypto involves significant financial risk. Always do your own research (DYOR).
                Nothing on this site constitutes financial advice. Referral links may earn us a commission.
              </p>
            </div>
          </div>
        </section>

        <BannerAd id="home-bottom" className="border-t" />
      </div>
    </>
  );
}
