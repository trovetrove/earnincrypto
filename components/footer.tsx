import Link from "next/link";
import { Zap, ExternalLink } from "lucide-react";
import { cryptoCategories } from "@/lib/crypto/data-static";
import { CRYPTO_CLUSTERS } from "@/lib/seo/clusters";

// Site-wide links to the topic hubs. The footer is on every page, so this is
// what keeps every hub — and through it every article — two clicks from
// anywhere. Commercial topics first; they carry most of the traffic.
const FOOTER_TOPICS = ["airdrops", "exchanges", "defi-yield", "wallets", "learn-earn", "security"]
  .map((id) => CRYPTO_CLUSTERS.find((c) => c.id === id))
  .filter((c): c is (typeof CRYPTO_CLUSTERS)[number] => Boolean(c));

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
                <Zap className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <span className="font-display text-[15px] font-black tracking-tight text-white">
                EarnIn<span className="text-[#7C4DFF]">Crypto</span>
              </span>
            </Link>

            <p className="text-[13px] leading-relaxed text-white/60">
              Independent research on crypto airdrops, exchanges, DeFi yield and wallets — real
              rewards, real risks. We&apos;re not affiliated with the projects we review; sponsored
              placements are always labelled.
            </p>

            {/* Sister site cross-link */}
            <div className="border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/45">
                Sister Site
              </p>
              <a
                href="https://sidehustletools.app"
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#F5C842] hover:text-[#F5C842]/70 transition-colors"
              >
                ⚡ SideHustleTools.app <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
              </a>
              <p className="mt-0.5 text-[11px] text-white/50">Free cloud credits & startup perks</p>
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
                    className="group flex items-center gap-1.5 text-[13px] text-white/60 transition-colors hover:text-[#B39DFF]"
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
                    className="group flex items-center gap-1.5 text-[13px] text-white/60 transition-colors hover:text-[#0ABFAA]"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    {cat.emoji} {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Topics & guides */}
          <div>
            <p className="mb-5 inline-block px-2 py-1 font-display text-[10px] font-black uppercase tracking-widest bg-[#FF4F2B] text-[#0a0a0a]">
              Topics &amp; Guides
            </p>
            <ul className="space-y-2.5">
              {[
                ...FOOTER_TOPICS.map((c) => ({ label: c.label, href: `/topics/${c.id}` })),
                { label: "All topics", href: "/topics" },
                { label: "Comparisons", href: "/compare" },
                { label: "Blog", href: "/blog" },
                { label: "Browse Directory", href: "/directory" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex items-center gap-1.5 text-[13px] text-white/60 transition-colors hover:text-[#FF7A5C]"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-white/[0.06] pt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/45">
                Part of the SHT Network
              </p>
              <a
                href="https://sidehustletools.app"
                target="_blank"
                rel="noopener"
                className="block text-[13px] font-semibold text-[#F5C842] hover:text-[#F5C842]/70 transition-colors"
              >
                SideHustleTools.app ↗
              </a>
              <p className="mt-0.5 text-[11px] text-white/50">Free credits & startup perks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.06]">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 sm:flex-row">
          <p className="text-[11px] text-white/50">
            © {year} EarnInCrypto · earnincrypto.io
          </p>
          <p className="text-[11px] text-white/50">
            Some links are referral links · Not financial advice. DYOR.
          </p>
        </div>
      </div>
    </footer>
  );
}
