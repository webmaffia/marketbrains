import type { ReactNode } from "react";
import { getNotifications } from "@/lib/api";
import { AuthSheet } from "@/features/auth/AuthSheet";
import { Toast } from "@/components/ui/Toast";
import { BottomNav } from "./BottomNav";
import s from "./AppShell.module.scss";

export async function AppShell({ children }: { children: ReactNode }) {
  const notifs = await getNotifications();
  const unreadIds = notifs.filter((n) => !n.read).map((n) => n.id);
  return (
    <div className={s.frame}>
      <div className={s.app}>
        <main className={s.main} id="main">
          {children}
        </main>
        <BottomNav notificationIds={unreadIds} />
      </div>
      <AuthSheet />
      <Toast />
    </div>
  );
}
