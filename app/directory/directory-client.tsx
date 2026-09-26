"use client";

// app/directory/directory-client.tsx
// Search, filter and sort over a slim list the server renders into the HTML.
//
// URL parameters (?search= from the WebSite SearchAction, ?category=,
// ?featured=true, ?risk=, ?price=) are applied after hydration. Reading them
// with useSearchParams() instead would force this subtree to render
// client-side only, leaving the static HTML crawlers get without the list.

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { CryptoEntryCard, type CryptoCardData } from "@/components/crypto/CryptoEntryCard";
import type { CryptoEntry } from "@/lib/crypto/types";
import type { CryptoCategory } from "@/lib/crypto/data-static";

export type DirectoryItem = CryptoCardData &
  Pick<CryptoEntry, "tags" | "token" | "createdAt"> & {
    /** Lowercased plain-text excerpt of the description, for search. */
    searchText: string;
  };

interface Props {
  entries: DirectoryItem[];
  categories: CryptoCategory[];
}

// Light category colours take ink text when used as an active pill fill.
const INK_ON: Record<string, string> = {
  "#34D163": "#0a0a0a", "#F5C842": "#0a0a0a", "#0ABFAA": "#0a0a0a", "#00C2E0": "#0a0a0a",
  "#FF8C00": "#0a0a0a", "#FF4F2B": "#0a0a0a", "#EF3F24": "#0a0a0a",
};

const SORT_OPTIONS = [
  { value: "popular",  label: "Highest Rated" },
  { value: "newest",   label: "Newest First" },
  { value: "risk-low", label: "Lowest Risk" },
];

const RISK_OPTIONS = [
  { value: "all",    label: "All Risk Levels" },
  { value: "low",    label: "🟢 Low Risk" },
  { value: "medium", label: "🟡 Medium Risk" },
  { value: "high",   label: "🔴 High Risk" },
];

const PRICE_OPTIONS = [
  { value: "all",            label: "All Pricing" },
  { value: "free",           label: "Free" },
  { value: "freemium",       label: "Freemium" },
  { value: "paid",           label: "Paid" },
  { value: "token-required", label: "Token Required" },
];

export function CryptoDirectoryClient({ entries, categories }: Props) {
  const [search, setSearch]           = useState("");
  const [selectedCategory, setCategory] = useState("all");
  const [sortBy, setSortBy]           = useState("popular");
  const [riskFilter, setRiskFilter]   = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("search");
    const category = params.get("category");
    const risk = params.get("risk");
    const price = params.get("price");
    if (q) setSearch(q);
    if (category && categories.some((c) => c.slug === category)) setCategory(category);
    if (risk && RISK_OPTIONS.some((o) => o.value === risk)) setRiskFilter(risk);
    if (price && PRICE_OPTIONS.some((o) => o.value === price)) setPriceFilter(price);
    if (params.get("featured") === "true") setFeaturedOnly(true);
  }, [categories]);

  const filtered = useMemo(() => {
    let result = [...entries];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.shortDescription.toLowerCase().includes(q) ||
        e.searchText.includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q)) ||
        (e.chain && e.chain.toLowerCase().includes(q)) ||
        (e.token && e.token.toLowerCase().includes(q))
      );
    }
    if (selectedCategory !== "all") result = result.filter(e => e.category === selectedCategory);
    if (riskFilter !== "all")       result = result.filter(e => e.riskLevel === riskFilter);
    if (priceFilter !== "all")      result = result.filter(e => e.priceTier === priceFilter);
    if (featuredOnly)               result = result.filter(e => e.isFeatured);
    switch (sortBy) {
      case "popular":  result.sort((a, b) => b.rating - a.rating); break;
      case "newest":   result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case "risk-low": { const o: Record<string, number> = { low: 0, medium: 1, high: 2 }; result.sort((a, b) => (o[a.riskLevel] ?? 1) - (o[b.riskLevel] ?? 1)); break; }
    }
    return result;
  }, [entries, search, selectedCategory, sortBy, riskFilter, priceFilter, featuredOnly]);

  const activeFilterCount = [selectedCategory !== "all", riskFilter !== "all", priceFilter !== "all", featuredOnly].filter(Boolean).length;

  function clearAll() {
    setSearch(""); setCategory("all"); setSortBy("popular");
    setRiskFilter("all"); setPriceFilter("all"); setFeaturedOnly(false);
  }

  return (
    <>
      <section className="py-8">
        <div className="container mx-auto px-4">

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search the directory"
              placeholder="Search by name, chain, token, or tag…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-12 w-full border border-white/[0.08] bg-white/[0.04] pl-11 pr-4 text-sm text-white placeholder:text-white/45 focus:border-[#7C4DFF] focus:outline-none transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="mb-6 border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/50 mr-1">
                <SlidersHorizontal className="h-3 w-3" /> Filters
              </div>

              <FilterPill label="Sort" value={SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? ""}>
                {SORT_OPTIONS.map(o => (
                  <FilterOption key={o.value} active={sortBy === o.value} onClick={() => setSortBy(o.value)}>{o.label}</FilterOption>
                ))}
              </FilterPill>

              <FilterPill label="Risk" value={RISK_OPTIONS.find(o => o.value === riskFilter)?.label ?? ""} active={riskFilter !== "all"}>
                {RISK_OPTIONS.map(o => (
                  <FilterOption key={o.value} active={riskFilter === o.value} onClick={() => setRiskFilter(o.value)}>{o.label}</FilterOption>
                ))}
              </FilterPill>

              <FilterPill label="Pricing" value={PRICE_OPTIONS.find(o => o.value === priceFilter)?.label ?? ""} active={priceFilter !== "all"}>
                {PRICE_OPTIONS.map(o => (
                  <FilterOption key={o.value} active={priceFilter === o.value} onClick={() => setPriceFilter(o.value)}>{o.label}</FilterOption>
                ))}
              </FilterPill>

              <button
                onClick={() => setFeaturedOnly(p => !p)}
                className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs font-bold transition-colors ${featuredOnly ? "border-[#F5C842]/50 bg-[#F5C842]/10 text-[#F5C842]" : "border-white/[0.08] bg-white/[0.04] text-white/60 hover:text-white/85"}`}
              >
                ⭐ Featured only
              </button>

              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="ml-auto flex items-center gap-1 text-xs text-white/55 hover:text-[#B39DFF] transition-colors">
                  <X className="h-3 w-3" /> Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                </button>
              )}
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategory("all")}
                className={`px-3 py-1 text-xs font-bold transition-colors ${selectedCategory === "all" ? "bg-[#7C4DFF] text-white" : "border border-white/[0.08] text-white/60 hover:border-[#7C4DFF]/40 hover:text-white/85"}`}
              >
                All ({entries.length})
              </button>
              {categories.map(cat => {
                const count = entries.filter(e => e.category === cat.slug).length;
                const active = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(active ? "all" : cat.slug)}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-bold transition-colors ${active ? "text-white" : "border border-white/[0.08] text-white/60 hover:border-white/20 hover:text-white/85"}`}
                    style={active ? { background: cat.color, color: INK_ON[cat.color] ?? "#fff" } : {}}
                  >
                    {cat.emoji} {cat.name}
                    <span className={`ml-0.5 text-[10px] ${active ? "opacity-75" : "text-white/45"}`}>({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mb-4 text-xs text-white/50" aria-live="polite">
            Showing <span className="font-bold text-white/75">{filtered.length}</span> of {entries.length} results
            {activeFilterCount > 0 && <span className="ml-1 text-[#B39DFF]">— {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active</span>}
          </p>

          {filtered.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map(entry => <CryptoEntryCard key={entry.id} entry={entry} />)}
            </div>
          ) : (
            <div className="border border-white/[0.06] bg-white/[0.02] py-20 text-center">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-white/60 mb-3">No results match your filters.</p>
              <button onClick={clearAll} className="text-xs text-[#B39DFF] hover:underline">Clear all filters</button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function FilterPill({ label, value, active, children }: {
  label: string; value: string; active?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs font-bold transition-colors ${active ? "border-[#7C4DFF]/50 bg-[#7C4DFF]/10 text-[#B39DFF]" : "border-white/[0.08] bg-white/[0.04] text-white/60 hover:text-white/85"}`}
      >
        <span className="text-white/50 font-normal">{label}:</span> {value}
        <span className={`text-[8px] transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] border border-white/[0.08] bg-[#141414] shadow-xl">
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function FilterOption({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${active ? "bg-[#7C4DFF]/20 text-[#B39DFF] font-bold" : "text-white/60 hover:bg-white/[0.04] hover:text-white/85"}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-[#7C4DFF]" : ""}`} />
      {children}
    </button>
  );
}
