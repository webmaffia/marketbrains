import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export type PushResult = "ok" | "denied" | "unsupported" | "no-service-worker" | "not-configured" | "error";

export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function keyToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url.padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), "=").replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** The service worker is only registered in production builds, so push only works there (and in the installed app). */
async function registration() {
  return navigator.serviceWorker.getRegistration("/");
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await registration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Asks for permission, subscribes this device and saves it against the signed-in member. */
export async function enablePush(): Promise<PushResult> {
  if (!pushSupported()) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "not-configured";
  const reg = await registration();
  if (!reg) return "no-service-worker";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  try {
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) }));
    const json = sub.toJSON();
    const { error } = await supabase.rpc("save_push_subscription", { p_endpoint: sub.endpoint, p_p256dh: json.keys?.p256dh, p_auth: json.keys?.auth });
    if (error) {
      await sub.unsubscribe();
      return "error";
    }
    return "ok";
  } catch {
    return "error";
  }
}

/** Stops pushes to this device and forgets it on the server. Safe to call when nothing is subscribed. */
export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
