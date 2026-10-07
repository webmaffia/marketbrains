import { timeAgo } from "@/lib/format";
import type { NewsMeter as Meter } from "@/lib/newsSentiment";
import s from "./NewsMeter.module.scss";

const W = 220;
const H = 124;
const R = 88;
const CX = W / 2;
const CY = H - 16;
const ARC = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

const TONE_LABEL = { bull: "Positive", bear: "Negative", neutral: "Neutral" } as const;

/** Semicircle meter for the tone of today's news, with the headlines that move it. */
export function NewsMeter({ meter, name }: { meter: Meter; name: string }) {
  const angle = -90 + ((meter.value + 1) / 2) * 180;
  const gradId = `news-${name.replace(/\W/g, "")}`;
  const pct = (n: number) => Math.round((n / meter.total) * 100);
  const score = Math.round(meter.value * 100);

  return (
    <section className={s.card} aria-label={`${name} news sentiment`}>
      <div className={s.head}>
        <p className={s.eyebrow}>News sentiment</p>
        <span className={s.count}>
          {meter.total} stories · {meter.confidence} confidence
        </span>
      </div>

      <div className={s.gauge} role="img" aria-label={`${meter.label}: ${pct(meter.bull)}% positive, ${pct(meter.neutral)}% neutral, ${pct(meter.bear)}% negative`}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--bear)" />
              <stop offset="50%" stopColor="var(--text-3)" stopOpacity="0.7" />
              <stop offset="100%" stopColor="var(--bull)" />
            </linearGradient>
          </defs>
          <path d={ARC} fill="none" stroke={`url(#${gradId})`} strokeWidth={16} strokeLinecap="round" opacity={meter.confidence === "low" ? 0.5 : 1} />
          <g className={s.needle} style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
            <line x1={CX} y1={CY} x2={CX} y2={CY - R + 14} stroke="var(--text)" strokeWidth={3} strokeLinecap="round" />
          </g>
          <circle cx={CX} cy={CY} r={7} fill="var(--text)" />
        </svg>
        <p className={s.mood}>{meter.label}</p>
        <p className={s.score}>
          Score {score > 0 ? "+" : ""}
          {score} <span>(-100 to +100)</span>
        </p>
      </div>

      <div className={s.bar} aria-hidden="true">
        <span className={s.b} style={{ flexGrow: meter.bull }} />
        <span className={s.n} style={{ flexGrow: meter.neutral }} />
        <span className={s.r} style={{ flexGrow: meter.bear }} />
      </div>
      <div className={s.legend}>
        <span className={s.lb}>{meter.bull} positive</span>
        <span>{meter.neutral} neutral</span>
        <span className={s.lr}>{meter.bear} negative</span>
      </div>

      {meter.themes.length > 0 && (
        <ul className={s.themes} aria-label="What the news is about">
          {meter.themes.map((t) => (
            <li key={t.name}>
              {t.name} <b>{t.count}</b>
            </li>
          ))}
        </ul>
      )}

      {meter.drivers.length > 0 && (
        <div className={s.drivers}>
          <h4>Moving the meter</h4>
          <ul>
            {meter.drivers.map((d) => (
              <li key={d.id} className={s[d.tone]}>
                <span className={s.tag}>{TONE_LABEL[d.tone]}</span>
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noopener noreferrer">
                    {d.headline}
                  </a>
                ) : (
                  <span>{d.headline}</span>
                )}
                {d.summary && <em className={s.why}>{d.summary}</em>}
                <small>
                  {d.source} · {timeAgo(d.ageMin)}
                </small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
