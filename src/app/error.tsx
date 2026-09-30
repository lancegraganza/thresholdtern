"use client";
import { Brand, Button, Icon, Notice } from "@/components/ui";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="error-page">
      <Brand />
      <div className="eyebrow">WORKSPACE / RECOVERY</div>
      <h1>Let’s reopen this passage.</h1>
      <div style={{ marginTop: 24 }}>
        <Notice>
          A page could not finish loading. Your private evidence has not been
          saved. If a transaction was submitted, check its chain state before
          retrying.
        </Notice>
      </div>
      <div className="actions">
        <Button onClick={reset}>
          Try loading again <Icon name="refresh" size={16} />
        </Button>
      </div>
    </main>
  );
}
