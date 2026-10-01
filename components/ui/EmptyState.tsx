import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import s from "./EmptyState.module.scss";

interface Props {
  icon: IconName;
  title: string;
  text: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, text, action }: Props) {
  return (
    <div className={s.empty}>
      <span className={s.icon}>
        <Icon name={icon} size={30} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action && <div className={s.action}>{action}</div>}
    </div>
  );
}
