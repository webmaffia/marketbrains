import type { ReactNode } from "react";
import s from "./template.module.scss";

/** Re-mounts on every navigation so each screen slides/fades in like a native push. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className={s.page}>{children}</div>;
}
