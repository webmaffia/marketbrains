"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useStore } from "@/features/store/StoreProvider";
import { compact, cx } from "@/lib/format";
import type { Poll } from "@/types";
import s from "./PollCard.module.scss";

export function PollCard({ postId, poll }: { postId: string; poll: Poll }) {
  const { votes, vote, isLoggedIn } = useStore();
  // Server counts already include votes cast before the page loaded; add this session's vote on top.
  const [justVoted, setJustVoted] = useState<string | null>(null);
  const chosen = votes[postId];
  const ended = poll.endsInHours === 0;
  const showResults = !!chosen || ended;
  const countOf = (id: string, base: number) => base + (chosen && justVoted === id ? 1 : 0);
  const total = poll.options.reduce((n, o) => n + countOf(o.id, o.votes), 0);

  const onVote = (id: string) => {
    if (isLoggedIn) setJustVoted(id);
    vote(postId, id);
  };

  return (
    <div className={s.poll} role="group" aria-label={poll.question}>
      <p className={s.q}>{poll.question}</p>
      <ul className={s.list}>
        {poll.options.map((o) => {
          const pct = total ? Math.round((countOf(o.id, o.votes) / total) * 100) : 0;
          return (
            <li key={o.id}>
              <button
                type="button"
                className={cx(s.opt, chosen === o.id && s.mine, showResults && s.done)}
                onClick={() => onVote(o.id)}
                disabled={showResults}
                aria-pressed={chosen === o.id}
              >
                {showResults && <span className={s.fill} style={{ width: `${pct}%` }} />}
                <span className={s.label}>
                  {chosen === o.id && <Icon name="check" size={14} />}
                  {o.label}
                </span>
                {showResults && <span className={s.pct}>{pct}%</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p className={s.meta}>
        {compact(total)} votes{poll.endsInHours === undefined ? "" : ended ? " · Ended" : ` · ${poll.endsInHours}h left`}
      </p>
    </div>
  );
}
