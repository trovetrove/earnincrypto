/**
 * components/blog/SeriesLinks.tsx
 *
 * The two halves of a cluster's hub-and-spoke structure, rendered on articles:
 *
 *   PartOfGuide — on every supporting article, a single link up to the
 *                 cluster's pillar, placed above the body where readers (and
 *                 crawlers) meet it first.
 *   SeriesList  — on the pillar itself, links down to the articles that
 *                 support it, in reading order.
 *
 * Both link to editorial pages, never to ads, and sit in the page's own visual
 * language rather than the dashed ad frame.
 */

import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";

export type SeriesItem = { slug: string; title: string; label: string };

export function PartOfGuide({
  pillar,
  hub,
}: {
  pillar: { slug: string; title: string };
  hub?: { href: string; label: string };
}) {
  return (
    <aside className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-[#7C4DFF]/30 bg-[#7C4DFF]/[0.06] px-4 py-3 text-sm">
      <Layers className="h-4 w-4 shrink-0 text-[#7C4DFF]" aria-hidden="true" />
      <span className="font-display text-[11px] font-bold uppercase tracking-widest text-white/55">
        Part of our guide
      </span>
      <Link
        href={`/blog/${pillar.slug}`}
        className="font-semibold text-white underline decoration-[#7C4DFF] decoration-2 underline-offset-2 hover:text-[#B39DFF]"
      >
        {pillar.title}
      </Link>
      {hub && (
        <Link
          href={hub.href}
          className="ml-auto inline-flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wide text-white/55 hover:text-[#B39DFF]"
        >
          All {hub.label} <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      )}
    </aside>
  );
}

export function SeriesList({
  items,
  hub,
  total,
}: {
  items: SeriesItem[];
  hub?: { href: string; label: string };
  total: number;
}) {
  if (!items.length) return null;
  return (
    <section className="border border-white/[0.08] bg-white/[0.02] p-6" aria-labelledby="series-heading">
      <h2 id="series-heading" className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-white/60">
        Go deeper
      </h2>
      <ul className="divide-y divide-white/[0.06]">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/blog/${item.slug}`}
              className="group flex items-start justify-between gap-3 py-2.5 text-sm"
            >
              <span className="font-semibold text-white/85 transition-colors group-hover:text-[#B39DFF]">
                {item.title}
              </span>
              <span className="shrink-0 border border-white/[0.1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/55">
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {hub && total > items.length && (
        <Link
          href={hub.href}
          className="mt-4 inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide text-white/55 transition-colors hover:text-[#B39DFF]"
        >
          All {total} {hub.label} articles <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
