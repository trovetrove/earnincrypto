// lib/crypto/data-static.ts
//
// Static crypto categories — mirrors lib/data-static.ts pattern.

export type CryptoCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  emoji: string;
  color: string;
};

export const cryptoCategories: CryptoCategory[] = [
  {
    id: "c1",
    name: "Airdrops",
    slug: "airdrops",
    description: "Free token distributions — retroactive, testnet, and early-access airdrops",
    emoji: "🪂",
    color: "#7C4DFF",
  },
  {
    id: "c2",
    name: "Exchanges",
    slug: "exchanges",
    description: "Centralized and decentralized exchanges — trading, sign-up bonuses, fee discounts",
    emoji: "🔄",
    color: "#FF4F2B",
  },
  {
    id: "c3",
    name: "DeFi Yield",
    slug: "defi-yield",
    description: "Yield farming, staking, liquidity pools, and passive DeFi income",
    emoji: "🌾",
    color: "#34D163",
  },
  {
    id: "c4",
    name: "Wallets",
    slug: "wallets",
    description: "Hardware and software wallets — custody, multi-chain support, security",
    emoji: "👛",
    color: "#F5C842",
  },
  {
    id: "c5",
    name: "Trading Tools",
    slug: "trading-tools",
    description: "Charting, analytics, bots, copy-trading, and portfolio trackers",
    emoji: "📊",
    color: "#0ABFAA",
  },
  {
    id: "c6",
    name: "NFT Tools",
    slug: "nft-tools",
    description: "NFT minting, marketplaces, analytics, and collection management",
    emoji: "🖼️",
    color: "#FF3D8A",
  },
  {
    id: "c7",
    name: "Learn & Earn",
    slug: "learn-earn",
    description: "Platforms that pay you to learn about crypto — quizzes, courses, rewards",
    emoji: "📚",
    color: "#FF8C00",
  },
  {
    id: "c8",
    name: "Infrastructure",
    slug: "infrastructure",
    description: "RPCs, node providers, oracles, bridges, and developer infrastructure",
    emoji: "⛓️",
    color: "#00C2E0",
  },
  {
    id: "c9",
    name: "Security",
    slug: "security",
    description: "Audit tools, wallet security, scam checkers, and smart contract analyzers",
    emoji: "🛡️",
    color: "#EF3F24",
  },
  {
    id: "c10",
    name: "Launchpads",
    slug: "launchpads",
    description: "IDO, IEO, and token launch platforms — early access to new projects",
    emoji: "🚀",
    color: "#9C27B0",
  },
];

export function getCryptoCategoryBySlug(slug: string): CryptoCategory | undefined {
  return cryptoCategories.find((c) => c.slug === slug);
}
