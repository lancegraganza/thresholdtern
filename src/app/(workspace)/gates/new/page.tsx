"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Field, Notice } from "@/components/ui";
import { Progress } from "@/components/progress";
import { useWallet } from "@/components/wallet-provider";
import { useStore } from "@/components/provider";
import { draftKey, policy, readStored, validateDraft } from "@/lib/gates";
import { failure } from "@/lib/midnight/wallet";
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
  const { wallet, password, open } = useWallet(),
    { saveGate, toast } = useStore();
  const [draft, setDraft] = useState<Draft>(defaultDraft),
    [step, setStep] = useState(0),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [stage, setStage] = useState<Stage | null>(null),
    [txId, setTxId] = useState(""),
    [gate, setGate] = useState<Gate | null>(null),
    [uncertain, setUncertain] = useState(false);
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
    const pending = localStorage.getItem("thresholdtern:pending-deploy");
    if (pending) {
      setTxId(pending);
      setUncertain(true);
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
    if (!wallet) {
      open();
      return;
    }
    setError("");
    setStage("preparing");
    let submitted = false;
    try {
      const { makeClient } = await import("@/lib/midnight/client");
      const client = await makeClient(wallet, password, (s, id) => {
        setStage(s);
        if (id) {
          submitted = true;
          setTxId(id);
          localStorage.setItem("thresholdtern:pending-deploy", id);
        }
      });
      const result = await client.deploy(draft);
      saveGate(result.gate);
      setGate(result.gate);
      setTxId(result.txId);
      localStorage.removeItem(draftKey);
      localStorage.removeItem("thresholdtern:pending-deploy");
      toast("Gate published on Midnight Preprod.");
    } catch (e) {
      setError(failure(e));
      if (submitted) setUncertain(true);
    } finally {
      setStage(null);
    }
  }
  return (
    <div className="wizard">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            Choose what matters. Keep the rest private.
          </div>
          <h1>Create a gate</h1>
          <p>A clear requirement, a single shareable link.</p>
        </div>
      </div>
      {gate ? (
        <Card>
          <div className="result-symbol">✓</div>
          <h2>Your gate is open.</h2>
          <p className="muted" style={{ marginTop: 16 }}>
            {gate.name} · {policy(gate)}
          </p>
          <div className="actions">
            <Link href={`/gates/${gate.address}`} className="btn">
              Get your share link ↗
            </Link>
          </div>
          <details>
            <summary>View deployment details</summary>
            <p className="mono">Contract: {gate.address}</p>
            <p className="mono">Transaction: {txId}</p>
          </details>
        </Card>
      ) : (
        <>
          <div className="steps" aria-label="Create gate steps">
            {["Requirement", "Configure", "Review", "Publish"].map(
              (label, i) => (
                <div
                  key={label}
                  className={`step ${step === i ? "current" : ""}`}
                  aria-current={step === i ? "step" : undefined}
                >
                  0{i + 1} · {label}
                </div>
              ),
            )}
          </div>
          <Card>
            {step === 0 && (
              <>
                <h2>What should they prove?</h2>
                <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
                  Choose the boundary. Their exact value stays private.
                </p>
                <div className="choices">
                  {options.map(([key, title, description]) => (
                    <button
                      key={key}
                      className={`choice ${draft.requirement === key ? "chosen" : ""}`}
                      aria-pressed={draft.requirement === key}
                      onClick={() => choose(key)}
                    >
                      <strong>{title}</strong>
                      <span>{description}</span>
                    </button>
                  ))}
                </div>
                <p className="hint" style={{ marginTop: 22 }}>
                  Self-asserted values. Membership and residency require trusted
                  credentials and are not available yet.
                </p>
              </>
            )}
            {step === 1 && (
              <>
                <h2>Make it yours.</h2>
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
                    aria-describedby={`gate-name-hint${error ? ' wizard-error' : ''}`}
                    aria-invalid={!!error && step===1}
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
                >
                  <input
                    id="gate-minimum"
                    type="number"
                    min="1"
                    max={draft.requirement === "custom" ? 65535 : 130}
                    readOnly={draft.requirement !== "custom"}
                    value={draft.minimum}
                    onChange={(e) =>
                      setDraft({ ...draft, minimum: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field
                  id="gate-expiry"
                  label="Expires on (optional)"
                  hint="Leave blank to keep the gate open until you close it."
                >
                  <input
                    id="gate-expiry"
                    type="datetime-local"
                    value={draft.expiry}
                    onChange={(e) =>
                      setDraft({ ...draft, expiry: e.target.value })
                    }
                    aria-describedby="gate-expiry-hint"
                  />
                </Field>
              </>
            )}
            {step === 2 && (
              <>
                <h2>Only the answer.</h2>
                <div className="review-row">
                  <span>Gate</span>
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
                  <span>You never receive</span>
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
                <p className="hint" style={{ marginTop: 20 }}>
                  This checks a self-asserted value. It does not certify
                  identity or an issuer-backed credential.
                </p>
              </>
            )}
            {step === 3 && (
              <>
                <h2>Open the door.</h2>
                <p
                  className="muted"
                  style={{ marginTop: 16, marginBottom: 24, fontSize: 13 }}
                >
                  Publish your gate on Midnight Preprod. Your wallet will
                  authorize the deployment.
                </p>
                {!wallet && (
                  <Notice>
                    Connect a Preprod wallet to publish. Your draft is saved in
                    this browser.
                  </Notice>
                )}
                {stage ? (
                  <Progress stage={stage} txId={txId} />
                ) : (
                  <Notice>
                    {uncertain
                      ? "A deployment was submitted. Check its transaction on the explorer and import the resulting contract in Gates before starting another deployment."
                      : "Start your local proof server and make sure your wallet has spendable funds and DUST."}
                  </Notice>
                )}
                {uncertain && (
                  <details open>
                    <summary>Submitted transaction</summary>
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
              </>
            )}
            {error && (
              <div style={{ marginTop: 20 }}>
                <Notice id="wizard-error" error>{error}</Notice>
              </div>
            )}
            <div className="actions">
              {step > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStep(step - 1);
                    setError("");
                  }}
                  disabled={!!stage}
                >
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button onClick={next}>
                  {step === 0
                    ? "Configure gate"
                    : step === 1
                      ? "Review privacy"
                      : "Ready to publish"}{" "}
                  ↗
                </Button>
              ) : (
                <Button onClick={publish} disabled={!!stage || uncertain}>
                  {stage
                    ? "Publishing gate…"
                    : wallet
                      ? "Publish gate on Midnight"
                      : "Connect wallet to publish"}{" "}
                  ↗
                </Button>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
