import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  getPublishedPostBySlug,
  getPublishedPosts,
  getRelatedPosts,
} from "@/lib/blog/queries";
import { getArticleRecommendations, getEntityLinkIndex } from "@/lib/blog/recommendations";
import { RichContent, prepareArticleHtml } from "@/components/rich-content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { NextStep } from "@/components/blog/NextStep";
import { PartOfGuide, SeriesList } from "@/components/blog/SeriesLinks";
import { getContentGraph, hubPath, pageTypeLabel } from "@/lib/seo/contentGraph";
import { linkBudget } from "@/lib/seo/linkGraph";
import { toPlainText } from "@/lib/seo/graphData";
import { linkEntities, selectLinkableEntities } from "@/lib/seo/entityLinker";
import {
  absoluteUrl,
  buildMetadata,
  composeDescription,
  formatDate,
  isMeaningfullyUpdated,
} from "@/lib/seo/metadata";
import { authorJsonLd, faqJsonLd, publisherJsonLd, visibleFaqs } from "@/lib/seo/structuredData";
import { ArticleStatusBox } from "@/components/blog/ArticleStatusBox";
import {
  WhileYoureHere,
  ExploreMore,
  RelatedArticles,
} from "@/components/blog/RecommendationBlocks";
import { DynamicAdSlot } from "@/components/ad-slots";
import { safeJsonLd } from "@/lib/utils";

export const revalidate = 600;
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
  if (!post) return { title: "Not found", robots: { index: false, follow: true } };

  const image = post.ogImageUrl || post.coverImageUrl;
  return buildMetadata({
    title: post.metaTitle || post.title,
    // Subtitle first; an article saved without one still gets a real snippet
    // from its opening paragraph instead of an empty description.
    description: post.metaDescription || composeDescription(post.subtitle || post.content),
    path: `/blog/${post.slug}`,
    canonical: post.canonicalUrl,
    type: "article",
    images: image ? [image] : undefined,
    publishedTime: post.publishedAt,
    modifiedTime: isMeaningfullyUpdated(post.publishedAt, post.updatedAt) ? post.updatedAt : post.publishedAt,
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

  const graph = await getContentGraph("crypto");
  const node = graph.postById.get(post.id);

  // Longer reads earn more interstitials and a bigger link budget.
  const wordCount = node?.wordCount ?? post.content.replace(/<[^>]+>/g, " ").split(/\s+/).length;
  const budget = linkBudget(wordCount);

  // The next-step CTA, the mid-article block and the discovery block are
  // chosen as one set, so a listing never appears twice on the page.
  const [recs, relatedPosts, allEntities] = await Promise.all([
    getArticleRecommendations(post, {
      whileHere: budget.directory > 3 ? 3 : 2,
      exploreMore: 4,
    }),
    getRelatedPosts(post, budget.relatedArticles),
    getEntityLinkIndex(),
  ]);

  // In-prose entity links are applied to the whole article before it's split,
  // so each project is linked once across the piece rather than once per
  // section. Only projects the author already named are eligible.
  const preparedHtml = prepareArticleHtml(post.content);
  const linkable = selectLinkableEntities(
    toPlainText(preparedHtml),
    allEntities,
    budget.contextual
  );
  const linkedHtml = linkEntities(preparedHtml, linkable, { maxLinks: budget.contextual });

  const sections = splitIntoSections(linkedHtml, wordCount > 1200 ? 3 : wordCount > 600 ? 2 : 1);

  // Hub-and-spoke: supporting articles link up to their cluster's pillar; the
  // pillar links down to its series.
  const clusterId = node?.cluster;
  const clusterDef = clusterId ? graph.set.byId.get(clusterId) : undefined;
  const clusterSize = clusterId ? (graph.postsByCluster.get(clusterId)?.length ?? 0) : 0;
  const hub = clusterDef && clusterSize > 0 ? { href: hubPath(clusterDef.id), label: clusterDef.label } : undefined;
  const pillar = clusterId ? graph.pillarByCluster.get(clusterId) : undefined;
  const isPillar = pillar?.id === post.id;
  const series = isPillar
    ? (graph.seriesByPillar.get(post.id) ?? []).map((p) => ({
        slug: p.slug,
        title: p.title,
        label: pageTypeLabel(p.pageType),
      }))
    : [];

  const updated = isMeaningfullyUpdated(post.publishedAt, post.updatedAt);
  const pageUrl = absoluteUrl(`/blog/${post.slug}`);
  const faqs = visibleFaqs(post.faqItems);

  const subjects = (node?.subjectEntitySlugs ?? [])
    .map((s) => graph.entryBySlug.get(s))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription || post.subtitle || undefined,
    url: pageUrl,
    datePublished: post.publishedAt,
    // Only a real update moves dateModified; a same-day save isn't one.
    dateModified: updated ? post.updatedAt : post.publishedAt,
    author: authorJsonLd(post.authorName),
    publisher: publisherJsonLd(),
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    ...(clusterDef ? { articleSection: clusterDef.label } : {}),
    ...(post.tags.length ? { keywords: post.tags.join(", ") } : {}),
    ...(post.coverImageUrl ? { image: post.coverImageUrl } : {}),
    ...(subjects.length
      ? {
          about: subjects.map((e) => ({
            "@type": "Thing",
            name: e.title,
            url: absoluteUrl(`/${e.category}/${e.slug}`),
          })),
        }
      : {}),
  };
  const faq = faqJsonLd(faqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleJsonLd) }}
      />
      {faq && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faq) }} />
      )}

      <div className="min-h-screen">
        {/* ── Header ─────────────────────────────────────────── */}
        <section className="border-b border-white/[0.06]">
          <div className="container mx-auto max-w-4xl px-4 py-10">
            <Breadcrumbs
              className="mb-6"
              items={[
                { label: "Home", href: "/" },
                { label: "Blog", href: "/blog" },
                ...(hub ? [{ label: hub.label, href: hub.href }] : []),
                { label: post.title },
              ]}
            />

            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
              {post.title}
            </h1>
            {post.subtitle && (
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/60">
                {post.subtitle}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
              {post.authorName && <span className="font-semibold">{post.authorName}</span>}
              {post.publishedAt && (
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              )}
              {updated && (
                <span>
                  Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Body ───────────────────────────────────────────── */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="grid gap-10 lg:grid-cols-3">
              <article className="min-w-0 space-y-8 lg:col-span-2">
                {pillar && !isPillar && <PartOfGuide pillar={pillar} hub={hub} />}

                <ArticleStatusBox status={post.opportunityStatus} />

                <DynamicAdSlot placement="blog-top" category={post.category} className="w-full" />

                {sections.map((section, i) => (
                  <div key={i} className="space-y-8">
                    <RichContent html={section} />

                    {/* The tight directory block follows the first section —
                        including on one-section posts, which previously never
                        showed it at all. */}
                    {i === 0 && <WhileYoureHere entries={recs.whileHere} />}
                    {i === 1 && sections.length > 2 && (
                      <DynamicAdSlot
                        placement="blog-middle"
                        category={post.category}
                        className="w-full"
                      />
                    )}
                  </div>
                ))}

                {faqs.length > 0 && (
                  <section aria-labelledby="faq-heading">
                    <h2 id="faq-heading" className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-white/60">
                      Frequently Asked Questions
                    </h2>
                    {faqs.map(({ question, answer }, i) => (
                      <details
                        key={i}
                        className="group mb-2 border border-white/[0.06] bg-white/[0.02]"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-display text-sm font-bold text-white/85">
                          {question}
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                        </summary>
                        <div className="border-t border-white/[0.06] px-5 pb-4 pt-3 text-sm leading-relaxed text-white/60">
                          {answer}
                        </div>
                      </details>
                    ))}
                  </section>
                )}

                <NextStep entry={recs.primary} />

                {isPillar && <SeriesList items={series} hub={hub} total={clusterSize - 1} />}

                <RelatedArticles posts={relatedPosts} />
                <ExploreMore entries={recs.exploreMore} />

                <DynamicAdSlot
                  placement="blog-bottom"
                  category={post.category}
                  className="w-full"
                />
              </article>

              {/* ── Sidebar ──────────────────────────────────── */}
              <aside className="space-y-5">
                {hub && clusterDef && (
                  <div className="border border-white/[0.06] bg-white/[0.02] p-5">
                    <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-white/60">
                      Topic
                    </h2>
                    <p className="font-display text-lg font-bold leading-tight text-white">{clusterDef.label}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/55">{clusterDef.blurb}</p>
                    <Link
                      href={hub.href}
                      className="mt-3 inline-block text-xs font-bold uppercase tracking-wide text-[#B39DFF] hover:text-white"
                    >
                      Everything on {clusterDef.label} →
                    </Link>
                  </div>
                )}

                {post.tags.length > 0 && (
                  <div className="border border-white/[0.06] bg-white/[0.02] p-5">
                    <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-white/60">
                      Tags
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.map((t) => (
                        <span
                          key={t}
                          className="border border-white/[0.08] px-2 py-0.5 text-[11px] text-white/60"
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

                <div className="border border-white/[0.06] p-4 text-xs leading-relaxed text-white/50">
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
