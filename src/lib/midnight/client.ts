"use client";
import {
  createUnprovenDeployTx,
  submitTxAsync,
  findDeployedContract,
  verifyContractState,
} from "@midnight-ntwrk/midnight-js-contracts";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { sampleSigningKey } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import type {
  MidnightProviders,
  WalletProvider,
  MidnightProvider,
} from "@midnight-ntwrk/midnight-js-types";
import {
  fromHex,
  toHex,
  validatePassword,
} from "@midnight-ntwrk/midnight-js-utils";
import {
  Contract,
  ledger,
  type Witnesses,
} from "../../../managed/thresholdtern/contract/index.js";
import { isAddress, validateDraft } from "@/lib/gates";
import type { Draft, Gate, Receipt, Stage } from "@/types/gate";
import {
  failure,
  requireWalletReady,
  submissionRejected,
  TransactionFailedError,
  UserError,
  type Wallet,
} from "./wallet";
import {
  clearPendingDeployment,
  deploymentStatus,
  isTransactionId,
  pendingDeployment,
  type DeploymentMetadata,
} from "./deployment";

const HTTP = "https://indexer.preprod.midnight.network/api/v4/graphql";
const WS = "wss://indexer.preprod.midnight.network/api/v4/graphql/ws";
type State = { admin: Uint8Array };
type Circuit = "verify" | "close";
const PENDING_SCOPE = "0".repeat(64);
export type Progress = (
  stage: Stage,
  txId?: string,
  metadata?: DeploymentMetadata,
) => void;
function dataProvider() {
  setNetworkId("preprod");
  return indexerPublicDataProvider(HTTP, WS);
}
async function checkedState(address: string) {
  if (!isAddress(address))
    throw new UserError(
      "This gate link is invalid. Ask the creator for the full share link.",
    );
  const state = await dataProvider().queryContractState(address);
  if (!state)
    throw new UserError(
      "This contract was not found on Preprod. Check the link or wait for deployment confirmation.",
    );
  const zk = new FetchZkConfigProvider<Circuit>(
    `${window.location.origin}/zk/thresholdtern`,
  );
  const [verify, close] = await Promise.all([
    zk.getVerifierKey("verify"),
    zk.getVerifierKey("close"),
  ]);
  try {
    verifyContractState(
      [
        ["verify", verify],
        ["close", close],
      ],
      state,
    );
    if (state.operations().length !== 2) throw new Error("Unexpected circuit");
  } catch {
    throw new UserError(
      "This contract's circuits do not match ThresholdTern. Check the share link.",
    );
  }
  return state;
}
export async function readGate(address: string): Promise<Gate> {
  if (!isAddress(address))
    throw new UserError(
      "This gate link is invalid. Ask the creator for the full share link.",
    );
  const state = await checkedState(address);
  if (!state)
    throw new UserError(
      "This contract was not found on Preprod. Check the link or wait for the deployment to confirm.",
    );
  try {
    const view = ledger(state.data);
    return {
      address,
      name: new TextDecoder().decode(view.title).replace(/\0+$/g, ""),
      minimum: Number(view.minimum),
      kind: Number(view.kind) as 0 | 1,
      expiresAt: Number(view.expiresAt),
      active: view.active,
      attempts: Number(view.attempts),
      successes: Number(view.successes),
    };
  } catch {
    throw new UserError(
      "This contract is not a compatible ThresholdTern gate. Check the share link.",
    );
  }
}
export async function readReceipt(
  address: string,
  id: string,
): Promise<boolean | null> {
  if (!isAddress(address) || !isAddress(id))
    throw new UserError("The receipt reference is invalid.");
  const state = await checkedState(address);
  if (!state) throw new UserError("The gate is unavailable on Preprod.");
  const view = ledger(state.data),
    key = fromHex(id);
  return view.receipts.member(key) ? view.receipts.lookup(key) : null;
}
export async function makeClient(
  wallet: Wallet,
  password: string | (() => Promise<string>),
  onProgress: Progress,
  privateInput?: bigint,
) {
  // Storage unlock is separate from wallet authorization and requested lazily.
  const storagePassword = async () => {
    const secret = typeof password === "string" ? password : await password();
    try {
      validatePassword(secret);
    } catch {
      throw new UserError(
        "Unlock local storage with your existing encryption password before continuing.",
      );
    }
    return secret;
  };
  await requireWalletReady(wallet.api);
  if (typeof wallet.api.hintUsage === "function")
    await wallet.api.hintUsage([
      "balanceUnsealedTransaction",
      "submitTransaction",
    ]);
  setNetworkId("preprod");
  const privateStateProvider = levelPrivateStateProvider<string, State>({
    accountId: wallet.address,
    midnightDbName: "thresholdtern-preprod-v1",
    privateStoragePasswordProvider: storagePassword,
  });
  const witnesses: Witnesses<State> = {
    privateValue: ({ privateState }) => {
      if (privateInput === undefined)
        throw new UserError("Enter your private value again.");
      return [privateState, privateInput];
    },
    administrationSecret: ({ privateState }) => [
      privateState,
      privateState.admin,
    ],
  };
  const witnessed = CompiledContract.withWitnesses<
    Contract<State>,
    State,
    CompiledContract.CompiledContract.Context<Contract<State>>
  >(
    CompiledContract.make<Contract<State>, State>("thresholdtern", Contract),
    witnesses,
  );
  const compiledContract = CompiledContract.withCompiledFileAssets<
    Contract<State>,
    State,
    { readonly compiledAssetsPath: string }
  >(witnessed, "/zk/thresholdtern");
  const zkConfigProvider = new FetchZkConfigProvider<Circuit>(
    `${window.location.origin}/zk/thresholdtern`,
  );
  const baseProof = httpClientProofProvider(
    "http://127.0.0.1:6302",
    zkConfigProvider,
  );
  let deploymentAddress: string | undefined;
  const adapter: WalletProvider & MidnightProvider = {
    getCoinPublicKey: () => wallet.coin,
    getEncryptionPublicKey: () => wallet.encryption,
    async balanceTx(tx) {
      onProgress("balancing");
      const result = await wallet.api.balanceUnsealedTransaction(
        toHex(tx.serialize()),
      );
      return Transaction.deserialize(
        "signature",
        "proof",
        "binding",
        fromHex(result.tx),
      );
    },
    async submitTx(tx) {
      const id = tx.identifiers()[0];
      if (!id || !isTransactionId(id))
        throw new UserError(
          "The transaction has no valid identifier and was not submitted.",
        );
      const expiries = [...(tx.intents?.values() || [])].map((intent) =>
        intent.ttl.getTime(),
      );
      const metadata = {
        address: deploymentAddress,
        txHash: tx.transactionHash(),
        expiresAt: expiries.length ? Math.min(...expiries) : undefined,
      };
      // Keep an attempt durable before sending, without claiming acceptance.
      onProgress("submitting", id, metadata);
      try {
        await wallet.api.submitTransaction(toHex(tx.serialize()));
      } catch (error) {
        if (submissionRejected(error))
          throw new TransactionFailedError(failure(error, "wallet"));
        throw error;
      }
      onProgress("finalizing", id, metadata);
      return id;
    },
  };
  const providers: MidnightProviders<Circuit, string, State> = {
    privateStateProvider,
    publicDataProvider: dataProvider(),
    zkConfigProvider,
    walletProvider: adapter,
    midnightProvider: adapter,
    proofProvider: {
      proveTx(tx, config) {
        onProgress("proving");
        return baseProof.proveTx(tx, config);
      },
    },
  };
  return {
    async deploy(draft: Draft) {
      const error = validateDraft(draft);
      if (error) throw new UserError(error);
      const privateStateId = `creator-${crypto.randomUUID()}`;
      const admin = crypto.getRandomValues(new Uint8Array(32));
      const title = new Uint8Array(64);
      title.set(new TextEncoder().encode(draft.name.trim()));
      // Persist creator recovery before sending any transaction. The private
      // value is a closure only and is never passed to this encrypted store.
      privateStateProvider.setContractAddress(PENDING_SCOPE);
      await privateStateProvider.set(privateStateId, { admin });
      localStorage.setItem(
        "thresholdtern:pending-creator-state",
        privateStateId,
      );
      const prepared = await createUnprovenDeployTx(providers, {
        compiledContract,
        signingKey: sampleSigningKey(),
        initialPrivateState: { admin },
        args: [
          BigInt(draft.minimum),
          draft.requirement === "custom" ? 1n : 0n,
          title,
          draft.expiry
            ? BigInt(Math.floor(Date.parse(draft.expiry) / 1000))
            : 0n,
        ],
      });
      deploymentAddress = prepared.public.contractAddress;
      // Save both creator state and maintenance keys before a transaction can
      // leave the browser. Timeout/refresh recovery must not lose either key.
      privateStateProvider.setContractAddress(deploymentAddress);
      await privateStateProvider.set(
        privateStateId,
        prepared.private.initialPrivateState,
      );
      await privateStateProvider.setSigningKey(
        deploymentAddress,
        prepared.private.signingKey,
      );
      localStorage.setItem(
        `thresholdtern:creator:${deploymentAddress}`,
        privateStateId,
      );
      const id = await submitTxAsync(providers, {
        unprovenTx: prepared.private.unprovenTx,
      });
      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        const result = await deploymentStatus({
          ...(pendingDeployment() || {}),
          id,
          address: deploymentAddress,
          phase: "accepted",
        });
        if (result.status === "confirmed") {
          const gate = await readGate(result.address);
          localStorage.removeItem("thresholdtern:pending-creator-state");
          return { gate, txId: id, blockHeight: result.blockHeight };
        }
        if (result.status === "failed")
          throw new TransactionFailedError(result.message);
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
      throw new UserError(
        "Your wallet accepted submission, but confirmation is not available yet. Use Check deployment status; your creator keys are saved.",
      );
    },
    async verify(gate: Gate, id: string): Promise<Receipt> {
      try {
        const privateStateId = `participant-${gate.address}`;
        const found = await findDeployedContract(providers, {
          compiledContract,
          contractAddress: gate.address,
          privateStateId,
          initialPrivateState: { admin: new Uint8Array(32) },
        });
        const result = await found.callTx.verify(fromHex(id));
        const eligible = await readReceipt(gate.address, id);
        if (eligible === null)
          throw new UserError(
            "The transaction returned, but its receipt is not visible yet. Check the result again before retrying.",
          );
        return {
          gate: gate.address,
          gateName: gate.name,
          id,
          eligible,
          txId: result.public.txId,
          blockHeight: result.public.blockHeight,
          time: new Date().toISOString(),
        };
      } finally {
        privateInput = undefined;
      }
    },
    async close(address: string) {
      const privateStateId = localStorage.getItem(
        `thresholdtern:creator:${address}`,
      );
      if (!privateStateId)
        throw new UserError(
          "The creator secret is not available in this browser. Use the original browser and wallet.",
        );
      const found = await findDeployedContract(providers, {
        compiledContract,
        contractAddress: address,
        privateStateId,
      });
      const result = await found.callTx.close();
      return { gate: await readGate(address), txId: result.public.txId };
    },
    async recoverCreator(address: string) {
      const pendingStateId = localStorage.getItem(
        "thresholdtern:pending-creator-state",
      );
      const privateStateId =
        localStorage.getItem(`thresholdtern:creator:${address}`) ||
        pendingStateId;
      if (!privateStateId) return false;
      privateStateProvider.setContractAddress(address);
      let state = await privateStateProvider.get(privateStateId);
      if (!state) {
        privateStateProvider.setContractAddress(PENDING_SCOPE);
        state = await privateStateProvider.get(privateStateId);
      }
      if (!state)
        throw new UserError(
          "The creator secret is unavailable for this wallet and password.",
        );
      const publicState = await dataProvider().queryContractState(address);
      if (!publicState) throw new UserError("This gate is not confirmed yet.");
      const { persistentHash, CompactTypeBytes } = await import(
        "@midnight-ntwrk/compact-runtime"
      );
      const expected = persistentHash(new CompactTypeBytes(32), state.admin);
      if (toHex(expected) !== toHex(ledger(publicState.data).adminHash))
        throw new UserError(
          "This address does not match the pending creator secret.",
        );
      privateStateProvider.setContractAddress(address);
      await privateStateProvider.set(privateStateId, state);
      localStorage.setItem(`thresholdtern:creator:${address}`, privateStateId);
      if (pendingStateId === privateStateId) {
        localStorage.removeItem("thresholdtern:pending-creator-state");
        clearPendingDeployment();
      }
      return true;
    },
  };
}
