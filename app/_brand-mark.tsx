// app/_brand-mark.tsx
//
// The lightning-bolt mark, drawn as shapes only so every generated icon and
// the publisher logo render without fetching a font or emoji set.

export function BrandMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#7C4DFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24">
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" fill="#ffffff" />
      </svg>
    </div>
  );
}
