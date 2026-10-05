import "server-only";
import type { Asset } from "@/types";

export interface Quote {
  price: number;
  /** Percent change versus the previous daily close. */
  changePct: number;
  currency: string;
}

/**
 * Free daily prices from Yahoo Finance's public chart endpoint (no API key). It is an unofficial,
 * best-effort source with no SLA: fine for delayed reference prices, replace with a licensed
 * provider before relying on it. Every price shown in the UI is labelled as delayed.
 */
function symbolFor(a: Asset): string {
  switch (a.exchange) {
    case "NSE":
      return `${a.ticker}.NS`;
    case "BSE":
      return `${a.ticker}.BO`;
    case "CRYPTO":
      return `${a.ticker}-USD`;
    default:
      return a.ticker;
  }
}

const TTL_OK = 30 * 60_000;
const TTL_FAIL = 5 * 60_000;
// Per server instance. Pages render per request, so this keeps us from hitting the source on every view.
const cache = new Map<string, { at: number; ttl: number; quote: Quote | null }>();

async function fetchQuote(symbol: string): Promise<Quote | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketBrains)" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const closes: number[] = (result?.indicators?.quote?.[0]?.close ?? []).filter((c: unknown): c is number => typeof c === "number");
    if (closes.length < 2) return null;
    const [prev, last] = closes.slice(-2);
    return { price: last, changePct: ((last - prev) / prev) * 100, currency: result.meta?.currency ?? "USD" };
  } catch {
    return null;
  }
}

export async function getQuote(asset?: Asset): Promise<Quote | null> {
  if (!asset) return null;
  const symbol = symbolFor(asset);
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.quote;
  const quote = await fetchQuote(symbol);
  cache.set(symbol, { at: Date.now(), ttl: quote ? TTL_OK : TTL_FAIL, quote });
  return quote;
}
