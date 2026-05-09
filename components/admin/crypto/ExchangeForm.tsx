"use client";
import { useActionState, useEffect, useReducer, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, X, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FaqEditor } from "@/components/admin/FaqEditor";
import { RichEditor } from "@/components/admin/RichEditor";
import { createCryptoEntry, updateCryptoEntry, type CryptoActionState } from "@/actions/cryptoEntryActions";
import { F, S, r, initState, ADMIN, IC, IC_MONO, TC, SC_TRIGGER, SC_CONTENT, SC_ITEM } from "./_shared";
import type { CryptoEntry } from "@/lib/crypto/types";
const init: CryptoActionState = { success: false, message: "" };

export function ExchangeForm({ entry }: { entry?: CryptoEntry }) {
  const router = useRouter();
  const [f, d] = useReducer(r, initState(entry));
  const str = useCallback((k: keyof S) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => d({ [k]: e.target.value } as Partial<S>), []);
  const bound = entry ? updateCryptoEntry.bind(null, entry.id) : null;
  const [state, formAction, isPending] = useActionState(entry ? bound! : createCryptoEntry, init);
  useEffect(() => { if (state.success && state.message) { toast.success(state.message); router.push(`/${ADMIN}/crypto/entries`); } }, [state.success, state.message, router]);
  const err = (k: string) => state.errors?.[k]?.[0];

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="category" value="exchanges" />
      <input type="hidden" name="priceTier" value={f.priceTier} /><input type="hidden" name="effortLevel" value={f.effortLevel} /><input type="hidden" name="riskLevel" value={f.riskLevel} />
      <input type="hidden" name="isMobileFriendly" value={f.isMobileFriendly ? "true" : ""} /><input type="hidden" name="isFeatured" value={f.isFeatured ? "true" : ""} /><input type="hidden" name="isVerified" value={f.isVerified ? "true" : ""} />
      {!state.success && state.message && <div className="flex items-center gap-2 border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"><AlertCircle className="h-4 w-4 shrink-0" />{state.message}</div>}

      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">🔄 Exchange Identity</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <F label="Exchange Name" error={err("title")} required><Input name="title" value={f.title} onChange={str("title")} placeholder='"Binance"' className={IC} required /></F>
          <F label="Slug" error={err("slug")} required><Input name="slug" value={f.slug} onChange={str("slug")} placeholder="binance" className={IC_MONO} required /></F>
          <F label="One-liner" error={err("shortDescription")} required><Input name="shortDescription" value={f.shortDesc} onChange={str("shortDesc")} placeholder="The world's largest crypto exchange by volume" className={IC} required /></F>
          <F label="Sign-up Bonus" hint="headline figure"><Input name="potential" value={f.potential} onChange={str("potential")} placeholder="$100 in trading fee credits" className={IC} /></F>
        </div>
      </div>

      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">💱 Trading Details</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <F label="Networks Supported"><Input name="chain" value={f.chain} onChange={str("chain")} placeholder="Multi-chain" className={IC} /></F>
          <F label="Native Token"><Input name="token" value={f.token} onChange={str("token")} placeholder="BNB" className={IC} /></F>
          <F label="Fee Structure">
            <Select value={f.priceTier} onValueChange={v => d({ priceTier: v })}><SelectTrigger className={SC_TRIGGER}><SelectValue /></SelectTrigger>
              <SelectContent className={SC_CONTENT}><SelectItem value="free" className={SC_ITEM}>Free — Zero trading fees</SelectItem><SelectItem value="freemium" className={SC_ITEM}>Low fees (0.1% or less)</SelectItem><SelectItem value="paid" className={SC_ITEM}>Standard fees (0.1–0.5%)</SelectItem><SelectItem value="token-required" className={SC_ITEM}>Fee discount with native token</SelectItem></SelectContent></Select>
          </F>
          <F label="Risk Level">
            <Select value={f.riskLevel} onValueChange={v => d({ riskLevel: v as S["riskLevel"] })}><SelectTrigger className={SC_TRIGGER}><SelectValue /></SelectTrigger>
              <SelectContent className={SC_CONTENT}><SelectItem value="low" className={SC_ITEM}>🟢 Low — Regulated, insured</SelectItem><SelectItem value="medium" className={SC_ITEM}>🟡 Medium — Established but unregulated</SelectItem><SelectItem value="high" className={SC_ITEM}>🔴 High — New or offshore</SelectItem></SelectContent></Select>
          </F>
          <F label="Onboarding Effort">
            <Select value={f.effortLevel} onValueChange={v => d({ effortLevel: v as S["effortLevel"] })}><SelectTrigger className={SC_TRIGGER}><SelectValue /></SelectTrigger>
              <SelectContent className={SC_CONTENT}><SelectItem value="low" className={SC_ITEM}>🟢 Easy — Email signup, quick KYC</SelectItem><SelectItem value="medium" className={SC_ITEM}>🟡 Moderate — Full KYC required</SelectItem><SelectItem value="high" className={SC_ITEM}>🔴 Complex — Institutional verification</SelectItem></SelectContent></Select>
          </F>
          <F label="Rating (1–5)" error={err("rating")} required><Input name="rating" type="number" step="0.1" min="1" max="5" value={f.rating} onChange={str("rating")} className={IC} required /></F>
        </div>
      </div>

      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">🔗 Links</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <F label="Exchange URL" error={err("url")} required><Input name="url" type="url" value={f.url} onChange={str("url")} placeholder="https://binance.com" className={IC} required /></F>
          <F label="Referral Link" hint="readers get sign-up bonus"><Input name="referralUrl" type="url" value={f.referralUrl} onChange={str("referralUrl")} placeholder="https://..." className={IC} /></F>
        </div>
      </div>

      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">📋 Exchange Overview</h3>
        <F label="Full Description — Features, Fees, Security" error={err("description")} required>
          <RichEditor name="description" defaultValue={entry?.description} placeholder="Describe: supported coins, trading pairs, fee structure, security features, supported countries. Use H2 for 'Fees', 'Supported Assets', 'Security'." minHeight={220} />
        </F>
        <div className="mt-4"><F label="KYC / Verification Details"><Input name="freeTierDetails" value={f.freeTierDetails} onChange={str("freeTierDetails")} placeholder="KYC required. Level 1: email only. Level 2: ID verification." className={IC} /></F></div>
      </div>

      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">✅ Strengths & Weaknesses</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <F label="Strengths (one per line)"><Textarea name="pros" value={f.pros} onChange={str("pros")} rows={4} placeholder={"Huge liquidity\nLow trading fees\n500+ trading pairs\nAdvanced charting tools"} className={TC} /></F>
          <F label="Weaknesses (one per line)"><Textarea name="cons" value={f.cons} onChange={str("cons")} rows={4} placeholder={"KYC required\nComplex for beginners\nPast security incidents\nRestricted in some countries"} className={TC} /></F>
        </div>
      </div>

      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">🚀 How to Get Started</h3>
        <F label="Steps (one per line)"><Textarea name="howToUse" value={f.howToUse} onChange={str("howToUse")} rows={5} placeholder={"Create an account at the exchange\nComplete KYC verification\nDeposit crypto or fiat\nStart trading"} className={TC} /></F>
      </div>

      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">💬 Our Verdict</h3>
        <F label="Verdict"><RichEditor name="realisticValue" defaultValue={entry?.realisticValue} placeholder="Is this exchange recommended? Fees vs competitors? Security track record?" minHeight={130} /></F>
      </div>

      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">🏷️ Metadata</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <F label="Tags"><Input name="tags" value={f.tags} onChange={str("tags")} placeholder="exchange, cex, trading, bitcoin" className={IC} /></F>
          <F label="Target Audience"><Input name="audience" value={f.audience} onChange={str("audience")} placeholder="Traders, Beginners, Day traders" className={IC} /></F>
          <F label="Best For"><Input name="bestFor" value={f.bestFor} onChange={str("bestFor")} placeholder="Active traders wanting low fees" className={IC} /></F>
          <F label="Alternative Exchanges"><Input name="alternatives" value={f.alternatives} onChange={str("alternatives")} placeholder="Coinbase, Kraken, Bybit" className={IC} /></F>
          <F label="Meta Title (max 70)"><Input name="metaTitle" value={f.metaTitle} onChange={str("metaTitle")} maxLength={70} className={IC} /></F>
          <F label="Meta Description (max 160)"><Input name="metaDescription" value={f.metaDesc} onChange={str("metaDesc")} maxLength={160} className={IC} /></F>
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          {([{ key: "isMobileFriendly" as const, label: "📱 Mobile App" }, { key: "isFeatured" as const, label: "⭐ Featured" }, { key: "isVerified" as const, label: "🛡️ Verified" }]).map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5"><Checkbox checked={f[key]} onCheckedChange={v => d({ [key]: v === true } as Partial<S>)} className="border-white/20 data-[state=checked]:bg-[#7C4DFF] data-[state=checked]:border-[#7C4DFF]" /><span className="text-sm text-white/60">{label}</span></label>
          ))}
        </div>
      </div>

      <div className="border border-white/[0.06] bg-white/[0.03] p-5"><h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">❓ FAQ</h3><FaqEditor defaultValue={entry?.faqItems ?? []} /></div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="flex items-center gap-2 bg-[#7C4DFF] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#7C4DFF]/80 disabled:opacity-50" style={{ border: "2px solid rgba(255,255,255,0.1)" }}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{entry ? "Update Exchange" : "Create Exchange"}</button>
        <button type="button" onClick={() => router.push(`/${ADMIN}/crypto/entries`)} className="flex items-center gap-2 border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/60 hover:text-white/80"><X className="h-4 w-4" /> Cancel</button>
      </div>
    </form>
  );
}
