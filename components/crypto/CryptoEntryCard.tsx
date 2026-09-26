// components/crypto/CryptoEntryCard.tsx

import Link from "next/link";
import { Star, Shield, Smartphone, Sparkles } from "lucide-react";
import type { CryptoEntry } from "@/lib/crypto/types";

// Light fills (green, teal, yellow) take ink text: white on #34D163 is about
// 2:1 contrast, well under the 4.5:1 small text needs.
const INK = "#0a0a0a";

const PRICE_COLORS: Record<string, { bg: string; text: string }> = {
  free:             { bg: "#34D163", text: INK },
  freemium:         { bg: "#0ABFAA", text: INK },
  paid:             { bg: "#FF4F2B", text: INK },
  "token-required": { bg: "#7C4DFF", text: "#fff" },
};

const RISK_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  low:    { bg: "#34D163", text: INK, label: "Low Risk" },
  medium: { bg: "#F5C842", text: INK, label: "Med Risk" },
  high:   { bg: "#FF4F2B", text: INK, label: "High Risk" },
};

/** The fields a card renders — all a client list needs to ship per listing. */
export type CryptoCardData = Pick<
  CryptoEntry,
  | "id" | "title" | "slug" | "category" | "shortDescription" | "priceTier" | "riskLevel"
  | "chain" | "rating" | "isVerified" | "isMobileFriendly" | "isFeatured" | "potential"
>;

export function CryptoEntryCard({ entry }: { entry: CryptoCardData }) {
  const priceColor = PRICE_COLORS[entry.priceTier] ?? { bg: "#555", text: "#fff" };
  const risk = RISK_COLORS[entry.riskLevel] ?? RISK_COLORS.medium;

  return (
    <Link href={`/${entry.category}/${entry.slug}`} className="group block">
      <div className="relative flex h-full flex-col border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/20 hover:bg-white/[0.05]">
        {entry.isFeatured && (
          <div className="absolute -right-1 -top-1 z-10">
            <span className="inline-flex items-center gap-1 bg-[#F5C842] px-2 py-0.5 text-[10px] font-bold text-[#0a0a0a]">
              <Sparkles className="h-2.5 w-2.5" aria-hidden="true" /> Featured
            </span>
          </div>
        )}

        <div className="mb-3">
          <h3 className="font-display text-base font-bold text-white group-hover:text-[#7C4DFF] transition-colors leading-tight">
            {entry.title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              className="px-1.5 py-0.5 text-[10px] font-bold uppercase"
              style={{ background: priceColor.bg, color: priceColor.text }}
            >
              {entry.priceTier}
            </span>
            <span
              className="px-1.5 py-0.5 text-[10px] font-bold uppercase"
              style={{ background: risk.bg, color: risk.text }}
            >
              {risk.label}
            </span>
            {entry.chain && (
              <span className="border border-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/60">
                {entry.chain}
              </span>
            )}
          </div>
        </div>

        <p className="mb-3 flex-1 text-xs leading-relaxed text-white/55 line-clamp-2">
          {entry.shortDescription}
        </p>

        <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-[#F5C842] text-[#F5C842]" aria-hidden="true" />
            <span className="text-xs font-bold text-white/70">{entry.rating}/5</span>
          </div>
          <div className="flex items-center gap-2">
            {entry.isVerified && <Shield className="h-3 w-3 text-[#34D163]" aria-label="Verified" />}
            {entry.isMobileFriendly && <Smartphone className="h-3 w-3 text-white/45" aria-label="Mobile friendly" />}
            {entry.potential && (
              <span className="bg-[#7C4DFF]/20 px-2 py-0.5 text-[10px] font-bold text-[#B39DFF]">
                {entry.potential}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
