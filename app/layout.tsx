import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { RegisterSW } from "@/components/layout/RegisterSW";
import { ThemeSync } from "@/components/layout/ThemeSync";
import { StoreProvider } from "@/features/store/StoreProvider";
import { THEME_COLORS, THEME_INIT_SCRIPT } from "@/lib/theme";
import "@/styles/globals.scss";

// Content comes from Supabase and changes constantly, so pages render per request.
export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const description = "Follow India's biggest companies. Get the news in short, see why it matters and vote on what you think.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "MarketBrains", template: "%s · MarketBrains" },
  description,
  applicationName: "MarketBrains",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MarketBrains", statusBarStyle: "default" },
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
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Sets a saved Light/Dark choice before first paint; with no choice the system setting applies via CSS. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="sr-only">
          Skip to content
        </a>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
        <RegisterSW />
        <ThemeSync />
      </body>
    </html>
  );
}
