import { ClerkProvider } from "@clerk/nextjs";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "@/styles/globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://earnincrypto.io";
const CURRENT_YEAR = new Date().getFullYear();

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: `EarnInCrypto — Best Crypto Tools & Airdrops ${CURRENT_YEAR}`,
    template: `%s | EarnInCrypto`,
  },
  description:
    `Discover the best crypto airdrops, exchanges, DeFi yields, wallets, and trading tools for ${CURRENT_YEAR}. Independently reviewed and curated.`,
  keywords: [
    "crypto airdrops", "earn crypto", "DeFi yield", "crypto exchanges",
    "crypto wallets", "learn and earn crypto", "NFT tools", "crypto trading tools",
    "blockchain infrastructure", "crypto security", "token launchpads",
    "free crypto", "passive crypto income",
  ],
  openGraph: {
    type: "website",
    siteName: "EarnInCrypto",
    locale: "en_US",
    url: BASE_URL,
    title: `EarnInCrypto — Best Crypto Tools & Airdrops ${CURRENT_YEAR}`,
    description: `Discover the best crypto airdrops, exchanges, DeFi yields, wallets, and trading tools. Independently reviewed.`,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "EarnInCrypto — Curated Crypto Tools & Airdrops",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `EarnInCrypto — Best Crypto Tools & Airdrops ${CURRENT_YEAR}`,
    description: `Discover the best crypto airdrops, exchanges, DeFi yields, and wallets. Independently reviewed.`,
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: BASE_URL,
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
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "EarnInCrypto",
  url: BASE_URL,
  description: `Curated crypto tools, airdrops, and earning opportunities. Independently reviewed for ${CURRENT_YEAR}.`,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/directory?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
  // Cross-link relationship to SideHustleTools
  sameAs: ["https://sidehustletools.app/crypto"],
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "EarnInCrypto",
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
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
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
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
