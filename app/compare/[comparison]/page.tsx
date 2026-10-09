// app/compare/[comparison]/page.tsx
//
// Side-by-side template for two listings in the same comparable category.
//
// Indexing rules live in lib/seo/comparisons.ts: only declared pairs are
// indexable, and a pair covered by an editorial "A vs B" article defers to it
// (noindex, follow, plus a prominent link) rather than competing for the same
// query. /compare/b-vs-a permanently redirects to the alphabetical order.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowRight, CheckCircle2, ExternalLink, Star, Trophy, XCircle } from "lucide-react";
import { getEntryFromGraph } from "@/lib/crypto/queries";
import type { CryptoEntry } from "@/lib/crypto/types";
import { getCryptoCategoryBySlug } from "@/lib/crypto/data-static";
import { comparisonPath, getContentGraph } from "@/lib/seo/contentGraph";
import { comparisonStatus, declaredPairs, isComparablePair } from "@/lib/seo/comparisons";
import { parseComparisonSegment } from "@/lib/seo/paths";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { absoluteUrl, buildMetadata, CURRENT_YEAR, firstThatFits, newestDate } from "@/lib/seo/metadata";
import { outboundRel, publisherJsonLd } from "@/lib/seo/structuredData";
import { safeJsonLd } from "@/lib/utils";

// Daily ISR, cleared on publish by /api/revalidate.
export const revalidate = 86400;
// On, so a pair becomes comparable as soon as both listings exist. This is the
// route bots probe hardest — every two slugs make a URL — so the segment is
// rejected on shape in parseComparisonSegment before anything is loaded.
export const dynamicParams = true;

interface Props {
  params: Promise<{ comparison: string }>;
}

async function loadPair(segment: string) {
  const parsed = parseComparisonSegment(segment);
  if (!parsed) return null;
  const graph = await getContentGraph("crypto");
  const na = graph.entryBySlug.get(parsed.slugA);
  const nb = graph.entryBySlug.get(parsed.slugB);
  if (!na || !nb || !isComparablePair(na, nb)) return null;
  const [a, b] = await Promise.all([getEntryFromGraph(na.slug), getEntryFromGraph(nb.slug)]);
  if (!a || !b) return null;
  return { a, b, status: comparisonStatus(graph, na, nb), canonicalPath: comparisonPath(a.slug, b.slug) };
}

export async function generateStaticParams() {
  // Declared pairs only, in canonical order — anything else renders on demand.
  try {
    const graph = await getContentGraph("crypto");
    return [...declaredPairs(graph).keys()].map((path) => ({ comparison: path.replace("/compare/", "") }));
  } catch (err) {
    console.error("[generateStaticParams] failed:", err);
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { comparison } = await params;
  const pair = await loadPair(comparison);
  if (!pair) return { title: "Comparison Not Found", robots: { index: false, follow: true } };
  const { a, b, status, canonicalPath } = pair;

  return buildMetadata({
    title: firstThatFits([
      `${a.title} vs ${b.title} (${CURRENT_YEAR}): Which Is Better?`,
      `${a.title} vs ${b.title}: Which Is Better?`,
      `${a.title} vs ${b.title}`,
    ]),
    description: `${a.title} vs ${b.title} side by side: rating, risk, fees, chains, pros and cons, and which one suits which goal.`,
    path: canonicalPath,
    type: "article",
    noindex: !status.indexable,
  });
}

type Row = {
  label: string;
  a: string | number | boolean;
  b: string | number | boolean;
  type: "text" | "rating" | "boolean" | "badge";
  winner?: "a" | "b" | "tie";
};

const PRICE_ORDER = ["free", "freemium", "token-required", "paid"];
const LEVEL_ORDER = ["low", "medium", "high"];

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: "#34D163", text: "#0a0a0a" },
  medium: { bg: "#F5C842", text: "#0a0a0a" },
  high: { bg: "#FF4F2B", text: "#0a0a0a" },
};

const PRICE_COLORS: Record<string, { bg: string; text: string }> = {
  free: { bg: "#34D163", text: "#0a0a0a" },
  freemium: { bg: "#0ABFAA", text: "#0a0a0a" },
  "token-required": { bg: "#7C4DFF", text: "#fff" },
  paid: { bg: "#FF4F2B", text: "#0a0a0a" },
};

function lowerWins(order: string[], a: string, b: string): "a" | "b" | "tie" {
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  if (ia === -1 || ib === -1 || ia === ib) return "tie";
  return ia < ib ? "a" : "b";
}

function takerFee(e: CryptoEntry): string {
  return e.feeTiers?.[0]?.takerFee || "—";
}

function buildRows(a: CryptoEntry, b: CryptoEntry): Row[] {
  const rows: Row[] = [
    { label: "Our rating", a: a.rating, b: b.rating, type: "rating", winner: a.rating > b.rating ? "a" : b.rating > a.rating ? "b" : "tie" },
    { label: "Risk", a: a.riskLevel, b: b.riskLevel, type: "badge", winner: lowerWins(LEVEL_ORDER, a.riskLevel, b.riskLevel) },
    { label: "Pricing", a: a.priceTier, b: b.priceTier, type: "badge", winner: lowerWins(PRICE_ORDER, a.priceTier, b.priceTier) },
    { label: "Effort", a: a.effortLevel, b: b.effortLevel, type: "badge", winner: lowerWins(LEVEL_ORDER, a.effortLevel, b.effortLevel) },
    { label: "Potential", a: a.potential || "—", b: b.potential || "—", type: "text" },
    { label: "Chain", a: a.chain || "—", b: b.chain || "—", type: "text" },
    { label: "Mobile friendly", a: a.isMobileFriendly, b: b.isMobileFriendly, type: "boolean", winner: a.isMobileFriendly === b.isMobileFriendly ? "tie" : a.isMobileFriendly ? "a" : "b" },
    { label: "Best for", a: a.bestFor || a.audience.join(", ") || "—", b: b.bestFor || b.audience.join(", ") || "—", type: "text" },
  ];
  if (a.feeTiers?.length || b.feeTiers?.length) {
    rows.splice(4, 0, { label: "Taker fee (base tier)", a: takerFee(a), b: takerFee(b), type: "text" });
  }
  if (a.token || b.token) rows.push({ label: "Token", a: a.token ? `$${a.token}` : "—", b: b.token ? `$${b.token}` : "—", type: "text" });
  return rows;
}

function winnerOf(rows: Row[]): "a" | "b" | "tie" {
  let sa = 0;
  let sb = 0;
  for (const r of rows) {
    if (r.winner === "a") sa++;
    else if (r.winner === "b") sb++;
  }
  return sa > sb ? "a" : sb > sa ? "b" : "tie";
}

function verdict(winner: "a" | "b" | "tie", a: CryptoEntry, b: CryptoEntry, rows: Row[]): string {
  if (winner === "tie") {
    return `${a.title} and ${b.title} are closely matched on the criteria we score. The better pick depends on which chain you use and how much risk you're comfortable with.`;
  }
  const w = winner === "a" ? a : b;
  const l = winner === "a" ? b : a;
  const wins = rows.filter((r) => r.winner === winner).length;
  const scored = rows.filter((r) => r.winner && r.winner !== "tie").length;
  const parts = [`${w.title} comes out ahead on ${wins} of ${scored} scored criteria.`];
  const edges: string[] = [];
  if (w.rating > l.rating) edges.push(`a higher rating (${w.rating}/5 vs ${l.rating}/5)`);
  if (lowerWins(LEVEL_ORDER, w.riskLevel, l.riskLevel) === (winner === "a" ? "a" : "b")) edges.push("lower risk");
  if (lowerWins(PRICE_ORDER, w.priceTier, l.priceTier) === (winner === "a" ? "a" : "b")) edges.push("cheaper access");
  if (edges.length) parts.push(`Its edge: ${edges.join(", ")}.`);
  parts.push(`${l.title} can still be the better fit${l.chain ? ` if you're on ${l.chain}` : ""} — check the pros and cons below.`);
  return parts.join(" ");
}

function Cell({ row, side }: { row: Row; side: "a" | "b" }) {
  const val = side === "a" ? row.a : row.b;
  const win = row.winner === side;
  if (row.type === "boolean") {
    return val ? (
      <CheckCircle2 className="mx-auto h-5 w-5 text-[#34D163]" aria-label="Yes" />
    ) : (
      <XCircle className="mx-auto h-5 w-5 text-white/35" aria-label="No" />
    );
  }
  if (row.type === "rating") {
    return (
      <span className="flex items-center justify-center gap-1">
        <Star className="h-4 w-4 fill-[#F5C842] text-[#F5C842]" aria-hidden="true" />
        <span className={`font-display text-lg font-black ${win ? "text-white" : "text-white/60"}`}>{String(val)}</span>
      </span>
    );
  }
  if (row.type === "badge") {
    const c = (row.label === "Pricing" ? PRICE_COLORS : LEVEL_COLORS)[String(val)] ?? { bg: "#333", text: "#fff" };
    return (
      <span className="mx-auto px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: c.bg, color: c.text }}>
        {String(val)}
      </span>
    );
  }
  return <span className={`text-sm ${win ? "font-bold text-white" : "text-white/70"}`}>{String(val)}</span>;
}

export default async function ComparisonPage({ params }: Props) {
  const { comparison } = await params;
  const pair = await loadPair(comparison);
  if (!pair) notFound();
  const { a, b, status, canonicalPath } = pair;

  // One URL per pair: /compare/b-vs-a is the same page as /compare/a-vs-b.
  if (`/compare/${comparison}` !== canonicalPath) permanentRedirect(canonicalPath);

  // Present in canonical (alphabetical) order so the table matches the URL.
  const [first, second] = a.slug < b.slug ? [a, b] : [b, a];
  const category = getCryptoCategoryBySlug(first.category);
  const rows = buildRows(first, second);
  const winner = winnerOf(rows);
  const winnerEntry = winner === "a" ? first : winner === "b" ? second : null;
  const editorial = status.editorial;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${first.title} vs ${second.title}: Which Is Better?`,
    description: `Side-by-side comparison of ${first.title} and ${second.title}.`,
    url: absoluteUrl(canonicalPath),
    mainEntityOfPage: absoluteUrl(canonicalPath),
    dateModified: newestDate([first.updatedAt, second.updatedAt])?.toISOString(),
    author: publisherJsonLd(),
    publisher: publisherJsonLd(),
    about: [first, second].map((e) => ({ "@type": "Thing", name: e.title, url: absoluteUrl(`/${e.category}/${e.slug}`) })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <div className="min-h-screen">
        <section className="border-b border-white/[0.06] py-10">
          <div className="container mx-auto px-4">
            <Breadcrumbs
              className="mb-6"
              items={[
                { label: "Home", href: "/" },
                { label: "Compare", href: "/compare" },
                { label: `${first.title} vs ${second.title}` },
              ]}
            />
            <div className="text-center">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-white/55">
                {category?.name} · side-by-side
              </p>
              <h1 className="mb-3 font-display text-4xl font-black tracking-tight text-white md:text-5xl">
                {first.title} <span className="text-white/45">vs</span> {second.title}
              </h1>
              <p className="mx-auto max-w-xl text-lg text-white/60">
                Rating, risk, fees and chains compared — and which one suits which goal.
              </p>
            </div>
          </div>
        </section>

        {editorial && (
          <section className="border-b border-white/[0.06] bg-[#7C4DFF]/[0.08] py-4">
            <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 text-center text-sm">
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">In-depth comparison</span>
              <Link
                href={`/blog/${editorial.slug}`}
                className="font-semibold text-white underline decoration-[#7C4DFF] decoration-2 underline-offset-2 hover:text-[#B39DFF]"
              >
                {editorial.title}
              </Link>
            </div>
          </section>
        )}

        {winnerEntry && (
          <section className="border-b border-white/[0.06] py-4">
            <div className="container mx-auto flex flex-wrap items-center justify-center gap-3 px-4 text-center">
              <Trophy className="h-5 w-5 text-[#F5C842]" aria-hidden="true" />
              <span className="text-sm font-bold text-white/70">On our scored criteria:</span>
              <span className="font-display text-lg font-black text-white">{winnerEntry.title}</span>
            </div>
          </section>
        )}

        <section className="py-10">
          <div className="container mx-auto max-w-4xl space-y-8 px-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {[first, second].map((e) => (
                <div key={e.id} className="border border-white/[0.08] bg-white/[0.02] p-6">
                  <p className="mb-1 font-display text-xl font-black text-white">{e.title}</p>
                  <p className="mb-4 line-clamp-2 text-sm text-white/60">{e.shortDescription}</p>
                  <a
                    href={e.referralUrl || e.url}
                    target="_blank"
                    rel={outboundRel(Boolean(e.referralUrl))}
                    className="flex w-full items-center justify-center gap-2 bg-[#7C4DFF] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#7C4DFF]/80"
                  >
                    {e.referralUrl ? `Get ${e.title}` : `Visit ${e.title}`}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto border border-white/[0.08]">
              <table className="w-full min-w-[32rem] border-collapse text-left">
                <caption className="border-b border-white/[0.08] px-5 py-3 text-left font-display text-sm font-bold uppercase tracking-widest text-white/60">
                  Feature comparison
                </caption>
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                    <th scope="col" className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-white/55">Feature</th>
                    <th scope="col" className="px-5 py-3 text-center font-display text-sm font-bold text-white">{first.title}</th>
                    <th scope="col" className="px-5 py-3 text-center font-display text-sm font-bold text-white">{second.title}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="border-b border-white/[0.06] last:border-0">
                      <th scope="row" className="px-5 py-3 text-sm font-medium text-white/60">{r.label}</th>
                      <td className={`px-5 py-3 text-center ${r.winner === "a" ? "bg-[#34D163]/[0.08]" : ""}`}><Cell row={r} side="a" /></td>
                      <td className={`px-5 py-3 text-center ${r.winner === "b" ? "bg-[#34D163]/[0.08]" : ""}`}><Cell row={r} side="b" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {[first, second].map((e) => (
              <section key={e.id} aria-labelledby={`pc-${e.slug}`}>
                <h2 id={`pc-${e.slug}`} className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-white/60">
                  {e.title}: pros &amp; cons
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {e.pros.length > 0 && (
                    <ul className="space-y-2 border border-white/[0.06] bg-white/[0.02] p-5">
                      {e.pros.slice(0, 5).map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm text-white/70">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#34D163]" aria-hidden="true" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}
                  {e.cons.length > 0 && (
                    <ul className="space-y-2 border border-white/[0.06] bg-white/[0.02] p-5">
                      {e.cons.slice(0, 5).map((c) => (
                        <li key={c} className="flex items-start gap-2 text-sm text-white/70">
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A5C]" aria-hidden="true" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}

            <section className="border border-[#7C4DFF]/30 bg-[#7C4DFF]/[0.06] p-6" aria-labelledby="verdict">
              <h2 id="verdict" className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-[#B39DFF]">
                Our verdict
              </h2>
              <p className="text-white/80">{verdict(winner, first, second, rows)}</p>
            </section>

            <div className="flex flex-wrap gap-3">
              {[first, second].map((e) => (
                <Link
                  key={e.id}
                  href={`/${e.category}/${e.slug}`}
                  className="inline-flex items-center gap-2 border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/85 transition-colors hover:border-[#7C4DFF]/50 hover:text-white"
                >
                  Full {e.title} review <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ))}
            </div>

            <p className="text-xs text-white/50">
              Crypto carries real risk. Nothing here is financial advice. Referral links may earn us a commission.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
