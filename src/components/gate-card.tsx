"use client";
import Link from "next/link";
import type { Gate } from "@/types/gate";
import { gateStatus, policy } from "@/lib/gates";
import { Card } from "./ui";
export function GateCard({ gate }: { gate: Gate }) {
  return (
    <Card className="gate-card">
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
      >
        <span className="eyebrow">
          {gate.kind === 0 ? "Age requirement" : "Numeric threshold"}
        </span>
        <span className="badge">{gateStatus(gate)}</span>
      </div>
      <h3>{gate.name}</h3>
      <div className="gate-policy">{policy(gate)}</div>
      <p className="hint">Only the result is disclosed.</p>
      <div className="gate-bottom">
        <span>{gate.successes} eligible submissions</span>
        <Link href={`/gates/${gate.address}`}>View gate ↗</Link>
      </div>
    </Card>
  );
}
