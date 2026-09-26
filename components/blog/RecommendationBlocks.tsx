/**
 * components/blog/RecommendationBlocks.tsx
 *
 * Organic, editorially-selected blocks. Styled as part of the page — never
 * with the dashed "Advertisement" frame — so readers can tell at a glance
 * that these are our picks and not paid placement.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CryptoEntryCard } from "@/components/crypto/CryptoEntryCard";
import type { CryptoEntry } from "@/lib/crypto/types";
import type { BlogPost } from "@/lib/blog/queries";

export function WhileYoureHere({ entries }: { entries: CryptoEntry[] }) {
  if (!entries.length) return null;
  return (
    <aside aria-labelledby="while-here" className="border-l-2 border-[#7C4DFF] bg-[#7C4DFF]/[0.05] p-5">
      <h2 id="while-here" className="mb-1 font-display text-sm font-bold uppercase tracking-wide text-white/85">
        While You&apos;re Here
      </h2>
      <p className="mb-4 text-xs text-white/50">
        Live opportunities related to what you&apos;re reading.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((e) => (
          <CryptoEntryCard key={e.id} entry={e} />
        ))}
      </div>
    </aside>
  );
}

export function ExploreMore({ entries }: { entries: CryptoEntry[] }) {
  if (!entries.length) return null;
  return (
    <section>
      <h2 className="mb-1 font-display text-sm font-bold uppercase tracking-widest text-white/60">
        Explore More Crypto Opportunities
      </h2>
      <p className="mb-4 text-sm text-white/50">
        Looking for other ways to earn, trade and use crypto? Here&apos;s what else is worth a look.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map((e) => (
          <CryptoEntryCard key={e.id} entry={e} />
        ))}
      </div>
      <Link
        href="/directory"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/55 transition-colors hover:text-[#7C4DFF]"
      >
        Browse the full directory <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    </section>
  );
}

export function RelatedArticles({ posts }: { posts: BlogPost[] }) {
  if (!posts.length) return null;
  return (
    <section>
      <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-white/60">
        Related Guides
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/blog/${p.slug}`}
            className="group flex flex-col gap-2 border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/20 hover:bg-white/[0.05]"
          >
            <p className="font-display text-sm font-bold leading-snug text-white transition-colors line-clamp-2 group-hover:text-[#7C4DFF]">
              {p.title}
            </p>
            {p.subtitle && (
              <p className="text-xs leading-relaxed text-white/50 line-clamp-2">{p.subtitle}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
