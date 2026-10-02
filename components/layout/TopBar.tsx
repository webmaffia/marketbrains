import type { ReactNode } from "react";
import { BackButton } from "./BackButton";
import { BrandMark } from "./BrandMark";
import s from "./TopBar.module.scss";

interface Props {
  title?: string;
  back?: boolean;
  fallbackHref?: string;
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
}

export function TopBar({ title, back, fallbackHref = "/", left, right, children }: Props) {
  return (
    <header className={s.bar}>
      <div className={s.row}>
        <div className={s.side}>{back ? <BackButton fallbackHref={fallbackHref} /> : (left ?? <BrandMark size={16} />)}</div>
        <h1 className={s.title}>{children ?? title}</h1>
        <div className={`${s.side} ${s.end}`}>{right}</div>
      </div>
    </header>
  );
}
