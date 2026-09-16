// lib/seo/clusters.ts
//
// The topic graph. Every page — article or directory listing — belongs to one
// cluster, and clusters know which of their neighbours are one hop away.
//
// Two things matter about the design here:
//
// 1. A page's cluster is *resolved*, not required. An editor can pin a cluster
//    explicitly in the admin panel, but when the column is blank (which it is
//    for all 151 existing entries until someone labels them) we infer one from
//    the slug, tags and category. That means the linking engine produces sane
//    output on day one and gets sharper as labels are filled in, rather than
//    sitting inert behind a data-entry backlog.
//
// 2. Adjacency is asymmetric-friendly but declared symmetrically here — the
//    resolver reads it both ways. Adjacency is what lets a surveys article send
//    a couple of readers to user-testing (a genuinely adjacent way to earn)
//    without ever sending them to cloud credits.
//
// The cluster list is deliberately the site's *SEO* architecture, not its URL
// architecture. It does not add navigation categories; it groups the ones that
// already exist into the hubs the growth plan calls for.

export type IntentStage = "DISCOVER" | "LEARN" | "COMPARE" | "DECIDE" | "ACT";

export type PageType =
  | "BLOG_GUIDE"
  | "BLOG_ROUNDUP"
  | "BLOG_COMPARISON"
  | "BLOG_LEGIT_CHECK"
  | "BLOG_PAYOUT"
  | "DIRECTORY"
  | "PLAYBOOK"
  | "CATEGORY"
  | "HUB";

export const INTENT_STAGES: IntentStage[] = [
  "DISCOVER",
  "LEARN",
  "COMPARE",
  "DECIDE",
  "ACT",
];

/** Ordering used to work out what "the next step" means for a reader. */
const STAGE_ORDER: Record<IntentStage, number> = {
  DISCOVER: 0,
  LEARN: 1,
  COMPARE: 2,
  DECIDE: 3,
  ACT: 4,
};

export function stageDistance(from: IntentStage, to: IntentStage): number {
  return STAGE_ORDER[to] - STAGE_ORDER[from];
}

export const INTENT_STAGE_OPTIONS: { value: IntentStage; label: string; hint: string }[] = [
  { value: "DISCOVER", label: "Discover", hint: "Broad top-of-funnel — 'how to make money online'." },
  { value: "LEARN", label: "Learn", hint: "Explains how a method works before picking a platform." },
  { value: "COMPARE", label: "Compare", hint: "Roundups and 'best X' — reader is evaluating options." },
  { value: "DECIDE", label: "Decide", hint: "Head-to-head 'A vs B' — reader is down to two." },
  { value: "ACT", label: "Act", hint: "Reviews and payout pages — reader is ready to sign up." },
];

export const PAGE_TYPE_OPTIONS: { value: PageType; label: string }[] = [
  { value: "BLOG_GUIDE", label: "Guide / How-To" },
  { value: "BLOG_ROUNDUP", label: "Roundup / Best-Of" },
  { value: "BLOG_COMPARISON", label: "Comparison (A vs B)" },
  { value: "BLOG_LEGIT_CHECK", label: "Legit Check" },
  { value: "BLOG_PAYOUT", label: "Payout / Earnings" },
  { value: "PLAYBOOK", label: "Playbook" },
];

/** Blog category → sensible default stage and page type when unset. */
const CATEGORY_DEFAULTS: Record<string, { stage: IntentStage; pageType: PageType }> = {
  guide: { stage: "LEARN", pageType: "BLOG_GUIDE" },
  review: { stage: "ACT", pageType: "BLOG_LEGIT_CHECK" },
  comparison: { stage: "DECIDE", pageType: "BLOG_COMPARISON" },
  "best-of": { stage: "COMPARE", pageType: "BLOG_ROUNDUP" },
  payout: { stage: "ACT", pageType: "BLOG_PAYOUT" },
  "legit-check": { stage: "ACT", pageType: "BLOG_LEGIT_CHECK" },
  news: { stage: "DISCOVER", pageType: "BLOG_GUIDE" },
  // crypto blog categories
  airdrop: { stage: "ACT", pageType: "BLOG_GUIDE" },
  security: { stage: "LEARN", pageType: "BLOG_GUIDE" },
};

export function defaultsForCategory(category: string): {
  stage: IntentStage;
  pageType: PageType;
} {
  return CATEGORY_DEFAULTS[category] ?? { stage: "LEARN", pageType: "BLOG_GUIDE" };
}

export type ClusterDef = {
  id: string;
  label: string;
  /** Rendered on hub blocks and cluster nav. */
  blurb: string;
  /** Directory categories whose entries default into this cluster. */
  categories: string[];
  /** Cluster ids one hop away — eligible for a minority of cross links. */
  adjacent: string[];
  /** Slug fragments that pin an entry or post here regardless of category. */
  slugHints: string[];
  /** Lowercase tag / keyword fragments that pull a page into this cluster. */
  tagHints: string[];
  /**
   * Fallback money-page score (0-100) for entries in this cluster that have no
   * explicit revenue_priority. Reflects how commercially live the cluster is,
   * not how good the content is.
   */
  defaultRevenuePriority: number;
};

// ── SideHustleTools clusters ─────────────────────────────────────────
//
// Ten rather than the plan's eight: the plan's list omits fintech referrals and
// general startup software, both of which already have real directory
// inventory here and would otherwise fall into a catch-all and link badly.

export const CLUSTERS: ClusterDef[] = [
  {
    id: "paid-surveys",
    label: "Paid Surveys",
    blurb: "Survey and paid-research panels, what they actually pay, and how to qualify more often.",
    categories: [],
    adjacent: ["user-testing", "reward-platforms", "make-money-online"],
    slugHints: [
      "survey-junkie", "branded-surveys", "prolific", "toluna", "lifepoints",
      "attapoll", "qmee", "yougov", "paidviewpoint", "ipsos-isay",
      "primeopinion", "prime-opinion", "pollpay", "ysense", "survey",
    ],
    tagHints: [
      "surveys", "paid surveys", "online surveys", "survey", "market research",
      "market-research", "panel",
    ],
    defaultRevenuePriority: 85,
  },
  {
    id: "user-testing",
    label: "Website & App Testing",
    blurb: "Usability testing, user research and focus groups — the best-paying end of micro-work.",
    categories: [],
    adjacent: ["paid-surveys", "side-hustle-services", "make-money-online"],
    slugHints: [
      "usertesting", "userlytics", "usercrowd", "dscout", "respondent",
      "cloudresearch", "clickworker", "g-round", "website-user-testing",
      "paid-online-focus-groups", "testing",
    ],
    tagHints: [
      "user research", "website testing", "app testing", "paid testing",
      "usability", "research studies", "paid research", "focus group",
    ],
    defaultRevenuePriority: 90,
  },
  {
    id: "gaming-rewards",
    label: "Gaming Rewards",
    blurb: "Apps and offerwalls that pay for playing games, and what the payouts really look like.",
    categories: [],
    adjacent: ["reward-platforms", "passive-income-apps", "make-money-online"],
    slugHints: [
      "mistplay", "freecash", "scrambly", "gemsloot", "lootup", "idle-empire",
      "cashinstyle", "playing-games", "play-games", "mobile-games", "play-to-earn",
    ],
    tagHints: [
      "games", "mobile games", "rewarded games", "gaming", "offers", "offerwall",
      "play games for money",
    ],
    defaultRevenuePriority: 88,
  },
  {
    id: "passive-income-apps",
    label: "Passive Income Apps",
    blurb: "Bandwidth sharing and other set-and-forget apps — small, genuinely hands-off income.",
    categories: [],
    adjacent: ["gaming-rewards", "reward-platforms", "make-money-online"],
    slugHints: ["honeygain", "pawnsapp", "pawns", "earnapp", "packetstream"],
    tagHints: ["passive income", "bandwidth sharing", "bandwidth", "passive"],
    defaultRevenuePriority: 86,
  },
  {
    id: "reward-platforms",
    label: "Reward & GPT Platforms",
    blurb: "Get-paid-to sites: offers, cashback and points, plus where the cashout thresholds bite.",
    categories: ["earn-money"],
    adjacent: ["gaming-rewards", "paid-surveys", "passive-income-apps", "fintech-referrals"],
    slugHints: [
      "swagbucks", "prizerebel", "inboxdollars", "kashkick", "heycash",
      "cointiply",
    ],
    tagHints: [
      "gpt", "cash rewards", "gift cards", "cashback", "rewards", "offers",
      "instant payouts", "low payout", "crypto rewards",
    ],
    defaultRevenuePriority: 88,
  },
  {
    id: "side-hustle-services",
    label: "Side Hustle Services",
    blurb: "Service businesses and creator hustles you can start with skills rather than capital.",
    categories: ["side-hustles"],
    adjacent: ["make-money-online", "user-testing", "startup-software"],
    slugHints: [
      "ugc", "clipping", "ghostwriting", "flipping", "dropshipping",
      "proofreading", "bookkeeping", "pressure-washing", "window-cleaning",
      "matched-betting", "capcut", "faceless", "amazon-influencer",
      "tiktok-shop", "reddit-marketing", "cold-email", "notion-systems",
      "ai-automation", "google-business-profile", "high-ticket-affiliate",
      "pod-designs", "thrift",
    ],
    tagHints: [
      "freelance", "freelancing", "side hustle", "side-hustle", "service",
      "clients", "agency", "content", "ugc",
    ],
    defaultRevenuePriority: 55,
  },
  {
    id: "make-money-online",
    label: "Make Money Online",
    blurb: "The broad entry points — the guides that introduce every other cluster on the site.",
    categories: ["playbooks"],
    adjacent: [
      "paid-surveys", "gaming-rewards", "reward-platforms",
      "passive-income-apps", "side-hustle-services", "user-testing",
      "fintech-referrals",
    ],
    // Deliberately narrow. This is the fallback cluster, and almost every post
    // on the site is tagged "make money online" / "side hustles" — matching on
    // those would drag specific articles (gaming, surveys, testing) back into
    // the broad bucket and flatten the entire graph. A page lands here by
    // failing to match anything more specific, not by matching this.
    slugHints: ["make-1000-per-month", "make-your-first-100", "newsletter-from-zero"],
    tagHints: ["playbook"],
    defaultRevenuePriority: 35,
  },
  {
    id: "fintech-referrals",
    label: "Banking & Fintech Referrals",
    blurb: "Sign-up bonuses from banking and payment apps — the highest payout per conversion.",
    categories: ["referrals"],
    adjacent: ["reward-platforms", "make-money-online"],
    slugHints: ["referral-program", "paypal", "revolut", "wise", "monzo", "n26", "bunq", "vivid", "curve"],
    tagHints: [
      "referral", "fintech", "banking", "payments", "bonus", "broker",
      "free stocks", "investing", "sign up bonus",
    ],
    defaultRevenuePriority: 95,
  },
  {
    id: "startup-credits",
    label: "Startup Credits & Perks",
    blurb: "Free cloud, SaaS and developer credits — what you get, who qualifies, and for how long.",
    categories: ["free-credits"],
    adjacent: ["ai-startup-tools", "startup-software"],
    slugHints: [
      "for-startups", "for-startup", "startup-program", "startup-credits",
      "activate", "founders-hub", "inception", "stripe-atlas", "developer-perks",
    ],
    tagHints: [
      "startups", "cloud credits", "credits", "saas", "infrastructure",
      "api credits", "startup perks", "developer perks", "perks",
      "startup tools", "free software", "student",
    ],
    defaultRevenuePriority: 65,
  },
  {
    id: "ai-startup-tools",
    label: "AI Startup Tools",
    blurb: "GPU, inference and model credits for AI startups — the most defensible cluster here.",
    categories: ["ai-ml"],
    adjacent: ["startup-credits", "startup-software"],
    slugHints: [
      "anthropic", "openai", "nvidia", "modal", "fireworks", "nebius", "gmi-cloud",
      "pinecone", "deepgram", "elevenlabs", "perplexity", "chatgpt", "claude",
      "replit", "databricks",
    ],
    tagHints: ["ai", "ai-ml", "llm", "gpu", "inference", "vector-search", "ai-startups", "ai-search", "openai"],
    defaultRevenuePriority: 70,
  },
  {
    id: "startup-software",
    label: "Startup Software",
    blurb: "The research, SEO and productivity tools founders actually reach for early on.",
    categories: ["startup-tools", "startup-ideas"],
    adjacent: ["startup-credits", "ai-startup-tools", "side-hustle-services"],
    slugHints: ["semrush", "ahrefs", "ubersuggest", "similarweb", "crunchbase", "product-hunt", "google-trends", "typeform", "hubspot-crm", "notion", "linear"],
    tagHints: [
      "seo", "keyword-research", "competitor-research", "competitor-analysis",
      "productivity", "project management", "crm", "analytics", "no code",
      "idea validation", "product analytics", "startup idea",
    ],
    defaultRevenuePriority: 60,
  },
];

// ── EarnInCrypto clusters ────────────────────────────────────────────

export const CRYPTO_CLUSTERS: ClusterDef[] = [
  {
    id: "airdrops",
    label: "Airdrops",
    blurb: "Live and speculative airdrops, eligibility, and how to farm them without getting rugged.",
    categories: ["airdrops"],
    adjacent: ["wallets", "launchpads", "security"],
    slugHints: ["airdrop", "testnet", "points"],
    tagHints: ["airdrop", "testnet", "points", "farming", "quest"],
    defaultRevenuePriority: 85,
  },
  {
    id: "exchanges",
    label: "Exchanges",
    blurb: "Centralised and decentralised exchanges — fees, sign-up bonuses and withdrawal limits.",
    categories: ["exchanges", "trading-tools"],
    adjacent: ["defi-yield", "wallets", "security"],
    slugHints: ["exchange", "binance", "bybit", "okx", "kraken", "coinbase", "kucoin", "mexc", "gate"],
    tagHints: ["exchange", "cex", "dex", "trading", "spot", "futures", "fees"],
    defaultRevenuePriority: 95,
  },
  {
    id: "defi-yield",
    label: "DeFi & Yield",
    blurb: "Lending, staking and liquidity — real yields, real risks, stated plainly.",
    categories: ["defi-yield"],
    adjacent: ["exchanges", "wallets", "infrastructure"],
    slugHints: ["staking", "yield", "lending", "liquid", "vault", "aave", "lido"],
    tagHints: ["defi", "yield", "staking", "apy", "lending", "liquidity", "farming"],
    defaultRevenuePriority: 88,
  },
  {
    id: "wallets",
    label: "Wallets",
    blurb: "Custodial and self-custody wallets, hardware included — what each is actually safe for.",
    categories: ["wallets"],
    adjacent: ["security", "airdrops", "exchanges"],
    slugHints: ["wallet", "phantom", "metamask", "ledger", "trezor", "rabby", "keplr"],
    tagHints: ["wallet", "self-custody", "hardware", "seed phrase", "custody"],
    defaultRevenuePriority: 80,
  },
  {
    id: "learn-earn",
    label: "Learn & Earn",
    blurb: "Paid-to-learn programmes and quests — the lowest-risk way in for a beginner.",
    categories: ["learn-earn"],
    adjacent: ["airdrops", "exchanges"],
    slugHints: ["learn", "quest", "academy", "earn"],
    tagHints: ["learn and earn", "quests", "education", "beginner", "rewards"],
    defaultRevenuePriority: 75,
  },
  {
    id: "security",
    label: "Security",
    blurb: "Revoking approvals, spotting drainers, and keeping a farming wallet from ruining you.",
    categories: ["security"],
    adjacent: ["wallets", "airdrops"],
    slugHints: ["revoke", "security", "audit", "scam", "approval"],
    tagHints: ["security", "scam", "safety", "audit", "approvals", "phishing"],
    defaultRevenuePriority: 40,
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    blurb: "RPCs, explorers, bridges and the plumbing everything else depends on.",
    categories: ["infrastructure", "nft-tools"],
    adjacent: ["defi-yield", "launchpads", "wallets"],
    slugHints: ["rpc", "node", "bridge", "explorer", "indexer", "oracle"],
    tagHints: ["infrastructure", "rpc", "node", "bridge", "developer", "api"],
    defaultRevenuePriority: 55,
  },
  {
    id: "launchpads",
    label: "Launchpads",
    blurb: "Token sales and launch platforms — allocation mechanics and the odds of actually getting in.",
    categories: ["launchpads"],
    adjacent: ["airdrops", "exchanges", "infrastructure"],
    slugHints: ["launchpad", "ido", "ico", "sale"],
    tagHints: ["launchpad", "ido", "ico", "token sale", "allocation"],
    defaultRevenuePriority: 82,
  },
];

const FALLBACK_CLUSTER = "make-money-online";
const CRYPTO_FALLBACK_CLUSTER = "airdrops";

export type ClusterSet = {
  clusters: ClusterDef[];
  byId: Map<string, ClusterDef>;
  fallback: string;
};

function buildSet(clusters: ClusterDef[], fallback: string): ClusterSet {
  return { clusters, byId: new Map(clusters.map((c) => [c.id, c])), fallback };
}

export const MAIN_CLUSTER_SET = buildSet(CLUSTERS, FALLBACK_CLUSTER);
export const CRYPTO_CLUSTER_SET = buildSet(CRYPTO_CLUSTERS, CRYPTO_FALLBACK_CLUSTER);

export function clusterSetFor(site: "main" | "crypto"): ClusterSet {
  return site === "crypto" ? CRYPTO_CLUSTER_SET : MAIN_CLUSTER_SET;
}

/** Admin dropdown options — blank first so "let the engine infer" stays default. */
export function clusterOptions(site: "main" | "crypto"): { value: string; label: string }[] {
  return [
    { value: "", label: "Auto-detect from tags & category" },
    ...clusterSetFor(site).clusters.map((c) => ({ value: c.id, label: c.label })),
  ];
}

export type ClusterInferenceInput = {
  slug?: string;
  category?: string;
  tags?: string[];
  title?: string;
  keywords?: string[];
};

/**
 * Hyphens, underscores and spaces are used interchangeably across this data —
 * the same concept appears as "cloud-credits", "cloud credits" and
 * "startup-tools" in different rows. Normalising both sides means a hint has to
 * be written once instead of in three spellings.
 */
function normalise(s: string): string {
  return s.toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Below this, the evidence is too thin to trust and the page goes to the
 * fallback cluster instead.
 *
 * This threshold matters more than it looks. Nearly every article on the site
 * carries generic tags like "side hustles" and "make money online", so without
 * it a single incidental tag hit would be enough to assign a specific cluster —
 * and a broad guide would get filed under, say, paid-surveys purely because it
 * mentions surveys once. One solid signal (a slug hit, or two or three
 * agreeing tags) clears it; a passing mention does not.
 */
const MIN_INFERENCE_CONFIDENCE = 25;

/**
 * Best-guess cluster for a page with no explicit label.
 *
 * Slug hints win outright — "usertesting" is user-testing whatever else the row
 * says. Below that, tag and keyword hits accumulate, and the directory category
 * is only a tiebreak, because categories like `earn-money` span four clusters
 * and would otherwise flatten the whole graph back into one bucket.
 */
export function inferCluster(input: ClusterInferenceInput, set: ClusterSet): string {
  const slug = normalise(input.slug ?? "");
  const title = normalise(input.title ?? "");
  const haystack = normalise([...(input.tags ?? []), ...(input.keywords ?? [])].join(" "));

  let best = set.fallback;
  let bestScore = 0;

  for (const c of set.clusters) {
    let score = 0;

    for (const hint of c.slugHints) {
      if (slug.includes(normalise(hint))) {
        // A long, specific hint ("paid online focus groups") is far stronger
        // evidence than a six-letter one, so weight by hint length.
        score += 40 + Math.min(hint.length, 20);
        break;
      }
    }

    for (const hint of c.tagHints) {
      const h = normalise(hint);
      if (haystack.includes(h)) score += 12;
      else if (title.includes(h)) score += 6;
    }

    // A directory category is decent evidence on its own — enough to clear the
    // confidence threshold when paired with a single agreeing tag.
    if (input.category && c.categories.includes(input.category)) score += 15;

    if (score > bestScore) {
      bestScore = score;
      best = c.id;
    }
  }

  return bestScore >= MIN_INFERENCE_CONFIDENCE ? best : set.fallback;
}

/** Explicit label wins; otherwise infer. Unknown labels fall through to inference. */
export function resolveCluster(
  explicit: string | undefined | null,
  input: ClusterInferenceInput,
  set: ClusterSet
): string {
  if (explicit && set.byId.has(explicit)) return explicit;
  return inferCluster(input, set);
}

/** 100 same cluster, 55 one hop away, 0 otherwise. */
export function clusterAffinity(a: string, b: string, set: ClusterSet): number {
  if (a === b) return 100;
  const defA = set.byId.get(a);
  if (defA?.adjacent.includes(b)) return 55;
  const defB = set.byId.get(b);
  if (defB?.adjacent.includes(a)) return 55;
  return 0;
}
