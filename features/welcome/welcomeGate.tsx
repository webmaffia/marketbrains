"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const WELCOME_KEY = "mb-welcomed";

/** Rendered on Home: first-time visitors are sent to /welcome once per session. */
export function WelcomeGate() {
  const router = useRouter();
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(WELCOME_KEY)) router.replace("/welcome");
    } catch {}
  }, [router]);
  return null;
}
