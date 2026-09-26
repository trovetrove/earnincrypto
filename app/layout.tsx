import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo/metadata";
import { LOGO_PATH } from "@/lib/seo/structuredData";
import { safeJsonLd } from "@/lib/utils";
import "@/styles/globals.css";

// Site-wide defaults only. Every public route sets its own title, canonical and
// openGraph via lib/seo/metadata.ts. Nothing page-specific belongs here: a
// canonical or og:url set on the root is inherited by any child that doesn't
// override it, which pointed pages' canonical and og:url at the homepage.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}: Crypto Airdrops, Exchanges & DeFi Yield`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — independent research on crypto airdrops, exchanges and DeFi yield`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Emitted as <meta name="ory-verify">. It used to sit at the top level of
  // this object, where Next ignores unknown keys and nothing was rendered.
  other: {
    "ory-verify": "orynth-fe73d56d7d7a469a9e6cd19ca8021bf1",
  },
  // No `icons` list: app/icon.tsx and app/apple-icon.tsx generate the only
  // icons the site has, so no <link> can point at a file that isn't there.
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/directory?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
  // Cross-link relationship to SideHustleTools
  sameAs: ["https://sidehustletools.app/crypto"],
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl(LOGO_PATH),
  description:
    "An independent research and comparison site for crypto airdrops, exchanges, DeFi yield and wallets. Not affiliated with the projects it reviews.",
  // Explicit relationship
  memberOf: {
    "@type": "Organization",
    name: "SideHustleTools",
    url: "https://sidehustletools.app",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeJsonLd(orgJsonLd) }}
          />
          <script
            defer
            src="/stats/script.js"
            data-website-id="686aa394-3a14-409b-aaa4-c8a29cce5c64"
          />
        </head>
        <body className="bg-[#0a0a0a] text-white antialiased">
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
