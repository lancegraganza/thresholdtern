import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { verifyContractState } from "@midnight-ntwrk/midnight-js-contracts";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { ledger } from "../managed/thresholdtern/contract/index.js";
import { writeFile } from "node:fs/promises";
const address = process.argv[2];
if (!address || !/^[a-f0-9]{64}$/i.test(address)) {
  console.error(
    "Usage: npm run verify:preprod -- <confirmed 64-character gate address>",
  );
  process.exit(1);
}
const response = await fetch(
  "https://indexer.preprod.midnight.network/api/v4/graphql",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      query:
        "query($address:HexEncoded!){contractAction(address:$address){state transaction {hash block {height timestamp}}}}",
      variables: { address },
    }),
  },
);
if (!response.ok) throw new Error(`Indexer returned HTTP ${response.status}`);
const json = await response.json();
if (json.errors) throw new Error("Indexer rejected the deployment query");
const action = json.data?.contractAction;
if (!action?.state || !action.transaction?.block)
  throw new Error("No confirmed contract action found on Preprod");
const state = ContractState.deserialize(Buffer.from(action.state, "hex"));
const zk = new NodeZkConfigProvider("./managed/thresholdtern");
verifyContractState(
  [
    ["verify", await zk.getVerifierKey("verify")],
    ["close", await zk.getVerifierKey("close")],
  ],
  state,
);
if (state.operations().length !== 2)
  throw new Error("Contract contains unexpected circuits");
const view = ledger(state.data);
const evidence = {
  network: "preprod",
  address,
  checkedAt: new Date().toISOString(),
  verifierKeysMatch: true,
  latestAction: action.transaction,
  gate: {
    name: new TextDecoder().decode(view.title).replace(/\0+$/g, ""),
    minimum: Number(view.minimum),
    kind: Number(view.kind),
    active: view.active,
    attempts: Number(view.attempts),
    successes: Number(view.successes),
  },
};
await writeFile(
  "docs/evidence/preprod.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence, null, 2));
