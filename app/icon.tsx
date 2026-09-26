// app/icon.tsx — favicon, generated so the <link rel="icon"> Next emits always
// points at a file that exists.
import { ImageResponse } from "next/og";
import { BrandMark } from "./_brand-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<BrandMark size={32} />, size);
}
