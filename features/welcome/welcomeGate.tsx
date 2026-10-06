"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/features/store/StoreProvider";

export const WELCOME_KEY = "mb-welcomed";

/** Rendered on Home: signed-out first-time visitors are sent to /welcome once per session. */
export function WelcomeGate() {
  const router = useRouter();
  const { hydrated, isLoggedIn } = useStore();
  useEffect(() => {
    if (!hydrated || isLoggedIn) return;
    try {
      if (!sessionStorage.getItem(WELCOME_KEY)) router.replace("/welcome");
    } catch {}
  }, [router, hydrated, isLoggedIn]);
  return null;
}
