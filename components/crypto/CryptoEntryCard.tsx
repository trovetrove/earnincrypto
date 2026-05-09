// components/crypto/CryptoEntryCard.tsx

import Link from "next/link";
import { Star, Shield, Smartphone, Sparkles } from "lucide-react";
import type { CryptoEntry } from "@/lib/crypto/types";

const PRICE_COLORS: Record<string, { bg: string; text: string }> = {
  free:             { bg: "#34D163", text: "#fff" },
  freemium:         { bg: "#0ABFAA", text: "#111" },
  paid:             { bg: "#FF4F2B", text: "#fff" },
  "token-required": { bg: "#7C4DFF", text: "#fff" },
};

const RISK_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  low:    { bg: "#34D163", text: "#fff", label: "Low Risk" },
  medium: { bg: "#F5C842", text: "#111", label: "Med Risk" },
  high:   { bg: "#FF4F2B", text: "#fff", label: "High Risk" },
};

export function CryptoEntryCard({ entry }: { entry: CryptoEntry }) {
  const priceColor = PRICE_COLORS[entry.priceTier] ?? { bg: "#555", text: "#fff" };
  const risk = RISK_COLORS[entry.riskLevel] ?? RISK_COLORS.medium;

  return (
    <Link href={`/crypto/${entry.category}/${entry.slug}`} className="group block">
      <div className="relative flex h-full flex-col border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/20 hover:bg-white/[0.05]">
        {entry.isFeatured && (
          <div className="absolute -right-1 -top-1 z-10">
            <span className="inline-flex items-center gap-1 bg-[#F5C842] px-2 py-0.5 text-[10px] font-bold text-[#0a0a0a]">
              <Sparkles className="h-2.5 w-2.5" /> Featured
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
              <span className="border border-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/40">
                {entry.chain}
              </span>
            )}
          </div>
        </div>

        <p className="mb-3 flex-1 text-xs leading-relaxed text-white/40 line-clamp-2">
          {entry.shortDescription}
        </p>

        <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-[#F5C842] text-[#F5C842]" />
            <span className="text-xs font-bold text-white/60">{entry.rating}/5</span>
          </div>
          <div className="flex items-center gap-2">
            {entry.isVerified && <Shield className="h-3 w-3 text-[#34D163]" />}
            {entry.isMobileFriendly && <Smartphone className="h-3 w-3 text-white/30" />}
            {entry.potential && (
              <span className="bg-[#7C4DFF]/20 px-2 py-0.5 text-[10px] font-bold text-[#7C4DFF]">
                {entry.potential}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
