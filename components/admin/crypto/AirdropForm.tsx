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

export function AirdropForm({ entry }: { entry?: CryptoEntry }) {
  const router = useRouter();
  const [f, d] = useReducer(r, initState(entry));
  const str = useCallback((k: keyof S) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => d({ [k]: e.target.value } as Partial<S>), []);
  const bound = entry ? updateCryptoEntry.bind(null, entry.id) : null;
  const [state, formAction, isPending] = useActionState(entry ? bound! : createCryptoEntry, init);
  useEffect(() => { if (state.success && state.message) { toast.success(state.message); router.push(`/${ADMIN}/crypto/entries`); } }, [state.success, state.message, router]);
  const err = (k: string) => state.errors?.[k]?.[0];

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="category" value="airdrops" />
      <input type="hidden" name="priceTier" value={f.priceTier} />
      <input type="hidden" name="effortLevel" value={f.effortLevel} />
      <input type="hidden" name="riskLevel" value={f.riskLevel} />
      <input type="hidden" name="isMobileFriendly" value={f.isMobileFriendly ? "true" : ""} />
      <input type="hidden" name="isFeatured" value={f.isFeatured ? "true" : ""} />
      <input type="hidden" name="isVerified" value={f.isVerified ? "true" : ""} />

      {!state.success && state.message && (
        <div className="flex items-center gap-2 border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"><AlertCircle className="h-4 w-4 shrink-0" />{state.message}</div>
      )}

      {/* ── Airdrop Identity ── */}
      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">🪂 Airdrop Identity</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <F label="Airdrop Name" error={err("title")} required><Input name="title" value={f.title} onChange={str("title")} placeholder='e.g., "LayerZero Airdrop"' className={IC} required /></F>
          <F label="Slug" error={err("slug")} required><Input name="slug" value={f.slug} onChange={str("slug")} placeholder="layerzero-airdrop" className={IC_MONO} required /></F>
          <F label="One-liner" error={err("shortDescription")} required><Input name="shortDescription" value={f.shortDesc} onChange={str("shortDesc")} placeholder="Retroactive airdrop for early bridge users" className={IC} required /></F>
          <F label="Estimated Airdrop Value" hint="headline figure"><Input name="potential" value={f.potential} onChange={str("potential")} placeholder="$500–$5,000" className={IC} /></F>
        </div>
      </div>

      {/* ── Chain & Token ── */}
      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">🔗 Chain & Token Details</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <F label="Chain"><Input name="chain" value={f.chain} onChange={str("chain")} placeholder="Ethereum" className={IC} /></F>
          <F label="Token Symbol"><Input name="token" value={f.token} onChange={str("token")} placeholder="ZRO" className={IC} /></F>
          <F label="Airdrop Status">
            <Select value={f.priceTier} onValueChange={v => d({ priceTier: v })}><SelectTrigger className={SC_TRIGGER}><SelectValue /></SelectTrigger>
              <SelectContent className={SC_CONTENT}><SelectItem value="free" className={SC_ITEM}>Free — No cost to claim</SelectItem><SelectItem value="freemium" className={SC_ITEM}>Requires gas fees only</SelectItem><SelectItem value="token-required" className={SC_ITEM}>Token stake required</SelectItem></SelectContent></Select>
          </F>
          <F label="Risk Level">
            <Select value={f.riskLevel} onValueChange={v => d({ riskLevel: v as S["riskLevel"] })}><SelectTrigger className={SC_TRIGGER}><SelectValue /></SelectTrigger>
              <SelectContent className={SC_CONTENT}><SelectItem value="low" className={SC_ITEM}>🟢 Low — Confirmed airdrop</SelectItem><SelectItem value="medium" className={SC_ITEM}>🟡 Medium — Speculative</SelectItem><SelectItem value="high" className={SC_ITEM}>🔴 High — Unconfirmed</SelectItem></SelectContent></Select>
          </F>
          <F label="Effort to Qualify">
            <Select value={f.effortLevel} onValueChange={v => d({ effortLevel: v as S["effortLevel"] })}><SelectTrigger className={SC_TRIGGER}><SelectValue /></SelectTrigger>
              <SelectContent className={SC_CONTENT}><SelectItem value="low" className={SC_ITEM}>🟢 Easy — Just connect wallet</SelectItem><SelectItem value="medium" className={SC_ITEM}>🟡 Moderate — Multiple interactions</SelectItem><SelectItem value="high" className={SC_ITEM}>🔴 Hard — Months of activity</SelectItem></SelectContent></Select>
          </F>
          <F label="Rating (1–5)" error={err("rating")} required><Input name="rating" type="number" step="0.1" min="1" max="5" value={f.rating} onChange={str("rating")} className={IC} required /></F>
        </div>
      </div>

      {/* ── Links ── */}
      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">🔗 Links</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <F label="Claim / Project URL" error={err("url")} required><Input name="url" type="url" value={f.url} onChange={str("url")} placeholder="https://layerzero.network" className={IC} required /></F>
          <F label="Referral Link"><Input name="referralUrl" type="url" value={f.referralUrl} onChange={str("referralUrl")} placeholder="https://..." className={IC} /></F>
        </div>
      </div>

      {/* ── Airdrop Details ── */}
      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">📋 Airdrop Details</h3>
        <F label="Full Description — What is this airdrop & who qualifies?" error={err("description")} required>
          <RichEditor name="description" defaultValue={entry?.description} placeholder="Explain the airdrop: project, eligibility criteria, snapshot date. Use H2 for 'Eligibility', 'Timeline', 'What You Get'." minHeight={220} />
        </F>
        <div className="mt-4"><F label="Eligibility Window / Deadline"><Input name="freeTierDetails" value={f.freeTierDetails} onChange={str("freeTierDetails")} placeholder="Snapshot taken March 1 2026. Claim window: 30 days." className={IC} /></F></div>
      </div>

      {/* ── Eligibility & Risks ── */}
      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">✅ Eligibility & Risks</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <F label="Who Qualifies (one per line)"><Textarea name="pros" value={f.pros} onChange={str("pros")} rows={4} placeholder={"Bridged via LayerZero before snapshot\nUsed 3+ source chains\nAt least 5 transactions"} className={TC} /></F>
          <F label="Risks & Warnings (one per line)"><Textarea name="cons" value={f.cons} onChange={str("cons")} rows={4} placeholder={"Sybil filtering may exclude some\nToken may dump post-airdrop\nClaim requires gas fees"} className={TC} /></F>
        </div>
      </div>

      {/* ── How to Claim ── */}
      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">🎯 How to Claim</h3>
        <F label="Claim Steps (one per line)"><Textarea name="howToUse" value={f.howToUse} onChange={str("howToUse")} rows={5} placeholder={"Go to the official claim page\nConnect your eligible wallet\nCheck your allocation\nSign the claim transaction\nReceive tokens in your wallet"} className={TC} /></F>
      </div>

      {/* ── Our Take ── */}
      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">💬 Our Take — Is This Worth Claiming?</h3>
        <F label="Verdict"><RichEditor name="realisticValue" defaultValue={entry?.realisticValue} placeholder="Is this airdrop legitimate? Realistic value? Hold or sell?" minHeight={130} /></F>
      </div>

      {/* ── Metadata ── */}
      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">🏷️ Metadata</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <F label="Tags"><Input name="tags" value={f.tags} onChange={str("tags")} placeholder="airdrop, ethereum, defi, retroactive" className={IC} /></F>
          <F label="Target Audience"><Input name="audience" value={f.audience} onChange={str("audience")} placeholder="DeFi users, Bridge users, Early adopters" className={IC} /></F>
          <F label="Best For"><Input name="bestFor" value={f.bestFor} onChange={str("bestFor")} placeholder="Users who bridged via LayerZero" className={IC} /></F>
          <F label="Similar Airdrops"><Input name="alternatives" value={f.alternatives} onChange={str("alternatives")} placeholder="Wormhole, StarkNet, zkSync" className={IC} /></F>
          <F label="Meta Title (max 70)"><Input name="metaTitle" value={f.metaTitle} onChange={str("metaTitle")} maxLength={70} className={IC} /></F>
          <F label="Meta Description (max 160)"><Input name="metaDescription" value={f.metaDesc} onChange={str("metaDesc")} maxLength={160} className={IC} /></F>
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          {([{ key: "isMobileFriendly" as const, label: "📱 Mobile Friendly" }, { key: "isFeatured" as const, label: "⭐ Featured" }, { key: "isVerified" as const, label: "🛡️ Verified Project" }]).map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5"><Checkbox checked={f[key]} onCheckedChange={v => d({ [key]: v === true } as Partial<S>)} className="border-white/20 data-[state=checked]:bg-[#7C4DFF] data-[state=checked]:border-[#7C4DFF]" /><span className="text-sm text-white/60">{label}</span></label>
          ))}
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="border border-white/[0.06] bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">❓ FAQ</h3>
        <FaqEditor defaultValue={entry?.faqItems ?? []} />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="flex items-center gap-2 bg-[#7C4DFF] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#7C4DFF]/80 disabled:opacity-50" style={{ border: "2px solid rgba(255,255,255,0.1)" }}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{entry ? "Update Airdrop" : "Create Airdrop"}
        </button>
        <button type="button" onClick={() => router.push(`/${ADMIN}/crypto/entries`)} className="flex items-center gap-2 border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/60 hover:text-white/80"><X className="h-4 w-4" /> Cancel</button>
      </div>
    </form>
  );
}
