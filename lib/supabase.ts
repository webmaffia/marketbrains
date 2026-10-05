import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env");
}

const isBrowser = typeof window !== "undefined";

/**
 * One client for server and browser. On the server it is anonymous (public reads only, protected by RLS);
 * in the browser it carries the signed-in user's session. Responses are never cached by Next's fetch layer
 * so server-rendered pages always show current data.
 */
export const supabase = createClient(url, key, {
  auth: { persistSession: isBrowser, autoRefreshToken: isBrowser, detectSessionInUrl: isBrowser },
  global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
});
