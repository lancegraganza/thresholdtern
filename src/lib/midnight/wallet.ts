import "@midnight-ntwrk/dapp-connector-api";
import type {
  InitialAPI,
  ConnectedAPI,
} from "@midnight-ntwrk/dapp-connector-api";
import {
  parseCoinPublicKeyToHex,
  parseEncPublicKeyToHex,
} from "@midnight-ntwrk/midnight-js-utils";
export interface WalletOption {
  id: string;
  name: string;
  api: InitialAPI;
}
export interface Wallet {
  name: string;
  address: string;
  coin: string;
  encryption: string;
  api: ConnectedAPI;
}
export async function detectWallets(): Promise<WalletOption[]> {
  if (typeof window === "undefined") return [];
  const options: WalletOption[] = [];
  for (const [id, candidate] of Object.entries(window.midnight ?? {})) {
    let provider: unknown = candidate;
    if (id === "mnLace")
      try {
        provider = await candidate;
      } catch {
        continue;
      }
    if (!provider || typeof provider !== "object") continue;
    const api = provider as InitialAPI;
    if (typeof api.connect !== "function" || !/^4\./.test(api.apiVersion))
      continue;
    if (!options.some((x) => x.api === api))
      options.push({ id, name: api.name || id, api });
  }
  return options;
}
export class UserError extends Error {}
export class TransactionFailedError extends UserError {}
export function canRetryTransaction(error: unknown): boolean {
  if (error instanceof TransactionFailedError) return true;
  if (!error || typeof error !== "object") return false;
  return (
    (error as { finalizedTxData?: { status?: string } }).finalizedTxData
      ?.status === "FailEntirely"
  );
}
export function submissionRejected(error: unknown): boolean {
  const { code } = errorDetails(error);
  return (
    code === "Rejected" ||
    code === "PermissionRejected" ||
    code === "InvalidRequest"
  );
}
type FailureContext = "operation" | "wallet" | "read" | "transaction";
function errorDetails(
  error: unknown,
  depth = 0,
): { code: string; text: string } {
  if (!error || typeof error !== "object")
    return { code: "", text: typeof error === "string" ? error : "" };
  const value = error as {
    code?: unknown;
    message?: unknown;
    reason?: unknown;
    cause?: unknown;
  };
  const cause =
    value.cause && value.cause !== error && depth < 3
      ? errorDetails(value.cause, depth + 1)
      : { code: "", text: "" };
  return {
    code: typeof value.code === "string" ? value.code : cause.code,
    text: [value.message, value.reason, cause.text]
      .filter((part) => typeof part === "string")
      .join(" "),
  };
}
export function failure(
  error: unknown,
  context: FailureContext = "operation",
): string {
  if (error instanceof UserError) return error.message;
  const { code, text } = errorDetails(error);
  if (/reject|denied|cancel/i.test(code + " " + text))
    return "The wallet request was declined. Approve the request in your wallet, then retry.";
  if (code === "Disconnected")
    return "The wallet connection was lost. Unlock your wallet and reconnect.";
  if (/network|mismatch/i.test(text))
    return "Switch your wallet to Midnight Preprod and reconnect.";
  if (/insufficient|dust|fund/i.test(text))
    return "Your wallet needs spendable Preprod funds and DUST. Fund it, finish syncing, then retry.";
  if (/expired/i.test(text))
    return "This gate has expired. Ask the creator for a new gate.";
  if (/closed|not active/i.test(text))
    return "This gate is closed. Ask the creator for an active gate.";
  if (/already used/i.test(text))
    return "This receipt has already been submitted. Check its result before trying again.";
  if (/fetch|connect|ECONN|CORS|abort|timeout/i.test(text))
    return context === "wallet"
      ? "The wallet could not be reached. Unlock it, wait for it to finish starting, then reconnect."
      : "A required service could not be reached. Check your local proof server and internet connection, then retry.";
  if (/password|decrypt/i.test(text))
    return "The local privacy password could not unlock storage. Enter the password used in this browser.";
  if (/proof|proving/i.test(text))
    return "The private proof could not be generated. Check the local proof server and retry.";
  if (context === "wallet")
    return "The wallet could not finish connecting. Unlock it and let it finish syncing, then reconnect.";
  if (context === "read")
    return "The public gate state could not be loaded. Check your connection and refresh the gate.";
  if (context === "transaction")
    return "The operation could not be confirmed. Refresh the gate to reconcile its chain state before retrying.";
  return "The action could not be completed. Please try again.";
}
class WalletStarting extends Error {}
async function waitForWallet<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const { code, text } = errorDetails(error);
      // Only connection/readiness work is retried; never balancing or submission.
      const starting =
        error instanceof WalletStarting ||
        code === "InternalError" ||
        code === "Disconnected" ||
        /initializ|not ready|starting|request.*in progress/i.test(text);
      if (!starting || /reject|denied|cancel/i.test(code + " " + text))
        throw error;
      if (attempt === 3)
        throw new UserError(
          "Your wallet is still starting. Unlock it and wait for syncing to finish before reconnecting.",
        );
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
}
export async function requireWalletReady(api: ConnectedAPI): Promise<void> {
  await waitForWallet(async () => {
    const status = await api.getConnectionStatus();
    if (status.status !== "connected") throw new WalletStarting();
    if (status.networkId !== "preprod")
      throw new UserError(
        "Switch your wallet to Midnight Preprod and reconnect.",
      );
  });
}
export async function connectWallet(option: WalletOption): Promise<Wallet> {
  const api = await waitForWallet(() => option.api.connect("preprod"));
  if (typeof api.hintUsage === "function")
    await api.hintUsage(["getConnectionStatus", "getShieldedAddresses"]);
  await requireWalletReady(api);
  const keys = await waitForWallet(async () => {
    const result = await api.getShieldedAddresses();
    if (
      !result?.shieldedAddress ||
      !result.shieldedCoinPublicKey ||
      !result.shieldedEncryptionPublicKey
    )
      throw new WalletStarting();
    return result;
  });
  return {
    api,
    name: option.name,
    address: keys.shieldedAddress,
    coin: parseCoinPublicKeyToHex(keys.shieldedCoinPublicKey, "preprod"),
    encryption: parseEncPublicKeyToHex(
      keys.shieldedEncryptionPublicKey,
      "preprod",
    ),
  };
}
