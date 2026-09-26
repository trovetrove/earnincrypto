// lib/seo/structuredData.ts
//
// Schema.org builders, kept in one place so every page describes itself the
// same way and the markup always matches what is visible.
//
// Deliberate choices:
//
//   * Listing pages are marked up as an editorial Review *of* the project,
//     never as the project's own Product. An editor's single rating is not an
//     aggregate of user reviews, so there is no AggregateRating (a Product with
//     ratingCount 1 is exactly the self-serving review markup Google ignores or
//     penalises); it belongs in reviewRating with an organisation as author.
//   * Airdrop listings describe a time-boxed campaign and how to qualify for
//     it — a guide, not a product — so they get Article.
//   * FAQPage is emitted only where the questions are rendered on the page,
//     from the same filtered list the page renders.

import type { CryptoEntry } from "@/lib/crypto/types";
import type { FaqItem } from "@/lib/supabase/types";
import { absoluteUrl, SITE_NAME, SITE_URL } from "./metadata";

export const LOGO_PATH = "/logo.png";

export function publisherJsonLd() {
  return {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: absoluteUrl(LOGO_PATH), width: 512, height: 512 },
  };
}

/**
 * A byline like "Editorial team" names a group, not a person. Marking it up as
 * a Person would be false; fall back to the organisation.
 */
export function authorJsonLd(authorName?: string) {
  const name = authorName?.trim();
  if (!name || /\b(team|editor(s|ial)?|staff|desk|research)\b|earn\s*in\s*crypto|side\s*hustle\s*tools/i.test(name)) {
    return { "@type": "Organization", name: SITE_NAME, url: SITE_URL };
  }
  return { "@type": "Person", name };
}

/** The FAQ entries a page renders — shared by the markup and the visible list. */
export function visibleFaqs(items: FaqItem[] | undefined): FaqItem[] {
  return (items ?? []).filter((i) => i.question?.trim() && i.answer?.trim());
}

export function faqJsonLd(items: FaqItem[] | undefined) {
  const valid = visibleFaqs(items);
  if (!valid.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: valid.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

/** Categories whose listings are campaigns to qualify for rather than products to review. */
const GUIDE_CATEGORIES = new Set(["airdrops"]);

export function isGuideCategory(category: string): boolean {
  return GUIDE_CATEGORIES.has(category);
}

const APP_CATEGORY: Record<string, string> = {
  exchanges: "FinanceApplication",
  "defi-yield": "FinanceApplication",
  wallets: "FinanceApplication",
  "learn-earn": "EducationalApplication",
  launchpads: "FinanceApplication",
  "trading-tools": "FinanceApplication",
  security: "SecurityApplication",
  infrastructure: "DeveloperApplication",
  "nft-tools": "WebApplication",
};

export function entryJsonLd(entry: CryptoEntry, categoryName: string) {
  const pageUrl = absoluteUrl(`/${entry.category}/${entry.slug}`);

  if (isGuideCategory(entry.category)) {
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: entry.title,
      description: entry.shortDescription,
      url: pageUrl,
      mainEntityOfPage: pageUrl,
      datePublished: entry.createdAt,
      dateModified: entry.updatedAt,
      author: authorJsonLd(),
      publisher: publisherJsonLd(),
      articleSection: categoryName,
    };
  }

  const itemReviewed: Record<string, unknown> = {
    "@type": "SoftwareApplication",
    name: entry.title,
    description: entry.shortDescription,
    applicationCategory: APP_CATEGORY[entry.category] ?? "WebApplication",
    ...(entry.url ? { url: entry.url } : {}),
  };

  return {
    "@context": "https://schema.org",
    "@type": "Review",
    name: `${entry.title} review`,
    url: pageUrl,
    itemReviewed,
    author: authorJsonLd(),
    publisher: publisherJsonLd(),
    datePublished: entry.createdAt,
    dateModified: entry.updatedAt,
    reviewBody: entry.shortDescription,
    ...(entry.rating > 0
      ? {
          reviewRating: {
            "@type": "Rating",
            ratingValue: Number(Number(entry.rating).toFixed(1)),
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

export function itemListJsonLd(name: string, items: { name: string; path: string }[]) {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

/**
 * rel for an outbound CTA. Referral links are paid relationships and must say
 * so (Google requires rel="sponsored" or "nofollow" on affiliate links); a
 * plain link to the project's own site is an ordinary external link.
 */
export function outboundRel(isReferral: boolean): string {
  return isReferral ? "sponsored noopener noreferrer" : "noopener noreferrer";
}
