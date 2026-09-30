"use client";
import Link from "next/link";
import Image from "next/image";
import { useStore } from "@/components/provider";
import { GateCard, GateList } from "@/components/gate-card";
import { Empty, Icon, PageHead } from "@/components/ui";
import { gateStatus } from "@/lib/gates";
import logo from "../../../../public/logo-app.png";
export default function Dashboard() {
  const { gates, ready } = useStore();
  return (
    <>
      <PageHead
        kicker="Your private workspace"
        title="A little proof goes a long way."
        description="Create a boundary. Receive an answer. Keep the evidence private."
      >
        <Link href="/gates/new" className="btn">
          <Icon name="plus" size={16} />
          Create gate
        </Link>
      </PageHead>
      <div className="overview-layout" data-enter>
        <div className="overview-main">
          <div className="stats">
            <div className="stat">
              <span className="eyebrow">Saved gates</span>
              <strong>{ready ? gates.length : "—"}</strong>
              <span className="hint">In this browser</span>
            </div>
            <div className="stat">
              <span className="eyebrow">Active boundaries</span>
              <strong>
                {ready
                  ? gates.filter((g) => gateStatus(g) === "Active").length
                  : "—"}
              </strong>
              <span className="hint">Latest known chain state</span>
            </div>
            <div className="stat">
              <span className="eyebrow">Eligible proofs</span>
              <strong>
                {ready ? gates.reduce((sum, g) => sum + g.successes, 0) : "—"}
              </strong>
              <span className="hint">Confirmed submissions</span>
            </div>
          </div>
          <div className="section-head">
            <h3>Your recent gates</h3>
            {gates.length > 0 && (
              <Link href="/gates" className="hint">
                All gates
                <Icon name="arrow" size={13} />
              </Link>
            )}
          </div>
          {!ready ? (
            <p role="status" className="hint">
              Restoring your workspace…
            </p>
          ) : gates.length ? (
            <GateList>
              {gates.slice(0, 4).map((g) => (
                <GateCard key={g.address} gate={g} />
              ))}
            </GateList>
          ) : (
            <Empty
              title="Open your first passage."
              text="An age requirement or a private threshold. One question, answered without the details."
            >
              <Link href="/gates/new" className="btn">
                Create your first gate
                <Icon name="arrow" size={15} />
              </Link>
            </Empty>
          )}
        </div>
        <aside className="overview-aside">
          <div className="privacy-note">
            <Image src={logo} alt="" width={80} height={80} />
            <h3>
              Just enough.
              <br />
              Never everything.
            </h3>
            <p>
              A gate receives eligible or not eligible. Exact private values
              stay off the public ledger.
            </p>
          </div>
          <div className="start-checklist">
            <h3>Your first gate, in three steps</h3>
            {[
              ["01", "Choose a requirement", "Age 18+, 21+ or a custom value."],
              [
                "02",
                "Publish on Midnight",
                "Authorize with your Preprod wallet.",
              ],
              ["03", "Share the link", "Let participants prove privately."],
            ].map(([n, t, d]) => (
              <div className="checklist-row" key={n}>
                <span className="ordinal">{n}</span>
                <div>
                  {t}
                  <small>{d}</small>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
