/**
 * components/seo/Breadcrumbs.tsx
 *
 * Visible breadcrumbs plus the matching BreadcrumbList structured data, emitted
 * from one source so the two can't drift apart — Google treats a breadcrumb
 * trail that doesn't match the rendered page as a reason to ignore it.
 *
 * The trail reflects the site's topical hierarchy (Blog → cluster → article),
 * not the URL path, which is flat. That's deliberate: breadcrumbs are one of
 * the few places the cluster architecture becomes visible to both readers and
 * crawlers.
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { safeJsonLd } from "@/lib/utils";
import { SITE_URL } from "@/lib/seo/metadata";

export type Crumb = {
  label: string;
  /** Omit on the final crumb — the current page isn't a link. */
  href?: string;
};

export function Breadcrumbs({
  items,
  siteUrl = SITE_URL,
  className = "",
}: {
  items: Crumb[];
  siteUrl?: string;
  className?: string;
}) {
  if (items.length < 2) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      // The last item carries no `item` URL, per Google's guidance that the
      // current page shouldn't link to itself in the trail.
      ...(item.href ? { item: `${siteUrl}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex flex-wrap items-center gap-1 text-xs text-white/50">
          {items.map((item, i) => (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-white/25" aria-hidden="true" />}
              {item.href ? (
                <Link
                  href={item.href}
                  className="font-medium transition-colors hover:text-[#7C4DFF]"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="line-clamp-1 text-white/70">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
