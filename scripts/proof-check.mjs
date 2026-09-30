import {
  createConstructorContext,
  createCircuitContext,
  sampleContractAddress,
  proofDataIntoSerializedPreimage,
} from "@midnight-ntwrk/compact-runtime";
import { httpClientProvingProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { Contract } from "../managed/thresholdtern/contract/index.js";
import { writeFile, mkdir } from "node:fs/promises";
const admin = new Uint8Array(32).fill(7),
  coin = { bytes: new Uint8Array(32) },
  name = new Uint8Array(64);
name.set(new TextEncoder().encode("Local proof check"));
let value = 18n;
const contract = new Contract({
  privateValue: ({ privateState }) => [privateState, value],
  administrationSecret: ({ privateState }) => [
    privateState,
    privateState.admin,
  ],
});
const initial = contract.initialState(
  createConstructorContext({ admin }, coin),
  18n,
  0n,
  name,
  0n,
);
let context = createCircuitContext(
  sampleContractAddress(),
  coin,
  initial.currentContractState,
  { admin },
);
const prover = httpClientProvingProvider(
  "http://127.0.0.1:6302",
  new NodeZkConfigProvider("./managed/thresholdtern"),
  { timeout: 120000 },
);
const proofs = [];
async function prove(circuit, result) {
  const { input, output, publicTranscript, privateTranscriptOutputs } =
    result.proofData;
  const preimage = proofDataIntoSerializedPreimage(
    input,
    output,
    publicTranscript,
    privateTranscriptOutputs,
    circuit,
  );
  await prover.check(preimage, circuit);
  const proof = await prover.prove(preimage, circuit);
  if (!proof.length) throw new Error("Prover returned an empty proof");
  proofs.push({
    circuit,
    proofBytes: proof.length,
    result: circuit === "verify" ? result.result : "closed",
  });
  context = result.context;
}
await prove(
  "verify",
  contract.circuits.verify(context, new Uint8Array(32).fill(1)),
);
value = 17n;
await prove(
  "verify",
  contract.circuits.verify(context, new Uint8Array(32).fill(2)),
);
await prove("close", contract.circuits.close(context));
const evidence = {
  scope: "local proof server; no network settlement claimed",
  compiler: "0.31.1",
  checkedAt: new Date().toISOString(),
  proofs,
};
await mkdir("docs/evidence", { recursive: true });
await writeFile(
  "docs/evidence/local-proofs.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence, null, 2));
