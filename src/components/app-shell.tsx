"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./ui";
import { WalletButton } from "./wallet-provider";
const links = [
  ["/dashboard", "Dashboard", "▦"],
  ["/gates", "Gates", "◇"],
  ["/gates/new", "Create gate", "+"],
  ["/activity", "Activity", "↗"],
  ["/settings", "Settings", "⚙"],
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  function nav(mobile = false) {
    return (
      <nav
        aria-label={
          mobile ? "Mobile application navigation" : "Application navigation"
        }
        className={mobile ? "mobile-nav" : ""}
      >
        {links.map(([url, title, icon]) => (
          <Link
            key={url}
            href={url}
            className={`nav-item ${pathname === url ? "selected" : ""}`}
            aria-current={pathname === url ? "page" : undefined}
          >
            <span aria-hidden="true">{icon}</span>
            {title}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <div className="app">
      <aside className="sidebar">
        <Brand />
        {nav()}
        <div className="side-bottom">
          <span className="badge">Midnight Preprod</span>
          <div className="divider" />
          <p className="muted">
            The answer is enough.
            <br />
            Keep the evidence yours.
          </p>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-top">
          <span className="eyebrow">Your private workspace</span>
          <WalletButton />
        </header>
        <main className="workspace">{children}</main>
      </div>
      {nav(true)}
    </div>
  );
}
