"use client";
import Link from "next/link";
import { cryptoCategories } from "@/lib/crypto/data-static";
import { Zap } from "lucide-react";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-12 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#7C4DFF]" />
          <span className="font-bold text-white">EarnIn<span className="text-[#7C4DFF]">Crypto</span></span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {cryptoCategories.slice(0, 5).map(cat => (
            <Link key={cat.id} href={`/${cat.slug}`}
              className="px-2.5 py-1 text-xs font-medium text-white/40 hover:text-[#7C4DFF] transition-colors">
              {cat.emoji} {cat.name}
            </Link>
          ))}
          <Link href="/directory" className="ml-1 border border-[#7C4DFF]/30 bg-[#7C4DFF]/10 px-3 py-1 text-xs font-bold text-[#7C4DFF]">
            All Tools
          </Link>
        </div>
        <a href="https://sidehustletools.app" target="_blank" rel="dofollow"
          className="text-xs text-white/20 hover:text-white/50 transition-colors">
          ← Main Site
        </a>
      </div>
    </nav>
  );
}
