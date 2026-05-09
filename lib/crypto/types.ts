// lib/crypto/types.ts
//
// Shared CryptoEntry type (camelCase for the app).

import type { FaqItem } from "@/lib/supabase/types";

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
  createdAt: string;
  updatedAt: string;
};
