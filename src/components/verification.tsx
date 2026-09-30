"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Brand, Button, Card, Field, Icon, Notice } from "./ui";
import { useWallet, WalletButton } from "./wallet-provider";
import { useStore } from "./provider";
import { Motion } from "./motion";
import { Progress } from "./progress";
import { gateStatus, isAddress, policy, validateValue } from "@/lib/gates";
import { failure, UserError } from "@/lib/midnight/wallet";
import type { Gate, Receipt, Stage } from "@/types/gate";
type Pending = { id: string; txId?: string };
export function Verification({
  address,
  receiptId,
}: {
  address: string;
  receiptId?: string;
}) {
  const { wallet, unlockStorage, open } = useWallet(),
    { saveGate, saveReceipt } = useStore();
  const [gate, setGate] = useState<Gate | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [value, setValue] = useState(""),
    [stage, setStage] = useState<Stage | null>(null),
    [result, setResult] = useState<boolean | null>(null),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [pending, setPending] = useState<Pending | null>(null),
    [continued, setContinued] = useState(false);
  const pendingKey = `thresholdtern:pending:${address}`;
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (!isAddress(address))
          throw new UserError(
            "This gate link is invalid. Ask the creator for the full share link.",
          );
        const { readGate, readReceipt } = await import("@/lib/midnight/client");
        const next = await readGate(address);
        if (!mounted) return;
        setGate(next);
        saveGate(next);
        const raw = sessionStorage.getItem(pendingKey);
        let saved: Pending | null = null;
        try {
          saved = raw ? JSON.parse(raw) : null;
        } catch {}
        const id =
          receiptId || (saved && isAddress(saved.id) ? saved.id : undefined);
        if (saved?.id && isAddress(saved.id)) setPending(saved);
        if (id) {
          const found = await readReceipt(address, id);
          if (!mounted) return;
          if (found !== null) {
            setResult(found);
            setPending(null);
            sessionStorage.removeItem(pendingKey);
          } else if (receiptId)
            throw new UserError(
              "This receipt is not confirmed in the gate ledger. Check the reference or wait for confirmation.",
            );
        }
      } catch (e) {
        if (mounted) setError(failure(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [address, receiptId]);
  async function reconcile() {
    if (!pending) return;
    setError("");
    setLoading(true);
    try {
      const { readReceipt, readGate } = await import("@/lib/midnight/client");
      const found = await readReceipt(address, pending.id);
      if (found === null) {
        setError(
          "This receipt is not confirmed yet. Keep checking; do not submit another transaction.",
        );
        return;
      }
      setResult(found);
      const next = await readGate(address);
      setGate(next);
      saveGate(next);
      sessionStorage.removeItem(pendingKey);
      setPending(null);
    } catch (e) {
      setError(failure(e));
    } finally {
      setLoading(false);
    }
  }
  async function verify() {
    if (!gate) return;
    if (!wallet) {
      open();
      return;
    }
    setError("");
    let input: bigint;
    try {
      input = validateValue(value, gate.kind);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enter a valid number.");
      return;
    }
    setValue("");
    setStage("preparing");
    const id = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    let submitted = false;
    try {
      const { makeClient, readGate } = await import("@/lib/midnight/client");
      const client = await makeClient(
        wallet,
        unlockStorage,
        (s, txId) => {
          setStage(s);
          if (s === "submitting") {
            submitted = true;
            const next = { id, txId };
            setPending(next);
            sessionStorage.setItem(pendingKey, JSON.stringify(next));
          }
          if (txId) {
            const next = { id, txId };
            setPending(next);
            sessionStorage.setItem(pendingKey, JSON.stringify(next));
          }
        },
        input,
      );
      input = 0n;
      const confirmed = await client.verify(gate, id);
      setReceipt(confirmed);
      setResult(confirmed.eligible);
      saveReceipt(confirmed);
      sessionStorage.removeItem(pendingKey);
      setPending(null);
      const next = await readGate(address);
      setGate(next);
      saveGate(next);
    } catch (e) {
      setError(failure(e));
      if (!submitted) {
        setPending(null);
        sessionStorage.removeItem(pendingKey);
      }
    } finally {
      input = 0n;
      setValue("");
      setStage(null);
    }
  }
  return (
    <main className="participant">
      <header className="landing-nav">
        <Brand />
        <WalletButton />
      </header>
      <div className="participant-bar">
        <Link href="/">
          <Icon name="shield" size={14} />
          Private verification
        </Link>
        <span className="network-label">
          <span />
          Midnight Preprod
        </span>
      </div>
      <div className="verify-layout">
        <section className="verify-context">
          <div className="eyebrow">
            THE PASSAGE /{" "}
            {gate
              ? gateStatus(gate).toUpperCase()
              : loading
                ? "READING REQUIREMENT"
                : "GATE UNAVAILABLE"}
          </div>
          <h1>{gate?.name || "Private eligibility"}</h1>
          {gate ? (
            <>
              <div className="verify-policy">
                {gate.kind === 0 ? `${gate.minimum}+` : `≥ ${gate.minimum}`}
              </div>
              <p className="muted">
                Prove{" "}
                {gate.kind === 0
                  ? "you meet the age requirement"
                  : "your value meets the threshold"}
                , without revealing{" "}
                {gate.kind === 0
                  ? "your exact age or birthdate"
                  : "the exact value"}
                .
              </p>
              <div className="divider" />
              <div className="review-row">
                <span>The requirement</span>
                <strong>{policy(gate)}</strong>
              </div>
              <div className="review-row">
                <span>The verifier learns</span>
                <strong>Eligible / Not eligible</strong>
              </div>
              <p className="hint" style={{ marginTop: 20 }}>
                A proof of a self-asserted value. A trusted issuer is needed to
                certify actual age or credentials.
              </p>
            </>
          ) : (
            <p className="muted" style={{ marginTop: 20 }}>
              {loading
                ? "Reading the requirement from Midnight."
                : "A valid, confirmed gate is needed to verify."}
            </p>
          )}
        </section>
        <Card className="verify-form">
          <Motion
            watch={
              result !== null
                ? `result-${continued}`
                : stage
                  ? "proving"
                  : loading
                    ? "loading"
                    : pending
                      ? "pending"
                      : "input"
            }
          >
            {result !== null ? (
              <>
                <div className="result-symbol">
                  {result ? <Icon name="check" size={26} /> : "—"}
                </div>
                <div className="eyebrow">CONFIRMED ON MIDNIGHT</div>
                <h2>
                  {continued
                    ? "You’re through."
                    : result
                      ? "Eligibility verified."
                      : "Outside this boundary."}
                </h2>
                <p className="muted" style={{ marginTop: 18, fontSize: 12 }}>
                  {result
                    ? "The requirement was satisfied."
                    : "The private value did not meet this gate’s threshold."}
                  <br />
                  Your exact details were not revealed.
                </p>
                {result && !continued && (
                  <div className="actions">
                    <Button onClick={() => setContinued(true)}>
                      Continue
                      <Icon name="arrow" />
                    </Button>
                  </div>
                )}
                {continued && (
                  <div style={{ marginTop: 24 }}>
                    <Notice>
                      Your confirmed proof satisfies this gate. The creator can
                      check the public receipt.
                    </Notice>
                  </div>
                )}
                {!result && (
                  <div className="actions">
                    <Link href="/" className="btn secondary">
                      Return home
                      <Icon name="arrow" size={15} />
                    </Link>
                  </div>
                )}
                <details>
                  <summary>View proof receipt</summary>
                  <p className="mono">Contract: {address}</p>
                  <p className="mono">
                    Receipt:{" "}
                    {receipt?.id ||
                      receiptId ||
                      "Recovered from pending submission"}
                  </p>
                  {receipt && (
                    <>
                      <p className="mono">Transaction: {receipt.txId}</p>
                      <p>Confirmed block: {receipt.blockHeight}</p>
                    </>
                  )}
                  <p className="hint">
                    Only the boolean is public. This receipt does not enforce
                    server-side content access.
                  </p>
                </details>
              </>
            ) : stage ? (
              <>
                <div className="eyebrow">PRIVATE PROOF IN PROGRESS</div>
                <h2>One answer. No evidence.</h2>
                <Progress stage={stage} txId={pending?.txId} />
                <p className="hint">
                  Approve any wallet request. Keep this tab open until the
                  transaction is confirmed.
                </p>
              </>
            ) : loading ? (
              <div className="wallet-intro" role="status">
                <span className="spinner" />
                <p>
                  {pending ? "Checking your receipt…" : "Loading the gate…"}
                </p>
              </div>
            ) : pending ? (
              <>
                <div className="eyebrow">AWAITING MIDNIGHT</div>
                <h2>Confirmation takes a moment.</h2>
                <p className="hint" style={{ marginTop: 16 }}>
                  Your submission may still be in flight. Check the public
                  receipt before trying another transaction.
                </p>
                <div className="actions">
                  <Button onClick={reconcile}>
                    Check the result
                    <Icon name="refresh" size={15} />
                  </Button>
                </div>
                <details>
                  <summary>View submission details</summary>
                  <p className="mono">Receipt: {pending.id}</p>
                  <p className="mono">
                    Transaction: {pending.txId || "Awaiting wallet response"}
                  </p>
                </details>
              </>
            ) : gate && gateStatus(gate) !== "Active" ? (
              <>
                <div className="result-symbol">
                  <Icon name="lock" size={23} />
                </div>
                <h2>This gate is {gateStatus(gate).toLowerCase()}.</h2>
                <p className="hint" style={{ marginTop: 18 }}>
                  Ask the creator for a new active gate.
                </p>
              </>
            ) : gate ? (
              <>
                <div className="proof-input-heading">
                  <span className="eyebrow" style={{ marginBottom: 0 }}>
                    YOUR PRIVATE PROOF
                  </span>
                  <span className="hint">
                    {wallet ? "02 / EVIDENCE" : "01 / CONNECT"}
                  </span>
                </div>
                <h2>
                  {wallet ? "Only you need the details." : "Your way through."}
                </h2>
                {!wallet ? (
                  <>
                    <p className="hint" style={{ marginTop: 16 }}>
                      Connect a Preprod wallet to authorize your private proof.
                    </p>
                    <div className="actions">
                      <Button onClick={open}>
                        <Icon name="wallet" size={16} />
                        Connect wallet
                      </Button>
                    </div>
                    <div className="verify-private-note">
                      <Icon name="lock" size={13} />
                      No local password needed to connect.
                    </div>
                  </>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void verify();
                    }}
                  >
                    <Field
                      id="private-value"
                      label={
                        gate.kind === 0
                          ? "Your age (private)"
                          : "Your value (private)"
                      }
                      hint="Memory only. Never saved, logged or sent to this website’s server."
                    >
                      <input
                        id="private-value"
                        type="password"
                        inputMode="numeric"
                        autoComplete="off"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        aria-describedby={`private-value-hint${error ? " verification-error" : ""}`}
                        aria-invalid={!!error && !pending}
                      />
                    </Field>
                    <div className="verify-private-note">
                      <Icon name="shield" size={14} />
                      Your local proof server processes the evidence on your
                      machine.
                    </div>
                    <div className="actions">
                      <Button type="submit">
                        Generate private proof
                        <Icon name="arrow" size={16} />
                      </Button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <>
                <div className="result-symbol">
                  <Icon name="gate" size={24} />
                </div>
                <h2>This passage is unavailable.</h2>
                <p className="hint" style={{ marginTop: 18 }}>
                  Check the share link with the creator.
                </p>
                <div className="actions">
                  <Button
                    variant="secondary"
                    onClick={() => window.location.reload()}
                  >
                    <Icon name="refresh" size={15} />
                    Try again
                  </Button>
                </div>
              </>
            )}
            {error && (
              <div style={{ marginTop: 24 }}>
                <Notice id="verification-error" error>
                  {error}
                </Notice>
              </div>
            )}
          </Motion>
        </Card>
      </div>
      <footer>
        <span>
          ThresholdTern / Proof opens the door. Privacy comes with you.
        </span>
        <Link href="/">
          About ThresholdTern
          <Icon name="arrow" size={13} />
        </Link>
      </footer>
    </main>
  );
}
