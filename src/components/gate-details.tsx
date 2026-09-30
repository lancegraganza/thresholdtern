"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "./provider";
import { useWallet } from "./wallet-provider";
import { Button, Field, Icon, Modal, Notice, PageHead, Status } from "./ui";
import { Progress } from "./progress";
import { gateStatus, isAddress } from "@/lib/gates";
import { failure, UserError } from "@/lib/midnight/wallet";
import type { Gate, Stage } from "@/types/gate";
export function GateDetails({ address }: { address: string }) {
  const { saveGate, toast } = useStore(),
    { wallet, unlockStorage, open } = useWallet();
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
      if (!isAddress(address))
        throw new UserError(
          "This gate link is invalid. Ask the creator for the full share link.",
        );
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
      const client = await makeClient(wallet, unlockStorage, (s, id) => {
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
      <>
        <PageHead
          kicker="Gate management"
          title="Gate details"
          description="Reading the public requirement from Midnight."
        />
        {loading ? (
          <div className="notice" role="status">
            <span className="spinner" />
            <span>Reading your gate…</span>
          </div>
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
      </>
    );
  return (
    <>
      <PageHead
        kicker={gate.kind === 0 ? "Private age gate" : "Private threshold"}
        title={gate.name}
        description="A public boundary. A private way to meet it."
      >
        <Button onClick={() => setSharing(true)}>
          <Icon name="external" size={15} />
          Share gate
        </Button>
      </PageHead>
      <div className="detail-layout" data-enter>
        <section className="policy-display">
          <div className="eyebrow">THE REQUIREMENT</div>
          <div className="gate-policy">
            {gate.kind === 0 ? `${gate.minimum}+` : `≥ ${gate.minimum}`}
          </div>
          <p>
            Participants prove{" "}
            {gate.kind === 0 ? "their age" : "a private value"} meets this
            boundary. You receive only eligible or not eligible.
          </p>
          <div style={{ marginTop: 25 }}>
            <span className="hint" style={{ color: "#aaa3c7" }}>
              Self-asserted values / Midnight Preprod
            </span>
          </div>
        </section>
        <section className="detail-facts" aria-label="Gate facts">
          <div className="review-row">
            <span>Status</span>
            <Status active={gateStatus(gate) === "Active"}>
              {gateStatus(gate)}
            </Status>
          </div>
          <div className="review-row">
            <span>Eligible submissions</span>
            <strong>{gate.successes}</strong>
          </div>
          <div className="review-row">
            <span>Total confirmed submissions</span>
            <strong>{gate.attempts}</strong>
          </div>
          <div className="review-row">
            <span>Expiry</span>
            <strong>
              {gate.expiresAt
                ? new Date(gate.expiresAt * 1000).toLocaleString()
                : "No scheduled expiry"}
            </strong>
          </div>
          <div className="review-row">
            <span>Private</span>
            <strong>
              {gate.kind === 0
                ? "Exact age or birthdate"
                : "Exact numeric value"}
            </strong>
          </div>
        </section>
      </div>
      <div className="detail-actions">
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href={`/verify/${address}`} className="btn secondary">
            Participant view
            <Icon name="arrow" size={15} />
          </Link>
          <Button
            variant="text"
            onClick={refresh}
            disabled={loading || !!stage}
          >
            <Icon name="refresh" size={14} />
            {loading ? "Refreshing…" : "Refresh state"}
          </Button>
        </div>
        {creator && gate.active && (
          <Button
            className="danger-action"
            variant="text"
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
        <div style={{ marginTop: 24 }}>
          <Notice>
            A close transaction was submitted. Refresh chain state before trying
            another action.
          </Notice>
        </div>
      )}
      {stage && <Progress stage={stage} />}
      <details>
        <summary>Contract & privacy details</summary>
        <p className="mono">Preprod contract: {address}</p>
        <p className="hint">
          Counts describe submissions, not unique people. The verifier receives
          the result, never the private witness.
        </p>
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
        title="Share the passage"
      >
        <p className="hint">
          Send this link. Participants can prove the requirement with their own
          wallet and private evidence.
        </p>
        <Field id="share-url" label="Participant link">
          <input
            id="share-url"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
          />
        </Field>
        <Button onClick={copy}>
          <Icon name="copy" size={15} />
          Copy link
        </Button>
      </Modal>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Close this gate?"
      >
        <p className="muted">
          New verifications stop once Midnight confirms the transaction. Closing
          a gate is permanent.
        </p>
        <div className="actions">
          <Button onClick={close}>
            {wallet ? "Close gate on Midnight" : "Connect wallet"}
            <Icon name="arrow" size={15} />
          </Button>
          <Button variant="text" onClick={() => setConfirming(false)}>
            Keep open
          </Button>
        </div>
      </Modal>
    </>
  );
}
