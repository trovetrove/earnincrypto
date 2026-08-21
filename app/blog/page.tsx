import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/blog/queries";
import { cryptoBlogCategories } from "@/lib/blog/categories";
import { AdSlot } from "@/components/ad-slots";

export const revalidate = 600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://earnincrypto.io";

export const metadata: Metadata = {
  title: "Crypto Blog — Airdrops, Guides & Reviews | EarnInCrypto",
  description:
    "Research-driven guides on crypto airdrops, wallets, DeFi yield, exchanges and trading tools. No hype, no fake claims.",
  alternates: { canonical: `${SITE}/blog` },
};

function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const allPosts = await getPublishedPosts();

  const posts = category ? allPosts.filter((p) => p.category === category) : allPosts;
  const featured = !category ? posts.find((p) => p.isFeatured) : undefined;
  const rest = featured ? posts.filter((p) => p.id !== featured.id) : posts;

  // Only offer filters that actually have posts behind them.
  const activeCategories = cryptoBlogCategories.filter((c) =>
    allPosts.some((p) => p.category === c.value)
  );

  return (
    <div className="min-h-screen">
      <section className="border-b border-white/[0.06]">
        <div className="container mx-auto px-4 py-12">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-6xl">
            Crypto <span className="text-[#7C4DFF]">Research</span>
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-white/45">
            Airdrop breakdowns, protocol guides and honest reviews — written to answer the question,
            not to hype a token.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10">
        {activeCategories.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                !category
                  ? "border-[#7C4DFF] bg-[#7C4DFF]/15 text-[#7C4DFF]"
                  : "border-white/[0.08] text-white/40 hover:text-white/70"
              }`}
            >
              All
            </Link>
            {activeCategories.map((c) => (
              <Link
                key={c.value}
                href={`/blog?category=${c.value}`}
                className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                  category === c.value
                    ? "border-[#7C4DFF] bg-[#7C4DFF]/15 text-[#7C4DFF]"
                    : "border-white/[0.08] text-white/40 hover:text-white/70"
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <p className="py-16 text-center text-white/30">No posts published yet. Check back soon.</p>
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
                <h2 className="font-display text-2xl font-bold leading-tight text-white transition-colors group-hover:text-[#7C4DFF] md:text-3xl">
                  {featured.title}
                </h2>
                {featured.subtitle && (
                  <p className="mt-2 max-w-3xl text-white/45">{featured.subtitle}</p>
                )}
                <p className="mt-3 text-xs text-white/25">{formatDate(featured.publishedAt)}</p>
              </Link>
            )}

            <div className="flex justify-center">
              <AdSlot id="blog-index" format="leaderboard" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col gap-2 border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <h3 className="font-display text-base font-bold leading-snug text-white transition-colors group-hover:text-[#7C4DFF]">
                    {post.title}
                  </h3>
                  {post.subtitle && (
                    <p className="text-sm leading-relaxed text-white/40 line-clamp-3">
                      {post.subtitle}
                    </p>
                  )}
                  <p className="mt-auto pt-2 text-[11px] text-white/25">
                    {formatDate(post.publishedAt)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
