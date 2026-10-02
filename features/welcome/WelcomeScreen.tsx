"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useStore } from "@/features/store/StoreProvider";
import { WELCOME_KEY } from "./welcomeGate";
import s from "./WelcomeScreen.module.scss";

const points: { icon: IconName; title: string; text: string }[] = [
  { icon: "bull", title: "Follow the markets", text: "Stocks, crypto and more, in one feed" },
  { icon: "comment", title: "Debate with investors", text: "Share ideas and challenge perspectives" },
  { icon: "poll", title: "Track live sentiment", text: "Vote in polls and see where the crowd leans" },
];

/** First-run landing: big logo, what the app is, sign in / sign up, or skip straight to Home. */
export function WelcomeScreen() {
  const router = useRouter();
  const { isLoggedIn, hydrated, openAuth } = useStore();

  const enter = () => {
    try {
      sessionStorage.setItem(WELCOME_KEY, "1");
    } catch {}
    router.replace("/");
  };

  // Signing in from the auth sheet completes the welcome. Already-signed-in users stay and tap Continue.
  const wasLoggedIn = useRef<boolean | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (wasLoggedIn.current === false && isLoggedIn) enter();
    wasLoggedIn.current = isLoggedIn;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, hydrated]);

  return (
    <div className={s.screen}>
      <span className={`${s.glow} ${s.g1}`} aria-hidden="true" />
      <span className={`${s.glow} ${s.g2}`} aria-hidden="true" />

      <div className={s.content}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset */}
        <img src="/logo.png" alt="MarketBrains" className={s.logo} />

        <h1 className={s.title}>
          Where investors <span>think together</span>
        </h1>
        <p className={s.text}>
          A global investor community. Follow assets, discuss ideas, debate perspectives and learn from people you trust.
        </p>

        <ul className={s.points}>
          {points.map((p) => (
            <li key={p.title}>
              <span className={s.ico}>
                <Icon name={p.icon} size={20} />
              </span>
              <span>
                <strong>{p.title}</strong>
                <small>{p.text}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className={s.actions}>
        {isLoggedIn ? (
          <button type="button" className={s.primary} onClick={enter}>
            Continue to MarketBrains
          </button>
        ) : (
          <>
            <button type="button" className={s.primary} onClick={() => openAuth("Create your account to join the conversation.", "signup")}>
              Create account
            </button>
            <button type="button" className={s.secondary} onClick={() => openAuth(undefined, "login")}>
              Sign in
            </button>
            <button type="button" className={s.skip} onClick={enter}>
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
