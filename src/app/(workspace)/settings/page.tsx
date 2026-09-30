"use client";
import { useWallet } from "@/components/wallet-provider";
import { useStore } from "@/components/provider";
import { Button, Icon, PageHead, Status } from "@/components/ui";
export default function Settings() {
  const { wallet, open, disconnect, unlockStorage } = useWallet(),
    { toast } = useStore();
  return (
    <div className="settings-layout">
      <PageHead
        kicker="Under your control"
        title="Wallet & privacy"
        description="A clear connection. Local keys. Private evidence."
      />
      <section className="settings-section" data-enter>
        <div className="settings-description">
          <h3>Wallet connection</h3>
          <p>
            Your wallet authorizes and funds deployments and proof submissions.
          </p>
        </div>
        <div className="settings-content">
          <div className="section-head">
            <span className="eyebrow">Midnight Preprod</span>
            <Status active={!!wallet}>
              {wallet ? "Connected" : "Not connected"}
            </Status>
          </div>
          {wallet ? (
            <>
              <p>
                <strong>{wallet.name}</strong>
              </p>
              <p className="mono">{wallet.address}</p>
              <div className="actions">
                <Button variant="secondary" onClick={disconnect}>
                  Disconnect wallet
                </Button>
              </div>
              <p className="hint" style={{ marginTop: 15 }}>
                Clears this app’s session. Site authorization can be revoked in
                your wallet.
              </p>
            </>
          ) : (
            <>
              <p className="muted">
                Choose a Midnight wallet. No local password is needed to
                connect.
              </p>
              <div className="actions">
                <Button onClick={open}>
                  <Icon name="wallet" size={16} />
                  Connect wallet
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
      <section className="settings-section" data-enter>
        <div className="settings-description">
          <h3>Proof environment</h3>
          <p>
            Private evidence is processed by a proof server on your own machine.
          </p>
        </div>
        <div className="settings-content">
          <p>
            Start the local proof server before publishing or verifying a gate.
          </p>
          <details>
            <summary>Show setup instructions</summary>
            <code>npm run proof:up</code>
            <p className="mono">http://127.0.0.1:6302</p>
          </details>
        </div>
      </section>
      <section className="settings-section" data-enter>
        <div className="settings-description">
          <h3>Local privacy</h3>
          <p>Wallet authorization and local encryption have separate jobs.</p>
        </div>
        <div className="settings-content">
          <div className="privacy-facts">
            <div className="privacy-fact">
              <Icon name="lock" size={16} />
              <span>
                Exact values are held in memory and cleared after the attempt.
              </span>
            </div>
            <div className="privacy-fact">
              <Icon name="shield" size={16} />
              <span>
                Creator secrets remain encrypted in this browser. Unlock is
                requested only when an operation needs local keys.
              </span>
            </div>
            <div className="privacy-fact">
              <Icon name="gate" size={16} />
              <span>
                Public gates and receipts can be restored by their contract
                address.
              </span>
            </div>
          </div>
          <div className="actions">
            <Button
              variant="secondary"
              disabled={!wallet}
              onClick={() => {
                void unlockStorage()
                  .then(() => toast("Local storage unlocked for this session."))
                  .catch(() => {});
              }}
            >
              <Icon name="lock" size={15} />
              Unlock local storage
            </Button>
          </div>
          <p className="hint" style={{ marginTop: 14 }}>
            Use your original encryption password for existing creator keys. It
            is never saved by the app.
          </p>
        </div>
      </section>
    </div>
  );
}
