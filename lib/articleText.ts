/**
 * Fetches the text of a news article so the AI can summarise what it actually says, not just its headline.
 * Only used to write an original summary: the article text is never stored or shown, and every story links to the source.
 * Everything here is best effort. Any failure returns null and the caller falls back to the headline.
 */

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MAX_CHARS = 4000;

const entities = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const strip = (html: string) => entities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** Google News links are wrapped. This asks Google where the wrapped link points. Returns null if Google changes how this works. */
export async function resolveGoogleNewsUrl(url: string): Promise<string | null> {
  try {
    const id = new URL(url).pathname.split("/").pop();
    if (!id) return null;
    const page = await fetch(`https://news.google.com/rss/articles/${id}?hl=en-IN&gl=IN&ceid=IN:en`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
    const html = await page.text();
    const sig = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
    if (!sig || !ts) return null;

    const inner = `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${ts},"${sig}"]`;
    const body = `f.req=${encodeURIComponent(JSON.stringify([[["Fbv4je", inner, null, "generic"]]]))}`;
    const res = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": UA },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    const payload = JSON.parse(text.split("\n\n")[1])[0][2] as string;
    const real = JSON.parse(payload)[1] as string;
    return /^https?:\/\//.test(real) ? real : null;
  } catch {
    return null;
  }
}

/** The article's own text: structured data first, then the meta description, then the paragraphs. Capped in length. */
export function extractArticleText(html: string): string | null {
  const parts: string[] = [];

  // 1. JSON-LD articleBody, the cleanest source when a site provides it.
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (v: unknown): void => {
        if (Array.isArray(v)) return v.forEach(walk);
        if (v && typeof v === "object") {
          const o = v as Record<string, unknown>;
          if (typeof o.articleBody === "string" && o.articleBody.length > 200) parts.push(strip(o.articleBody));
          Object.values(o).forEach(walk);
        }
      };
      walk(JSON.parse(m[1]));
    } catch {}
  }

  // 2. The paragraphs of the page body.
  if (!parts.length) {
    const cleaned = html.replace(/<(script|style|nav|header|footer|aside|form|noscript)[\s\S]*?<\/\1>/gi, " ");
    const paras = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((p) => strip(p[1])).filter((p) => p.length > 70 && !/^(also read|read more|follow us|subscribe|sign in|advertisement)/i.test(p));
    if (paras.join(" ").length > 300) parts.push(paras.join(" "));
  }

  // 3. The page's own one or two sentence description.
  if (!parts.length) {
    const meta = html.match(/<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:description|description)["']/i)?.[1];
    if (meta && meta.length > 60) parts.push(strip(meta));
  }

  const text = parts.join(" ").trim();
  return text.length >= 60 ? text.slice(0, MAX_CHARS) : null;
}

export interface Article {
  text: string;
  /** "article" when real paragraphs were found, "snippet" when only the page description was. */
  kind: "article" | "snippet";
}

export async function fetchArticle(googleUrl: string): Promise<Article | null> {
  const real = await resolveGoogleNewsUrl(googleUrl);
  if (!real) return null;
  try {
    const res = await fetch(real, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(9000) });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 1_500_000);
    const text = extractArticleText(html);
    if (!text) return null;
    return { text, kind: text.length > 600 ? "article" : "snippet" };
  } catch {
    return null;
  }
}
