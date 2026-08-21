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
    <aside className="border-l-2 border-[#7C4DFF] bg-[#7C4DFF]/[0.05] p-5">
      <p className="mb-1 font-display text-sm font-bold uppercase tracking-wide text-white/85">
        While You&apos;re Here
      </p>
      <p className="mb-4 text-xs text-white/35">
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
      <h2 className="mb-1 font-display text-sm font-bold uppercase tracking-widest text-white/40">
        Explore More Crypto Opportunities
      </h2>
      <p className="mb-4 text-sm text-white/35">
        Looking for other ways to earn, trade and use crypto? Here&apos;s what else is worth a look.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map((e) => (
          <CryptoEntryCard key={e.id} entry={e} />
        ))}
      </div>
      <Link
        href="/directory"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/40 transition-colors hover:text-[#7C4DFF]"
      >
        Browse the full directory <ArrowRight className="h-3 w-3" />
      </Link>
    </section>
  );
}

export function RelatedArticles({ posts }: { posts: BlogPost[] }) {
  if (!posts.length) return null;
  return (
    <section>
      <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-white/40">
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
              <p className="text-xs leading-relaxed text-white/40 line-clamp-2">{p.subtitle}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Blog articles surfaced on a directory listing page — closes the loop. */
export function RelatedGuides({ posts }: { posts: BlogPost[] }) {
  if (!posts.length) return null;
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] p-5">
      <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-white/40">
        Related Guides
      </h2>
      <ul className="space-y-2.5">
        {posts.map((p) => (
          <li key={p.id}>
            <Link
              href={`/blog/${p.slug}`}
              className="group flex items-start gap-2 text-sm text-white/60 transition-colors hover:text-[#7C4DFF]"
            >
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7C4DFF]" />
              <span className="font-medium">{p.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
