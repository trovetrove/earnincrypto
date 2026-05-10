import Link from "next/link";
import { Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center bg-[#7C4DFF]/10 border border-[#7C4DFF]/20">
        <span className="font-display text-3xl font-black text-[#7C4DFF]">404</span>
      </div>
      <h1 className="mb-2 font-display text-3xl font-black text-white md:text-4xl">
        Page Not Found
      </h1>
      <p className="mb-8 max-w-md text-white/40">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="flex items-center gap-2 border-2 border-[#7C4DFF] bg-[#7C4DFF] px-6 py-3 text-sm font-bold text-white hover:bg-[#7C4DFF]/80 transition-colors"
        >
          <Zap className="h-4 w-4" />
          Go Home
        </Link>
        <Link
          href="/crypto/directory"
          className="flex items-center gap-2 border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/60 hover:text-white/80 transition-colors"
        >
          Browse All Tools
        </Link>
      </div>
    </div>
  );
}
