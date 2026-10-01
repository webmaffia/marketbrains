import Link from "next/link";
import { cx } from "@/lib/format";
import s from "./TopicChip.module.scss";

interface Props {
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  tone?: "default" | "accent" | "bull" | "bear";
  prefix?: string;
}

export function TopicChip({ label, href, active, onClick, tone = "default", prefix }: Props) {
  const cls = cx(s.chip, active && s.active, tone !== "default" && s[tone]);
  const content = (
    <>
      {prefix && <span className={s.prefix}>{prefix}</span>}
      {label}
    </>
  );
  if (href) return <Link href={href} className={cls}>{content}</Link>;
  return (
    <button type="button" className={cls} onClick={onClick} aria-pressed={active}>
      {content}
    </button>
  );
}
