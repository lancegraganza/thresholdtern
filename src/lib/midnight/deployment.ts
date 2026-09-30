"use client";
import { isAddress } from "@/lib/gates";
import { UserError, type Wallet } from "./wallet";

const key = "thresholdtern:pending-deploy";
const metadataKey = `${key}-metadata`;
// Transaction identifiers can include a one-byte prefix (66 hex characters).
// They are not contract addresses or transaction hashes. Keep legacy IDs too.
export const isTransactionId = (id: string) =>
  /^(?:[a-f0-9]{64}|[a-f0-9]{66})$/i.test(id);
export interface DeploymentMetadata {
  address?: string;
  txHash?: string;
  expiresAt?: number;
}
export interface PendingDeployment extends DeploymentMetadata {
  id: string;
  phase: "attempting" | "accepted" | "unknown";
}
export function pendingDeployment(): PendingDeployment | null {
  const id = localStorage.getItem(key);
  if (!id) return null;
  try {
    const value = JSON.parse(localStorage.getItem(metadataKey) || "null");
    if (value?.id === id)
      return {
        id,
        phase: value.phase === "accepted" ? "accepted" : "attempting",
        address:
          typeof value.address === "string" && isAddress(value.address)
            ? value.address
            : undefined,
        txHash:
          typeof value.txHash === "string" && isAddress(value.txHash)
            ? value.txHash
            : undefined,
        expiresAt:
          typeof value.expiresAt === "number" &&
          Number.isFinite(value.expiresAt)
            ? value.expiresAt
            : undefined,
      };
  } catch {}
  // Keep old transaction IDs recoverable instead of treating them as accepted.
  return { id, phase: "unknown" };
}
export function savePendingDeployment(
  id: string,
  phase: PendingDeployment["phase"],
  metadata?: DeploymentMetadata,
) {
  if (!isTransactionId(id))
    throw new UserError(
      "The deployment reference has an unsupported format. Keep the full reference from your wallet.",
    );
  const previous = pendingDeployment();
  const record = {
    ...(previous?.id === id ? previous : {}),
    ...metadata,
    id,
    phase,
  };
  localStorage.setItem(metadataKey, JSON.stringify(record));
  localStorage.setItem(key, id);
}
export function clearPendingDeployment() {
  localStorage.removeItem(key);
  localStorage.removeItem(metadataKey);
  // Creator secrets and signing keys stay in their encrypted SDK database.
}
export type DeploymentStatus =
  | {
      status: "confirmed";
      address: string;
      txHash?: string;
      blockHeight?: number;
    }
  | { status: "failed"; message: string }
  | { status: "pending"; message: string; retryBlocked?: boolean };

/** Read-only reconciliation. No transaction is created or resubmitted. */
export async function deploymentStatus(
  pending: PendingDeployment,
  wallet?: Wallet | null,
): Promise<DeploymentStatus> {
  if (!isTransactionId(pending.id))
    throw new UserError("The deployment reference is invalid.");
  const response = await fetch(
    "https://indexer.preprod.midnight.network/api/v4/graphql",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        query:
          "query($offset:TransactionOffset!){block{timestamp} transactions(offset:$offset){hash block{height} ... on RegularTransaction{identifiers contractActions{__typename address} transactionResult{status}}}}",
        variables: { offset: { identifier: pending.id } },
      }),
    },
  );
  if (!response.ok)
    throw new UserError(
      "The Preprod indexer is unavailable. Check again in a moment.",
    );
  const result = await response.json();
  if (result.errors || !Array.isArray(result.data?.transactions))
    throw new UserError(
      "Preprod could not return this deployment's status. Keep the reference and check again.",
    );
  type IndexedTransaction = {
    hash: string;
    block: { height: number };
    identifiers?: string[];
    contractActions?: { __typename: string; address: string }[];
    transactionResult?: { status: string };
  };
  const transaction = (result.data.transactions as IndexedTransaction[]).find(
    (tx) => tx.identifiers?.includes(pending.id),
  );
  if (transaction) {
    const status = transaction.transactionResult?.status;
    if (status === "FAILURE")
      return {
        status: "failed",
        message:
          "Midnight confirmed that the deployment failed. Your draft is kept; you can publish again.",
      };
    const deployments =
      transaction.contractActions?.filter(
        (action) =>
          action.__typename === "ContractDeploy" &&
          isAddress(action.address) &&
          (!pending.address || action.address === pending.address),
      ) || [];
    if (status === "SUCCESS" && deployments.length === 1)
      return {
        status: "confirmed",
        address: deployments[0].address,
        txHash: transaction.hash,
        blockHeight: transaction.block.height,
      };
    if (status === "PARTIAL_SUCCESS") {
      // A fee segment can fail independently. Trust the deployed gate only after
      // checking its actual state and circuit keys, never the transaction label.
      if (deployments.length === 1) {
        const { readGate } = await import("./client");
        try {
          await readGate(deployments[0].address);
        } catch (error) {
          if (
            error instanceof UserError &&
            error.message.includes("not found on Preprod")
          )
            return {
              status: "failed",
              message:
                "Midnight finalized this attempt, but the gate was not deployed. Your draft is kept; you can publish again.",
            };
          throw error;
        }
        return {
          status: "confirmed",
          address: deployments[0].address,
          txHash: transaction.hash,
          blockHeight: transaction.block.height,
        };
      }
      return {
        status: "failed",
        message:
          "Midnight finalized this attempt without deploying the gate. You can publish again.",
      };
    }
    throw new UserError(
      "The transaction is indexed, but a matching gate is not confirmed. Keep its reference and check again.",
    );
  }
  let walletStillPending = false;
  if (wallet && pending.txHash) {
    try {
      const connected = await wallet.api.getConnectionStatus();
      if (
        connected.status === "connected" &&
        connected.networkId === "preprod"
      ) {
        if (typeof wallet.api.hintUsage === "function")
          await wallet.api.hintUsage(["getTxHistory"]);
        const history = await wallet.api.getTxHistory(0, 50);
        const entry = history.find((entry) => entry.txHash === pending.txHash);
        if (entry?.txStatus.status === "discarded")
          return {
            status: "failed",
            message:
              "Your wallet reports that this deployment was discarded. Your draft is kept; you can publish again.",
          };
        if (
          entry &&
          ["pending", "confirmed", "finalized"].includes(entry.txStatus.status)
        )
          walletStillPending = true;
      }
    } catch {
      /* An unavailable wallet history is not proof of failure. */
    }
  }
  const chainTime = Number(result.data.block?.timestamp);
  if (
    pending.expiresAt &&
    Number.isFinite(chainTime) &&
    chainTime > pending.expiresAt + 60_000
  ) {
    if (pending.address) {
      // The expected address also protects against identifier/indexer mismatch.
      const { readGate } = await import("./client");
      try {
        await readGate(pending.address);
        return { status: "confirmed", address: pending.address };
      } catch (error) {
        if (
          !(error instanceof UserError) ||
          !error.message.includes("not found on Preprod")
        )
          throw error;
      }
    }
    return {
      status: "failed",
      message:
        "The transaction's validity window has ended and Preprod has no deployment record. Your draft is kept; you can publish again.",
    };
  }
  if (walletStillPending)
    return {
      status: "pending",
      retryBlocked: true,
      message:
        "Your wallet still reports this transaction as pending or confirmed. Keep checking Preprod; it cannot be cleared as a rejected attempt.",
    };
  return {
    status: "pending",
    message:
      "Preprod has no confirmed record yet. Check again, or clear this attempt only if your wallet explicitly reports rejection or discard.",
  };
}
