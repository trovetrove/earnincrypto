// app/crypto/directory/page.tsx
import { Metadata } from "next";
import { getAllCryptoEntries } from "@/lib/crypto/queries";
import { cryptoCategories } from "@/lib/crypto/data-static";
import { CryptoDirectoryClient } from "./directory-client";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sidehustletools.app";

export const metadata: Metadata = {
  title: "All Crypto Tools & Airdrops — Browse & Filter",
  description: "Browse and filter through crypto airdrops, exchanges, DeFi tools, wallets, and more. Every listing independently reviewed.",
  alternates: {
    canonical: `${BASE_URL}/crypto/directory`,
  },
};

export default async function CryptoDirectoryPage() {
  const entries = await getAllCryptoEntries();
  return <CryptoDirectoryClient entries={entries} categories={cryptoCategories} />;
}
