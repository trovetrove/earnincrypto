// lib/seo/paths.ts
//
// Shape checks for dynamic route params, applied before anything expensive.
//
// Three of this site's routes accept arbitrary segments (/[category]/[slug],
// /blog/[slug], /compare/[comparison]) with `dynamicParams` on, because new
// listings and articles must resolve without a deploy. The cost is that any
// path a bot invents reaches the page and renders it — and path-probing bots
// invent a lot of paths, in bursts, all of them misses.
//
// A slug this site could never have issued cannot match a row, so it never
// needs a database read or a content graph: these predicates let the route
// 404 on the first line instead. They are deliberately generous — they reject
// shapes, not names — so a real slug is never turned away. Every slug the
// manage panel writes is validated against /^[a-z0-9-]+$/ (see
// actions/cryptoEntryActions.ts), which is what these mirror.

/** The slug shape the manage panel enforces, with a sane length bound. */
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

export function isSlugLike(segment: string | undefined): boolean {
  return typeof segment === "string" && SLUG.test(segment) && !segment.endsWith("-");
}

/**
 * "/compare/aave-vs-lido". Both halves have to be slug-shaped on their own,
 * which rules out "-vs-x", "x-vs-" and the long junk strings scanners append.
 */
export function parseComparisonSegment(
  segment: string | undefined
): { slugA: string; slugB: string } | null {
  if (typeof segment !== "string" || segment.length > 160) return null;
  const idx = segment.indexOf("-vs-");
  if (idx <= 0) return null;
  const slugA = segment.slice(0, idx);
  const slugB = segment.slice(idx + 4);
  if (!isSlugLike(slugA) || !isSlugLike(slugB) || slugA === slugB) return null;
  return { slugA, slugB };
}
