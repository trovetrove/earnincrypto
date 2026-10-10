// app/directory/page.tsx
import type { Metadata } from "next";
import { getAllCryptoEntries } from "@/lib/crypto/queries";
import { cryptoCategories } from "@/lib/crypto/data-static";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildMetadata, plainText } from "@/lib/seo/metadata";
import { CryptoDirectoryClient, type DirectoryItem } from "./directory-client";

// ISR window: a week, not an hour. Nothing here changes on its own — it changes
// when an editor publishes, and publishing calls /api/revalidate, which clears
// these pages and the row cache behind them. The window is the backstop for a
// webhook that never arrived, so it costs a render a week per URL instead of
// one an hour whether or not anything changed.
export const revalidate = 604800;

export const metadata: Metadata = buildMetadata({
  title: "All Crypto Tools & Airdrops: Browse & Filter",
  description:
    "Browse every crypto airdrop, exchange, DeFi protocol, wallet and tool we've reviewed — filter by category, risk and pricing, or search by chain and token.",
  path: "/directory",
});

// How much of each description the client-side search can match against. The
// full HTML description, FAQ, tasks, fee tables and pros/cons of every listing
// used to be serialised into the page for a search box that only needs a few
// words.
const SEARCH_TEXT_CHARS = 400;

export default async function CryptoDirectoryPage() {
  const entries = await getAllCryptoEntries();
  const items: DirectoryItem[] = entries.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    category: e.category,
    shortDescription: e.shortDescription,
    priceTier: e.priceTier,
    riskLevel: e.riskLevel,
    chain: e.chain,
    token: e.token,
    rating: e.rating,
    potential: e.potential,
    isVerified: e.isVerified,
    isMobileFriendly: e.isMobileFriendly,
    isFeatured: e.isFeatured,
    tags: e.tags,
    createdAt: e.createdAt,
    searchText: plainText(e.description).slice(0, SEARCH_TEXT_CHARS).toLowerCase(),
  }));
  const categories = cryptoCategories.filter((c) => entries.some((e) => e.category === c.slug));

  return (
    <div className="min-h-screen">
      <section className="border-b border-white/[0.06] py-10">
        <div className="container mx-auto px-4">
          <Breadcrumbs className="mb-5" items={[{ label: "Home", href: "/" }, { label: "Directory" }]} />
          <h1 className="mb-1 font-display text-3xl font-black text-white">All Crypto Tools</h1>
          <p className="text-white/60">
            {entries.length} tools, airdrops and opportunities — independently reviewed.
          </p>
        </div>
      </section>
      <CryptoDirectoryClient entries={items} categories={categories} />
    </div>
  );
}
