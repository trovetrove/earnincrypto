"use client";

import Link from "next/link";
import { Zap, Shield } from "lucide-react";
import { cryptoCategories } from "@/lib/crypto/data-static";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.06] bg-[#050505]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-10 md:grid-cols-4">

          {/* Brand */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <div className="flex h-8 w-8 items-center justify-center bg-[#7C4DFF]">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-display text-sm font-black tracking-tight text-white">
                EarnIn<span className="text-[#7C4DFF]">Crypto</span>
              </span>
            </Link>

            <p className="text-[13px] leading-relaxed text-white/40">
              Curated crypto tools, airdrops, and earning opportunities.
              Every listing independently reviewed for {year}.
            </p>

            {/* Cross-link to SideHustleTools */}
            <div className="border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/20">
                Part of the SHT Network
              </p>
              <a
                href="https://sidehustletools.app"
                target="_blank"
                rel="dofollow noreferrer"
                className="flex items-center gap-2 text-xs font-semibold text-[#F5C842] hover:text-[#F5C842]/80 transition-colors"
              >
                ← SideHustleTools.app
                <span className="text-white/20 font-normal">Free credits & side hustles</span>
              </a>
            </div>
          </div>

          {/* Categories col 1 */}
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#7C4DFF]">
              Earn Crypto
            </p>
            <ul className="space-y-2.5">
              {cryptoCategories.slice(0, 5).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/crypto/${cat.slug}`}
                    className="group flex items-center gap-1.5 text-[13px] text-white/40 transition-colors hover:text-[#7C4DFF]"
                  >
                    <span className="opacity-0 transition-opacity group-hover:opacity-100">→</span>
                    {cat.emoji} {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories col 2 */}
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#7C4DFF]">
              Tools & More
            </p>
            <ul className="space-y-2.5">
              {cryptoCategories.slice(5).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/crypto/${cat.slug}`}
                    className="group flex items-center gap-1.5 text-[13px] text-white/40 transition-colors hover:text-[#7C4DFF]"
                  >
                    <span className="opacity-0 transition-opacity group-hover:opacity-100">→</span>
                    {cat.emoji} {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/30">
              Quick Links
            </p>
            <ul className="space-y-2.5">
              {[
                { label: "All Crypto Tools", href: "/crypto/directory" },
                { label: "Airdrops", href: "/crypto/airdrops" },
                { label: "DeFi Yield", href: "/crypto/defi-yield" },
                { label: "Exchanges", href: "/crypto/exchanges" },
                { label: "Wallets", href: "/crypto/wallets" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex items-center gap-1.5 text-[13px] text-white/40 transition-colors hover:text-white/70"
                  >
                    <span className="opacity-0 transition-opacity group-hover:opacity-100">→</span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-white/[0.06] pt-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/20">
                Sister Site
              </p>
              <a
                href="https://sidehustletools.app/crypto"
                target="_blank"
                rel="dofollow noreferrer"
                className="block text-[13px] text-[#0ABFAA] hover:text-[#0ABFAA]/70 transition-colors"
              >
                sidehustletools.app/crypto
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.04] bg-[#020202]">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 sm:flex-row">
          <p className="text-[11px] text-white/20">
            © {year} EarnInCrypto · earnincrypto.io
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[11px] text-white/15">
              <Shield className="h-3 w-3" />
              Crypto involves significant financial risk. DYOR. Not financial advice.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
