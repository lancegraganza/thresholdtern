"use client";
import Link from "next/link";
import { useStore } from "@/components/provider";
import { GateCard } from "@/components/gate-card";
import { Empty } from "@/components/ui";
import { Button, Field, Modal, Notice } from "@/components/ui";
import { useState } from "react";
import { isAddress } from "@/lib/gates";
import { failure } from "@/lib/midnight/wallet";
import { useWallet } from "@/components/wallet-provider";
export default function Gates() {
  const { gates, ready, saveGate, toast } = useStore();
  const { wallet, password, open } = useWallet();
  const [opened, setOpened] = useState(false),
    [address, setAddress] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function restore() {
    setError("");
    if (!isAddress(address.trim())) {
      setError("Enter the full 64-character Preprod contract address.");
      return;
    }
    setBusy(true);
    try {
      const { readGate, makeClient } = await import("@/lib/midnight/client");
      saveGate(await readGate(address.trim()));
      if (localStorage.getItem("thresholdtern:pending-deploy")) {
        if (!wallet) {
          setError(
            "The public gate is restored. Connect your original wallet to recover creator access.",
          );
          open();
          return;
        }
        const client = await makeClient(wallet, password, () => {});
        await client.recoverCreator(address.trim());
      }
      setOpened(false);
      setAddress("");
      toast("Gate restored from Midnight.");
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Requirements, made shareable</div>
          <h1>Gates</h1>
          <p>Your published gates and their latest known results.</p>
        </div>
        <Link className="btn" href="/gates/new">
          + Create gate
        </Link>
      </div>
      <div style={{ marginBottom: 24 }}>
        <Button variant="secondary" onClick={() => setOpened(true)}>
          Restore gate by address
        </Button>
      </div>
      {!ready ? (
        <p role="status">Restoring gates…</p>
      ) : gates.length ? (
        <div className="grid">
          {gates.map((g) => (
            <GateCard gate={g} key={g.address} />
          ))}
        </div>
      ) : (
        <Empty
          title="No gates yet"
          text="Create an age gate or a custom threshold to get started."
        >
          <Link className="btn" href="/gates/new">
            Create gate ↗
          </Link>
        </Empty>
      )}
      <Modal
        open={opened}
        onClose={() => {
          if (!busy) setOpened(false);
        }}
        title="Restore a published gate"
      >
        <p className="hint">
          Read a gate directly from Midnight Preprod. Creator controls still
          require your original wallet and encrypted secret.
        </p>
        <Field id="restore-address" label="Contract address">
          <input
            id="restore-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="off"
          />
        </Field>
        {error && <Notice error>{error}</Notice>}
        <Button onClick={restore} disabled={busy}>
          {busy ? "Reading Midnight…" : "Restore gate"} ↗
        </Button>
      </Modal>
    </>
  );
}
