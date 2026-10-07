import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { timeAgo } from "@/lib/format";
import { buildInsights, type Outlook } from "@/lib/insights";
import type { Post } from "@/types";
import s from "./CommunityInsights.module.scss";

const KIND_LABEL = { results: "Results", news: "News", poll: "Poll", peak: "Top", shift: "Shift", question: "Question" } as const;

function Bar({ o }: { o: Outlook }) {
  return (
    <div className={s.outlook}>
      <div className={s.olHead}>
        <span>{o.window}</span>
        <strong>{o.label}</strong>
      </div>
      <div className={s.bar} aria-hidden="true">
        <span className={s.b} style={{ flexGrow: o.bull }} />
        <span className={s.n} style={{ flexGrow: o.neutral }} />
        <span className={s.r} style={{ flexGrow: o.bear }} />
      </div>
      <small>
        {o.bull} bullish · {o.neutral} neutral · {o.bear} bearish
      </small>
    </div>
  );
}

/** Reads the discussions and turns them into goals, milestones, sentiment and a plain-language summary. */
export function CommunityInsights({ name, posts, changePct }: { name: string; posts: Post[]; changePct?: number | null }) {
  if (posts.length < 2) return null;
  const i = buildInsights(name, posts, changePct);

  return (
    <section className={s.card} aria-labelledby="ci-title">
      <p className={s.eyebrow}>Discussion insights</p>
      <h3 id="ci-title" className={s.title}>
        What members are working out
      </h3>

      <p className={s.summary}>{i.summary}</p>

      {i.objectives.length > 0 && (
        <div className={s.block}>
          <h4>Member goals</h4>
          <ul className={s.goals}>
            {i.objectives.map((o) => (
              <li key={o.id}>
                <div className={s.goalHead}>
                  <strong>{o.label}</strong>
                  <b>{o.share}%</b>
                </div>
                <div className={s.track}>
                  <span style={{ width: `${o.share}%` }} />
                </div>
                <small>
                  {o.hint} · {o.count} {o.count === 1 ? "discussion" : "discussions"}
                </small>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={s.block}>
        <h4>Sentiment trend</h4>
        <div className={s.pair}>
          <Bar o={i.recent} />
          <Bar o={i.earlier} />
        </div>
      </div>

      {i.reality && (
        <div className={`${s.reality} ${s[i.reality.verdict]}`}>
          <h4>What members think vs what happened</h4>
          <p>
            <strong>{i.reality.title}.</strong> {i.reality.text}
          </p>
        </div>
      )}

      {i.milestones.length > 0 && (
        <div className={s.block}>
          <h4>Milestones</h4>
          <ol className={s.timeline}>
            {i.milestones.map((m) => (
              <li key={m.id} className={m.stance ? s[m.stance] : undefined}>
                <span className={s.dot} aria-hidden="true" />
                <div>
                  <p className={s.mHead}>
                    <em>{KIND_LABEL[m.kind]}</em>
                    <span>{m.ageMin ? timeAgo(m.ageMin) : "now"}</span>
                  </p>
                  <p className={s.mTitle}>{m.title}</p>
                  {m.href ? (
                    <Link href={m.href} className={s.mDetail}>
                      {m.detail}
                    </Link>
                  ) : (
                    <p className={s.mDetail}>{m.detail}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(i.concerns.length > 0 || i.asks.length > 0) && (
        <div className={s.block}>
          {i.concerns.length > 0 && (
            <>
              <h4>Recurring concerns</h4>
              <ul className={s.chips}>
                {i.concerns.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </>
          )}
          {i.asks.length > 0 && (
            <>
              <h4>Unanswered questions</h4>
              <ul className={s.qs}>
                {i.asks.map((q) => (
                  <li key={q.id}>
                    <Link href={`/community/${q.communitySlug}/post/${q.id}`}>
                      {q.title}
                      <Icon name="chevron" size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <p className={s.fine}>Generated automatically from member posts. Opinions, not investment advice.</p>
    </section>
  );
}
