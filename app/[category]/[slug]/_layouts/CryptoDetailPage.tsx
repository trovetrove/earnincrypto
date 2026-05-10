/**
 * app/crypto/[category]/[slug]/_layouts/CryptoDetailPage.tsx
 * Dark-themed detail page with ad slots and cross-link to SideHustleTools.
 */

import Link from "next/link";
import type { CryptoEntry } from "@/lib/crypto/types";
import type { CryptoCategory } from "@/lib/crypto/data-static";
import { getRelatedCryptoEntries, getGlobalRandomCrypto } from "@/lib/crypto/queries";
import { RichContent } from "@/components/rich-content";
import { CryptoEntryCard } from "@/components/crypto/CryptoEntryCard";
import { AdSlot, SidebarAd, InlineAd, YouMayAlsoLike } from "@/components/ad-slots";
import {
  ArrowLeft, ExternalLink, Star, CheckCircle2, XCircle,
  ChevronDown, Shield, Sparkles, AlertTriangle, Zap, Target,
} from "lucide-react";

interface Props {
  entry: CryptoEntry;
  category: CryptoCategory;
}

const RISK_MAP: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: "Low Risk",    color: "#0a0a0a", bg: "#34D163" },
  medium: { label: "Medium Risk", color: "#0a0a0a", bg: "#F5C842" },
  high:   { label: "High Risk",   color: "#fff",    bg: "#FF4F2B" },
};

const PRICE_MAP: Record<string, { label: string; bg: string; color: string }> = {
  free:             { label: "Free",           bg: "#34D163", color: "#0a0a0a" },
  freemium:         { label: "Freemium",       bg: "#0ABFAA", color: "#0a0a0a" },
  paid:             { label: "Paid",           bg: "#FF4F2B", color: "#fff"    },
  "token-required": { label: "Token Required", bg: "#7C4DFF", color: "#fff"    },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-4 w-4 ${i <= Math.round(rating) ? "fill-[#F5C842] text-[#F5C842]" : "fill-white/10 text-white/10"}`} />
      ))}
      <span className="ml-1.5 font-display text-base font-black text-white">{rating}/5</span>
    </div>
  );
}

function getCtaLabel(category: string, hasReferral: boolean): string {
  if (category === "airdrops")  return hasReferral ? "Claim Airdrop + Bonus" : "Claim Airdrop";
  if (category === "exchanges") return hasReferral ? "Sign Up + Get Bonus"  : "Visit Exchange";
  if (category === "defi-yield")return hasReferral ? "Start Earning + Bonus": "Start Earning";
  if (category === "learn-earn")return hasReferral ? "Start Learning + Bonus": "Start Learning";
  return hasReferral ? "Get Started + Bonus" : "Get Started";
}

function getSectionLabels(category: string) {
  switch (category) {
    case "airdrops":   return { desc: "About This Airdrop", pros: "Why Eligible",  cons: "Requirements & Risks", steps: "How to Claim",       verdict: "Is This Worth It?" };
    case "exchanges":  return { desc: "Exchange Overview",  pros: "Strengths",      cons: "Weaknesses",           steps: "How to Get Started", verdict: "Our Verdict" };
    case "defi-yield": return { desc: "Protocol Overview",  pros: "Advantages",     cons: "Risks",                steps: "How to Start Earning",verdict: "Realistic Yields" };
    case "wallets":    return { desc: "Wallet Overview",    pros: "Pros",           cons: "Cons",                 steps: "Setup Guide",        verdict: "Our Take" };
    case "learn-earn": return { desc: "Program Overview",   pros: "What You Get",   cons: "Limitations",          steps: "How to Earn",        verdict: "Is It Worth Your Time?" };
    default:           return { desc: `About ${category}`,  pros: "Pros",           cons: "Cons",                 steps: "How to Use",         verdict: "Our Verdict" };
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://earnincrypto.io";

export async function CryptoDetailPage({ entry, category }: Props) {
  const risk   = RISK_MAP[entry.riskLevel]  ?? RISK_MAP.medium;
  const price  = PRICE_MAP[entry.priceTier] ?? PRICE_MAP.free;
  const ctaUrl = entry.referralUrl || entry.url;
  const ctaLabel = getCtaLabel(category.slug, !!entry.referralUrl);
  const labels = getSectionLabels(category.slug);

  const relatedEntries = await getRelatedCryptoEntries(category.slug, entry.id, 4);
  const globalPicks    = await getGlobalRandomCrypto(entry.id, 6);

  const faqJsonLd = entry.faqItems?.length ? {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: entry.faqItems.map(({ question, answer }) => ({
      "@type": "Question", name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  } : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home",            item: BASE_URL },
      { "@type": "ListItem", position: 2, name: category.name,     item: `${BASE_URL}/crypto/${category.slug}` },
      { "@type": "ListItem", position: 3, name: entry.title,       item: `${BASE_URL}/crypto/${category.slug}/${entry.slug}` },
    ],
  };

  return (
    <>
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Top ad */}
      <div className="flex justify-center border-b border-white/[0.06] bg-black/20 py-3">
        <AdSlot id="detail-top" format="leaderboard" />
      </div>

      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/[0.06]">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle, #7C4DFF 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

          <div className="container relative z-10 mx-auto px-4 py-10">
            <Link href={`/crypto/${category.slug}`}
              className="mb-5 inline-flex items-center gap-1.5 border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/40 hover:text-[#7C4DFF] transition-colors">
              <ArrowLeft className="h-3 w-3" /> {category.emoji} {category.name}
            </Link>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: price.bg, color: price.color }}>{price.label}</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: risk.bg, color: risk.color }}>{risk.label}</span>
                  {entry.chain  && <span className="border border-white/10 px-2 py-0.5 text-[10px] font-medium text-white/40">{entry.chain}</span>}
                  {entry.token  && <span className="border border-[#7C4DFF]/30 bg-[#7C4DFF]/10 px-2 py-0.5 text-[10px] font-bold text-[#7C4DFF]">${entry.token}</span>}
                  {entry.isFeatured && <span className="bg-[#F5C842] px-2 py-0.5 text-[10px] font-bold text-[#0a0a0a]"><Sparkles className="mr-1 inline h-2.5 w-2.5" />Featured</span>}
                  {entry.isVerified && <span className="bg-[#34D163] px-2 py-0.5 text-[10px] font-bold text-[#0a0a0a]"><Shield className="mr-1 inline h-2.5 w-2.5" />Verified</span>}
                </div>

                <h1 className="mb-3 font-display text-4xl font-black tracking-tight text-white md:text-5xl">
                  {entry.title}
                </h1>
                <p className="mb-4 max-w-2xl text-lg text-white/50">{entry.shortDescription}</p>
                <StarRating rating={entry.rating} />
              </div>

              {/* CTA card */}
              <div className="shrink-0 lg:w-72">
                <div className="border border-[#7C4DFF]/30 bg-[#7C4DFF]/5 p-6" style={{ boxShadow: "4px 4px 0 #7C4DFF50" }}>
                  {entry.potential && (
                    <>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
                        {category.slug === "airdrops" ? "Estimated Value" : "Potential"}
                      </p>
                      <p className="mb-4 font-display text-3xl font-black text-[#7C4DFF]">{entry.potential}</p>
                    </>
                  )}
                  {entry.freeTierDetails && <p className="mb-4 text-xs text-white/30">{entry.freeTierDetails}</p>}
                  <a href={ctaUrl} target="_blank" rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 border-2 border-[#7C4DFF] bg-[#7C4DFF] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#7C4DFF]/80">
                    {ctaLabel} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {entry.referralUrl && (
                    <a href={entry.url} target="_blank" rel="noopener noreferrer"
                      className="mt-2 flex w-full items-center justify-center text-xs text-white/20 hover:text-white/50 transition-colors">
                      Visit official site ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-b border-white/[0.06] bg-white/[0.02]">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap divide-x divide-white/[0.06]">
              {[
                { icon: Target,        label: "Potential", val: entry.potential || "Varies" },
                { icon: AlertTriangle, label: "Risk",      val: risk.label },
                { icon: Star,          label: "Rating",    val: `${entry.rating}/5` },
                { icon: Zap,           label: "Best For",  val: entry.bestFor || entry.audience[0] || "Everyone" },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} className="flex items-center gap-2 px-5 py-3">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[#7C4DFF]" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-white/20">{label}</p>
                    <p className="text-xs font-bold text-white/70">{val}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Main content */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">

                {/* Description */}
                <div className="border border-white/[0.06] bg-white/[0.02] p-6">
                  <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-[#7C4DFF]">{labels.desc}</h2>
                  <div className="crypto-prose">
                    <RichContent html={entry.description} className="[&_*]:text-white/70 [&_h2]:text-white [&_h3]:text-white/90 [&_strong]:text-white/90 [&_a]:text-[#7C4DFF]" />
                  </div>
                </div>

                {/* In-content ad */}
                <InlineAd />

                {/* Verdict */}
                {entry.realisticValue && (
                  <div className="border border-[#7C4DFF]/20 bg-[#7C4DFF]/5 p-6">
                    <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-[#7C4DFF]">{labels.verdict}</h2>
                    <div className="crypto-prose">
                      <RichContent html={entry.realisticValue} className="[&_*]:text-white/70 [&_h2]:text-[#7C4DFF] [&_strong]:text-white/90" />
                    </div>
                  </div>
                )}

                {/* Pros & Cons */}
                {(entry.pros.length > 0 || entry.cons.length > 0) && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {entry.pros.length > 0 && (
                      <div className="border border-white/[0.06] bg-white/[0.02] p-5">
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#34D163]">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {labels.pros}
                        </h3>
                        <ul className="space-y-2">
                          {entry.pros.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34D163]" />{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {entry.cons.length > 0 && (
                      <div className="border border-white/[0.06] bg-white/[0.02] p-5">
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#FF4F2B]">
                          <XCircle className="h-3.5 w-3.5" /> {labels.cons}
                        </h3>
                        <ul className="space-y-2">
                          {entry.cons.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF4F2B]" />{c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Steps */}
                {entry.howToUse.length > 0 && (
                  <div className="border border-white/[0.06] bg-white/[0.02] p-6">
                    <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-[#7C4DFF]">{labels.steps}</h2>
                    <ol className="space-y-0">
                      {entry.howToUse.map((step, i) => (
                        <li key={i} className="flex gap-0">
                          <div className="flex w-10 shrink-0 items-start justify-center pt-3">
                            <span className="flex h-6 w-6 items-center justify-center text-xs font-black" style={{ background: "#7C4DFF", color: "#fff" }}>
                              {i + 1}
                            </span>
                          </div>
                          <div className={`flex-1 py-3 text-sm leading-relaxed text-white/60 ${i < entry.howToUse.length - 1 ? "border-b border-white/[0.06]" : ""}`}>
                            {step}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* FAQ */}
                {entry.faqItems?.length > 0 && (
                  <div>
                    <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-white/40">Common Questions</h2>
                    {entry.faqItems.map(({ question, answer }, i) => (
                      <details key={i} className="group mb-2 border border-white/[0.06] bg-white/[0.02]">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-white/70">
                          {question}
                          <ChevronDown className="h-4 w-4 shrink-0 text-white/20 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="border-t border-white/[0.06] px-5 pb-4 pt-3 text-sm leading-relaxed text-white/40">{answer}</div>
                      </details>
                    ))}
                  </div>
                )}

                {/* Related */}
                {relatedEntries.length > 0 && (
                  <div>
                    <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-white/40">Similar Tools</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {relatedEntries.map((alt) => <CryptoEntryCard key={alt.id} entry={alt} />)}
                    </div>
                  </div>
                )}

                {/* Global YMAL */}
                {globalPicks.length > 0 && (
                  <div className="border-t border-white/[0.06] pt-8">
                    <YouMayAlsoLike entries={globalPicks} title="You May Also Like" />
                  </div>
                )}

                {/* Cross-promo */}
                <div className="border border-[#F5C842]/20 bg-[#F5C842]/5 p-5">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#F5C842]/60">Also from SHT Network</p>
                  <p className="mb-2 text-sm font-semibold text-white">Want free cloud credits & startup tools?</p>
                  <a
                    href="https://sidehustletools.app/free-credits"
                    target="_blank"
                    rel="dofollow noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#F5C842] hover:text-[#F5C842]/80 transition-colors"
                  >
                    sidehustletools.app/free-credits <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Bottom ad */}
                <InlineAd />
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                {/* Quick info */}
                <div className="border border-white/[0.06] bg-white/[0.02] p-5">
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/30">Quick Info</h3>
                  <dl className="space-y-3 text-sm">
                    {[
                      { k: "Potential",  v: entry.potential },
                      { k: "Risk Level", v: risk.label },
                      { k: "Chain",      v: entry.chain },
                      { k: "Token",      v: entry.token ? `$${entry.token}` : undefined },
                      { k: "Pricing",    v: price.label },
                      { k: "Best For",   v: entry.bestFor },
                      { k: "Audience",   v: entry.audience.join(", ") },
                      { k: "Free Tier",  v: entry.freeTierDetails },
                    ].filter(r => r.v).map(({ k, v }) => (
                      <div key={k} className="flex flex-col gap-0.5 border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                        <dt className="text-[10px] font-bold uppercase tracking-wide text-white/20">{k}</dt>
                        <dd className="font-medium text-white/60">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* CTA repeat */}
                <div className="border border-[#7C4DFF]/20 bg-[#7C4DFF]/5 p-5">
                  {entry.potential && <p className="mb-2 font-display text-xl font-black text-[#7C4DFF]">{entry.potential}</p>}
                  <a href={ctaUrl} target="_blank" rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 bg-[#7C4DFF] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#7C4DFF]/80">
                    {ctaLabel} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {/* Sidebar ad */}
                <SidebarAd />

                {/* Tags */}
                {entry.tags.length > 0 && (
                  <div className="border border-white/[0.06] bg-white/[0.02] p-5">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/30">Tags</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.tags.map(t => (
                        <span key={t} className="border border-white/10 px-2 py-0.5 text-[10px] font-medium text-white/40">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternatives */}
                {entry.alternatives.length > 0 && (
                  <div className="border border-white/[0.06] bg-white/[0.02] p-5">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/30">Alternatives</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.alternatives.map(alt => (
                        <span key={alt} className="border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs font-medium text-white/50">{alt}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sister site link */}
                <div className="border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/20">SHT Network</p>
                  <a
                    href="https://sidehustletools.app"
                    target="_blank"
                    rel="dofollow noreferrer"
                    className="block text-sm font-semibold text-[#F5C842] hover:text-[#F5C842]/70 transition-colors"
                  >
                    SideHustleTools.app ↗
                  </a>
                  <p className="mt-1 text-xs text-white/30">Free cloud credits & startup perks</p>
                </div>

                {/* Disclaimer */}
                <div className="border border-white/[0.06] p-4 text-xs text-white/20">
                  <Shield className="mb-1 h-4 w-4" />
                  Crypto involves significant financial risk. Always DYOR. Nothing here constitutes financial advice. Referral links may earn us a commission.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
