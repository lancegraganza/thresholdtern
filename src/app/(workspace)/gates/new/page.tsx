"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  Field,
  Icon,
  Notice,
  PageHead,
  Status,
} from "@/components/ui";
import { Motion } from "@/components/motion";
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
  const { wallet, unlockStorage, open } = useWallet(),
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
      const client = await makeClient(wallet, unlockStorage, (s, id) => {
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
                if (stage || (uncertain && step === 3)) return;
                if (step < 3) next();
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
                        {uncertain
                          ? "A deployment was submitted. Check its transaction, then restore the resulting address in Gates before starting another deployment."
                          : "Start the local proof server. Your wallet needs spendable Preprod funds and DUST."}
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
                    disabled={!!stage}
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
                  <Button type="submit" disabled={!!stage || uncertain}>
                    {stage
                      ? "Publishing gate…"
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
    </div>
  );
}
