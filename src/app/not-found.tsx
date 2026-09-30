import Link from "next/link";
import { Brand, Icon } from "@/components/ui";
export default function NotFound() {
  return (
    <main className="error-page">
      <Brand />
      <div className="eyebrow">404 / PASSAGE NOT FOUND</div>
      <h1>This door is not here.</h1>
      <p className="muted" style={{ marginTop: 24 }}>
        Check your gate link or return to ThresholdTern.
      </p>
      <div className="actions">
        <Link className="btn" href="/">
          Return home <Icon name="arrow" />
        </Link>
      </div>
    </main>
  );
}
