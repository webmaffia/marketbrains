"use client";

import { useState, type FormEvent } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/features/store/StoreProvider";
import s from "./AuthSheet.module.scss";

/** Login / signup bottom sheet, backed by Supabase email + password auth. */
export function AuthSheet() {
  const { auth, closeAuth, setAuthMode, signIn, signUp } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const isSignup = auth.mode === "signup";

  const switchMode = () => {
    setError(null);
    setConfirmEmail(false);
    setAuthMode(isSignup ? "login" : "signup");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (isSignup) {
      const res = await signUp(name.trim(), email.trim(), password);
      if (res.error) setError(res.error);
      else if (res.needsConfirmation) setConfirmEmail(true);
    } else {
      const err = await signIn(email.trim(), password);
      if (err) setError(err);
    }
    setBusy(false);
    setPassword("");
  };

  return (
    <BottomSheet open={auth.open} onClose={closeAuth} title={isSignup ? "Join MarketBrains" : "Welcome back"}>
      {confirmEmail ? (
        <>
          <p className={s.notice}>
            We sent a confirmation link to <strong>{email}</strong>. Open it, then come back and sign in.
          </p>
          <button type="button" className={s.browse} onClick={() => { setConfirmEmail(false); setAuthMode("login"); }}>
            Back to sign in
          </button>
        </>
      ) : (
        <>
          <p className={s.reason}>{auth.reason ?? "Join the conversation with investors around the world."}</p>

          <form className={s.form} onSubmit={submit}>
            {isSignup && (
              <label className={s.field}>
                <span>Name</span>
                <input type="text" autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
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
            {error && (
              <p className={s.error} role="alert">
                {error}
              </p>
            )}
            <Button type="submit" block disabled={busy}>
              {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className={s.switch}>
            {isSignup ? "Already a member?" : "New to MarketBrains?"}{" "}
            <button type="button" onClick={switchMode}>
              {isSignup ? "Sign in" : "Create account"}
            </button>
          </p>
          <button type="button" className={s.browse} onClick={closeAuth}>
            Keep browsing
          </button>
        </>
      )}
    </BottomSheet>
  );
}
