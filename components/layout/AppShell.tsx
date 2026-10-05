import type { ReactNode } from "react";
import { AuthSheet } from "@/features/auth/AuthSheet";
import { Toast } from "@/components/ui/Toast";
import { BottomNav } from "./BottomNav";
import s from "./AppShell.module.scss";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={s.frame}>
      <div className={s.app}>
        <main className={s.main} id="main">
          {children}
        </main>
        <BottomNav />
      </div>
      <AuthSheet />
      <Toast />
    </div>
  );
}
