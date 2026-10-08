import Link from "next/link";
import { timeAgo } from "@/lib/format";
import { buildInsights, type Outlook } from "@/lib/insights";
import type { NewsItem, Post } from "@/types";
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
export function CommunityInsights({ name, posts, news, changePct }: { name: string; posts: Post[]; news: NewsItem[]; changePct?: number | null }) {
  if (posts.length + news.length < 2) return null;
  const i = buildInsights(name, posts, news, changePct);

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
          {i.recent.total > 0 && <Bar o={i.recent} />}
          {i.earlier.total > 0 && <Bar o={i.earlier} />}
          {i.newsTone && <Bar o={i.newsTone} />}
        </div>
      </div>

      {i.reality && (
        <div className={`${s.reality} ${s[i.reality.verdict]}`}>
          <h4>What people think vs what happened</h4>
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
                  {m.href && m.external ? (
                    <a href={m.href} target="_blank" rel="noopener noreferrer" className={s.mDetail}>
                      {m.detail}
                    </a>
                  ) : m.href ? (
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

      {i.concerns.length > 0 && (
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
        </div>
      )}

      <p className={s.fine}>Generated automatically from news headlines. Opinions, not investment advice.</p>
    </section>
  );
}
