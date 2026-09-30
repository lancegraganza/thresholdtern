"use client";
import { useWallet } from "@/components/wallet-provider";
import { Button, Card, Notice } from "@/components/ui";
export default function Settings() {
  const { wallet, open, disconnect } = useWallet();
  return (
    <div className="wizard">
      <div className="page-head">
        <div>
          <div className="eyebrow">A connection you control</div>
          <h1>Wallet & privacy</h1>
          <p>Connect to Preprod. Keep your private evidence on your machine.</p>
        </div>
      </div>
      <div className="stack">
        <Card>
          <div className="section-head">
            <h3>Midnight wallet</h3>
            <span className="badge">
              {wallet ? "Connected" : "Disconnected"}
            </span>
          </div>
          {wallet ? (
            <>
              <p>{wallet.name} · Preprod</p>
              <p className="mono" style={{ marginTop: 12 }}>
                {wallet.address}
              </p>
              <div className="actions">
                <Button variant="secondary" onClick={disconnect}>
                  Disconnect wallet
                </Button>
              </div>
              <p className="hint" style={{ marginTop: 16 }}>
                This clears the app session. Revoke site authorization in your
                wallet if needed.
              </p>
            </>
          ) : (
            <>
              <p className="muted">
                A wallet signs and funds gate deployments and proof submissions.
              </p>
              <div className="actions">
                <Button onClick={open}>Connect wallet ↗</Button>
              </div>
            </>
          )}
        </Card>
        <Card>
          <h3>Your local proof server</h3>
          <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
            Private proofs are generated on your own machine. Start the bundled
            proof server before publishing or verifying.
          </p>
          <details>
            <summary>View setup details</summary>
            <code>npm run proof:up</code>
            <p className="mono">http://127.0.0.1:6302</p>
          </details>
        </Card>
        <Notice>
          Exact values are held in memory and cleared after verification.
          Encrypted creator secrets stay in this browser. Public gate records
          and receipts can be restored by their contract address.
        </Notice>
      </div>
    </div>
  );
}
