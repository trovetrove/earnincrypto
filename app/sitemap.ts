// app/sitemap.ts
//
// Built from the same content graph the pages render from, so it can only list
// URLs that resolve and are meant to be indexed:
//
//   * comparison pairs only when they're declared, both listings exist in the
//     same comparable category, and no editorial "A vs B" article covers the
//     pair (that template is noindexed in favour of the article);
//   * no empty categories and no topic hubs without articles (both noindexed),
//     and no listings in a category the site no longer has;
//   * lastmod is always the newest real content change behind a URL, never
//     "now". Google treats lastmod as a claim that something meaningfully
//     changed; a sitemap that says everything changed on every fetch gets the
//     field ignored.
//
// Drafts never reach the graph (it reads published posts only), so they can't
// leak in here. Hub URLs are /topics/<id>; the old /blog?cluster=<id> entries
// now 301 there.

import type { MetadataRoute } from "next";
import { cryptoCategories } from "@/lib/crypto/data-static";
import { getContentGraph, hubPath } from "@/lib/seo/contentGraph";
import { declaredPairs } from "@/lib/seo/comparisons";
import { absoluteUrl, newestDate } from "@/lib/seo/metadata";

// Rebuilt daily, or on publish via /api/revalidate. The sitemap is fetched by
// crawlers far more often than its contents change.
export const revalidate = 86400;

type SitemapEntry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const graph = await getContentGraph("crypto");
  // A failed read returns an empty graph (the reads log and return []).
  // Throwing at runtime keeps the last good sitemap cached — ISR serves the
  // previous version when a regeneration fails — instead of replacing it with
  // a homepage-only file for an hour. The build itself may run without a
  // database, so it is allowed through.
  if (!graph.entries.length && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("[sitemap] no listings loaded — keeping the previous sitemap");
  }

  const urls: SitemapEntry[] = [];
  const add = (path: string, lastModified: Date | undefined, priority: number) =>
    urls.push({ url: absoluteUrl(path), ...(lastModified ? { lastModified } : {}), priority });

  const entryDates = graph.entries.map((e) => e.updatedAt);
  const postDates = graph.posts.map((p) => p.updatedAt);
  const allDates = [...entryDates, ...postDates];

  // ── Top-level pages ─────────────────────────────────────────────────
  add("/", newestDate(allDates), 1.0);
  if (graph.entries.length) add("/directory", newestDate(entryDates), 0.9);
  if (graph.posts.length) add("/blog", newestDate(postDates), 0.85);

  // ── Topic hubs (only those with articles) ───────────────────────────
  const liveHubs = graph.set.clusters.filter((c) => (graph.postsByCluster.get(c.id)?.length ?? 0) > 0);
  if (liveHubs.length) add("/topics", newestDate(allDates), 0.8);
  for (const c of liveHubs) {
    add(
      hubPath(c.id),
      newestDate([
        ...(graph.postsByCluster.get(c.id) ?? []).map((p) => p.updatedAt),
        ...(graph.entriesByCluster.get(c.id) ?? []).map((e) => e.updatedAt),
      ]),
      0.8
    );
  }

  // ── Blog posts ──────────────────────────────────────────────────────
  for (const p of graph.posts) {
    add(`/blog/${p.slug}`, newestDate([p.updatedAt, p.publishedAt]), p.isPillar ? 0.85 : 0.75);
  }

  // ── Categories (non-empty only) ─────────────────────────────────────
  for (const cat of cryptoCategories) {
    const inCat = graph.entries.filter((e) => e.category === cat.slug);
    if (!inCat.length) continue;
    add(`/${cat.slug}`, newestDate(inCat.map((e) => e.updatedAt)), 0.85);
  }

  // ── Listings (the graph already excludes retired categories) ────────
  for (const e of graph.entries) {
    add(`/${e.category}/${e.slug}`, newestDate([e.updatedAt]), 0.7);
  }

  // ── Declared comparisons that resolve and aren't covered editorially ─
  const pairs = [...declaredPairs(graph)].filter(([path]) => !graph.editorialComparisons.has(path));
  if (pairs.length || graph.editorialComparisons.size) {
    add(
      "/compare",
      newestDate([
        ...pairs.flatMap(([, p]) => [p.a.updatedAt, p.b.updatedAt]),
        ...[...graph.editorialComparisons.values()].map((p) => p.updatedAt),
      ]),
      0.6
    );
  }
  for (const [path, { a, b }] of pairs) add(path, newestDate([a.updatedAt, b.updatedAt]), 0.6);

  return urls;
}
