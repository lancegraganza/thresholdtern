"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "./provider";
import { useWallet } from "./wallet-provider";
import { Button, Card, Field, Modal, Notice } from "./ui";
import { Progress } from "./progress";
import { gateStatus, policy } from "@/lib/gates";
import { failure } from "@/lib/midnight/wallet";
import type { Gate, Stage } from "@/types/gate";
export function GateDetails({ address }: { address: string }) {
  const { saveGate, toast } = useStore(),
    { wallet, password, open } = useWallet();
  const [gate, setGate] = useState<Gate | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [sharing, setSharing] = useState(false),
    [confirming, setConfirming] = useState(false),
    [stage, setStage] = useState<Stage | null>(null),
    [creator, setCreator] = useState(false),
    [shareUrl, setShareUrl] = useState(""),
    [uncertain, setUncertain] = useState(false);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const { readGate } = await import("@/lib/midnight/client");
      const g = await readGate(address);
      setGate(g);
      saveGate(g);
      if (!g.active) setUncertain(false);
    } catch (e) {
      setError(failure(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setCreator(!!localStorage.getItem(`thresholdtern:creator:${address}`));
    setShareUrl(`${window.location.origin}/verify/${address}`);
    void refresh();
  }, [address]);
  async function close() {
    if (!wallet) {
      open();
      return;
    }
    setConfirming(false);
    setError("");
    setStage("preparing");
    let submitted = false;
    try {
      const { makeClient } = await import("@/lib/midnight/client");
      const client = await makeClient(wallet, password, (s, id) => {
        setStage(s);
        if (id) submitted = true;
      });
      const result = await client.close(address);
      setGate(result.gate);
      saveGate(result.gate);
      toast("Gate closed on Midnight.");
    } catch (e) {
      setError(failure(e));
      if (submitted) setUncertain(true);
    } finally {
      setStage(null);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast("Gate link copied.");
    } catch {
      toast("Select the share link and copy it manually.");
    }
  }
  if (!gate)
    return (
      <div className="wizard">
        <h1 style={{ fontSize: 40 }}>Gate details</h1>
        <div style={{ marginTop: 28 }}>
          {loading ? (
            <p role="status">Reading your gate from Midnight…</p>
          ) : (
            <>
              <Notice error>{error}</Notice>
              <div className="actions">
                <Button onClick={refresh}>Try again</Button>
                <Link href="/gates" className="btn secondary">
                  Back to gates
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            {gate.kind === 0 ? "Private age gate" : "Private numeric gate"}
          </div>
          <h1>{gate.name}</h1>
          <p>
            {policy(gate)} · {gateStatus(gate)}
          </p>
        </div>
        <Button onClick={() => setSharing(true)}>Share gate ↗</Button>
      </div>
      <div className="grid">
        <Card>
          <div className="eyebrow">Requirement</div>
          <div className="gate-policy" style={{ marginTop: 16 }}>
            {policy(gate)}
          </div>
          <p className="hint" style={{ marginTop: 16 }}>
            Self-asserted private value.
          </p>
        </Card>
        <Card>
          <div className="eyebrow">Eligible submissions</div>
          <div className="gate-policy" style={{ marginTop: 16 }}>
            {gate.successes}
          </div>
          <p className="hint" style={{ marginTop: 16 }}>
            {gate.attempts} total confirmed submissions
          </p>
        </Card>
        <Card>
          <div className="eyebrow">Gate status</div>
          <h3 style={{ marginTop: 20 }}>{gateStatus(gate)}</h3>
          <p className="hint" style={{ marginTop: 16 }}>
            {gate.expiresAt
              ? `Expires ${new Date(gate.expiresAt * 1000).toLocaleString()}`
              : "No scheduled expiry"}
          </p>
        </Card>
      </div>
      <div className="actions">
        <Link href={`/verify/${address}`} className="btn secondary">
          Open participant view ↗
        </Link>
        <Button
          variant="secondary"
          onClick={refresh}
          disabled={loading || !!stage}
        >
          {loading ? "Refreshing…" : "Refresh chain state"}
        </Button>
        {creator && gate.active && (
          <Button
            variant="secondary"
            onClick={() => setConfirming(true)}
            disabled={!!stage || uncertain}
          >
            Close gate
          </Button>
        )}
      </div>
      {error && (
        <div style={{ marginTop: 24 }}>
          <Notice error>{error}</Notice>
        </div>
      )}
      {uncertain && (
        <Notice>
          A close transaction was submitted. Refresh chain state before trying
          another action.
        </Notice>
      )}
      {stage && <Progress stage={stage} />}
      <div className="divider" />
      <Notice>
        The verifier receives eligibility, not exact age or evidence. Submission
        counts do not represent unique people.
      </Notice>
      <details>
        <summary>View technical details</summary>
        <p className="mono">Preprod contract: {address}</p>
        <a
          href="https://preprod.midnightexplorer.com/"
          target="_blank"
          rel="noreferrer"
        >
          Look up the address in the Preprod explorer ↗
        </a>
      </details>
      <Modal
        open={sharing}
        onClose={() => setSharing(false)}
        title="Share this gate"
      >
        <p className="muted" style={{ fontSize: 13 }}>
          Anyone with this link can privately prove they meet the requirement.
        </p>
        <Field id="share-url" label="Participant link">
          <input
            id="share-url"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
          />
        </Field>
        <Button onClick={copy}>Copy link</Button>
      </Modal>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Close this gate?"
      >
        <p className="muted">
          New verifications will stop after the transaction confirms. This
          cannot be undone.
        </p>
        <div className="actions">
          <Button onClick={close}>
            {wallet ? "Close gate on Midnight" : "Connect wallet"}
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Keep open
          </Button>
        </div>
      </Modal>
    </>
  );
}
