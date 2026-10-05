"use client";

import { useState, type FormEvent } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/features/store/StoreProvider";
import { checkContent } from "@/lib/contentFilter";
import s from "./EditProfileSheet.module.scss";

export const SOCIAL_UNLOCK_POSTS = 5;
const BIO_MAX = 280;

const SOCIALS: { key: string; label: string; placeholder: string }[] = [
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/username" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/username" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@channel" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/username" },
  { key: "telegram", label: "Telegram", placeholder: "https://t.me/username" },
  { key: "website", label: "Website", placeholder: "https://yoursite.com" },
];

export function EditProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Edit profile">
      <EditForm onDone={onClose} />
    </BottomSheet>
  );
}

function Visibility({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className={s.vis} role="radiogroup" aria-label={label}>
      <button type="button" role="radio" aria-checked={!value} className={!value ? s.on : undefined} onClick={() => onChange(false)}>
        Private
      </button>
      <button type="button" role="radio" aria-checked={value} className={value ? s.on : undefined} onClick={() => onChange(true)}>
        Public
      </button>
    </div>
  );
}

function EditForm({ onDone }: { onDone: () => void }) {
  const { profile, contact, saveProfile } = useStore();
  const [name, setName] = useState(profile?.name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [emailPublic, setEmailPublic] = useState(contact?.emailPublic ?? false);
  const [phonePublic, setPhonePublic] = useState(contact?.phonePublic ?? false);
  const [social, setSocial] = useState<Record<string, string>>(profile?.socialLinks ?? {});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const posts = profile?.contributions.discussions ?? 0;
  const unlocked = posts >= SOCIAL_UNLOCK_POSTS || Object.keys(profile?.socialLinks ?? {}).length > 0;
  const problem = checkContent(name, bio)?.message;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await saveProfile({ name, bio, email, phone, emailPublic, phonePublic, social: unlocked ? social : {} });
    setBusy(false);
    if (err) setError(err);
    else onDone();
  };

  return (
    <form className={s.form} onSubmit={submit}>
      <label className={s.field}>
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={60} required autoComplete="name" />
      </label>

      <label className={s.field}>
        <span>
          Bio <em className={bio.length > BIO_MAX - 20 ? s.warn : undefined}>{bio.length}/{BIO_MAX}</em>
        </span>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={BIO_MAX} rows={3} placeholder="What do you invest in? What do you like to discuss?" />
      </label>
      {problem && <p className={s.error}>{problem}</p>}

      <h3 className={s.h}>Contact</h3>
      <p className={s.hint}>Private by default. Switch a field to Public only if you want everyone on MarketBrains to see it.</p>
      <div className={s.field}>
        <span>Email</span>
        <div className={s.withVis}>
          <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" aria-label="Contact email" />
          <Visibility value={emailPublic} onChange={setEmailPublic} label="Email visibility" />
        </div>
      </div>
      <div className={s.field}>
        <span>Mobile number</span>
        <div className={s.withVis}>
          <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" aria-label="Mobile number" />
          <Visibility value={phonePublic} onChange={setPhonePublic} label="Mobile visibility" />
        </div>
      </div>

      <h3 className={s.h}>Social links</h3>
      {unlocked ? (
        <>
          <p className={s.hint}>Shown on your public profile.</p>
          {SOCIALS.map((x) => (
            <label key={x.key} className={s.field}>
              <span>{x.label}</span>
              <input type="url" inputMode="url" value={social[x.key] ?? ""} onChange={(e) => setSocial((cur) => ({ ...cur, [x.key]: e.target.value }))} placeholder={x.placeholder} />
            </label>
          ))}
        </>
      ) : (
        <div className={s.locked}>
          <p>
            <strong>Unlock social links</strong>
            Publish {SOCIAL_UNLOCK_POSTS} discussions to add your social profiles. It keeps links for people who contribute.
          </p>
          <div className={s.bar} role="progressbar" aria-valuemin={0} aria-valuemax={SOCIAL_UNLOCK_POSTS} aria-valuenow={posts}>
            <span style={{ width: `${Math.min(100, (posts / SOCIAL_UNLOCK_POSTS) * 100)}%` }} />
          </div>
          <small>
            {posts} of {SOCIAL_UNLOCK_POSTS} discussions
          </small>
        </div>
      )}

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" block disabled={busy || !!problem}>
        {busy ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
