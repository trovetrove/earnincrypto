"use client";

import { memo } from "react";
import { AlertCircle } from "lucide-react";

export { useActionState, useEffect, useReducer, useCallback } from "react";
export { useRouter } from "next/navigation";
export { toast } from "sonner";
export { Input } from "@/components/ui/input";
export { Textarea } from "@/components/ui/textarea";
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export { Checkbox } from "@/components/ui/checkbox";
export { FaqEditor } from "@/components/admin/FaqEditor";
export { RichEditor } from "@/components/admin/RichEditor";
export { Save, X, AlertCircle, Loader2 } from "lucide-react";
export { createCryptoEntry, updateCryptoEntry } from "@/actions/cryptoEntryActions";
export type { CryptoActionState } from "@/actions/cryptoEntryActions";
export type { CryptoEntry } from "@/lib/crypto/types";

export const ADMIN = process.env.NEXT_PUBLIC_ADMIN_PATH_SEGMENT ?? "manage-xk9p2";

export type S = {
  title: string; slug: string; shortDesc: string; url: string; referralUrl: string;
  rating: string; potential: string; chain: string; token: string;
  riskLevel: "low"|"medium"|"high"; effortLevel: "low"|"medium"|"high";
  priceTier: string; freeTierDetails: string; audience: string; bestFor: string;
  tags: string; pros: string; cons: string; howToUse: string; alternatives: string;
  metaTitle: string; metaDesc: string;
  isMobileFriendly: boolean; isFeatured: boolean; isVerified: boolean;
};

export function r(s: S, p: Partial<S>): S { return { ...s, ...p }; }

export function initState(entry?: import("@/lib/crypto/types").CryptoEntry): S {
  return {
    title: entry?.title ?? "", slug: entry?.slug ?? "", shortDesc: entry?.shortDescription ?? "",
    url: entry?.url ?? "", referralUrl: entry?.referralUrl ?? "", rating: entry?.rating?.toString() ?? "4.0",
    potential: entry?.potential ?? "", chain: entry?.chain ?? "", token: entry?.token ?? "",
    riskLevel: entry?.riskLevel ?? "medium", effortLevel: entry?.effortLevel ?? "medium",
    priceTier: entry?.priceTier ?? "free", freeTierDetails: entry?.freeTierDetails ?? "",
    audience: entry?.audience.join(", ") ?? "", bestFor: entry?.bestFor ?? "",
    tags: entry?.tags.join(", ") ?? "", pros: entry?.pros.join("\n") ?? "",
    cons: entry?.cons.join("\n") ?? "", howToUse: entry?.howToUse.join("\n") ?? "",
    alternatives: entry?.alternatives.join(", ") ?? "", metaTitle: entry?.metaTitle ?? "",
    metaDesc: entry?.metaDescription ?? "",
    isMobileFriendly: entry?.isMobileFriendly ?? false, isFeatured: entry?.isFeatured ?? false,
    isVerified: entry?.isVerified ?? false,
  };
}

export const F = memo(function F({ label, hint, error, children, required }: {
  label: string; hint?: string; error?: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-white/50">
        {label}{required && <span className="text-red-400"> *</span>}
        {hint && <span className="ml-1.5 text-[10px] text-white/20">— {hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1 flex items-center gap-1 text-xs text-red-400"><AlertCircle className="h-3 w-3" />{error}</p>}
    </div>
  );
});

// Standard input class strings
export const IC = "border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20";
export const IC_MONO = "border-white/[0.08] bg-white/[0.04] font-mono text-white placeholder:text-white/20";
export const TC = "border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20 resize-y";
export const SC_TRIGGER = "border-white/[0.08] bg-white/[0.04] text-white";
export const SC_CONTENT = "border-white/[0.08] bg-[#1a1a1a]";
export const SC_ITEM = "text-white/70";
