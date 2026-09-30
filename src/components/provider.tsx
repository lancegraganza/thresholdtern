"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Gate, Receipt } from "@/types/gate";
import { gateKey, receiptKey, storedGates, storedReceipts } from "@/lib/gates";
type Store = {
  gates: Gate[];
  receipts: Receipt[];
  ready: boolean;
  saveGate: (g: Gate) => void;
  saveReceipt: (r: Receipt) => void;
  toast: (s: string) => void;
};
const Context = createContext<Store | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [gates, setGates] = useState<Gate[]>([]),
    [receipts, setReceipts] = useState<Receipt[]>([]),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    setGates(storedGates());
    setReceipts(storedReceipts());
    setReady(true);
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [message]);
  function saveGate(g: Gate) {
    setGates((previous) => {
      const next = [g, ...previous.filter((x) => x.address !== g.address)];
      localStorage.setItem(gateKey, JSON.stringify(next));
      return next;
    });
  }
  function saveReceipt(r: Receipt) {
    setReceipts((previous) => {
      const next = [r, ...previous.filter((x) => x.txId !== r.txId)];
      localStorage.setItem(receiptKey, JSON.stringify(next));
      return next;
    });
  }
  return (
    <Context.Provider
      value={{
        gates,
        receipts,
        ready,
        saveGate,
        saveReceipt,
        toast: setMessage,
      }}
    >
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("App provider missing");
  return store;
}
