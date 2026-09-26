// app/logo.png/route.tsx
//
// /logo.png — the publisher logo the Organization and BlogPosting markup
// reference. The markup pointed at this URL before any file existed there, so
// every page's structured data carried a 404ing logo.
import { ImageResponse } from "next/og";
import { BrandMark } from "../_brand-mark";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<BrandMark size={512} />, { width: 512, height: 512 });
}
