import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/blog/queries";
import { cryptoBlogCategories } from "@/lib/blog/categories";
import { AdSlot } from "@/components/ad-slots";
import { clusterSetFor, resolveCluster } from "@/lib/seo/clusters";
import type { BlogPost } from "@/lib/blog/queries";

export const revalidate = 600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://earnincrypto.io";

/**
 * Cluster hubs are real landing pages and should be indexed; every other filter
 * combination is a slice of the same list and should not be.
 *
 * `?cluster=airdrops` gets its own title, description and self-canonical.
 * `?category=` on its own, and any cluster+category pairing, canonicalises back
 * and is marked noindex — dozens of near-identical permutations is exactly the
 * thin faceted-navigation pattern that wastes crawl budget.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; cluster?: string }>;
}): Promise<Metadata> {
  const { category, cluster } = await searchParams;
  const set = clusterSetFor("crypto");
  const def = cluster ? set.byId.get(cluster) : undefined;

  if (def) {
    return {
      title: `${def.label} — Guides, Reviews & Risks | EarnInCrypto`,
      description: def.blurb,
      alternates: { canonical: `${SITE}/blog?cluster=${def.id}` },
      robots: category ? { index: false, follow: true } : undefined,
    };
  }

  return {
    title: "Crypto Blog — Airdrops, Guides & Reviews | EarnInCrypto",
    description:
      "Research-driven guides on crypto airdrops, wallets, DeFi yield, exchanges and trading tools. No hype, no fake claims.",
    alternates: { canonical: `${SITE}/blog` },
    robots: category ? { index: false, follow: true } : undefined,
  };
}

/**
 * The cluster a post belongs to — explicit label if set, inferred otherwise.
 */
function clusterOf(post: BlogPost): string {
  return resolveCluster(
    post.cluster,
    {
      slug: post.slug,
      category: post.category,
      tags: post.tags,
      title: post.title,
      keywords: [post.targetKeyword, ...post.secondaryKeywords],
    },
    clusterSetFor("crypto")
  );
}

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
  searchParams: Promise<{ category?: string; cluster?: string }>;
}) {
  const { category, cluster } = await searchParams;
  const allPosts = await getPublishedPosts();

  const clusterSet = clusterSetFor("crypto");
  const activeCluster = cluster && clusterSet.byId.has(cluster) ? cluster : undefined;
  const clusterDef = activeCluster ? clusterSet.byId.get(activeCluster) : undefined;

  let posts = allPosts;
  if (category) posts = posts.filter((p) => p.category === category);
  if (activeCluster) posts = posts.filter((p) => clusterOf(p) === activeCluster);

  const filtered = Boolean(category || activeCluster);
  const featured = !filtered ? posts.find((p) => p.isFeatured) : undefined;
  const rest = featured ? posts.filter((p) => p.id !== featured.id) : posts;

  // Only offer filters that actually have posts behind them.
  const activeCategories = cryptoBlogCategories.filter((c) =>
    allPosts.some((p) => p.category === c.value)
  );

  // Topic hubs, ordered by how much has actually been published about them.
  const postsPerCluster = new Map<string, number>();
  for (const p of allPosts) {
    const id = clusterOf(p);
    postsPerCluster.set(id, (postsPerCluster.get(id) ?? 0) + 1);
  }
  const activeClusters = clusterSet.clusters
    .filter((c) => postsPerCluster.has(c.id))
    .sort((a, b) => (postsPerCluster.get(b.id) ?? 0) - (postsPerCluster.get(a.id) ?? 0));

  return (
    <div className="min-h-screen">
      <section className="border-b border-white/[0.06]">
        <div className="container mx-auto px-4 py-12">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-6xl">
            {clusterDef ? (
              clusterDef.label
            ) : (
              <>
                Crypto <span className="text-[#7C4DFF]">Research</span>
              </>
            )}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-white/45">
            {clusterDef
              ? clusterDef.blurb
              : "Airdrop breakdowns, protocol guides and honest reviews — written to answer the question, not to hype a token."}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10">
        {activeClusters.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/25">
              Topics
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/blog"
                className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                  !activeCluster && !category
                    ? "border-[#7C4DFF] bg-[#7C4DFF]/15 text-[#7C4DFF]"
                    : "border-white/[0.08] text-white/40 hover:text-white/70"
                }`}
              >
                Everything
              </Link>
              {activeClusters.map((c) => (
                <Link
                  key={c.id}
                  href={`/blog?cluster=${c.id}`}
                  className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                  activeCluster === c.id
                    ? "border-[#7C4DFF] bg-[#7C4DFF]/15 text-[#7C4DFF]"
                    : "border-white/[0.08] text-white/40 hover:text-white/70"
                }`}
                >
                  {c.label}
                  <span className="ml-1.5 opacity-40">{postsPerCluster.get(c.id)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {activeCategories.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <Link
              href={activeCluster ? `/blog?cluster=${activeCluster}` : "/blog"}
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
                href={
                  activeCluster
                    ? `/blog?cluster=${activeCluster}&category=${c.value}`
                    : `/blog?category=${c.value}`
                }
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
