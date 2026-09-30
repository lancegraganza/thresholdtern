"use client";
import Link from "next/link";
import type { Gate } from "@/types/gate";
import { gateStatus, policy, short } from "@/lib/gates";
import { Icon, Status } from "./ui";
export function GateCard({ gate }: { gate: Gate }) {
  const status = gateStatus(gate);
  return (
    <article className="gate-card">
      <div className="gate-identity">
        <span className="gate-icon">
          <Icon name="gate" size={18} />
        </span>
        <div>
          <h3>{gate.name}</h3>
          <p className="hint">
            {gate.kind === 0 ? "Age requirement" : "Private threshold"} ·{" "}
            {short(gate.address)}
          </p>
        </div>
      </div>
      <div className="gate-policy">{policy(gate)}</div>
      <Status active={status === "Active"}>{status}</Status>
      <Link
        href={`/gates/${gate.address}`}
        className="gate-open"
        aria-label={`Open gate: ${gate.name}`}
      >
        Open
        <Icon name="arrow" size={14} />
      </Link>
    </article>
  );
}
export function GateList({ children }: { children: React.ReactNode }) {
  return (
    <div className="gate-list">
      <div className="gate-list-labels" aria-hidden="true">
        <span>Gate / requirement</span>
        <span>Threshold</span>
        <span>Status</span>
        <span />
      </div>
      {children}
    </div>
  );
}
