# ThresholdTern

![CI: not published](public/ci-pending.svg)

> Prove eligibility without revealing the evidence.

## Live Demo

Pending frontend deployment. Local application: `http://localhost:3000`.

## Contract Address

| Network | Address                                                       |
| ------- | ------------------------------------------------------------- |
| Preprod | **Pending wallet-authorized deployment — no address claimed** |

Each published gate has its own contract address and share URL. Run `npm run deploy:preprod` with the local app running, then publish through the gate wizard in the browser with Lace. Paste the confirmed address back into the chat to bind this README to real deployment evidence.

Verify the confirmed address with `npm run verify:preprod -- <address>`. This checks live public state and the deployed circuit verifier keys against the actual generated keys and writes a public evidence receipt.

## What This Does

ThresholdTern lets a creator publish a public eligibility requirement and a participant prove a private number meets it. The focused demo is **Create 18+ Gate → Publish → Share → Connect Wallet → Prove Privately → Midnight Confirms → Eligibility Result**. Gate details, activity and wallet settings keep creator and participant workflows separate.

The current product proves **self-asserted** age or custom numeric thresholds. It uses genuine Compact circuits and locally generated zero-knowledge proofs. Certifying real age, membership or residency requires trusted issuer credentials; those claims are not made by this implementation.

## Privacy Model

- **PUBLIC:** immutable gate name, threshold, requirement kind, expiry, active status, administration-secret hash, submission counts, random receipt IDs, eligibility booleans and blockchain transaction metadata.
- **PRIVATE:** numeric witness and creator administration secret. A value is held only in client memory; creator secrets and maintenance keys are encrypted in browser-local storage.
- **PROVED without revealing:** a private number satisfies or fails the public threshold. The circuit deliberately discloses the boolean, never the number.

## Privacy Claim

An observer sees the policy and result, not the exact witness. The result necessarily reveals a bound; a threshold at a domain boundary can reveal more by inference. This is not a guarantee of anonymous identity or unique participation. A random receipt prevents replay of that receipt, but a person can submit additional receipts. Counts are submissions.

The local proof server receives proof preimages containing private witnesses. It must run on the participant's machine at `http://127.0.0.1:6302`. The app does not use a remote prover, API routes, Server Actions, logging or telemetry for evidence. Proofs are generated locally by a proof server, **not wholly in the browser**. No claim is made that a self-entered age is authenticated by an issuer. The result screen is not a server-side protected-content authorization system.

## Tech Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Compact compiler 0.31.1 (language 0.23), compact-runtime 0.16.0, Midnight.js 4.1.1, ledger-v8 8.1.0, DApp Connector 4.0.1 and a local proof server 8.1.0. Versions are matched to the ledger-v8 SDK and generated artifacts.

The interface uses the supplied tern logo, locally hosted Manrope and Space Grotesk fonts, and scoped GSAP motion with reduced-motion support. See the [redesign direction](docs/REDESIGN.md) and [browser review](docs/evidence/REDESIGN-REVIEW.md).

## Prerequisites

- Node.js 22 and npm 10.
- Docker Desktop running with Compose.
- Compact devtools and compiler 0.31.1; on Windows, install the compiler in WSL.
- Lace with DApp Connector API 4.x, connected to Preprod, funded with spendable tNIGHT and DUST.

The organizer's historical npm compiler install is replaced with the actual [official Compact installer](https://github.com/LFDT-Minokawa/compact#installation) and pinned toolchain. See the [official SDK example version guidance](https://github.com/midnightntwrk/example-zkloan#installation--setup).

## Setup & Run Locally

1. Clone your public repository (once published) and open its root directory.
2. Install the Compact CLI in Linux/macOS or WSL:

   ```sh
   curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/download/compact-v0.5.2/compact-installer.sh | sh
   source ~/.local/bin/env
   compact update 0.31.1
   compact compile +0.31.1 --version
   ```

3. Install dependencies and compile the real contract:

   ```sh
   npm ci
   npm run compact:compile
   ```

   On Windows the compile script resolves the WSL compiler and translates paths automatically. Generated `managed/thresholdtern/` contains the JavaScript contract, circuits and keys. The build copies proving assets into `public/zk/thresholdtern/`.

4. Start your local prover:

   ```sh
   npm run proof:up
   npm run proof:check
   ```

5. Start the application:

   ```sh
   npm run dev
   ```

6. Open `http://localhost:3000` in the browser with Lace installed. Your wallet explicitly connects to Preprod without a local password. Operations using encrypted local keys request a separate storage unlock; use your existing encryption password for creator recovery. The app checks the actual connection status before a transaction.
7. Publish your first gate:

   ```sh
   npm run deploy:preprod
   ```

   This command prints the browser deployment URL and instructions. Deployment occurs when you publish in the wizard and authorize your wallet; the command alone does not submit a transaction.

For a production preview: `npm run build`, then `npm start`. Stop the development server before building so both processes do not share `.next` output.

## Run Tests

```sh
npm test
npm run typecheck
npm run proof:check
npm run build
```

The generated Compact contract is executed directly in tests: 18+/21+ boundaries, invalid domains, custom maximum, counters, receipt replay, creator authorization, expiry and equal public transcripts for different private inputs. The proof check produces actual eligible, ineligible and close proofs through the local prover. This verifies proving, not Preprod settlement. See [local proof evidence](docs/evidence/local-proofs.json).

## CI/CD

[CI workflow](.github/workflows/ci.yml) runs on main pushes and pull requests: Node 22 → locked dependency installation → pinned Compact compile → tests → typecheck → production build → local proof smoke check → evidence artifact. Frontend hosting is configured in `vercel.json`:

```sh
npx vercel
npx vercel --prod
```

There is no Git remote in this checkout yet, so a remote CI run, public repository, active status badge and live URL remain pending. Replace the clearly marked pending badge with the repository's real Actions badge after publishing. Remote green CI is not claimed.

## Product Proposal

Selected organizer idea: **Age / Eligibility Gate**. [PROPOSAL.md](PROPOSAL.md) retains the organizer's owner-authored placeholders. Fill it in and submit for approval before starting Level 4.

## Initial Idea

ThresholdTern gives event organizers and communities a way to ask for eligibility without collecting unnecessary evidence. A public gate defines a threshold, and a participant proves a private value meets it on Midnight. The first version demonstrates private comparisons; issuer-authenticated credentials are the next step toward real age assurance.

## Usage Guide

See [docs/USAGE.md](docs/USAGE.md), [architecture](docs/ARCHITECTURE.md) and the [Level 1–3 verification matrix](docs/REQUIREMENTS.md).

## Screenshots

Validation logs and proof receipts are recorded under `docs/evidence/`. Desktop and mobile screens were reviewed in the actual browser; submission screenshots still need to be captured, including the address after real deployment. Local test/proof receipts must not be presented as on-chain receipts.

## Demo Video

Pending recording. See [docs/DEMO.md](docs/DEMO.md) for the one-minute checklist.

## Product X Profile

[PLACEHOLDER — add after creating the account at the appropriate milestone]
