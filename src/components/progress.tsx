import type { Stage } from "@/types/gate";
const stages: [Stage, string][] = [
  ["preparing", "Preparing verification"],
  ["proving", "Generating private proof"],
  ["balancing", "Preparing wallet authorization"],
  ["submitting", "Submitting proof"],
  ["finalizing", "Verifying on Midnight"],
];
export function Progress({ stage, txId }: { stage: Stage; txId?: string }) {
  const current = stages.findIndex(([key]) => key === stage);
  return (
    <div role="status" aria-live="polite">
      <div className="progress">
        {stages.map(([key, label], i) => (
          <div
            key={key}
            className={`progress-item ${key === stage ? "running" : ""}`}
          >
            <span className="progress-dot" aria-hidden="true">
              {i < current ? "✓" : key === stage ? "" : i + 1}
            </span>
            {label}
          </div>
        ))}
      </div>
      {txId && (
        <details>
          <summary>View technical details</summary>
          <p className="mono">Transaction: {txId}</p>
          <p className="hint">Submitted. Waiting for chain confirmation.</p>
        </details>
      )}
    </div>
  );
}
