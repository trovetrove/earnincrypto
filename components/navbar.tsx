"use client";

import Link from "next/link";
import { cryptoCategories } from "@/lib/crypto/data-static";
import { Zap, Menu, X } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-12 items-center justify-between px-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center bg-[#7C4DFF]">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-display text-sm font-black tracking-tight text-white">
            EarnIn<span className="text-[#7C4DFF]">Crypto</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {cryptoCategories.slice(0, 5).map((cat) => (
            <Link
              key={cat.id}
              href={`/${cat.slug}`}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                pathname.startsWith(`/${cat.slug}`)
                  ? "text-[#7C4DFF]"
                  : "text-white/40 hover:text-[#7C4DFF]"
              }`}
            >
              {cat.emoji} {cat.name}
            </Link>
          ))}
          <Link
            href="/directory"
            className="ml-1 border border-[#7C4DFF]/30 bg-[#7C4DFF]/10 px-3 py-1 text-xs font-bold text-[#7C4DFF] hover:bg-[#7C4DFF]/20 transition-colors"
          >
            All Tools
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Cross-link to SHT */}
          <a
            href="https://sidehustletools.app"
            target="_blank"
            rel="dofollow noreferrer"
            className="hidden text-xs text-white/20 hover:text-white/50 transition-colors sm:block"
          >
            SideHustleTools ↗
          </a>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="flex h-8 w-8 items-center justify-center text-white/50 hover:text-white/80 transition-colors md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-white/[0.06] bg-[#0a0a0a] px-4 pb-4 pt-3 md:hidden">
          <div className="grid grid-cols-2 gap-1.5">
            {cryptoCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/${cat.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs font-medium text-white/50 hover:text-[#7C4DFF] transition-colors"
              >
                {cat.emoji} {cat.name}
              </Link>
            ))}
          </div>
          <Link
            href="/directory"
            onClick={() => setOpen(false)}
            className="mt-2 flex w-full items-center justify-center border border-[#7C4DFF]/30 bg-[#7C4DFF]/10 py-2 text-xs font-bold text-[#7C4DFF]"
          >
            Browse All Tools
          </Link>
          <a
            href="https://sidehustletools.app"
            target="_blank"
            rel="dofollow noreferrer"
            className="mt-2 block text-center text-[11px] text-white/20 hover:text-white/40"
          >
            SideHustleTools.app — free credits & side hustles ↗
          </a>
        </div>
      )}
    </nav>
  );
}
