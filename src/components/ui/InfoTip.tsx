import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function InfoTip({ text }: { text: string }) {
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, below: false });

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({
        top: rect.top,
        left: rect.left + rect.width / 2,
        below: rect.top < 96,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  return (
    <span className="info-tip">
      <button
        ref={btnRef}
        type="button"
        className="info-tip-btn"
        aria-label="About this control"
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (window.matchMedia("(hover: hover)").matches) return;
          setOpen((v) => !v);
        }}
      >
        i
      </button>
      {open &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            className={`info-tip-bubble${pos.below ? " below" : ""}`}
            style={{ top: pos.below ? pos.top + 18 : pos.top, left: pos.left }}
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}

export function FieldLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="field-label">
      <label>{label}</label>
      <InfoTip text={hint} />
    </div>
  );
}

export function HintedField({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <FieldLabel label={label} hint={hint} />
      {children}
    </div>
  );
}
