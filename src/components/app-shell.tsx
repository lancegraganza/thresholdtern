"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand, Icon, type IconName } from "./ui";
import { WalletButton } from "./wallet-provider";
import { Motion } from "./motion";
const links: [string, string, IconName][] = [
  ["/dashboard", "Overview", "home"],
  ["/gates", "Gates", "gate"],
  ["/activity", "Activity", "activity"],
  ["/settings", "Settings", "settings"],
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  function selected(url: string) {
    return (
      pathname === url || (url === "/gates" && pathname.startsWith("/gates/"))
    );
  }
  function nav(mobile = false) {
    return (
      <nav
        aria-label={
          mobile ? "Mobile application navigation" : "Application navigation"
        }
        className={mobile ? "mobile-nav" : "app-nav"}
      >
        {links.map(([url, label, icon]) => (
          <Link
            href={url}
            key={url}
            className={`nav-item ${selected(url) ? "selected" : ""}`}
            aria-current={selected(url) ? "page" : undefined}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    );
  }
  const context =
    pathname === "/gates/new"
      ? "New gate"
      : pathname.startsWith("/gates/")
        ? "Gate details"
        : links.find(([url]) => url === pathname)?.[1] || "Workspace";
  return (
    <div className="app">
      <a className="skip-link" href="#workspace">
        Skip to content
      </a>
      <header className="app-header">
        <Brand />
        {nav()}
        <WalletButton />
      </header>
      <div className="workspace-bar">
        <span className="workspace-context">
          <span className="muted">Workspace</span>
          <Icon name="chevron" size={12} />
          {context}
        </span>
        <span className="network-label">
          <span />
          Midnight Preprod
        </span>
      </div>
      <main id="workspace" className="workspace">
        <Motion watch={pathname} className="route-content">
          {children}
        </Motion>
      </main>
      <footer className="workspace-footer">
        <span>
          <Icon name="lock" size={13} />
          Your evidence stays off the public ledger.
        </span>
        <Link href="/">
          About ThresholdTern
          <Icon name="external" size={13} />
        </Link>
      </footer>
      {nav(true)}
    </div>
  );
}
