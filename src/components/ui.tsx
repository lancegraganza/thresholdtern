"use client";
import { useEffect, useRef, useId, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import logo from "../../public/logo-app.png";
export type IconName =
  | "arrow"
  | "plus"
  | "gate"
  | "shield"
  | "wallet"
  | "check"
  | "chevron"
  | "search"
  | "close"
  | "activity"
  | "settings"
  | "home"
  | "lock"
  | "copy"
  | "refresh"
  | "external";
const paths: Record<IconName, string> = {
  arrow: "M4 12h16m-6-6 6 6-6 6",
  plus: "M12 5v14M5 12h14",
  gate: "M5 20V4h14v16M9 20V8h6v12M3 20h18",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6",
  wallet: "M19 8V5H4v15h16V8H4m12 4h4v4h-4v-4Z",
  check: "m5 12 4 4L19 6",
  chevron: "m9 5 7 7-7 7",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-2 4 6 6",
  close: "m6 6 12 12M6 18 18 6",
  activity: "M4 19V5m0 14h16M8 15l4-5 3 2 5-7",
  settings: "M4 7h16M4 17h16M9 4v6m6 4v6",
  home: "m3 10 9-7 9 7M6 8v12h12V8M10 20v-6h4v6",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10Zm7 5v2",
  copy: "M9 8h11v13H9V8ZM5 16H3V3h11v2",
  refresh: "M20 8a8 8 0 1 0 0 8M20 3v5h-5",
  external: "M13 4h7v7M20 4 10 14M9 4H4v16h16v-5",
};
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="ThresholdTern home">
      <Image src={logo} alt="" width={64} height={64} className="brand-logo" />
      {!compact && (
        <span>
          Threshold<span className="brand-light">Tern</span>
        </span>
      )}
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
      <Icon name={error ? "activity" : "shield"} />
      <div>{children}</div>
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
      <div className="empty-portal" aria-hidden="true">
        <span />
        <Icon name="gate" size={30} />
      </div>
      <div className="empty-content">
        <h3>{title}</h3>
        <p>{text}</p>
        {children && <div className="actions">{children}</div>}
      </div>
    </div>
  );
}
export function Status({
  children,
  active = true,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span className={`badge ${active ? "" : "inactive"}`}>{children}</span>
  );
}
export function PageHead({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-head" data-enter>
      <div>
        <div className="eyebrow">{kicker}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="head-actions">{children}</div>}
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
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (open && !dialog.open) dialog.showModal();
    if (reduced) {
      if (!open && dialog.open) dialog.close();
      return;
    }
    if (!open && !dialog.open) return;
    const tween = open
      ? gsap.fromTo(
          dialog,
          { y: 16, opacity: 0, scale: 0.98 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.25,
            ease: "power2.out",
            clearProps: "all",
          },
        )
      : gsap.to(dialog, {
          y: 8,
          opacity: 0,
          duration: 0.14,
          ease: "power1.in",
          onComplete: () => dialog.close(),
        });
    return () => {
      tween.kill();
      gsap.set(dialog, { clearProps: "all" });
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
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
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
