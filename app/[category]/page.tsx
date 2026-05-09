// app/crypto/[category]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { getCryptoCategoryBySlug, cryptoCategories } from "@/lib/crypto/data-static";
import { getCryptoEntriesByCategory } from "@/lib/crypto/queries";
import { CryptoEntryCard } from "@/components/crypto/CryptoEntryCard";
import { ArrowLeft } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sidehustletools.app";
const CURRENT_YEAR = new Date().getFullYear();

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = getCryptoCategoryBySlug(category);
  if (!cat) return { title: "Not Found" };

  const title = `Best ${cat.name} ${CURRENT_YEAR} — Crypto ${cat.name} | SideHustleTools`;
  const description = `${cat.description}. Browse our curated and independently reviewed ${cat.name.toLowerCase()} for ${CURRENT_YEAR}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/crypto/${category}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/crypto/${category}`,
    },
  };
}

export async function generateStaticParams() {
  return cryptoCategories.map((c) => ({ category: c.slug }));
}

export default async function CryptoCategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const category = getCryptoCategoryBySlug(slug);
  if (!category) notFound();

  const entries = await getCryptoEntriesByCategory(slug);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} — SideHustleTools Crypto`,
    description: category.description,
    url: `${BASE_URL}/crypto/${slug}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: entries.length,
      itemListElement: entries.slice(0, 20).map((entry, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: entry.title,
        url: `${BASE_URL}/crypto/${entry.category}/${entry.slug}`,
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />

      <div className="min-h-screen">
        <section className="border-b border-white/[0.06] py-10">
          <div className="container mx-auto px-4">
            <Link
              href="/crypto"
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/30 hover:text-[#7C4DFF] transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Crypto
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{category.emoji}</span>
              <div>
                <h1 className="font-display text-3xl font-black text-white">{category.name}</h1>
                <p className="text-white/40">{category.description}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-white/20">{entries.length} listings</p>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-4">
            {entries.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {entries.map((entry) => (
                  <CryptoEntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="border border-white/[0.06] bg-white/[0.02] py-16 text-center">
                <p className="text-white/40">No entries yet. Check back soon.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
