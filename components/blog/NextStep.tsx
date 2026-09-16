/**
 * components/blog/NextStep.tsx
 *
 * The single "what do I do now?" block at the end of an article.
 *
 * The growth plan's funnel is guide → comparison → directory → referral, and
 * the weak link is the last hop inside the site: a reader finishes an article
 * with no obvious next move and leaves. This is one clear, relevant
 * destination, not a wall of cards — the article's primary destination if the
 * editor set one, otherwise the engine's best-scoring money page.
 *
 * Styled as editorial, never as an ad frame: it links to our own listing page,
 * which then carries the outbound referral with its own disclosure.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CryptoEntry } from "@/lib/crypto/types";

export function NextStep({
  entry,
  label = "Your next step",
}: {
  entry: CryptoEntry | null;
  label?: string;
}) {
  if (!entry) return null;

  return (
    <aside className="border border-emerald-500/25 bg-emerald-500/[0.06] p-6">
      <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400/80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold leading-tight text-white">{entry.title}</p>
      {entry.shortDescription && (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">
          {entry.shortDescription}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/${entry.category}/${entry.slug}`}
          className="inline-flex items-center gap-2 bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#07110d] transition-colors hover:bg-emerald-400"
        >
          Read the full breakdown <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        {entry.potential && (
          <span className="border border-white/[0.1] px-2.5 py-1 text-[11px] font-semibold text-white/60">
            {entry.potential}
          </span>
        )}
        {entry.chain && (
          <span className="border border-white/[0.1] px-2.5 py-1 text-[11px] font-semibold text-white/60">
            {entry.chain}
          </span>
        )}
      </div>
    </aside>
  );
}
