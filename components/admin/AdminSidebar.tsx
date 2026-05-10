// components/admin/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  List,
  Plus,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface AdminSidebarProps {
  userName: string;
  userEmail: string;
  userImageUrl?: string;
}

const ADMIN_SEGMENT = process.env.NEXT_PUBLIC_ADMIN_PATH_SEGMENT ?? "manage-xk9p2";

const mainNavItems = [
  { label: "Dashboard", href: `/${ADMIN_SEGMENT}`, icon: LayoutDashboard, exact: true },
  { label: "All Entries", href: `/${ADMIN_SEGMENT}/entries`, icon: List },
  { label: "New Entry", href: `/${ADMIN_SEGMENT}/entries/new`, icon: Plus },
];

const cryptoNavItems = [
  { label: "Crypto Entries", href: `/${ADMIN_SEGMENT}/crypto/entries`, icon: List },
  { label: "New Crypto Entry", href: `/${ADMIN_SEGMENT}/crypto/entries/new`, icon: Plus },
];

const utilNavItems = [
  { label: "Settings", href: `/${ADMIN_SEGMENT}/settings`, icon: Settings },
];

export function AdminSidebar({ userName, userEmail, userImageUrl }: AdminSidebarProps) {
  const pathname = usePathname();
  const normalizedPathname = pathname.replace("/manage-panel", `/${ADMIN_SEGMENT}`);
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return normalizedPathname === href;
    return normalizedPathname.startsWith(href);
  };

  const NavLink = ({ item, activeColor = "emerald" }: { item: typeof mainNavItems[0] & { exact?: boolean }; activeColor?: string }) => {
    const active = isActive(item.href, item.exact);
    const colors = activeColor === "emerald"
      ? { bg: "bg-emerald-500/15", text: "text-emerald-400", ring: "ring-emerald-500/20", chevron: "text-emerald-400/60" }
      : { bg: "bg-[#7C4DFF]/15", text: "text-[#7C4DFF]", ring: "ring-[#7C4DFF]/20", chevron: "text-[#7C4DFF]/60" };

    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
          active
            ? `${colors.bg} ${colors.text} ring-1 ${colors.ring}`
            : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {item.label}
        {active && <ChevronRight className={`ml-auto h-3.5 w-3.5 ${colors.chevron}`} />}
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/30">
          <Shield className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wider text-white/90 uppercase">Admin Panel</p>
          <p className="text-[10px] text-white/30">SideHustleTools</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white/20">Main Site</p>
        <div className="space-y-0.5 mb-6">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} activeColor="emerald" />
          ))}
        </div>

        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#7C4DFF]/50">
          <Zap className="mr-1 inline h-3 w-3" />Crypto
        </p>
        <div className="space-y-0.5 mb-6">
          {cryptoNavItems.map((item) => (
            <NavLink key={item.href} item={item} activeColor="purple" />
          ))}
        </div>

        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white/20">System</p>
        <div className="space-y-0.5">
          {utilNavItems.map((item) => (
            <NavLink key={item.href} item={item} activeColor="emerald" />
          ))}
        </div>
      </nav>

      {/* Security box — hidden on very small screens to save space */}
      <div className="mx-3 mb-3 hidden sm:block rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Security Status</span>
        </div>
        <div className="space-y-1.5">
          {[
            { label: "Session encrypted", ok: true },
            { label: "MFA active", ok: true },
            { label: "Role verified", ok: true },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className={cn("h-1 w-1 rounded-full", s.ok ? "bg-emerald-400" : "bg-red-400")} />
              <span className="text-[10px] text-white/30">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          {userImageUrl ? (
            <img src={userImageUrl} alt={userName} className="h-7 w-7 rounded-full ring-1 ring-white/10" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white/80">{userName}</p>
            <p className="truncate text-[10px] text-white/30">{userEmail}</p>
          </div>
          <SignOutButton>
            <button className="text-white/30 hover:text-red-400 transition-colors" title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </SignOutButton>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0f0f0f] px-4 md:hidden">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold tracking-wider text-white/90 uppercase">Admin</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/[0.06] hover:text-white/90 transition-colors"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ── Mobile drawer overlay ──────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ──────────────────────────────────── */}
      <div
        className={cn(
          "fixed top-14 left-0 bottom-0 z-50 w-72 flex flex-col bg-[#0f0f0f] transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </div>

      {/* ── Desktop sidebar (unchanged behavior) ──────────── */}
      <aside className="hidden md:flex h-screen w-64 flex-col border-r border-white/[0.06] bg-[#0f0f0f] sticky top-0 shrink-0">
        <SidebarContent />
      </aside>
    </>
  );
}
