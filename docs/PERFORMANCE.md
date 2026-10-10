# Keeping this site cheap to run

Notes on where the compute goes and what has been done about it. Read this
before raising a cache window, lowering one, or adding a route that reads the
database.

## The shape of the problem

Every page on this site is built from one object: the content graph
(`lib/seo/contentGraph.ts`). Building it is two full table scans plus several
O(n²) passes — every article scored against every other, every listing against
every other, every listing against every article.

That is fine once. It was not fine per render, and it *was* per render:

- `revalidate` was 600s on articles and 3600s elsewhere, so every URL
  regenerated between 24 and 144 times a day whether or not anything had
  changed;
- `dynamicParams` is on for three routes, so any URL a bot invented was a full
  render — graph build included — and path-probing bots arrive in bursts;
- `/blog` read `searchParams`, which made it dynamic: every hit, including
  every crawler hit on a noindexed `?category=` variant, re-rendered the list;
- `clerkMiddleware()` wrapped every request on the site, verifying session JWTs
  for readers who have never had a session.

## What is in place now

**The graph is cached across requests, in two layers** (`lib/cache/content.ts`):

1. `unstable_cache` on the raw table reads, tagged, so Supabase is out of the
   request path entirely.
2. A per-instance memo in front of it, so a warm instance parses the payload
   once — and because that memo returns the same array objects, the built graph
   is memoised against a digest of the rows (ids and `updated_at`). Content
   unchanged means the graph is built once per instance, however many pages it
   serves.

Tune layer 2 with `CONTENT_CACHE_SECONDS` (default 300). Layer 1's window is
`CONTENT_REVALIDATE_SECONDS` in that file.

**Derived work is cached against the graph object.** Anything that is a pure
function of the graph and gets asked for per render lives in a `WeakMap` keyed
on the graph, so it is dropped automatically when content changes:

- `declaredPairs()` (`lib/seo/comparisons.ts`) — an O(n²) pass that every
  listing page, the compare index, its static params and the sitemap all want;
- `pickArticleListings()` (`lib/blog/recommendations.ts`) — scores the whole
  directory for one article;
- the normalised strings and sets the scorers in `lib/seo/linkGraph.ts` used to
  re-derive on each of their O(n²) calls.

**ISR windows are a week**, not an hour, because publishing clears them (below).
The sitemap stays at a day. `CONTENT_REVALIDATE_SECONDS` (the table reads) is a
week too.

**A publish purges the tag and re-renders only the pages it touched.**
`revalidateCryptoPages` (`actions/cryptoEntryActions.ts`) calls
`revalidateTag("content")` and revalidates the listing, its category, its topic
hub, its declared comparisons, and the index pages (`/`, `/directory`,
`/compare`, `/topics`, `/sitemap.xml`). It never uses `[param]` patterns: one of
those marks every page under a route stale at once, and crawlers then re-render
all of them. The cost is that generated cross-links on pages that were not
edited (related reading, guides, similar listings) update when their own window
expires, and rows edited directly in Supabase take up to a week to appear, or
until the next deploy.

**OG images read the cached raw rows**, not the link graph
(`getCryptoEntryBySlug`, `getCryptoCountsDirect` in `lib/crypto/queries.ts`).

**Concurrent cold reads are shared.** `processCache` holds the in-flight
promise, so after a purge concurrent renders on an instance share one table
read.

**Invented URLs are rejected before anything loads.** `lib/seo/paths.ts` holds
the shape checks; a slug this site could not have issued never reaches a read.
`/topics/[cluster]` has `dynamicParams = false` — the cluster list is compiled
in, so the set of hub URLs is closed and the router 404s everything else.

**Middleware is page-only and Clerk is admin-only.** See the matcher at the
bottom of `middleware.ts` for what it no longer runs on.

## Publishing: `/api/revalidate`

The week-long windows are only safe because the manage panel clears them. Set
`CONTENT_REVALIDATE_SECRET` in the environment here and in the panel, then call
this after any write:

```
POST https://earnincrypto.io/api/revalidate
x-revalidate-secret: <CONTENT_REVALIDATE_SECRET>
content-type: application/json

{ "scope": "all" }
```

`scope` is `all` (default), `entries`, `posts` or `ads`. Add
`"paths": ["/blog/some-slug"]` to also drop specific pages from the ISR cache —
the tags cover the data, the paths cover rendered HTML that would otherwise sit
until its window expires.

Without the secret set, the route 401s everything and the windows are the only
freshness mechanism — an edit then takes up to a week to appear.

## Crawlers

Two layers again, because `robots.txt` is a request, not an instruction:

- `app/robots.ts` disallows SEO backlink crawlers, scrapers and AI *training*
  crawlers, and allows search engines, link-preview bots and the AI *answer*
  engines that cite and link. `crawlDelay` is gone: the crawlers it was aimed
  at ignore it.
- `middleware.ts` refuses the same agents with a bodyless 403, and the
  WordPress/PHP exploit paths with a 404, before Next renders anything.

Keep the two lists in step. `AGENT_ALLOWLIST` in the middleware exists because
some tokens are substrings of agents that must pass (`claudebot` matches
`claude-user`).

### If a bot gets through anyway

Middleware still costs an invocation per request. For a sustained flood, add a
rule in the Vercel dashboard instead — **Firewall → Custom Rules** — matching
on user agent, path or JA4 and set to Deny or Rate Limit. Those are enforced at
the edge before any function runs, so they cost nothing. The middleware list is
the portable default; the firewall is the right tool for an active abuser.

## Things deliberately not done

- **Trimming `select("*")`.** The graph needs a dozen columns and the listing
  pages need all of them; splitting the read in two would mean a per-page query
  for the full row. Worth revisiting if the data cache starts refusing the
  payload (it drops entries over 2MB and logs it) — the per-instance memo is
  what keeps that from being a cliff.
- **Dropping `ClerkProvider` from the root layout.** It is static (no `dynamic`
  prop), so it costs no server work and needs no middleware — but it does ship
  Clerk's client bundle to every reader. If the admin panel stays out of this
  app, moving the provider down to the admin segment is a real win on client
  JS.
- **Rate limiting in middleware.** Per-instance counters on a serverless
  platform don't add up to a rate limit. Use the firewall.

## Vercel dashboard settings

Not code, so they are not in the repo. Set them under **Firewall**:

1. **Custom Rules**: Deny on user agent containing Ahrefs, Semrush, MJ12, DotBot,
   GPTBot, CCBot (and the other agents in `BLOCKED_AGENTS` in `middleware.ts`),
   and Deny on path matching `/wp-*`, `*.php`, `*.env`. Keep search engines,
   link-preview bots and the answer engines in `AGENT_ALLOWLIST` out of it.
2. **Managed Rules**: turn on **Bot Protection** and **AI Bots**.
