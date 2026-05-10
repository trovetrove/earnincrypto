// app/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { getCryptoStats } from "@/lib/crypto/queries";

export const runtime = "edge";
export const revalidate = 86400;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const stats = await getCryptoStats();
  const year = new Date().getFullYear();

  return new ImageResponse(
    <div
      style={{
        width: "1200px",
        height: "630px",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Dot grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(124,77,255,0.15) 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Top accent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", background: "#7C4DFF" }} />

      <div style={{ position: "relative", padding: "80px", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "48px", height: "48px", background: "#7C4DFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
            ⚡
          </div>
          <span style={{ fontSize: "24px", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
            EarnIn<span style={{ color: "#7C4DFF" }}>Crypto</span>
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h1 style={{ margin: 0, fontSize: "68px", fontWeight: 900, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.03em" }}>
            Crypto Tools<br />
            <span style={{ color: "#7C4DFF" }}>& Airdrops</span>
          </h1>
          <p style={{ margin: 0, fontSize: "24px", color: "rgba(255,255,255,0.5)" }}>
            {stats.totalTools}+ curated opportunities — independently reviewed · {year}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "20px" }}>
          {[
            { val: `${stats.totalTools}+`, label: "Tools" },
            { val: `${stats.airdropCount}`, label: "Airdrops" },
            { val: `${stats.featuredCount}`, label: "Featured" },
            { val: `${stats.totalCategories}`, label: "Categories" },
          ].map(({ val, label }) => (
            <div key={label} style={{ background: "rgba(124,77,255,0.15)", border: "1px solid rgba(124,77,255,0.3)", padding: "14px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ color: "#7C4DFF", fontSize: "28px", fontWeight: 900 }}>{val}</span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
