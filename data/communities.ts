import type { Community, Region } from "@/types";
import { assets } from "./assets";
import { topics } from "./topics";

const assetStats: Record<string, [members: number, discussions: number, hue: number]> = {
  reliance: [8200, 2100, 24],
  tcs: [6400, 1620, 210],
  "hdfc-bank": [5900, 1480, 150],
  infosys: [4700, 1190, 190],
  nvidia: [12800, 3900, 120],
  apple: [9100, 2750, 30],
  tesla: [11200, 4300, 12],
  bitcoin: [15400, 5200, 40],
  ethereum: [8900, 2600, 260],
  solana: [5300, 1540, 300],
};

const assetCommunities: Community[] = assets.map((a) => {
  const [members, discussions, hue] = assetStats[a.id];
  return {
    slug: a.id,
    name: a.name,
    kind: "asset",
    region: a.region,
    tagline: a.about.split(". ")[0].replace(/\.$/, "") + ".",
    hue,
    members,
    discussions,
    assetId: a.id,
    featured: ["reliance", "nvidia", "bitcoin", "tcs"].includes(a.id),
  };
});

const markets: { slug: string; name: string; region: Region; tagline: string; hue: number; members: number; discussions: number }[] = [
  { slug: "nse", name: "NSE", region: "india", tagline: "National Stock Exchange conversations.", hue: 255, members: 41200, discussions: 12800 },
  { slug: "bse", name: "BSE", region: "india", tagline: "Asia's oldest exchange, discussed daily.", hue: 215, members: 22600, discussions: 6900 },
  { slug: "nyse", name: "NYSE", region: "us", tagline: "Blue chips and big debates.", hue: 190, members: 28400, discussions: 9100 },
  { slug: "nasdaq", name: "NASDAQ", region: "us", tagline: "Tech, growth and innovation.", hue: 280, members: 36800, discussions: 14200 },
];

const marketCommunities: Community[] = markets.map((m) => ({ ...m, kind: "market" as const }));

const topicCommunities: Community[] = topics.map((t, i) => ({
  slug: t.slug,
  name: t.name,
  kind: t.kind,
  region: "global" as const,
  tagline: t.description,
  hue: (i * 47 + 20) % 360,
  members: 2400 + i * 1370,
  discussions: 600 + i * 310,
}));

export const communities: Community[] = [...assetCommunities, ...marketCommunities, ...topicCommunities];
