import type { Draft, Gate, Receipt } from "@/types/gate";
export const isAddress = (s: string) => /^[a-f0-9]{64}$/i.test(s);
export function validateDraft(draft: Draft): string | null {
  const name = draft.name.trim();
  if (!name) return "Give your gate a name.";
  if (new TextEncoder().encode(name).length > 64)
    return "Use a shorter name (up to 64 UTF-8 bytes).";
  if (
    !Number.isInteger(draft.minimum) ||
    draft.minimum < 1 ||
    draft.minimum > (draft.requirement === "custom" ? 65535 : 130)
  )
    return "Enter a whole-number threshold within the supported range.";
  if (
    (draft.requirement === "age18" && draft.minimum !== 18) ||
    (draft.requirement === "age21" && draft.minimum !== 21)
  )
    return "The selected age requirement has a fixed threshold.";
  if (
    draft.expiry &&
    (!Number.isFinite(Date.parse(draft.expiry)) ||
      Date.parse(draft.expiry) <= Date.now())
  )
    return "Choose a future expiry date.";
  return null;
}
export function validateValue(value: string, kind: 0 | 1): bigint {
  if (!/^\d{1,5}$/.test(value)) throw new Error("Enter a whole number.");
  const number = BigInt(value);
  if (number > BigInt(kind === 0 ? 130 : 65535))
    throw new Error(`Enter a value between 0 and ${kind === 0 ? 130 : 65535}.`);
  return number;
}
export const gateStatus = (gate: Gate) =>
  !gate.active
    ? "Closed"
    : gate.expiresAt > 0 && gate.expiresAt <= Date.now() / 1000
      ? "Expired"
      : "Active";
export const policy = (gate: Pick<Gate, "kind" | "minimum">) =>
  gate.kind === 0 ? `Age ≥ ${gate.minimum}` : `Value ≥ ${gate.minimum}`;
export const short = (s: string) =>
  s.length > 20 ? `${s.slice(0, 8)}…${s.slice(-8)}` : s;
export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export const gateKey = "thresholdtern:public-gates:v1";
export const receiptKey = "thresholdtern:public-receipts:v1";
export const draftKey = "thresholdtern:draft:v1";
export function storedGates(): Gate[] {
  const data = readStored<unknown>(gateKey, []);
  return Array.isArray(data)
    ? data.filter(
        (g): g is Gate =>
          !!g &&
          typeof g === "object" &&
          isAddress(g.address) &&
          typeof g.name === "string" &&
          (g.kind === 0 || g.kind === 1) &&
          Number.isInteger(g.minimum) &&
          typeof g.active === "boolean" &&
          Number.isFinite(g.expiresAt) &&
          Number.isFinite(g.attempts) &&
          Number.isFinite(g.successes),
      )
    : [];
}
export function storedReceipts(): Receipt[] {
  const data = readStored<unknown>(receiptKey, []);
  return Array.isArray(data)
    ? data.filter(
        (r): r is Receipt =>
          !!r &&
          typeof r === "object" &&
          isAddress(r.gate) &&
          isAddress(r.id) &&
          typeof r.txId === "string" &&
          typeof r.eligible === "boolean" &&
          typeof r.time === "string" &&
          typeof r.gateName === "string" &&
          Number.isFinite(r.blockHeight),
      )
    : [];
}
