"use client";

// app/crypto/directory/directory-client.tsx

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { CryptoEntryCard } from "@/components/crypto/CryptoEntryCard";
import type { CryptoEntry } from "@/lib/crypto/types";
import type { CryptoCategory } from "@/lib/crypto/data-static";

interface Props {
  entries: CryptoEntry[];
  categories: CryptoCategory[];
}

export function CryptoDirectoryClient({ entries, categories }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

  const filtered = useMemo(() => {
    let result = [...entries];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.shortDescription.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)) ||
          (e.chain && e.chain.toLowerCase().includes(q)) ||
          (e.token && e.token.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((e) => e.category === selectedCategory);
    }

    if (showFeaturedOnly) {
      result = result.filter((e) => e.isFeatured);
    }

    switch (sortBy) {
      case "popular":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "risk-low":
        const riskOrder = { low: 0, medium: 1, high: 2 };
        result.sort((a, b) => (riskOrder[a.riskLevel] ?? 1) - (riskOrder[b.riskLevel] ?? 1));
        break;
    }

    return result;
  }, [entries, search, selectedCategory, sortBy, showFeaturedOnly]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="border-b border-white/[0.06] py-10">
        <div className="container mx-auto px-4">
          <h1 className="mb-2 font-display text-3xl font-black text-white">All Crypto Tools</h1>
          <p className="text-white/40">
            Browse {entries.length} crypto tools, airdrops, and opportunities.
          </p>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4">
          {/* Filters */}
          <div className="mb-8 border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
              <input
                type="search"
                placeholder="Search by name, chain, token, or keyword..."
                className="h-10 w-full border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:border-[#7C4DFF] focus:outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-2 text-white/30">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Filters:</span>
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-9 border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white/70 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.emoji} {cat.name}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white/70 focus:outline-none"
              >
                <option value="popular">Highest Rated</option>
                <option value="newest">Newest</option>
                <option value="risk-low">Lowest Risk</option>
              </select>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showFeaturedOnly}
                  onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                  className="accent-[#7C4DFF]"
                />
                <span className="text-xs text-white/50">Featured only</span>
              </label>
            </div>

            {/* Category pills */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1 text-xs font-bold transition-colors ${
                  selectedCategory === "all"
                    ? "bg-[#7C4DFF] text-white"
                    : "border border-white/10 text-white/40 hover:text-white/60"
                }`}
              >
                All ({entries.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`px-3 py-1 text-xs font-bold transition-colors ${
                    selectedCategory === cat.slug
                      ? "bg-[#7C4DFF] text-white"
                      : "border border-white/10 text-white/40 hover:text-white/60"
                  }`}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>
          </div>

          <p className="mb-4 text-xs text-white/20">
            Showing <span className="text-white/50 font-semibold">{filtered.length}</span> results
          </p>

          {filtered.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((entry) => (
                <CryptoEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="border border-white/[0.06] bg-white/[0.02] py-16 text-center">
              <p className="text-white/40">No results found. Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
