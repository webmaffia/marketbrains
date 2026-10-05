"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useStore } from "@/features/store/StoreProvider";
import { IMAGE_ACCEPT, prepareAvatar, validateImage } from "@/lib/image";
import type { User } from "@/types";
import s from "./AvatarEditor.module.scss";

/** The member's own profile photo with a camera button to change it (and a way to remove it). */
export function AvatarEditor({ user, size }: { user: User; size: number }) {
  const router = useRouter();
  const { updateAvatar, showToast } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const change = async (file?: File) => {
    if (!file) return;
    const problem = validateImage(file) ?? (file.type === "image/gif" ? "Use a JPG, PNG or WebP photo" : null);
    if (problem) return showToast(problem);
    setBusy(true);
    try {
      const ok = await updateAvatar(await prepareAvatar(file));
      if (ok) router.refresh();
    } catch {
      showToast("Couldn't read that image");
    }
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    if (await updateAvatar(null)) router.refresh();
    setBusy(false);
  };

  return (
    <div className={s.wrap}>
      <div className={s.photo} style={{ width: size, height: size }}>
        <UserAvatar key={user.avatarUrl ?? "none"} user={user} size={size} />
        {busy && <span className={s.busy} aria-hidden="true" />}
        <button type="button" className={s.cam} onClick={() => fileRef.current?.click()} disabled={busy} aria-label="Change profile photo">
          <Icon name="image" size={16} />
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        onChange={(e) => {
          change(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {user.avatarUrl && (
        <button type="button" className={s.remove} onClick={remove} disabled={busy}>
          Remove photo
        </button>
      )}
    </div>
  );
}
