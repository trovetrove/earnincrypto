import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import {
  getPublishedPostBySlug,
  getPublishedPosts,
  getRelatedPosts,
} from "@/lib/blog/queries";
import {
  getExploreMoreListings,
  getWhileYoureHereListings,
} from "@/lib/blog/recommendations";
import { RichContent } from "@/components/rich-content";
import { ArticleStatusBox } from "@/components/blog/ArticleStatusBox";
import {
  WhileYoureHere,
  ExploreMore,
  RelatedArticles,
} from "@/components/blog/RecommendationBlocks";
import { DynamicAdSlot } from "@/components/ad-slots";
import { safeJsonLd } from "@/lib/utils";

export const revalidate = 600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://earnincrypto.io";

export const dynamicParams = true;

export async function generateStaticParams() {
  // Never fail the build on this: if the database is unreachable at build
  // time, fall back to rendering every article on demand instead.
  try {
    const posts = await getPublishedPosts();
    return posts.map((p) => ({ slug: p.slug }));
  } catch (err) {
    console.error("[generateStaticParams] failed, skipping static generation:", err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Not found" };

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.subtitle;
  const image = post.ogImageUrl || post.coverImageUrl;

  return {
    title,
    description,
    alternates: { canonical: post.canonicalUrl || `${SITE}/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE}/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Splits article HTML at top-level <h2> boundaries so recommendation and ad
 * blocks land between sections instead of interrupting a paragraph. Short
 * posts stay in one piece — a 400-word article doesn't need interstitials.
 */
function splitIntoSections(html: string, parts: number): string[] {
  if (parts <= 1) return [html];
  const chunks = html.split(/(?=<h2)/i).filter(Boolean);
  if (chunks.length < parts) return [html];

  // Distribute the remainder across the leading groups instead of using a
  // fixed ceil size — with 4 chunks and parts=3, a ceil size of 2 would yield
  // only 2 groups and the mid-article slot would never render.
  const base = Math.floor(chunks.length / parts);
  const extra = chunks.length % parts;
  const out: string[] = [];
  let i = 0;
  for (let p = 0; p < parts; p++) {
    const size = base + (p < extra ? 1 : 0);
    out.push(chunks.slice(i, i + size).join(""));
    i += size;
  }
  return out;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  // whileHere first — its picks are excluded from exploreMore so the same
  // listing never appears twice on one page.
  const whileHere = await getWhileYoureHereListings(post, 2);
  const [exploreMore, relatedPosts] = await Promise.all([
    getExploreMoreListings(post, 4, whileHere),
    getRelatedPosts(post, 3),
  ]);

  const wordCount = post.content.replace(/<[^>]+>/g, " ").split(/\s+/).length;
  const sections = splitIntoSections(post.content, wordCount > 1200 ? 3 : wordCount > 600 ? 2 : 1);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription || post.subtitle,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: post.authorName || "EarnInCrypto" },
    publisher: { "@type": "Organization", name: "EarnInCrypto" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/blog/${post.slug}` },
    ...(post.coverImageUrl ? { image: post.coverImageUrl } : {}),
  };

  const faqJsonLd = post.faqItems.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faqItems.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
        />
      )}

      <div className="min-h-screen">
        {/* ── Header ─────────────────────────────────────────── */}
        <section className="border-b border-white/[0.06]">
          <div className="container mx-auto max-w-4xl px-4 py-10">
            <Link
              href="/blog"
              className="mb-6 inline-flex items-center gap-1.5 border border-white/[0.08] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/50 transition-colors hover:text-white/80"
            >
              <ArrowLeft className="h-3 w-3" /> Blog
            </Link>

            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
              {post.title}
            </h1>
            {post.subtitle && (
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/45">
                {post.subtitle}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/30">
              {post.authorName && <span className="font-semibold">{post.authorName}</span>}
              {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
              {post.updatedAt !== post.publishedAt && (
                <span>Updated {formatDate(post.updatedAt)}</span>
              )}
            </div>
          </div>
        </section>

        {/* ── Body ───────────────────────────────────────────── */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="grid gap-10 lg:grid-cols-3">
              <article className="space-y-8 lg:col-span-2">
                <ArticleStatusBox status={post.opportunityStatus} />

                <DynamicAdSlot placement="blog-top" category={post.category} className="w-full" />

                {sections.map((section, i) => (
                  <div key={i} className="space-y-8">
                    <RichContent html={section} />

                    {/* Alternate organic → paid between sections so the page
                        never reads as a stack of ads. */}
                    {i === 0 && sections.length > 1 && <WhileYoureHere entries={whileHere} />}
                    {i === 1 && sections.length > 2 && (
                      <DynamicAdSlot
                        placement="blog-middle"
                        category={post.category}
                        className="w-full"
                      />
                    )}
                  </div>
                ))}

                {post.faqItems.length > 0 && (
                  <div>
                    <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-white/40">
                      Frequently Asked Questions
                    </h2>
                    {post.faqItems.map(({ question, answer }, i) => (
                      <details
                        key={i}
                        className="group mb-2 border border-white/[0.06] bg-white/[0.02]"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-display text-sm font-bold text-white/85">
                          {question}
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="border-t border-white/[0.06] px-5 pb-4 pt-3 text-sm leading-relaxed text-white/50">
                          {answer}
                        </div>
                      </details>
                    ))}
                  </div>
                )}

                <ExploreMore entries={exploreMore} />
                <RelatedArticles posts={relatedPosts} />

                <DynamicAdSlot
                  placement="blog-bottom"
                  category={post.category}
                  className="w-full"
                />
              </article>

              {/* ── Sidebar ──────────────────────────────────── */}
              <aside className="space-y-5">
                {post.tags.length > 0 && (
                  <div className="border border-white/[0.06] bg-white/[0.02] p-5">
                    <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-white/40">
                      Topics
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.map((t) => (
                        <span
                          key={t}
                          className="border border-white/[0.08] px-2 py-0.5 text-[11px] text-white/50"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <DynamicAdSlot
                  placement="sidebar"
                  category={post.category}
                  format="rectangle"
                />

                <div className="border border-white/[0.06] p-4 text-xs leading-relaxed text-white/30">
                  Crypto carries real risk. Nothing here is financial advice, and an opportunity
                  being listed is not a guarantee of any reward. Some links are affiliate links.
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
