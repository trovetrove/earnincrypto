/**
 * components/ad-slots.tsx
 *
 * Ad placeholders + "You May Also Like" for earnincrypto.io
 *
 * HOW TO ACTIVATE ADSENSE:
 *   1. Add to .env:
 *        NEXT_PUBLIC_ADSENSE_ENABLED=true
 *        NEXT_PUBLIC_ADSENSE_PUB_ID=ca-pub-XXXXXXXXXX
 *   2. Uncomment the <ins> block and fill in data-ad-slot per placement.
 *   3. Add the AdSense <script> tag to app/layout.tsx <head>.
 */

import Link from "next/link";
import type { CryptoEntry } from "@/lib/crypto/types";

const AD_SIZES: Record<string, { w: string; h: string; label: string }> = {
  leaderboard: { w: "100%",  h: "90px",  label: "728×90 Leaderboard"      },
  rectangle:   { w: "300px", h: "250px", label: "300×250 Rectangle"       },
  large:       { w: "336px", h: "280px", label: "336×280 Large Rectangle" },
  halfpage:    { w: "300px", h: "600px", label: "300×600 Half Page"       },
  responsive:  { w: "100%",  h: "100px", label: "Responsive"              },
};

interface AdSlotProps {
  id: string;
  format?: keyof typeof AD_SIZES;
  className?: string;
}

export function AdSlot({ id, format = "responsive", className = "" }: AdSlotProps) {
  const size = AD_SIZES[format] ?? AD_SIZES.responsive;

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size.w,
        height: size.h,
        border: "1px dashed rgba(124,77,255,0.2)",
        background: "rgba(124,77,255,0.03)",
        maxWidth: "100%",
      }}
      data-ad-id={id}
    >
      <div className="text-center select-none">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/15">
          Advertisement
        </p>
        <p className="text-[9px] text-white/10">{size.label}</p>
      </div>
    </div>
  );

  /*
   * ── UNCOMMENT FOR REAL ADSENSE ──────────────────────────────────────
   * return (
   *   <div className={`flex justify-center ${className}`}>
   *     <ins
   *       className="adsbygoogle"
   *       style={{ display: "block", width: size.w, height: size.h }}
   *       data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}
   *       data-ad-slot="YOUR_AD_SLOT_ID"
   *       data-ad-format="auto"
   *       data-full-width-responsive="true"
   *     />
   *   </div>
   * );
   */
}

export function InlineAd({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center py-1 ${className}`}>
      <AdSlot id="inline" format="responsive" className="w-full" />
    </div>
  );
}

export function SidebarAd({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <AdSlot id="sidebar" format="rectangle" />
    </div>
  );
}

// ── "You May Also Like" for crypto entries ────────────────────────────
interface YouMayAlsoLikeProps {
  entries: CryptoEntry[];
  title?: string;
  className?: string;
}

export function YouMayAlsoLike({
  entries,
  title = "You May Also Like",
  className = "",
}: YouMayAlsoLikeProps) {
  if (!entries.length) return null;

  return (
    <div className={className}>
      <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-white/40">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={`/crypto/${entry.category}/${entry.slug}`}
            className="group flex flex-col gap-2 border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/20 hover:bg-white/[0.05]"
          >
            <p className="font-display text-sm font-bold text-white group-hover:text-[#7C4DFF] transition-colors line-clamp-1">
              {entry.title}
            </p>
            <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
              {entry.shortDescription}
            </p>
            {entry.potential && (
              <span className="mt-auto inline-block w-fit bg-[#7C4DFF]/20 px-2 py-0.5 text-[10px] font-bold text-[#7C4DFF]">
                {entry.potential}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
