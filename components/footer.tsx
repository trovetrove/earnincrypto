import Link from "next/link";
import { Zap } from "lucide-react";
import { cryptoCategories } from "@/lib/data-static";

export function Footer() {
  const year = new Date().getFullYear();

  const col1 = cryptoCategories.slice(0, 4);
  const col2 = cryptoCategories.slice(4);

  return (
    <footer className="border-t-2 border-[#0E0E0E] bg-[#0E0E0E] text-[#F7F2E5]">
      {/* Main footer body */}
      <div className="container mx-auto px-4 py-14">
        <div className="grid gap-10 md:grid-cols-4">

          {/* Brand */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <div
                className="brutal-btn flex h-9 w-9 items-center justify-center p-0"
                style={{ background: "#F5C842", boxShadow: "3px 3px 0 #F5C842" }}
              >
                <Zap className="h-4 w-4 fill-[#0E0E0E] text-[#0E0E0E]" />
              </div>
              <span className="font-display text-[15px] font-black tracking-tight text-[#F7F2E5]">
                SideHustle<span style={{ color: "#F5C842" }}>Tools</span>
              </span>
            </Link>

            <p className="text-[13px] leading-relaxed text-[#F7F2E5]/50">
              Your free toolkit for side hustles and bootstrapping in {year}.
              Curated tools, real earnings potential, no fluff.
            </p>

            {/* Mini stat boxes */}
            <div className="flex gap-2">
              {[
                { label: "Tools", val: "41+" },
                { label: "Value", val: "$1.3M+" },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className="px-3 py-2 text-center"
                  style={{ border: "2px solid #2a2a2a", background: "#1a1a1a" }}
                >
                  <p className="font-display text-sm font-black text-[#F5C842]">{val}</p>
                  <p className="text-[10px] uppercase tracking-wide text-[#F7F2E5]/40">{label}</p>
                </div>
              ))}
            </div>

            {/* Cross-link to EarnInCrypto */}
            <div style={{ border: "1px solid #2a2a2a", background: "#1a1a1a", padding: "12px" }}>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F7F2E5]/20">
                Crypto Network
              </p>
              <a
                href="https://earnincrypto.io"
                target="_blank"
                rel="dofollow noreferrer"
                className="flex items-center gap-2 text-xs font-semibold text-[#7C4DFF] hover:text-[#7C4DFF]/70 transition-colors"
              >
                ⚡ EarnInCrypto.io
                <span className="text-[#F7F2E5]/20 font-normal">Crypto tools & airdrops</span>
              </a>
            </div>
          </div>

          {/* Earn & Credits */}
          <div>
            <p
              className="mb-5 inline-block px-2 py-1 font-display text-[10px] font-black uppercase tracking-widest"
              style={{ background: "#F5C842", color: "#0E0E0E" }}
            >
              Earn & Credits
            </p>
            <ul className="space-y-2.5">
              {col1.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/${cat.slug}`}
                    className="group flex items-center gap-1.5 text-[13px] text-[#F7F2E5]/50 transition-colors hover:text-[#F5C842]"
                  >
                    <span className="opacity-0 transition-opacity group-hover:opacity-100">→</span>
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Build & Grow */}
          <div>
            <p
              className="mb-5 inline-block px-2 py-1 font-display text-[10px] font-black uppercase tracking-widest"
              style={{ background: "#0ABFAA", color: "#0E0E0E" }}
            >
              Build & Grow
            </p>
            <ul className="space-y-2.5">
              {col2.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/${cat.slug}`}
                    className="group flex items-center gap-1.5 text-[13px] text-[#F7F2E5]/50 transition-colors hover:text-[#0ABFAA]"
                  >
                    <span className="opacity-0 transition-opacity group-hover:opacity-100">→</span>
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <p
              className="mb-5 inline-block px-2 py-1 font-display text-[10px] font-black uppercase tracking-widest"
              style={{ background: "#FF4F2B", color: "#fff" }}
            >
              Quick Links
            </p>
            <ul className="space-y-2.5">
              {[
                { label: "Browse Directory",    href: "/directory" },
                { label: "Startup Tools",       href: "/startup-tools" },
                { label: "Earn Money",          href: "/earn-money" },
                { label: "Free Credits",        href: "/free-credits" },
                { label: "AI & ML",             href: "/ai-ml" },
                { label: "Compare Tools",       href: "/compare" },
                { label: "⚡ Crypto Section",    href: "/crypto" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`group flex items-center gap-1.5 text-[13px] transition-colors ${
                      href === "/crypto"
                        ? "text-[#7C4DFF]/70 hover:text-[#7C4DFF] font-semibold"
                        : "text-[#F7F2E5]/50 hover:text-[#FF4F2B]"
                    }`}
                  >
                    <span className="opacity-0 transition-opacity group-hover:opacity-100">→</span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-[#2a2a2a] pt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#F7F2E5]/20">
                Crypto Sister Site
              </p>
              <a
                href="https://earnincrypto.io"
                target="_blank"
                rel="dofollow noreferrer"
                className="block text-[13px] font-semibold text-[#7C4DFF] hover:text-[#7C4DFF]/70 transition-colors"
              >
                EarnInCrypto.io
              </a>
              <p className="mt-0.5 text-[11px] text-[#F7F2E5]/25">
                Airdrops, DeFi yield, exchanges & more
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t-2 border-[#2a2a2a]"
        style={{ background: "#080808" }}
      >
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 sm:flex-row">
          <p className="text-[11px] text-[#F7F2E5]/30">
            © {year} SideHustleTools · sidehustletools.app
          </p>
          <div className="flex items-center gap-4">
            <span
              className="px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-widest"
              style={{ background: "#1a1a1a", color: "#F5C842", border: "1px solid #2a2a2a" }}
            >
              Updated March 2026
            </span>
            <p className="text-[11px] text-[#F7F2E5]/30">Not financial advice</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
