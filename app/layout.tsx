import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { RegisterSW } from "@/components/layout/RegisterSW";
import { StoreProvider } from "@/features/store/StoreProvider";
import "@/styles/globals.scss";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const description = "A global investor community. Follow assets, discuss ideas, debate perspectives and learn from people you trust.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "MarketBrains", template: "%s · MarketBrains" },
  description,
  applicationName: "MarketBrains",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MarketBrains", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: { type: "website", siteName: "MarketBrains", title: "MarketBrains", description },
  twitter: { card: "summary_large_image", title: "MarketBrains", description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a href="#main" className="sr-only">
          Skip to content
        </a>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
