/**
 * components/blog/ArticleStatusBox.tsx
 *
 * Factual status panel for speculative "is this real?" articles — the ones
 * targeting queries like "[Project] Airdrop 2026". The point is that the page
 * stays genuinely useful when the honest answer is "nothing has been
 * announced": the reader gets a definitive answer immediately instead of
 * scrolling through hedging, and we never imply an unannounced airdrop is real.
 */

import { CircleAlert } from "lucide-react";
import type { OpportunityStatus } from "@/lib/supabase/types";

export function ArticleStatusBox({ status }: { status?: OpportunityStatus }) {
  if (!status) return null;

  const rows = [
    { k: "Status", v: status.label },
    { k: "Token", v: status.token },
    { k: "Airdrop", v: status.airdrop },
    { k: "Last checked", v: status.lastChecked },
  ].filter((r) => r.v);

  if (!rows.length) return null;

  return (
    <div className="border border-[#F5C842]/30 bg-[#F5C842]/[0.06] p-5">
      <div className="mb-3 flex items-center gap-2">
        <CircleAlert className="h-4 w-4 text-[#F5C842]" />
        <p className="font-display text-xs font-bold uppercase tracking-widest text-white/60">
          Current Status
        </p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(({ k, v }) => (
          <div key={k} className="flex flex-col gap-0.5">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-white/30">{k}</dt>
            <dd className="text-sm font-semibold text-white/90">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
