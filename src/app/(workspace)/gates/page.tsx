"use client";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/components/provider";
import { GateCard, GateList } from "@/components/gate-card";
import {
  Empty,
  Button,
  Field,
  Icon,
  Modal,
  Notice,
  PageHead,
} from "@/components/ui";
import { gateStatus, isAddress } from "@/lib/gates";
import { failure } from "@/lib/midnight/wallet";
import { useWallet } from "@/components/wallet-provider";
export default function Gates() {
  const { gates, ready, saveGate, toast } = useStore();
  const { wallet, unlockStorage, open } = useWallet();
  const [opened, setOpened] = useState(false),
    [address, setAddress] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All");
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
      if (localStorage.getItem("thresholdtern:pending-creator-state")) {
        if (!wallet) {
          setError(
            "The public gate is restored. Connect your original wallet to recover creator access.",
          );
          open();
          return;
        }
        const client = await makeClient(wallet, unlockStorage, () => {});
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
  const visible = gates.filter(
    (g) =>
      (filter === "All" || gateStatus(g) === filter) &&
      (g.name.toLowerCase().includes(query.toLowerCase()) ||
        g.address.includes(query.trim())),
  );
  return (
    <>
      <PageHead
        kicker="Your boundaries"
        title="Gates"
        description="Public requirements. Private answers. Manage the passages you’ve published."
      >
        <Button
          variant="secondary"
          onClick={() => {
            setError("");
            setOpened(true);
          }}
        >
          <Icon name="refresh" size={15} />
          Restore gate
        </Button>
        <Link className="btn" href="/gates/new">
          <Icon name="plus" size={16} />
          Create gate
        </Link>
      </PageHead>
      <div className="list-toolbar" data-enter>
        <div className="search-control">
          <Icon name="search" size={16} />
          <input
            aria-label="Search gates"
            placeholder="Find a gate by name or address"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filter-tabs" aria-label="Gate status filters">
          {["All", "Active", "Closed", "Expired"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {!ready ? (
        <p role="status" className="hint">
          Restoring gates…
        </p>
      ) : visible.length ? (
        <GateList>
          {visible.map((g) => (
            <GateCard gate={g} key={g.address} />
          ))}
        </GateList>
      ) : gates.length ? (
        <Empty
          title="No matching gates."
          text="Try another name, address or status filter."
        >
          <Button
            variant="secondary"
            onClick={() => {
              setQuery("");
              setFilter("All");
            }}
          >
            Clear filters
          </Button>
        </Empty>
      ) : (
        <Empty
          title="A gate starts with one question."
          text="Choose who qualifies, without asking for more evidence than you need."
        >
          <Link className="btn" href="/gates/new">
            Create your first gate
            <Icon name="arrow" size={15} />
          </Link>
        </Empty>
      )}
      <Modal
        open={opened}
        onClose={() => {
          if (!busy) setOpened(false);
        }}
        title="Restore a gate"
      >
        <p className="hint">
          Read a published gate from Midnight Preprod. Creator controls need the
          original wallet and encrypted secret.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void restore();
          }}
        >
          <Field
            id="restore-address"
            label="Preprod contract address"
            hint="The full 64-character address, without a URL."
          >
            <input
              id="restore-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!error}
              aria-describedby={`restore-address-hint${error ? " restore-error" : ""}`}
            />
          </Field>
          {error && (
            <Notice id="restore-error" error>
              {error}
            </Notice>
          )}
          <div className="actions">
            <Button type="submit" disabled={busy}>
              {busy ? "Reading Midnight…" : "Restore gate"}
              <Icon name="arrow" size={15} />
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
