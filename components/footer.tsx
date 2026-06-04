import Link from "next/link";
import { Zap, ExternalLink } from "lucide-react";
import { cryptoCategories } from "@/lib/crypto/data-static";

export function Footer() {
  const year = new Date().getFullYear();
  const col1 = cryptoCategories.slice(0, 5);
  const col2 = cryptoCategories.slice(5);

  return (
    <footer className="border-t border-white/[0.06] bg-[#080808] text-white">
      <div className="container mx-auto px-4 py-14">
        <div className="grid gap-10 md:grid-cols-4">

          {/* Brand */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 w-fit">
              <div className="flex h-9 w-9 items-center justify-center bg-[#7C4DFF]">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-display text-[15px] font-black tracking-tight text-white">
                EarnIn<span className="text-[#7C4DFF]">Crypto</span>
              </span>
            </Link>

            <p className="text-[13px] leading-relaxed text-white/40">
              Curated crypto tools, airdrops, and earning opportunities for {year}.
              Every listing independently reviewed — no paid placements.
            </p>

            <div className="flex gap-2">
              {[
                { label: "Tools", val: "50+" },
                { label: "Categories", val: "10" },
              ].map(({ label, val }) => (
                <div key={label} className="px-3 py-2 text-center border border-white/[0.06] bg-white/[0.03]">
                  <p className="font-display text-sm font-black text-[#7C4DFF]">{val}</p>
                  <p className="text-[10px] uppercase tracking-wide text-white/30">{label}</p>
                </div>
              ))}
            </div>

            {/* Sister site cross-link */}
            <div className="border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/20">
                Sister Site
              </p>
              <a
                href="https://sidehustletools.app"
                target="_blank"
                rel="dofollow noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#F5C842] hover:text-[#F5C842]/70 transition-colors"
              >
                ⚡ SideHustleTools.app <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <p className="mt-0.5 text-[11px] text-white/20">Free cloud credits & startup perks</p>
            </div>
          </div>

          {/* Airdrops & Earning */}
          <div>
            <p className="mb-5 inline-block px-2 py-1 font-display text-[10px] font-black uppercase tracking-widest bg-[#7C4DFF] text-white">
              Earn Crypto
            </p>
            <ul className="space-y-2.5">
              {col1.map(cat => (
                <li key={cat.id}>
                  <Link
                    href={`/${cat.slug}`}
                    className="group flex items-center gap-1.5 text-[13px] text-white/40 transition-colors hover:text-[#7C4DFF]"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    {cat.emoji} {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools & Infrastructure */}
          <div>
            <p className="mb-5 inline-block px-2 py-1 font-display text-[10px] font-black uppercase tracking-widest bg-[#0ABFAA] text-[#0a0a0a]">
              Tools & Infra
            </p>
            <ul className="space-y-2.5">
              {col2.map(cat => (
                <li key={cat.id}>
                  <Link
                    href={`/${cat.slug}`}
                    className="group flex items-center gap-1.5 text-[13px] text-white/40 transition-colors hover:text-[#0ABFAA]"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    {cat.emoji} {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <p className="mb-5 inline-block px-2 py-1 font-display text-[10px] font-black uppercase tracking-widest bg-[#FF4F2B] text-white">
              Quick Links
            </p>
            <ul className="space-y-2.5">
              {[
                { label: "Browse Directory",   href: "/directory" },
                { label: "Latest Airdrops",    href: "/airdrops" },
                { label: "DeFi Yield",         href: "/defi-yield" },
                { label: "Best Exchanges",     href: "/exchanges" },
                { label: "Crypto Wallets",     href: "/wallets" },
                { label: "Launchpads",         href: "/launchpads" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex items-center gap-1.5 text-[13px] text-white/40 transition-colors hover:text-[#FF4F2B]"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-white/[0.06] pt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/20">
                Part of the SHT Network
              </p>
              <a
                href="https://sidehustletools.app"
                target="_blank"
                rel="dofollow noreferrer"
                className="block text-[13px] font-semibold text-[#F5C842] hover:text-[#F5C842]/70 transition-colors"
              >
                SideHustleTools.app ↗
              </a>
              <p className="mt-0.5 text-[11px] text-white/25">Free credits & startup perks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.06]">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 sm:flex-row">
          <p className="text-[11px] text-white/25">
            © {year} EarnInCrypto · earnincrypto.io
          </p>
          <div className="flex items-center gap-4">
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border border-white/[0.06] text-[#7C4DFF]">
              Updated {year}
            </span>
            <p className="text-[11px] text-white/25">Not financial advice. DYOR.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
