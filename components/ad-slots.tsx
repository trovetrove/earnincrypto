/**
 * components/ad-slots.tsx
 *
 * Ad slots for earnincrypto.io.
 *
 * HOW TO ACTIVATE ADSENSE:
 *   1. Add to .env:
 *        NEXT_PUBLIC_ADSENSE_ENABLED=true
 *        NEXT_PUBLIC_ADSENSE_PUB_ID=ca-pub-XXXXXXXXXX
 *   2. Uncomment the <ins> block and fill in data-ad-slot per placement.
 *   3. Add the AdSense <script> tag to app/layout.tsx <head>.
 */

import { getActiveAd } from "@/lib/ads/queries";
import type { AdPlacement } from "@/lib/supabase/types";

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

/**
 * Until AdSense is switched on, an ad slot renders nothing. The placeholder
 * boxes used to ship to production — dashed "Advertisement 728×90" frames in
 * bordered bands, one of them above every listing's H1 — which pushed the
 * content down, added layout noise on mobile and earned nothing. With
 * NEXT_PUBLIC_ADSENSE_ENABLED=true the slot reserves its full size up front so
 * the ad loading in later can't shift the layout.
 */
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";

export function AdSlot({ id, format = "responsive", className = "" }: AdSlotProps) {
  if (!ADS_ENABLED) return null;
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

/**
 * Full-width banner band. The band renders only with the ad — an empty
 * bordered strip used to sit between the navbar and every page's heading.
 */
export function BannerAd({ id, className = "" }: { id: string; className?: string }) {
  if (!ADS_ENABLED) return null;
  return (
    <div className={`flex justify-center border-white/[0.06] bg-black/20 py-3 ${className}`}>
      <AdSlot id={id} format="leaderboard" />
    </div>
  );
}

export function InlineAd({ className = "" }: { className?: string }) {
  if (!ADS_ENABLED) return null;
  return (
    <div className={`flex justify-center py-1 ${className}`}>
      <AdSlot id="inline" format="responsive" className="w-full" />
    </div>
  );
}

export function SidebarAd({ className = "" }: { className?: string }) {
  if (!ADS_ENABLED) return null;
  return (
    <div className={`flex justify-center ${className}`}>
      <AdSlot id="sidebar" format="rectangle" />
    </div>
  );
}

// ── DB-backed sponsored placement ─────────────────────────────────────
// Renders a sold placement from the `crypto_ads` table, falling back to the
// AdSense slot (nothing at all until AdSense is enabled) when nothing is
// booked. Always labelled — a paid placement must never be mistakable for an
// organic EarnInCrypto recommendation.
export async function DynamicAdSlot({
  placement,
  category,
  format = "responsive",
  className = "",
}: {
  placement: AdPlacement;
  category?: string;
  format?: keyof typeof AD_SIZES;
  className?: string;
}) {
  const ad = await getActiveAd(placement, category);

  if (!ad) {
    return <AdSlot id={placement} format={format} className={className} />;
  }

  return (
    <div className={className}>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/50">
        {ad.sponsoredLabel}
      </p>
      <a
        href={ad.destinationUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group flex items-center gap-4 border border-dashed border-[#7C4DFF]/30 bg-[#7C4DFF]/[0.04] p-4 transition-colors hover:border-[#7C4DFF]/60"
      >
        {ad.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ad.imageUrl}
            alt=""
            className="h-12 w-12 shrink-0 border border-white/10 object-contain"
          />
        )}
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-white group-hover:underline">
            {ad.title}
          </p>
          {ad.description && (
            <p className="mt-0.5 text-xs leading-relaxed text-white/45 line-clamp-2">
              {ad.description}
            </p>
          )}
          <p className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
            by {ad.advertiser}
          </p>
        </div>
      </a>
    </div>
  );
}
