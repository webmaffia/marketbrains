import { HomeFeed } from "@/features/home/HomeFeed";
import { WelcomeGate } from "@/features/welcome/welcomeGate";
import { HomeHeader } from "@/features/home/HomeHeader";
import { MarketMood } from "@/features/home/MarketMood";
import { getCommunities, getNewsSince } from "@/lib/api";
import { buildNewsMeters } from "@/lib/newsSentiment";

export default async function HomePage() {
  const [communities, recent] = await Promise.all([getCommunities(), getNewsSince(7)]);
  const names = Object.fromEntries(communities.map((c) => [c.slug, c.name]));
  const meters = buildNewsMeters(recent);
  // The latest stories first, from the last two days, so the home screen is always current.
  const latest = recent.filter((n) => n.ageMin <= 2 * 24 * 60).slice(0, 40);

  return (
    <>
      <WelcomeGate />
      <HomeHeader />
      {(meters.today || meters.week) && <MarketMood meters={meters} />}
      <HomeFeed news={latest.length ? latest : recent.slice(0, 20)} names={names} marketSlugs={communities.filter((c) => c.kind === "market").map((c) => c.slug)} />
    </>
  );
}
