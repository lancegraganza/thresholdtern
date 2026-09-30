"use client";
import {
  deployContract,
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
import { UserError, type Wallet } from "./wallet";

const HTTP = "https://indexer.preprod.midnight.network/api/v4/graphql";
const WS = "wss://indexer.preprod.midnight.network/api/v4/graphql/ws";
type State = { admin: Uint8Array };
type Circuit = "verify" | "close";
export type Progress = (stage: Stage, txId?: string) => void;
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
  password: string,
  onProgress: Progress,
  privateInput?: bigint,
) {
  try {
    validatePassword(password);
  } catch {
    throw new UserError(
      "Use a local privacy password with 16+ characters, uppercase, lowercase and numbers, without simple repeated patterns.",
    );
  }
  const status = await wallet.api.getConnectionStatus();
  if (status.status !== "connected" || status.networkId !== "preprod")
    throw new UserError(
      "Your wallet is no longer connected to Preprod. Reconnect before continuing.",
    );
  setNetworkId("preprod");
  const privateStateProvider = levelPrivateStateProvider<string, State>({
    accountId: wallet.address,
    midnightDbName: "thresholdtern-preprod-v1",
    privateStoragePasswordProvider: () => password,
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
      if (!id)
        throw new UserError(
          "The transaction has no identifier and was not submitted.",
        );
      onProgress("submitting", id);
      await wallet.api.submitTransaction(toHex(tx.serialize()));
      onProgress("finalizing", id);
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
      localStorage.setItem(
        "thresholdtern:pending-creator-state",
        privateStateId,
      );
      const title = new Uint8Array(64);
      title.set(new TextEncoder().encode(draft.name.trim()));
      // Persist creator recovery before sending any transaction. The private
      // value is a closure only and is never passed to this encrypted store.
      await privateStateProvider.set(privateStateId, { admin });
      const deployed = await deployContract(providers, {
        compiledContract,
        privateStateId,
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
      const pub = deployed.deployTxData.public;
      localStorage.setItem(
        `thresholdtern:creator:${pub.contractAddress}`,
        privateStateId,
      );
      localStorage.removeItem("thresholdtern:pending-creator-state");
      return {
        gate: await readGate(pub.contractAddress),
        txId: pub.txId,
        blockHeight: pub.blockHeight,
      };
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
      const privateStateId = localStorage.getItem(
        "thresholdtern:pending-creator-state",
      );
      if (!privateStateId) return false;
      const state = await privateStateProvider.get(privateStateId);
      if (!state)
        throw new UserError(
          "The creator secret is unavailable for this wallet and password.",
        );
      const publicState = await dataProvider().queryContractState(address);
      if (!publicState) throw new UserError("This gate is not confirmed yet.");
      const { persistentHash, CompactTypeBytes } =
        await import("@midnight-ntwrk/compact-runtime");
      const expected = persistentHash(new CompactTypeBytes(32), state.admin);
      if (toHex(expected) !== toHex(ledger(publicState.data).adminHash))
        throw new UserError(
          "This address does not match the pending creator secret.",
        );
      localStorage.setItem(`thresholdtern:creator:${address}`, privateStateId);
      localStorage.removeItem("thresholdtern:pending-creator-state");
      localStorage.removeItem("thresholdtern:pending-deploy");
      return true;
    },
  };
}
