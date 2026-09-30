"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import {
  connectWallet,
  detectWallets,
  failure,
  type Wallet,
  type WalletOption,
} from "@/lib/midnight/wallet";
import { Button, Field, Modal, Notice } from "./ui";
import { short } from "@/lib/gates";
interface WalletContext {
  wallet: Wallet | null;
  password: string;
  open: () => void;
  disconnect: () => void;
}
const Context = createContext<WalletContext | null>(null);
export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null),
    [password, setPassword] = useState(""),
    [opened, setOpened] = useState(false),
    [options, setOptions] = useState<WalletOption[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function open() {
    setError("");
    setOpened(true);
    setOptions(await detectWallets());
  }
  async function connect(option: WalletOption) {
    setError("");
    setBusy(true);
    try {
      setWallet(await connectWallet(option));
      setOpened(false);
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  }
  function disconnect() {
    setWallet(null);
    setPassword("");
  }
  return (
    <Context.Provider value={{ wallet, password, open, disconnect }}>
      {children}
      <Modal
        open={opened}
        onClose={() => {
          if (!busy) setOpened(false);
        }}
        title="Connect privately"
      >
        <p className="muted" style={{ fontSize: 13 }}>
          Choose your Midnight wallet. Approve the connection on Preprod.
        </p>
        <Field
          id="local-password"
          label="Local privacy password"
          hint="16+ characters with uppercase, lowercase and numbers. Encrypts local keys. Keep it for future visits."
        >
          <input
            id="local-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="local-password-hint"
          />
        </Field>
        {error && <Notice error>{error}</Notice>}
        <div className="stack" style={{ gap: 12, marginTop: 22 }}>
          {options.length ? (
            options.map((option) => (
              <Button
                key={option.id}
                disabled={busy || password.length < 16}
                onClick={() => connect(option)}
              >
                {busy ? "Waiting for wallet…" : `Connect ${option.name}`} ↗
              </Button>
            ))
          ) : (
            <Notice>
              No compatible Midnight wallet detected. Install or enable Lace,
              unlock it, and refresh this tab.
            </Notice>
          )}
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void open()}
          >
            Check for wallets again
          </Button>
        </div>
        <p className="hint" style={{ marginTop: 16 }}>
          Your evidence is never stored with your wallet connection.
        </p>
      </Modal>
    </Context.Provider>
  );
}
export function useWallet() {
  const context = useContext(Context);
  if (!context) throw new Error("Wallet provider missing");
  return context;
}
export function WalletButton() {
  const { wallet, open } = useWallet();
  return (
    <Button variant="secondary" onClick={open}>
      {wallet ? short(wallet.address) : "Connect wallet"} ↗
    </Button>
  );
}
