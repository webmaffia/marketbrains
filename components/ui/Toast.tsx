"use client";

import { useStore } from "@/features/store/StoreProvider";
import s from "./Toast.module.scss";

export function Toast() {
  const { toast } = useStore();
  return (
    <div className={s.region} role="status" aria-live="polite">
      {toast && (
        <div key={toast} className={s.toast}>
          {toast}
        </div>
      )}
    </div>
  );
}
