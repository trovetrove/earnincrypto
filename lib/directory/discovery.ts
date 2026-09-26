// lib/directory/discovery.ts
//
// Everything a listing page links to, straight from the content graph:
//
//   guides        — the articles about this project (its review, its
//                   alternatives, comparisons it's part of), then pinned
//                   articles, its topic's pillar guide, articles that mention
//                   it and sibling articles.
//   alternatives  — interchangeable listings: cluster, category, tags and
//                   chain, with editor-declared alternatives honoured when
//                   plausible and under-linked listings given a fair share.
//   hub           — the topic hub the listing belongs to.
//   comparisons   — head-to-heads that actually resolve. A pair with an
//                   editorial "A vs B" article links to the article; a
//                   declared pair without one links to the compare page.
//
// This replaces a same-category "Similar Tools" query and a "You May Also
// Like" grid reshuffled daily from the top 30 listings in any category (whose
// links pointed at /crypto/..., a path this site doesn't have). Links that
// change daily teach search engines nothing, and random cross-category picks
// connected an airdrop to an RPC provider.

import { getContentGraph, hubPath, comparisonPath } from "@/lib/seo/contentGraph";
import { declaredPairs } from "@/lib/seo/comparisons";
import { getGuidesForEntry, type EntryGuide } from "@/lib/blog/queries";
import { entriesFromGraph } from "@/lib/crypto/queries";
import type { CryptoEntry } from "@/lib/crypto/types";

export type EntryDiscovery = {
  guides: EntryGuide[];
  alternatives: CryptoEntry[];
  hub: { href: string; label: string; blurb: string; articleCount: number } | null;
  comparisons: { href: string; label: string; editorial: boolean }[];
};

export async function getEntryDiscovery(entry: CryptoEntry, alternativesLimit = 4): Promise<EntryDiscovery> {
  const graph = await getContentGraph("crypto");
  const node = graph.entryBySlug.get(entry.slug);
  if (!node) return { guides: [], alternatives: [], hub: null, comparisons: [] };

  const [guides, alternatives] = await Promise.all([
    getGuidesForEntry(entry.slug, 4),
    entriesFromGraph((graph.similarEntries.get(node.id) ?? []).slice(0, alternativesLimit).map((l) => l.entry.id)),
  ]);

  const def = graph.set.byId.get(node.cluster);
  const articleCount = graph.postsByCluster.get(node.cluster)?.length ?? 0;
  const hub = def ? { href: hubPath(def.id), label: def.label, blurb: def.blurb, articleCount } : null;

  // Editorial articles first — each is the page meant to rank for its pair —
  // then declared pairs that have no article yet.
  const comparisons: EntryDiscovery["comparisons"] = [];
  const seen = new Set<string>();
  for (const [path, article] of graph.editorialComparisons) {
    if (!article.subjectEntitySlugs.includes(entry.slug)) continue;
    const otherSlug = article.subjectEntitySlugs.find((s) => s !== entry.slug);
    const other = otherSlug ? graph.entryBySlug.get(otherSlug) : undefined;
    if (!other) continue;
    seen.add(path);
    comparisons.push({ href: `/blog/${article.slug}`, label: `${entry.title} vs ${other.title}`, editorial: true });
  }
  for (const [path, { a, b }] of declaredPairs(graph)) {
    if (seen.has(path) || (a.slug !== entry.slug && b.slug !== entry.slug)) continue;
    const other = a.slug === entry.slug ? b : a;
    comparisons.push({ href: comparisonPath(a.slug, b.slug), label: `${entry.title} vs ${other.title}`, editorial: false });
  }

  return { guides, alternatives, hub, comparisons: comparisons.slice(0, 6) };
}
