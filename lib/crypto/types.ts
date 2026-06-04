// lib/crypto/types.ts

import type { FaqItem } from "@/lib/supabase/types";

export type CryptoTask = {
  type: string; title: string; description: string; required: boolean; points: string;
};
export type CryptoReward = {
  label: string; amount: string; token: string; usdValue: string; vesting: string;
};
export type CryptoRequirement = { type: string; label: string; value: string };
export type CryptoDate = { label: string; date: string; note: string };
export type FeeTier = { tier: string; makerFee: string; takerFee: string; requirement: string };
export type YieldTier = { asset: string; apy: string; tvl: string; lockPeriod: string; notes: string };
export type StatItem = { label: string; value: string };
export type SocialLink = { platform: string; url: string };

export type CryptoEntry = {
  id: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  shortDescription: string;
  url: string;
  referralUrl?: string;
  logoUrl?: string;
  priceTier: "free" | "freemium" | "paid" | "token-required";
  rating: number;
  potential: string;
  effortLevel: "low" | "medium" | "high";
  chain?: string;
  token?: string;
  riskLevel: "low" | "medium" | "high";
  audience: string[];
  tags: string[];
  pros: string[];
  cons: string[];
  howToUse: string[];
  alternatives: string[];
  freeTierDetails?: string;
  realisticValue: string;
  isMobileFriendly: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  metaTitle?: string;
  metaDescription?: string;
  bestFor?: string;
  faqItems: FaqItem[];
  // v2 structured fields
  tasks: CryptoTask[];
  rewards: CryptoReward[];
  requirements: CryptoRequirement[];
  importantDates: CryptoDate[];
  feeTiers: FeeTier[];
  yieldTiers: YieldTier[];
  statsBar: StatItem[];
  socialLinks: SocialLink[];
  supportedAssets: string;
  createdAt: string;
  updatedAt: string;
};
