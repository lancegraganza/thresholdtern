"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { validatePassword } from "@midnight-ntwrk/midnight-js-utils";
import {
  connectWallet,
  detectWallets,
  failure,
  UserError,
  type Wallet,
  type WalletOption,
} from "@/lib/midnight/wallet";
import { Button, Field, Icon, Modal, Notice } from "./ui";
import { short } from "@/lib/gates";
interface WalletContext {
  wallet: Wallet | null;
  open: () => void;
  disconnect: () => void;
  unlockStorage: () => Promise<string>;
}
const Context = createContext<WalletContext | null>(null);
export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null),
    [opened, setOpened] = useState(false),
    [options, setOptions] = useState<WalletOption[]>([]),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [storageOpened, setStorageOpened] = useState(false),
    [secret, setSecret] = useState(""),
    [storageError, setStorageError] = useState("");
  const password = useRef("");
  const connecting = useRef(false);
  const discovery = useRef(0);
  const request = useRef<{
    promise: Promise<string>;
    resolve: (value: string) => void;
    reject: (reason: Error) => void;
  } | null>(null);
  function cancelStorage() {
    request.current?.reject(
      new UserError(
        "Local storage was not unlocked. Your wallet remains connected; retry when you are ready.",
      ),
    );
    request.current = null;
    setStorageOpened(false);
    setSecret("");
    setStorageError("");
  }
  useEffect(
    () => () => {
      request.current?.reject(new UserError("The local unlock request ended."));
      password.current = "";
    },
    [],
  );
  async function open() {
    if (connecting.current) return;
    const sequence = ++discovery.current;
    setError("");
    setOpened(true);
    try {
      const detected = await detectWallets();
      if (sequence === discovery.current) setOptions(detected);
    } catch (e) {
      if (sequence === discovery.current) setError(failure(e, "wallet"));
    }
  }
  async function connect(option: WalletOption) {
    if (connecting.current) return;
    connecting.current = true;
    setError("");
    setBusy(option.id);
    try {
      const next = await connectWallet(option);
      if (wallet?.address !== next.address) {
        password.current = "";
        if (request.current) cancelStorage();
      }
      setWallet(next);
      setOpened(false);
    } catch (e) {
      setError(failure(e, "wallet"));
    } finally {
      connecting.current = false;
      setBusy("");
    }
  }
  function disconnect() {
    setWallet(null);
    password.current = "";
    if (request.current) cancelStorage();
    setOpened(false);
  }
  function unlockStorage(): Promise<string> {
    if (!wallet)
      return Promise.reject(
        new UserError(
          "Connect your wallet before using encrypted local storage.",
        ),
      );
    if (password.current) return Promise.resolve(password.current);
    if (request.current) return request.current.promise;
    setSecret("");
    setStorageError("");
    setStorageOpened(true);
    let resolve!: (value: string) => void, reject!: (reason: Error) => void;
    const promise = new Promise<string>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    request.current = { promise, resolve, reject };
    return promise;
  }
  function unlock() {
    try {
      validatePassword(secret);
    } catch {
      setStorageError(
        "Use 8+ characters with uppercase, lowercase and numbers, without simple repeated patterns.",
      );
      return;
    }
    password.current = secret;
    request.current?.resolve(secret);
    request.current = null;
    setSecret("");
    setStorageOpened(false);
  }
  return (
    <Context.Provider value={{ wallet, open, disconnect, unlockStorage }}>
      {children}
      <Modal
        open={opened}
        onClose={() => {
          if (!busy) setOpened(false);
        }}
        title={wallet ? "Your wallet" : "Connect a wallet"}
      >
        <div className="wallet-intro">
          <span className="feature-icon">
            <Icon name="wallet" size={24} />
          </span>
          <p>
            Choose a Midnight wallet.
            <br />
            <span className="muted">
              Your wallet handles authorization on Preprod.
            </span>
          </p>
        </div>
        {wallet && (
          <div className="connected-wallet">
            <span className="badge">Connected</span>
            <strong>{wallet.name}</strong>
            <span className="mono">{short(wallet.address)}</span>
            <Button variant="secondary" onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        )}
        {error && <Notice error>{error}</Notice>}
        <div className="wallet-options">
          {options.length ? (
            options.map((option) => (
              <button
                key={option.id}
                className="wallet-option"
                disabled={!!busy}
                onClick={() => connect(option)}
              >
                <span className="wallet-monogram">
                  {option.name.slice(0, 1)}
                </span>
                <span>
                  <strong>{option.name}</strong>
                  <small>
                    {busy === option.id
                      ? "Approve in your wallet…"
                      : "Connect on Preprod"}
                  </small>
                </span>
                {busy === option.id ? (
                  <span className="spinner" />
                ) : (
                  <Icon name="arrow" />
                )}
              </button>
            ))
          ) : (
            <Notice>
              No compatible wallet found. Enable and unlock a
              Midnight-compatible Lace wallet, then check again.
            </Notice>
          )}
        </div>
        <Button variant="text" disabled={!!busy} onClick={() => void open()}>
          <Icon name="refresh" size={15} />
          Check for wallets
        </Button>
        <p className="dialog-footnote">
          <Icon name="lock" size={13} />
          No local password needed to connect.
        </p>
      </Modal>
      <Modal
        open={storageOpened}
        onClose={cancelStorage}
        title="Unlock local storage"
      >
        <p className="muted">
          Your wallet is connected. Midnight uses a separate password to encrypt
          local keys for this operation. Use your existing password to keep
          creator recovery working.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            unlock();
          }}
        >
          <Field
            id="storage-password"
            label="Local encryption password"
            hint="8+ characters, uppercase, lowercase and numbers. Kept in this session only."
          >
            <input
              id="storage-password"
              type="password"
              minLength={8}
              autoComplete="current-password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              aria-describedby={`storage-password-hint${storageError ? " storage-error" : ""}`}
              aria-invalid={!!storageError}
            />
          </Field>
          {storageError && (
            <Notice id="storage-error" error>
              {storageError}
            </Notice>
          )}
          <div className="actions">
            <Button type="submit">
              <Icon name="lock" size={16} />
              Unlock for this session
            </Button>
            <Button type="button" variant="text" onClick={cancelStorage}>
              Cancel
            </Button>
          </div>
        </form>
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
    <Button
      variant={wallet ? "secondary connected" : "secondary"}
      onClick={open}
    >
      <Icon name="wallet" size={16} />
      <span>{wallet ? short(wallet.address) : "Connect wallet"}</span>
      {wallet && <span className="connection-dot" />}
    </Button>
  );
}
