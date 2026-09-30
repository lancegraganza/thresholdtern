"use client";
import Link from "next/link";
import { useStore } from "@/components/provider";
import { Empty, Icon, PageHead, Status } from "@/components/ui";
import { short } from "@/lib/gates";
export default function Activity() {
  const { receipts, ready } = useStore();
  return (
    <>
      <PageHead
        kicker="The public record"
        title="Proofs leave receipts."
        description="Confirmed verification results saved in this browser. Your exact evidence never appears here."
      />
      {!ready ? (
        <p role="status" className="hint">
          Restoring receipts…
        </p>
      ) : receipts.length ? (
        <div className="activity-table" data-enter>
          <div className="activity-labels" aria-hidden="true">
            <span>Gate / time</span>
            <span>Result / transaction</span>
            <span />
          </div>
          {receipts.map((r) => (
            <article className="activity-row" key={r.txId}>
              <div>
                <strong>{r.gateName}</strong>
                <p className="hint">{new Date(r.time).toLocaleString()}</p>
              </div>
              <div>
                <Status active={r.eligible}>
                  {r.eligible ? "Eligible" : "Not eligible"}
                </Status>
                <p className="mono" style={{ marginTop: 8 }}>
                  {short(r.txId)} · Block {r.blockHeight}
                </p>
              </div>
              <Link href={`/verify/${r.gate}?receipt=${r.id}`}>
                View receipt
                <Icon name="arrow" size={14} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="The answer has a record. The evidence doesn’t."
          text="Confirmed proofs will appear here, with a link to check the result on Midnight."
        >
          <Link href="/gates" className="btn secondary">
            Explore your gates
            <Icon name="arrow" size={15} />
          </Link>
        </Empty>
      )}
    </>
  );
}
