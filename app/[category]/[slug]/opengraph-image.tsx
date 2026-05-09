// app/crypto/[category]/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { getCryptoEntryBySlug } from "@/lib/crypto/queries";
import { getCryptoCategoryBySlug } from "@/lib/crypto/data-static";

export const runtime = "edge";
export const revalidate = 86400;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RISK_COLORS: Record<string, string> = {
  low: "#34D163",
  medium: "#F5C842",
  high: "#FF4F2B",
};

export default async function Image({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;
  const entry = await getCryptoEntryBySlug(slug);
  const category = getCryptoCategoryBySlug(categorySlug);

  if (!entry || !category) {
    return new ImageResponse(
      <div style={{ width: "1200px", height: "630px", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#7C4DFF", fontSize: "48px", fontWeight: 900 }}>SHT·Crypto</span>
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const riskColor = RISK_COLORS[entry.riskLevel] ?? "#F5C842";
  const stars = "★".repeat(Math.round(entry.rating)) + "☆".repeat(5 - Math.round(entry.rating));

  return new ImageResponse(
    <div style={{
      width: "1200px", height: "630px", background: "#0a0a0a",
      display: "flex", flexDirection: "column",
      fontFamily: "system-ui, sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", background: "#7C4DFF" }} />
      <div style={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: "radial-gradient(circle, #7C4DFF 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />
      <div style={{ position: "relative", padding: "60px 80px", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", background: "#7C4DFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 900 }}>⚡</div>
            <span style={{ color: "#fff", fontSize: "20px", fontWeight: 700 }}>SHT<span style={{ color: "#7C4DFF" }}>·Crypto</span></span>
          </div>
          <div style={{ background: category.color, color: "#0a0a0a", padding: "6px 16px", fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {category.emoji} {category.name}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h1 style={{ margin: 0, color: "#fff", fontSize: entry.title.length > 30 ? "48px" : "60px", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            {entry.title}
          </h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "22px", lineHeight: 1.4, maxWidth: "800px" }}>
            {entry.shortDescription.length > 100 ? entry.shortDescription.slice(0, 100) + "..." : entry.shortDescription}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: riskColor, color: "#fff", padding: "8px 20px", fontSize: "14px", fontWeight: 800, textTransform: "uppercase" }}>
            {entry.riskLevel} risk
          </div>
          {entry.chain && (
            <div style={{ background: "#1a1a1a", border: "2px solid #333", padding: "8px 20px", color: "#fff", fontSize: "14px", fontWeight: 700 }}>
              {entry.chain}
            </div>
          )}
          <div style={{ background: "#1a1a1a", border: "2px solid #333", padding: "8px 20px", color: "#F5C842", fontSize: "16px", letterSpacing: "2px" }}>
            {stars} {entry.rating}/5
          </div>
          {entry.potential && (
            <div style={{ background: "#7C4DFF", color: "#fff", padding: "8px 20px", fontSize: "14px", fontWeight: 800 }}>
              {entry.potential}
            </div>
          )}
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
