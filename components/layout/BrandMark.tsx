import s from "./BrandMark.module.scss";

/** The MarketBrains wordmark — shown in the Home header and on the left of every TopBar. */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static asset, not worth next/image config here
    <img src="/logo.png" alt="MarketBrains" className={s.logo} style={{ height: size }} />
  );
}
