"use client";
import { useEffect, useRef, useId, type ReactNode } from "react";
import Link from "next/link";
export function TernMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M4 12L20 19L36 7L25 25L20 32L16 23L4 12Z" fill="currentColor" />
      <path d="M20 19L25 25" stroke="var(--surface)" strokeWidth="1.2" />
    </svg>
  );
}
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="ThresholdTern home">
      <TernMark />
      ThresholdTern
    </Link>
  );
}
export function Button({
  children,
  variant = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  return (
    <button {...props} className={`btn ${variant} ${props.className || ""}`}>
      {children}
    </button>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}
export function Notice({
  children,
  error = false,
  id,
}: {
  children: ReactNode;
  error?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      )}
    </div>
  );
}
export function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-mark" aria-hidden="true">
        ↗
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId=useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(event)=>{event.preventDefault();onClose();}}
      onClose={onClose}
      aria-labelledby={titleId}
    >
      <div className="dialog-head">
        <h3 id={titleId}>{title}</h3>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
