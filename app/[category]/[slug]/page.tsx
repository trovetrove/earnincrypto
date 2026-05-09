// app/crypto/[category]/[slug]/page.tsx
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getCryptoEntryBySlug, getAllCryptoEntries } from "@/lib/crypto/queries";
import { getCryptoCategoryBySlug } from "@/lib/crypto/data-static";
import { CryptoDetailPage } from "./_layouts/CryptoDetailPage";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sidehustletools.app";
const CURRENT_YEAR = new Date().getFullYear();

interface Props {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: categorySlug, slug } = await params;
  const entry = await getCryptoEntryBySlug(slug);
  const category = getCryptoCategoryBySlug(categorySlug);
  if (!entry || !category) return { title: "Not Found" };

  const title = entry.metaTitle || `${entry.title} Review ${CURRENT_YEAR} — ${category.name} | SideHustleTools Crypto`;
  const description = entry.metaDescription || `${entry.shortDescription}. Rating: ${entry.rating}/5. Risk: ${entry.riskLevel}.${entry.chain ? ` Chain: ${entry.chain}.` : ""}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/crypto/${categorySlug}/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/crypto/${categorySlug}/${slug}`,
      type: "article",
      siteName: "SideHustleTools",
    },
  };
}

export async function generateStaticParams() {
  const entries = await getAllCryptoEntries();
  return entries.map((e) => ({ category: e.category, slug: e.slug }));
}

export default async function CryptoDetailPageRoute({ params }: Props) {
  const { category: categorySlug, slug } = await params;
  const entry = await getCryptoEntryBySlug(slug);
  const category = getCryptoCategoryBySlug(categorySlug);
  if (!entry || !category) notFound();

  return <CryptoDetailPage entry={entry} category={category} />;
}
