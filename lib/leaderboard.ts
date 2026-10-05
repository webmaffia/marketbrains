import type { LeaderboardEntry } from "@/types";

export type Period = "week" | "month" | "all";

export const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
];

/** Contributor levels, from all-time points. Shown as a badge next to a name. */
export const TIERS = [
  { min: 0, name: "Newcomer", hint: "Share your first thoughtful post or comment" },
  { min: 25, name: "Contributor", hint: "Keep the useful discussions coming" },
  { min: 100, name: "Trusted", hint: "People rely on your perspective" },
  { min: 250, name: "Pillar", hint: "A cornerstone of the community" },
  { min: 500, name: "Legend", hint: "Top of the community" },
] as const;

export function tierFor(points: number) {
  let current: (typeof TIERS)[number] = TIERS[0];
  for (const t of TIERS) if (points >= t.min) current = t;
  const next = TIERS.find((t) => t.min > points);
  return { current, next };
}

/** How points are earned. Rendered on the leaderboard so the rules are never a mystery. */
export const POINT_RULES = [
  { label: "Publish a discussion with substance (40+ characters)", pts: "+5" },
  { label: "Each like on your discussion", pts: "+2" },
  { label: "Each comment your discussion starts", pts: "+3" },
  { label: "Write a thoughtful comment (20+ characters)", pts: "+1" },
  { label: "Each like on your comment", pts: "+2" },
];

export const POINT_NOTES = [
  "One discussion can earn at most 60 engagement points, so steady, useful posting beats chasing one viral hit.",
  "Quick one-liners earn almost nothing. Depth is what counts.",
  "Buy/sell calls, price targets and abuse are blocked, so they can never earn points.",
];

export function mapLeaderboardRow(r: Record<string, unknown>): LeaderboardEntry {
  return {
    userId: r.user_id as string,
    username: r.username as string,
    name: r.name as string,
    avatarUrl: (r.avatar_url as string | null) ?? undefined,
    hue: r.hue as number,
    verified: (r.verified as boolean) || undefined,
    score: r.score as number,
    posts: r.posts as number,
    comments: r.comments as number,
    likes: r.likes as number,
  };
}
