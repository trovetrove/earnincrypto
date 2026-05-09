// app/crypto/layout.tsx

import Link from "next/link";
import { Shield, Zap } from "lucide-react";
import { cryptoCategories } from "@/lib/crypto/data-static";

export default function CryptoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Crypto nav bar */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-12 items-center justify-between px-4">
          <Link href="/crypto" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center bg-[#7C4DFF]">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-display text-sm font-black tracking-tight text-white">
              SHT<span className="text-[#7C4DFF]">·Crypto</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {cryptoCategories.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                href={`/crypto/${cat.slug}`}
                className="px-2.5 py-1 text-xs font-medium text-white/40 transition-colors hover:text-[#7C4DFF]"
              >
                {cat.emoji} {cat.name}
              </Link>
            ))}
            <Link
              href="/crypto/directory"
              className="ml-1 border border-[#7C4DFF]/30 bg-[#7C4DFF]/10 px-3 py-1 text-xs font-bold text-[#7C4DFF] transition-colors hover:bg-[#7C4DFF]/20"
            >
              All Tools
            </Link>
          </div>

          <Link
            href="/"
            className="text-xs text-white/20 transition-colors hover:text-white/50"
          >
            ← Main Site
          </Link>
        </div>
      </nav>

      {children}

      {/* Crypto footer */}
      <footer className="border-t border-white/[0.06] bg-[#050505]">
        <div className="container mx-auto px-4 py-10">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <Link href="/crypto" className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center bg-[#7C4DFF]">
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-display text-sm font-black text-white">
                  SHT<span className="text-[#7C4DFF]">·Crypto</span>
                </span>
              </Link>
              <p className="text-xs text-white/30 leading-relaxed">
                Curated crypto tools, airdrops, and opportunities. Every listing independently reviewed.
              </p>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#7C4DFF]">Categories</p>
              <div className="grid grid-cols-2 gap-1.5">
                {cryptoCategories.map((cat) => (
                  <Link key={cat.id} href={`/crypto/${cat.slug}`}
                    className="text-xs text-white/30 hover:text-[#7C4DFF] transition-colors">
                    {cat.emoji} {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Quick Links</p>
              <div className="space-y-1.5">
                <Link href="/crypto/directory" className="block text-xs text-white/30 hover:text-[#7C4DFF] transition-colors">All Crypto Tools</Link>
                <Link href="/" className="block text-xs text-white/30 hover:text-white/60 transition-colors">Main Site</Link>
                <Link href="/directory" className="block text-xs text-white/30 hover:text-white/60 transition-colors">All Tools</Link>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-start gap-3 border-t border-white/[0.04] pt-6 text-[10px] text-white/15">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>Crypto involves significant financial risk. Always DYOR. Nothing on this site constitutes financial advice. Referral links may earn us a commission.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
