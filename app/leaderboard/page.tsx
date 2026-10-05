import type { Metadata } from "next";
import { PageBanner } from "@/components/layout/PageBanner";
import { TopBar } from "@/components/layout/TopBar";
import { LeaderboardView } from "@/features/leaderboard/LeaderboardView";
import { getLeaderboard } from "@/lib/api";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "The investors writing the most useful discussions on MarketBrains, ranked by the quality of what they contribute.",
};

export default async function LeaderboardPage() {
  const [week, month, all] = await Promise.all([getLeaderboard("week"), getLeaderboard("month"), getLeaderboard("all")]);
  return (
    <>
      <TopBar title="Leaderboard" back fallbackHref="/" />
      <PageBanner
        eyebrow="Top contributors"
        title="Rewarding useful ideas"
        text="Points come from thoughtful posts and comments that other investors find valuable. Not from volume."
        icon="trophy"
        hue={42}
      />
      <LeaderboardView boards={{ week, month, all }} />
    </>
  );
}
