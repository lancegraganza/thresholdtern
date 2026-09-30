"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Brand, Button, Card, Field, Notice } from "./ui";
import { useWallet, WalletButton } from "./wallet-provider";
import { useStore } from "./provider";
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
  const { wallet, password, open } = useWallet(),
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
        password,
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
      <div className="verify-layout">
        <section>
          <div className="eyebrow">A private way through</div>
          <h1>{gate?.name || "Private eligibility"}</h1>
          {gate ? (
            <>
              <span className="badge">
                {gateStatus(gate)} · Midnight Preprod
              </span>
              <p className="muted" style={{ marginTop: 28 }}>
                Prove{" "}
                {gate.kind === 0
                  ? "you are at least"
                  : "your private value is at least"}{" "}
                <strong style={{ color: "var(--ink)" }}>{gate.minimum}</strong>{" "}
                without revealing{" "}
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
              <p className="hint" style={{ marginTop: 24 }}>
                This proof uses a self-asserted value. A trusted issuer is
                needed to certify real age or credentials.
              </p>
            </>
          ) : (
            <p className="muted">Reading the requirement from Midnight.</p>
          )}
        </section>
        <Card className="verify-form">
          {result !== null ? (
            <>
              <div className="result-symbol">{result ? "✓" : "—"}</div>
              <h2>
                {continued
                  ? "You’re through."
                  : result
                    ? "Eligibility verified."
                    : "Requirement not satisfied."}
              </h2>
              <p className="muted" style={{ marginTop: 18, fontSize: 13 }}>
                {result
                  ? "✓ Requirement satisfied"
                  : "The private value did not meet this gate’s threshold."}
                <br />✓ Exact details were not revealed
              </p>
              {result && !continued && (
                <div className="actions">
                  <Button onClick={() => setContinued(true)}>Continue ↗</Button>
                </div>
              )}
              {continued && (
                <Notice>
                  Your confirmed proof satisfies this gate. The creator can
                  check the public receipt.
                </Notice>
              )}
              {!result && (
                <div className="actions">
                  <Link href="/" className="btn secondary">
                    Return home
                  </Link>
                </div>
              )}
              <details>
                <summary>View technical details</summary>
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
                  Only the boolean is public. This screen is a proof receipt,
                  not a server-side content authorization system.
                </p>
              </details>
            </>
          ) : stage ? (
            <>
              <h2>Keeping it private.</h2>
              <Progress stage={stage} txId={pending?.txId} />
              <p className="hint">
                You may need to approve a request in your wallet. Keep this tab
                open until confirmed.
              </p>
            </>
          ) : loading ? (
            <p role="status">
              {pending ? "Checking your receipt…" : "Loading the gate…"}
            </p>
          ) : pending ? (
            <>
              <h2>Waiting for confirmation.</h2>
              <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
                Your submission may still be in flight. Check its public receipt
                before trying another transaction.
              </p>
              <div className="actions">
                <Button onClick={reconcile}>Check result on Midnight</Button>
              </div>
              <details>
                <summary>View technical details</summary>
                <p className="mono">Receipt: {pending.id}</p>
                <p className="mono">
                  Transaction: {pending.txId || "Awaiting wallet response"}
                </p>
              </details>
            </>
          ) : gate && gateStatus(gate) !== "Active" ? (
            <>
              <h2>This gate is {gateStatus(gate).toLowerCase()}.</h2>
              <p className="muted" style={{ marginTop: 18 }}>
                Ask the creator for a new active gate.
              </p>
            </>
          ) : gate ? (
            <>
              <div className="eyebrow">Your evidence stays yours</div>
              <h2 style={{ marginTop: 16 }}>Verify privately.</h2>
              {!wallet ? (
                <>
                  <p className="muted" style={{ marginTop: 18, fontSize: 13 }}>
                    Connect a Preprod wallet to get started.
                  </p>
                  <div className="actions">
                    <Button onClick={open}>Connect wallet ↗</Button>
                  </div>
                </>
              ) : (
                <>
                  <Field
                    id="private-value"
                    label={
                      gate.kind === 0
                        ? "Your age (private)"
                        : "Your value (private)"
                    }
                    hint="Held in memory only. Never saved, logged, or sent to the website server."
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
                  <p className="hint">
                    Your local proof server processes the evidence on your
                    machine.
                  </p>
                  <div className="actions">
                    <Button onClick={verify}>Generate private proof ↗</Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <h2>Gate unavailable.</h2>
              <p className="muted" style={{ marginTop: 18 }}>
                Check the link with the creator.
              </p>
              <div className="actions">
                <Button
                  variant="secondary"
                  onClick={() => window.location.reload()}
                >
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
        </Card>
      </div>
      <footer>
        <span>
          ThresholdTern — prove eligibility without revealing the evidence.
        </span>
        <Link href="/">About ThresholdTern ↗</Link>
      </footer>
    </main>
  );
}
