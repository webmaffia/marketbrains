import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { Icon } from "@/components/ui/Icon";
import s from "./HomeHeader.module.scss";

export function HomeHeader() {
  return (
    <header className={s.bar}>
      <div className={s.row}>
        <h1 className={s.brand}>
          <BrandMark size={22} />
        </h1>
        <div className={s.actions}>
          <Link href="/search" className={s.btn} aria-label="Search">
            <Icon name="search" size={22} />
          </Link>
        </div>
      </div>
    </header>
  );
}
