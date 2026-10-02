import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import s from "./PageBanner.module.scss";

interface Props {
  title: string;
  text?: string;
  eyebrow?: string;
  icon?: IconName;
  /** Hue (0-360) of the gradient. Defaults to the brand green. */
  hue?: number;
  cta?: { label: string; href: string };
  /** "hero" is the tall banner; "slim" is a compact strip. */
  size?: "hero" | "slim";
}

/** Gradient banner shown at the top of every page. Server-safe (no state). */
export function PageBanner({ title, text, eyebrow, icon = "sparkle", hue = 158, cta, size = "hero" }: Props) {
  const style = {
    "--h": hue,
  } as React.CSSProperties;
  return (
    <section className={`${s.banner} ${size === "slim" ? s.slim : ""}`} style={style} aria-label={title}>
      <span className={s.orb1} aria-hidden="true" />
      <span className={s.orb2} aria-hidden="true" />
      <Icon name={icon} size={size === "slim" ? 64 : 120} className={s.art} />
      <div className={s.copy}>
        {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
        <h2 className={s.title}>{title}</h2>
        {text && <p className={s.text}>{text}</p>}
        {cta && (
          <Link href={cta.href} className={s.cta}>
            {cta.label}
            <Icon name="chevron" size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}
