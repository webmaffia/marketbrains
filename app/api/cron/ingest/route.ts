import { createHash, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { analyzeHeadlines } from "@/lib/aiNews";
import { fetchArticle } from "@/lib/articleText";
import { BOT_ID, BOT_PROFILE } from "@/lib/bot";
import { isGenericHeadline } from "@/lib/newsFilter";
import { enrichHeadlines, findDuplicate, type Enriched, type KnownStock } from "@/lib/newsIntel";

export const runtime = "nodejs";
// The first run of a day also reads article pages, so it needs more than the default minute.
export const maxDuration = 300;

const PER_COMMUNITY = 3;
const MAX_ENRICH_ATTEMPTS = 3;
const ENRICH_PER_RUN = 6;
const ENRICH_BATCH = 3;
const POLL_DAYS = 7;
const MAX_NEW_POLLS = 6;

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Structured log line. Never put keys or tokens in here. */
const log = (evt: string, data: Record<string, unknown> = {}) => console.log(JSON.stringify({ evt, ...data }));

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

type Db = SupabaseClient;
interface Community {
  slug: string;
  name: string;
  kind: string;
}

/** Creates the poll under a post unless it already has one. Idempotent. */
async function ensurePoll(db: Db, postId: string, assetName: string) {
  const { data: existing } = await db.from("polls").select("post_id").eq("post_id", postId).maybeSingle();
  if (existing) return false;
  const { error } = await db.from("polls").insert({ post_id: postId, question: `How do you view this development for ${assetName}?`.slice(0, 140), ends_at: new Date(Date.now() + POLL_DAYS * 86_400_000).toISOString() });
  if (error) throw new Error(`poll: ${error.message}`);
  const { error: oErr } = await db.from("poll_options").insert([
    { post_id: postId, id: "o1", label: "Bullish", position: 1 },
    { post_id: postId, id: "o2", label: "Neutral", position: 2 },
    { post_id: postId, id: "o3", label: "Bearish", position: 3 },
  ]);
  if (oErr) throw new Error(`poll options: ${oErr.message}`);
  return true;
}

/**
 * Daily job (Vercel Cron, see vercel.json). Per stock and index community:
 *   fetch headlines -> drop repeat coverage of one event -> rate each event -> summarise and map what it touches
 *   -> open a Bullish / Neutral / Bearish vote for each event. No discussion posts and no comments are written.
 * Every stage after saving the news is optional: if the AI step fails, the news is still there and is retried next run.
 */
export async function GET(request: Request) {
  const { CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL } = process.env;
  if (!CRON_SECRET || !SUPABASE_SERVICE_ROLE_KEY || !NEXT_PUBLIC_SUPABASE_URL) return Response.json({ error: "Not configured" }, { status: 503 });
  if (!safeEqual(request.headers.get("authorization") ?? "", `Bearer ${CRON_SECRET}`)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const ai = !!process.env.OPENAI_API_KEY;

  const { data: communities, error } = await db.from("communities").select("slug,name,kind,asset_id").in("kind", ["asset", "market"]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Stocks the AI may link an event to: every stock community, so admin-added ones count too.
  const { data: assets } = await db.from("communities").select("slug,name,asset_id").eq("kind", "asset");
  const { data: assetRows } = await db.from("assets").select("id,ticker");
  const tickerOf = new Map((assetRows ?? []).map((a) => [a.id as string, a.ticker as string]));
  const known: KnownStock[] = (assets ?? []).filter((a) => a.asset_id && tickerOf.has(a.asset_id)).map((a) => ({ ticker: tickerOf.get(a.asset_id)!, name: a.name, slug: a.slug }));

  // The new columns come from supabase/news_intelligence.sql. Say so plainly if it has not been run.
  const probe = await db.from("news").select("hidden,summary_basis,key_points").limit(1);
  if (probe.error) return Response.json({ error: `Run supabase/news_intelligence.sql first: ${probe.error.message}` }, { status: 409 });

  const stats = { added: 0, duplicates: 0, found: 0, analyzed: 0, enriched: 0, filtered: 0, hidden: 0, withArticle: 0, pollsCreated: 0 };
  const failed: string[] = [];
  const analysisFailed: string[] = [];
  const enrichFailed: string[] = [];
  const pollFailed: string[] = [];

  if (ai) await db.from("profiles").upsert(BOT_PROFILE, { onConflict: "id", ignoreDuplicates: true });

  const run = async (c: Community & { asset_id?: string | null }) => {
    const ctx = { name: c.name, ticker: c.asset_id ? tickerOf.get(c.asset_id) : undefined, kind: c.kind };

    // ---- 0. hide generic stories already stored (predictions, "stocks to buy", market wraps, spam sources) ------------
    try {
      const { data: stored } = await db.from("news").select("id,headline,source").eq("community_slug", c.slug).eq("hidden", false).gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString());
      const drop = (stored ?? []).filter((r) => isGenericHeadline(r.headline, r.source, ctx)).map((r) => r.id as string);
      if (drop.length) {
        await db.from("news").update({ hidden: true }).in("id", drop);
        stats.hidden += drop.length;
        log("news.hidden", { community: c.slug, count: drop.length, reason: "headline" });
      }
    } catch (e) {
      failed.push(`${c.slug} sweep (${e instanceof Error ? e.message : "error"})`);
    }

    // ---- 1. fetch, drop duplicate coverage, store ------------------------------------------------------------------
    const query = c.kind === "asset" ? `${c.name.replace(/\s*\(.*?\)/g, "")} stock` : c.name;
    try {
      const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
      const { data: recentRows } = await db.from("news").select("id,headline,cluster_id").eq("community_slug", c.slug).gte("created_at", since);
      const recent = (recentRows ?? []).map((r) => ({ id: r.id as string, headline: r.headline as string, clusterId: (r.cluster_id as string | null) ?? (r.id as string) }));

      for (const h of await headlines(query)) {
        stats.found += 1;
        if (isGenericHeadline(h.title, h.source, ctx)) {
          stats.filtered += 1;
          continue;
        }
        const id = "gn-" + createHash("sha1").update(h.url).digest("hex").slice(0, 16);
        if (recent.some((r) => r.id === id)) continue; // same link already stored

        const dup = findDuplicate(h.title, c.name, recent);
        const clusterId = dup ? dup.clusterId : id;
        const now = new Date().toISOString();
        // Repeat coverage keeps its source and link, but skips the AI steps: they run once per event.
        const row = { id, community_slug: c.slug, source: h.source, headline: h.title, url: h.url, cluster_id: clusterId, ...(dup ? { analyzed_at: now, enriched_at: now, summary_basis: "headline" } : {}) };
        const { data: fresh, error: newsErr } = await db.from("news").upsert(row, { onConflict: "id", ignoreDuplicates: true }).select("id");
        if (newsErr) throw new Error(`news: ${newsErr.message}`);
        if (!fresh?.length) continue;
        recent.push({ id, headline: h.title, clusterId });
        if (dup) {
          stats.duplicates += 1;
          log("news.duplicate", { community: c.slug, id, cluster: clusterId });
        } else {
          stats.added += 1;
          log("news.stored", { community: c.slug, id });
        }
      }
    } catch (e) {
      failed.push(`${c.slug} (${e instanceof Error ? e.message : "error"})`);
    }

    if (!ai) return;

    // ---- 2. rate each new event (feeds the sentiment meter) ---------------------------------------------------------
    try {
      const { data: pending, error: pendErr } = await db.from("news").select("id,headline,source,cluster_id").eq("community_slug", c.slug).eq("hidden", false).is("analyzed_at", null).order("created_at", { ascending: false }).limit(10);
      if (pendErr) throw new Error(pendErr.message);
      const heads = (pending ?? []).filter((p) => !p.cluster_id || p.cluster_id === p.id);
      for (const r of await analyzeHeadlines(c.name, heads.map((p) => ({ id: p.id, headline: p.headline, source: p.source })))) {
        const { error: upErr } = await db.from("news").update({ sentiment_score: r.score, sentiment: r.tone, topic: r.topic, summary: r.summary, analyzed_at: new Date().toISOString() }).eq("id", r.id);
        if (upErr) throw new Error(upErr.message);
        stats.analyzed += 1;
      }
    } catch (e) {
      analysisFailed.push(`${c.slug} (${e instanceof Error ? e.message : "error"})`);
    }

    // ---- 3. read the article, then summarise it, map affected stocks and sectors and score the event ------------------
    try {
      const { data: todo, error: todoErr } = await db
        .from("news")
        .select("id,headline,source,url,cluster_id,enrich_attempts")
        .eq("community_slug", c.slug)
        .eq("hidden", false)
        .or("enriched_at.is.null,summary_basis.is.null")
        .lt("enrich_attempts", MAX_ENRICH_ATTEMPTS)
        .order("created_at", { ascending: false })
        .limit(24);
      if (todoErr) throw new Error(todoErr.message);
      const heads = (todo ?? []).filter((p) => !p.cluster_id || p.cluster_id === p.id).slice(0, ENRICH_PER_RUN);

      // Article text makes the summary useful on its own. If a page cannot be read, the headline alone is used and the story says so.
      const articles = await Promise.all(heads.map((p) => (p.url ? fetchArticle(p.url) : Promise.resolve(null))));
      const basis = new Map<string, "article" | "snippet" | "headline">();
      heads.forEach((p, i) => basis.set(p.id, articles[i]?.kind ?? "headline"));
      stats.withArticle += articles.filter(Boolean).length;

      for (let i = 0; i < heads.length; i += ENRICH_BATCH) {
        const batch = heads.slice(i, i + ENRICH_BATCH);
        let done: Enriched[] = [];
        try {
          done = await enrichHeadlines(c.name, batch.map((p, j) => ({ id: p.id, headline: p.headline, source: p.source, article: articles[i + j]?.text })), known);
        } catch (e) {
          enrichFailed.push(`${c.slug} (${e instanceof Error ? e.message : "error"})`);
        }
        const ok = new Set(done.map((d) => d.id));
        for (const e of done) {
          const now = new Date().toISOString();
          // The AI judged it generic or off topic: hide it so it is not shown and not fetched again.
          const patch = e.generic
            ? { hidden: true, enriched_at: now, summary_basis: basis.get(e.id) }
            : {
                full_summary: e.summary,
                key_points: e.keyPoints,
                summary_basis: basis.get(e.id),
                why_it_matters: e.whyItMatters,
                event_type: e.eventType,
                impact_direction: e.direction,
                impact_strength: e.strength,
                signal_score: e.signalScore,
                signal_confidence: e.signalConfidence,
                affected_stocks: e.stocks,
                affected_sectors: e.sectors,
                enriched_at: now,
              };
          const { error: upErr } = await db.from("news").update(patch).eq("id", e.id);
          if (upErr) throw new Error(upErr.message);
          if (e.generic) {
            stats.hidden += 1;
            log("news.hidden", { community: c.slug, id: e.id, reason: "ai" });
          } else {
            stats.enriched += 1;
            log("news.enriched", { community: c.slug, id: e.id, basis: basis.get(e.id), signal: e.signalScore, stocks: e.stocks.length });
          }
        }
        // Not enriched this time (model error or output that failed validation): count the attempt, keep the news.
        for (const p of batch.filter((p) => !ok.has(p.id))) {
          await db.from("news").update({ enrich_attempts: (p.enrich_attempts ?? 0) + 1 }).eq("id", p.id);
          log("news.enrich_failed", { community: c.slug, id: p.id, attempt: (p.enrich_attempts ?? 0) + 1 });
        }
      }
    } catch (e) {
      enrichFailed.push(`${c.slug} (${e instanceof Error ? e.message : "error"})`);
    }

    // ---- 4. poll: one Bullish / Neutral / Bearish vote per event. No discussion text and no comments. -------------------
    try {
      const { data: rows, error: rowErr } = await db.from("news").select("id,headline,cluster_id").eq("community_slug", c.slug).eq("hidden", false).gte("created_at", new Date(Date.now() - 4 * 86_400_000).toISOString());
      if (rowErr) throw new Error(rowErr.message);
      const items = (rows ?? []).filter((r) => !r.cluster_id || r.cluster_id === r.id);
      if (!items.length) return;

      const { data: posts } = await db.from("posts").select("id,news_id").eq("author_id", BOT_ID).in("news_id", items.map((r) => r.id));
      const have = new Set((posts ?? []).map((p) => p.news_id as string));
      // Earlier AI posts get their poll too, if they were created without one. Idempotent.
      for (const p of posts ?? []) if (await ensurePoll(db, p.id as string, c.name)) stats.pollsCreated += 1;

      for (const n of items.filter((r) => !have.has(r.id)).slice(0, MAX_NEW_POLLS)) {
        try {
          const { data: post, error: postErr } = await db.from("posts").insert({ author_id: BOT_ID, community_slug: c.slug, type: "poll", title: String(n.headline).slice(0, 140), body: "", news_id: n.id }).select("id").single();
          if (postErr) throw new Error(postErr.message);
          if (await ensurePoll(db, post.id, c.name)) stats.pollsCreated += 1;
          log("poll.created", { community: c.slug, news: n.id, post: post.id });
        } catch (e) {
          pollFailed.push(`${c.slug}/${n.id} (${e instanceof Error ? e.message : "error"})`);
        }
      }
    } catch (e) {
      pollFailed.push(`${c.slug} (${e instanceof Error ? e.message : "error"})`);
    }
  };

  // 50+ communities: work through them a few at a time so the job finishes inside the time limit.
  const queue = [...(communities ?? [])];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let c = queue.shift(); c; c = queue.shift()) await run(c);
    }),
  );

  log("cron.done", { ...stats, communities: communities?.length ?? 0 });
  return Response.json({ ...stats, communities: communities?.length ?? 0, aiEnabled: ai, failed, analysisFailed, enrichFailed, pollFailed });
}
