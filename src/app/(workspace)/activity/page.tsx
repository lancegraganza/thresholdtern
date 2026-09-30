"use client";
import Link from "next/link";
import { useStore } from "@/components/provider";
import { Empty } from "@/components/ui";
import { short } from "@/lib/gates";
export default function Activity() {
  const { receipts, ready } = useStore();
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Public results. Private evidence.</div>
          <h1>Activity</h1>
          <p>Confirmed verification receipts saved in this browser.</p>
        </div>
      </div>
      {!ready ? (
        <p role="status">Restoring receipts…</p>
      ) : receipts.length ? (
        <>
          {receipts.map((r) => (
            <div className="activity-row" key={r.txId}>
              <div>
                <strong>{r.gateName}</strong>
                <p className="hint">{new Date(r.time).toLocaleString()}</p>
              </div>
              <div>
                <span className="badge">
                  {r.eligible ? "Eligible" : "Not eligible"}
                </span>
                <p className="mono" style={{ marginTop: 8 }}>
                  {short(r.txId)} · Block {r.blockHeight}
                </p>
              </div>
              <Link href={`/verify/${r.gate}?receipt=${r.id}`}>
                Check on chain ↗
              </Link>
            </div>
          ))}
        </>
      ) : (
        <Empty
          title="The proof leaves a receipt, not your evidence"
          text="Your confirmed verification results will appear here. Exact values never do."
        >
          <Link href="/gates" className="btn secondary">
            Explore your gates ↗
          </Link>
        </Empty>
      )}
    </>
  );
}
