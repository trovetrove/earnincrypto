import { ClerkProvider } from "@clerk/nextjs";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "@/styles/globals.css";

export const metadata = {
  metadataBase: new URL("https://earnincrypto.io"),
  title: { default: "EarnInCrypto — Best Crypto Tools & Airdrops", template: "%s | EarnInCrypto" },
  description: "Discover the best crypto airdrops, exchanges, DeFi yields, wallets, and trading tools. Independently reviewed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-[#0a0a0a] text-white antialiased">
          <Navbar />
          <main>{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
