"use client";

import { Icon } from "@/components/ui/Icon";
import { useStore } from "@/features/store/StoreProvider";
import { compact, cx } from "@/lib/format";
import type { Poll } from "@/types";
import s from "./PollCard.module.scss";

export function PollCard({ postId, poll }: { postId: string; poll: Poll }) {
  const { votes, vote } = useStore();
  const chosen = votes[postId];
  const total = poll.options.reduce((n, o) => n + o.votes, 0) + (chosen ? 1 : 0);

  return (
    <div className={s.poll} role="group" aria-label={poll.question}>
      <p className={s.q}>{poll.question}</p>
      <ul className={s.list}>
        {poll.options.map((o) => {
          const count = o.votes + (chosen === o.id ? 1 : 0);
          const pct = Math.round((count / total) * 100);
          return (
            <li key={o.id}>
              <button
                type="button"
                className={cx(s.opt, chosen === o.id && s.mine, chosen && s.done)}
                onClick={() => vote(postId, o.id)}
                disabled={!!chosen}
                aria-pressed={chosen === o.id}
              >
                {chosen && <span className={s.fill} style={{ width: `${pct}%` }} />}
                <span className={s.label}>
                  {chosen === o.id && <Icon name="check" size={14} />}
                  {o.label}
                </span>
                {chosen && <span className={s.pct}>{pct}%</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p className={s.meta}>
        {compact(total)} votes · {poll.endsInHours}h left
      </p>
    </div>
  );
}
