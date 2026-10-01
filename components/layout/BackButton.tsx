"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import s from "./BackButton.module.scss";

export function BackButton({ fallbackHref = "/" }: { fallbackHref?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={s.btn}
      aria-label="Go back"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallbackHref))}
    >
      <Icon name="back" size={24} />
    </button>
  );
}
