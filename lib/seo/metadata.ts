// lib/seo/metadata.ts
//
// One place that decides how every public page describes itself to search
// engines. Before this, each route hand-built its own Metadata object, and the
// drift showed: listing and category titles appended "| SideHustleTools" or
// "| SideHustleTools Crypto" on top of the root layout's "%s | EarnInCrypto"
// template (every listing shipped a double — and wrong — brand), canonicals on
// listing and category pages fell back to sidehustletools.app when the env var
// was missing, and the root layout's canonical and og:url pointed every page
// that didn't override them at the homepage.
//
// Positioning rule baked into the copy here: EarnInCrypto researches and
// compares crypto projects — it is never the official page for any of them.
// Listing titles therefore always carry a qualifier ("Review", "Eligibility &
// How to Claim") rather than the bare project name.

import type { Metadata } from "next";

export const SITE_NAME = "EarnInCrypto";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://earnincrypto.io").replace(/\/+$/, "");
export const SITE_DESCRIPTION =
  "Independent research on crypto airdrops, exchanges, DeFi yield, wallets and learn-and-earn programmes — what they pay, what they risk and how to start.";

/** Google shows roughly 60 characters of a title before truncating. */
const TITLE_TARGET = 60;
const TITLE_HARD_MAX = 65;
const DESCRIPTION_MAX = 158;
const BRAND_SUFFIX = ` | ${SITE_NAME}`;

export const DEFAULT_OG_IMAGE = "/opengraph-image";

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Removes a trailing brand an editor typed into a stored meta title — this
 * site's, or the sister site's, which older crypto titles carried.
 */
export function stripBrand(title: string): string {
  return title
    .replace(
      /\s*[|–—-]\s*(earn\s*in\s*crypto(\.io)?|side\s*hustle\s*tools(\.app)?(\s*crypto)?|sht\s*[·.]?\s*crypto)\s*$/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The final <title>. Appends the brand only when it still fits — a 58-character
 * keyword title is worth more intact than truncated to make room for the name.
 * Always returned as `absolute` so the layout template can't add a second brand.
 */
export function pageTitle(core: string): { absolute: string } {
  const clean = stripBrand(core);
  if (!clean) return { absolute: SITE_NAME };
  return {
    absolute: clean.length + BRAND_SUFFIX.length <= TITLE_HARD_MAX ? `${clean}${BRAND_SUFFIX}` : clean,
  };
}

/** First candidate that fits the title budget; the last one is the fallback. */
export function firstThatFits(candidates: string[], max = TITLE_TARGET): string {
  const list = candidates.map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean);
  return list.find((c) => c.length <= max) ?? list[list.length - 1] ?? "";
}

export function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trims to the snippet length at a sentence or word boundary. Google rewrites
 * over-long descriptions anyway; trimming ourselves keeps the part we chose.
 */
export function clampDescription(text: string, max = DESCRIPTION_MAX): string {
  const clean = plainText(text);
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const sentenceEnd = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "));
  if (sentenceEnd >= 90) return slice.slice(0, sentenceEnd + 1);
  const space = slice.lastIndexOf(" ", max - 1);
  return `${slice.slice(0, space > 60 ? space : max - 1).replace(/[\s,;:—–-]+$/, "")}…`;
}

/** Joins description fragments, skipping empties, then clamps. */
export function composeDescription(...parts: (string | undefined | null)[]): string {
  const joined = parts
    .map((p) => (p ? plainText(p) : ""))
    .filter(Boolean)
    .map((p) => (/[.!?…]$/.test(p) ? p : `${p}.`))
    .join(" ");
  return clampDescription(joined);
}

/**
 * An editor-supplied canonical is honoured only when it is a real URL. Relative
 * paths are absolutised; anything else (typos, "none", a bare domain fragment)
 * falls back to the page's own URL instead of emitting a broken canonical.
 */
export function resolveCanonical(stored: string | undefined | null, path: string): string {
  const own = absoluteUrl(path);
  const value = stored?.trim();
  if (!value) return own;
  if (value.startsWith("/")) return absoluteUrl(value);
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : own;
  } catch {
    return own;
  }
}

export type PageMetaInput = {
  /** Title without brand — pageTitle() decides whether the brand fits. */
  title: string;
  description: string;
  /** Path of this page, used for canonical and og:url. */
  path: string;
  /** Stored canonical override (validated). */
  canonical?: string | null;
  type?: "website" | "article";
  /** Explicit images. Omit to use the site default (or a file-based opengraph-image). */
  images?: string[];
  /** true when a route segment provides its own opengraph-image file. */
  fileBasedImage?: boolean;
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
};

export function buildMetadata(input: PageMetaInput): Metadata {
  const title = pageTitle(input.title);
  const description = clampDescription(input.description);
  const canonical = resolveCanonical(input.canonical, input.path);
  // A child's openGraph object replaces the parent's wholesale, so the default
  // image has to be restated here or pages without their own lose it.
  const images = input.fileBasedImage
    ? undefined
    : input.images?.length
      ? input.images
      : [DEFAULT_OG_IMAGE];

  return {
    title,
    description,
    alternates: { canonical },
    ...(input.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: title.absolute,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: "en_US",
      type: input.type ?? "website",
      ...(images ? { images } : {}),
      ...(input.type === "article" && input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.type === "article" && input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: title.absolute,
      description,
      ...(images ? { images } : {}),
    },
  };
}

/**
 * Same-day timestamps count as "not updated" — a save a few minutes after
 * publishing isn't news. The admin (sidehustletools) decides when updated_at
 * moves; this side only decides whether the gap is worth saying out loud.
 */
export function isMeaningfullyUpdated(publishedAt?: string, updatedAt?: string): boolean {
  if (!publishedAt || !updatedAt) return false;
  const p = new Date(publishedAt).getTime();
  const u = new Date(updatedAt).getTime();
  if (!Number.isFinite(p) || !Number.isFinite(u)) return false;
  return u - p >= 86_400_000;
}

export function formatDate(iso?: string, month: "long" | "short" = "long"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month, day: "numeric", timeZone: "UTC" });
}

/** Newest valid timestamp in a list, or undefined. */
export function newestDate(dates: (string | undefined | null)[]): Date | undefined {
  let best: number | undefined;
  for (const d of dates) {
    const t = d ? new Date(d).getTime() : NaN;
    if (Number.isFinite(t) && (best === undefined || t > best)) best = t;
  }
  return best === undefined ? undefined : new Date(best);
}

export const CURRENT_YEAR = new Date().getFullYear();
