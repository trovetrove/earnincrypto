// lib/seo/entryMeta.ts
//
// Title and description templates for directory listings, by category.
//
// The old template gave every listing "X Review 2026 — Airdrops | SideHustleTools
// Crypto", and the layout then appended "| EarnInCrypto" as well. It also
// called an airdrop campaign and a learn-and-earn quest a "Review". Each
// category now gets wording that matches what its searchers type, and every
// variant carries a qualifier so the page never reads like the project's own
// official site. An editor's meta_title (set in the sidehustletools admin)
// always wins, minus any brand typed into it.

import type { CryptoEntry } from "@/lib/crypto/types";
import { composeDescription, CURRENT_YEAR, firstThatFits, stripBrand } from "./metadata";

const Y = CURRENT_YEAR;

/** "LayerZero Airdrop" + "Airdrop" → "LayerZero Airdrop", not "LayerZero Airdrop Airdrop". */
function withNoun(title: string, noun: string): string {
  return new RegExp(`\\b${noun}s?\\b`, "i").test(title) ? title : `${title} ${noun}`;
}

function titleCandidates(entry: CryptoEntry): string[] {
  const t = entry.title.trim();
  switch (entry.category) {
    case "airdrops": {
      const a = withNoun(t, "Airdrop");
      return [
        `${a} ${Y}: Eligibility, Tasks & How to Claim`,
        `${a}: Eligibility, Tasks & How to Claim`,
        `${a}: Eligibility & How to Claim`,
        `${a} Guide (${Y})`,
      ];
    }
    case "exchanges":
      return [
        `${t} Review ${Y}: Fees, Sign-Up Bonus & Safety`,
        `${t} Review ${Y}: Fees, Bonus & Safety`,
        `${t} Review ${Y}: Fees & Safety`,
        `${t} Review ${Y}`,
      ];
    case "defi-yield":
      return [
        `${t} Review ${Y}: Yields, Risks & How It Works`,
        `${t} Review ${Y}: Yields & Risks`,
        `${t} Yields & Risks (${Y})`,
      ];
    case "wallets": {
      const w = withNoun(t, "Wallet");
      return [
        `${w} Review ${Y}: Security, Chains & Fees`,
        `${w} Review ${Y}: Security & Chains`,
        `${w} Review ${Y}`,
      ];
    }
    case "learn-earn":
      return [
        `${t} ${Y}: Rewards, Quests & How to Qualify`,
        `${t}: Rewards & How to Qualify`,
        `${t} Learn & Earn Guide`,
      ];
    case "launchpads":
      return [
        `${t} Review ${Y}: Allocations, Tiers & Fees`,
        `${t} Review ${Y}: Allocations & Tiers`,
        `${t} Launchpad Review`,
      ];
    case "security":
      return [
        `${t} Review ${Y}: What It Protects & How to Use It`,
        `${t} Review: What It Protects & How to Use It`,
        `${t} Review ${Y}`,
      ];
    case "infrastructure":
      return [
        `${t} Review ${Y}: Pricing, Free Tier & Alternatives`,
        `${t} Review ${Y}: Pricing & Alternatives`,
        `${t} Review ${Y}`,
      ];
    case "trading-tools":
    case "nft-tools":
      return [
        `${t} Review ${Y}: Features, Pricing & Alternatives`,
        `${t} Review ${Y}: Features & Pricing`,
        `${t} Review ${Y}`,
      ];
    default:
      return [`${t} Review ${Y}`, `${t} Review`];
  }
}

const DESCRIPTION_SUFFIX: Record<string, string> = {
  airdrops: "Who qualifies, the tasks, realistic value, key dates and the risks to check before you farm it",
  exchanges: "Our review covers fees, the sign-up bonus, withdrawal limits, safety record and alternatives",
  "defi-yield": "Current yields, where they come from, the smart-contract and depeg risks, and how to start",
  wallets: "Security model, supported chains, fees, pros and cons, and the alternatives worth comparing",
  "learn-earn": "What you earn, how to qualify, how long it takes and what the catches are",
  launchpads: "How allocations and tiers work, fees, the odds of getting in and the risks",
  security: "What it checks, how to use it on your wallets and where its protection stops",
  infrastructure: "Pricing, free tier, supported chains, limits and alternatives",
  "trading-tools": "Features, pricing, free plan, strengths, limitations and alternatives",
  "nft-tools": "Features, fees, supported chains and alternatives",
};

export function entryMetaTitle(entry: CryptoEntry): string {
  if (entry.metaTitle?.trim()) return stripBrand(entry.metaTitle);
  return firstThatFits(titleCandidates(entry));
}

export function entryMetaDescription(entry: CryptoEntry): string {
  if (entry.metaDescription?.trim()) return entry.metaDescription;
  return composeDescription(
    entry.shortDescription,
    entry.chain && !/multi|cross/i.test(entry.chain) ? `Chain: ${entry.chain}` : undefined,
    DESCRIPTION_SUFFIX[entry.category] ?? "Features, fees, pros and cons, and alternatives"
  );
}
