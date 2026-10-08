/**
 * Keeps generic news out before it is stored: price predictions, "stocks to buy" lists, live blogs, market wraps that
 * are not about the company, and spammy aggregators. The AI step catches what these rules miss.
 */

/** Never useful, in any community. */
const JUNK = new RegExp(
  [
    "stock market (prediction|today|outlook|update)",
    "share market (live|today|prediction)",
    "(nifty|sensex)[^.]{0,30}(prediction|tomorrow|outlook for)",
    "live updates?",
    "live blog",
    "top (gainers|losers)",
    "stocks? to (buy|watch|sell|avoid)",
    "stocks? (in|on) (focus|news|radar)",
    "buy or sell",
    "should you (buy|sell|hold)",
    "(buy|sell|hold)\\?",
    "trading (ideas?|setup|strategy|guide|tips)",
    "technical (view|outlook|analysis|picks?)",
    "(support|resistance) levels?",
    "price prediction",
    "price forecast",
    "forecast for \\d{4}",
    "horoscope",
    "\\d+ (stocks|shares) (to|that|under)",
    "intraday (picks?|trading)",
    "opening bell|closing bell|pre-?market (levels|buzz)",
  ].join("|"),
  "i",
);

/** Market wraps. Fine for the index community, generic for a single company. */
const WRAP = /\b(sensex|nifty)\b[^.]{0,40}\b(ends?|closes?|settles?|opens?|slips?|gains?|falls?|rises?|jumps?|tanks?|today|lower|higher|flat)\b|\b(indian|india) (shares|stocks|markets?|equities)\b[^.]{0,30}\b(close|open|end|lower|higher)\b|market (wrap|breadth)/i;

/** Aggregators that auto-write thin stories. */
const BLOCKED_SOURCES = /^(ad hoc news|stocktwits|marketscreener|investing\.com|simply wall st)$/i;

const NAME_NOISE = new Set(["limited", "ltd", "india", "indian", "industries", "corporation", "company", "services", "enterprises", "the", "and", "of", "bank", "finance", "financial"]);

/** Words that stand for the company in a headline: its ticker, the distinctive words in its name, and any brand in brackets. */
export function aliases(name: string, ticker?: string): string[] {
  const out = new Set<string>();
  if (ticker) {
    out.add(ticker.toLowerCase());
    if (ticker === "LT") out.add("l&t");
    if (ticker === "M&M") out.add("m&m");
  }
  const bracket = name.match(/\(([^)]+)\)/)?.[1];
  for (const w of `${name.replace(/\(.*?\)/g, " ")} ${bracket ?? ""}`.toLowerCase().split(/[^a-z0-9&]+/)) if (w.length >= 3 && !NAME_NOISE.has(w)) out.add(w);
  // "HDFC Bank" and "ICICI Bank" lose "bank" above, so keep the first word as a fallback.
  const first = name.toLowerCase().split(/[^a-z0-9&]+/)[0];
  if (first && first.length >= 3) out.add(first);
  return [...out];
}

export interface FilterContext {
  name: string;
  ticker?: string;
  /** "asset" for a company, "market" for an index. */
  kind: string;
}

/** True when the story should not be kept. */
export function isGenericHeadline(headline: string, source: string, ctx: FilterContext): boolean {
  if (BLOCKED_SOURCES.test(source.trim())) return true;
  if (JUNK.test(headline)) return true;
  if (ctx.kind === "asset") {
    if (WRAP.test(headline)) return true;
    // A company community needs the company in the headline. Anything else is general market news.
    const h = headline.toLowerCase();
    return !aliases(ctx.name, ctx.ticker).some((a) => h.includes(a));
  }
  return false;
}
