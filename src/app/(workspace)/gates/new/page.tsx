"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  Field,
  Icon,
  Modal,
  Notice,
  PageHead,
  Status,
} from "@/components/ui";
import { Motion } from "@/components/motion";
import { Progress } from "@/components/progress";
import { useWallet } from "@/components/wallet-provider";
import { useStore } from "@/components/provider";
import { draftKey, policy, readStored, validateDraft } from "@/lib/gates";
import { canRetryTransaction, failure } from "@/lib/midnight/wallet";
import {
  clearPendingDeployment,
  deploymentStatus,
  pendingDeployment,
  savePendingDeployment,
  type DeploymentStatus,
} from "@/lib/midnight/deployment";
import {
  defaultDraft,
  type Draft,
  type Gate,
  type Requirement,
  type Stage,
} from "@/types/gate";
const options: [Requirement, string, string][] = [
  ["age18", "18+", "An adult age requirement"],
  ["age21", "21+", "A higher age requirement"],
  ["custom", "Threshold", "Your own numeric boundary"],
];
export default function CreateGate() {
  const { wallet, unlockStorage, open } = useWallet(),
    { saveGate, toast } = useStore();
  const [draft, setDraft] = useState<Draft>(defaultDraft),
    [step, setStep] = useState(0),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [stage, setStage] = useState<Stage | null>(null),
    [txId, setTxId] = useState(""),
    [gate, setGate] = useState<Gate | null>(null),
    [uncertain, setUncertain] = useState(false),
    [checking, setChecking] = useState(false),
    [statusMessage, setStatusMessage] = useState(""),
    [resetOpen, setResetOpen] = useState(false),
    [resetError, setResetError] = useState(""),
    [creatorRecovery, setCreatorRecovery] = useState(false);
  const working = useRef(false);
  useEffect(() => {
    const saved = readStored<Draft>(draftKey, defaultDraft);
    if (
      saved &&
      options.some(([r]) => r === saved.requirement) &&
      typeof saved.name === "string" &&
      typeof saved.minimum === "number" &&
      typeof saved.expiry === "string"
    )
      setDraft(saved);
    const pending = pendingDeployment();
    if (pending) {
      setTxId(pending.id);
      setUncertain(true);
      setStep(3);
      setStatusMessage(
        pending.phase === "accepted"
          ? "Your wallet accepted a deployment. Check its status before publishing again."
          : "A previous deployment attempt needs checking. A saved transaction reference does not mean your wallet accepted it.",
      );
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draft, loaded]);
  function choose(requirement: Requirement) {
    setDraft({
      ...draft,
      requirement,
      minimum: requirement === "age21" ? 21 : 18,
    });
  }
  function next() {
    if (step === 1) {
      const message = validateDraft(draft);
      if (message) {
        setError(message);
        return;
      }
    }
    setError("");
    setStep(step + 1);
  }
  async function publish() {
    if (working.current || uncertain || pendingDeployment()) return;
    if (!wallet) {
      open();
      return;
    }
    working.current = true;
    setError("");
    setStatusMessage("");
    setTxId("");
    setStage("preparing");
    let submitted = false;
    try {
      const { makeClient } = await import("@/lib/midnight/client");
      const client = await makeClient(
        wallet,
        unlockStorage,
        (s, id, metadata) => {
          setStage(s);
          if (id) {
            savePendingDeployment(
              id,
              s === "finalizing" ? "accepted" : "attempting",
              metadata,
            );
            submitted = true;
            setTxId(id);
          }
        },
      );
      const result = await client.deploy(draft);
      saveGate(result.gate);
      setGate(result.gate);
      setTxId(result.txId);
      localStorage.removeItem(draftKey);
      clearPendingDeployment();
      toast("Gate published on Midnight Preprod.");
    } catch (e) {
      setError(failure(e, submitted ? "transaction" : "operation"));
      if (!submitted || canRetryTransaction(e)) {
        clearPendingDeployment();
        setUncertain(false);
        setTxId("");
      } else {
        setUncertain(true);
        setStatusMessage(
          "Confirmation is still uncertain. Check this attempt before publishing again; your draft and encrypted creator keys are kept.",
        );
      }
    } finally {
      working.current = false;
      setStage(null);
    }
  }
  function releaseAttempt(message: string) {
    clearPendingDeployment();
    setUncertain(false);
    setTxId("");
    setStatusMessage(message);
    setError("");
  }
  async function restoreDeployment(
    id: string,
    result: Extract<DeploymentStatus, { status: "confirmed" }>,
  ) {
    const { readGate } = await import("@/lib/midnight/client");
    const restored = await readGate(result.address);
    const creatorId = localStorage.getItem(
      `thresholdtern:creator:${result.address}`,
    );
    const pendingCreatorId = localStorage.getItem(
      "thresholdtern:pending-creator-state",
    );
    if (creatorId && creatorId === pendingCreatorId)
      localStorage.removeItem("thresholdtern:pending-creator-state");
    setCreatorRecovery(!creatorId && !!pendingCreatorId);
    saveGate(restored);
    setGate(restored);
    setTxId(id);
    setUncertain(false);
    clearPendingDeployment();
    localStorage.removeItem(draftKey);
    toast("Gate confirmed and restored from Midnight Preprod.");
  }
  async function checkDeployment(walletReportedFailure = false) {
    if (working.current) return;
    const saved = pendingDeployment();
    const pending =
      saved || (txId ? { id: txId, phase: "unknown" as const } : null);
    if (!pending) {
      // Missing browser storage is not evidence that a transaction never left
      // the wallet. Do not erase an earlier error or claim deployment success.
      setUncertain(false);
      setStatusMessage(
        "There is no saved transaction reference to check. Check your wallet history for the previous attempt. Your draft is kept.",
      );
      setResetOpen(false);
      return;
    }
    working.current = true;
    setChecking(true);
    setError("");
    setResetError("");
    try {
      if (!saved) savePendingDeployment(pending.id, pending.phase);
      // Check authoritative state even when the user reports a wallet failure.
      // This prevents clearing an attempt that actually deployed successfully.
      const result = await deploymentStatus(pending, wallet);
      if (result.status === "confirmed") {
        await restoreDeployment(pending.id, result);
        setResetOpen(false);
      } else if (result.status === "failed") {
        releaseAttempt(result.message);
        setResetOpen(false);
      } else if (walletReportedFailure && !result.retryBlocked) {
        releaseAttempt(
          "Attempt cleared based on your wallet's reported rejection or discard. Your draft is kept; you can publish again.",
        );
        setResetOpen(false);
      } else {
        setUncertain(true);
        setStatusMessage(result.message);
        if (walletReportedFailure) setResetError(result.message);
      }
    } catch (e) {
      const message = failure(e, "read");
      if (walletReportedFailure) setResetError(message);
      else setError(message);
    } finally {
      working.current = false;
      setChecking(false);
    }
  }
  return (
    <div className="wizard">
      <PageHead
        kicker="Create a passage"
        title="Create a gate"
        description="Set a public requirement. Keep everyone’s exact evidence private."
      />
      {gate ? (
        <Motion>
          <Card>
            <div className="result-symbol">
              <Icon name="check" size={26} />
            </div>
            <h2>Your gate is open.</h2>
            <p className="muted" style={{ marginTop: 16 }}>
              {gate.name} · {policy(gate)}
            </p>
            {creatorRecovery && (
              <Notice>
                To recover creator access, restore this address in Gates using
                your original wallet and local storage password.{" "}
                <Link href="/gates">Open Gates →</Link>
              </Notice>
            )}
            <div className="actions">
              <Link href={`/gates/${gate.address}`} className="btn">
                Get your share link
                <Icon name="arrow" />
              </Link>
            </div>
            <details>
              <summary>View deployment details</summary>
              <p className="mono">Contract: {gate.address}</p>
              <p className="mono">Transaction: {txId}</p>
            </details>
          </Card>
        </Motion>
      ) : (
        <div className="creation-layout">
          <nav className="steps" aria-label="Create gate steps">
            {["Requirement", "Configure", "Review", "Publish"].map(
              (label, i) => (
                <div
                  className={`step ${step === i ? "current" : ""}`}
                  key={label}
                  aria-current={step === i ? "step" : undefined}
                >
                  <span className="step-index">
                    {i < step ? "✓" : `0${i + 1}`}
                  </span>
                  <span>{label}</span>
                </div>
              ),
            )}
          </nav>
          <Card className="wizard-panel">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (working.current || stage || checking) return;
                if (step < 3) next();
                else if (uncertain) void checkDeployment();
                else void publish();
              }}
            >
              <Motion watch={step}>
                {step === 0 && (
                  <>
                    <div className="eyebrow">01 / REQUIREMENT</div>
                    <h2 style={{ marginTop: 12 }}>Where’s the boundary?</h2>
                    <p className="hint" style={{ marginTop: 12 }}>
                      Choose what they prove. The exact value stays theirs.
                    </p>
                    <div className="choices">
                      {options.map(([key, title, description]) => (
                        <button
                          type="button"
                          key={key}
                          className={`choice ${draft.requirement === key ? "chosen" : ""}`}
                          aria-pressed={draft.requirement === key}
                          onClick={() => choose(key)}
                        >
                          <strong>{key === "custom" ? "≥" : title}</strong>
                          <span className="choice-copy">
                            <strong>
                              {key === "custom"
                                ? "Custom threshold"
                                : key === "age18"
                                  ? "Age 18 or older"
                                  : "Age 21 or older"}
                            </strong>
                            <span>{description}</span>
                          </span>
                          <span className="choice-tick">
                            {draft.requirement === key && (
                              <Icon name="check" size={12} />
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="hint" style={{ marginTop: 22, fontSize: 10 }}>
                      Self-asserted values. Membership and residency need
                      trusted credentials and are not available yet.
                    </p>
                  </>
                )}
                {step === 1 && (
                  <>
                    <div className="eyebrow">02 / CONFIGURE</div>
                    <h2 style={{ marginTop: 12 }}>Name the passage.</h2>
                    <Field
                      id="gate-name"
                      label="Gate name"
                      hint="A short public name people will recognize."
                    >
                      <input
                        id="gate-name"
                        value={draft.name}
                        onChange={(e) =>
                          setDraft({ ...draft, name: e.target.value })
                        }
                        placeholder="Evening gathering"
                        aria-describedby={`gate-name-hint${error ? " wizard-error" : ""}`}
                        aria-invalid={!!error}
                        autoComplete="off"
                      />
                    </Field>
                    <Field
                      id="gate-minimum"
                      label={
                        draft.requirement === "custom"
                          ? "Minimum value"
                          : "Minimum age"
                      }
                      hint={
                        draft.requirement === "custom"
                          ? "A whole number from 1 to 65,535."
                          : "Defined by your chosen age requirement."
                      }
                    >
                      <input
                        id="gate-minimum"
                        type="number"
                        min="1"
                        max={draft.requirement === "custom" ? 65535 : 130}
                        readOnly={draft.requirement !== "custom"}
                        value={draft.minimum}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            minimum: Number(e.target.value),
                          })
                        }
                        aria-describedby={`gate-minimum-hint${error ? " wizard-error" : ""}`}
                      />
                    </Field>
                    <Field
                      id="gate-expiry"
                      label="Expiry (optional)"
                      hint="Leave blank. You can close the gate yourself later."
                    >
                      <input
                        id="gate-expiry"
                        type="datetime-local"
                        value={draft.expiry}
                        onChange={(e) =>
                          setDraft({ ...draft, expiry: e.target.value })
                        }
                        aria-describedby={`gate-expiry-hint${error ? " wizard-error" : ""}`}
                      />
                    </Field>
                  </>
                )}
                {step === 2 && (
                  <>
                    <div className="eyebrow">03 / REVIEW</div>
                    <h2 style={{ marginTop: 12, marginBottom: 22 }}>
                      A boundary, not a biography.
                    </h2>
                    <div className="review-row">
                      <span>Gate name</span>
                      <strong>{draft.name}</strong>
                    </div>
                    <div className="review-row">
                      <span>Users prove</span>
                      <strong>
                        {draft.requirement === "custom" ? "Value" : "Age"} ≥{" "}
                        {draft.minimum}
                      </strong>
                    </div>
                    <div className="review-row">
                      <span>You receive</span>
                      <strong>Eligible / Not eligible</strong>
                    </div>
                    <div className="review-row">
                      <span>Kept private</span>
                      <strong>
                        {draft.requirement === "custom"
                          ? "Exact private value"
                          : "Exact age or birthdate"}
                      </strong>
                    </div>
                    <div className="review-row">
                      <span>Expires</span>
                      <strong>
                        {draft.expiry
                          ? new Date(draft.expiry).toLocaleString()
                          : "When you close it"}
                      </strong>
                    </div>
                    <p className="hint" style={{ marginTop: 20, fontSize: 10 }}>
                      This checks a self-asserted value. It does not certify
                      identity or an issuer-backed credential.
                    </p>
                  </>
                )}
                {step === 3 && (
                  <>
                    <div className="eyebrow">04 / PUBLISH</div>
                    <h2 style={{ marginTop: 12 }}>Ready to open.</h2>
                    <p className="hint" style={{ marginTop: 12 }}>
                      Your wallet authorizes deployment on Midnight Preprod.
                    </p>
                    <div className="publish-summary">
                      <span className="feature-icon">
                        <Icon name="wallet" />
                      </span>
                      <div>
                        <strong>
                          {wallet ? wallet.name : "Wallet needed"}
                        </strong>
                        <small>
                          {wallet
                            ? "Preprod connection"
                            : "Your draft stays in this browser"}
                        </small>
                      </div>
                      {wallet && <Status>Connected</Status>}
                    </div>
                    {stage ? (
                      <Progress stage={stage} txId={txId} />
                    ) : (
                      <Notice>
                        {statusMessage ||
                          "Start the local proof server. Your wallet needs spendable Preprod funds and DUST."}
                      </Notice>
                    )}
                    {uncertain && (
                      <details open>
                        <summary>Deployment attempt</summary>
                        <p className="mono">{txId}</p>
                        <a
                          href="https://preprod.midnightexplorer.com/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Preprod explorer ↗
                        </a>
                      </details>
                    )}
                    {uncertain && !stage && (
                      <Button
                        type="button"
                        variant="text"
                        disabled={checking}
                        onClick={() => {
                          setResetError("");
                          setResetOpen(true);
                        }}
                      >
                        Wallet rejected this attempt
                      </Button>
                    )}
                  </>
                )}
              </Motion>
              {error && (
                <div style={{ marginTop: 20 }}>
                  <Notice id="wizard-error" error>
                    {error}
                  </Notice>
                </div>
              )}
              <div className="actions">
                {step > 0 && (
                  <Button
                    type="button"
                    variant="text"
                    onClick={() => {
                      setStep(step - 1);
                      setError("");
                    }}
                    disabled={!!stage || checking || uncertain}
                  >
                    ← Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button type="submit">
                    {step === 0
                      ? "Configure gate"
                      : step === 1
                        ? "Review privacy"
                        : "Ready to publish"}
                    <Icon name="arrow" size={15} />
                  </Button>
                ) : (
                  <Button type="submit" disabled={!!stage || checking}>
                    {stage
                      ? "Publishing gate…"
                      : checking
                        ? "Checking deployment…"
                        : uncertain
                          ? "Check deployment status"
                          : wallet
                            ? "Publish gate"
                            : "Connect wallet to publish"}
                    {!stage && <Icon name="arrow" size={15} />}
                  </Button>
                )}
              </div>
            </form>
          </Card>
          <aside className="policy-preview">
            <span className="eyebrow">THE PUBLIC REQUIREMENT</span>
            <h3>{draft.name.trim() || "Your new gate"}</h3>
            <div className="preview-policy">
              {draft.requirement === "custom" ? "≥ " : ""}
              {draft.minimum}
              {draft.requirement !== "custom" ? "+" : ""}
            </div>
            <div className="preview-detail">
              The verifier receives<strong>Eligible / Not eligible</strong>
            </div>
            <div className="preview-detail">
              The details stay private
              <strong>
                {draft.requirement === "custom"
                  ? "Exact numeric value"
                  : "Exact age or birthdate"}
              </strong>
            </div>
            <p className="hint">
              <Icon name="lock" size={13} />
              No private evidence in the gate.
            </p>
          </aside>
        </div>
      )}
      <Modal
        open={resetOpen}
        onClose={() => {
          if (!checking) setResetOpen(false);
        }}
        title="Clear a rejected attempt"
      >
        <p className="hint">
          Use this only when your wallet explicitly shows this attempt as
          rejected or discarded. If it is pending, keep checking its status.
          Your draft and encrypted creator keys are kept.
        </p>
        {resetError && <Notice error>{resetError}</Notice>}
        <div className="actions">
          <Button
            type="button"
            disabled={checking}
            onClick={() => void checkDeployment(true)}
          >
            {checking ? "Checking deployment…" : "My wallet reports failure"}
          </Button>
          <Button
            type="button"
            variant="text"
            disabled={checking}
            onClick={() => setResetOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
