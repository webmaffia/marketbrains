import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MarketBrains",
    short_name: "MarketBrains",
    description: "A global investor community. Follow, discuss, debate and learn together.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eff4f2",
    theme_color: "#eff4f2",
    categories: ["finance", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Discover", url: "/discover" },
      { name: "Notifications", url: "/notifications" },
    ],
  };
}
