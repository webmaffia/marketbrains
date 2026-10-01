import s from "./LoadingSkeleton.module.scss";

export function PostSkeleton() {
  return (
    <div className={s.card} aria-hidden="true">
      <div className={s.row}>
        <span className={`${s.bone} ${s.circle}`} />
        <div className={s.col}>
          <span className={s.bone} style={{ width: "40%" }} />
          <span className={s.bone} style={{ width: "22%" }} />
        </div>
      </div>
      <span className={s.bone} style={{ width: "88%", height: 18 }} />
      <span className={s.bone} style={{ width: "100%" }} />
      <span className={s.bone} style={{ width: "70%" }} />
    </div>
  );
}

export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}
