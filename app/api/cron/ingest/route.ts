import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { analyzeHeadlines } from "@/lib/aiNews";

export const runtime = "nodejs";
export const maxDuration = 60;

const PER_COMMUNITY = 3;

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
const tag = (xml: string, t: string) => decode(xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1] ?? "");

interface Headline {
  title: string;
  source: string;
  url: string;
}

/** Real headlines from the last day via Google News RSS (no key). Titles arrive as "Headline - Source". */
async function headlines(query: string): Promise<Headline[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:1d`)}&hl=en-IN&gl=IN&ceid=IN:en`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 MarketBrains" }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`rss ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((m) => {
      const raw = tag(m[1], "title");
      const cut = raw.lastIndexOf(" - ");
      return { title: cut > 0 ? raw.slice(0, cut) : raw, source: tag(m[1], "source") || (cut > 0 ? raw.slice(cut + 3) : "News"), url: tag(m[1], "link") };
    })
    .filter((h) => h.title.length >= 8 && h.url)
    .slice(0, PER_COMMUNITY);
}

/** Daily job (Vercel Cron, see vercel.json): pulls real headlines for every stock and index community into the News tab, then has gpt-4o-mini rate each one. It creates no discussions. */
export async function GET(request: Request) {
  const { CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL } = process.env;
  if (!CRON_SECRET || !SUPABASE_SERVICE_ROLE_KEY || !NEXT_PUBLIC_SUPABASE_URL) return Response.json({ error: "Not configured" }, { status: 503 });
  if (!safeEqual(request.headers.get("authorization") ?? "", `Bearer ${CRON_SECRET}`)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: communities, error } = await db.from("communities").select("slug,name,kind").in("kind", ["asset", "market"]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let added = 0;
  let found = 0;
  let analyzed = 0;
  const failed: string[] = [];
  const analysisFailed: string[] = [];

  const run = async (c: { slug: string; name: string; kind: string }) => {
    // "Eternal (Zomato)" searches as "Eternal stock"; the extra word keeps short names from matching unrelated news.
    const query = c.kind === "asset" ? `${c.name.replace(/\s*\(.*?\)/g, "")} stock` : c.name;
    try {
      for (const h of await headlines(query)) {
        found += 1;
        const id = "gn-" + createHash("sha1").update(h.url).digest("hex").slice(0, 16);
        const { data: fresh, error: newsErr } = await db.from("news").upsert({ id, community_slug: c.slug, source: h.source, headline: h.title, url: h.url }, { onConflict: "id", ignoreDuplicates: true }).select("id");
        if (newsErr) throw new Error(`news: ${newsErr.message}`);
        if (fresh?.length) added += 1;
      }
    } catch (e) {
      failed.push(`${c.slug} (${e instanceof Error ? e.message : "error"})`);
    }

    // AI read of any headline that has not been analysed yet (also backfills older ones).
    if (!process.env.OPENAI_API_KEY) return;
    try {
      const { data: pending, error: pendErr } = await db.from("news").select("id,headline,source").eq("community_slug", c.slug).is("analyzed_at", null).order("created_at", { ascending: false }).limit(10);
      if (pendErr) throw new Error(pendErr.message);
      if (!pending?.length) return;
      for (const r of await analyzeHeadlines(c.name, pending.map((p) => ({ id: p.id, headline: p.headline, source: p.source })))) {
        const { error: upErr } = await db.from("news").update({ sentiment_score: r.score, sentiment: r.tone, topic: r.topic, summary: r.summary, analyzed_at: new Date().toISOString() }).eq("id", r.id);
        if (upErr) throw new Error(upErr.message);
        analyzed += 1;
      }
    } catch (e) {
      analysisFailed.push(`${c.slug} (${e instanceof Error ? e.message : "error"})`);
    }
  };

  // 50+ communities: work through them a few at a time so the job finishes inside the time limit.
  const queue = [...(communities ?? [])];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let c = queue.shift(); c; c = queue.shift()) await run(c);
    }),
  );
  return Response.json({ added, found, analyzed, communities: communities?.length ?? 0, aiEnabled: !!process.env.OPENAI_API_KEY, failed, analysisFailed });
}
