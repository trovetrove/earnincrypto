// lib/crypto/data-static.ts
//
// Static crypto categories. A category only renders as an indexable page, and
// only enters the sitemap, while it has listings (see app/[category]/page.tsx).

export type CryptoCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  emoji: string;
  color: string;
  /** <title> core (the brand is appended when it fits). Describes the list, not a provider. */
  seoTitle: string;
  /** Meta description and on-page intro. */
  seoDescription: string;
};

const YEAR = new Date().getFullYear();

export const cryptoCategories: CryptoCategory[] = [
  {
    id: "c1",
    name: "Airdrops",
    slug: "airdrops",
    description: "Free token distributions — retroactive, testnet, and early-access airdrops",
    emoji: "🪂",
    color: "#7C4DFF",
    seoTitle: `Crypto Airdrops ${YEAR}: Eligibility, Tasks & Risks`,
    seoDescription:
      "Live and upcoming crypto airdrops, testnets and points programmes — who qualifies, the tasks involved, realistic value and the risks to check before you farm.",
  },
  {
    id: "c2",
    name: "Exchanges",
    slug: "exchanges",
    description: "Centralized and decentralized exchanges — trading, sign-up bonuses, fee discounts",
    emoji: "🔄",
    color: "#FF4F2B",
    seoTitle: `Best Crypto Exchanges ${YEAR}: Fees, Bonuses & Safety`,
    seoDescription:
      "Centralised and decentralised exchanges reviewed on fees, sign-up bonuses, withdrawal limits, custody and track record — plus who each one suits.",
  },
  {
    id: "c3",
    name: "DeFi Yield",
    slug: "defi-yield",
    description: "Yield farming, staking, liquidity pools, and passive DeFi income",
    emoji: "🌾",
    color: "#34D163",
    seoTitle: `DeFi Yield & Staking Platforms ${YEAR}: Rates & Risks`,
    seoDescription:
      "Lending, staking and liquidity platforms compared on real yields, where the yield comes from, lock-ups and the smart-contract risks behind the APY.",
  },
  {
    id: "c4",
    name: "Wallets",
    slug: "wallets",
    description: "Hardware and software wallets — custody, multi-chain support, security",
    emoji: "👛",
    color: "#F5C842",
    seoTitle: `Best Crypto Wallets ${YEAR}: Security, Chains & Fees`,
    seoDescription:
      "Hardware and software wallets reviewed on their security model, supported chains, fees and recovery options — and what each is actually safe for.",
  },
  {
    id: "c5",
    name: "Trading Tools",
    slug: "trading-tools",
    description: "Charting, analytics, bots, copy-trading, and portfolio trackers",
    emoji: "📊",
    color: "#0ABFAA",
    seoTitle: `Crypto Trading Tools: Charting, Bots & Analytics`,
    seoDescription:
      "Charting platforms, trading bots, copy-trading and portfolio trackers — features, pricing, free plans and the limitations to know first.",
  },
  {
    id: "c6",
    name: "NFT Tools",
    slug: "nft-tools",
    description: "NFT minting, marketplaces, analytics, and collection management",
    emoji: "🖼️",
    color: "#FF3D8A",
    seoTitle: `NFT Tools: Marketplaces, Minting & Analytics`,
    seoDescription:
      "NFT marketplaces, minting platforms and analytics tools — fees, supported chains and what each is best for.",
  },
  {
    id: "c7",
    name: "Learn & Earn",
    slug: "learn-earn",
    description: "Platforms that pay you to learn about crypto — quizzes, courses, rewards",
    emoji: "📚",
    color: "#FF8C00",
    seoTitle: `Learn & Earn Crypto ${YEAR}: Quests & Rewards`,
    seoDescription:
      "Programmes that pay you in crypto to learn or complete quests — what you earn, how to qualify, how long it takes and the catches.",
  },
  {
    id: "c8",
    name: "Infrastructure",
    slug: "infrastructure",
    description: "RPCs, node providers, oracles, bridges, and developer infrastructure",
    emoji: "⛓️",
    color: "#00C2E0",
    seoTitle: `Crypto Infrastructure: RPCs, Bridges & Explorers`,
    seoDescription:
      "RPC and node providers, bridges, explorers and oracles — pricing, free tiers, supported chains and alternatives.",
  },
  {
    id: "c9",
    name: "Security",
    slug: "security",
    description: "Audit tools, wallet security, scam checkers, and smart contract analyzers",
    emoji: "🛡️",
    color: "#EF3F24",
    seoTitle: `Crypto Security Tools: Approvals, Scams & Audits`,
    seoDescription:
      "Tools for revoking token approvals, spotting wallet drainers, simulating transactions and checking contracts before you sign.",
  },
  {
    id: "c10",
    name: "Launchpads",
    slug: "launchpads",
    description: "IDO, IEO, and token launch platforms — early access to new projects",
    emoji: "🚀",
    color: "#9C27B0",
    seoTitle: `Crypto Launchpads ${YEAR}: IDOs, Tiers & Allocations`,
    seoDescription:
      "Token launchpads compared on allocation mechanics, staking tiers, fees and your realistic odds of getting in.",
  },
];

export function getCryptoCategoryBySlug(slug: string): CryptoCategory | undefined {
  return cryptoCategories.find((c) => c.slug === slug);
}
