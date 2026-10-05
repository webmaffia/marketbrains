import s from "./Disclaimer.module.scss";

export const DISCLAIMER = "Opinion of the author, not investment advice.";

/** One-line disclaimer shown under every post. */
export function Disclaimer() {
  return <p className={s.note}>{DISCLAIMER}</p>;
}
