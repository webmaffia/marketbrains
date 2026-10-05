"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useStore } from "@/features/store/StoreProvider";
import { cx } from "@/lib/format";
import { PERIODS, POINT_NOTES, POINT_RULES, tierFor, type Period } from "@/lib/leaderboard";
import type { LeaderboardEntry } from "@/types";
import s from "./LeaderboardView.module.scss";

interface Props {
  boards: Record<Period, LeaderboardEntry[]>;
}

const medal = ["gold", "silver", "bronze"] as const;

export function LeaderboardView({ boards }: Props) {
  const { session, isLoggedIn, openAuth } = useStore();
  const [period, setPeriod] = useState<Period>("week");
  const list = boards[period];
  const allTime = new Map(boards.all.map((e) => [e.userId, e.score]));
  const myIndex = session ? list.findIndex((e) => e.userId === session.userId) : -1;
  const me = myIndex >= 0 ? list[myIndex] : null;
  const ahead = myIndex > 0 ? list[myIndex - 1] : null;
  const myAllTime = session ? (allTime.get(session.userId) ?? 0) : 0;
  const tier = tierFor(myAllTime);
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);

  return (
    <div className={s.wrap}>
      <SegmentTabs tabs={PERIODS} value={period} onChange={setPeriod} label="Period" idPrefix="lb" variant="pill" />

      <section className={s.me} aria-label="Your standing">
        {!isLoggedIn ? (
          <>
            <div>
              <strong>Join the board</strong>
              <p>Sign in and share a thoughtful take to start earning points.</p>
            </div>
            <Button size="sm" onClick={() => openAuth("Sign in to climb the leaderboard")}>
              Sign in
            </Button>
          </>
        ) : me ? (
          <>
            <span className={s.rank}>#{myIndex + 1}</span>
            <div>
              <strong>
                {me.score} points · {PERIODS.find((p) => p.id === period)?.label.toLowerCase()}
              </strong>
              <p>
                {ahead ? `${ahead.score - me.score + 1} more to pass ${ahead.name.split(" ")[0]}.` : "You're leading. Keep sharing what you know."} {tier.next ? `${tier.next.min - myAllTime} points to ${tier.next.name}.` : ""}
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <strong>You&apos;re not on the board yet</strong>
              <p>Write a thoughtful comment or discussion {period === "all" ? "" : "in this period "}to earn your first points.</p>
            </div>
            <Button size="sm" href="/discover">
              Start here
            </Button>
          </>
        )}
      </section>

      {list.length === 0 ? (
        <p className={s.empty}>No one has earned points in this period yet. Be the first.</p>
      ) : (
        <>
          <ol className={s.podium} aria-label="Top three">
            {top3.map((e, i) => (
              <li key={e.userId} className={cx(s.slot, s[medal[i]], i === 0 && s.first)}>
                <Link href={`/user/${e.username}`}>
                  <span className={s.crown} aria-hidden="true">
                    {i === 0 ? <Icon name="trophy" size={18} /> : i + 1}
                  </span>
                  <span className={s.ava}>
                    <UserAvatar user={e} size={i === 0 ? 72 : 58} />
                  </span>
                  <strong>{e.name.split(" ")[0]}</strong>
                  <small>{e.score} pts</small>
                </Link>
              </li>
            ))}
          </ol>

          <ol className={s.list} start={4}>
            {rest.map((e, i) => (
              <li key={e.userId} className={cx(s.row, session?.userId === e.userId && s.mine)}>
                <Link href={`/user/${e.username}`}>
                  <span className={s.pos}>{i + 4}</span>
                  <UserAvatar user={e} size={42} />
                  <span className={s.who}>
                    <strong>
                      {e.name}
                      {e.verified && <Icon name="verified" size={13} filled className={s.verified} />}
                    </strong>
                    <small>
                      {tierFor(allTime.get(e.userId) ?? e.score).current.name} · {e.posts} {e.posts === 1 ? "post" : "posts"} · {e.comments} comments · {e.likes} likes
                    </small>
                  </span>
                  <span className={s.score}>{e.score}</span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}

      <section className={s.how} aria-label="How points work">
        <h2>How to climb</h2>
        <ul>
          {POINT_RULES.map((r) => (
            <li key={r.label}>
              <span>{r.label}</span>
              <b>{r.pts}</b>
            </li>
          ))}
        </ul>
        <ul className={s.notes}>
          {POINT_NOTES.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className={s.unlock}>
          <Icon name="sparkle" size={16} /> Publish 5 discussions to unlock social links on your profile.
        </p>
      </section>
    </div>
  );
}
