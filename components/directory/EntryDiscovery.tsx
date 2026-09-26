/**
 * components/directory/EntryDiscovery.tsx
 *
 * The "where next" blocks on a listing page:
 *
 *   EntryCrumbs         — visible breadcrumbs + BreadcrumbList for the listing.
 *   EntryStructuredData — Review/Article + FAQPage JSON-LD.
 *   EntryGuides         — articles about this project, labelled by what they
 *                         are (Review, Alternatives, Comparison, Start here).
 *   EntryAlternatives   — interchangeable listings.
 *   TopicHubCard        — the topic hub this listing belongs to.
 *   EntryComparisons    — head-to-heads that resolve; editorial articles win.
 */

import Link from "next/link";
import { ArrowRight, BookOpen, Layers } from "lucide-react";
import type { CryptoEntry } from "@/lib/crypto/types";
import type { CryptoCategory } from "@/lib/crypto/data-static";
import type { EntryDiscovery } from "@/lib/directory/discovery";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { CryptoEntryCard } from "@/components/crypto/CryptoEntryCard";
import { entryJsonLd, faqJsonLd } from "@/lib/seo/structuredData";
import { safeJsonLd } from "@/lib/utils";

export function EntryCrumbs({ entry, category }: { entry: CryptoEntry; category: CryptoCategory }) {
  return (
    <Breadcrumbs
      className="mb-5"
      items={[
        { label: "Home", href: "/" },
        { label: category.name, href: `/${category.slug}` },
        { label: entry.title },
      ]}
    />
  );
}

export function EntryStructuredData({ entry, category }: { entry: CryptoEntry; category: CryptoCategory }) {
  const main = entryJsonLd(entry, category.name);
  const faq = faqJsonLd(entry.faqItems);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(main) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faq) }} />}
    </>
  );
}

const LABEL = "mb-4 font-display text-sm font-bold uppercase tracking-widest text-white/60";

export function EntryGuides({ discovery }: { discovery: EntryDiscovery }) {
  if (!discovery.guides.length) return null;
  return (
    <section className="border border-white/[0.06] bg-white/[0.02] p-5" aria-labelledby="entry-guides">
      <h2 id="entry-guides" className={LABEL}>
        Guides &amp; comparisons
      </h2>
      <ul className="space-y-3">
        {discovery.guides.map(({ post, label }) => (
          <li key={post.id}>
            <Link href={`/blog/${post.slug}`} className="group flex items-start gap-2.5">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[#7C4DFF]" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-snug text-white/85 transition-colors group-hover:text-[#B39DFF]">
                  {post.title}
                </span>
                <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-widest text-white/50">
                  {label}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EntryAlternatives({ discovery, heading }: { discovery: EntryDiscovery; heading: string }) {
  if (!discovery.alternatives.length) return null;
  return (
    <section aria-labelledby="entry-alternatives">
      <h2 id="entry-alternatives" className={LABEL}>
        {heading}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {discovery.alternatives.map((alt) => (
          <CryptoEntryCard key={alt.id} entry={alt} />
        ))}
      </div>
    </section>
  );
}

export function TopicHubCard({ discovery }: { discovery: EntryDiscovery }) {
  const hub = discovery.hub;
  // A hub without articles is noindexed and would only echo the category.
  if (!hub || hub.articleCount === 0) return null;
  return (
    <Link
      href={hub.href}
      className="group flex items-start gap-3 border border-[#7C4DFF]/30 bg-[#7C4DFF]/[0.06] p-5 transition-colors hover:border-[#7C4DFF]/60"
    >
      <Layers className="mt-0.5 h-5 w-5 shrink-0 text-[#7C4DFF]" aria-hidden="true" />
      <span>
        <span className="block text-[10px] font-bold uppercase tracking-widest text-white/50">Topic hub</span>
        <span className="block font-display text-lg font-bold leading-tight text-white">{hub.label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-white/55">{hub.blurb}</span>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[#B39DFF]">
          {hub.articleCount} guide{hub.articleCount === 1 ? "" : "s"}{" "}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

export function EntryComparisons({ discovery, entryTitle }: { discovery: EntryDiscovery; entryTitle: string }) {
  if (!discovery.comparisons.length) return null;
  return (
    <section className="border border-white/[0.06] bg-white/[0.02] p-6" aria-labelledby="entry-compare">
      <h2 id="entry-compare" className={LABEL}>
        Compare {entryTitle}
      </h2>
      <div className="flex flex-wrap gap-2">
        {discovery.comparisons.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="inline-flex items-center gap-1.5 border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:border-[#7C4DFF]/50 hover:text-white"
          >
            {c.label}
            {c.editorial && <span className="text-[10px] font-bold uppercase tracking-wide text-[#B39DFF]">In-depth</span>}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
