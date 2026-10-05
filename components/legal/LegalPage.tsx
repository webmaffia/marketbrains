import type { ReactNode } from "react";
import { TopBar } from "@/components/layout/TopBar";
import s from "./LegalPage.module.scss";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <TopBar title={title} back fallbackHref="/" />
      <article className={s.doc} data-selectable>
        <h1>{title}</h1>
        <p className={s.updated}>Last updated {updated}</p>
        {children}
      </article>
    </>
  );
}
