"use client";

import { useState, type FormEvent } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/features/store/StoreProvider";
import s from "./AuthSheet.module.scss";

/** Login / signup bottom sheet. Mock auth: any valid-looking input signs in as the demo user. */
export function AuthSheet() {
  const { auth, closeAuth, setAuthMode, login } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isSignup = auth.mode === "signup";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login();
    setPassword("");
  };

  return (
    <BottomSheet open={auth.open} onClose={closeAuth} title={isSignup ? "Join MarketBrains" : "Welcome back"}>
      <p className={s.reason}>{auth.reason ?? "Join the conversation with investors around the world."}</p>

      <form className={s.form} onSubmit={submit}>
        {isSignup && (
          <label className={s.field}>
            <span>Name</span>
            <input type="text" autoComplete="name" placeholder="Your name" required />
          </label>
        )}
        <label className={s.field}>
          <span>Email</span>
          <input type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className={s.field}>
          <span>Password</span>
          <input
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="At least 8 characters"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <Button type="submit" block>
          {isSignup ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className={s.switch}>
        {isSignup ? "Already a member?" : "New to MarketBrains?"}{" "}
        <button type="button" onClick={() => setAuthMode(isSignup ? "login" : "signup")}>
          {isSignup ? "Sign in" : "Create account"}
        </button>
      </p>
      <button type="button" className={s.browse} onClick={closeAuth}>
        Keep browsing
      </button>
      <p className={s.note}>Demo build: any details sign you in as Javed.</p>
    </BottomSheet>
  );
}
