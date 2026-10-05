"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useStore } from "@/features/store/StoreProvider";
import { currentSubscription, disablePush, enablePush, pushSupported, type PushResult } from "@/lib/push";
import s from "./PushToggle.module.scss";

const messages: Partial<Record<PushResult, string>> = {
  denied: "Notifications are blocked. Allow them in your browser settings.",
  "no-service-worker": "Push works in the installed or production app, not the dev server.",
  "not-configured": "Push isn't configured yet.",
  unsupported: "This browser doesn't support push notifications.",
  error: "Couldn't turn on push notifications. Try again.",
};

/** Row that turns push notifications on or off for this device. Renders nothing where push can't work. */
export function PushToggle() {
  const { isLoggedIn, showToast } = useStore();
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!pushSupported()) return;
    setSupported(true);
    currentSubscription().then((sub) => setOn(!!sub && Notification.permission === "granted"));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isLoggedIn]);

  if (!supported || !isLoggedIn) return null;

  const toggle = async () => {
    setBusy(true);
    if (on) {
      await disablePush();
      setOn(false);
      showToast("Push notifications off");
    } else {
      const result = await enablePush();
      if (result === "ok") {
        setOn(true);
        showToast("Push notifications on");
      } else showToast(messages[result] ?? messages.error!);
    }
    setBusy(false);
  };

  return (
    <button type="button" className={s.row} onClick={toggle} disabled={busy} role="switch" aria-checked={on}>
      <Icon name="bell" size={20} />
      <span>Push notifications</span>
      <span className={on ? `${s.pill} ${s.on}` : s.pill}>{on ? "On" : "Off"}</span>
    </button>
  );
}
