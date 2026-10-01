import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/format";
import s from "./Button.module.scss";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  block?: boolean;
  href?: string;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", block, href, className, children, ...rest }: Props) {
  const cls = cx(s.btn, s[variant], size === "sm" && s.sm, block && s.block, className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
