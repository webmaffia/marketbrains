"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import s from "./BottomSheet.module.scss";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** iOS-style bottom sheet: scrim, drag-to-dismiss on the grabber, Esc to close, scroll lock, focus return. */
export function BottomSheet({ open, onClose, title, children }: Props) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; dy: number } | null>(null);
  const [visible, setVisible] = useState(open);

  // Keep mounted briefly after close so the exit animation can play.
  if (open && !visible) setVisible(true);
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setVisible(false), 260);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && sheetRef.current) {
        const f = sheetRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => sheetRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
      prev?.focus?.();
    };
  }, [open, onClose]);

  const onDown = (e: PointerEvent) => {
    drag.current = { startY: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!drag.current || !sheetRef.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.startY);
    sheetRef.current.style.transition = "none";
    sheetRef.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onUp = () => {
    if (!drag.current || !sheetRef.current) return;
    const { dy } = drag.current;
    drag.current = null;
    sheetRef.current.style.transition = "";
    sheetRef.current.style.transform = "";
    if (dy > 110) onClose();
  };

  if (!visible || typeof document === "undefined") return null;

  return createPortal(
    <div className={s.root} data-open={open}>
      <div className={s.scrim} onClick={onClose} aria-hidden="true" />
      <div ref={sheetRef} className={s.sheet} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} tabIndex={-1}>
        <div className={s.grabber} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span />
        </div>
        {title && (
          <h2 id={titleId} className={s.title}>
            {title}
          </h2>
        )}
        <div className={s.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
