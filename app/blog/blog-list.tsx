"use client";

// app/blog/blog-list.tsx
//
// The filterable part of the blog index.
//
// /blog used to read `searchParams` on the server, which made the whole route
// dynamic: every hit — including every crawler hit on a `?category=` variant
// that is noindexed anyway — was a fresh server render of the entire list.
// The filter is one predicate over a list the page already has, so it belongs
// here. /blog is now static, and the variants cost nothing at all.
//
// Same approach as app/directory/directory-client.tsx. The server passes a
// flattened item per post (dates already formatted) so nothing in lib/seo ends
// up in the client bundle.

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type BlogListItem = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  publishedLabel: string;
  isFeatured: boolean;
  typeLabel: string | null;
};

export type BlogListCategory = { value: string; label: string };

function chipClass(active: boolean): string {
  return `border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
    active
      ? "border-[#7C4DFF] bg-[#7C4DFF]/15 text-[#B39DFF]"
      : "border-white/[0.1] text-white/60 hover:text-white"
  }`;
}

export function BlogList({
  posts: allPosts,
  categories,
  banner,
}: {
  posts: BlogListItem[];
  categories: BlogListCategory[];
  /** The ad band, rendered on the server so no ad code reaches the client. */
  banner?: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const raw = searchParams.get("category");
  // Only a filter the page actually offers counts, so an invented value shows
  // the full list rather than an empty one.
  const category = raw && categories.some((c) => c.value === raw) ? raw : null;

  const posts = category ? allPosts.filter((p) => p.category === category) : allPosts;
  const featured = category ? undefined : posts.find((p) => p.isFeatured);
  const rest = featured ? posts.filter((p) => p.id !== featured.id) : posts;

  return (
    <>
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link href="/blog" scroll={false} className={chipClass(!category)}>
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.value}
              href={`/blog?category=${c.value}`}
              scroll={false}
              className={chipClass(category === c.value)}
            >
              {c.label}
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <p className="py-16 text-center text-white/55">
          {category ? "Nothing published under this filter yet." : "No posts published yet. Check back soon."}
        </p>
      ) : (
        <div className="space-y-8">
          {featured && (
            <Link
              href={`/blog/${featured.slug}`}
              className="group block border border-white/[0.08] bg-white/[0.02] p-7 transition-all hover:border-[#7C4DFF]/40 hover:bg-white/[0.04]"
            >
              <span className="mb-3 inline-block bg-[#F5C842] px-2 py-0.5 text-[10px] font-bold uppercase text-[#0a0a0a]">
                Featured
              </span>
              <h2 className="font-display text-2xl font-bold leading-tight text-white transition-colors group-hover:text-[#B39DFF] md:text-3xl">
                {featured.title}
              </h2>
              {featured.subtitle && <p className="mt-2 max-w-3xl text-white/60">{featured.subtitle}</p>}
              <p className="mt-3 text-xs text-white/50">{featured.publishedLabel}</p>
            </Link>
          )}

          {banner}

          <h2 className="sr-only">{category ? "Filtered articles" : "All articles"}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-2 border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/20 hover:bg-white/[0.05]"
              >
                {post.typeLabel && (
                  <span className="w-fit border border-white/[0.1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/60">
                    {post.typeLabel}
                  </span>
                )}
                <h3 className="font-display text-base font-bold leading-snug text-white transition-colors group-hover:text-[#B39DFF]">
                  {post.title}
                </h3>
                {post.subtitle && (
                  <p className="text-sm leading-relaxed text-white/55 line-clamp-3">{post.subtitle}</p>
                )}
                <p className="mt-auto pt-2 text-[11px] text-white/50">{post.publishedLabel}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
