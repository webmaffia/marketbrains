import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Called by a Supabase Database Webhook on every INSERT into `notifications`
 * (see README). Looks up the recipient's devices and sends a Web Push to each.
 * Protected by a shared secret; only the webhook knows it.
 */
export async function POST(request: Request) {
  const { PUSH_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, NEXT_PUBLIC_SUPABASE_URL } = process.env;
  if (!PUSH_WEBHOOK_SECRET || !SUPABASE_SERVICE_ROLE_KEY || !VAPID_PRIVATE_KEY || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !NEXT_PUBLIC_SUPABASE_URL) {
    return Response.json({ error: "Push is not configured" }, { status: 503 });
  }
  if (!safeEqual(request.headers.get("x-push-secret") ?? "", PUSH_WEBHOOK_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const record = payload?.type === "INSERT" && payload?.table === "notifications" ? payload.record : null;
  if (!record?.user_id) return Response.json({ sent: 0 });

  const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const [{ data: subs }, { data: actor }] = await Promise.all([
    db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", record.user_id),
    record.actor_id ? db.from("profiles").select("name").eq("id", record.actor_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!subs?.length) return Response.json({ sent: 0 });

  webpush.setVapidDetails(VAPID_SUBJECT ?? "mailto:admin@example.com", NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const message = JSON.stringify({
    title: "MarketBrains",
    body: actor?.name ? `${actor.name} ${record.text}` : record.text,
    url: record.href,
    tag: record.type,
  });

  let sent = 0;
  const expired: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, message, { TTL: 60 * 60 * 24 });
        sent++;
      } catch (err) {
        // 404/410 mean the device unsubscribed or the browser dropped it: forget it.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) expired.push(sub.endpoint);
      }
    }),
  );
  if (expired.length) await db.from("push_subscriptions").delete().in("endpoint", expired);

  return Response.json({ sent, removed: expired.length });
}
