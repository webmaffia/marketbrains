import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import s from "./HomeHeader.module.scss";

export function HomeHeader() {
  return (
    <header className={s.bar}>
      <div className={s.row}>
        <h1 className={s.brand}>
          <span className={s.mark} aria-hidden="true">
            M
          </span>
          MarketBrains
        </h1>
        <div className={s.actions}>
          <Link href="/search" className={s.btn} aria-label="Search">
            <Icon name="search" size={22} />
          </Link>
          <Link href="/create" className={`${s.btn} ${s.primary}`} aria-label="Start a discussion">
            <Icon name="plus" size={22} />
          </Link>
        </div>
      </div>
    </header>
  );
}
