"use client";
/**
 * components/admin/CryptoEntryForm.tsx
 * Admin form for creating/editing crypto entries.
 */

import { useActionState, useEffect, useReducer, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FaqEditor } from "./FaqEditor";
import { RichEditor } from "./RichEditor";
import { Save, X, AlertCircle, Loader2 } from "lucide-react";
import { createCryptoEntry, updateCryptoEntry, type CryptoActionState } from "@/actions/cryptoEntryActions";
import { cryptoCategories } from "@/lib/crypto/data-static";
import type { CryptoEntry } from "@/lib/crypto/types";

const ADMIN = process.env.NEXT_PUBLIC_ADMIN_PATH_SEGMENT ?? "manage-xk9p2";
const init: CryptoActionState = { success: false, message: "" };

type FormState = {
  title: string; slug: string; category: string; shortDesc: string;
  url: string; referralUrl: string; rating: string; potential: string;
  chain: string; token: string; riskLevel: "low" | "medium" | "high";
  priceTier: string; effortLevel: "low" | "medium" | "high";
  freeTierDetails: string; audience: string; bestFor: string;
  tags: string; pros: string; cons: string; howToUse: string;
  alternatives: string; metaTitle: string; metaDesc: string;
  isMobileFriendly: boolean; isFeatured: boolean; isVerified: boolean;
};

function formReducer(s: FormState, patch: Partial<FormState>): FormState {
  return { ...s, ...patch };
}

const F = memo(function F({ label, hint, error, children, required }: {
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

export function CryptoEntryForm({ entry }: { entry?: CryptoEntry }) {
  const router = useRouter();

  const [fields, dispatch] = useReducer(formReducer, {
    title:           entry?.title ?? "",
    slug:            entry?.slug ?? "",
    category:        entry?.category ?? "",
    shortDesc:       entry?.shortDescription ?? "",
    url:             entry?.url ?? "",
    referralUrl:     entry?.referralUrl ?? "",
    rating:          entry?.rating?.toString() ?? "4.0",
    potential:       entry?.potential ?? "",
    chain:           entry?.chain ?? "",
    token:           entry?.token ?? "",
    riskLevel:       entry?.riskLevel ?? "medium",
    priceTier:       entry?.priceTier ?? "free",
    effortLevel:     entry?.effortLevel ?? "low",
    freeTierDetails: entry?.freeTierDetails ?? "",
    audience:        entry?.audience.join(", ") ?? "",
    bestFor:         entry?.bestFor ?? "",
    tags:            entry?.tags.join(", ") ?? "",
    pros:            entry?.pros.join("\n") ?? "",
    cons:            entry?.cons.join("\n") ?? "",
    howToUse:        entry?.howToUse.join("\n") ?? "",
    alternatives:    entry?.alternatives.join(", ") ?? "",
    metaTitle:       entry?.metaTitle ?? "",
    metaDesc:        entry?.metaDescription ?? "",
    isMobileFriendly: entry?.isMobileFriendly ?? false,
    isFeatured:      entry?.isFeatured ?? false,
    isVerified:      entry?.isVerified ?? false,
  });

  const str = useCallback(
    (key: keyof FormState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        dispatch({ [key]: e.target.value } as Partial<FormState>),
    []
  );

  const bound = entry ? updateCryptoEntry.bind(null, entry.id) : null;
  const [state, formAction, isPending] = useActionState(entry ? bound! : createCryptoEntry, init);

  useEffect(() => {
    if (state.success && state.message) {
      toast.success(state.message);
      router.push(`/${ADMIN}/crypto/entries`);
    }
  }, [state.success, state.message, router]);

  const err = (f: string) => state.errors?.[f]?.[0];
  const {
    title, slug, category, shortDesc, url, referralUrl, rating, potential,
    chain, token, riskLevel, priceTier, effortLevel, freeTierDetails,
    audience, bestFor, tags, pros, cons, howToUse, alternatives,
    metaTitle, metaDesc, isMobileFriendly, isFeatured, isVerified,
  } = fields;

  return (
    <form action={formAction} className="space-y-5">
      {/* Hidden fields */}
      <input type="hidden" name="category"         value={category} />
      <input type="hidden" name="priceTier"        value={priceTier} />
      <input type="hidden" name="effortLevel"      value={effortLevel} />
      <input type="hidden" name="riskLevel"        value={riskLevel} />
      <input type="hidden" name="isMobileFriendly" value={isMobileFriendly ? "true" : ""} />
      <input type="hidden" name="isFeatured"       value={isFeatured ? "true" : ""} />
      <input type="hidden" name="isVerified"       value={isVerified ? "true" : ""} />

      {/* Errors */}
      {!state.success && state.message && (
        <div className="flex items-center gap-2 border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />{state.message}
        </div>
      )}
      {state.errors && Object.keys(state.errors).length > 0 && (
        <div className="border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400 space-y-0.5">
          {Object.entries(state.errors).map(([k, v]) => (
            <p key={k}><span className="font-mono">{k}</span>: {(v as string[]).join(", ")}</p>
          ))}
        </div>
      )}

      {/* ── Identity ─────────────────────────────────────────── */}
      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">⛓️ Crypto Tool Identity</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <F label="Name" error={err("title")} required>
            <Input name="title" value={title} onChange={str("title")} placeholder='e.g., "Uniswap"' className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20" required />
          </F>
          <F label="Slug" error={err("slug")} required>
            <Input name="slug" value={slug} onChange={str("slug")} placeholder="uniswap" className="border-white/[0.08] bg-white/[0.04] font-mono text-white placeholder:text-white/20" required />
          </F>
          <F label="Category" error={err("category")} required>
            <Select value={category} onValueChange={(v) => dispatch({ category: v })}>
              <SelectTrigger className="border-white/[0.08] bg-white/[0.04] text-white"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent className="border-white/[0.08] bg-[#1a1a1a]">
                {cryptoCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug} className="text-white/70">{cat.emoji} {cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <F label="Tagline" error={err("shortDescription")} required>
            <Input name="shortDescription" value={shortDesc} onChange={str("shortDesc")} placeholder="The largest decentralized exchange" className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20" required />
          </F>
          <F label="Website URL" error={err("url")} required>
            <Input name="url" type="url" value={url} onChange={str("url")} placeholder="https://uniswap.org" className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20" required />
          </F>
          <F label="Referral URL">
            <Input name="referralUrl" type="url" value={referralUrl} onChange={str("referralUrl")} placeholder="https://..." className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20" />
          </F>
        </div>
      </div>

      {/* ── Crypto-specific fields ───────────────────────────── */}
      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">🔗 Chain & Token</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <F label="Chain" hint="e.g., Ethereum, Solana, Multi-chain">
            <Input name="chain" value={chain} onChange={str("chain")} placeholder="Ethereum" className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20" />
          </F>
          <F label="Token Symbol" hint="without $">
            <Input name="token" value={token} onChange={str("token")} placeholder="UNI" className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20" />
          </F>
          <F label="Potential Value">
            <Input name="potential" value={potential} onChange={str("potential")} placeholder="$500–5,000" className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20" />
          </F>
          <F label="Risk Level" required>
            <Select value={riskLevel} onValueChange={(v) => dispatch({ riskLevel: v as "low" | "medium" | "high" })}>
              <SelectTrigger className="border-white/[0.08] bg-white/[0.04] text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="border-white/[0.08] bg-[#1a1a1a]">
                <SelectItem value="low"    className="text-white/70">🟢 Low Risk</SelectItem>
                <SelectItem value="medium" className="text-white/70">🟡 Medium Risk</SelectItem>
                <SelectItem value="high"   className="text-white/70">🔴 High Risk</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label="Pricing" required>
            <Select value={priceTier} onValueChange={(v) => dispatch({ priceTier: v })}>
              <SelectTrigger className="border-white/[0.08] bg-white/[0.04] text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="border-white/[0.08] bg-[#1a1a1a]">
                <SelectItem value="free"             className="text-white/70">Free</SelectItem>
                <SelectItem value="freemium"         className="text-white/70">Freemium</SelectItem>
                <SelectItem value="paid"             className="text-white/70">Paid</SelectItem>
                <SelectItem value="token-required"   className="text-white/70">Token Required</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label="Rating (1–5)" error={err("rating")} required>
            <Input name="rating" type="number" step="0.1" min="1" max="5" value={rating} onChange={str("rating")} className="border-white/[0.08] bg-white/[0.04] text-white" required />
          </F>
        </div>
      </div>

      {/* ── Description ──────────────────────────────────────── */}
      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">📝 Content</h3>
        <div className="space-y-4">
          <F label="Full Description" error={err("description")} required>
            <RichEditor name="description" defaultValue={entry?.description} placeholder="Explain the tool, protocol or airdrop in detail..." minHeight={220} />
          </F>
          <F label="Our Verdict / Realistic Value">
            <RichEditor name="realisticValue" defaultValue={entry?.realisticValue} placeholder="Is this genuinely worth using? What can users realistically expect?" minHeight={130} />
          </F>
          <div className="grid gap-4 md:grid-cols-2">
            <F label="Pros (one per line)">
              <Textarea name="pros" value={pros} onChange={str("pros")} rows={4} placeholder={"Non-custodial\nHigh liquidity\nWide token support"} className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20 resize-y" />
            </F>
            <F label="Cons / Risks (one per line)">
              <Textarea name="cons" value={cons} onChange={str("cons")} rows={4} placeholder={"Gas fees on Ethereum\nImpermanent loss risk\nSmart contract risk"} className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20 resize-y" />
            </F>
          </div>
          <F label="How to Use / Claim (one step per line)">
            <Textarea name="howToUse" value={howToUse} onChange={str("howToUse")} rows={4} placeholder={"Connect your wallet\nSelect tokens to swap\nApprove and confirm transaction"} className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20 resize-y" />
          </F>
        </div>
      </div>

      {/* ── Metadata ─────────────────────────────────────────── */}
      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">🏷️ Metadata</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <F label="Tags (comma-separated)">
            <Input name="tags" value={tags} onChange={str("tags")} placeholder="defi, dex, ethereum, swap" className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20" />
          </F>
          <F label="Target Audience">
            <Input name="audience" value={audience} onChange={str("audience")} placeholder="DeFi users, Traders, Yield farmers" className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20" />
          </F>
          <F label="Best For">
            <Input name="bestFor" value={bestFor} onChange={str("bestFor")} placeholder="Users looking to swap tokens without a CEX" className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20" />
          </F>
          <F label="Free Tier Details">
            <Input name="freeTierDetails" value={freeTierDetails} onChange={str("freeTierDetails")} placeholder="Free to use, pay only gas fees" className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20" />
          </F>
          <F label="Alternatives (comma-separated)">
            <Input name="alternatives" value={alternatives} onChange={str("alternatives")} placeholder="SushiSwap, 1inch, PancakeSwap" className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20" />
          </F>
          <F label="Effort Level">
            <Select value={effortLevel} onValueChange={(v) => dispatch({ effortLevel: v as "low" | "medium" | "high" })}>
              <SelectTrigger className="border-white/[0.08] bg-white/[0.04] text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="border-white/[0.08] bg-[#1a1a1a]">
                <SelectItem value="low"    className="text-white/70">🟢 Easy</SelectItem>
                <SelectItem value="medium" className="text-white/70">🟡 Moderate</SelectItem>
                <SelectItem value="high"   className="text-white/70">🔴 Complex</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label="Meta Title (max 70)">
            <Input name="metaTitle" value={metaTitle} onChange={str("metaTitle")} maxLength={70} placeholder="Auto-generated" className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20" />
          </F>
          <F label="Meta Description (max 160)">
            <Input name="metaDescription" value={metaDesc} onChange={str("metaDesc")} maxLength={160} placeholder="Auto-generated" className="border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20" />
          </F>
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          {([
            { key: "isMobileFriendly" as const, label: "📱 Mobile Friendly", val: isMobileFriendly },
            { key: "isFeatured"       as const, label: "⭐ Featured",         val: isFeatured },
            { key: "isVerified"       as const, label: "🛡️ Verified",         val: isVerified },
          ]).map(({ key, label, val }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5">
              <Checkbox
                checked={val}
                onCheckedChange={(v) => dispatch({ [key]: v === true } as Partial<FormState>)}
                className="border-white/20 data-[state=checked]:bg-[#7C4DFF] data-[state=checked]:border-[#7C4DFF]"
              />
              <span className="text-sm text-white/60">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">❓ FAQ</h3>
        <FaqEditor defaultValue={entry?.faqItems ?? []} />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending}
          className="flex items-center gap-2 bg-[#7C4DFF] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#7C4DFF]/80 disabled:opacity-50"
          style={{ border: "2px solid rgba(255,255,255,0.1)" }}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {entry ? "Update Entry" : "Create Entry"}
        </button>
        <button type="button" onClick={() => router.push(`/${ADMIN}/crypto/entries`)}
          className="flex items-center gap-2 border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/60 hover:text-white/80">
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>
    </form>
  );
}
