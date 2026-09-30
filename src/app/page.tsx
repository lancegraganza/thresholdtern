"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Brand, Icon } from "@/components/ui";
import { Motion } from "@/components/motion";
import logo from "../../public/logo-app.png";

export default function Landing() {
  const [minimum, setMinimum] = useState(18);
  return (
    <main className="landing">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="landing-nav">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#how">The passage</a>
          <a href="#privacy">Privacy, by design</a>
          <Link href="/dashboard" className="btn light">
            Open workspace
            <Icon name="arrow" size={16} />
          </Link>
        </nav>
      </header>
      <Motion scroll>
        <section className="hero" id="main-content">
          <div className="hero-copy">
            <div className="eyebrow" data-enter>
              <span className="tiny-rule" />
              PRIVATE ELIGIBILITY / BUILT ON MIDNIGHT
            </div>
            <h1 data-enter>
              Let them in.
              <br />
              <span>Keep details out.</span>
            </h1>
            <p data-enter>
              A requirement is a boundary.
              <br />
              It doesn’t have to be an invitation to overshare.
            </p>
            <div className="actions" data-enter>
              <Link className="btn light" href="/gates/new">
                Create a gate
                <Icon name="arrow" />
              </Link>
              <a href="#how" className="quiet-link">
                See how it works<span>↓</span>
              </a>
            </div>
            <div className="hero-footnote" data-enter>
              <Icon name="shield" size={15} />
              Private evidence. A verifiable answer.
            </div>
          </div>
          <div
            className="passage-art"
            data-enter
            aria-label="Illustration of a tern passing through a private threshold"
          >
            <div className="art-coordinate">01 / THE THRESHOLD</div>
            <div className="threshold-frame">
              <span className="threshold-cap">PRIVATE</span>
              <div className="threshold-line" />
            </div>
            <Image
              className="hero-logo"
              src={logo}
              alt="ThresholdTern bird passing through a doorway"
              width={500}
              height={500}
              preload
            />
            <div className="passage-receipt">
              <span className="receipt-check">
                <Icon name="check" size={17} />
              </span>
              <div>
                <strong>Requirement satisfied</strong>
                <small>Evidence stays undisclosed</small>
              </div>
              <span className="receipt-code">18+</span>
            </div>
            <span className="art-caption">
              ILLUSTRATIVE / NOT A LIVE RECEIPT
            </span>
            <div className="art-baseline">
              <span>EVIDENCE</span>
              <span>PROOF</span>
              <span>ACCESS</span>
            </div>
          </div>
        </section>
        <div className="landing-strip">
          <span>ONLY THE THRESHOLD MATTERS.</span>
          <span>Age thresholds</span>
          <span>Private numeric values</span>
          <span>
            Verifiable on Midnight
            <Icon name="external" size={13} />
          </span>
        </div>
        <section id="how" className="passage-section">
          <div className="section-title" data-reveal>
            <div className="eyebrow">01 / A SMALLER ASK</div>
            <h2>
              Check the boundary.
              <br />
              <span className="muted">Leave the person private.</span>
            </h2>
            <p>
              You need to know if they qualify.
              <br />
              You don’t need everything behind the answer.
            </p>
          </div>
          <div className="threshold-demo" data-reveal>
            <div className="demo-toolbar">
              <span className="eyebrow">EXPLORE A REQUIREMENT</span>
              <div
                className="segmented"
                aria-label="Illustrative age requirement"
              >
                {[18, 21].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMinimum(n)}
                    aria-pressed={minimum === n}
                  >
                    {n}+
                  </button>
                ))}
              </div>
            </div>
            <div className="demo-equation">
              <div>
                <span className="hint">Private evidence</span>
                <div className="hidden-value">••</div>
                <span className="hint">
                  <Icon name="lock" size={12} />
                  Exact value withheld
                </span>
              </div>
              <div className="equation-boundary">
                <span>≥</span>
                <strong>{minimum}</strong>
                <span className="hint">The public threshold</span>
              </div>
              <Motion watch={minimum} className="demo-answer">
                <Icon name="check" size={26} />
                <strong>Eligible</strong>
                <span className="hint">Just the answer</span>
              </Motion>
            </div>
            <p className="demo-caption">
              Illustrative eligible example. Live results come from confirmed
              Midnight proofs.
            </p>
          </div>
          <div className="process-list" data-reveal>
            {[
              [
                "01",
                "Set the threshold",
                "Choose an age requirement or a numeric minimum. Give your gate a name.",
              ],
              [
                "02",
                "Share the passage",
                "One link. Participants connect their wallet and provide their evidence privately.",
              ],
              [
                "03",
                "Receive the answer",
                "A confirmed proof reveals eligibility. The exact value stays off the public ledger.",
              ],
            ].map(([n, title, text]) => (
              <div className="process-step" key={n}>
                <span className="step-number">{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section id="privacy" className="privacy-section">
          <div className="privacy-heading" data-reveal>
            <div className="eyebrow">02 / PRIVACY IS THE POINT</div>
            <h2>
              An answer.
              <br />
              Not a dossier.
            </h2>
            <p>Private by intention, from input to receipt.</p>
            <Link href="/dashboard" className="quiet-link">
              Explore the workspace
              <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className="disclosure-list" data-reveal>
            <div>
              <span className="disclosure-label">
                <Icon name="lock" />
                KEPT PRIVATE
              </span>
              <h3>Your exact age or value.</h3>
              <p>
                Evidence lives in memory, is processed by your local proof
                server, and is cleared after the attempt.
              </p>
            </div>
            <div>
              <span className="disclosure-label">
                <Icon name="check" />
                MADE VERIFIABLE
              </span>
              <h3>Whether you meet the requirement.</h3>
              <p>
                The public policy, eligibility result and gate status. Enough to
                verify the threshold.
              </p>
            </div>
            <p className="privacy-scope">
              Currently proves self-asserted values. Trusted age credentials
              require a future issuer integration.
            </p>
          </div>
        </section>
        <section className="landing-invitation" data-reveal>
          <span className="eyebrow">MAKE ROOM FOR LESS.</span>
          <h2>
            The right boundary
            <br />
            changes everything.
          </h2>
          <Link href="/gates/new" className="btn">
            Create your first gate
            <Icon name="arrow" />
          </Link>
          <span className="hint">
            Midnight Preprod · A wallet is needed to publish
          </span>
        </section>
      </Motion>
      <footer className="landing-footer">
        <Brand />
        <span>
          Proof opens the door.
          <br />
          Privacy comes with you.
        </span>
        <Link href="/dashboard">
          Enter workspace
          <Icon name="arrow" size={16} />
        </Link>
        <span className="footer-network">Midnight / Preprod</span>
      </footer>
    </main>
  );
}
