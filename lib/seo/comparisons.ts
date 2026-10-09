// lib/seo/comparisons.ts
//
// Which "A vs B" pages exist, which are worth indexing, and which defer to an
// editorial article. One source for the compare route, the listing pages'
// "Compare" block and the sitemap, so the three can't disagree about a pair.
//
// The /compare/[a]-vs-[b] template renders any two listings in the same
// comparable category — useful for readers, but that makes hundreds of
// machine-generated pairs reachable, and indexing them would be thin
// near-duplicates. Only *declared* pairs are indexable: a listing's
// `comparisons` (if the admin ever adds that column to crypto_entries) or an
// editor-entered alternative that resolves to another listing in the same
// category. And when an editorial "A vs B" article exists, that article is the
// page meant to rank; the template defers to it.

import { isDeclaredAlternative, type GraphEntry } from "./linkGraph";
import { comparisonPath, type ContentGraph, type GraphPostNode } from "./contentGraph";

/**
 * Categories where two listings compete head to head. Airdrops are left out:
 * they are time-boxed campaigns, and "X vs Y airdrop" is an editorial question
 * the blog answers, not a feature table.
 */
const COMPARABLE_CATEGORIES = new Set([
  "exchanges",
  "defi-yield",
  "wallets",
  "trading-tools",
  "learn-earn",
  "launchpads",
  "infrastructure",
  "security",
  "nft-tools",
]);

export function isCategoryComparable(category: string): boolean {
  return COMPARABLE_CATEGORIES.has(category);
}

/** Both listings exist, differ, and sit in the same comparable category. */
export function isComparablePair(a: GraphEntry, b: GraphEntry): boolean {
  return a.id !== b.id && a.category === b.category && isCategoryComparable(a.category);
}

export function isDeclaredPair(a: GraphEntry, b: GraphEntry): boolean {
  return isComparablePair(a, b) && (isDeclaredAlternative(a, b) || isDeclaredAlternative(b, a));
}

export type ComparisonStatus = {
  declared: boolean;
  editorial: GraphPostNode | undefined;
  /** Declared and not shadowed by an editorial article. */
  indexable: boolean;
};

export function comparisonStatus(graph: ContentGraph, a: GraphEntry, b: GraphEntry): ComparisonStatus {
  const declared = isDeclaredPair(a, b);
  const editorial = graph.editorialComparisons.get(comparisonPath(a.slug, b.slug));
  return { declared, editorial, indexable: declared && !editorial };
}

export type DeclaredPairs = Map<string, { a: GraphEntry; b: GraphEntry }>;

/**
 * Cached against the graph, because this is a pass over every ordered pair of
 * listings and it is asked for on every render that shows a head-to-head link:
 * each listing page (via lib/directory/discovery.ts), the compare index, the
 * compare template's static params and the sitemap. The result depends on
 * nothing but the graph, so computing it once per graph is the whole fix.
 */
const pairsByGraph = new WeakMap<ContentGraph, DeclaredPairs>();

/** Every declared pair, keyed by canonical path, in a stable order. */
export function declaredPairs(graph: ContentGraph): DeclaredPairs {
  const cached = pairsByGraph.get(graph);
  if (cached) return cached;

  const out: DeclaredPairs = new Map();
  const sorted = [...graph.entries].sort((x, y) => x.slug.localeCompare(y.slug));
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    // Sorted by slug, so everything at or before i fails the a.slug < b.slug
    // test that used to be checked inside the loop.
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (a.slug === b.slug || !isDeclaredPair(a, b)) continue;
      out.set(comparisonPath(a.slug, b.slug), { a, b });
    }
  }

  pairsByGraph.set(graph, out);
  return out;
}
